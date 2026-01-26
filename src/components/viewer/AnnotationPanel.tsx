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
  Navigation,
  X,
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
import { Separator } from '@/components/ui/separator';
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
const STATUS_CONFIG: Record<AnnotationStatus, { label: string; color: string; icon: typeof Check }> = {
  open: { label: 'Open', color: 'bg-red-500 text-white', icon: MapPin },
  in_progress: { label: 'In Progress', color: 'bg-amber-500 text-white', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-500 text-white', icon: Check },
  reopened: { label: 'Reopened', color: 'bg-orange-500 text-white', icon: RotateCcw },
  archived: { label: 'Archived', color: 'bg-gray-500 text-white', icon: Archive },
};

interface AnnotationPanelProps {
  /** Annotation data to display */
  annotation: AnnotationWithReplies | null;
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
  /** Panel mode */
  mode?: 'detail' | 'list';
  /** Add annotation handler - activates annotation tool */
  onAddAnnotation?: () => void;
}

/**
 * AnnotationPanel - Sidebar panel for viewing and managing annotations
 *
 * Features:
 * - Detail view: Shows full annotation content, status, and replies
 * - List view: Shows all annotations with quick actions
 * - Status workflow management
 * - Reply threading
 * - Fly-to functionality
 */
export function AnnotationPanel({
  annotation,
  annotations = [],
  currentUserId,
  canEdit = false,
  onClose,
  onSelectAnnotation,
  onStatusChange,
  onDelete,
  onAddReply,
  onFlyTo,
  mode = 'detail',
  onAddAnnotation,
}: AnnotationPanelProps) {
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const toggleReplies = (annotationId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(annotationId)) {
        next.delete(annotationId);
      } else {
        next.add(annotationId);
      }
      return next;
    });
  };

  const handleSubmitReply = () => {
    if (!annotation || !replyContent.trim() || !onAddReply) return;
    onAddReply(annotation.id, replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const canEditAnnotation = (ann: AnnotationData) => {
    return canEdit || ann.createdBy === currentUserId;
  };

  // List View
  if (mode === 'list') {
    return (
      <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-sm">Annotations</h3>
            <Badge variant="secondary" className="text-xs">
              {annotations.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {onAddAnnotation && canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onAddAnnotation}
                className="h-7 w-7"
                title="Add annotation"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {annotations.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-sm">
                No annotations yet
              </div>
            ) : (
              annotations.map((ann) => (
                <AnnotationListItem
                  key={ann.id}
                  annotation={ann}
                  isExpanded={expandedReplies.has(ann.id)}
                  onSelect={() => onSelectAnnotation?.(ann)}
                  onToggleReplies={() => toggleReplies(ann.id)}
                  onFlyTo={() => onFlyTo?.(ann)}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Detail View
  if (!annotation) {
    return (
      <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <h3 className="font-medium text-sm">Annotation Details</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
          Select an annotation to view details
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[annotation.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-500" />
          <h3 className="font-medium text-sm">Annotation</h3>
        </div>
        <div className="flex items-center gap-1">
          {onFlyTo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onFlyTo(annotation)}
              className="h-7 w-7"
              title="Fly to annotation"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            <Badge className={cn('flex items-center gap-1', statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>

            {canEditAnnotation(annotation) && onStatusChange && (
              <Select
                value={annotation.status}
                onValueChange={(value) =>
                  onStatusChange(annotation.id, value as AnnotationStatus)
                }
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
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
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <p className="text-sm text-neutral-200 whitespace-pre-wrap">
              {annotation.content}
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <User className="w-3 h-3" />
              <span>{annotation.createdByName || 'Unknown'}</span>
              <span>•</span>
              <span>{formatDate(annotation.createdAt)}</span>
            </div>
          </div>

          <Separator />

          {/* Replies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-neutral-400 uppercase">
                Replies ({annotation.replies?.length ?? 0})
              </h4>
            </div>

            {annotation.replies && annotation.replies.length > 0 ? (
              <div className="space-y-3">
                {annotation.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="bg-neutral-800/50 rounded-lg p-3 space-y-2"
                  >
                    <p className="text-sm text-neutral-300">{reply.content}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <User className="w-3 h-3" />
                      <span>{reply.createdByName || 'User'}</span>
                      <span>•</span>
                      <span>{formatDate(reply.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No replies yet</p>
            )}

            {/* Reply Input */}
            {onAddReply && (
              <>
                {isReplying ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsReplying(false);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitReply}
                        disabled={!replyContent.trim()}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsReplying(true)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Reply
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Delete Action */}
          {canEditAnnotation(annotation) && onDelete && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => onDelete(annotation.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Annotation
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * List item component for annotation list view
 */
function AnnotationListItem({
  annotation,
  isExpanded,
  onSelect,
  onToggleReplies,
  onFlyTo,
  formatDate,
}: {
  annotation: AnnotationWithReplies;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleReplies: () => void;
  onFlyTo: () => void;
  formatDate: (date: string) => string;
}) {
  const statusConfig = STATUS_CONFIG[annotation.status];
  const replyCount = annotation.replies?.length ?? 0;

  return (
    <div
      className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 hover:border-neutral-600 transition-colors"
    >
      <div
        className="p-3 cursor-pointer"
        onClick={onSelect}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn('text-xs px-1.5 py-0', statusConfig.color)}
          >
            {statusConfig.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onFlyTo();
            }}
            title="Fly to annotation"
          >
            <Navigation className="h-3 w-3" />
          </Button>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-neutral-300 line-clamp-2 mb-2">
          {annotation.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{formatDate(annotation.createdAt)}</span>
          {replyCount > 0 && (
            <button
              className="flex items-center gap-1 hover:text-neutral-400"
              onClick={(e) => {
                e.stopPropagation();
                onToggleReplies();
              }}
            >
              <MessageSquare className="w-3 h-3" />
              <span>{replyCount}</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Replies */}
      {isExpanded && annotation.replies && annotation.replies.length > 0 && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-neutral-700/50">
          {annotation.replies.map((reply) => (
            <div key={reply.id} className="text-xs text-neutral-400 pl-2 border-l border-neutral-700">
              <p className="text-neutral-300">{reply.content}</p>
              <span>{formatDate(reply.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnnotationPanel;
