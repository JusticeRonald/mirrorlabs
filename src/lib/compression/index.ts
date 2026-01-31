/**
 * Client-side compression queue utilities.
 *
 * These functions interact with the compression pipeline by:
 * 1. Setting scan status to 'processing' in the database
 * 2. Calling the Supabase Edge Function to enqueue the compression job
 *
 * The actual compression is handled by the Railway worker service.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { startScanCompression } from '@/lib/supabase/services/scans';

export interface EnqueueCompressionResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

/**
 * File types that require compression (PLY files only)
 */
export function requiresCompression(fileType: string): boolean {
  return fileType.toLowerCase() === 'ply';
}

/**
 * Enqueue a compression job for a PLY file.
 *
 * @param scanId - The scan ID to compress
 * @param projectId - The project ID
 * @param fileUrl - URL of the uploaded PLY file
 * @param fileName - Original file name
 * @param fileSize - File size in bytes
 * @returns Result with job ID or error
 */
export async function enqueueCompressionJob(
  scanId: string,
  projectId: string,
  fileUrl: string,
  fileName: string,
  fileSize: number
): Promise<EnqueueCompressionResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // First, update the scan status to processing
    const { error: statusError } = await startScanCompression(scanId, fileSize);
    if (statusError) {
      return { success: false, error: statusError.message };
    }

    // Call the Edge Function to enqueue the compression job
    const { data, error } = await supabase.functions.invoke('enqueue-compression', {
      body: {
        scanId,
        projectId,
        fileUrl,
        fileName,
        fileSize,
      },
    });

    if (error) {
      // If enqueueing fails, we should mark the scan as error
      // But we don't want to throw here, just return the error
      return { success: false, error: error.message };
    }

    return {
      success: true,
      jobId: data?.jobId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Retry a failed compression job.
 *
 * @param scanId - The scan ID to retry
 */
export async function retryCompressionJob(scanId: string): Promise<EnqueueCompressionResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get the scan to retrieve the necessary info
    const { data: scan, error: fetchError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (fetchError || !scan) {
      return { success: false, error: fetchError?.message || 'Scan not found' };
    }

    // Only retry if the scan is in error state
    if (scan.status !== 'error') {
      return { success: false, error: 'Scan is not in error state' };
    }

    // Enqueue a new compression job
    return enqueueCompressionJob(
      scanId,
      scan.project_id,
      scan.file_url,
      scan.name,
      scan.file_size
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
