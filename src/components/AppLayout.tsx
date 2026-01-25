import { ReactNode } from "react";
import AppNavigation from "./AppNavigation";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * AppLayout - Layout wrapper for authenticated app pages
 *
 * Provides the app navigation bar for logged-in users.
 * Use this wrapper for pages that should show the app navigation
 * instead of the marketing navigation.
 */
const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
