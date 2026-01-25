import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";

/**
 * HomeRedirect - Smart home page component
 *
 * Redirects authenticated users to their appropriate dashboard:
 * - Staff: /admin
 * - Clients: /dashboard
 *
 * Shows the marketing landing page for unauthenticated users.
 */
const HomeRedirect = () => {
  const { isLoggedIn, isLoading, isStaff } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect logged-in users to their dashboard
  if (isLoggedIn) {
    return <Navigate to={isStaff ? "/admin" : "/dashboard"} replace />;
  }

  // Show marketing page for unauthenticated users
  return <Index />;
};

export default HomeRedirect;
