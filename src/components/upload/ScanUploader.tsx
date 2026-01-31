import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileUp, CheckCircle2, AlertCircle, Loader2, FileArchive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  uploadScanFile,
  validateScanFile,
  getFileType,
  type UploadProgress,
  type SupportedFileType,
} from '@/lib/supabase/services/storage';
import { createScan } from '@/lib/supabase/services/scans';
import { useAuth } from '@/contexts/AuthContext';
import { enqueueCompressionJob, requiresCompression } from '@/lib/compression';

interface ScanUploaderProps {
  projectId: string;
  onUploadComplete?: (scanId: string, fileUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'compressing' | 'complete' | 'error';

interface FileUploadState {
  file: File;
  state: UploadState;
  progress: number;
  error?: string;
  scanId?: string;
  needsCompression?: boolean;
}

const FILE_TYPE_LABELS: Record<SupportedFileType, string> = {
  ply: 'PLY (Point Cloud)',
  spz: 'SPZ (Compressed Splat)',
  splat: 'SPLAT (Gaussian Splat)',
  ksplat: 'KSPLAT (K-Splat)',
  pcsogs: 'SOG (Compressed)',
  sog: 'SOG (Compressed)',
};

export function ScanUploader({
  projectId,
  onUploadComplete,
  onError,
  className,
}: ScanUploaderProps) {
  const { user, isDemoMode } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUpload = useCallback((index: number, updates: Partial<FileUploadState>) => {
    setUploads(prev => prev.map((upload, i) =>
      i === index ? { ...upload, ...updates } : upload
    ));
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate all files first
    const validFiles = fileArray.filter(file => {
      const validation = validateScanFile(file);
      if (!validation.valid) {
        onError?.(validation.error!);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to upload queue
    const newUploads: FileUploadState[] = validFiles.map(file => ({
      file,
      state: 'idle' as UploadState,
      progress: 0,
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploads
    for (let i = 0; i < newUploads.length; i++) {
      const uploadIndex = uploads.length + i;
      const file = newUploads[i].file;

      try {
        // Update state to uploading
        updateUpload(uploadIndex, { state: 'uploading' });

        // Handle demo mode
        if (isDemoMode) {
          // Simulate upload progress
          for (let p = 0; p <= 100; p += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            updateUpload(uploadIndex, { progress: p });
          }
          updateUpload(uploadIndex, {
            state: 'complete',
            progress: 100,
            scanId: `demo-scan-${Date.now()}`,
          });
          onUploadComplete?.(`demo-scan-${Date.now()}`, `/splats/${file.name}`);
          continue;
        }

        // Real upload
        const progressHandler = (progress: UploadProgress) => {
          updateUpload(uploadIndex, { progress: progress.percentage });
        };

        const result = await uploadScanFile(file, projectId, progressHandler);

        if (result.error) {
          throw result.error;
        }

        // Create scan record
        updateUpload(uploadIndex, { state: 'processing' });

        const fileType = getFileType(file.name) || 'ply';
        const needsCompressionNow = requiresCompression(fileType);

        // For PLY files, set status to 'processing' so the worker can compress them
        // For other formats (already compressed), set status to 'ready'
        const initialStatus = needsCompressionNow ? 'processing' : 'ready';

        const scanResult = await createScan({
          project_id: projectId,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          file_url: result.url!,
          file_type: fileType,
          file_size: file.size,
          status: initialStatus,
          original_file_size: needsCompressionNow ? file.size : undefined,
          compression_progress: needsCompressionNow ? 0 : undefined,
          created_by: user!.id,
        });

        if (scanResult.error) {
          throw scanResult.error;
        }

        // If the file needs compression, enqueue a compression job
        if (needsCompressionNow) {
          updateUpload(uploadIndex, {
            state: 'compressing',
            progress: 100,
            scanId: scanResult.data!.id,
            needsCompression: true,
          });

          const enqueueResult = await enqueueCompressionJob(
            scanResult.data!.id,
            projectId,
            result.url!,
            file.name,
            file.size
          );

          if (!enqueueResult.success) {
            console.warn('Failed to enqueue compression job:', enqueueResult.error);
            // Don't fail the upload - the scan is created, compression can be retried
          }

          // For PLY files, we consider the upload complete even though compression is pending
          // The ViewerPage will show compression progress via real-time subscription
          onUploadComplete?.(scanResult.data!.id, result.url!);
        } else {
          // For pre-compressed formats, mark as complete immediately
          updateUpload(uploadIndex, {
            state: 'complete',
            progress: 100,
            scanId: scanResult.data!.id,
            needsCompression: false,
          });

          onUploadComplete?.(scanResult.data!.id, result.url!);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateUpload(uploadIndex, {
          state: 'error',
          error: errorMessage,
        });
        onError?.(errorMessage);
      }
    }
  }, [uploads.length, projectId, user, isDemoMode, updateUpload, onUploadComplete, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFiles]);

  const removeUpload = useCallback((index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ply,.spz,.splat,.ksplat,.pcsogs,.sog"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-7 w-7 text-primary" />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging ? 'Drop files here' : 'Drag & drop scan files'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(FILE_TYPE_LABELS).map(([ext, label]) => (
            <span
              key={ext}
              className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              .{ext}
            </span>
          ))}
        </div>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={`${upload.file.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <FileUp className="h-5 w-5 text-secondary-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatFileSize(upload.file.size)}
                  </span>
                </div>

                {upload.state === 'uploading' && (
                  <div className="mt-2">
                    <Progress value={upload.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {upload.progress}%
                    </p>
                  </div>
                )}

                {upload.state === 'processing' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Processing...</p>
                  </div>
                )}

                {upload.state === 'compressing' && (
                  <div className="flex items-center gap-2 mt-2">
                    <FileArchive className="h-3 w-3 text-blue-500" />
                    <p className="text-xs text-blue-600">
                      Queued for compression (runs in background)
                    </p>
                  </div>
                )}

                {upload.state === 'complete' && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <p className="text-xs text-green-600">
                      {upload.needsCompression === false ? 'Upload complete' : 'Ready to view'}
                    </p>
                  </div>
                )}

                {upload.state === 'error' && (
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <p className="text-xs text-destructive">{upload.error}</p>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => removeUpload(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
