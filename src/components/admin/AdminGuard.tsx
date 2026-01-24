import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Helper component that shows a toast and redirects non-staff users.
 */
const AccessDeniedRedirect = () => {
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "Access Denied",
      description: "Admin dashboard requires staff access.",
      variant: "destructive",
    });
  }, [toast]);

  return <Navigate to="/portfolio" replace />;
};

/**
 * Route guard that restricts access to staff users only.
 * Redirects non-staff users to the portfolio page with a toast notification.
 */
export const AdminGuard = ({ children }: AdminGuardProps) => {
  const { isLoggedIn, isLoading, isStaff } = useAuth();

  // Show nothing while loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect to home if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // Redirect to portfolio if not staff (with toast notification)
  if (!isStaff) {
    return <AccessDeniedRedirect />;
  }

  return <>{children}</>;
};

export default AdminGuard;
