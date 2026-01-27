import { useState } from 'react';
import {
  Maximize,
  Ruler,
  Square,
  MessageSquare,
  Box,
  Share2,
  Grid3X3,
  Lock,
  Move,
  Maximize2,
  Rotate3D,
  Check,
  Bookmark,
} from 'lucide-react';
import type { TransformMode } from '@/types/viewer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  variant?: 'full' | 'demo';
  // Transform gizmo controls
  transformMode?: TransformMode | null;
  onTransformModeChange?: (mode: TransformMode | null) => void;
  // Annotation panel
  onOpenAnnotationPanel?: () => void;
  annotationCount?: number;
  // Measurement panel
  onOpenMeasurementPanel?: () => void;
  measurementCount?: number;
  // Saved views
  onSaveView?: () => void;
  savedViewCount?: number;
}

const iconMap: Record<string, React.ElementType> = {
  Maximize,
  Ruler,
  Square,
  MessageSquare,
  Box,
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
  comingSoon?: boolean;
  onClick: () => void;
}

const ToolButton = ({ id, name, icon: Icon, active, disabled, shortcut, requiresAuth, isLoggedIn, comingSoon, onClick }: ToolButtonProps) => {
  const showLoginPrompt = requiresAuth && disabled && !isLoggedIn && !comingSoon;
  const isDisabled = disabled || comingSoon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 transition-all relative',
            active && 'bg-primary/20 text-primary border border-primary/30',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={isDisabled}
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
        {comingSoon && (
          <span className="text-xs text-muted-foreground">Coming soon</span>
        )}
        {showLoginPrompt && (
          <span className="text-xs text-muted-foreground">Log in to use this tool</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

interface MeasureToolDropdownProps {
  activeTool: string | null;
  onToolChange: (tool: string | null) => void;
  canMeasure: boolean;
  isLoggedIn: boolean;
  measurementCount?: number;
  onOpenMeasurementPanel?: () => void;
  onTransformModeChange?: (mode: TransformMode | null) => void;
}

const measureTools = [
  { id: 'distance', name: 'Distance', icon: Ruler, shortcut: 'D', comingSoon: false },
  { id: 'area', name: 'Area', icon: Square, shortcut: 'A', comingSoon: true },
] as const;

const MeasureToolDropdown = ({ activeTool, onToolChange, canMeasure, isLoggedIn, measurementCount = 0, onOpenMeasurementPanel, onTransformModeChange }: MeasureToolDropdownProps) => {
  const [open, setOpen] = useState(false);

  // Find the currently active measurement tool (if any)
  const activeMeasureTool = measureTools.find(t => t.id === activeTool);
  const isMeasureToolActive = !!activeMeasureTool;

  // Determine which icon to show on the button
  const ActiveIcon = activeMeasureTool?.icon ?? Ruler;

  const handleSelect = (toolId: string) => {
    if (activeTool === toolId) {
      onToolChange(null);
    } else {
      onToolChange(toolId);
      // Hide gizmo for mutual exclusivity
      onTransformModeChange?.(null);
    }
    // Open the measurement panel when a tool is selected
    if (onOpenMeasurementPanel) {
      onOpenMeasurementPanel();
    }
    setOpen(false);
  };

  const showLoginPrompt = !canMeasure && !isLoggedIn;

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 transition-all relative',
                  isMeasureToolActive && 'bg-primary/20 text-primary border border-primary/30',
                  !canMeasure && 'opacity-50'
                )}
              >
                <ActiveIcon className="h-4 w-4" />
                <div
                  className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-current border-l-[6px] border-l-transparent"
                  aria-hidden="true"
                />
                {showLoginPrompt && (
                  <Lock className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Measure Tools</span>
            {showLoginPrompt && (
              <span className="text-xs text-muted-foreground block">Log in to use</span>
            )}
          </TooltipContent>
        </Tooltip>
      <DropdownMenuContent side="top" align="start" className="min-w-[180px]">
        {measureTools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            onClick={() => handleSelect(tool.id)}
            disabled={!canMeasure || tool.comingSoon}
            className="flex items-center gap-2 cursor-pointer"
          >
            <tool.icon className="h-4 w-4" />
            <span className="flex-1">{tool.name}</span>
            {activeTool === tool.id && <Check className="h-4 w-4 text-primary" />}
            {tool.comingSoon && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
            )}
            {tool.shortcut && !tool.comingSoon && (
              <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{tool.shortcut}</kbd>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
      {measurementCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center pointer-events-none">
          {measurementCount > 9 ? '9+' : measurementCount}
        </span>
      )}
    </div>
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
  variant = 'full',
  transformMode,
  onTransformModeChange,
  onOpenAnnotationPanel,
  annotationCount = 0,
  onOpenMeasurementPanel,
  measurementCount = 0,
  onSaveView,
  savedViewCount = 0,
}: ViewerToolbarProps) => {
  const { isLoggedIn } = useAuth();

  const handleToolClick = (toolId: string) => {
    if (activeTool === toolId) {
      onToolChange(null);
    } else {
      onToolChange(toolId);
    }
  };

  // Demo variant: only show Reset View and Grid Toggle
  if (variant === 'demo') {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
          <ToolButton
            id="reset"
            name="Reset View"
            icon={Maximize}
            active={false}
            shortcut="V"
            onClick={onResetView}
          />
          <ToolButton
            id="grid"
            name="Toggle Grid"
            icon={Grid3X3}
            active={showGrid}
            shortcut="T"
            onClick={onToggleGrid}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
        {/* Navigation */}
        <ToolButton
          id="reset"
          name="Reset View"
          icon={Maximize}
          active={false}
          shortcut="V"
          onClick={onResetView}
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Transform Tools (with visual container) */}
        {onTransformModeChange && (
          <>
            <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-muted/30">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8 transition-all',
                      transformMode === 'translate' && 'bg-primary/20 text-primary border border-primary/30'
                    )}
                    onClick={() => {
                      onTransformModeChange(transformMode === 'translate' ? null : 'translate');
                      onToolChange(null);
                    }}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span>Move</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">G</kbd>
                  </div>
                  <span className="text-xs text-muted-foreground">Drag axes to reposition</span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8 transition-all',
                      transformMode === 'rotate' && 'bg-primary/20 text-primary border border-primary/30'
                    )}
                    onClick={() => {
                      onTransformModeChange(transformMode === 'rotate' ? null : 'rotate');
                      onToolChange(null);
                    }}
                  >
                    <Rotate3D className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span>Rotate</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">R</kbd>
                  </div>
                  <span className="text-xs text-muted-foreground">Drag rings to rotate freely</span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8 transition-all',
                      transformMode === 'scale' && 'bg-primary/20 text-primary border border-primary/30'
                    )}
                    onClick={() => {
                      onTransformModeChange(transformMode === 'scale' ? null : 'scale');
                      onToolChange(null);
                    }}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span>Scale</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">S</kbd>
                  </div>
                  <span className="text-xs text-muted-foreground">Drag handles to resize</span>
                </TooltipContent>
              </Tooltip>
            </div>
            <Separator orientation="vertical" className="h-6 mx-1" />
          </>
        )}

        {/* Feature Tools (with visual container) */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-muted/30">
          <MeasureToolDropdown
            activeTool={activeTool}
            onToolChange={onToolChange}
            canMeasure={permissions.canMeasure}
            isLoggedIn={isLoggedIn}
            measurementCount={measurementCount}
            onOpenMeasurementPanel={onOpenMeasurementPanel}
            onTransformModeChange={onTransformModeChange}
          />
          {onOpenAnnotationPanel && (
            <div className="relative">
              <ToolButton
                id="comment"
                name="Annotate"
                icon={MessageSquare}
                active={activeTool === 'comment'}
                shortcut="C"
                onClick={() => {
                  if (activeTool === 'comment') {
                    onToolChange(null);
                  } else {
                    onToolChange('comment');
                    onTransformModeChange?.(null);
                  }
                  onOpenAnnotationPanel();
                }}
              />
              {annotationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center pointer-events-none">
                  {annotationCount > 9 ? '9+' : annotationCount}
                </span>
              )}
            </div>
          )}
          {onSaveView && (
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 transition-all"
                    onClick={onSaveView}
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span>Save View</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+Shift+V</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
              {savedViewCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center pointer-events-none">
                  {savedViewCount > 9 ? '9+' : savedViewCount}
                </span>
              )}
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* View Controls (with visual container) */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-muted/30">
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
            shortcut="T"
            onClick={onToggleGrid}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Share */}
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
  );
};

export default ViewerToolbar;
