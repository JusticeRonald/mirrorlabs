import {
  Maximize,
  Box,
  Share2,
  Grid3X3,
  Lock,
  Move,
  Maximize2,
  Rotate3D,
  RotateCcw,
  Save,
  CircleDot,
} from 'lucide-react';
import LayersPopover from '@/components/viewer/LayersPopover';
import type { TransformMode, SplatViewMode } from '@/types/viewer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  // Transform persistence controls
  onResetTransform?: () => void;
  onSaveTransform?: () => void;
  hasUnsavedTransform?: boolean;
  // Layer visibility
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  // Splat visualization mode
  splatViewMode?: SplatViewMode;
  onSplatViewModeChange?: (mode: SplatViewMode) => void;
}

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
  onResetTransform,
  onSaveTransform,
  hasUnsavedTransform,
  showAnnotations,
  onToggleAnnotations,
  showMeasurements,
  onToggleMeasurements,
  splatViewMode = 'model',
  onSplatViewModeChange,
}: ViewerToolbarProps) => {
  const { isLoggedIn } = useAuth();

  // Demo variant: only show Reset View and Grid Toggle
  if (variant === 'demo') {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
        {/* View & Transform Reset Tools */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-muted/30">
          <ToolButton
            id="reset-view"
            name="Reset View"
            icon={Maximize}
            active={false}
            shortcut="V"
            onClick={onResetView}
          />
          {onResetTransform && (
            <ToolButton
              id="reset-transform"
              name="Reset Transform"
              icon={RotateCcw}
              active={false}
              shortcut="X"
              onClick={onResetTransform}
            />
          )}
          {onSaveTransform && (
            <ToolButton
              id="save-transform"
              name="Save Transform"
              icon={Save}
              active={hasUnsavedTransform || false}
              onClick={onSaveTransform}
            />
          )}
        </div>

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
          {onSplatViewModeChange && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-9 w-9 transition-all',
                        splatViewMode !== 'model' && 'bg-primary/20 text-primary border border-primary/30'
                      )}
                    >
                      <CircleDot className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Splat Mode</TooltipContent>
              </Tooltip>
              <PopoverContent side="top" align="center" className="w-44 p-1">
                {([
                  { value: 'model' as const, label: '3D Model' },
                  { value: 'pointcloud' as const, label: 'Point Cloud' },
                ]).map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => onSplatViewModeChange(mode.value)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      'hover:bg-muted/50',
                      splatViewMode === mode.value
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground'
                    )}
                  >
                    <span>{mode.label}</span>
                    {splatViewMode === mode.value && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <LayersPopover
            showAnnotations={showAnnotations}
            showMeasurements={showMeasurements}
            showGrid={showGrid}
            onToggleAnnotations={onToggleAnnotations}
            onToggleMeasurements={onToggleMeasurements}
            onToggleGrid={onToggleGrid}
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
