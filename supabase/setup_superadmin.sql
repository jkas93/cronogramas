-- =============================================================
-- CRONOGRAMA — SUPERADMIN ROLE & RLS SETUP
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. Agregar columna system_role a profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS system_role TEXT NOT NULL DEFAULT 'user' 
  CHECK (system_role IN ('user', 'superadmin'));

-- Índice para queries rápidas  
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON profiles(system_role);

-- Función helper: ¿Es superadmin el usuario actual?
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND system_role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- EXTENDER RLS EXISTENTES CON OR is_superadmin()
-- ═══════════════════════════════════════════

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view own profile or superadmin sees all"
  ON profiles FOR SELECT USING (id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update own profile, superadmin can change roles"
  ON profiles FOR UPDATE USING (id = auth.uid() OR is_superadmin()) 
  WITH CHECK (
    CASE 
      WHEN system_role IS DISTINCT FROM (SELECT system_role FROM profiles WHERE id = profiles.id)
      THEN is_superadmin() AND id != auth.uid()
      ELSE id = auth.uid() OR is_superadmin()
    END
  );

-- PROJECTS  
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view own projects or superadmin sees all"
  ON projects FOR SELECT USING (owner_id = auth.uid() OR is_project_member(id) OR is_superadmin());

DROP POLICY IF EXISTS "Owners can update their projects" ON projects;
CREATE POLICY "Owners or superadmin can update projects"
  ON projects FOR UPDATE USING (owner_id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "Owners can delete their projects" ON projects;
CREATE POLICY "Owners or superadmin can delete projects"
  ON projects FOR DELETE USING (owner_id = auth.uid() OR is_superadmin());

-- PROJECT MEMBERS
DROP POLICY IF EXISTS "Members can view project membership" ON project_members;
CREATE POLICY "Members or superadmin can view membership"
  ON project_members FOR SELECT USING (is_project_member(project_id) OR is_superadmin());

DROP POLICY IF EXISTS "Owners can manage members" ON project_members;
CREATE POLICY "Owners or superadmin can manage members"
  ON project_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Owners can remove members" ON project_members;
CREATE POLICY "Owners or superadmin can remove members"
  ON project_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Superadmin can update member roles" ON project_members;
CREATE POLICY "Superadmin can update member roles"
  ON project_members FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()) OR is_superadmin()
  );

-- PARTIDAS
DROP POLICY IF EXISTS "Members can view partidas" ON partidas;
CREATE POLICY "Members or superadmin can view partidas"
  ON partidas FOR SELECT USING (is_project_member(project_id) OR is_superadmin());

DROP POLICY IF EXISTS "Members can create partidas" ON partidas;
CREATE POLICY "Members or superadmin can create partidas"
  ON partidas FOR INSERT WITH CHECK (is_project_member(project_id) OR is_superadmin());

DROP POLICY IF EXISTS "Members can update partidas" ON partidas;
CREATE POLICY "Members or superadmin can update partidas"
  ON partidas FOR UPDATE USING (is_project_member(project_id) OR is_superadmin());

DROP POLICY IF EXISTS "Members can delete partidas" ON partidas;
CREATE POLICY "Members or superadmin can delete partidas"
  ON partidas FOR DELETE USING (is_project_member(project_id) OR is_superadmin());

-- ITEMS
DROP POLICY IF EXISTS "Members can view items" ON items;
CREATE POLICY "Members or superadmin can view items"
  ON items FOR SELECT USING (
    EXISTS (SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can create items" ON items;
CREATE POLICY "Members or superadmin can create items"
  ON items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can update items" ON items;
CREATE POLICY "Members or superadmin can update items"
  ON items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can delete items" ON items;
CREATE POLICY "Members or superadmin can delete items"
  ON items FOR DELETE USING (
    EXISTS (SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

-- ACTIVITIES
DROP POLICY IF EXISTS "Members can view activities" ON activities;
CREATE POLICY "Members or superadmin can view activities"
  ON activities FOR SELECT USING (
    EXISTS (SELECT 1 FROM items i JOIN partidas p ON p.id = i.partida_id WHERE i.id = activities.item_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can create activities" ON activities;
CREATE POLICY "Members or superadmin can create activities"
  ON activities FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM items i JOIN partidas p ON p.id = i.partida_id WHERE i.id = activities.item_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can update activities" ON activities;
CREATE POLICY "Members or superadmin can update activities"
  ON activities FOR UPDATE USING (
    EXISTS (SELECT 1 FROM items i JOIN partidas p ON p.id = i.partida_id WHERE i.id = activities.item_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can delete activities" ON activities;
CREATE POLICY "Members or superadmin can delete activities"
  ON activities FOR DELETE USING (
    EXISTS (SELECT 1 FROM items i JOIN partidas p ON p.id = i.partida_id WHERE i.id = activities.item_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

-- DAILY PROGRESS
DROP POLICY IF EXISTS "Members can view daily progress" ON daily_progress;
CREATE POLICY "Members or superadmin can view daily progress"
  ON daily_progress FOR SELECT USING (
    EXISTS (SELECT 1 FROM activities a JOIN items i ON i.id = a.item_id JOIN partidas p ON p.id = i.partida_id WHERE a.id = daily_progress.activity_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can create daily progress" ON daily_progress;
CREATE POLICY "Members or superadmin can create daily progress"
  ON daily_progress FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM activities a JOIN items i ON i.id = a.item_id JOIN partidas p ON p.id = i.partida_id WHERE a.id = daily_progress.activity_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

DROP POLICY IF EXISTS "Members can update daily progress" ON daily_progress;
CREATE POLICY "Members or superadmin can update daily progress"
  ON daily_progress FOR UPDATE USING (
    EXISTS (SELECT 1 FROM activities a JOIN items i ON i.id = a.item_id JOIN partidas p ON p.id = i.partida_id WHERE a.id = daily_progress.activity_id AND is_project_member(p.project_id)) OR is_superadmin()
  );

-- ALERTS
DROP POLICY IF EXISTS "Members can view alerts" ON alerts;
CREATE POLICY "Members or superadmin can view alerts"
  ON alerts FOR SELECT USING (is_project_member(project_id) OR is_superadmin());

DROP POLICY IF EXISTS "System can create alerts" ON alerts;
CREATE POLICY "System or superadmin can create alerts"
  ON alerts FOR INSERT WITH CHECK (is_project_member(project_id) OR is_superadmin());

DROP POLICY IF EXISTS "Members can update alerts (mark as read)" ON alerts;
CREATE POLICY "Members or superadmin can update alerts"
  ON alerts FOR UPDATE USING (is_project_member(project_id) OR is_superadmin());

-- ═══════════════════════════════════════════
-- TABLA DE AUDITORÍA (AUDIT LOG)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,           -- 'create_user', 'change_role', 'delete_project'
  target_type TEXT NOT NULL,      -- 'user', 'project', 'system_role'
  target_id TEXT,                 -- UUID del recurso afectado
  details JSONB DEFAULT '{}',     -- { "old_role": "user", "new_role": "superadmin" }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can view audit log" ON admin_audit_log;
CREATE POLICY "Superadmin can view audit log"
  ON admin_audit_log FOR SELECT USING (is_superadmin());

DROP POLICY IF EXISTS "Superadmin can create audit entries" ON admin_audit_log;
CREATE POLICY "Superadmin can create audit entries"
  ON admin_audit_log FOR INSERT WITH CHECK (is_superadmin());

CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);
