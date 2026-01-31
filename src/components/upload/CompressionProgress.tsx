import { Loader2, CheckCircle2, AlertCircle, FileArchive, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { ScanStatus } from '@/lib/supabase/database.types';
import type { ScanStatusInfo } from '@/hooks/useScanStatusSubscription';

interface CompressionProgressProps {
  /** Current scan status info */
  statusInfo: ScanStatusInfo | null;
  /** File name being compressed */
  fileName?: string;
  /** Called when retry is clicked (only shown on error) */
  onRetry?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Displays compression progress for a scan being processed.
 * Shows different states: processing, ready, error.
 */
export function CompressionProgress({
  statusInfo,
  fileName,
  onRetry,
  className,
}: CompressionProgressProps) {
  if (!statusInfo) {
    return null;
  }

  const { status, compressionProgress, errorMessage, compressionRatio } = statusInfo;

  // Only show for processing, ready (just completed), or error states
  if (status === 'uploading') {
    return null;
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            status === 'processing' && 'bg-blue-500/10',
            status === 'ready' && 'bg-green-500/10',
            status === 'error' && 'bg-destructive/10'
          )}
        >
          {status === 'processing' && (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          {status === 'ready' && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {status === 'error' && (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {status === 'processing' && 'Compressing scan...'}
              {status === 'ready' && 'Compression complete'}
              {status === 'error' && 'Compression failed'}
            </p>
            {fileName && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {fileName}
              </span>
            )}
          </div>

          {/* Processing state */}
          {status === 'processing' && compressionProgress !== null && (
            <div className="mt-2">
              <Progress value={compressionProgress} className="h-1.5" />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {getProgressLabel(compressionProgress)}
                </p>
                <p className="text-xs text-muted-foreground">{compressionProgress}%</p>
              </div>
            </div>
          )}

          {/* Ready state with compression stats */}
          {status === 'ready' && compressionRatio !== null && (
            <div className="flex items-center gap-2 mt-2">
              <FileArchive className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Compressed {compressionRatio.toFixed(1)}x smaller
              </p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="mt-2">
              <p className="text-xs text-destructive">
                {errorMessage || 'An unknown error occurred'}
              </p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-2 h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry compression
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get a user-friendly label for the current progress stage
 */
function getProgressLabel(progress: number): string {
  if (progress < 20) {
    return 'Downloading original file...';
  }
  if (progress < 85) {
    return 'Converting to optimized format...';
  }
  if (progress < 95) {
    return 'Uploading compressed file...';
  }
  return 'Finalizing...';
}

/**
 * Inline compression status indicator (smaller version for lists)
 */
export function CompressionStatusBadge({
  status,
  compressionProgress,
}: {
  status: ScanStatus;
  compressionProgress: number | null;
}) {
  if (status === 'ready') {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        status === 'processing' && 'bg-blue-500/10 text-blue-600',
        status === 'uploading' && 'bg-amber-500/10 text-amber-600',
        status === 'error' && 'bg-destructive/10 text-destructive'
      )}
    >
      {status === 'processing' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          {compressionProgress !== null ? `${compressionProgress}%` : 'Processing'}
        </>
      )}
      {status === 'uploading' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3" />
          Error
        </>
      )}
    </div>
  );
}

export default CompressionProgress;
