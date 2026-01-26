import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { MessageSquarePlus, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AnnotationType, AnnotationStatus } from '@/lib/viewer/AnnotationRenderer';

/**
 * Priority levels for annotations
 */
type AnnotationPriority = 'normal' | 'question' | 'urgent';

const PRIORITY_CONFIG: Record<AnnotationPriority, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'bg-neutral-500' },
  question: { label: 'Question', color: 'bg-blue-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500' },
};

interface AnnotationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Submit handler */
  onSubmit: (data: AnnotationCreateData) => void;
  /** The 3D position where annotation will be placed */
  position: THREE.Vector3 | null;
  /** The scan ID */
  scanId: string;
  /** The current user ID */
  userId: string;
  /** Type of annotation (pin or comment) */
  type?: AnnotationType;
  /** Optional list of users for @mentions */
  users?: Array<{ id: string; name: string }>;
}

/**
 * Data structure for creating a new annotation
 */
export interface AnnotationCreateData {
  scanId: string;
  type: AnnotationType;
  position: { x: number; y: number; z: number };
  content: string;
  status: AnnotationStatus;
  createdBy: string;
  mentions?: string[];
  cameraSnapshot?: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    fov: number;
  };
}

/**
 * AnnotationModal - Modal for creating new annotations
 *
 * Features:
 * - Text content input with auto-focus
 * - @mention dropdown support
 * - Priority/status selector
 * - Position preview
 * - Keyboard shortcuts (Cmd/Ctrl+Enter to submit)
 */
export function AnnotationModal({
  isOpen,
  onClose,
  onSubmit,
  position,
  scanId,
  userId,
  type = 'comment',
  users = [],
}: AnnotationModalProps) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnotationPriority>('normal');
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setPriority('normal');
      setMentions([]);
      // Focus textarea after modal opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle @mention detection
  const handleContentChange = (value: string) => {
    setContent(value);

    // Check for @mention trigger
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      // Show dropdown if @ is at the end or followed by text (not a space)
      if (!afterAt.includes(' ')) {
        setMentionSearch(afterAt.toLowerCase());
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  // Filter users for mention dropdown
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(mentionSearch) &&
      !mentions.includes(user.id)
  );

  // Insert mention into content
  const insertMention = (user: { id: string; name: string }) => {
    const lastAtIndex = content.lastIndexOf('@');
    const newContent = content.slice(0, lastAtIndex) + `@${user.name} `;
    setContent(newContent);
    setMentions([...mentions, user.id]);
    setShowMentionDropdown(false);
    textareaRef.current?.focus();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to close
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Map priority to status
  const priorityToStatus = (p: AnnotationPriority): AnnotationStatus => {
    switch (p) {
      case 'urgent':
        return 'open'; // Could be a special flag in metadata
      case 'question':
        return 'open';
      default:
        return 'open';
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || !position) return;

    onSubmit({
      scanId,
      type,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      content: content.trim(),
      status: priorityToStatus(priority),
      createdBy: userId,
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    onClose();
  };

  // Format position for display
  const formatPosition = (pos: THREE.Vector3) => {
    return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[425px]"
        onKeyDown={(e) => {
          // Prevent keyboard shortcuts from firing while typing in modal
          // Escape is allowed (handled by Dialog for closing)
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-amber-500" />
            Add Annotation
          </DialogTitle>
          <DialogDescription>
            {position
              ? `Position: ${formatPosition(position)}`
              : 'Click on the 3D model to place the annotation'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Priority Selector */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as AnnotationPriority)}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn('w-2 h-2 rounded-full', config.color)}
                      />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                id="content"
                placeholder="Describe this point or add a note... (use @ to mention)"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[120px] resize-none"
              />

              {/* Mention Dropdown */}
              {showMentionDropdown && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-50 max-h-[150px] overflow-y-auto">
                  {filteredUsers.slice(0, 5).map((user) => (
                    <button
                      key={user.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-700 first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => insertMention(user)}
                    >
                      {user.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-xs">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
              </kbd> to submit
            </p>
          </div>

          {/* Mentioned Users */}
          {mentions.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Mentions</Label>
              <div className="flex flex-wrap gap-1">
                {mentions.map((userId) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs"
                    >
                      @{user?.name || userId}
                      <button
                        className="hover:text-blue-300"
                        onClick={() =>
                          setMentions(mentions.filter((id) => id !== userId))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Position Warning */}
          {!position && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Click on the 3D scene first to set the annotation position.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim() || !position}>
            Add Annotation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnnotationModal;
