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
      profile: m.profile as unknown as Profile,
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
 * Archive a workspace (soft delete)
 * Note: This would require adding an is_archived field to workspaces table
 */
export async function archiveWorkspace(workspaceId: string): Promise<{ error: Error | null }> {
  // For now, we don't have an is_archived field, so this is a placeholder
  console.warn('archiveWorkspace not fully implemented - needs schema update');
  return { error: null };
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
    profile: m.profile as unknown as Profile,
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
    member_count: 5,
    project_count: 4, // proj-1, proj-2, proj-3, proj-4
  },
  {
    id: 'ws-2',
    name: 'Metro Realty Group',
    slug: 'metro-realty',
    type: 'business',
    owner_id: 'user-4',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    member_count: 3,
    project_count: 4, // proj-5, proj-6, proj-7, proj-8
  },
  {
    id: 'ws-3',
    name: 'City Arts Foundation',
    slug: 'city-arts',
    type: 'business',
    owner_id: 'user-3',
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2025-01-14T00:00:00Z',
    member_count: 4,
    project_count: 4, // proj-9, proj-10, proj-11, proj-12
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
        email: 'john@apexbuilders.com',
        name: 'John Smith',
        avatar_url: null,
        initials: 'JS',
        account_type: 'client',
        is_staff: false,
        primary_workspace_id: 'ws-1',
        created_at: '2024-02-15T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
      },
      role: 'owner' as UserRole,
    },
    {
      profile: {
        id: 'user-5',
        email: 'lisa@apexbuilders.com',
        name: 'Lisa Rodriguez',
        avatar_url: null,
        initials: 'LR',
        account_type: 'client',
        is_staff: false,
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
        email: 'mike@metrorealty.com',
        name: 'Mike Chen',
        avatar_url: null,
        initials: 'MC',
        account_type: 'client',
        is_staff: false,
        primary_workspace_id: 'ws-2',
        created_at: '2024-04-05T00:00:00Z',
        updated_at: '2024-04-05T00:00:00Z',
      },
      role: 'owner' as UserRole,
    },
  ],
  'ws-3': [
    {
      profile: {
        id: 'user-3',
        email: 'sarah@cityarts.org',
        name: 'Sarah Johnson',
        avatar_url: null,
        initials: 'SJ',
        account_type: 'client',
        is_staff: false,
        primary_workspace_id: 'ws-3',
        created_at: '2024-03-10T00:00:00Z',
        updated_at: '2024-03-10T00:00:00Z',
      },
      role: 'owner' as UserRole,
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

// Legacy exports for backward compatibility
export {
  getWorkspaces as getOrganizations,
  getWorkspaceById as getOrganizationById,
  createWorkspace as createOrganization,
  updateWorkspace as updateOrganization,
  archiveWorkspace as archiveOrganization,
  getWorkspaceMembers as getOrganizationMembers,
  addWorkspaceMember as addOrganizationMember,
  removeWorkspaceMember as removeOrganizationMember,
  updateWorkspaceMemberRole as updateOrganizationMemberRole,
};
export type { WorkspaceWithCounts as OrganizationWithCounts };
export type { WorkspaceWithDetails as OrganizationWithDetails };
