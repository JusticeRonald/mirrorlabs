-- ============================================================================
-- WORKSPACE-CENTRIC DATA MODEL MIGRATION
-- ============================================================================
-- This migration renames organizations to workspaces and adds support for
-- personal vs business workspaces. Every user gets a personal workspace on
-- signup, and can optionally create/join business workspaces.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add workspace type enum
-- ============================================================================
CREATE TYPE workspace_type AS ENUM ('personal', 'business');

-- ============================================================================
-- STEP 2: Rename tables
-- ============================================================================

-- Rename organizations → workspaces
ALTER TABLE organizations RENAME TO workspaces;

-- Rename org_members → workspace_members
ALTER TABLE org_members RENAME TO workspace_members;

-- ============================================================================
-- STEP 3: Rename columns
-- ============================================================================

-- Rename org_id → workspace_id in workspace_members
ALTER TABLE workspace_members RENAME COLUMN org_id TO workspace_id;

-- Rename org_id → workspace_id in projects
ALTER TABLE projects RENAME COLUMN org_id TO workspace_id;

-- ============================================================================
-- STEP 4: Add new columns
-- ============================================================================

-- Add workspace type column
ALTER TABLE workspaces ADD COLUMN type workspace_type DEFAULT 'business';

-- Add owner_id for tracking personal workspace owner
ALTER TABLE workspaces ADD COLUMN owner_id UUID REFERENCES profiles(id);

-- Add primary_workspace_id to profiles
ALTER TABLE profiles ADD COLUMN primary_workspace_id UUID;

-- ============================================================================
-- STEP 5: Update existing data
-- ============================================================================

-- Mark all existing organizations as business workspaces
UPDATE workspaces SET type = 'business' WHERE type IS NULL;

-- ============================================================================
-- STEP 6: Update indexes (rename to match new table names)
-- ============================================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_org_members_org;
DROP INDEX IF EXISTS idx_org_members_user;
DROP INDEX IF EXISTS idx_projects_org;

-- Create new indexes with correct names
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);

-- ============================================================================
-- STEP 7: Update triggers
-- ============================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS update_organizations_updated_at ON workspaces;

-- Create new trigger with correct name
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STEP 8: Drop old RLS policies and create new ones
-- ============================================================================

-- Drop old organization policies
DROP POLICY IF EXISTS "Organizations visible to members" ON workspaces;
DROP POLICY IF EXISTS "Users can create organizations" ON workspaces;
DROP POLICY IF EXISTS "Org owners can update organizations" ON workspaces;

-- Drop old org_members policies
DROP POLICY IF EXISTS "Users can see own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Staff can see all memberships" ON workspace_members;
DROP POLICY IF EXISTS "Org owners can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Org owners can update members" ON workspace_members;
DROP POLICY IF EXISTS "Org owners can delete members" ON workspace_members;
DROP POLICY IF EXISTS "Staff can manage all memberships" ON workspace_members;

-- Create new workspace policies
CREATE POLICY "Workspaces visible to members"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Workspace owners can update workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner')
    OR owner_id = auth.uid()
  );

-- Staff can see all workspaces
CREATE POLICY "Staff can see all workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );

-- Staff can manage all workspaces
CREATE POLICY "Staff can manage all workspaces"
  ON workspaces FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );

-- ============================================================================
-- STEP 9: Update helper function for workspace ownership check
-- ============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS check_org_ownership(uuid);

-- Create new function
CREATE OR REPLACE FUNCTION check_workspace_ownership(check_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = check_workspace_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$;

-- Create workspace_members policies
CREATE POLICY "Users can see own memberships"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can see all memberships"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );

CREATE POLICY "Workspace owners can insert members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (check_workspace_ownership(workspace_id));

CREATE POLICY "Workspace owners can update members"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (check_workspace_ownership(workspace_id))
  WITH CHECK (check_workspace_ownership(workspace_id));

CREATE POLICY "Workspace owners can delete members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (check_workspace_ownership(workspace_id));

CREATE POLICY "Staff can manage all memberships"
  ON workspace_members FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );

-- ============================================================================
-- STEP 10: Update handle_new_user trigger to create personal workspace
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  personal_ws_id UUID;
  business_ws_id UUID;
  company_name TEXT;
  user_name TEXT;
  user_is_staff BOOLEAN;
BEGIN
  -- Get user metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  company_name := NEW.raw_user_meta_data->>'company';
  user_is_staff := NEW.email LIKE '%@mirrorlabs3d.com';

  -- Create personal workspace first
  INSERT INTO workspaces (name, slug, type, owner_id)
  VALUES (
    user_name || '''s Workspace',
    'ws-' || replace(NEW.id::text, '-', ''),
    'personal',
    NEW.id
  ) RETURNING id INTO personal_ws_id;

  -- Create profile with personal workspace as primary
  INSERT INTO public.profiles (id, email, name, initials, account_type, is_staff, primary_workspace_id)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    generate_initials(user_name),
    CASE WHEN user_is_staff THEN 'staff' ELSE 'client' END,
    user_is_staff,
    personal_ws_id
  );

  -- Add user as owner of personal workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (personal_ws_id, NEW.id, 'owner');

  -- If company provided, create business workspace
  IF company_name IS NOT NULL AND company_name != '' THEN
    INSERT INTO workspaces (name, slug, type, owner_id)
    VALUES (
      company_name,
      'ws-' || replace(gen_random_uuid()::text, '-', ''),
      'business',
      NEW.id
    ) RETURNING id INTO business_ws_id;

    -- Add user as owner of business workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (business_ws_id, NEW.id, 'owner');

    -- Set business workspace as primary (if provided)
    UPDATE profiles SET primary_workspace_id = business_ws_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 11: Create personal workspaces for existing users
-- ============================================================================

-- For existing users who don't have a personal workspace, create one
DO $$
DECLARE
  user_record RECORD;
  personal_ws_id UUID;
BEGIN
  FOR user_record IN
    SELECT p.id, p.name, p.email
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM workspaces w WHERE w.owner_id = p.id AND w.type = 'personal'
    )
  LOOP
    -- Create personal workspace
    INSERT INTO workspaces (name, slug, type, owner_id)
    VALUES (
      COALESCE(user_record.name, 'User') || '''s Workspace',
      'ws-' || replace(user_record.id::text, '-', ''),
      'personal',
      user_record.id
    ) RETURNING id INTO personal_ws_id;

    -- Add user as owner
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (personal_ws_id, user_record.id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- Set as primary if user doesn't have one
    UPDATE profiles
    SET primary_workspace_id = COALESCE(primary_workspace_id, personal_ws_id)
    WHERE id = user_record.id;
  END LOOP;
END $$;
