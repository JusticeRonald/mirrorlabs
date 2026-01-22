import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Bell, Settings, User, FolderOpen, LogOut, BellOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type NavFilter = 'all' | 'shared' | 'recent';

interface ProjectsNavigationProps {
  currentFilter?: NavFilter;
  onFilterChange?: (filter: NavFilter) => void;
}

const ProjectsNavigation = ({ currentFilter = 'all', onFilterChange }: ProjectsNavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navButtons = [
    { label: "Projects", filter: 'all' as NavFilter },
    { label: "Shared with me", filter: 'shared' as NavFilter },
    { label: "Recent", filter: 'recent' as NavFilter },
  ];

  const handleFilterClick = (filter: NavFilter) => {
    if (onFilterChange) {
      onFilterChange(filter);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/icon.svg"
              alt="Mirror Labs"
              className="w-8 h-8"
            />
            <span className="text-lg font-semibold text-foreground">Mirror Labs</span>
          </Link>

          {/* Desktop Navigation - Filter Buttons */}
          <div className="hidden md:flex items-center gap-1">
            {navButtons.map((item) => {
              const isActive = currentFilter === item.filter;
              return (
                <Button
                  key={item.filter}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleFilterClick(item.filter)}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Notifications Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Bell className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="py-8 text-center">
                  <BellOff className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to="/profile">
                <Settings className="w-5 h-5" />
              </Link>
            </Button>

            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ml-2 cursor-pointer hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background">
                  {user?.initials ? (
                    <span className="text-sm font-medium text-primary">{user.initials}</span>
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/portfolio" className="flex items-center gap-2 cursor-pointer">
                    <FolderOpen className="w-4 h-4" />
                    Portfolio
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
              {navButtons.map((item) => {
                const isActive = currentFilter === item.filter;
                return (
                  <button
                    key={item.filter}
                    className={`px-4 py-2 text-left transition-colors ${
                      isActive
                        ? 'text-foreground bg-secondary rounded-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handleFilterClick(item.filter)}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div className="border-t border-border/50 mt-2 pt-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  to="/portfolio"
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FolderOpen className="w-4 h-4" />
                  Portfolio
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

export default ProjectsNavigation;
