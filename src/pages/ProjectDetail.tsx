import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  Users,
  Calendar,
  Upload,
  Archive,
  FolderOpen,
  FileStack,
  ArrowUpRight,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockProjects } from "@/data/mockProjects";
import RoleBadge from "@/components/ui/role-badge";
import ClientLayout from "@/components/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";

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

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const project = mockProjects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <ClientLayout>
        <div className="px-6 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Project not found</h3>
              <p className="text-muted-foreground mb-4">
                The project you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link to="/projects">Back to Projects</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  const handleOpenViewer = (scanId: string) => {
    navigate(`/viewer/${project.id}/${scanId}`);
  };

  // Get first scan for quick open
  const firstScan = project.scans[0];

  return (
    <ClientLayout>
      <div className="px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/projects" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{project.name}</span>
        </nav>

        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Thumbnail */}
              {project.thumbnail ? (
                <img
                  src={project.thumbnail}
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
                  <RoleBadge role={project.userRole} />
                  {project.isArchived && (
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
                    <span>{project.scans.length} scans</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{project.members.length} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {permissions.canUploadScans && project.userRole !== 'viewer' && (
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                )}
                {firstScan && (
                  <Button onClick={() => handleOpenViewer(firstScan.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Open Viewer
                  </Button>
                )}
                {project.userRole === 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        {project.isArchived ? 'Unarchive Project' : 'Archive Project'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scans Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scans</h3>
            {permissions.canUploadScans && project.userRole !== 'viewer' && (
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Scan
              </Button>
            )}
          </div>
          {project.scans.length === 0 ? (
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
                        {scan.thumbnail ? (
                          <img
                            src={scan.thumbnail}
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
                            {scan.date}
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
                          <DropdownMenuItem onClick={() => handleOpenViewer(scan.id)}>
                            Open in Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {permissions.canUploadScans && project.userRole !== 'viewer' && (
                            <>
                              <DropdownMenuItem>Rename</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        ready
                      </Badge>
                      <span>{scan.annotationCount} annotations</span>
                      {scan.measurements && scan.measurements > 0 && (
                        <span>{scan.measurements} measurements</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => handleOpenViewer(scan.id)}
                    >
                      Open Viewer
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Members Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Team Members</h3>
            {project.userRole === 'owner' && (
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Invite
              </Button>
            )}
          </div>
          {project.members.length === 0 ? (
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
                  {project.members.map(({ user, role }) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.initials}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={role === 'owner' ? 'default' : 'secondary'}>
                          {role}
                        </Badge>
                        {project.userRole === 'owner' && user.id !== project.members.find(m => m.role === 'owner')?.user.id && (
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default ProjectDetail;
