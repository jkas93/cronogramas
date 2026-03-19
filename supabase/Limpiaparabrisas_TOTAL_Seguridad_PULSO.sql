-- ==============================================================
-- 🧨 PROTOCOLO DE DESTRUCCIÓN DE BUCLES INFINITOS Y RESET TOTAL
-- ==============================================================
-- Este script es tu "Botón Rojo". 
-- Ejecútalo en Supabase SQL Editor para aniquilar el Error 500 para siempre.
-- NO BORRARÁ TUS DATOS. SOLO RE-INICIA EL CEREBRO DE SEGURIDAD.

-- 1. BORRAMOS EL FOCO DE INFECCIÓN CIRCULAR VIEJO (Y suspende políticas esclavas)
DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;

-- 2. BARRIDO GENERAL: ELIMINA TODAS LAS POLÍTICAS (EN INGLÉS Y ESPAÑOL) DE TUS TABLAS
-- Así nos quitamos esas 20 políticas silenciosas que hacían "corto circuito" unas con otras.
DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. NOS ASEGURAMOS QUE TODAS LAS TABLAS TIENEN RLS ACTIVADO (Base)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

-- 4. VACUNA CONTRA RECURSIONES: FUNCIÓN 100% INMUNE ("God Mode / Security Definer")
CREATE OR REPLACE FUNCTION public.soy_miembro_del_proyecto(proyecto_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proyecto_id AND user_id = auth.uid()
  );
$$;

-- 5. RECONSTRUCCIÓN SANITIZADA (Libre de bucles)
-- =========================================================================

-- PROFILES
CREATE POLICY "Dueño lee su perfil" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Dueño edita su perfil" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Dueño crea su perfil" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- PROJECTS (La Inmune)
CREATE POLICY "Lectura Proyecto Inmune" ON projects FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.soy_miembro_del_proyecto(id));

CREATE POLICY "Insercion Dueño Proyecto" ON projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Edicion Dueño Proyecto" ON projects FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Borrado Dueño Proyecto" ON projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Lectura publica Share Token Projects" ON projects FOR SELECT TO anon USING (share_token IS NOT NULL);

-- PROJECT MEMBERS
CREATE POLICY "Leer Miembros Inmune" ON project_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS(SELECT 1 FROM projects WHERE projects.id = project_id AND owner_id = auth.uid()));

CREATE POLICY "Gestion Miembros Dueño" ON project_members FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM projects WHERE projects.id = project_id AND owner_id = auth.uid()));

-- PARTIDAS
CREATE POLICY "Lectura Partidas Inmune" ON partidas FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))));

CREATE POLICY "Gestion Dueño Partidas" ON partidas FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Anon Leer Partidas" ON partidas FOR SELECT TO anon USING (EXISTS(SELECT 1 FROM projects p WHERE p.id = project_id AND p.share_token IS NOT NULL));

-- ITEMS
CREATE POLICY "Lectura Items Inmune" ON items FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM partidas pa JOIN projects p ON pa.project_id = p.id WHERE pa.id = partida_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))));

CREATE POLICY "Gestion Dueño Items" ON items FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM partidas pa JOIN projects p ON pa.project_id = p.id WHERE pa.id = partida_id AND p.owner_id = auth.uid()));

CREATE POLICY "Anon Leer Items" ON items FOR SELECT TO anon USING (EXISTS(SELECT 1 FROM partidas pa JOIN projects p ON pa.project_id = p.id WHERE pa.id = partida_id AND p.share_token IS NOT NULL));

-- ACTIVITIES
CREATE POLICY "Lectura Activities Inmune" ON activities FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM items i JOIN partidas pa ON i.partida_id = pa.id JOIN projects p ON pa.project_id = p.id WHERE i.id = item_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))));

CREATE POLICY "Gestion Dueño Activities" ON activities FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM items i JOIN partidas pa ON i.partida_id = pa.id JOIN projects p ON pa.project_id = p.id WHERE i.id = item_id AND p.owner_id = auth.uid()));

CREATE POLICY "Anon Leer Activities" ON activities FOR SELECT TO anon USING (EXISTS(SELECT 1 FROM items i JOIN partidas pa ON i.partida_id = pa.id JOIN projects p ON pa.project_id = p.id WHERE i.id = item_id AND p.share_token IS NOT NULL));

-- DAILY PROGRESS
CREATE POLICY "Lectura Progress Inmune" ON daily_progress FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM activities a JOIN items i ON a.item_id = i.id JOIN partidas pa ON i.partida_id = pa.id JOIN projects p ON pa.project_id = p.id WHERE a.id = activity_id AND (p.owner_id = auth.uid() OR public.soy_miembro_del_proyecto(p.id))));

CREATE POLICY "Gestion Dueño Progress" ON daily_progress FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM activities a JOIN items i ON a.item_id = i.id JOIN partidas pa ON i.partida_id = pa.id JOIN projects p ON pa.project_id = p.id WHERE a.id = activity_id AND p.owner_id = auth.uid()));

CREATE POLICY "Anon Leer Progress" ON daily_progress FOR SELECT TO anon USING (EXISTS(SELECT 1 FROM activities a JOIN items i ON a.item_id = i.id JOIN partidas pa ON i.partida_id = pa.id JOIN projects p ON pa.project_id = p.id WHERE a.id = activity_id AND p.share_token IS NOT NULL));

-- !!! EL BUCLE DE LA MUERTE SE ACABA DE EXTINGUIR AQUÍ Y AHORA !!!
