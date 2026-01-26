import { useState } from 'react';
import {
  Pencil,
  Circle,
  Square,
  ArrowRight,
  Cloud,
  Type,
  Palette,
  Minus,
  Plus,
  Undo,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MarkupTool, StrokeStyle } from '@/lib/viewer/DrawingEngine';

/**
 * Tool configuration
 */
interface ToolConfig {
  id: MarkupTool;
  name: string;
  icon: typeof Pencil;
  shortcut?: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'freehand', name: 'Freehand', icon: Pencil, shortcut: 'F' },
  { id: 'circle', name: 'Circle', icon: Circle, shortcut: 'O' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R' },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight, shortcut: 'A' },
  { id: 'cloud', name: 'Revision Cloud', icon: Cloud, shortcut: 'C' },
  { id: 'text', name: 'Text', icon: Type, shortcut: 'T' },
];

/**
 * Preset colors for markup
 */
const COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
];

/**
 * Line width options
 */
const LINE_WIDTHS = [1, 2, 3, 4, 6, 8];

interface MarkupToolbarProps {
  /** Currently active tool */
  activeTool: MarkupTool;
  /** Tool change handler */
  onToolChange: (tool: MarkupTool) => void;
  /** Current style */
  style: Partial<StrokeStyle>;
  /** Style change handler */
  onStyleChange: (style: Partial<StrokeStyle>) => void;
  /** Undo handler */
  onUndo?: () => void;
  /** Clear all handler */
  onClear?: () => void;
  /** Close toolbar handler */
  onClose?: () => void;
  /** Whether undo is available */
  canUndo?: boolean;
  /** Whether there are markups to clear */
  hasMarkups?: boolean;
}

/**
 * MarkupToolbar - Toolbar for selecting markup tools and styles
 *
 * Features:
 * - Tool selection (freehand, shapes, cloud, text)
 * - Color picker
 * - Line width selector
 * - Undo/clear actions
 */
export function MarkupToolbar({
  activeTool,
  onToolChange,
  style,
  onStyleChange,
  onUndo,
  onClear,
  onClose,
  canUndo = false,
  hasMarkups = false,
}: MarkupToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const currentColor = style.color || '#EF4444';
  const currentWidth = style.lineWidth || 2;

  return (
    <div className="flex items-center gap-1 bg-neutral-900/90 backdrop-blur-sm border border-neutral-700 rounded-lg p-1 shadow-lg">
      {/* Drawing Tools */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    isActive && 'bg-amber-500/20 text-amber-400'
                  )}
                  onClick={() => onToolChange(isActive ? null : tool.id)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  {tool.name}
                  {tool.shortcut && (
                    <span className="ml-2 text-neutral-400">({tool.shortcut})</span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Color Picker */}
      <DropdownMenu open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <div
              className="h-4 w-4 rounded border border-neutral-600"
              style={{ backgroundColor: currentColor }}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className={cn(
                  'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
                  currentColor === color.value
                    ? 'border-amber-500'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
                onClick={() => {
                  onStyleChange({ color: color.value });
                  setShowColorPicker(false);
                }}
              />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Line Width */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <div className="flex items-center justify-center">
              <div
                className="rounded-full bg-current"
                style={{
                  width: Math.max(4, currentWidth),
                  height: Math.max(4, currentWidth),
                }}
              />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LINE_WIDTHS.map((width) => (
            <DropdownMenuItem
              key={width}
              onClick={() => onStyleChange({ lineWidth: width })}
              className={cn(
                'flex items-center gap-2',
                currentWidth === width && 'bg-amber-500/20'
              )}
            >
              <div
                className="rounded-full bg-current"
                style={{
                  width: Math.max(4, width),
                  height: Math.max(4, width),
                }}
              />
              <span>{width}px</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Actions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Undo (Ctrl+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-300"
            disabled={!hasMarkups}
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Clear all markups</p>
        </TooltipContent>
      </Tooltip>

      {/* Close */}
      {onClose && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Close markup mode</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

export default MarkupToolbar;
