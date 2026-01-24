-- Migration: Add staff RLS policy and seed organization data
-- Run this in Supabase SQL Editor to fix the admin dashboard
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- ============================================================================
-- STEP 1: Add RLS Policy for Staff Users to View All Organizations
-- ============================================================================

-- Drop existing policy if it exists (to make migration idempotent)
DROP POLICY IF EXISTS "Staff can view all organizations" ON organizations;

-- Allow staff users to view ALL organizations
CREATE POLICY "Staff can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_staff = true
    )
  );

-- ============================================================================
-- STEP 2: Insert Seed Organizations
-- ============================================================================

-- Insert client organizations for demo/testing
-- Uses ON CONFLICT to avoid duplicates if migration runs multiple times
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Apex Builders', 'apex-builders', '2024-01-15T00:00:00Z', '2025-01-15T00:00:00Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Metro Realty Group', 'metro-realty', '2024-02-01T00:00:00Z', '2025-01-10T00:00:00Z'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'City Arts Foundation', 'city-arts', '2024-03-10T00:00:00Z', '2025-01-14T00:00:00Z')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these queries to verify the migration worked:

-- Check organizations exist:
-- SELECT id, name, slug FROM organizations;

-- Check RLS policies on organizations table:
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'organizations';

-- Verify staff user can see all organizations:
-- (Run as your staff user)
-- SELECT * FROM organizations;
