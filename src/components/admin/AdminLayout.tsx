import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AdminNav from './AdminNav';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AdminLayout = ({ children, title, breadcrumbs = [] }: AdminLayoutProps) => {
  // Only show breadcrumbs when explicitly provided by the page
  // (Detail pages provide breadcrumbs, top-level pages don't)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminNav />

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Breadcrumbs & Title */}
        <div className="border-b border-border bg-background/50 px-6 py-4">
          {/* Breadcrumbs - only render if provided */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.label} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="w-4 h-4" />}
                  {crumb.href && index < breadcrumbs.length - 1 ? (
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
          )}

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
  );
};

export default AdminLayout;
