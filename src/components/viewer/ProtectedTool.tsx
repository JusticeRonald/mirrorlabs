import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RolePermissions } from '@/types/user';

interface ProtectedToolProps {
  children: ReactNode;
  permissions: RolePermissions;
  requiredPermission: keyof RolePermissions;
  fallback?: ReactNode;
  tooltipMessage?: string;
}

const ProtectedTool = ({
  children,
  permissions,
  requiredPermission,
  fallback = null,
  tooltipMessage = 'You do not have permission to use this tool',
}: ProtectedToolProps) => {
  const hasPermission = permissions[requiredPermission];

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Return disabled version with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="opacity-50 cursor-not-allowed pointer-events-none">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Higher-order component version
export function withProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: keyof RolePermissions
) {
  return function ProtectedComponent(props: P & { permissions: RolePermissions }) {
    const { permissions, ...rest } = props;

    if (!permissions[requiredPermission]) {
      return null;
    }

    return <WrappedComponent {...(rest as P)} />;
  };
}

export default ProtectedTool;
