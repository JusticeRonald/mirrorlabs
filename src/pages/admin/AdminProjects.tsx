import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Search,
  MoreHorizontal,
  Building2,
  Calendar,
  ArrowUpRight,
  Grid3X3,
  List,
  FileStack,
  Archive,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin';
import { mockProjects, type Project } from '@/data/mockProjects';
import { getWorkspaces, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';

// Map projects to organizations for demo mode
const projectOrgMap: Record<string, string> = {
  'proj-1': 'org-1', // Downtown Office Tower -> Apex Builders
  'proj-2': 'org-1', // Hospital Wing Addition -> Apex Builders
  'proj-3': 'org-1', // Mixed-Use Development -> Apex Builders
  'proj-4': 'org-1', // Industrial Warehouse -> Apex Builders
  'proj-5': 'org-2', // Luxury Penthouse -> Metro Realty Group
  'proj-6': 'org-2', // Commercial Office Space -> Metro Realty Group
  'proj-7': 'org-2', // Retail Storefront -> Metro Realty Group
  'proj-8': 'org-2', // Historic Brownstone -> Metro Realty Group
  'proj-9': 'org-3', // Contemporary Art Museum -> City Arts Foundation
  'proj-10': 'org-3', // Boutique Hotel -> City Arts Foundation
  'proj-11': 'org-3', // Historic Theater -> City Arts Foundation
  'proj-12': 'org-3', // Concert Venue -> City Arts Foundation
};

interface ProjectWithOrg extends Project {
  organization?: OrganizationWithCounts;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'updated' | 'name' | 'scans';

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

const AdminProjects = () => {
  const [organizations, setOrganizations] = useState<OrganizationWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const orgs = await getOrganizations();
      setOrganizations(orgs);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Enrich projects with organization data
  const projectsWithOrgs: ProjectWithOrg[] = useMemo(() => {
    return mockProjects.map((project) => ({
      ...project,
      organization: organizations.find((org) => org.id === projectOrgMap[project.id]),
    }));
  }, [organizations]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = projectsWithOrgs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Client filter
    if (filterClient !== 'all') {
      result = result.filter((p) => projectOrgMap[p.id] === filterClient);
    }

    // Industry filter
    if (filterIndustry !== 'all') {
      result = result.filter((p) => p.industry === filterIndustry);
    }

    // Status filter
    if (filterStatus === 'active') {
      result = result.filter((p) => !p.isArchived);
    } else if (filterStatus === 'archived') {
      result = result.filter((p) => p.isArchived);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'scans':
          return b.scanCount - a.scanCount;
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [projectsWithOrgs, searchQuery, filterClient, filterIndustry, filterStatus, sortBy]);

  // Stats
  const totalProjects = mockProjects.length;
  const activeProjects = mockProjects.filter((p) => !p.isArchived).length;
  const archivedProjects = mockProjects.filter((p) => p.isArchived).length;

  // Get first scan for a project for the viewer link
  const getViewerLink = (project: Project) => {
    const firstScan = project.scans[0];
    if (firstScan) {
      return `/viewer/${project.id}/${firstScan.id}`;
    }
    return `/projects/${project.id}`;
  };

  return (
    <AdminLayout
      title="Projects"
      breadcrumbs={[{ label: 'Projects' }]}
    >
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileStack className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProjects}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Archive className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{archivedProjects}</p>
                <p className="text-sm text-muted-foreground">Archived</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {organizations.filter(o => o.slug !== 'demo').map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterIndustry} onValueChange={setFilterIndustry}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="construction">Construction</SelectItem>
              <SelectItem value="real-estate">Real Estate</SelectItem>
              <SelectItem value="cultural">Cultural & Hospitality</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="scans">Scan Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'No projects match your search.' : 'No projects match the selected filters.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="group hover:border-primary/50 transition-colors overflow-hidden">
              {/* Thumbnail */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {project.isArchived && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80">
                      <Archive className="w-3 h-3 mr-1" />
                      Archived
                    </Badge>
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {project.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={getViewerLink(project)}>Open in Viewer</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/projects/${project.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        {project.isArchived ? 'Unarchive' : 'Archive'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={industryColors[project.industry]}>
                    {industryLabels[project.industry]}
                  </Badge>
                  {project.organization && (
                    <Link to={`/admin/clients/${project.organization.id}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        <Building2 className="w-3 h-3 mr-1" />
                        {project.organization.name}
                      </Badge>
                    </Link>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <FileStack className="w-4 h-4" />
                    <span>{project.scanCount} scans</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-between group-hover:bg-muted"
                  asChild
                >
                  <Link to={getViewerLink(project)}>
                    Open Viewer
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{project.name}</p>
                      {project.isArchived && (
                        <Badge variant="secondary">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge className={`${industryColors[project.industry]} text-xs`}>
                        {industryLabels[project.industry]}
                      </Badge>
                      {project.organization && (
                        <Link to={`/admin/clients/${project.organization.id}`}>
                          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                            <Building2 className="w-3 h-3 mr-1" />
                            {project.organization.name}
                          </Badge>
                        </Link>
                      )}
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileStack className="w-3 h-3" />
                        {project.scanCount} scans
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={getViewerLink(project)}>
                        Open Viewer
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/projects/${project.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          {project.isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminProjects;
