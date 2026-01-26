import { supabase, isSupabaseConfigured } from '../client';

export type SupportedFileType = 'ply' | 'spz' | 'splat' | 'ksplat' | 'pcsogs';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string | null;
  path: string | null;
  error: Error | null;
}

/**
 * Maximum file sizes by type (in bytes)
 * Note: Supabase free tier has 50MB limit. Upgrade to Pro for 5GB limit.
 */
export const MAX_FILE_SIZES: Record<SupportedFileType, number> = {
  ply: 50 * 1024 * 1024, // 50MB (Supabase free tier limit)
  spz: 50 * 1024 * 1024, // 50MB
  splat: 50 * 1024 * 1024, // 50MB
  ksplat: 50 * 1024 * 1024, // 50MB
  pcsogs: 50 * 1024 * 1024, // 50MB
};

/**
 * Validate file type and size
 */
export function validateScanFile(file: File): { valid: boolean; error?: string } {
  // Extract extension
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !['ply', 'spz', 'splat', 'ksplat', 'pcsogs'].includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type: ${extension || 'unknown'}. Supported formats: PLY, SPZ, SPLAT, KSPLAT, PCSOGS`,
    };
  }

  const fileType = extension as SupportedFileType;
  const maxSize = MAX_FILE_SIZES[fileType];

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    return {
      valid: false,
      error: `File too large: ${fileSizeMB}MB. Maximum size for ${extension.toUpperCase()} files is ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): SupportedFileType | null {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension && ['ply', 'spz', 'splat', 'ksplat', 'pcsogs'].includes(extension)) {
    return extension as SupportedFileType;
  }
  return null;
}

/**
 * Generate a unique file path for upload
 */
function generateFilePath(projectId: string, filename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${projectId}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;
}

/**
 * Upload a scan file to Supabase Storage
 */
export async function uploadScanFile(
  file: File,
  projectId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { url: null, path: null, error: new Error('Supabase not configured') };
  }

  // Validate file
  const validation = validateScanFile(file);
  if (!validation.valid) {
    return { url: null, path: null, error: new Error(validation.error) };
  }

  const filePath = generateFilePath(projectId, file.name);

  // Get current session token for authenticated uploads
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Upload using XMLHttpRequest for progress tracking
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    // Get the storage URL
    const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/scans/${filePath}`;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Get public URL
        const { data } = supabase.storage.from('scans').getPublicUrl(filePath);
        resolve({
          url: data.publicUrl,
          path: filePath,
          error: null,
        });
      } else {
        resolve({
          url: null,
          path: null,
          error: new Error(`Upload failed with status ${xhr.status}`),
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        url: null,
        path: null,
        error: new Error('Upload failed due to network error'),
      });
    });

    xhr.open('POST', storageUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.send(file);
  });
}

/**
 * Upload a scan file using the standard Supabase SDK (simpler, no progress)
 */
export async function uploadScanFileSimple(
  file: File,
  projectId: string
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { url: null, path: null, error: new Error('Supabase not configured') };
  }

  // Validate file
  const validation = validateScanFile(file);
  if (!validation.valid) {
    return { url: null, path: null, error: new Error(validation.error) };
  }

  const filePath = generateFilePath(projectId, file.name);

  const { error } = await supabase.storage
    .from('scans')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    return { url: null, path: null, error: new Error(error.message) };
  }

  // Get public URL
  const { data } = supabase.storage.from('scans').getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    path: filePath,
    error: null,
  };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(filePath: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase.storage
    .from('scans')
    .remove([filePath]);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Get a signed URL for private file access
 */
export async function getSignedUrl(
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
 * Upload a thumbnail image
 */
export async function uploadThumbnail(
  imageBlob: Blob,
  scanId: string
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: new Error('Supabase not configured') };
  }

  const filePath = `thumbnails/${scanId}.jpg`;

  const { error } = await supabase.storage
    .from('scans')
    .upload(filePath, imageBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    return { url: null, error: new Error(error.message) };
  }

  const { data } = supabase.storage.from('scans').getPublicUrl(filePath);

  return { url: data.publicUrl, error: null };
}
