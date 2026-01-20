import { Link } from "react-router-dom";
import { Plus, Search, Grid3X3, List, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockProjects } from "@/data/mockProjects";
import ProjectsNavigation from "@/components/ProjectsNavigation";

const Projects = () => {
  return (
    <div className="min-h-screen bg-background">
      <ProjectsNavigation />
      
      <main className="pt-16">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projects</h1>
              <p className="text-muted-foreground mt-1">
                {mockProjects.length} projects • {mockProjects.reduce((acc, p) => acc + p.scanCount, 0)} total scans
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group block"
              >
                <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-white text-xs">
                        {project.scanCount} scans
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Collaborator Avatars */}
                      <div className="flex items-center">
                        <div className="flex -space-x-2">
                          {project.collaborators.slice(0, 3).map((initials, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
                            >
                              <span className="text-[10px] font-medium text-primary">
                                {initials}
                              </span>
                            </div>
                          ))}
                          {project.collaborators.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                +{project.collaborators.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Projects;
