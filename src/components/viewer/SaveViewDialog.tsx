import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SaveViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  /** Suggested default name (e.g., "View 1") */
  defaultName?: string;
}

/**
 * SaveViewDialog - Modal for naming a new saved view
 *
 * Features:
 * - Text input with auto-focus
 * - Auto-generated default name: "View 1", "View 2", etc.
 * - Cancel and Save buttons
 * - Enter to submit, Escape to cancel
 */
export function SaveViewDialog({
  isOpen,
  onClose,
  onSave,
  defaultName = 'View 1',
}: SaveViewDialogProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name and focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      // Focus input after a short delay to allow dialog animation
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, defaultName]);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(trimmedName);
      onClose();
    }
  }, [name, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      // Escape is handled by Dialog component automatically
    },
    [handleSubmit]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-neutral-100">Save View</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Give your saved view a name to easily identify it later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="view-name" className="text-neutral-300">
              View Name
            </Label>
            <Input
              ref={inputRef}
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter view name..."
              className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="bg-amber-500 text-neutral-900 hover:bg-amber-600"
          >
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SaveViewDialog;
