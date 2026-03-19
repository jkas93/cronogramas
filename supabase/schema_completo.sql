-- =============================================================
-- CRONOGRAMA GOLDEN TOWER — SQL Maestro Completo
-- Ejecuta TODO este archivo en el SQL Editor de Supabase.
-- Es idempotente: puedes correrlo múltiples veces sin romper nada.
-- Incluye: Tablas + Funciones + Triggers + Índices + RLS completo
-- =============================================================


-- =============================================================
-- PASO 1: TABLAS
-- =============================================================

-- 1. PROFILES — Extiende auth.users (creado automáticamente al registrarse)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROJECT MEMBERS (muchos a muchos)
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- 4. PARTIDAS (nivel superior de agrupación)
CREATE TABLE IF NOT EXISTS partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ITEMS (segundo nivel de agrupación)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ACTIVITIES (tareas del Gantt con peso/ponderación)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DAILY PROGRESS (avance diario real)
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  progress_percent NUMERIC(5,2) NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, date)
);

-- 8. ALERTS (alertas de atrasos/desvíos)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('schedule_delay', 'progress_deviation')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- PASO 2: ÍNDICES DE RENDIMIENTO
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_partidas_project ON partidas(project_id);
CREATE INDEX IF NOT EXISTS idx_items_partida ON items(partida_id);
CREATE INDEX IF NOT EXISTS idx_activities_item ON activities(item_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_activity ON daily_progress(activity_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date);
CREATE INDEX IF NOT EXISTS idx_alerts_project ON alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token);


-- =============================================================
-- PASO 3: FUNCIONES Y TRIGGERS
-- =============================================================

-- Función: auto-crear perfil cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: disparar función al crear usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS activities_updated_at ON activities;
CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================
-- PASO 4: ROW LEVEL SECURITY (RLS)
-- Seguridad por filas — usuarios solo ven sus propios datos
-- =============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON profiles;
CREATE POLICY "Usuarios ven su propio perfil"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON profiles;
CREATE POLICY "Usuarios editan su propio perfil"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Usuarios crean su propio perfil" ON profiles;
CREATE POLICY "Usuarios crean su propio perfil"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());


-- -------------------------------------------------------
-- PROJECTS — Usuarios autenticados (CRUD propio)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver proyectos propios o como miembro" ON projects;
CREATE POLICY "Ver proyectos propios o como miembro"
  ON projects FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Crear proyectos propios" ON projects;
CREATE POLICY "Crear proyectos propios"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Editar proyectos propios" ON projects;
CREATE POLICY "Editar proyectos propios"
  ON projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Eliminar proyectos propios" ON projects;
CREATE POLICY "Eliminar proyectos propios"
  ON projects FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- PROJECTS — Lectura pública por share_token (usuarios anónimos / clientes)
DROP POLICY IF EXISTS "Lectura publica por share_token" ON projects;
CREATE POLICY "Lectura publica por share_token"
  ON projects FOR SELECT TO anon
  USING (share_token IS NOT NULL);


-- -------------------------------------------------------
-- PROJECT MEMBERS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver miembros si eres dueño o miembro" ON project_members;
CREATE POLICY "Ver miembros si eres dueño o miembro"
  ON project_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Dueño gestiona miembros" ON project_members;
CREATE POLICY "Dueño gestiona miembros"
  ON project_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- PARTIDAS — Autenticados (CRUD), Anónimos (lectura pública)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver partidas de proyectos accesibles" ON partidas;
CREATE POLICY "Ver partidas de proyectos accesibles"
  ON partidas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Gestionar partidas propias" ON partidas;
CREATE POLICY "Gestionar partidas propias"
  ON partidas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lectura publica de partidas compartidas" ON partidas;
CREATE POLICY "Lectura publica de partidas compartidas"
  ON partidas FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.share_token IS NOT NULL
    )
  );


-- -------------------------------------------------------
-- ITEMS — Autenticados (CRUD), Anónimos (lectura pública)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver items accesibles" ON items;
CREATE POLICY "Ver items accesibles"
  ON items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partidas pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.id = partida_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Gestionar items propios" ON items;
CREATE POLICY "Gestionar items propios"
  ON items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partidas pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.id = partida_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lectura publica de items compartidos" ON items;
CREATE POLICY "Lectura publica de items compartidos"
  ON items FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM partidas pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.id = partida_id AND p.share_token IS NOT NULL
    )
  );


-- -------------------------------------------------------
-- ACTIVITIES — Autenticados (CRUD), Anónimos (lectura pública)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver actividades accesibles" ON activities;
CREATE POLICY "Ver actividades accesibles"
  ON activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas pa ON i.partida_id = pa.id
      JOIN projects p ON pa.project_id = p.id
      WHERE i.id = item_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Gestionar actividades propias" ON activities;
CREATE POLICY "Gestionar actividades propias"
  ON activities FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas pa ON i.partida_id = pa.id
      JOIN projects p ON pa.project_id = p.id
      WHERE i.id = item_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lectura publica de actividades compartidas" ON activities;
CREATE POLICY "Lectura publica de actividades compartidas"
  ON activities FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas pa ON i.partida_id = pa.id
      JOIN projects p ON pa.project_id = p.id
      WHERE i.id = item_id AND p.share_token IS NOT NULL
    )
  );


-- -------------------------------------------------------
-- DAILY PROGRESS — Autenticados (CRUD), Anónimos (lectura pública)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver progreso accesible" ON daily_progress;
CREATE POLICY "Ver progreso accesible"
  ON daily_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN items i ON a.item_id = i.id
      JOIN partidas pa ON i.partida_id = pa.id
      JOIN projects p ON pa.project_id = p.id
      WHERE a.id = activity_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Gestionar progreso propio" ON daily_progress;
CREATE POLICY "Gestionar progreso propio"
  ON daily_progress FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN items i ON a.item_id = i.id
      JOIN partidas pa ON i.partida_id = pa.id
      JOIN projects p ON pa.project_id = p.id
      WHERE a.id = activity_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lectura publica de progreso compartido" ON daily_progress;
CREATE POLICY "Lectura publica de progreso compartido"
  ON daily_progress FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN items i ON a.item_id = i.id
      JOIN partidas pa ON i.partida_id = pa.id
      JOIN projects p ON pa.project_id = p.id
      WHERE a.id = activity_id AND p.share_token IS NOT NULL
    )
  );


-- -------------------------------------------------------
-- ALERTS
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Ver alertas de proyectos accesibles" ON alerts;
CREATE POLICY "Ver alertas de proyectos accesibles"
  ON alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Gestionar alertas propias" ON alerts;
CREATE POLICY "Gestionar alertas propias"
  ON alerts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );


-- =============================================================
-- FIN — Si ves "Success" en todas las líneas, tu BD está lista.
-- =============================================================
