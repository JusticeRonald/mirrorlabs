import { MessageSquare, Ruler, Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AnnotationPanel } from './AnnotationPanel';
import { MeasurementsTab } from './MeasurementsTab';
import { ViewsTab } from './ViewsTab';
import type { Annotation, Measurement, SavedView } from '@/types/viewer';
import type { RolePermissions } from '@/types/user';
import type { AnnotationData, AnnotationStatus } from '@/lib/viewer/AnnotationRenderer';

function MeasureIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512" className={className} fill="currentColor">
      <path fillRule="evenodd" d="M277.333 33.83v234.65l143.085 143.102L456.837 448H64V247.163L240.915 70.248zm-42.666 103.002l-128 128v140.501h247.146L240.915 292.418l-6.248-6.248z" />
    </svg>
  );
}

export type CollaborationTab = 'annotations' | 'measurements' | 'views';
export type MeasurementToolType = 'distance' | 'area';

interface CollaborationPanelProps {
  /** Whether the panel is expanded (showing content) or collapsed (icons only) */
  isExpanded: boolean;
  /** Expand/collapse toggle handler */
  onExpandedChange: (expanded: boolean) => void;
  /** Active tab */
  activeTab: CollaborationTab;
  /** Tab change handler */
  onTabChange: (tab: CollaborationTab) => void;
  /** Currently active tool */
  activeTool: string | null;
  /** Tool change handler */
  onToolChange: (tool: string | null) => void;

  // Annotation props
  annotations: Annotation[];
  selectedAnnotationId?: string | null;
  currentUserId?: string;
  canEditAnnotations?: boolean;
  onSelectAnnotation?: (annotation: AnnotationData) => void;
  onAnnotationStatusChange?: (annotationId: string, status: AnnotationStatus) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onAddAnnotationReply?: (annotationId: string, content: string) => void;
  onAddAnnotation?: () => void;

  // Measurement props
  measurements: Measurement[];
  selectedMeasurementId?: string | null;
  permissions: RolePermissions;
  onSelectMeasurement?: (id: string) => void;
  onDeleteMeasurement?: (id: string) => void;
  onStartMeasurement?: (type: MeasurementToolType) => void;

  // Saved Views props
  savedViews?: SavedView[];
  activeSavedViewId?: string | null;
  onSelectView?: (id: string) => void;
  onDeleteView?: (id: string) => void;
  onSaveCurrentView?: () => void;
}

/**
 * CollaborationPanel - Unified tabbed panel for annotations, measurements, and views
 *
 * Features:
 * - Collapse/expand behavior: collapsed shows only icon strip, expanded shows content
 * - Click icon to expand AND activate tool (for annotations/measurements)
 * - Click same icon again to collapse and deactivate tool
 * - Distance and Area as separate icons (Area disabled/coming soon)
 */
export function CollaborationPanel({
  isExpanded,
  onExpandedChange,
  activeTab,
  onTabChange,
  activeTool,
  onToolChange,
  annotations,
  selectedAnnotationId,
  currentUserId,
  canEditAnnotations = false,
  onSelectAnnotation,
  onAnnotationStatusChange,
  onDeleteAnnotation,
  onAddAnnotationReply,
  onAddAnnotation,
  measurements,
  selectedMeasurementId,
  permissions,
  onSelectMeasurement,
  onDeleteMeasurement,
  onStartMeasurement,
  savedViews = [],
  activeSavedViewId,
  onSelectView,
  onDeleteView,
  onSaveCurrentView,
}: CollaborationPanelProps) {
  // Note: Escape key is handled by ViewerPage to avoid duplicate handlers

  // Handle annotation icon click
  const handleAnnotationClick = () => {
    if (activeTab === 'annotations' && isExpanded) {
      // Click same tab when expanded: collapse and deactivate
      onExpandedChange(false);
      onToolChange(null);
    } else {
      // Expand, switch tab, and activate comment tool
      onExpandedChange(true);
      onTabChange('annotations');
      onToolChange('comment');
    }
  };

  // Handle distance icon click
  const handleDistanceClick = () => {
    if (activeTab === 'measurements' && isExpanded && activeTool === 'distance') {
      // Click same tool when active: collapse and deactivate
      onExpandedChange(false);
      onToolChange(null);
    } else {
      // Expand, switch tab, and activate distance tool
      onExpandedChange(true);
      onTabChange('measurements');
      onToolChange('distance');
      onStartMeasurement?.('distance');
    }
  };

  // Handle area icon click (disabled for now)
  const handleAreaClick = () => {
    // Area tool not implemented yet - do nothing
    // When ready, will work like handleDistanceClick but with 'area'
  };

  // Handle views icon click
  const handleViewsClick = () => {
    if (activeTab === 'views' && isExpanded) {
      // Click same tab when expanded: collapse
      onExpandedChange(false);
    } else {
      // Expand and switch tab (no tool activation for views)
      onExpandedChange(true);
      onTabChange('views');
    }
  };

  // Handle close button
  const handleClose = () => {
    onExpandedChange(false);
    onToolChange(null);
  };

  const isAnnotationActive = activeTool === 'comment' || activeTool === 'pin';
  const isDistanceActive = activeTool === 'distance';

  // Convert Annotation to AnnotationData for AnnotationPanel
  const annotationToData = (ann: Annotation): AnnotationData => ({
    id: ann.id,
    scanId: '',
    type: ann.type,
    status: ann.status,
    content: ann.content,
    createdBy: ann.createdBy,
    createdByName: ann.createdByName,
    createdAt: ann.createdAt,
    replyCount: ann.replies?.length || 0,
  });

  return (
    <div
      className={cn(
        'flex flex-row bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-xl overflow-hidden transition-all duration-200',
        isExpanded ? 'max-h-[calc(100vh-8rem)]' : 'max-h-[280px]'
      )}
    >
        {/* Vertical Icon Strip (always visible) */}
        <div className="flex flex-col w-12 border-r border-neutral-800 py-2">
          {/* Annotations Icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'relative flex items-center justify-center h-10 w-full transition-colors',
                  activeTab === 'annotations' && isExpanded
                    ? 'text-white bg-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50',
                  isAnnotationActive && 'text-amber-400'
                )}
                onClick={handleAnnotationClick}
              >
                <MessageSquare className="h-5 w-5" />
                {/* Badge for count */}
                {annotations.length > 0 && (
                  <span
                    className={cn(
                      'absolute top-1 right-1 text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full font-medium',
                      activeTab === 'annotations' && isExpanded
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-neutral-700 text-neutral-400'
                    )}
                  >
                    {annotations.length}
                  </span>
                )}
                {/* Active indicator */}
                {activeTab === 'annotations' && isExpanded && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-neutral-800 border-neutral-700 text-neutral-100">
              <div className="flex items-center gap-2">
                <span>Annotations</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-neutral-700 rounded">C</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Distance Icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'relative flex items-center justify-center h-10 w-full transition-colors',
                  activeTab === 'measurements' && isExpanded && isDistanceActive
                    ? 'text-white bg-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50',
                  isDistanceActive && 'text-blue-400'
                )}
                onClick={handleDistanceClick}
              >
                <Ruler className="h-5 w-5" />
                {/* Badge for count */}
                {measurements.length > 0 && (
                  <span
                    className={cn(
                      'absolute top-1 right-1 text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full font-medium',
                      activeTab === 'measurements' && isExpanded
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-neutral-700 text-neutral-400'
                    )}
                  >
                    {measurements.length}
                  </span>
                )}
                {/* Active indicator */}
                {activeTab === 'measurements' && isExpanded && isDistanceActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-neutral-800 border-neutral-700 text-neutral-100">
              <div className="flex items-center gap-2">
                <span>Distance</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-neutral-700 rounded">D</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Area Icon (Disabled) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="relative flex items-center justify-center h-10 w-full transition-colors text-neutral-600 cursor-not-allowed"
                onClick={handleAreaClick}
                disabled
              >
                <MeasureIcon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-neutral-800 border-neutral-700 text-neutral-100">
              <div className="flex items-center gap-2">
                <span>Area</span>
                <span className="text-[10px] bg-neutral-700 px-1.5 py-0.5 rounded">Coming Soon</span>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Views Icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'relative flex items-center justify-center h-10 w-full transition-colors',
                  activeTab === 'views' && isExpanded
                    ? 'text-white bg-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                )}
                onClick={handleViewsClick}
              >
                <Bookmark className="h-5 w-5" />
                {/* Badge for count */}
                {savedViews.length > 0 && (
                  <span
                    className={cn(
                      'absolute top-1 right-1 text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full font-medium',
                      activeTab === 'views' && isExpanded
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-neutral-700 text-neutral-400'
                    )}
                  >
                    {savedViews.length}
                  </span>
                )}
                {/* Active indicator */}
                {activeTab === 'views' && isExpanded && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-neutral-800 border-neutral-700 text-neutral-100">
              <div className="flex items-center gap-2">
                <span>Saved Views</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-neutral-700 rounded">Ctrl+Shift+V</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Spacer to push close button to bottom */}
          <div className="flex-1" />

          {/* Close Button (only visible when expanded) */}
          {isExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-10 w-full rounded-none text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                >
                  <X className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-neutral-800 border-neutral-700 text-neutral-100">
                Close panel
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Tab Content (only visible when expanded) */}
        {isExpanded && (
          <div className="flex-1 overflow-hidden w-80">
            {activeTab === 'annotations' && (
              <AnnotationPanel
                annotations={annotations.map(ann => ({
                  ...annotationToData(ann),
                  replies: ann.replies,
                }))}
                currentUserId={currentUserId}
                canEdit={canEditAnnotations}
                onClose={handleClose}
                onSelectAnnotation={onSelectAnnotation}
                onStatusChange={onAnnotationStatusChange}
                onDelete={onDeleteAnnotation}
                onAddReply={onAddAnnotationReply}
                onAddAnnotation={onAddAnnotation}
              />
            )}
            {activeTab === 'measurements' && (
              <MeasurementsTab
                measurements={measurements}
                permissions={permissions}
                selectedMeasurementId={selectedMeasurementId}
                onSelectMeasurement={onSelectMeasurement}
                onDeleteMeasurement={onDeleteMeasurement}
                onStartMeasurement={() => onStartMeasurement?.('distance')}
              />
            )}
            {activeTab === 'views' && (
              <ViewsTab
                savedViews={savedViews}
                permissions={permissions}
                activeSavedViewId={activeSavedViewId}
                onSelectView={onSelectView}
                onDeleteView={onDeleteView}
                onSaveCurrentView={onSaveCurrentView}
              />
            )}
          </div>
        )}
    </div>
  );
}

export default CollaborationPanel;
