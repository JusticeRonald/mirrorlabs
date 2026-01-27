import { useEffect } from 'react';
import { MessageSquare, Ruler, Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AnnotationPanel } from './AnnotationPanel';
import { MeasurementsTab } from './MeasurementsTab';
import { ViewsTab } from './ViewsTab';
import type { Annotation, Measurement, SavedView } from '@/types/viewer';
import type { RolePermissions } from '@/types/user';
import type { AnnotationData, AnnotationStatus } from '@/lib/viewer/AnnotationRenderer';

export type CollaborationTab = 'annotations' | 'measurements' | 'views';

interface CollaborationPanelProps {
  /** Active tab */
  activeTab: CollaborationTab;
  /** Tab change handler */
  onTabChange: (tab: CollaborationTab) => void;
  /** Close panel handler */
  onClose: () => void;
  /** Currently active tool (for auto-switching) */
  activeTool?: string | null;

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
  onStartMeasurement?: () => void;

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
 * Features vertical tab navigation with icons on the left side and content on the right.
 * Auto-switches tabs based on the active tool.
 */
export function CollaborationPanel({
  activeTab,
  onTabChange,
  onClose,
  activeTool,
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
  // Auto-switch tab based on active tool
  useEffect(() => {
    if (activeTool === 'distance' || activeTool === 'area' || activeTool === 'angle') {
      onTabChange('measurements');
    } else if (activeTool === 'comment' || activeTool === 'pin') {
      onTabChange('annotations');
    }
  }, [activeTool, onTabChange]);

  const tabs = [
    {
      id: 'annotations' as CollaborationTab,
      label: 'Annotations',
      icon: MessageSquare,
      count: annotations.length,
    },
    {
      id: 'measurements' as CollaborationTab,
      label: 'Measurements',
      icon: Ruler,
      count: measurements.length,
    },
    {
      id: 'views' as CollaborationTab,
      label: 'Views',
      icon: Bookmark,
      count: savedViews.length,
    },
  ];

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
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-row bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-xl overflow-hidden max-h-[calc(100vh-8rem)]">
        {/* Vertical Tab Strip */}
        <div className="flex flex-col w-12 border-r border-neutral-800 py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'relative flex items-center justify-center h-10 w-full transition-colors',
                      isActive
                        ? 'text-white bg-neutral-800'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                    )}
                    onClick={() => onTabChange(tab.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {/* Badge for count */}
                    {tab.count > 0 && (
                      <span
                        className={cn(
                          'absolute top-1 right-1 text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full font-medium',
                          isActive
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-neutral-700 text-neutral-400'
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-neutral-800 border-neutral-700 text-neutral-100">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Spacer to push close button to bottom */}
          <div className="flex-1" />

          {/* Close Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-full rounded-none text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              >
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-neutral-800 border-neutral-700 text-neutral-100">
              Close panel
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'annotations' && (
            <AnnotationPanel
              annotations={annotations.map(ann => ({
                ...annotationToData(ann),
                replies: ann.replies,
              }))}
              currentUserId={currentUserId}
              canEdit={canEditAnnotations}
              onClose={onClose}
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
              onStartMeasurement={onStartMeasurement}
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
      </div>
    </TooltipProvider>
  );
}

export default CollaborationPanel;
