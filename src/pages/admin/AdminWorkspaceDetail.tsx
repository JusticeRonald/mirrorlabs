import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  FolderOpen,
  Users,
  Plus,
  UserPlus,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  List,
  LayoutList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AdminLayout, ProjectPreviewPanel } from '@/components/admin';
import { getWorkspaceById, type WorkspaceWithDetails } from '@/lib/supabase/services/workspaces';
import type { IndustryType } from '@/lib/supabase/database.types';

// Project type for preview panel (maps workspace project to panel format)
interface PreviewProject {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  industry: IndustryType;
  scanCount: number;
  isArchived: boolean;
  updatedAt: string;
  workspaceId?: string;
  scans: Array<{ id: string }>;
}

const AdminWorkspaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<WorkspaceWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectViewMode, setProjectViewMode] = useState<'list' | 'compact'>('compact');
  const [memberViewMode, setMemberViewMode] = useState<'list' | 'compact'>('compact');

  // Preview panel state
  const [selectedProject, setSelectedProject] = useState<PreviewProject | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Convert workspace project to preview panel format
  const handleProjectClick = (project: WorkspaceWithDetails['projects'][0]) => {
    const previewProject: PreviewProject = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      thumbnail: project.thumbnail_url || '/placeholder.svg',
      industry: project.industry,
      scanCount: 0, // Will be loaded in the panel
      isArchived: project.is_archived,
      updatedAt: project.updated_at,
      workspaceId: workspace?.id,
      scans: [],
    };
    setSelectedProject(previewProject);
    setPreviewOpen(true);
  };

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!id) return;
      setIsLoading(true);
      const ws = await getWorkspaceById(id);
      setWorkspace(ws);
      setIsLoading(false);
    };
    fetchWorkspace();
  }, [id]);

  // Generate initials from workspace name
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!workspace) {
    return (
      <AdminLayout title="Workspace Not Found">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Workspace not found</h3>
            <p className="text-muted-foreground mb-4">
              The workspace you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/admin/workspaces">Back to Workspaces</Link>
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={workspace.name}
      breadcrumbs={[
        { label: 'Workspaces', href: '/admin/workspaces' },
        { label: workspace.name },
      ]}
    >
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Workspace initials */}
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {getInitials(workspace.name)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{workspace.name}</h2>
                <Badge variant="secondary">/{workspace.slug}</Badge>
                <Badge variant="outline" className="capitalize">{workspace.type}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  <span>{workspace.projects.length} projects</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{workspace.members.length} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(workspace.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="projects">
        <TabsList className="mb-4">
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Projects
            <Badge variant="secondary" className="ml-1">
              {workspace.projects.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Members
            <Badge variant="secondary" className="ml-1">
              {workspace.members.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects">
          {workspace.projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create the first project for this workspace.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* View Toggle */}
              <div className="flex justify-end mb-4">
                <div className="flex items-center gap-1">
                  <Button
                    variant={projectViewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setProjectViewMode('list')}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={projectViewMode === 'compact' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setProjectViewMode('compact')}
                    title="Compact view"
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {projectViewMode === 'list' ? (
                /* List View - Card Grid */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {workspace.projects.map((project) => (
                    <Card
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      className="group hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {project.thumbnail_url ? (
                              <img
                                src={project.thumbnail_url}
                                alt={project.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-base">{project.name}</CardTitle>
                              <CardDescription className="line-clamp-1">
                                {project.description || 'No description'}
                              </CardDescription>
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/admin/projects/${project.id}`}
                                    state={{
                                      from: 'workspace',
                                      workspaceId: workspace.id,
                                      workspaceName: workspace.name
                                    }}
                                  >
                                    View Project
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <Badge variant="outline" className="text-xs">
                            {project.industry}
                          </Badge>
                          {project.is_archived && (
                            <Badge variant="secondary" className="text-xs">Archived</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full mt-3 justify-between"
                          onClick={(e) => e.stopPropagation()}
                          asChild
                        >
                          <Link
                            to={`/admin/projects/${project.id}`}
                            state={{
                              from: 'workspace',
                              workspaceId: workspace.id,
                              workspaceName: workspace.name
                            }}
                          >
                            Open Project
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Compact View - Table-style rows */
                <Card>
                  <CardContent className="pt-4 pb-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                      <div className="col-span-5">Project</div>
                      <div className="col-span-2">Industry</div>
                      <div className="col-span-3">Updated</div>
                      <div className="col-span-2"></div>
                    </div>
                    {/* Table Rows */}
                    <div className="divide-y divide-border">
                      {workspace.projects.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => handleProjectClick(project)}
                          className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <div className="col-span-5 flex items-center gap-3 min-w-0">
                            {project.thumbnail_url ? (
                              <img
                                src={project.thumbnail_url}
                                alt={project.name}
                                className="w-10 h-7 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{project.name}</span>
                              {project.is_archived && (
                                <Badge variant="secondary" className="text-xs shrink-0">Archived</Badge>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Badge variant="outline" className="text-xs">
                              {project.industry}
                            </Badge>
                          </div>
                          <div className="col-span-3 text-sm text-muted-foreground">
                            {new Date(project.updated_at).toLocaleDateString()}
                          </div>
                          <div className="col-span-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/admin/projects/${project.id}`}
                                    state={{
                                      from: 'workspace',
                                      workspaceId: workspace.id,
                                      workspaceName: workspace.name
                                    }}
                                  >
                                    View Project
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          {workspace.members.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No members yet</h3>
                <p className="text-muted-foreground mb-4">
                  Invite people to this workspace.
                </p>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* View Toggle */}
              <div className="flex justify-end mb-4">
                <div className="flex items-center gap-1">
                  <Button
                    variant={memberViewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setMemberViewMode('list')}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={memberViewMode === 'compact' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setMemberViewMode('compact')}
                    title="Compact view"
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {memberViewMode === 'list' ? (
                /* List View - Bordered Cards */
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {workspace.members.map(({ profile, role }) => (
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
                                <DropdownMenuItem>Change Role</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Compact View - Table-style rows */
                <Card>
                  <CardContent className="pt-4 pb-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                      <div className="col-span-6">Member</div>
                      <div className="col-span-3">Role</div>
                      <div className="col-span-3"></div>
                    </div>
                    {/* Table Rows */}
                    <div className="divide-y divide-border">
                      {workspace.members.map(({ profile, role }) => (
                        <div
                          key={profile.id}
                          className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors"
                        >
                          <div className="col-span-6 flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {profile.initials || profile.name?.substring(0, 2).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{profile.name || 'Unnamed User'}</p>
                              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                            </div>
                          </div>
                          <div className="col-span-3">
                            <Badge variant={role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                              {role}
                            </Badge>
                          </div>
                          <div className="col-span-3 flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Change Role</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Preview Panel */}
      <ProjectPreviewPanel
        project={selectedProject}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        navigationState={{
          from: 'workspace',
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        }}
      />
    </AdminLayout>
  );
};

export default AdminWorkspaceDetail;
