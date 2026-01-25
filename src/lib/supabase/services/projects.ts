import { supabase, isSupabaseConfigured } from '../client';
import type {
  Project,
  ProjectWithMembers,
  Scan,
  InsertTables,
  UpdateTables,
  UserRole,
  IndustryType,
} from '../database.types';

export interface ProjectsFilter {
  industry?: IndustryType;
  isArchived?: boolean;
  userId?: string;
  role?: UserRole;
}

/**
 * Get all projects the current user has access to
 */
export async function getProjects(filter?: ProjectsFilter): Promise<ProjectWithMembers[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  let query = supabase
    .from('projects')
    .select(`
      *,
      members:project_members(
        *,
        profile:profiles(*)
      ),
      scans(*)
    `)
    .order('updated_at', { ascending: false });

  if (filter?.industry) {
    query = query.eq('industry', filter.industry);
  }

  if (filter?.isArchived !== undefined) {
    query = query.eq('is_archived', filter.isArchived);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return (data || []) as ProjectWithMembers[];
}

/**
 * Get a single project by ID with all relations
 */
export async function getProjectById(projectId: string): Promise<ProjectWithMembers | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      members:project_members(
        *,
        profile:profiles(*)
      ),
      scans(*)
    `)
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data as ProjectWithMembers;
}

/**
 * Create a new project
 */
export async function createProject(
  project: InsertTables<'projects'>
): Promise<{ data: Project | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  // Add creator as owner
  if (data) {
    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: project.created_by,
      role: 'owner',
    });

    if (memberError) {
      console.error('Error adding creator as project member:', memberError);
      // Project was created, but member wasn't added - log but don't fail
    }
  }

  return { data, error: null };
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: UpdateTables<'projects'>
): Promise<{ data: Project | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Archive a project
 */
export async function archiveProject(projectId: string): Promise<{ error: Error | null }> {
  const { error } = await updateProject(projectId, { is_archived: true });
  return { error };
}

/**
 * Delete a project (permanent)
 */
export async function deleteProject(projectId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Add a member to a project
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: UserRole = 'viewer'
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Update a project member's role
 */
export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: UserRole
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Get user's role in a project
 */
export async function getUserProjectRole(
  projectId: string,
  userId: string
): Promise<UserRole | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}
