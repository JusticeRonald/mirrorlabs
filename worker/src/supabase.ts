/**
 * Supabase client for the compression worker.
 * Uses the service role key for full database access.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface ScanRecord {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  compression_progress: number | null;
  original_file_size: number | null;
  compressed_file_size: number | null;
  compression_ratio: number | null;
}

/**
 * Get a scan record by ID
 */
export async function getScan(scanId: string): Promise<ScanRecord | null> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (error) {
    console.error('Error fetching scan:', error);
    return null;
  }

  return data as ScanRecord;
}

/**
 * Update scan status and optional fields
 */
export async function updateScan(
  scanId: string,
  updates: Partial<ScanRecord>
): Promise<boolean> {
  const { error } = await supabase
    .from('scans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', scanId);

  if (error) {
    console.error('Error updating scan:', error);
    return false;
  }

  return true;
}

/**
 * Update compression progress (0-100)
 */
export async function updateCompressionProgress(
  scanId: string,
  progress: number
): Promise<boolean> {
  return updateScan(scanId, { compression_progress: Math.round(progress) });
}

/**
 * Mark scan as ready with compressed file info
 */
export async function markScanReady(
  scanId: string,
  compressedFileUrl: string,
  compressedFileSize: number,
  originalFileSize: number
): Promise<boolean> {
  const compressionRatio = originalFileSize / compressedFileSize;

  return updateScan(scanId, {
    status: 'ready',
    file_url: compressedFileUrl,
    file_type: 'pcsogs', // SOG format
    compressed_file_size: compressedFileSize,
    original_file_size: originalFileSize,
    compression_ratio: compressionRatio,
    compression_progress: 100,
    error_message: null,
  });
}

/**
 * Mark scan as failed with error message
 */
export async function markScanError(
  scanId: string,
  errorMessage: string
): Promise<boolean> {
  return updateScan(scanId, {
    status: 'error',
    error_message: errorMessage,
    compression_progress: null,
  });
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(fileUrl: string): Promise<Buffer> {
  // Extract the storage path from the public URL
  const url = new URL(fileUrl);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/scans\/(.+)/);

  if (!pathMatch) {
    throw new Error(`Invalid storage URL format: ${fileUrl}`);
  }

  const filePath = decodeURIComponent(pathMatch[1]);

  const { data, error } = await supabase.storage
    .from('scans')
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload a compressed file to Supabase Storage
 */
export async function uploadCompressedFile(
  buffer: Buffer,
  projectId: string,
  originalFilename: string
): Promise<{ url: string; path: string }> {
  // Generate new filename with .pcsogs extension
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const newFilename = `${timestamp}-${randomSuffix}-${baseName}.pcsogs`;
  const filePath = `${projectId}/${newFilename}`;

  const { error } = await supabase.storage
    .from('scans')
    .upload(filePath, buffer, {
      contentType: 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload compressed file: ${error.message}`);
  }

  // Get public URL
  const { data } = supabase.storage.from('scans').getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    path: filePath,
  };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/scans\/(.+)/);

    if (!pathMatch) {
      console.warn(`Could not extract path from URL: ${fileUrl}`);
      return false;
    }

    const filePath = decodeURIComponent(pathMatch[1]);

    const { error } = await supabase.storage
      .from('scans')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete file:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting file:', err);
    return false;
  }
}
