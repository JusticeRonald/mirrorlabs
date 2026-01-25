-- ============================================================================
-- FIX INFINITE RECURSION IN projects AND project_members RLS POLICIES (v3)
-- ============================================================================
--
-- Problem: Both projects and project_members tables have self-referential
-- RLS policies that cause infinite recursion.
--
-- Solution: Wrap ALL table lookups in SECURITY DEFINER functions.
-- ============================================================================

-- STEP 1: Create SECURITY DEFINER helper functions

CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_staff FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_member(proj_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proj_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_owner(proj_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proj_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION is_workspace_editor(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION is_project_creator(proj_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND created_by = auth.uid()
  );
$$;

-- STEP 2: Fix projects table policies

DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
DROP POLICY IF EXISTS "Staff can view all projects" ON projects;
DROP POLICY IF EXISTS "Projects viewable by authorized users" ON projects;
DROP POLICY IF EXISTS "Staff or workspace editors can create projects" ON projects;
DROP POLICY IF EXISTS "Projects creatable by staff or workspace editors" ON projects;
DROP POLICY IF EXISTS "Projects updatable by staff or workspace editors" ON projects;
DROP POLICY IF EXISTS "Projects deletable by staff or workspace owners" ON projects;

CREATE POLICY "Projects viewable by authorized users"
  ON projects FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_project_member(id)
    OR is_workspace_member(workspace_id)
    OR is_staff()
  );

CREATE POLICY "Projects creatable by staff or workspace editors"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (is_staff() OR is_workspace_editor(workspace_id))
  );

CREATE POLICY "Projects updatable by staff or workspace editors"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_staff() OR is_workspace_editor(workspace_id))
  WITH CHECK (is_staff() OR is_workspace_editor(workspace_id));

CREATE POLICY "Projects deletable by staff"
  ON projects FOR DELETE
  TO authenticated
  USING (is_staff());

-- STEP 3: Fix project_members table policies (THE KEY FIX)

DROP POLICY IF EXISTS "Project members are visible to project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Project members viewable by authorized users" ON project_members;
DROP POLICY IF EXISTS "Project members manageable by owners or staff" ON project_members;
DROP POLICY IF EXISTS "Project members updatable by owners or staff" ON project_members;
DROP POLICY IF EXISTS "Project members deletable by owners or staff" ON project_members;

CREATE POLICY "Project members viewable by authorized users"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_project_creator(project_id)
    OR is_project_member(project_id)
    OR is_staff()
  );

CREATE POLICY "Project members manageable by owners or staff"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_creator(project_id)
    OR is_project_owner(project_id)
    OR is_staff()
  );

CREATE POLICY "Project members updatable by owners or staff"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_owner(project_id) OR is_staff())
  WITH CHECK (is_project_owner(project_id) OR is_staff());

CREATE POLICY "Project members deletable by owners or staff"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_project_owner(project_id)
    OR is_staff()
  );
