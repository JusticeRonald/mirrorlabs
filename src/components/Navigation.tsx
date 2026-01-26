import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, ChevronDown, User, FolderOpen, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();
  const { isLoggedIn, user, logout, isDemoMode, isStaff } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/';  // Force full navigation to clear state
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "Platform", href: "/product" },
    { label: "Use Cases", href: "/use-cases" },
    { label: "Pricing", href: "/pricing" },
    { label: "Demo", href: "/demo" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
      scrolled
        ? 'bg-background/95 border-border/80 shadow-lg shadow-background/50'
        : 'bg-background/80 border-border/50'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="Mirror Labs" className="h-8" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Button
                  key={link.label}
                  variant="nav"
                  size="sm"
                  asChild
                  className={isActive ? 'text-foreground after:!w-3/4' : ''}
                >
                  <Link to={link.href}>{link.label}</Link>
                </Button>
              );
            })}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {isDemoMode && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    Demo Mode
                  </span>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link to={isStaff ? "/admin" : "/projects"}>
                    {isStaff ? "Dashboard" : "My Projects"}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 focus:outline-none">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors">
                        <span className="text-sm font-medium text-primary">{user?.initials || 'U'}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {/* Only show Portfolio link for non-staff users */}
                    {!isStaff && (
                      <DropdownMenuItem asChild>
                        <Link to="/projects" className="flex items-center gap-2 cursor-pointer">
                          <FolderOpen className="w-4 h-4" />
                          My Projects
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        handleLogout();
                      }}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setAuthModalOpen(true)}>
                  Log In
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/contact">Request a Scan</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 px-4">
                {isLoggedIn ? (
                  <>
                    <Link
                      to={isStaff ? "/admin" : "/projects"}
                      className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {isStaff ? "Dashboard" : "My Projects"}
                    </Link>
                    <Link
                      to="/profile"
                      className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="mt-2"
                    >
                      Log Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => {
                        setAuthModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Log In
                    </Button>
                    <Button variant="hero" size="default" asChild>
                      <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>Request a Scan</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </nav>
  );
};

export default Navigation;
