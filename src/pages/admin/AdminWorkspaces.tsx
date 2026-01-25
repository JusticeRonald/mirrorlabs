import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  FolderOpen,
  Users,
  Calendar,
  ArrowUpRight,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { AdminLayout } from '@/components/admin';
import { useViewPreference } from '@/hooks/useViewPreference';
import { getWorkspaces, createWorkspace, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';
import { useToast } from '@/hooks/use-toast';

const AdminWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useViewPreference('admin-workspaces');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    // Only fetch business workspaces for admin view
    const ws = await getWorkspaces('business');
    // Filter out demo workspace for the main list
    setWorkspaces(ws.filter(w => w.slug !== 'demo'));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Generate slug from name
  const handleNameChange = (name: string) => {
    setNewWorkspaceName(name);
    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setNewWorkspaceSlug(slug);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !newWorkspaceSlug.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both name and slug.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const { data, error } = await createWorkspace({
      name: newWorkspaceName,
      slug: newWorkspaceSlug,
      type: 'business',
    });

    if (error) {
      toast({
        title: 'Error creating workspace',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Workspace created',
        description: `${newWorkspaceName} has been added.`,
      });
      setIsCreateDialogOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceSlug('');
      fetchWorkspaces();
    }
    setIsCreating(false);
  };

  // Filter workspaces by search
  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate initials from workspace name
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <AdminLayout title="Workspaces">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="mr-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          {/* Add Workspace */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace for a customer. They'll be able to have projects and team members.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    placeholder="Acme Corporation"
                    value={newWorkspaceName}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={newWorkspaceSlug}
                    onChange={(e) => setNewWorkspaceSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL-friendly identifier for the workspace
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkspace} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subheader */}
      <p className="text-sm text-muted-foreground mb-6">
        Manage customer workspaces and their projects
      </p>

      {/* Workspaces Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workspaces found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'No workspaces match your search.'
                : 'Add your first workspace to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Workspace
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View - Card layout */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/admin/workspaces/${ws.id}`}
              className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              {/* Header */}
              <div className="p-4 pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {getInitials(ws.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {ws.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">/{ws.slug}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-4 h-4" />
                    {ws.project_count} projects
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {ws.member_count} members
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(ws.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        /* List View - Single column, horizontal cards with more info */
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {getInitials(ws.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{ws.name}</h3>
                      <span className="text-xs text-muted-foreground">/{ws.slug}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4" />
                        {ws.project_count} projects
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {ws.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(ws.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/workspaces/${ws.id}`}>
                        View
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
                          <Link to={`/admin/workspaces/${ws.id}`}>View Details</Link>
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
      ) : (
        /* Compact View - Table-style rows, maximum density */
        <Card>
          <CardContent className="pt-4 pb-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <div className="col-span-5">Workspace</div>
              <div className="col-span-2 text-center">Projects</div>
              <div className="col-span-2 text-center">Members</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-border">
              {filteredWorkspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/admin/workspaces/${ws.id}`}
                  className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(ws.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ws.name}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">
                    {ws.project_count}
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">
                    {ws.member_count}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(ws.updated_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/workspaces/${ws.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminWorkspaces;
