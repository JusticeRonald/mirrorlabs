import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Product", href: "/product" },
    { label: "Use Cases", href: "/use-cases" },
    { label: "Demo", href: "/demo" },
    { label: "Contact", href: "/contact" },
  ];

  // Mock signed-in state for demo purposes
  const isSignedIn = false;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Mirror Labs"
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Button key={link.label} variant="nav" size="sm" asChild>
                <Link to={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/projects">My Projects</Link>
                </Button>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors">
                  <span className="text-sm font-medium text-primary">JD</span>
                </div>
              </>
            ) : (
              <>
                <Button variant="heroOutline" size="sm" asChild>
                  <Link to="/demo">View Demo</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/contact">Request Access</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
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
                {isSignedIn ? (
                  <Button variant="outline" size="default" asChild>
                    <Link to="/projects">My Projects</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="heroOutline" size="default" asChild>
                      <Link to="/demo">View Demo</Link>
                    </Button>
                    <Button variant="hero" size="default" asChild>
                      <Link to="/contact">Request Access</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
