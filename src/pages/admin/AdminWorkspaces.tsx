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
import { AdminLayout } from '@/components/admin';
import { getWorkspaces, createWorkspace, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';
import { useToast } from '@/hooks/use-toast';

const AdminWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    <AdminLayout
      title="Workspaces"
      breadcrumbs={[{ label: 'Workspaces' }]}
    >
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

      {/* Subheader */}
      <p className="text-sm text-muted-foreground mb-6">
        Manage customer workspaces and their projects
      </p>

      {/* Workspaces Grid - Compact 4-column layout */}
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWorkspaces.map((ws) => (
            <Card key={ws.id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Workspace initials */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {getInitials(ws.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{ws.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">/{ws.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
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

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{ws.project_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{ws.member_count}</span>
                  </div>
                </div>

                {/* View button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-8 text-xs group-hover:bg-muted"
                  asChild
                >
                  <Link to={`/admin/workspaces/${ws.id}`}>
                    View Details
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminWorkspaces;
