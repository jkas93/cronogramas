-- =============================================================
-- CRONOGRAMA — Row Level Security (RLS) Policies
-- Run this AFTER schema.sql in the Supabase SQL Editor
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- HELPER: Check if user is a member of a project
-- =============================================================
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- PROFILES
-- =============================================================
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view profiles of project co-members"
  ON profiles FOR SELECT USING (
    id IN (
      SELECT pm.user_id FROM project_members pm
      WHERE pm.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================================
-- PROJECTS
-- =============================================================
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT USING (
    owner_id = auth.uid() OR is_project_member(id)
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their projects"
  ON projects FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their projects"
  ON projects FOR DELETE USING (owner_id = auth.uid());

-- Public access via share_token (for the /share/[token] route)
CREATE POLICY "Public can view projects by share_token"
  ON projects FOR SELECT USING (share_token IS NOT NULL);

-- =============================================================
-- PROJECT MEMBERS
-- =============================================================
CREATE POLICY "Members can view project membership"
  ON project_members FOR SELECT USING (
    is_project_member(project_id)
  );

CREATE POLICY "Owners can manage members"
  ON project_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can remove members"
  ON project_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- =============================================================
-- PARTIDAS
-- =============================================================
CREATE POLICY "Members can view partidas"
  ON partidas FOR SELECT USING (is_project_member(project_id));

CREATE POLICY "Members can create partidas"
  ON partidas FOR INSERT WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update partidas"
  ON partidas FOR UPDATE USING (is_project_member(project_id));

CREATE POLICY "Members can delete partidas"
  ON partidas FOR DELETE USING (is_project_member(project_id));

-- =============================================================
-- ITEMS
-- =============================================================
CREATE POLICY "Members can view items"
  ON items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can create items"
  ON items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can update items"
  ON items FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can delete items"
  ON items FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM partidas p WHERE p.id = items.partida_id AND is_project_member(p.project_id)
    )
  );

-- =============================================================
-- ACTIVITIES
-- =============================================================
CREATE POLICY "Members can view activities"
  ON activities FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas p ON p.id = i.partida_id
      WHERE i.id = activities.item_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can create activities"
  ON activities FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas p ON p.id = i.partida_id
      WHERE i.id = activities.item_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can update activities"
  ON activities FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas p ON p.id = i.partida_id
      WHERE i.id = activities.item_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can delete activities"
  ON activities FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN partidas p ON p.id = i.partida_id
      WHERE i.id = activities.item_id AND is_project_member(p.project_id)
    )
  );

-- =============================================================
-- DAILY PROGRESS
-- =============================================================
CREATE POLICY "Members can view daily progress"
  ON daily_progress FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN items i ON i.id = a.item_id
      JOIN partidas p ON p.id = i.partida_id
      WHERE a.id = daily_progress.activity_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can create daily progress"
  ON daily_progress FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN items i ON i.id = a.item_id
      JOIN partidas p ON p.id = i.partida_id
      WHERE a.id = daily_progress.activity_id AND is_project_member(p.project_id)
    )
  );

CREATE POLICY "Members can update daily progress"
  ON daily_progress FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN items i ON i.id = a.item_id
      JOIN partidas p ON p.id = i.partida_id
      WHERE a.id = daily_progress.activity_id AND is_project_member(p.project_id)
    )
  );

-- =============================================================
-- ALERTS
-- =============================================================
CREATE POLICY "Members can view alerts"
  ON alerts FOR SELECT USING (is_project_member(project_id));

CREATE POLICY "System can create alerts"
  ON alerts FOR INSERT WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update alerts (mark as read)"
  ON alerts FOR UPDATE USING (is_project_member(project_id));
