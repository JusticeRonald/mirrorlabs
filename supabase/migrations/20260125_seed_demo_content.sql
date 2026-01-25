-- Migration: Seed Demo Content
-- Description: Creates demo workspace with 12 projects and sample scans for public demo

-- Well-known IDs for demo content
-- Demo User: 00000000-0000-0000-0000-000000000001
-- Demo Workspace: 00000000-0000-0000-0000-000000000002
-- Projects: 00000000-0000-0000-0001-00000000000X (1-12)
-- Scans: 00000000-0000-0000-0002-00000000000X (1-23)

-- 1. Create demo system user profile
INSERT INTO profiles (id, email, name, initials, account_type, is_staff, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@mirrorlabs3d.local',
  'Demo System',
  'DS',
  'staff',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create demo workspace
INSERT INTO workspaces (id, name, slug, type, owner_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Demo Workspace',
  'demo',
  'business',
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Add demo user to workspace as owner
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  NOW()
) ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 4. Insert demo projects (12 total)
-- Construction Projects (1-4)
INSERT INTO projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived, created_by, created_at, updated_at)
VALUES
  -- Project 1: Downtown Office Tower
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002',
   'Downtown Office Tower',
   '45-story commercial tower with MEP coordination and structural documentation',
   'construction',
   'https://images.unsplash.com/photo-1486718448742-163732cd1544?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-12-01', '2025-01-15'),

  -- Project 2: Hospital Wing Addition
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002',
   'Hospital Wing Addition',
   'Critical care expansion with specialized equipment coordination',
   'construction',
   'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-11-15', '2025-01-12'),

  -- Project 3: Mixed-Use Development
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002',
   'Mixed-Use Development',
   'Retail podium with residential tower above',
   'construction',
   'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-10-20', '2025-01-10'),

  -- Project 4: Industrial Warehouse Complex (Archived)
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002',
   'Industrial Warehouse Complex',
   '500,000 sq ft distribution center with dock facilities',
   'construction',
   'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop',
   true,
   '00000000-0000-0000-0000-000000000001',
   '2024-08-15', '2024-11-20'),

  -- Real Estate Projects (5-8)
  -- Project 5: Luxury Penthouse Listing
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000002',
   'Luxury Penthouse Listing',
   'High-end residential property with panoramic views',
   'real-estate',
   'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2025-01-05', '2025-01-14'),

  -- Project 6: Commercial Office Space
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000002',
   'Commercial Office Space',
   'Class A office building available for lease',
   'real-estate',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-12-15', '2025-01-08'),

  -- Project 7: Retail Storefront
  ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000002',
   'Retail Storefront',
   'Prime location retail space in shopping district',
   'real-estate',
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-11-20', '2025-01-02'),

  -- Project 8: Historic Brownstone (Archived)
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000002',
   'Historic Brownstone',
   'Renovated 1890s townhouse in heritage district',
   'real-estate',
   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
   true,
   '00000000-0000-0000-0000-000000000001',
   '2024-09-10', '2024-10-15'),

  -- Cultural & Hospitality Projects (9-12)
  -- Project 9: Contemporary Art Museum
  ('00000000-0000-0000-0001-000000000009', '00000000-0000-0000-0000-000000000002',
   'Contemporary Art Museum',
   'Exhibition space documentation for virtual tours',
   'cultural',
   'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2025-01-02', '2025-01-14'),

  -- Project 10: Boutique Hotel Renovation
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000002',
   'Boutique Hotel Renovation',
   'Historic property restoration and modernization',
   'cultural',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-11-10', '2025-01-06'),

  -- Project 11: Historic Theater Restoration
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000002',
   'Historic Theater Restoration',
   '1920s theater preservation and acoustic documentation',
   'cultural',
   'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=300&fit=crop',
   false,
   '00000000-0000-0000-0000-000000000001',
   '2024-09-20', '2024-12-15'),

  -- Project 12: Concert Venue (Archived)
  ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000002',
   'Concert Venue',
   'Live music venue acoustic and spatial documentation',
   'cultural',
   'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
   true,
   '00000000-0000-0000-0000-000000000001',
   '2024-06-15', '2024-08-20')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert demo scans (using placeholder file URLs)
INSERT INTO scans (id, project_id, name, file_url, file_type, file_size, thumbnail_url, status, created_by, created_at, updated_at)
VALUES
  -- Project 1 Scans (Downtown Office Tower)
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001',
   'Level 23 - MEP Rough-in',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-12', '2025-01-12'),

  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000001',
   'Level 22 - Framing Complete',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-10', '2025-01-10'),

  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000001',
   'Lobby - Progress Update',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-08', '2025-01-08'),

  -- Project 2 Scans (Hospital Wing Addition)
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0001-000000000002',
   'Operating Suite - Framing',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-08', '2025-01-08'),

  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0001-000000000002',
   'Patient Rooms Wing',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-05', '2025-01-05'),

  -- Project 3 Scans (Mixed-Use Development)
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0001-000000000003',
   'Retail Level - Progress',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-06', '2025-01-06'),

  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0001-000000000003',
   'Parking Structure B2',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-03', '2025-01-03'),

  -- Project 4 Scans (Industrial Warehouse - Archived)
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0001-000000000004',
   'Loading Dock Area',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2024-11-15', '2024-11-15'),

  -- Project 5 Scans (Luxury Penthouse)
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0001-000000000005',
   'Living & Dining Area',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-12', '2025-01-12'),

  ('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0001-000000000005',
   'Master Suite',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-11', '2025-01-11'),

  ('00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0001-000000000005',
   'Rooftop Terrace',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-10', '2025-01-10'),

  -- Project 6 Scans (Commercial Office Space)
  ('00000000-0000-0000-0002-000000000012', '00000000-0000-0000-0001-000000000006',
   'Open Floor Plan',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-05', '2025-01-05'),

  ('00000000-0000-0000-0002-000000000013', '00000000-0000-0000-0001-000000000006',
   'Executive Offices',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-03', '2025-01-03'),

  -- Project 7 Scans (Retail Storefront)
  ('00000000-0000-0000-0002-000000000014', '00000000-0000-0000-0001-000000000007',
   'Main Sales Floor',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2024-12-28', '2024-12-28'),

  -- Project 8 Scans (Historic Brownstone - Archived)
  ('00000000-0000-0000-0002-000000000015', '00000000-0000-0000-0001-000000000008',
   'Main Parlor',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2024-10-10', '2024-10-10'),

  -- Project 9 Scans (Contemporary Art Museum)
  ('00000000-0000-0000-0002-000000000016', '00000000-0000-0000-0001-000000000009',
   'Main Gallery Hall',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-10', '2025-01-10'),

  ('00000000-0000-0000-0002-000000000017', '00000000-0000-0000-0001-000000000009',
   'Sculpture Garden',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-08', '2025-01-08'),

  ('00000000-0000-0000-0002-000000000018', '00000000-0000-0000-0001-000000000009',
   'Modern Wing',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-06', '2025-01-06'),

  -- Project 10 Scans (Boutique Hotel Renovation)
  ('00000000-0000-0000-0002-000000000019', '00000000-0000-0000-0001-000000000010',
   'Grand Lobby',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-04', '2025-01-04'),

  ('00000000-0000-0000-0002-000000000020', '00000000-0000-0000-0001-000000000010',
   'Presidential Suite',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2025-01-02', '2025-01-02'),

  -- Project 11 Scans (Historic Theater Restoration)
  ('00000000-0000-0000-0002-000000000021', '00000000-0000-0000-0001-000000000011',
   'Main Auditorium',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2024-12-10', '2024-12-10'),

  ('00000000-0000-0000-0002-000000000022', '00000000-0000-0000-0001-000000000011',
   'Stage & Backstage',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2024-12-08', '2024-12-08'),

  -- Project 12 Scans (Concert Venue - Archived)
  ('00000000-0000-0000-0002-000000000023', '00000000-0000-0000-0001-000000000012',
   'Main Stage',
   '/splats/placeholder.ply', 'ply', 0,
   'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
   'ready', '00000000-0000-0000-0000-000000000001', '2024-08-15', '2024-08-15')
ON CONFLICT (id) DO NOTHING;

-- Summary:
-- Demo Workspace: 00000000-0000-0000-0000-000000000002
-- 12 Projects (4 per industry: construction, real-estate, cultural)
-- 23 Scans total
-- All owned by demo system user
