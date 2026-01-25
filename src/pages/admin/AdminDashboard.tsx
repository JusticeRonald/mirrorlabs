import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FolderOpen,
  Scan,
  HardDrive,
  Plus,
  UserPlus,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin';
import { getWorkspaces, getOrganizations, type WorkspaceWithCounts, type OrganizationWithCounts } from '@/lib/supabase/services/workspaces';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

const StatCard = ({ title, value, description, icon: Icon, href }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {href && (
        <Link
          to={href}
          className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
        >
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [organizations, setOrganizations] = useState<OrganizationWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate stats
  const totalClients = organizations.filter(o => o.slug !== 'demo').length;
  const totalProjects = organizations.reduce((acc, org) => acc + org.project_count, 0);
  const totalScans = 0; // Would need to aggregate from all projects
  const storageUsed = '0 GB'; // Would need to calculate from storage

  // Recent activity (mock for now)
  const recentActivity = [
    { id: '1', action: 'New scan uploaded', project: 'Downtown Office', time: '2 hours ago' },
    { id: '2', action: 'Client added', client: 'Acme Corp', time: '5 hours ago' },
    { id: '3', action: 'Project created', project: 'Warehouse Renovation', time: '1 day ago' },
    { id: '4', action: 'User invited', email: 'john@acme.com', time: '2 days ago' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Clients"
          value={isLoading ? '...' : totalClients}
          description="Active organizations"
          icon={Building2}
          href="/admin/clients"
        />
        <StatCard
          title="Total Projects"
          value={isLoading ? '...' : totalProjects}
          description="Across all clients"
          icon={FolderOpen}
        />
        <StatCard
          title="Total Scans"
          value={totalScans}
          description="Gaussian splat files"
          icon={Scan}
        />
        <StatCard
          title="Storage Used"
          value={storageUsed}
          description="Of 100 GB quota"
          icon={HardDrive}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/clients">
                <Plus className="w-4 h-4 mr-2" />
                Add New Client
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/users">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/demo">
                <Scan className="w-4 h-4 mr-2" />
                Manage Demo Content
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-foreground">{activity.action}</p>
                    <p className="text-muted-foreground text-xs">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Clients */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>Recently added organizations</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/clients">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients yet. Add your first client to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {organizations.slice(0, 5).map((org) => (
                <Link
                  key={org.id}
                  to={`/admin/clients/${org.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {org.project_count} projects · {org.member_count} members
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
