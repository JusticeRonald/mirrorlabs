import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SplatLoadProgress, SplatLoadError } from '@/types/viewer';

interface ViewerLoadingOverlayProps {
  isLoading: boolean;
  progress: SplatLoadProgress | null;
  error: SplatLoadError | null;
  onRetry?: () => void;
  className?: string;
}

const ViewerLoadingOverlay = ({
  isLoading,
  progress,
  error,
  onRetry,
  className,
}: ViewerLoadingOverlayProps) => {
  if (!isLoading && !error) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card border border-border shadow-lg max-w-sm w-full mx-4">
        {error ? (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-foreground">Failed to Load</h3>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              {error.url && (
                <p className="text-xs text-muted-foreground/70 truncate max-w-full">
                  {error.url}
                </p>
              )}
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-foreground">Loading Scene</h3>
              <p className="text-sm text-muted-foreground">
                {progress
                  ? `${Math.round(progress.percentage)}% complete`
                  : 'Preparing...'}
              </p>
            </div>
            {progress && (
              <div className="w-full">
                <Progress value={progress.percentage} className="h-2" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ViewerLoadingOverlay;
