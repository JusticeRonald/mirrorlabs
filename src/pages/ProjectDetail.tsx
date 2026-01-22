import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, MoreHorizontal, MessageSquare, Users, Calendar, Upload, Archive, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockProjects } from "@/data/mockProjects";
import RoleBadge from "@/components/ui/role-badge";
import ProjectsNavigation from "@/components/ProjectsNavigation";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = mockProjects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Project not found</h1>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleOpenViewer = (scanId: string) => {
    navigate(`/viewer/${project.id}/${scanId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <ProjectsNavigation />

      <main className="pt-16">
        <div className="container mx-auto px-6 py-8">
          {/* Breadcrumb & Back */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link
              to="/projects"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Projects
            </Link>
            <span>/</span>
            <span className="text-foreground">{project.name}</span>
          </div>

          {/* Project Header */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <RoleBadge role={project.userRole} />
                {project.isArchived && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                    <Archive className="w-3 h-3" />
                    Archived
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {project.description}
              </p>

              {/* Project Meta */}
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{project.members.length} team members</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {project.userRole !== 'viewer' && (
                <>
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Scan
                  </Button>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Scan
                  </Button>
                </>
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

          {/* Team Bar */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Team</span>
              <div className="flex -space-x-2">
                {project.members.map((member, i) => (
                  <Tooltip key={member.user.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-8 h-8 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center cursor-pointer hover:z-10 transition-transform hover:scale-110"
                        style={{ zIndex: project.members.length - i }}
                      >
                        <span className="text-xs font-medium text-primary">{member.user.initials}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
            {project.userRole === 'owner' && (
              <Button variant="ghost" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Invite
              </Button>
            )}
          </div>

          {/* Search Scans */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search scans..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Scans Count */}
          <div className="text-sm text-muted-foreground mb-4">
            {project.scans.length} scans in this project
          </div>

          {/* Scans Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {project.scans.map((scan) => (
              <div
                key={scan.id}
                className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                  <img
                    src={scan.thumbnail}
                    alt={scan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Hover Actions */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      className="shadow-lg"
                      onClick={() => handleOpenViewer(scan.id)}
                    >
                      Open in Viewer
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenViewer(scan.id)}>
                        Open in Viewer
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {project.userRole !== 'viewer' && (
                        <>
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Measurements Badge */}
                  {scan.measurements && scan.measurements > 0 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
                      <Ruler className="w-3 h-3" />
                      {scan.measurements}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-medium text-foreground text-sm line-clamp-1">
                    {scan.name}
                  </h3>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        <span>{scan.annotationCount}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{scan.collaborators}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Scan Card */}
            {project.userRole !== 'viewer' && (
              <div className="rounded-xl border border-dashed border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all duration-300 cursor-pointer">
                <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">Add Scan</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
