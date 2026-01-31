/**
 * Compression logic using @playcanvas/splat-transform.
 * Converts PLY files to SOG format for 15-20x compression.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface CompressionProgress {
  stage: 'downloading' | 'compressing' | 'uploading';
  progress: number; // 0-100
}

/**
 * Compress a PLY file to SOG format using splat-transform CLI.
 *
 * @param inputBuffer - The PLY file buffer
 * @param onProgress - Progress callback (optional)
 * @returns Compression result with SOG buffer and stats
 */
export async function compressPlyToSog(
  inputBuffer: Buffer,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  // Create a temporary directory for the operation
  const tempDir = await mkdtemp(join(tmpdir(), 'splat-compress-'));
  const inputPath = join(tempDir, 'input.ply');
  const outputPath = join(tempDir, 'output.pcsogs');

  try {
    // Write input buffer to temp file
    await writeFile(inputPath, inputBuffer);
    onProgress?.({ stage: 'compressing', progress: 10 });

    // Run splat-transform CLI
    // The CLI is installed as a dependency and available via npx
    const { stderr } = await execFileAsync('npx', [
      '@playcanvas/splat-transform',
      inputPath,
      outputPath,
    ], {
      timeout: 600000, // 10 minute timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large files
    });

    if (stderr && !stderr.includes('Converting')) {
      console.warn('splat-transform stderr:', stderr);
    }

    onProgress?.({ stage: 'compressing', progress: 90 });

    // Read the compressed output
    const outputBuffer = await readFile(outputPath);

    const originalSize = inputBuffer.length;
    const compressedSize = outputBuffer.length;
    const compressionRatio = originalSize / compressedSize;

    console.log(`Compression complete: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}x)`);

    onProgress?.({ stage: 'compressing', progress: 100 });

    return {
      buffer: outputBuffer,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } finally {
    // Clean up temp directory and all files
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors - OS will clean up temp files periodically
    }
  }
}

/**
 * Check if splat-transform is available
 */
export async function verifySplatTransform(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('npx', [
      '@playcanvas/splat-transform',
      '--help',
    ], {
      timeout: 30000,
    });

    return stdout.includes('splat-transform') || stdout.includes('Usage');
  } catch (error) {
    console.error('splat-transform verification failed:', error);
    return false;
  }
}

/**
 * Determine if a file should be compressed based on its type.
 * Only PLY files need compression; other formats are already optimized.
 */
export function shouldCompress(fileType: string): boolean {
  const normalizedType = fileType.toLowerCase();
  return normalizedType === 'ply';
}
