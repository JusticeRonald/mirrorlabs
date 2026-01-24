import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  PlayCircle,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Workspaces', href: '/admin/workspaces', icon: Building2 },
  { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
  { label: 'People', href: '/admin/people', icon: Users },
  { label: 'Demo Content', href: '/admin/demo', icon: PlayCircle },
];

export const AdminNav = () => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-border bg-card min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Back to app */}
      <div className="p-4 border-b border-border">
        <Button variant="ghost" size="sm" asChild className="w-full justify-start">
          <Link to="/">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to App
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Mirror Labs Admin
        </p>
      </div>
    </aside>
  );
};

export default AdminNav;
