import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  FolderOpen,
  Users,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  Archive,
  Edit,
  FileStack,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin';
import { getProjectById } from '@/lib/supabase/services/projects';
import type { ProjectWithMembers, Scan } from '@/lib/supabase/database.types';

// Navigation context for breadcrumbs
interface ProjectNavigationState {
  from: 'workspace' | 'projects';
  workspaceId?: string;
  workspaceName?: string;
}

const industryLabels: Record<string, string> = {
  construction: 'Construction',
  'real-estate': 'Real Estate',
  cultural: 'Cultural & Hospitality',
};

const industryColors: Record<string, string> = {
  construction: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'real-estate': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  cultural: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const statusColors: Record<string, string> = {
  ready: 'bg-green-500/10 text-green-500 border-green-500/20',
  processing: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  uploading: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const AdminProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navState = location.state as ProjectNavigationState | null;
  const [project, setProject] = useState<ProjectWithMembers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      setIsLoading(true);
      const proj = await getProjectById(id);
      setProject(proj);
      setIsLoading(false);
    };
    fetchProject();
  }, [id]);

  // Build breadcrumbs based on navigation context
  const breadcrumbs = useMemo(() => {
    if (!project) return [{ label: 'Projects', href: '/admin/projects' }];

    if (navState?.from === 'workspace' && navState.workspaceName && navState.workspaceId) {
      // Came from workspace detail
      return [
        { label: 'Workspaces', href: '/admin/workspaces' },
        { label: navState.workspaceName, href: `/admin/workspaces/${navState.workspaceId}` },
        { label: project.name },
      ];
    }
    // Came from projects list (or direct navigation)
    return [
      { label: 'Projects', href: '/admin/projects' },
      { label: project.name },
    ];
  }, [navState, project]);

  if (isLoading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!project) {
    return (
      <AdminLayout title="Project Not Found">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Project not found</h3>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/admin/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  // Get viewer link for a scan
  const getViewerLink = (scan: Scan) => {
    return `/viewer/${project.id}/${scan.id}`;
  };

  // Get first scan for quick open
  const firstReadyScan = project.scans?.find(s => s.status === 'ready');

  return (
    <AdminLayout
      title={project.name}
      breadcrumbs={breadcrumbs}
    >
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Thumbnail */}
            {project.thumbnail_url ? (
              <img
                src={project.thumbnail_url}
                alt={project.name}
                className="w-24 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-16 rounded-lg bg-muted flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold">{project.name}</h2>
                <Badge className={industryColors[project.industry]}>
                  {industryLabels[project.industry]}
                </Badge>
                {project.is_archived && (
                  <Badge variant="secondary">
                    <Archive className="w-3 h-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
              {project.description && (
                <p className="text-muted-foreground mb-3">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileStack className="w-4 h-4" />
                  <span>{project.scans?.length || 0} scans</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{project.members?.length || 0} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" disabled>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {firstReadyScan && (
                <Button asChild>
                  <Link to={getViewerLink(firstReadyScan)}>
                    <Play className="w-4 h-4 mr-2" />
                    Open Viewer
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scans Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Scans</h3>
        {!project.scans || project.scans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileStack className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No scans yet</h3>
              <p className="text-muted-foreground">
                This project doesn't have any scans uploaded.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.scans.map((scan) => (
              <Card key={scan.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {scan.thumbnail_url ? (
                        <img
                          src={scan.thumbnail_url}
                          alt={scan.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <FileStack className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{scan.name}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          {scan.description || `${scan.file_type.toUpperCase()} file`}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {scan.status === 'ready' && (
                          <DropdownMenuItem asChild>
                            <Link to={getViewerLink(scan)}>Open in Viewer</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" disabled>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <Badge className={statusColors[scan.status] || 'bg-muted'}>
                      {scan.status}
                    </Badge>
                    <span>{(scan.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                    {scan.splat_count && (
                      <span>{(scan.splat_count / 1000000).toFixed(1)}M splats</span>
                    )}
                  </div>
                  {scan.status === 'ready' ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-between"
                      asChild
                    >
                      <Link to={getViewerLink(scan)}>
                        Open Viewer
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full justify-between"
                      disabled
                    >
                      {scan.status === 'processing' ? 'Processing...' :
                       scan.status === 'uploading' ? 'Uploading...' : 'Unavailable'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Team Members</h3>
        {!project.members || project.members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No members yet</h3>
              <p className="text-muted-foreground">
                No members have been added to this project.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {project.members.map(({ profile, role }) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {profile.initials || profile.name?.substring(0, 2).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{profile.name || 'Unnamed User'}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={role === 'owner' ? 'default' : 'secondary'}>
                        {role}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>Change Role</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProjectDetail;
