import { supabase, isSupabaseConfigured } from '../client';
import type {
  Scan,
  ScanWithAnnotations,
  InsertTables,
  UpdateTables,
  ScanStatus,
} from '../database.types';
import type { SplatOrientation, SplatTransform } from '@/types/viewer';
import { isLegacyOrientation, isSplatTransform, orientationToTransform } from '@/types/viewer';

/**
 * Get all scans for a project
 */
export async function getProjectScans(projectId: string): Promise<Scan[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scans:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single scan by ID with all relations
 */
export async function getScanById(scanId: string): Promise<ScanWithAnnotations | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('scans')
    .select(`
      *,
      annotations(*),
      measurements(*),
      waypoints:camera_waypoints(*)
    `)
    .eq('id', scanId)
    .single();

  if (error) {
    console.error('Error fetching scan:', error);
    return null;
  }

  return data as ScanWithAnnotations;
}

/**
 * Create a new scan record (typically called after file upload)
 */
export async function createScan(
  scan: InsertTables<'scans'>
): Promise<{ data: Scan | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('scans')
    .insert(scan)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update a scan record
 */
export async function updateScan(
  scanId: string,
  updates: UpdateTables<'scans'>
): Promise<{ data: Scan | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('scans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', scanId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update scan status
 */
export async function updateScanStatus(
  scanId: string,
  status: ScanStatus,
  errorMessage?: string
): Promise<{ error: Error | null }> {
  const updates: UpdateTables<'scans'> = { status };
  if (errorMessage !== undefined) {
    updates.error_message = errorMessage;
  }

  const { error } = await updateScan(scanId, updates);
  return { error };
}

/**
 * Delete a scan (and its file from storage)
 */
export async function deleteScan(scanId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  // Get the scan first to find the file URL
  const { data: scan } = await supabase
    .from('scans')
    .select('file_url')
    .eq('id', scanId)
    .single();

  if (scan?.file_url) {
    // Extract the file path from the URL and delete from storage
    const urlParts = scan.file_url.split('/');
    const filePath = urlParts.slice(-2).join('/'); // bucket/filename
    await supabase.storage.from('scans').remove([filePath]);
  }

  // Delete the scan record
  const { error } = await supabase
    .from('scans')
    .delete()
    .eq('id', scanId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Get signed URL for scan file (for private storage)
 */
export async function getScanSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase.storage
    .from('scans')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    return { url: null, error: new Error(error.message) };
  }

  return { url: data?.signedUrl || null, error: null };
}

/**
 * Get the saved orientation for a scan
 * @param scanId The scan ID
 * @returns The saved orientation or null if not set
 */
export async function getScanOrientation(
  scanId: string
): Promise<SplatOrientation | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('scans')
    .select('orientation_json')
    .eq('id', scanId)
    .single();

  if (error) {
    console.error('Error fetching scan orientation:', error);
    return null;
  }

  // Validate the orientation data
  const orientation = data?.orientation_json as Record<string, unknown> | null;
  if (
    orientation &&
    typeof orientation.x === 'number' &&
    typeof orientation.y === 'number' &&
    typeof orientation.z === 'number'
  ) {
    return {
      x: orientation.x,
      y: orientation.y,
      z: orientation.z,
    };
  }

  return null;
}

/**
 * Save orientation for a scan
 * @param scanId The scan ID
 * @param orientation The orientation to save (Euler angles in radians)
 */
export async function saveScanOrientation(
  scanId: string,
  orientation: SplatOrientation
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('scans')
    .update({
      orientation_json: orientation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Clear the saved orientation for a scan (reverts to default)
 * @param scanId The scan ID
 */
export async function clearScanOrientation(
  scanId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('scans')
    .update({
      orientation_json: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Get the saved full transform for a scan (with backward compatibility for legacy orientation)
 * @param scanId The scan ID
 * @returns The saved transform or null if not set
 */
export async function getScanTransform(
  scanId: string
): Promise<SplatTransform | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('scans')
    .select('orientation_json')
    .eq('id', scanId)
    .single();

  if (error) {
    console.error('Error fetching scan transform:', error);
    return null;
  }

  const stored = data?.orientation_json;

  // Check if it's full transform data
  if (isSplatTransform(stored)) {
    return stored;
  }

  // Check if it's legacy orientation data and convert
  if (isLegacyOrientation(stored)) {
    return orientationToTransform(stored);
  }

  return null;
}

/**
 * Save full transform for a scan
 * @param scanId The scan ID
 * @param transform The transform to save (position, rotation, scale)
 */
export async function saveScanTransform(
  scanId: string,
  transform: SplatTransform
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('scans')
    .update({
      orientation_json: transform,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Clear the saved transform for a scan (reverts to default)
 * @param scanId The scan ID
 */
export async function clearScanTransform(
  scanId: string
): Promise<{ error: Error | null }> {
  return clearScanOrientation(scanId); // Same operation, just clear the field
}

/**
 * Update compression progress for a scan
 * @param scanId The scan ID
 * @param progress Progress percentage (0-100)
 */
export async function updateCompressionProgress(
  scanId: string,
  progress: number
): Promise<{ error: Error | null }> {
  const { error } = await updateScan(scanId, {
    compression_progress: Math.round(Math.max(0, Math.min(100, progress))),
  });
  return { error };
}

/**
 * Start compression for a scan (set status to processing)
 * @param scanId The scan ID
 * @param originalFileSize Original file size in bytes
 */
export async function startScanCompression(
  scanId: string,
  originalFileSize: number
): Promise<{ error: Error | null }> {
  const { error } = await updateScan(scanId, {
    status: 'processing',
    compression_progress: 0,
    original_file_size: originalFileSize,
    error_message: null,
  });
  return { error };
}

/**
 * Complete compression for a scan
 * @param scanId The scan ID
 * @param compressedFileUrl New URL to the compressed file
 * @param compressedFileSize Compressed file size in bytes
 * @param originalFileSize Original file size in bytes
 */
export async function completeScanCompression(
  scanId: string,
  compressedFileUrl: string,
  compressedFileSize: number,
  originalFileSize: number
): Promise<{ error: Error | null }> {
  const compressionRatio = originalFileSize / compressedFileSize;

  const { error } = await updateScan(scanId, {
    status: 'ready',
    file_url: compressedFileUrl,
    file_type: 'pcsogs',
    compressed_file_size: compressedFileSize,
    original_file_size: originalFileSize,
    compression_ratio: compressionRatio,
    compression_progress: 100,
    error_message: null,
  });
  return { error };
}

/**
 * Mark compression as failed
 * @param scanId The scan ID
 * @param errorMessage Error message describing the failure
 */
export async function failScanCompression(
  scanId: string,
  errorMessage: string
): Promise<{ error: Error | null }> {
  const { error } = await updateScan(scanId, {
    status: 'error',
    error_message: errorMessage,
    compression_progress: null,
  });
  return { error };
}

/**
 * Subscribe to real-time changes on a scan
 * @param scanId The scan ID
 * @param onUpdate Callback when scan is updated
 * @returns Unsubscribe function
 */
export function subscribeScanChanges(
  scanId: string,
  onUpdate: (scan: Scan) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel(`scan:${scanId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scans',
        filter: `id=eq.${scanId}`,
      },
      (payload) => {
        onUpdate(payload.new as Scan);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
