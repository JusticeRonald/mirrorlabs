import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  User,
  LogOut,
  FolderOpen,
  LayoutDashboard,
  Building2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AppNavigation - Navigation bar for authenticated users
 *
 * Replaces marketing navigation when user is logged in.
 * Shows app-specific links instead of marketing pages.
 */
const AppNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isStaff, isDemoMode } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // App navigation links based on user role
  // Staff: Dashboard and Workspaces in left nav (Projects is in admin sidebar)
  // Clients: No left nav links (Projects button on right side)
  const navLinks = isStaff
    ? [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Workspaces", href: "/admin/workspaces", icon: Building2 },
      ]
    : [];

  const isActiveLink = (href: string) => {
    if (href === '/admin' && location.pathname === '/admin') return true;
    if (href !== '/admin' && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/80 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo - links to appropriate home */}
          <Link to={isStaff ? "/admin" : "/projects"} className="flex items-center gap-2">
            <img
              src="/icon.svg"
              alt="Mirror Labs"
              className="w-8 h-8"
            />
            <span className="text-lg font-semibold text-foreground">
              Mirror Labs
              {isStaff && (
                <span className="text-muted-foreground font-normal"> · Admin</span>
              )}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.href);
              return (
                <Button
                  key={link.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link to={link.href} className="flex items-center gap-2">
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            {isDemoMode && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Demo Mode
              </span>
            )}

            {/* Projects button for clients only */}
            {!isStaff && (
              <Button
                variant="secondary"
                size="sm"
                asChild
              >
                <Link to="/projects" className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Projects
                </Link>
              </Button>
            )}

            {/* User Name + Avatar Dropdown */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-foreground">{user?.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="User menu"
                    className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
                  >
                    {user?.initials ? (
                      <span className="text-sm font-medium text-primary">{user.initials}</span>
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
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
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-2">
              {/* Staff nav links */}
              {navLinks.map((link) => {
                const isActive = isActiveLink(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                      isActive
                        ? 'text-foreground bg-secondary rounded-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
              {/* Projects link for clients */}
              {!isStaff && (
                <Link
                  to="/projects"
                  className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                    isActiveLink('/projects')
                      ? 'text-foreground bg-secondary rounded-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FolderOpen className="w-4 h-4" />
                  Projects
                </Link>
              )}
              <div className="border-t border-border/50 mt-2 pt-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-destructive hover:text-destructive/80 transition-colors w-full text-left"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AppNavigation;
