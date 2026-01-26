import { useState } from 'react';
import {
  MapPin,
  MessageSquare,
  Clock,
  User,
  Check,
  RotateCcw,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AnnotationData, AnnotationStatus } from '@/lib/viewer/AnnotationRenderer';

/**
 * Reply type for annotation threads
 */
interface AnnotationReply {
  id: string;
  content: string;
  createdBy: string;
  /** Display name of the creator (resolved from profile) */
  createdByName?: string;
  createdAt: string;
}

/**
 * Extended annotation data with replies
 */
interface AnnotationWithReplies extends AnnotationData {
  replies?: AnnotationReply[];
}

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<AnnotationStatus, { label: string; color: string; bgColor: string; icon: typeof Check }> = {
  open: { label: 'Open', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: MapPin },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Clock },
  resolved: { label: 'Resolved', color: 'text-green-400', bgColor: 'bg-green-500/10', icon: Check },
  reopened: { label: 'Reopened', color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: RotateCcw },
  archived: { label: 'Archived', color: 'text-gray-400', bgColor: 'bg-gray-500/10', icon: Archive },
};

interface AnnotationPanelProps {
  /** Annotation data to display (for backward compat - ignored in new layout) */
  annotation?: AnnotationWithReplies | null;
  /** All annotations for list view */
  annotations?: AnnotationWithReplies[];
  /** Current user ID for checking permissions */
  currentUserId?: string;
  /** Whether current user can edit annotations */
  canEdit?: boolean;
  /** Close panel handler */
  onClose: () => void;
  /** Select annotation handler */
  onSelectAnnotation?: (annotation: AnnotationData) => void;
  /** Status change handler */
  onStatusChange?: (annotationId: string, status: AnnotationStatus) => void;
  /** Delete annotation handler */
  onDelete?: (annotationId: string) => void;
  /** Add reply handler */
  onAddReply?: (annotationId: string, content: string) => void;
  /** Fly to annotation handler */
  onFlyTo?: (annotation: AnnotationData) => void;
  /** Panel mode - ignored in new layout, kept for backward compat */
  mode?: 'detail' | 'list';
  /** Add annotation handler - activates annotation tool */
  onAddAnnotation?: () => void;
}

/**
 * AnnotationPanel - Simplified list panel matching MeasurementsTab pattern
 *
 * Features:
 * - Flat list with expandable items
 * - Click to select and expand inline
 * - Status workflow management
 * - Reply threading (inline when expanded)
 * - Consistent styling with MeasurementsTab
 */
export function AnnotationPanel({
  annotations = [],
  currentUserId,
  canEdit = false,
  onClose,
  onSelectAnnotation,
  onStatusChange,
  onDelete,
  onAddReply,
  onAddAnnotation,
}: AnnotationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleSelect = (ann: AnnotationWithReplies) => {
    // Toggle expansion
    if (expandedId === ann.id) {
      setExpandedId(null);
    } else {
      setExpandedId(ann.id);
      setIsReplying(false);
      setReplyContent('');
    }
    onSelectAnnotation?.(ann);
  };

  const handleSubmitReply = (annotationId: string) => {
    if (!replyContent.trim() || !onAddReply) return;
    onAddReply(annotationId, replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const canEditAnnotation = (ann: AnnotationData) => {
    return canEdit || ann.createdBy === currentUserId;
  };

  const getAnnotationLabel = (ann: AnnotationWithReplies, index: number) => {
    // Truncate content to create a label
    const content = ann.content || '';
    if (content.length > 30) {
      return content.substring(0, 30) + '...';
    }
    return content || `Annotation ${index + 1}`;
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-2">
        {/* Add button */}
        {onAddAnnotation && canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mb-2 border-dashed border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500"
            onClick={onAddAnnotation}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Annotation
          </Button>
        )}

        {annotations.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No annotations yet</p>
            <p className="text-xs mt-1">Press C to add a comment</p>
          </div>
        ) : (
          annotations.map((ann, index) => {
            const statusConfig = STATUS_CONFIG[ann.status];
            const StatusIcon = statusConfig.icon;
            const isSelected = expandedId === ann.id;
            const replyCount = ann.replies?.length ?? 0;

            return (
              <div
                key={ann.id}
                className={cn(
                  'group rounded-lg transition-all',
                  statusConfig.bgColor,
                  isSelected
                    ? 'ring-2 ring-amber-500/50 bg-neutral-800'
                    : 'hover:bg-neutral-800/70'
                )}
              >
                {/* Main row - always visible */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => handleSelect(ann)}
                >
                  <div className={cn('flex-shrink-0 p-2 rounded-lg bg-neutral-800/50', statusConfig.color)}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {getAnnotationLabel(ann, index)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{statusConfig.label}</span>
                      {replyCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {replyCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Expand indicator */}
                  <div className="flex-shrink-0 text-neutral-500">
                    {isSelected ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  {/* Delete button (hover) */}
                  {canEditAnnotation(ann) && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ann.id);
                      }}
                      title="Delete annotation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Expanded content */}
                {isSelected && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-neutral-700/50">
                    {/* Full content */}
                    <div className="pt-3 space-y-2">
                      <p className="text-sm text-neutral-200 whitespace-pre-wrap">
                        {ann.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <User className="w-3 h-3" />
                        <span>{ann.createdByName || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(ann.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status changer */}
                    {canEditAnnotation(ann) && onStatusChange && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Status:</span>
                        <Select
                          value={ann.status}
                          onValueChange={(value) =>
                            onStatusChange(ann.id, value as AnnotationStatus)
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Replies section */}
                    {replyCount > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-neutral-500 uppercase">
                          Replies ({replyCount})
                        </h5>
                        {ann.replies?.map((reply) => (
                          <div
                            key={reply.id}
                            className="text-xs text-neutral-400 pl-2 border-l-2 border-neutral-700"
                          >
                            <p className="text-neutral-300">{reply.content}</p>
                            <div className="flex items-center gap-1 mt-1 text-neutral-500">
                              <span>{reply.createdByName || 'User'}</span>
                              <span>•</span>
                              <span>{formatDate(reply.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {onAddReply && (
                      <>
                        {isReplying ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Write a reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              className="min-h-[60px] resize-none text-xs"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setIsReplying(false);
                                  setReplyContent('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSubmitReply(ann.id)}
                                disabled={!replyContent.trim()}
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs text-neutral-400 hover:text-neutral-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsReplying(true);
                            }}
                          >
                            <MessageSquare className="w-3 h-3 mr-2" />
                            Add Reply
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}

export default AnnotationPanel;
