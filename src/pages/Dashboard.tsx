import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FolderOpen,
  Scan,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getUserWorkspaces, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';
import { mockProjects } from '@/data/mockProjects';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard = ({ title, value, description, icon: Icon }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Get first name from user's full name
  const firstName = user?.name?.split(' ')[0] || 'there';

  // Stats from mock data (same pattern as Projects.tsx)
  const totalProjects = mockProjects.length;
  const totalScans = mockProjects.reduce((acc, p) => acc + p.scans.length, 0);
  const workspaceCount = isLoading ? '...' : workspaces.length;

  return (
    <ClientLayout>
      <div className="px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your workspaces and projects.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <StatCard
            title="Workspaces"
            value={workspaceCount}
            description="Assigned to you"
            icon={Building2}
          />
          <StatCard
            title="Projects"
            value={totalProjects}
            description="Across all workspaces"
            icon={FolderOpen}
          />
          <StatCard
            title="Scans"
            value={totalScans}
            description="Total 3D scans"
            icon={Scan}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/projects">
                View Projects
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/workspaces">
                Browse Workspaces
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default Dashboard;
