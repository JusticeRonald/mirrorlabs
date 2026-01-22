import {
  Hand,
  RotateCcw,
  ZoomIn,
  Maximize,
  Ruler,
  Square,
  Triangle,
  MapPin,
  MessageSquare,
  Box,
  Scissors,
  Layers,
  Download,
  Share2,
  Grid3X3,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RolePermissions } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

interface ViewerToolbarProps {
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  permissions: RolePermissions;
  showGrid: boolean;
  onToggleGrid: () => void;
  viewMode: 'solid' | 'wireframe' | 'points';
  onViewModeChange: (mode: 'solid' | 'wireframe' | 'points') => void;
  onResetView: () => void;
  onShare: () => void;
  onExport: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Hand,
  RotateCcw,
  ZoomIn,
  Maximize,
  Ruler,
  Square,
  Triangle,
  MapPin,
  MessageSquare,
  Box,
  Scissors,
  Layers,
  Download,
  Share2,
};

interface ToolButtonProps {
  id: string;
  name: string;
  icon: React.ElementType;
  active: boolean;
  disabled?: boolean;
  shortcut?: string;
  requiresAuth?: boolean;
  isLoggedIn?: boolean;
  onClick: () => void;
}

const ToolButton = ({ id, name, icon: Icon, active, disabled, shortcut, requiresAuth, isLoggedIn, onClick }: ToolButtonProps) => {
  const showLoginPrompt = requiresAuth && disabled && !isLoggedIn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 transition-all relative',
            active && 'bg-primary/20 text-primary border border-primary/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
          {showLoginPrompt && (
            <Lock className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <span>{name}</span>
          {shortcut && <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">{shortcut}</kbd>}
        </div>
        {showLoginPrompt && (
          <span className="text-xs text-muted-foreground">Log in to use this tool</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

const ViewerToolbar = ({
  activeTool,
  onToolChange,
  permissions,
  showGrid,
  onToggleGrid,
  viewMode,
  onViewModeChange,
  onResetView,
  onShare,
  onExport,
}: ViewerToolbarProps) => {
  const { isLoggedIn } = useAuth();

  const handleToolClick = (toolId: string) => {
    if (activeTool === toolId) {
      onToolChange(null);
    } else {
      onToolChange(toolId);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
        {/* Navigate Tools */}
        <div className="flex items-center gap-1">
          <ToolButton
            id="pan"
            name="Pan"
            icon={Hand}
            active={activeTool === 'pan'}
            shortcut="P"
            onClick={() => handleToolClick('pan')}
          />
          <ToolButton
            id="orbit"
            name="Orbit"
            icon={RotateCcw}
            active={activeTool === 'orbit'}
            shortcut="O"
            onClick={() => handleToolClick('orbit')}
          />
          <ToolButton
            id="zoom"
            name="Zoom"
            icon={ZoomIn}
            active={activeTool === 'zoom'}
            shortcut="Z"
            onClick={() => handleToolClick('zoom')}
          />
          <ToolButton
            id="reset"
            name="Reset View"
            icon={Maximize}
            active={false}
            shortcut="R"
            onClick={onResetView}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Measure Tools */}
        <div className="flex items-center gap-1">
          <ToolButton
            id="distance"
            name="Measure Distance"
            icon={Ruler}
            active={activeTool === 'distance'}
            disabled={!permissions.canMeasure}
            requiresAuth
            isLoggedIn={isLoggedIn}
            shortcut="D"
            onClick={() => handleToolClick('distance')}
          />
          <ToolButton
            id="area"
            name="Measure Area"
            icon={Square}
            active={activeTool === 'area'}
            disabled={!permissions.canMeasure}
            requiresAuth
            isLoggedIn={isLoggedIn}
            shortcut="A"
            onClick={() => handleToolClick('area')}
          />
          <ToolButton
            id="angle"
            name="Measure Angle"
            icon={Triangle}
            active={activeTool === 'angle'}
            disabled={!permissions.canMeasure}
            requiresAuth
            isLoggedIn={isLoggedIn}
            onClick={() => handleToolClick('angle')}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Annotate Tools */}
        <div className="flex items-center gap-1">
          <ToolButton
            id="pin"
            name="Add Pin"
            icon={MapPin}
            active={activeTool === 'pin'}
            disabled={!permissions.canAnnotate}
            requiresAuth
            isLoggedIn={isLoggedIn}
            onClick={() => handleToolClick('pin')}
          />
          <ToolButton
            id="comment"
            name="Add Comment"
            icon={MessageSquare}
            active={activeTool === 'comment'}
            disabled={!permissions.canAnnotate}
            requiresAuth
            isLoggedIn={isLoggedIn}
            shortcut="C"
            onClick={() => handleToolClick('comment')}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* View Tools */}
        <div className="flex items-center gap-1">
          <ToolButton
            id="wireframe"
            name="Wireframe Mode"
            icon={Box}
            active={viewMode === 'wireframe'}
            shortcut="W"
            onClick={() => onViewModeChange(viewMode === 'wireframe' ? 'solid' : 'wireframe')}
          />
          <ToolButton
            id="grid"
            name="Toggle Grid"
            icon={Grid3X3}
            active={showGrid}
            shortcut="G"
            onClick={onToggleGrid}
          />
          <ToolButton
            id="layers"
            name="Layers"
            icon={Layers}
            active={activeTool === 'layers'}
            shortcut="L"
            onClick={() => handleToolClick('layers')}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Export Tools */}
        <div className="flex items-center gap-1">
          <ToolButton
            id="download"
            name="Download"
            icon={Download}
            active={false}
            disabled={!permissions.canExport}
            requiresAuth
            isLoggedIn={isLoggedIn}
            onClick={onExport}
          />
          <ToolButton
            id="share"
            name="Share"
            icon={Share2}
            active={false}
            disabled={!permissions.canShare}
            requiresAuth
            isLoggedIn={isLoggedIn}
            onClick={onShare}
          />
        </div>
      </div>
    </div>
  );
};

export default ViewerToolbar;
