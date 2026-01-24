import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Building2,
  MapPin,
  Calendar,
  FolderOpen,
  Scan,
  Settings,
  Bell,
  Shield,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectsNavigation from '@/components/ProjectsNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { mockProjects, getOwnedProjects, getSharedProjects } from '@/data/mockProjects';

const Profile = () => {
  const { user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Stats
  const totalProjects = mockProjects.length;
  const totalScans = mockProjects.reduce((acc, p) => acc + p.scans.length, 0);
  const ownedCount = getOwnedProjects().length;
  const sharedCount = getSharedProjects().length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ProjectsNavigation />

      <main className="pt-16">
        <div className="container max-w-4xl mx-auto px-6 py-8">
          {/* Back Link */}
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>

          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {user.initials}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>

            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="account" className="gap-2">
                <User className="w-4 h-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        defaultValue={user.name}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        defaultValue={user.email}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="company"
                        defaultValue="Mirror Labs"
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="location"
                        defaultValue="San Francisco, CA"
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsEditing(false)}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats Card */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Account Statistics</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <FolderOpen className="w-6 h-6 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold">{totalProjects}</p>
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <Scan className="w-6 h-6 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold">{totalScans}</p>
                    <p className="text-sm text-muted-foreground">Total Scans</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <User className="w-6 h-6 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold">{ownedCount}</p>
                    <p className="text-sm text-muted-foreground">Owned</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <Calendar className="w-6 h-6 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold">{sharedCount}</p>
                    <p className="text-sm text-muted-foreground">Shared</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
                <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>

                <div className="space-y-4">
                  {mockProjects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-12 h-9 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/projects/${project.id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-center">
                  <Button variant="outline" asChild>
                    <Link to="/portfolio">View All Projects</Link>
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>

                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>

                  <Separator />

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Project Updates</p>
                      <p className="text-sm text-muted-foreground">When someone edits a shared project</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>

                  <Separator />

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">New Comments</p>
                      <p className="text-sm text-muted-foreground">When someone comments on your scans</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>

                  <Separator />

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Share Invitations</p>
                      <p className="text-sm text-muted-foreground">When someone shares a project with you</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Password</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  <Button>Update Password</Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Sessions</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your active sessions across different devices.
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-muted-foreground">Windows - Chrome</p>
                  </div>
                  <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">Active</span>
                </div>
                <Button variant="outline" className="mt-4 gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out All Other Sessions
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Profile;
