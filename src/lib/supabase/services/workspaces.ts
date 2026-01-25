import { supabase, isSupabaseConfigured } from '../client';
import type {
  Workspace,
  InsertTables,
  UpdateTables,
  UserRole,
  Profile,
  Project,
  WorkspaceType,
} from '../database.types';

// Validate UUID format to prevent mock IDs from reaching PostgreSQL
function isValidUUID(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Workspace with member count and project count
 */
export interface WorkspaceWithCounts extends Workspace {
  member_count: number;
  project_count: number;
}

/**
 * Workspace with full details including members and projects
 */
export interface WorkspaceWithDetails extends Workspace {
  members: { profile: Profile; role: UserRole }[];
  projects: Project[];
}

/**
 * Get all workspaces (staff only)
 * @param type Optional filter by workspace type (personal/business)
 */
export async function getWorkspaces(type?: WorkspaceType): Promise<WorkspaceWithCounts[]> {
  if (!isSupabaseConfigured()) {
    // Return mock data for demo mode
    return getMockWorkspaces(type);
  }

  let query = supabase
    .from('workspaces')
    .select('*')
    .order('name', { ascending: true });

  // Filter by type if specified
  if (type) {
    query = query.eq('type', type);
  }

  const { data: workspaces, error: workspacesError } = await query;

  if (workspacesError) {
    console.error('Error fetching workspaces:', workspacesError);
    return [];
  }

  // Get member counts and project counts
  const workspacesWithCounts = await Promise.all(
    (workspaces || []).map(async (ws) => {
      try {
        const [membersResult, projectsResult] = await Promise.all([
          supabase
            .from('workspace_members')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', ws.id),
          supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', ws.id),
        ]);

        return {
          ...ws,
          member_count: membersResult.count || 0,
          project_count: projectsResult.count || 0,
        };
      } catch (error) {
        // If enrichment fails for a workspace, return it with zero counts
        console.error(`Error enriching workspace ${ws.id}:`, error);
        return {
          ...ws,
          member_count: 0,
          project_count: 0,
        };
      }
    })
  );

  return workspacesWithCounts;
}

/**
 * Get a single workspace by ID with full details
 */
export async function getWorkspaceById(workspaceId: string): Promise<WorkspaceWithDetails | null> {
  if (!isSupabaseConfigured()) {
    return getMockWorkspaceById(workspaceId);
  }

  const { data: ws, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (wsError || !ws) {
    console.error('Error fetching workspace:', wsError);
    return null;
  }

  // Get members with profiles
  const { data: members } = await supabase
    .from('workspace_members')
    .select(`
      role,
      profile:profiles(*)
    `)
    .eq('workspace_id', workspaceId);

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  return {
    ...ws,
    members: (members || []).map((m) => ({
      // Supabase returns profile as array due to join, take first element
      profile: (Array.isArray(m.profile) ? m.profile[0] : m.profile) as Profile,
      role: m.role,
    })),
    projects: projects || [],
  };
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
  workspace: InsertTables<'workspaces'>
): Promise<{ data: Workspace | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert(workspace)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: UpdateTables<'workspaces'>
): Promise<{ data: Workspace | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', workspaceId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(
  workspaceId: string
): Promise<{ profile: Profile; role: UserRole }[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      role,
      profile:profiles(*)
    `)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching workspace members:', error);
    return [];
  }

  return (data || []).map((m) => ({
    // Supabase returns profile as array due to join, take first element
    profile: (Array.isArray(m.profile) ? m.profile[0] : m.profile) as Profile,
    role: m.role,
  }));
}

/**
 * Add a member to a workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: UserRole = 'viewer'
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: userId, role });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Remove a member from a workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Update a member's role in a workspace
 */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: UserRole
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

// Mock business workspaces (one per industry)
// Used to demonstrate admin dashboard features
export const mockWorkspaces: WorkspaceWithCounts[] = [
  {
    id: 'ws-1',
    name: 'Apex Builders',
    slug: 'apex-builders',
    type: 'business',
    owner_id: 'user-2',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    member_count: 2,
    project_count: 4,
  },
  {
    id: 'ws-2',
    name: 'Metro Realty Group',
    slug: 'metro-realty',
    type: 'business',
    owner_id: 'user-4',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    member_count: 2,
    project_count: 4,
  },
  {
    id: 'ws-3',
    name: 'City Arts Foundation',
    slug: 'city-arts',
    type: 'business',
    owner_id: 'user-3',
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2025-01-14T00:00:00Z',
    member_count: 2,
    project_count: 4,
  },
  {
    id: 'demo',
    name: 'Demo Workspace',
    slug: 'demo',
    type: 'personal',
    owner_id: 'demo-user',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 1,
    project_count: 0,
  },
];

// Mock data for demo mode
function getMockWorkspaces(type?: WorkspaceType): WorkspaceWithCounts[] {
  if (type) {
    return mockWorkspaces.filter(ws => ws.type === type);
  }
  return mockWorkspaces;
}

// Mock members for each workspace
const mockWorkspaceMembers: Record<string, { profile: Profile; role: UserRole }[]> = {
  'ws-1': [
    {
      profile: {
        id: 'user-2',
        email: 'mary@mirrorlabs3d.com',
        name: 'Mary Kim',
        avatar_url: null,
        initials: 'MK',
        account_type: 'staff',
        is_staff: true,
        primary_workspace_id: 'ws-1',
        created_at: '2024-02-15T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
      },
      role: 'owner' as UserRole,
    },
    {
      profile: {
        id: 'user-5',
        email: 'brian@mirrorlabs3d.com',
        name: 'Brian Chen',
        avatar_url: null,
        initials: 'BC',
        account_type: 'staff',
        is_staff: true,
        primary_workspace_id: 'ws-1',
        created_at: '2024-05-20T00:00:00Z',
        updated_at: '2024-05-20T00:00:00Z',
      },
      role: 'editor' as UserRole,
    },
  ],
  'ws-2': [
    {
      profile: {
        id: 'user-4',
        email: 'alex@mirrorlabs3d.com',
        name: 'Alex Lee',
        avatar_url: null,
        initials: 'AL',
        account_type: 'staff',
        is_staff: true,
        primary_workspace_id: 'ws-2',
        created_at: '2024-04-05T00:00:00Z',
        updated_at: '2024-04-05T00:00:00Z',
      },
      role: 'owner' as UserRole,
    },
    {
      profile: {
        id: 'user-1',
        email: 'john@mirrorlabs3d.com',
        name: 'John Davis',
        avatar_url: null,
        initials: 'JD',
        account_type: 'staff',
        is_staff: true,
        primary_workspace_id: null,
        created_at: '2024-05-12T00:00:00Z',
        updated_at: '2024-05-12T00:00:00Z',
      },
      role: 'editor' as UserRole,
    },
  ],
  'ws-3': [
    {
      profile: {
        id: 'user-3',
        email: 'sarah@mirrorlabs3d.com',
        name: 'Sarah Rodriguez',
        avatar_url: null,
        initials: 'SR',
        account_type: 'staff',
        is_staff: true,
        primary_workspace_id: 'ws-3',
        created_at: '2024-03-10T00:00:00Z',
        updated_at: '2024-03-10T00:00:00Z',
      },
      role: 'owner' as UserRole,
    },
    {
      profile: {
        id: 'user-2',
        email: 'mary@mirrorlabs3d.com',
        name: 'Mary Kim',
        avatar_url: null,
        initials: 'MK',
        account_type: 'staff',
        is_staff: true,
        primary_workspace_id: 'ws-1',
        created_at: '2024-04-25T00:00:00Z',
        updated_at: '2024-04-25T00:00:00Z',
      },
      role: 'editor' as UserRole,
    },
  ],
};

function getMockWorkspaceById(workspaceId: string): WorkspaceWithDetails | null {
  const workspaces = getMockWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) return null;

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    type: ws.type,
    owner_id: ws.owner_id,
    created_at: ws.created_at,
    updated_at: ws.updated_at,
    members: mockWorkspaceMembers[workspaceId] || [],
    projects: [], // Projects are fetched separately via useProjects hook
  };
}

/**
 * Get workspaces where the specified user is a member
 * Used for client sidebar to show their assigned workspaces
 */
export async function getUserWorkspaces(userId: string): Promise<WorkspaceWithCounts[]> {
  // Return mock data if Supabase not configured OR userId is not a valid UUID (demo mode)
  if (!isSupabaseConfigured() || !isValidUUID(userId)) {
    return getMockUserWorkspaces(userId);
  }

  // Get workspace IDs where user is a member
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId);

  if (membershipError) {
    console.error('Error fetching user workspace memberships:', membershipError);
    return [];
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const workspaceIds = memberships.map((m) => m.workspace_id);

  // Fetch the workspaces
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds)
    .eq('type', 'business') // Only show business workspaces in client sidebar
    .order('name', { ascending: true });

  if (workspacesError) {
    console.error('Error fetching user workspaces:', workspacesError);
    return [];
  }

  // Enrich with counts
  const workspacesWithCounts = await Promise.all(
    (workspaces || []).map(async (ws) => {
      try {
        const [membersResult, projectsResult] = await Promise.all([
          supabase
            .from('workspace_members')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', ws.id),
          supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', ws.id),
        ]);

        return {
          ...ws,
          member_count: membersResult.count || 0,
          project_count: projectsResult.count || 0,
        };
      } catch (error) {
        console.error(`Error enriching workspace ${ws.id}:`, error);
        return {
          ...ws,
          member_count: 0,
          project_count: 0,
        };
      }
    })
  );

  return workspacesWithCounts;
}

// Mock user workspaces for demo mode
function getMockUserWorkspaces(userId: string): WorkspaceWithCounts[] {
  // In demo mode, return a subset of business workspaces
  // Simulating that the demo user has access to specific workspaces
  return mockWorkspaces.filter(
    (ws) => ws.type === 'business' && (ws.id === 'ws-1' || ws.id === 'ws-2')
  );
}

// Legacy exports for backward compatibility
export {
  getWorkspaces as getOrganizations,
  getWorkspaceById as getOrganizationById,
  createWorkspace as createOrganization,
  updateWorkspace as updateOrganization,
  getWorkspaceMembers as getOrganizationMembers,
  addWorkspaceMember as addOrganizationMember,
  removeWorkspaceMember as removeOrganizationMember,
  updateWorkspaceMemberRole as updateOrganizationMemberRole,
};
export type { WorkspaceWithCounts as OrganizationWithCounts };
export type { WorkspaceWithDetails as OrganizationWithDetails };
