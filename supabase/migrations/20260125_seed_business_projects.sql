-- Migration: Seed Business Projects
-- Description: Creates sample projects for existing non-demo business workspaces
-- These projects will appear in Admin → Projects tab

-- Well-known IDs for business content (different range from demo content)
-- Demo uses: 00000000-0000-0000-0001-* for projects, 00000000-0000-0000-0002-* for scans
-- Business uses: 00000000-0000-0000-0003-* for projects, 00000000-0000-0000-0004-* for scans

-- ============================================================================
-- Create temporary function to get workspace owner safely
-- ============================================================================
-- Legacy business workspaces may have owner_id = NULL (created before column existed).
-- This function falls back to the first staff user found in profiles.
-- Note: profiles.id has FK to auth.users, so we can't create arbitrary users.

CREATE OR REPLACE FUNCTION temp_get_owner_or_fallback(ws_owner_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ws_owner_id,
    (SELECT id FROM profiles WHERE is_staff = true ORDER BY created_at LIMIT 1),
    (SELECT id FROM profiles ORDER BY created_at LIMIT 1)  -- Any user as last resort
  );
$$;

-- ============================================================================
-- Seed Projects for Apex Builders (a1b2c3d4-0001-4000-8000-000000000001)
-- Industry focus: Construction
-- ============================================================================

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000001'::UUID,
  'a1b2c3d4-0001-4000-8000-000000000001'::UUID,
  'Riverfront Tower - Phase 1',
  '32-story mixed-use development with retail podium and residential units',
  'construction',
  'https://images.unsplash.com/photo-1590274853856-f22d5ee3d228?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2025-12-15',
  '2026-01-20'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0001-4000-8000-000000000001'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000002'::UUID,
  'a1b2c3d4-0001-4000-8000-000000000001'::UUID,
  'Central Station Renovation',
  'Historic transit hub modernization with structural upgrades',
  'construction',
  'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2025-11-01',
  '2026-01-18'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0001-4000-8000-000000000001'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000003'::UUID,
  'a1b2c3d4-0001-4000-8000-000000000001'::UUID,
  'University Science Center',
  'New research facility with lab spaces and clean rooms',
  'construction',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2025-09-20',
  '2026-01-10'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0001-4000-8000-000000000001'::UUID
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed Projects for Metro Realty Group (a1b2c3d4-0002-4000-8000-000000000002)
-- Industry focus: Real Estate
-- ============================================================================

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000004'::UUID,
  'a1b2c3d4-0002-4000-8000-000000000002'::UUID,
  'Lakeside Estate - Premium Listing',
  'Luxury waterfront property with private dock and guest house',
  'real-estate',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-05',
  '2026-01-22'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0002-4000-8000-000000000002'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000005'::UUID,
  'a1b2c3d4-0002-4000-8000-000000000002'::UUID,
  'Downtown Loft Conversion',
  'Industrial building converted to modern loft apartments',
  'real-estate',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2025-12-10',
  '2026-01-15'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0002-4000-8000-000000000002'::UUID
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed Projects for City Arts Foundation (a1b2c3d4-0003-4000-8000-000000000003)
-- Industry focus: Cultural
-- ============================================================================

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000006'::UUID,
  'a1b2c3d4-0003-4000-8000-000000000003'::UUID,
  'Heritage Museum Digital Archive',
  'Complete 3D documentation of permanent collection galleries',
  'cultural',
  'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2025-10-15',
  '2026-01-12'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0003-4000-8000-000000000003'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0003-000000000007'::UUID,
  'a1b2c3d4-0003-4000-8000-000000000003'::UUID,
  'Performing Arts Center',
  'New concert hall with world-class acoustics documentation',
  'cultural',
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=300&fit=crop',
  false,
  temp_get_owner_or_fallback(w.owner_id),
  '2025-11-20',
  '2026-01-08'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0003-4000-8000-000000000003'::UUID
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed Scans for Business Projects (1 scan per project minimum)
-- ============================================================================

-- Scans for Apex Builders projects
INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000001'::UUID,
  '00000000-0000-0000-0003-000000000001'::UUID,
  'Level 15 - Core Structure',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1590274853856-f22d5ee3d228?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-18', '2026-01-18'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0001-4000-8000-000000000001'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000002'::UUID,
  '00000000-0000-0000-0003-000000000002'::UUID,
  'Main Concourse - Existing Conditions',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-15', '2026-01-15'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0001-4000-8000-000000000001'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000003'::UUID,
  '00000000-0000-0000-0003-000000000003'::UUID,
  'Lab Wing A - MEP Rough-in',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-08', '2026-01-08'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0001-4000-8000-000000000001'::UUID
ON CONFLICT (id) DO NOTHING;

-- Scans for Metro Realty Group projects
INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000004'::UUID,
  '00000000-0000-0000-0003-000000000004'::UUID,
  'Main Residence - Full Tour',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-20', '2026-01-20'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0002-4000-8000-000000000002'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000005'::UUID,
  '00000000-0000-0000-0003-000000000005'::UUID,
  'Unit 4B - Staging Complete',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-12', '2026-01-12'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0002-4000-8000-000000000002'::UUID
ON CONFLICT (id) DO NOTHING;

-- Scans for City Arts Foundation projects
INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000006'::UUID,
  '00000000-0000-0000-0003-000000000006'::UUID,
  'Egyptian Antiquities Wing',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-10', '2026-01-10'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0003-4000-8000-000000000003'::UUID
ON CONFLICT (id) DO NOTHING;

INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
SELECT
  '00000000-0000-0000-0004-000000000007'::UUID,
  '00000000-0000-0000-0003-000000000007'::UUID,
  'Main Hall - Acoustic Mapping',
  '/splats/placeholder.ply', 'ply', 0,
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=300&fit=crop',
  'ready',
  temp_get_owner_or_fallback(w.owner_id),
  '2026-01-05', '2026-01-05'
FROM workspaces w
WHERE w.id = 'a1b2c3d4-0003-4000-8000-000000000003'::UUID
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Cleanup: Drop temporary function
-- ============================================================================

DROP FUNCTION IF EXISTS temp_get_owner_or_fallback(UUID);

-- ============================================================================
-- Summary
-- ============================================================================
-- Business workspaces seeded:
-- - Apex Builders: 3 projects (construction)
-- - Metro Realty Group: 2 projects (real-estate)
-- - City Arts Foundation: 2 projects (cultural)
--
-- Total: 7 projects, 7 scans
-- All with status 'ready' and placeholder file URLs
--
-- These projects will appear in:
-- - Admin → Projects (filtered by .neq('workspace_id', DEMO_WORKSPACE_ID))
-- - Each workspace's project list
