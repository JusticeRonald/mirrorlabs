-- ============================================================================
-- FIX INFINITE RECURSION IN org_members RLS POLICIES
-- ============================================================================
--
-- Problem: The org_members table has self-referential policies that cause
-- infinite recursion when Supabase evaluates them:
--   - "Org members visible to org members" queries org_members to check org_members
--   - "Org owners can manage org members" queries org_members to check org_members
--
-- Solution: Replace with non-recursive policies that:
--   1. Let users see their own memberships directly (user_id = auth.uid())
--   2. Let staff see all memberships (checks profiles.is_staff, not org_members)
--   3. Let org owners manage members (checks user_id directly for ownership)
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
-- ============================================================================

-- STEP 1: Drop the problematic self-referential policies
DROP POLICY IF EXISTS "Org members visible to org members" ON org_members;
DROP POLICY IF EXISTS "Org owners can manage org members" ON org_members;

-- STEP 2: Create non-recursive SELECT policies

-- Users can see their own membership records (direct check, no subquery on org_members)
CREATE POLICY "Users can see own memberships"
  ON org_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Staff can see ALL membership records (checks profiles, not org_members)
CREATE POLICY "Staff can see all memberships"
  ON org_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );

-- STEP 3: Create non-recursive management policies

-- Org owners can INSERT new members
-- Uses a security definer function to safely check ownership
CREATE OR REPLACE FUNCTION check_org_ownership(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$;

-- Users can insert members into orgs they own
CREATE POLICY "Org owners can insert members"
  ON org_members FOR INSERT
  TO authenticated
  WITH CHECK (check_org_ownership(org_id));

-- Users can update members in orgs they own
CREATE POLICY "Org owners can update members"
  ON org_members FOR UPDATE
  TO authenticated
  USING (check_org_ownership(org_id))
  WITH CHECK (check_org_ownership(org_id));

-- Users can delete members from orgs they own
CREATE POLICY "Org owners can delete members"
  ON org_members FOR DELETE
  TO authenticated
  USING (check_org_ownership(org_id));

-- Staff can manage all org memberships
CREATE POLICY "Staff can manage all memberships"
  ON org_members FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = true)
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these queries to verify the migration worked:

-- Check RLS policies on org_members table:
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'org_members';

-- Test as a staff user - should see all memberships:
-- SELECT * FROM org_members;

-- Test as a regular user - should only see own memberships:
-- SELECT * FROM org_members;
