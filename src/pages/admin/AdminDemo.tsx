import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PlayCircle,
  Plus,
  FolderOpen,
  Scan,
  MoreHorizontal,
  ExternalLink,
  Archive,
  Eye,
  Calendar,
  Search,
  List,
  LayoutList,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AdminLayout, ProjectPreviewPanel, type BaseProjectInfo } from '@/components/admin';
import { useDemoProjects, DEMO_WORKSPACE_ID } from '@/hooks/useProjects';

type ViewMode = 'list' | 'compact';

const AdminDemo = () => {
  const { projects, isLoading, isUsingMockData, refetch } = useDemoProjects();
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [searchQuery, setSearchQuery] = useState('');

  // Preview panel state
  const [selectedProject, setSelectedProject] = useState<BaseProjectInfo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      p.industry.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  // Calculate stats
  const totalProjects = projects.length;
  const totalScans = projects.reduce((acc, p) => acc + p.scans.length, 0);

  // Convert demo project to BaseProjectInfo format
  const toBaseProjectInfo = (project: typeof projects[0]): BaseProjectInfo => ({
    id: project.id,
    name: project.name,
    description: project.description || '',
    thumbnail: project.thumbnail || '/placeholder.svg',
    industry: project.industry,
    scanCount: project.scans.length,
    isArchived: false, // Demo projects are not archived
    updatedAt: project.updatedAt,
    scans: project.scans.map(s => ({ id: s.id })),
  });

  // Handle project click - open preview panel
  const handleProjectClick = (project: typeof projects[0], e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedProject(toBaseProjectInfo(project));
    setPreviewOpen(true);
  };

  return (
    <AdminLayout title="Demo Content">
      {/* Info Banner */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">Demo Content Management</h3>
                {isUsingMockData ? (
                  <Badge variant="secondary" className="text-xs">
                    Mock Data
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-600">
                    <Database className="w-3 h-3 mr-1" />
                    Supabase
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Manage the projects and scans that appear on the public demo page.
                These projects are visible to all visitors without authentication.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-sm text-muted-foreground">Demo Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Scan className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalScans}</p>
                <p className="text-sm text-muted-foreground">Total Scans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button className="w-full h-full" asChild>
              <Link to="/demo" target="_blank">
                <Eye className="w-4 h-4 mr-2" />
                Preview Demo Page
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search demo projects..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('compact')}
              title="Compact view"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Demo Project
          </Button>
        </div>
      </div>

      {/* Projects Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No matching projects' : 'No demo projects'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'No projects match your search.'
                : 'Add projects to showcase on the public demo page.'}
            </p>
            {!searchQuery && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Demo Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={(e) => handleProjectClick(project, e)}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    {project.thumbnail && (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {project.industry}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Scan className="w-4 h-4" />
                        {project.scans.length} scans
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/projects/${project.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Scan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Archive className="w-4 h-4 mr-2" />
                          Remove from Demo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Compact View */
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <div className="col-span-5">Project</div>
              <div className="col-span-2">Industry</div>
              <div className="col-span-2 text-center">Scans</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-border">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={(e) => handleProjectClick(project, e)}
                  className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0 bg-muted">
                      {project.thumbnail && (
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <span className="text-sm font-medium truncate">{project.name}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className="text-xs">
                      {project.industry}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">
                    {project.scans.length}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/projects/${project.id}`}>View Project</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Remove from Demo</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Managing Demo Content</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Adding a Demo Project:</strong> Click "Add Demo Project" to create a new project
            that will be visible on the public demo page. Upload scans that showcase the platform's capabilities.
          </p>
          <p>
            <strong>Removing from Demo:</strong> Projects removed from demo are archived but not deleted.
            You can restore them later if needed.
          </p>
          <p>
            <strong>Best Practices:</strong> Keep 3-5 high-quality demo projects across different industries
            (construction, real estate, cultural heritage) to showcase platform versatility.
          </p>
        </CardContent>
      </Card>

      {/* Project Preview Panel */}
      <ProjectPreviewPanel
        project={selectedProject}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isAdmin={true}
      />
    </AdminLayout>
  );
};

export default AdminDemo;
