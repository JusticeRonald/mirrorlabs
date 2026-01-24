-- Mirror Labs Database Schema
-- Run this in your Supabase SQL Editor to set up the database
-- https://supabase.com/dashboard/project/bmnwweezrdolhitgtzxo/sql

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE scan_status AS ENUM ('uploading', 'processing', 'ready', 'error');
CREATE TYPE annotation_type AS ENUM ('pin', 'comment', 'markup');
CREATE TYPE annotation_status AS ENUM ('open', 'resolved');
CREATE TYPE measurement_type AS ENUM ('distance', 'area', 'angle');
CREATE TYPE measurement_unit AS ENUM ('ft', 'm', 'in', 'cm');
CREATE TYPE industry_type AS ENUM ('construction', 'real-estate', 'cultural');
CREATE TYPE activity_action AS ENUM (
  'project_created',
  'project_updated',
  'scan_uploaded',
  'annotation_created',
  'measurement_created',
  'comment_added',
  'member_invited',
  'member_removed'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Organizations (companies/teams)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  initials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members (many-to-many)
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  industry industry_type DEFAULT 'construction',
  thumbnail_url TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members (many-to-many)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Scans (3D scan files)
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  splat_count INTEGER,
  thumbnail_url TEXT,
  status scan_status DEFAULT 'uploading',
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Annotations (3D markers on scans)
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  type annotation_type DEFAULT 'pin',
  position_x DOUBLE PRECISION NOT NULL,
  position_y DOUBLE PRECISION NOT NULL,
  position_z DOUBLE PRECISION NOT NULL,
  content TEXT NOT NULL,
  status annotation_status DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Annotation Replies (threaded discussion on annotations)
CREATE TABLE annotation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurements (distance, area, angle measurements)
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  type measurement_type DEFAULT 'distance',
  points_json JSONB NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit measurement_unit DEFAULT 'ft',
  label TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Camera Waypoints (saved camera views)
CREATE TABLE camera_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position_json JSONB NOT NULL,
  target_json JSONB NOT NULL,
  fov DOUBLE PRECISION DEFAULT 60,
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments (general comments on scans or annotations)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log (audit trail)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action activity_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_scans_project ON scans(project_id);
CREATE INDEX idx_scans_created_by ON scans(created_by);
CREATE INDEX idx_annotations_scan ON annotations(scan_id);
CREATE INDEX idx_annotation_replies_annotation ON annotation_replies(annotation_id);
CREATE INDEX idx_measurements_scan ON measurements(scan_id);
CREATE INDEX idx_camera_waypoints_scan ON camera_waypoints(scan_id);
CREATE INDEX idx_comments_scan ON comments(scan_id);
CREATE INDEX idx_comments_annotation ON comments(annotation_id);
CREATE INDEX idx_activity_log_project ON activity_log(project_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate initials from name
CREATE OR REPLACE FUNCTION generate_initials(full_name TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
  result TEXT := '';
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN NULL;
  END IF;

  parts := string_to_array(trim(full_name), ' ');

  IF array_length(parts, 1) >= 2 THEN
    result := upper(left(parts[1], 1) || left(parts[array_length(parts, 1)], 1));
  ELSE
    result := upper(left(parts[1], 2));
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scans_updated_at
  BEFORE UPDATE ON scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Projects: Users can see projects they're members of or created
CREATE POLICY "Users can view projects they have access to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Project owners can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Project owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Project Members: Visible to project members
CREATE POLICY "Project members are visible to project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members"
  ON project_members FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Scans: Visible to project members
CREATE POLICY "Scans are visible to project members"
  ON scans FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create scans"
  ON scans FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Scan creators and project owners can update scans"
  ON scans FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Scan creators and project owners can delete scans"
  ON scans FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

-- Annotations, Measurements, Waypoints, Comments: Same pattern as scans
CREATE POLICY "Annotations visible to project members"
  ON annotations FOR SELECT
  TO authenticated
  USING (
    scan_id IN (
      SELECT s.id FROM scans s
      JOIN projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
      UNION
      SELECT s.id FROM scans s
      JOIN project_members pm ON s.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project editors can create annotations"
  ON annotations FOR INSERT
  TO authenticated
  WITH CHECK (
    scan_id IN (
      SELECT s.id FROM scans s
      JOIN projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
      UNION
      SELECT s.id FROM scans s
      JOIN project_members pm ON s.project_id = pm.project_id
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Annotation creators can update their annotations"
  ON annotations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Annotation creators can delete their annotations"
  ON annotations FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Annotation Replies
CREATE POLICY "Annotation replies visible to project members"
  ON annotation_replies FOR SELECT
  TO authenticated
  USING (
    annotation_id IN (SELECT id FROM annotations)
  );

CREATE POLICY "Users can create annotation replies"
  ON annotation_replies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own replies"
  ON annotation_replies FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Measurements
CREATE POLICY "Measurements visible to project members"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    scan_id IN (
      SELECT s.id FROM scans s
      JOIN projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
      UNION
      SELECT s.id FROM scans s
      JOIN project_members pm ON s.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project editors can create measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Measurement creators can delete their measurements"
  ON measurements FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Camera Waypoints
CREATE POLICY "Waypoints visible to project members"
  ON camera_waypoints FOR SELECT
  TO authenticated
  USING (
    scan_id IN (
      SELECT s.id FROM scans s
      JOIN projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
      UNION
      SELECT s.id FROM scans s
      JOIN project_members pm ON s.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project editors can create waypoints"
  ON camera_waypoints FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Waypoint creators can update their waypoints"
  ON camera_waypoints FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Waypoint creators can delete their waypoints"
  ON camera_waypoints FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Comments
CREATE POLICY "Comments visible to project members"
  ON comments FOR SELECT
  TO authenticated
  USING (
    scan_id IN (
      SELECT s.id FROM scans s
      JOIN projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
      UNION
      SELECT s.id FROM scans s
      JOIN project_members pm ON s.project_id = pm.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Comment creators can update their comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Comment creators can delete their comments"
  ON comments FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Activity Log: Read-only for project members
CREATE POLICY "Activity log visible to project members"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Organizations
CREATE POLICY "Organizations visible to members"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org owners can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Org Members
CREATE POLICY "Org members visible to org members"
  ON org_members FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org owners can manage org members"
  ON org_members FOR ALL
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    generate_initials(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
