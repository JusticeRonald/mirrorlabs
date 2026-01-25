import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import ClientNav from './ClientNav';
import { Button } from '@/components/ui/button';

interface ClientLayoutProps {
  children: ReactNode;
}

/**
 * ClientLayout - Layout wrapper for client (non-staff) pages
 *
 * Features:
 * - Left sidebar with workspace navigation (ClientNav) including logo and user profile
 * - Mobile-responsive with drawer pattern and floating hamburger button
 */
export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu button - fixed position */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-card shadow-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Sidebar */}
      <ClientNav
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default ClientLayout;
