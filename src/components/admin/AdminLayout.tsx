import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, User, LogOut } from 'lucide-react';
import AdminNav from './AdminNav';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AdminLayout = ({ children, title, breadcrumbs = [] }: AdminLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Build default breadcrumbs from path
  const defaultBreadcrumbs = [{ label: 'Admin', href: '/admin' }];

  // Add path-based breadcrumbs
  const pathParts = location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 1) {
    const sectionLabels: Record<string, string> = {
      clients: 'Clients',
      users: 'Users',
      demo: 'Demo Content',
    };
    const section = pathParts[1];
    if (sectionLabels[section]) {
      defaultBreadcrumbs.push({
        label: sectionLabels[section],
        href: `/admin/${section}`,
      });
    }
  }

  const finalBreadcrumbs = breadcrumbs.length > 0
    ? [{ label: 'Admin', href: '/admin' }, ...breadcrumbs]
    : defaultBreadcrumbs;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card sticky top-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/icon.svg"
                alt="Mirror Labs"
                className="h-8 w-8"
              />
              <span className="text-lg font-semibold text-foreground">
                Mirror Labs
                <span className="text-muted-foreground font-normal"> · Admin</span>
              </span>
            </Link>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground">{user?.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background">
                  <span className="text-sm font-medium text-primary">{user?.initials || 'U'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AdminNav />

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {/* Breadcrumbs & Title */}
          <div className="border-b border-border bg-background/50 px-6 py-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              {finalBreadcrumbs.map((crumb, index) => (
                <span key={crumb.label} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="w-4 h-4" />}
                  {crumb.href && index < finalBreadcrumbs.length - 1 ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>

            {/* Title */}
            {title && (
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            )}
          </div>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
