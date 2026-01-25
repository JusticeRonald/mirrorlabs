import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getProjects, getProjectById, type ProjectsFilter } from '@/lib/supabase/services/projects';
import type { ProjectWithMembers } from '@/lib/supabase/database.types';
import { mockProjects, type Project as MockProject, type Scan as MockScan } from '@/data/mockProjects';
import { useAuth } from '@/contexts/AuthContext';

// Well-known ID for demo workspace (matches migration)
export const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000002';

// Unified project type that works for both mock and real data
export interface UnifiedProject {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  industry: 'construction' | 'real-estate' | 'cultural';
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  scanCount: number;
  scans: UnifiedScan[];
  userRole: 'owner' | 'editor' | 'viewer';
}

export interface UnifiedScan {
  id: string;
  name: string;
  thumbnail: string | null;
  date: string;
  createdAt: string;
  annotationCount: number;
  collaborators: number;
  measurements?: number;
  modelUrl?: string;
  fileUrl?: string;
  status?: string;
}

// Convert mock project to unified format
function mockToUnified(project: MockProject): UnifiedProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    thumbnail: project.thumbnail,
    industry: project.industry,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    isArchived: project.isArchived,
    scanCount: project.scanCount,
    userRole: project.userRole,
    scans: project.scans.map(scan => ({
      id: scan.id,
      name: scan.name,
      thumbnail: scan.thumbnail,
      date: scan.date,
      createdAt: scan.createdAt,
      annotationCount: scan.annotationCount,
      collaborators: scan.collaborators,
      measurements: scan.measurements,
      modelUrl: scan.modelUrl,
    })),
  };
}

// Convert Supabase project to unified format
function supabaseToUnified(project: ProjectWithMembers, userId?: string): UnifiedProject {
  // Determine user's role
  const membership = userId
    ? project.members.find(m => m.user_id === userId)
    : null;
  const userRole = membership?.role || 'viewer';

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    thumbnail: project.thumbnail_url,
    industry: project.industry,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    isArchived: project.is_archived,
    scanCount: project.scans?.length || 0,
    userRole,
    scans: (project.scans || []).map(scan => ({
      id: scan.id,
      name: scan.name,
      thumbnail: scan.thumbnail_url,
      date: new Date(scan.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      createdAt: scan.created_at,
      annotationCount: 0, // Would need to query annotations
      collaborators: project.members?.length || 1,
      measurements: 0, // Would need to query measurements
      fileUrl: scan.file_url,
      status: scan.status,
    })),
  };
}

interface UseProjectsOptions {
  filter?: ProjectsFilter;
  enabled?: boolean;
}

interface UseProjectsResult {
  projects: UnifiedProject[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isUsingMockData: boolean;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
  const { filter, enabled = true } = options;
  const { user, isDemoMode } = useAuth();
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use mock data only when Supabase is not configured at all
  // When in demo mode with Supabase configured, query the demo workspace
  const supabaseConfigured = isSupabaseConfigured();
  const isUsingMockData = !supabaseConfigured;

  const fetchProjects = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!supabaseConfigured) {
        // Ultimate fallback: use hardcoded mock data when Supabase not configured
        let filtered = mockProjects;

        if (filter?.industry) {
          filtered = filtered.filter(p => p.industry === filter.industry);
        }

        if (filter?.isArchived !== undefined) {
          filtered = filtered.filter(p => p.isArchived === filter.isArchived);
        }

        if (filter?.role) {
          filtered = filtered.filter(p => p.userRole === filter.role);
        }

        setProjects(filtered.map(mockToUnified));
      } else if (isDemoMode) {
        // Demo mode with Supabase: query demo workspace
        let query = supabase
          .from('projects')
          .select(`
            *,
            scans (*),
            members:project_members (
              id,
              user_id,
              role,
              created_at,
              profile:profiles (id, email, name, avatar_url, initials)
            )
          `)
          .eq('workspace_id', DEMO_WORKSPACE_ID);

        if (filter?.industry) {
          query = query.eq('industry', filter.industry);
        }

        if (filter?.isArchived !== undefined) {
          query = query.eq('is_archived', filter.isArchived);
        }

        const { data, error: queryError } = await query.order('updated_at', { ascending: false });

        if (queryError) {
          // Fallback to mock data if demo workspace query fails
          console.warn('Demo workspace query failed, falling back to mock data:', queryError);
          setProjects(mockProjects.map(mockToUnified));
        } else {
          setProjects((data || []).map(p => supabaseToUnified(p as ProjectWithMembers, user?.id)));
        }
      } else {
        // Authenticated mode: use regular Supabase query
        const data = await getProjects(filter);
        setProjects(data.map(p => supabaseToUnified(p, user?.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
      // Fallback to mock data on error
      if (!supabaseConfigured || isDemoMode) {
        setProjects(mockProjects.map(mockToUnified));
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, supabaseConfigured, isDemoMode, filter, user?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    isUsingMockData,
  };
}

interface UseProjectResult {
  project: UnifiedProject | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isUsingMockData: boolean;
}

export function useProject(projectId: string | undefined): UseProjectResult {
  const { user, isDemoMode } = useAuth();
  const [project, setProject] = useState<UnifiedProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabaseConfigured = isSupabaseConfigured();
  const isUsingMockData = !supabaseConfigured;

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!supabaseConfigured) {
        // Ultimate fallback: use hardcoded mock data
        const mockProject = mockProjects.find(p => p.id === projectId);
        setProject(mockProject ? mockToUnified(mockProject) : null);
      } else if (isDemoMode) {
        // Demo mode with Supabase: query demo workspace for specific project
        const { data, error: queryError } = await supabase
          .from('projects')
          .select(`
            *,
            scans (*),
            members:project_members (
              id,
              user_id,
              role,
              created_at,
              profile:profiles (id, email, name, avatar_url, initials)
            )
          `)
          .eq('id', projectId)
          .eq('workspace_id', DEMO_WORKSPACE_ID)
          .single();

        if (queryError) {
          // Fallback to mock data if query fails
          const mockProject = mockProjects.find(p => p.id === projectId);
          setProject(mockProject ? mockToUnified(mockProject) : null);
        } else {
          setProject(data ? supabaseToUnified(data as ProjectWithMembers, user?.id) : null);
        }
      } else {
        // Authenticated mode: use regular Supabase query
        const data = await getProjectById(projectId);
        setProject(data ? supabaseToUnified(data, user?.id) : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project'));
      // Fallback to mock data on error
      if (!supabaseConfigured || isDemoMode) {
        const mockProject = mockProjects.find(p => p.id === projectId);
        setProject(mockProject ? mockToUnified(mockProject) : null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, supabaseConfigured, isDemoMode, user?.id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    isLoading,
    error,
    refetch: fetchProject,
    isUsingMockData,
  };
}

/**
 * Hook for Admin Demo page - always queries demo workspace directly
 * Used by staff to manage demo content
 */
export function useDemoProjects(): UseProjectsResult {
  const { user } = useAuth();
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabaseConfigured = isSupabaseConfigured();
  const isUsingMockData = !supabaseConfigured;

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabaseConfigured) {
        // Fallback to mock data when Supabase not configured
        setProjects(mockProjects.map(mockToUnified));
      } else {
        // Query demo workspace directly
        const { data, error: queryError } = await supabase
          .from('projects')
          .select(`
            *,
            scans (*),
            members:project_members (
              id,
              user_id,
              role,
              created_at,
              profile:profiles (id, email, name, avatar_url, initials)
            )
          `)
          .eq('workspace_id', DEMO_WORKSPACE_ID)
          .order('updated_at', { ascending: false });

        if (queryError) {
          console.warn('Demo workspace query failed:', queryError);
          setProjects(mockProjects.map(mockToUnified));
        } else {
          setProjects((data || []).map(p => supabaseToUnified(p as ProjectWithMembers, user?.id)));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch demo projects'));
      setProjects(mockProjects.map(mockToUnified));
    } finally {
      setIsLoading(false);
    }
  }, [supabaseConfigured, user?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    isUsingMockData,
  };
}

// Helper functions that mirror the old mockProjects helpers
export function getActiveProjects(projects: UnifiedProject[]): UnifiedProject[] {
  return projects.filter(p => !p.isArchived);
}

export function getArchivedProjects(projects: UnifiedProject[]): UnifiedProject[] {
  return projects.filter(p => p.isArchived);
}

export function getProjectsByIndustry(
  projects: UnifiedProject[],
  industry: UnifiedProject['industry']
): UnifiedProject[] {
  return projects.filter(p => p.industry === industry);
}

export function getProjectsByRole(
  projects: UnifiedProject[],
  role: UnifiedProject['userRole']
): UnifiedProject[] {
  return projects.filter(p => p.userRole === role);
}
