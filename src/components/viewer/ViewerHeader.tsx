import { Link } from 'react-router-dom';
import { ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import RoleBadge from '@/components/ui/role-badge';
import { Project, Scan } from '@/data/mockProjects';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

interface ViewerHeaderProps {
  project: Project;
  scan: Scan;
  userRole: UserRole;
  onShare: () => void;
  variant?: 'full' | 'demo';
}

const ViewerHeader = ({ project, scan, userRole, onShare, variant = 'full' }: ViewerHeaderProps) => {
  const { isLoggedIn } = useAuth();

  // Non-logged-in users go back to demo, logged-in users go to project detail
  const backLink = isLoggedIn ? `/projects/${project.id}` : '/demo';
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
                <h1 className="text-sm font-medium">{scan.name}</h1>
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
                {project.members.slice(0, 4).map((member, i) => (
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
                {project.members.length > 4 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center cursor-pointer">
                        <span className="text-xs font-medium text-muted-foreground">
                          +{project.members.length - 4}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{project.members.length - 4} more collaborators</p>
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
