import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { getWorkspaces, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';

interface WorkspaceSwitcherProps {
  value: string | null;
  onChange: (workspaceId: string | null) => void;
}

export const WorkspaceSwitcher = ({ value, onChange }: WorkspaceSwitcherProps) => {
  const { isStaff } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isStaff) {
      setIsLoading(true);
      // Only fetch business workspaces for the switcher
      getWorkspaces('business').then((ws) => {
        // Filter out demo workspace
        setWorkspaces(ws.filter(w => w.slug !== 'demo'));
        setIsLoading(false);
      });
    }
  }, [isStaff]);

  // Don't render for non-staff users
  if (!isStaff) {
    return null;
  }

  const selectedWorkspace = workspaces.find((ws) => ws.id === value);
  const displayText = value ? selectedWorkspace?.name || 'Unknown Workspace' : 'All Workspaces';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isLoading}>
          <Building2 className="w-4 h-4" />
          <span className="hidden sm:inline">{isLoading ? 'Loading...' : displayText}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="flex items-center justify-between"
        >
          <span>All Workspaces</span>
          {value === null && <Check className="w-4 h-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => onChange(ws.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{ws.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ws.project_count} projects
                </span>
              </div>
            </div>
            {value === ws.id && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
        {workspaces.length === 0 && !isLoading && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No workspaces found</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Legacy export for backward compatibility
export { WorkspaceSwitcher as ClientSwitcher };

export default WorkspaceSwitcher;
