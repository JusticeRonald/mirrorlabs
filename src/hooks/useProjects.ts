import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getProjects, getProjectById, type ProjectsFilter } from '@/lib/supabase/services/projects';
import type { ProjectWithMembers } from '@/lib/supabase/database.types';
import { mockProjects, type Project as MockProject, type Scan as MockScan } from '@/data/mockProjects';
import { useAuth } from '@/contexts/AuthContext';

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

  const isUsingMockData = !isSupabaseConfigured() || isDemoMode;

  const fetchProjects = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isUsingMockData) {
        // Use mock data
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
      } else {
        // Use Supabase
        const data = await getProjects(filter);
        setProjects(data.map(p => supabaseToUnified(p, user?.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isUsingMockData, filter, user?.id]);

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

  const isUsingMockData = !isSupabaseConfigured() || isDemoMode;

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isUsingMockData) {
        const mockProject = mockProjects.find(p => p.id === projectId);
        setProject(mockProject ? mockToUnified(mockProject) : null);
      } else {
        const data = await getProjectById(projectId);
        setProject(data ? supabaseToUnified(data, user?.id) : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isUsingMockData, user?.id]);

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
