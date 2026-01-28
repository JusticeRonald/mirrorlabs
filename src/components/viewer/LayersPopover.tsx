import { Layers, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LayersPopoverProps {
  showAnnotations: boolean;
  showMeasurements: boolean;
  showGrid: boolean;
  onToggleAnnotations: () => void;
  onToggleMeasurements: () => void;
  onToggleGrid: () => void;
}

interface LayerRowProps {
  label: string;
  visible: boolean;
  onToggle: () => void;
}

const LayerRow = ({ label, visible, onToggle }: LayerRowProps) => {
  const Icon = visible ? Eye : EyeOff;
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
        'hover:bg-muted/50',
        !visible && 'text-muted-foreground'
      )}
    >
      <span>{label}</span>
      <Icon className="h-4 w-4 shrink-0 ml-3" />
    </button>
  );
};

const LayersPopover = ({
  showAnnotations,
  showMeasurements,
  showGrid,
  onToggleAnnotations,
  onToggleMeasurements,
  onToggleGrid,
}: LayersPopoverProps) => {
  const allVisible = showAnnotations && showMeasurements && showGrid;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 transition-all',
                !allVisible && 'text-muted-foreground'
              )}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="flex items-center gap-2">
            <span>Layers</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">H</kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="center" className="w-48 p-1">
        <LayerRow label="Annotations" visible={showAnnotations} onToggle={onToggleAnnotations} />
        <LayerRow label="Measurements" visible={showMeasurements} onToggle={onToggleMeasurements} />
        <LayerRow label="Grid" visible={showGrid} onToggle={onToggleGrid} />
      </PopoverContent>
    </Popover>
  );
};

export default LayersPopover;
