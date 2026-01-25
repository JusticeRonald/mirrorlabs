import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderOpen,
  FileStack,
  Users,
  Calendar,
  ArrowUpRight,
  Play,
  Building2,
  Archive,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { getProjectById } from '@/lib/supabase/services/projects';
import type { ProjectWithMembers, Scan, ScanStatus } from '@/lib/supabase/database.types';
import type { OrganizationWithCounts } from '@/lib/supabase/services/workspaces';

// Industry labels and colors
const industryLabels: Record<string, string> = {
  construction: 'Construction',
  'real-estate': 'Real Estate',
  cultural: 'Cultural & Hospitality',
};

const industryColors: Record<string, string> = {
  construction: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'real-estate': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  cultural: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

// Scan status styling
const scanStatusConfig: Record<ScanStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  ready: { icon: CheckCircle2, className: 'text-green-500', label: 'Ready' },
  processing: { icon: Clock, className: 'text-yellow-500', label: 'Processing' },
  uploading: { icon: Loader2, className: 'text-blue-500 animate-spin', label: 'Uploading' },
  error: { icon: AlertCircle, className: 'text-red-500', label: 'Error' },
};

// Base project info from list view
export interface BaseProjectInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  industry: 'construction' | 'real-estate' | 'cultural';
  scanCount: number;
  isArchived: boolean;
  updatedAt: string;
  workspaceId?: string;
  organization?: OrganizationWithCounts;
  scans: Array<{ id: string }>;
}

// Navigation state for breadcrumbs
interface NavigationState {
  from: 'projects' | 'workspace';
  workspaceId?: string;
  workspaceName?: string;
}

interface ProjectPreviewPanelProps {
  project: BaseProjectInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigationState?: NavigationState;
  isAdmin?: boolean; // Controls link destinations and workspace link visibility
}

export function ProjectPreviewPanel({
  project,
  open,
  onOpenChange,
  navigationState = { from: 'projects' },
  isAdmin = true, // Default to admin for backward compatibility
}: ProjectPreviewPanelProps) {
  const [fullProject, setFullProject] = useState<ProjectWithMembers | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch full project details when panel opens
  useEffect(() => {
    if (open && project?.id) {
      setIsLoading(true);
      getProjectById(project.id)
        .then((data) => {
          setFullProject(data);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!open) {
      // Clear data when panel closes
      setFullProject(null);
    }
  }, [open, project?.id]);

  if (!project) return null;

  // Use full project data if available, otherwise use base info
  const scans = fullProject?.scans || [];
  const members = fullProject?.members || [];
  const hasReadyScan = scans.some((s) => s.status === 'ready');
  const firstReadyScan = scans.find((s) => s.status === 'ready');

  // Build viewer link and project details link based on isAdmin
  const projectDetailsLink = isAdmin ? `/admin/projects/${project.id}` : `/projects/${project.id}`;
  const viewerLink = firstReadyScan
    ? `/viewer/${project.id}/${firstReadyScan.id}`
    : projectDetailsLink;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={project.thumbnail}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Title and badges */}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold truncate pr-8">
                {project.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`${industryColors[project.industry]} text-xs`}>
                  {industryLabels[project.industry]}
                </Badge>
                {project.isArchived && (
                  <Badge variant="secondary" className="text-xs">
                    <Archive className="w-3 h-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {/* Workspace link - only show for admin */}
          {isAdmin && project.organization && (
            <Link
              to={`/admin/workspaces/${project.organization.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              onClick={() => onOpenChange(false)}
            >
              <Building2 className="w-4 h-4" />
              <span>{project.organization.name}</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}

          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {project.description}
            </p>
          )}

          <Separator className="my-4" />

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <FileStack className="w-4 h-4 text-muted-foreground" />
              <span>{project.scanCount} scans</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{isLoading ? '...' : members.length} members</span>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Scans section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-3">Scans</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : scans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No scans uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {scans.slice(0, 5).map((scan) => {
                  const statusConfig = scanStatusConfig[scan.status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{scan.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.className}`} />
                        <span className="text-xs text-muted-foreground">
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {scans.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{scans.length - 5} more scans
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Members section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Members</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No members assigned</p>
            ) : (
              <div className="space-y-2">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {member.profile?.initials ||
                            member.profile?.name?.substring(0, 2).toUpperCase() ||
                            'U'}
                        </span>
                      </div>
                      <span className="text-sm truncate">
                        {member.profile?.name || 'Unnamed User'}
                      </span>
                    </div>
                    <Badge
                      variant={member.role === 'owner' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {member.role}
                    </Badge>
                  </div>
                ))}
                {members.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{members.length - 5} more members
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="p-6 pt-4 border-t mt-auto">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" asChild>
              <Link
                to={projectDetailsLink}
                state={navigationState}
                onClick={() => onOpenChange(false)}
              >
                View Full Details
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              className="flex-1"
              disabled={!hasReadyScan}
              asChild={hasReadyScan}
            >
              {hasReadyScan ? (
                <Link to={viewerLink} onClick={() => onOpenChange(false)}>
                  <Play className="w-4 h-4 mr-2" />
                  Open Viewer
                </Link>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  No Ready Scans
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ProjectPreviewPanel;
