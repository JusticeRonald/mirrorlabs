import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FolderOpen,
  Archive,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreHorizontal,
  Calendar,
  Users,
  Scan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RoleBadge from '@/components/ui/role-badge';
import ProjectsNavigation, { NavFilter } from '@/components/ProjectsNavigation';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import CreateProjectModal from '@/components/CreateProjectModal';
import {
  mockProjects,
  getActiveProjects,
  getArchivedProjects,
  getOwnedProjects,
  getSharedProjects
} from '@/data/mockProjects';
import { currentUser } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { Building2 } from 'lucide-react';

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'owned' | 'shared';

const Portfolio = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { isStaff, user, permissions } = useAuth();

  // Get nav filter from URL params
  const urlFilter = (searchParams.get('filter') as NavFilter) || 'all';

  // Handle nav filter change
  const handleNavFilterChange = (filter: NavFilter) => {
    if (filter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  const activeProjects = getActiveProjects();
  const archivedProjects = getArchivedProjects();

  // Filter projects based on filter mode and nav filter
  const filterProjects = (projects: typeof activeProjects) => {
    let filtered = [...projects];

    // Apply nav filter from URL params (shared/recent)
    if (urlFilter === 'shared') {
      filtered = filtered.filter(p => p.userRole !== 'owner');
    }

    // Apply dropdown filter mode
    if (filterMode === 'owned') {
      filtered = filtered.filter(p => p.userRole === 'owner');
    } else if (filterMode === 'shared') {
      filtered = filtered.filter(p => p.userRole !== 'owner');
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting for "recent" filter
    if (urlFilter === 'recent') {
      filtered.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    return filtered;
  };

  const filteredActiveProjects = filterProjects(activeProjects);
  const filteredArchivedProjects = filterProjects(archivedProjects);

  // Stats
  const totalProjects = mockProjects.length;
  const totalScans = mockProjects.reduce((acc, p) => acc + p.scans.length, 0);
  const ownedCount = getOwnedProjects().length;
  const sharedCount = getSharedProjects().length;

  return (
    <div className="min-h-screen bg-background">
      <ProjectsNavigation
        currentFilter={urlFilter}
        onFilterChange={handleNavFilterChange}
      />

      <main className="pt-16">
        <div className="container mx-auto px-6 py-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-6 rounded-xl bg-card border border-border">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user?.initials || currentUser.initials}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{user?.name || currentUser.name}</h1>
              <p className="text-muted-foreground">{user?.email || currentUser.email}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="font-medium">{totalProjects}</span> projects
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="font-medium">{totalScans}</span> scans
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">{ownedCount}</span> owned, <span className="font-medium">{sharedCount}</span> shared
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {isStaff && (
                <WorkspaceSwitcher
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                />
              )}
              {(isStaff || permissions.canCreateProjects) && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="active" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Active
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded">
                    {filteredActiveProjects.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="archived" className="gap-2">
                  <Archive className="w-4 h-4" />
                  Archived
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded">
                    {filteredArchivedProjects.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {filterMode === 'all' && 'All Projects'}
                      {filterMode === 'owned' && 'My Projects'}
                      {filterMode === 'shared' && 'Shared with Me'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterMode('all')}>
                      All Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterMode('owned')}>
                      My Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterMode('shared')}>
                      Shared with Me
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Mode Toggle */}
                <div className="flex border border-border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Active Projects */}
            <TabsContent value="active">
              {filteredActiveProjects.length === 0 ? (
                <div className="text-center py-12">
                  {!isStaff && !permissions.canCreateProjects ? (
                    // Client empty state - waiting for admin to add them to a workspace
                    <>
                      <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {searchQuery
                          ? 'No projects match your search.'
                          : 'Your administrator will add you to a workspace where you can view and collaborate on projects.'}
                      </p>
                    </>
                  ) : (
                    // Staff/creator empty state
                    <>
                      <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No active projects</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery ? 'No projects match your search.' : 'Create your first project to get started.'}
                      </p>
                      <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <ProjectGrid projects={filteredActiveProjects} viewMode={viewMode} />
              )}
            </TabsContent>

            {/* Archived Projects */}
            <TabsContent value="archived">
              {filteredArchivedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No archived projects</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No archived projects match your search.' : 'Archived projects will appear here.'}
                  </p>
                </div>
              ) : (
                <ProjectGrid projects={filteredArchivedProjects} viewMode={viewMode} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        defaultOrgId={selectedClientId || undefined}
      />
    </div>
  );
};

// Project Grid/List Component
interface ProjectGridProps {
  projects: typeof mockProjects;
  viewMode: ViewMode;
}

const ProjectGrid = ({ projects, viewMode }: ProjectGridProps) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all"
          >
            <img
              src={project.thumbnail}
              alt={project.name}
              className="w-16 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                <RoleBadge role={project.userRole} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground truncate">{project.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{project.scans.length} scans</span>
              <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.preventDefault()}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuSeparator />
                {project.userRole === 'owner' && (
                  <>
                    <DropdownMenuItem>
                      {project.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300"
        >
          {/* Thumbnail */}
          <div className="aspect-video relative overflow-hidden bg-muted">
            <img
              src={project.thumbnail}
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Role Badge */}
            <div className="absolute top-2 left-2">
              <RoleBadge role={project.userRole} size="sm" />
            </div>

            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuSeparator />
                {project.userRole === 'owner' && (
                  <>
                    <DropdownMenuItem>
                      {project.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Scan Count */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
              <Scan className="w-3 h-3" />
              {project.scans.length}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-medium text-foreground line-clamp-1">{project.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex -space-x-2">
                {project.members.slice(0, 3).map((member, i) => (
                  <div
                    key={member.user.id}
                    className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
                    style={{ zIndex: 3 - i }}
                  >
                    <span className="text-[10px] font-medium text-primary">
                      {member.user.initials}
                    </span>
                  </div>
                ))}
                {project.members.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      +{project.members.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Portfolio;
