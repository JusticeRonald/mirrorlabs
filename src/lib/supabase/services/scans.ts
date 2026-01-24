import { supabase, isSupabaseConfigured } from '../client';
import type {
  Scan,
  ScanWithAnnotations,
  InsertTables,
  UpdateTables,
  ScanStatus,
} from '../database.types';

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
