import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  LogOut,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

interface ClientNavProps {
  /** Mobile drawer open state (controlled by parent) */
  mobileOpen?: boolean;
  /** Callback when mobile drawer should close */
  onMobileClose?: () => void;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Workspaces', href: '/workspaces', icon: Building2 },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
];

export const ClientNav = ({ mobileOpen, onMobileClose }: ClientNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isDemoMode } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (href: string) => location.pathname === href;

  const sidebarContent = (
    <>
      {/* Logo Header */}
      <div className="p-4 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/icon.svg" alt="Mirror Labs" className="h-8 w-8" />
          <span className="text-lg font-semibold">Mirror Labs</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 pt-6 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={() => onMobileClose?.()}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Demo Mode Badge */}
        {isDemoMode && (
          <div className="px-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              Demo Mode
            </span>
          </div>
        )}

        {/* User Profile with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{user?.initials || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - always visible on md+ screens */}
      <aside className="hidden md:flex w-56 border-r border-border bg-card sticky top-0 h-screen flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer - slides in from left */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onMobileClose}
          />

          {/* Drawer */}
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export default ClientNav;
