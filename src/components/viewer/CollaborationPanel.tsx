import { useState, useEffect } from 'react';
import { MessageSquare, Ruler, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnnotationPanel } from './AnnotationPanel';
import { MeasurementsTab } from './MeasurementsTab';
import type { Annotation, Measurement } from '@/types/viewer';
import type { RolePermissions } from '@/types/user';
import type { AnnotationData, AnnotationStatus } from '@/lib/viewer/AnnotationRenderer';

export type CollaborationTab = 'annotations' | 'measurements';

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
}

/**
 * CollaborationPanel - Unified tabbed panel for annotations and measurements
 *
 * Replaces the separate ViewerSidebar and AnnotationPanel with a single
 * unified interface. Auto-switches tabs based on the active tool.
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
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800">
      {/* Tab Header */}
      <div className="flex items-center border-b border-neutral-800">
        <div className="flex-1 flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                  isActive
                    ? 'text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-neutral-700 text-neutral-400'
                  )}>
                    {tab.count}
                  </span>
                )}
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 mr-1 text-neutral-400 hover:text-neutral-200"
        >
          <X className="h-4 w-4" />
        </Button>
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
          />
        )}
      </div>
    </div>
  );
}

export default CollaborationPanel;
