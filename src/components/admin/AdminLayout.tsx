import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AdminNav from './AdminNav';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AdminLayout = ({ children, title, breadcrumbs = [] }: AdminLayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();

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
              <span className="text-lg font-semibold text-foreground">Admin</span>
            </Link>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{user?.initials || 'U'}</span>
            </div>
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
