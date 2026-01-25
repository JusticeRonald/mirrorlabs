import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Search,
  MoreHorizontal,
  Building2,
  Calendar,
  ArrowUpRight,
  FileStack,
  Archive,
  Scan,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { AdminLayout, ProjectPreviewPanel } from '@/components/admin';
import { useViewPreference } from '@/hooks/useViewPreference';
import type { ProjectListViewMode } from '@/types/preferences';
import { mockProjects, type Project } from '@/data/mockProjects';
import { getOrganizations, type OrganizationWithCounts } from '@/lib/supabase/services/workspaces';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { DEMO_WORKSPACE_ID } from '@/hooks/useProjects';
import type { ProjectWithMembers } from '@/lib/supabase/database.types';

// Map projects to organizations for demo mode (fallback when Supabase not configured)
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

// Extended project type for admin display
interface AdminProject {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  industry: 'construction' | 'real-estate' | 'cultural';
  scanCount: number;
  memberCount: number;
  isArchived: boolean;
  updatedAt: string;
  workspaceId?: string;
  organization?: OrganizationWithCounts;
  scans: Array<{ id: string }>;
}

interface ProjectWithOrg extends Project {
  organization?: OrganizationWithCounts;
}

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
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [viewMode, setViewMode] = useViewPreference('admin-projects');

  // Preview panel state
  const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Handle project row click - opens preview panel
  const handleProjectClick = (project: AdminProject) => {
    setSelectedProject(project);
    setPreviewOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch organizations for client filter
      const orgs = await getOrganizations();
      setOrganizations(orgs);

      // Fetch projects - from Supabase or fallback to mock data
      if (isSupabaseConfigured()) {
        // Query all projects except demo workspace
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            scans (id),
            project_members (user_id)
          `)
          .neq('workspace_id', DEMO_WORKSPACE_ID)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          // Fallback to mock data
          setProjects(mockProjects.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            thumbnail: p.thumbnail,
            industry: p.industry,
            scanCount: p.scanCount,
            memberCount: p.members.length,
            isArchived: p.isArchived,
            updatedAt: p.updatedAt,
            organization: orgs.find(org => org.id === projectOrgMap[p.id]),
            scans: p.scans.map(s => ({ id: s.id })),
          })));
        } else {
          // Map Supabase projects to AdminProject format
          const adminProjects: AdminProject[] = (data || []).map((p: ProjectWithMembers & { scans: { id: string }[]; project_members: { user_id: string }[] }) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            thumbnail: p.thumbnail_url || '/placeholder.svg',
            industry: p.industry,
            scanCount: p.scans?.length || 0,
            memberCount: p.project_members?.length || 0,
            isArchived: p.is_archived,
            updatedAt: p.updated_at,
            workspaceId: p.workspace_id,
            organization: orgs.find(org => org.id === p.workspace_id),
            scans: p.scans || [],
          }));
          setProjects(adminProjects);
        }
      } else {
        // Fallback to mock data when Supabase not configured
        setProjects(mockProjects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          thumbnail: p.thumbnail,
          industry: p.industry,
          scanCount: p.scanCount,
          memberCount: p.members.length,
          isArchived: p.isArchived,
          updatedAt: p.updatedAt,
          organization: orgs.find(org => org.id === projectOrgMap[p.id]),
          scans: p.scans.map(s => ({ id: s.id })),
        })));
      }

      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Projects already have organization data from fetch
  const projectsWithOrgs = useMemo(() => projects, [projects]);

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

    // Client filter - use workspaceId for Supabase, projectOrgMap for mock
    if (filterClient !== 'all') {
      result = result.filter((p) => {
        // For Supabase projects, use workspaceId
        if (p.workspaceId) {
          return p.workspaceId === filterClient;
        }
        // For mock projects, use projectOrgMap
        return projectOrgMap[p.id] === filterClient;
      });
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

  // Stats - use projects state, not mockProjects
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => !p.isArchived).length;
  const archivedProjects = projects.filter((p) => p.isArchived).length;

  // Get first scan for a project for the viewer link
  const getViewerLink = (project: AdminProject) => {
    const firstScan = project.scans[0];
    if (firstScan) {
      return `/viewer/${project.id}/${firstScan.id}`;
    }
    return `/admin/projects/${project.id}`;
  };

  return (
    <AdminLayout title="Projects">
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
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
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
        /* Grid View - Card layout */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="aspect-video relative overflow-hidden bg-muted">
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Industry Badge */}
                <div className="absolute top-2 left-2">
                  <Badge className={`${industryColors[project.industry]} text-xs`}>
                    {industryLabels[project.industry]}
                  </Badge>
                </div>

                {/* Archived Badge */}
                {project.isArchived && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      <Archive className="w-3 h-3 mr-1" />
                      Archived
                    </Badge>
                  </div>
                )}

                {/* Scan Count */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
                  <Scan className="w-3 h-3" />
                  {project.scanCount}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-medium text-foreground line-clamp-1">{project.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {project.description}
                </p>

                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{project.organization?.name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
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
                        <Link
                          to={`/admin/workspaces/${project.organization.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
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
                        <Users className="w-3 h-3" />
                        {project.memberCount} members
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                          <Link
                            to={`/admin/projects/${project.id}`}
                            state={{ from: 'projects' }}
                          >
                            View Details
                          </Link>
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
      ) : (
        /* Compact View - Table-style rows */
        <Card>
          <CardContent className="pt-4 pb-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <div className="col-span-4">Project</div>
              <div className="col-span-2">Industry</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-1 text-center">Scans</div>
              <div className="col-span-1 text-center">Members</div>
              <div className="col-span-1">Updated</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-border">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{project.name}</span>
                      {project.isArchived && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Badge className={`${industryColors[project.industry]} text-xs`}>
                      {industryLabels[project.industry]}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground truncate">
                    {project.organization?.name || '-'}
                  </div>
                  <div className="col-span-1 text-center text-sm text-muted-foreground">
                    {project.scanCount}
                  </div>
                  <div className="col-span-1 text-center text-sm text-muted-foreground">
                    {project.memberCount}
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={getViewerLink(project)}>Open Viewer</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/admin/projects/${project.id}`}
                            state={{ from: 'projects' }}
                          >
                            View Details
                          </Link>
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

      {/* Project Preview Panel */}
      <ProjectPreviewPanel
        project={selectedProject}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        navigationState={{ from: 'projects' }}
      />
    </AdminLayout>
  );
};

export default AdminProjects;
