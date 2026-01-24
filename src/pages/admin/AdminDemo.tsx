import { useState, useEffect } from 'react';
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
import { mockProjects } from '@/data/mockProjects';

// Demo projects from the mock data (would be from Demo organization in production)
const demoProjects = mockProjects;

const AdminDemo = () => {
  const [projects, setProjects] = useState(demoProjects);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate stats
  const totalProjects = projects.length;
  const totalScans = projects.reduce((acc, p) => acc + p.scans.length, 0);

  return (
    <AdminLayout
      title="Demo Content"
      breadcrumbs={[{ label: 'Demo Content' }]}
    >
      {/* Info Banner */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Demo Content Management</h3>
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Demo Projects</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Demo Project
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No demo projects</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add projects to showcase on the public demo page.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Demo Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group overflow-hidden">
              {/* Thumbnail */}
              <div className="aspect-video relative overflow-hidden bg-muted">
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-black/40 backdrop-blur-sm text-white border-0">
                    {project.industry}
                  </Badge>
                </div>

                {/* Scan Count */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
                  <Scan className="w-3 h-3" />
                  {project.scans.length}
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {project.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/projects/${project.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Project
                        </Link>
                      </DropdownMenuItem>
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
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>

                {/* Scans Preview */}
                {project.scans.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Scans:</p>
                    <div className="flex flex-wrap gap-1">
                      {project.scans.slice(0, 3).map((scan) => (
                        <Badge key={scan.id} variant="outline" className="text-xs">
                          {scan.name}
                        </Badge>
                      ))}
                      {project.scans.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.scans.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
    </AdminLayout>
  );
};

export default AdminDemo;
