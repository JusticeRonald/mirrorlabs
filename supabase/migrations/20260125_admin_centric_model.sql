-- Migration: Admin-Centric Organizational Model
-- Date: 2026-01-25
-- Description: Updates system to admin-centric model where:
--   - Staff creates and manages all business workspaces
--   - Staff assigns clients as members to workspaces
--   - Clients can only view/annotate projects in assigned workspaces
--   - Clients CANNOT create workspaces or projects

-- ============================================================================
-- STEP 1: Update handle_new_user trigger
-- Staff: Gets personal workspace | Clients: Profile only, no workspace
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  personal_ws_id UUID;
  user_name TEXT;
  user_is_staff BOOLEAN;
BEGIN
  -- Get user metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  user_is_staff := NEW.email LIKE '%@mirrorlabs3d.com';

  -- Create profile first (no workspace initially for clients)
  INSERT INTO public.profiles (id, email, name, initials, account_type, is_staff, primary_workspace_id)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    generate_initials(user_name),
    CASE WHEN user_is_staff THEN 'staff' ELSE 'client' END,
    user_is_staff,
    NULL  -- No workspace initially
  );

  -- Only staff gets a personal workspace
  IF user_is_staff THEN
    INSERT INTO workspaces (name, slug, type, owner_id)
    VALUES (
      user_name || '''s Workspace',
      'ws-' || replace(NEW.id::text, '-', ''),
      'personal',
      NEW.id
    ) RETURNING id INTO personal_ws_id;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (personal_ws_id, NEW.id, 'owner');

    UPDATE profiles SET primary_workspace_id = personal_ws_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- STEP 2: Update workspace RLS policies - Only staff can create workspaces
-- ============================================================================

-- Drop old permissive policy
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;

-- Create new restrictive policy
CREATE POLICY "Only staff can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );


-- ============================================================================
-- STEP 3: Update projects RLS policies - Staff or workspace editors only
-- ============================================================================

-- Drop old permissive policy
DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Create new restrictive policy
CREATE POLICY "Staff or workspace editors can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Staff can create projects anywhere
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
      OR
      -- Workspace editors can create in their workspace
      workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );

-- Update project SELECT to include workspace membership
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;

CREATE POLICY "Users can view projects they have access to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Staff can view all projects
CREATE POLICY "Staff can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );


-- ============================================================================
-- STEP 4: Handle legacy client personal workspaces (mark as legacy)
-- Note: This is non-destructive - workspaces are renamed but not deleted
-- ============================================================================

-- Mark client personal workspaces as legacy (don't delete)
UPDATE workspaces
SET name = name || ' (Legacy)'
WHERE type = 'personal'
AND name NOT LIKE '% (Legacy)'
AND owner_id IN (SELECT id FROM profiles WHERE is_staff = false);

-- Nullify primary_workspace_id for clients with legacy personal workspaces
UPDATE profiles
SET primary_workspace_id = NULL
WHERE is_staff = false
AND primary_workspace_id IN (
  SELECT id FROM workspaces
  WHERE type = 'personal' AND name LIKE '% (Legacy)'
);
