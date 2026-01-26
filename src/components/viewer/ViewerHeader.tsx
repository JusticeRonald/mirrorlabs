import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, ExternalLink, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RoleBadge from '@/components/ui/role-badge';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

// Generic project type for ViewerHeader compatibility
interface ViewerHeaderProject {
  id: string;
  name: string;
  members?: Array<{
    user: {
      id: string;
      name: string;
      avatar?: string;
      initials: string;
    };
    role: UserRole;
  }>;
}

interface ViewerHeaderScan {
  id: string;
  name: string;
}

// Scan info for the dropdown (includes status)
interface ScanInfo {
  id: string;
  name: string;
  status: string;
}

interface ViewerHeaderProps {
  project: ViewerHeaderProject;
  scan: ViewerHeaderScan;
  scans?: ScanInfo[];  // All scans in project for switcher
  userRole: UserRole;
  onShare: () => void;
  variant?: 'full' | 'demo';
}

const ViewerHeader = ({ project, scan, scans = [], userRole, onShare, variant = 'full' }: ViewerHeaderProps) => {
  const { isLoggedIn, isStaff } = useAuth();
  const navigate = useNavigate();

  // Check if we have multiple scans to enable switching
  const hasMultipleScans = scans.length > 1;

  // Handle scan switch
  const handleScanSelect = (scanId: string) => {
    if (scanId !== scan.id) {
      navigate(`/viewer/${project.id}/${scanId}`);
    }
  };

  // Get status icon for a scan
  const getScanStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
      case 'uploading':
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  // Get status label for non-ready scans
  const getScanStatusLabel = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'uploading':
        return 'Uploading...';
      case 'error':
        return 'Error';
      default:
        return null;
    }
  };

  // Non-logged-in users go back to demo, staff go to admin view, regular users go to project detail
  const backLink = !isLoggedIn ? '/demo' : isStaff ? `/admin/projects/${project.id}` : `/projects/${project.id}`;
  const viewerLink = `/viewer/${project.id}/${scan.id}`;
  const isDemo = variant === 'demo';

  return (
    <div className="absolute top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-background via-background/80 to-transparent">
        {/* Left: Back & Breadcrumb (or just title for demo) */}
        <div className="flex items-center gap-3">
          {!isDemo && (
            <Link to={backLink}>
              <Button variant="ghost" size="icon" className="h-9 w-9 bg-card/50 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                {/* Scan name with dropdown for switching */}
                {hasMultipleScans && !isDemo ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm">
                        {scan.name}
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {scans.map((s) => {
                        const isCurrentScan = s.id === scan.id;
                        const isReady = s.status === 'ready';
                        const statusIcon = getScanStatusIcon(s.status);
                        const statusLabel = getScanStatusLabel(s.status);

                        return (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => isReady && handleScanSelect(s.id)}
                            disabled={!isReady}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isCurrentScan ? (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <div className="w-4 shrink-0" />
                              )}
                              <span className={`truncate ${!isReady ? 'text-muted-foreground' : ''}`}>
                                {s.name}
                              </span>
                            </div>
                            {statusIcon || statusLabel ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                {statusIcon}
                                {statusLabel && <span>{statusLabel}</span>}
                              </div>
                            ) : null}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <h1 className="text-sm font-medium">{scan.name}</h1>
                )}
                {!isDemo && <RoleBadge role={userRole} size="sm" />}
              </div>
              <p className="text-xs text-muted-foreground">
                {project.name}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Collaborators & Share (or Open Full Viewer for demo) */}
        <div className="flex items-center gap-3">
          {!isDemo && (
            <>
              {/* Collaborator Avatars */}
              <div className="flex -space-x-2">
                {(project.members || []).slice(0, 4).map((member, i) => (
                  <Tooltip key={member.user.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-8 h-8 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center cursor-pointer hover:z-10 transition-transform hover:scale-110"
                        style={{ zIndex: 4 - i }}
                      >
                        {member.user.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={member.user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-primary">
                            {member.user.initials}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {(project.members?.length || 0) > 4 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center cursor-pointer">
                        <span className="text-xs font-medium text-muted-foreground">
                          +{(project.members?.length || 0) - 4}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{(project.members?.length || 0) - 4} more collaborators</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Share Button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-card/50 backdrop-blur-sm"
                onClick={onShare}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </>
          )}

          {isDemo && (
            <Link to={viewerLink}>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Full Viewer
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewerHeader;
