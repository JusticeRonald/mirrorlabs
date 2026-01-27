import { Camera, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/types/viewer';
import type { RolePermissions } from '@/types/user';

interface ViewsTabProps {
  savedViews: SavedView[];
  permissions: RolePermissions;
  activeSavedViewId?: string | null;
  onSelectView?: (id: string) => void;
  onDeleteView?: (id: string) => void;
  onSaveCurrentView?: () => void;
  readOnly?: boolean;
}

/**
 * ViewsTab - Content for the Views tab in CollaborationPanel
 *
 * Displays a list of saved camera views with:
 * - Camera icon for each view
 * - Click to fly to view with smooth animation
 * - Delete functionality on hover
 * - "Save Current View" button at top
 */
export function ViewsTab({
  savedViews,
  permissions,
  activeSavedViewId,
  onSelectView,
  onDeleteView,
  onSaveCurrentView,
  readOnly = false,
}: ViewsTabProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Save Current View Button */}
      {permissions.canAnnotate && onSaveCurrentView && !readOnly && (
        <div className="p-3 border-b border-neutral-800">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-neutral-200 border-neutral-700 hover:bg-neutral-800 hover:text-white"
            onClick={onSaveCurrentView}
          >
            <Plus className="h-4 w-4" />
            Save Current View
          </Button>
        </div>
      )}

      {/* Views List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {savedViews.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No saved views</p>
              <p className="text-xs mt-1">
                {permissions.canAnnotate
                  ? 'Press Ctrl+Shift+V to save your current view'
                  : 'No views have been saved yet'}
              </p>
            </div>
          ) : (
            savedViews.map((view, index) => {
              const isActive = activeSavedViewId === view.id;

              return (
                <div
                  key={view.id}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                    'bg-emerald-500/10',
                    isActive
                      ? 'ring-2 ring-amber-500/50 bg-neutral-800'
                      : 'hover:bg-neutral-800/70'
                  )}
                  onClick={() => onSelectView?.(view.id)}
                >
                  <div className={cn('flex-shrink-0 p-2 rounded-lg bg-neutral-800/50 text-emerald-500')}>
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {view.name || `View ${index + 1}`}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(view.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {permissions.canAnnotate && onDeleteView && !readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteView(view.id);
                      }}
                      title="Delete view"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ViewsTab;
