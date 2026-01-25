import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  MoreHorizontal,
  Shield,
  User,
  Mail,
  Calendar,
  Building2,
  List,
  LayoutList,
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
import { AdminLayout } from '@/components/admin';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase/database.types';
import { getWorkspaces, getOrganizations, type WorkspaceWithCounts, type OrganizationWithCounts } from '@/lib/supabase/services/workspaces';

// Mock user-org mapping for demo mode
// Maps user IDs to workspace IDs they belong to
const mockUserOrgs: Record<string, string[]> = {
  'user-1': [],
  'user-2': ['ws-1'],
  'user-3': ['ws-3'],
};

interface UserWithDetails extends Profile {
  organization_count?: number;
  organizations?: OrganizationWithCounts[];
}

type ViewMode = 'list' | 'compact';

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'staff' | 'client'>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch organizations first
      const orgs = await getOrganizations();
      setOrganizations(orgs);

      if (!isSupabaseConfigured()) {
        // Mock data for demo mode - enriched with org data
        const mockUsers: UserWithDetails[] = [
          {
            id: 'user-1',
            email: 'john@mirrorlabs3d.com',
            name: 'John Davis',
            avatar_url: null,
            initials: 'JD',
            account_type: 'staff',
            is_staff: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            organization_count: 0,
            organizations: [],
          },
          {
            id: 'user-2',
            email: 'mary@mirrorlabs3d.com',
            name: 'Mary Kim',
            avatar_url: null,
            initials: 'MK',
            account_type: 'staff',
            is_staff: true,
            created_at: '2024-01-05T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z',
            organization_count: 1,
            organizations: orgs.filter((o) => mockUserOrgs['user-2']?.includes(o.id)),
          },
          {
            id: 'user-3',
            email: 'sarah@mirrorlabs3d.com',
            name: 'Sarah Rodriguez',
            avatar_url: null,
            initials: 'SR',
            account_type: 'staff',
            is_staff: true,
            created_at: '2024-01-10T00:00:00Z',
            updated_at: '2024-01-10T00:00:00Z',
            organization_count: 1,
            organizations: orgs.filter((o) => mockUserOrgs['user-3']?.includes(o.id)),
          },
          {
            id: 'user-4',
            email: 'alex@mirrorlabs3d.com',
            name: 'Alex Lee',
            avatar_url: null,
            initials: 'AL',
            account_type: 'staff',
            is_staff: true,
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            organization_count: 0,
            organizations: [],
          },
          {
            id: 'user-5',
            email: 'brian@mirrorlabs3d.com',
            name: 'Brian Chen',
            avatar_url: null,
            initials: 'BC',
            account_type: 'staff',
            is_staff: true,
            created_at: '2024-01-20T00:00:00Z',
            updated_at: '2024-01-20T00:00:00Z',
            organization_count: 0,
            organizations: [],
          },
        ];
        setUsers(mockUsers);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterType === 'all' ||
        (filterType === 'staff' && user.is_staff) ||
        (filterType === 'client' && !user.is_staff);

      const matchesClient =
        filterClient === 'all' ||
        user.organizations?.some((org) => org.id === filterClient);

      return matchesSearch && matchesType && matchesClient;
    });
  }, [users, searchQuery, filterType, filterClient]);

  // Stats
  const totalUsers = users.length;
  const staffCount = users.filter((u) => u.is_staff).length;
  const clientCount = users.filter((u) => !u.is_staff).length;

  return (
    <AdminLayout title="People">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staffCount}</p>
                <p className="text-sm text-muted-foreground">Staff Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientCount}</p>
                <p className="text-sm text-muted-foreground">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {organizations.filter((o) => o.slug !== 'demo').map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="staff">Staff Only</SelectItem>
                <SelectItem value="client">Clients Only</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('compact')}
                title="Compact view"
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'No users match your search.' : 'No users in the system yet.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View - Detailed card rows */
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">
                        {user.initials || user.name?.substring(0, 2).toUpperCase() || 'U'}
                      </span>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name || 'Unnamed User'}</p>
                        {user.is_staff ? (
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            <Shield className="w-3 h-3 mr-1" />
                            Staff
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Client</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Organization badges */}
                      {user.organizations && user.organizations.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {user.organizations.map((org) => (
                            <Link key={org.id} to={`/admin/clients/${org.id}`}>
                              <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-muted text-xs"
                              >
                                <Building2 className="w-3 h-3 mr-1" />
                                {org.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>View Organizations</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        {user.is_staff ? 'Remove Staff Access' : 'Grant Staff Access'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-3 py-2.5 items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {user.initials || user.name?.substring(0, 2).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-sm font-medium truncate">{user.name || 'Unnamed User'}</span>
                  </div>
                  <div className="col-span-3 text-sm text-muted-foreground truncate">
                    {user.email}
                  </div>
                  <div className="col-span-2">
                    {user.is_staff ? (
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                        Staff
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Client</Badge>
                    )}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>View Organizations</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          {user.is_staff ? 'Remove Staff Access' : 'Grant Staff Access'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
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

export default AdminUsers;
