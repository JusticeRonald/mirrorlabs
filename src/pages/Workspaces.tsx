import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  FolderOpen,
  Users,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useViewPreference } from '@/hooks/useViewPreference';
import { getUserWorkspaces, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';

const Workspaces = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useViewPreference('workspaces');

  // Generate initials from workspace name
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const userWorkspaces = await getUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);
      setIsLoading(false);
    };
    fetchWorkspaces();
  }, [user?.id]);

  // Filter workspaces by search query
  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClientLayout>
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            View and access your assigned workspaces.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && workspaces.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Your administrator will assign you to workspaces where you can
                view and collaborate on projects.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Workspaces List */}
        {!isLoading && workspaces.length > 0 && (
          <>
            {/* Search and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search workspaces..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>

            {/* Workspace Views */}
            {filteredWorkspaces.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No workspaces match your search.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkspaces.map((workspace) => (
                  <Link
                    key={workspace.id}
                    to={`/projects?workspace=${workspace.id}`}
                    className="group"
                  >
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {workspace.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-4 h-4" />
                                {workspace.project_count} projects
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {workspace.member_count} members
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : viewMode === 'list' ? (
              /* List View */
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {filteredWorkspaces.map((workspace) => (
                      <Link
                        key={workspace.id}
                        to={`/projects?workspace=${workspace.id}`}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-semibold text-primary">
                            {getInitials(workspace.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{workspace.name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FolderOpen className="w-4 h-4" />
                              {workspace.project_count} projects
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {workspace.member_count} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(workspace.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Compact View */
              <Card>
                <CardContent className="pt-4 pb-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                    <div className="col-span-5">Workspace</div>
                    <div className="col-span-2 text-center">Projects</div>
                    <div className="col-span-2 text-center">Members</div>
                    <div className="col-span-3">Updated</div>
                  </div>
                  {/* Table Rows */}
                  <div className="divide-y divide-border">
                    {filteredWorkspaces.map((workspace) => (
                      <Link
                        key={workspace.id}
                        to={`/projects?workspace=${workspace.id}`}
                        className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors"
                      >
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {getInitials(workspace.name)}
                            </span>
                          </div>
                          <span className="text-sm font-medium truncate">{workspace.name}</span>
                        </div>
                        <div className="col-span-2 text-center text-sm text-muted-foreground">
                          {workspace.project_count}
                        </div>
                        <div className="col-span-2 text-center text-sm text-muted-foreground">
                          {workspace.member_count}
                        </div>
                        <div className="col-span-3 text-sm text-muted-foreground">
                          {new Date(workspace.updated_at).toLocaleDateString()}
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
};

export default Workspaces;
