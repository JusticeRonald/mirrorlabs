/**
 * Mirror Labs Compression Worker
 *
 * BullMQ worker that processes PLY → SOG compression jobs.
 * Connects to Upstash Redis for job queue and Supabase for storage.
 */
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Worker, Job } from 'bullmq';
import {
  redisConnection,
  COMPRESSION_QUEUE_NAME,
  closeQueue,
  getQueueStats,
  type CompressionJobData,
  type CompressionJobResult,
} from './queue.js';
import {
  getScan,
  downloadFile,
  uploadCompressedFile,
  deleteFile,
  updateCompressionProgress,
  markScanReady,
  markScanError,
} from './supabase.js';
import { compressPlyToSog, verifySplatTransform, shouldCompress } from './compress.js';

// Configuration
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS || '600000', 10); // 10 minutes

/**
 * Process a compression job
 */
async function processCompressionJob(
  job: Job<CompressionJobData, CompressionJobResult>
): Promise<CompressionJobResult> {
  const { scanId, projectId, fileUrl, fileName, fileSize } = job.data;

  console.log(`Processing compression job for scan ${scanId}`);
  console.log(`  File: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

  try {
    // Verify scan exists and is in processing state
    const scan = await getScan(scanId);
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`);
    }

    if (scan.status !== 'processing') {
      console.log(`Scan ${scanId} is not in processing state (current: ${scan.status}), skipping`);
      return { success: true }; // Don't fail, just skip
    }

    // Update progress: downloading
    await updateCompressionProgress(scanId, 5);
    await job.updateProgress(5);

    // Download the original PLY file
    console.log(`Downloading file from ${fileUrl}`);
    const inputBuffer = await downloadFile(fileUrl);

    await updateCompressionProgress(scanId, 20);
    await job.updateProgress(20);

    // Compress PLY to SOG
    console.log('Starting compression...');
    const compressionResult = await compressPlyToSog(inputBuffer, (progress) => {
      // Map compression progress (10-100) to job progress (20-80)
      const jobProgress = 20 + Math.round((progress.progress / 100) * 60);
      updateCompressionProgress(scanId, jobProgress).catch(console.error);
      job.updateProgress(jobProgress).catch(console.error);
    });

    await updateCompressionProgress(scanId, 85);
    await job.updateProgress(85);

    // Upload compressed file
    console.log('Uploading compressed file...');
    const { url: compressedUrl } = await uploadCompressedFile(
      compressionResult.buffer,
      projectId,
      fileName
    );

    await updateCompressionProgress(scanId, 95);
    await job.updateProgress(95);

    // Delete original PLY file to save storage
    console.log('Deleting original PLY file...');
    const deleted = await deleteFile(fileUrl);
    if (!deleted) {
      console.warn(`Failed to delete original file: ${fileUrl}`);
      // Don't fail the job for cleanup issues
    }

    // Mark scan as ready
    await markScanReady(
      scanId,
      compressedUrl,
      compressionResult.compressedSize,
      compressionResult.originalSize
    );

    await job.updateProgress(100);

    console.log(`Compression complete for scan ${scanId}`);
    console.log(`  Compression ratio: ${compressionResult.compressionRatio.toFixed(1)}x`);

    return {
      success: true,
      compressedFileUrl: compressedUrl,
      compressedFileSize: compressionResult.compressedSize,
      compressionRatio: compressionResult.compressionRatio,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Compression failed for scan ${scanId}:`, errorMessage);

    // Mark scan as error
    await markScanError(scanId, errorMessage);

    return {
      success: false,
      errorMessage,
    };
  }
}

/**
 * Create and start the worker
 */
async function startWorker(): Promise<void> {
  console.log('Mirror Labs Compression Worker starting...');
  console.log(`  Concurrency: ${WORKER_CONCURRENCY}`);
  console.log(`  Job timeout: ${JOB_TIMEOUT_MS}ms`);

  // Verify splat-transform is available
  const splatTransformAvailable = await verifySplatTransform();
  if (!splatTransformAvailable) {
    console.error('splat-transform CLI is not available. Install with: npm install @playcanvas/splat-transform');
    process.exit(1);
  }
  console.log('  splat-transform: available');

  // Create the worker
  const worker = new Worker<CompressionJobData, CompressionJobResult>(
    COMPRESSION_QUEUE_NAME,
    processCompressionJob,
    {
      connection: redisConnection,
      concurrency: WORKER_CONCURRENCY,
      lockDuration: JOB_TIMEOUT_MS,
      stalledInterval: 30000, // Check for stalled jobs every 30s
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    if (result.success) {
      console.log(`Job ${job.id} completed: ${result.compressionRatio?.toFixed(1)}x compression`);
    } else {
      console.log(`Job ${job.id} completed with error: ${result.errorMessage}`);
    }
  });

  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} has stalled`);
  });

  // Log queue stats periodically
  const statsInterval = setInterval(async () => {
    try {
      const stats = await getQueueStats();
      console.log(`Queue stats: waiting=${stats.waiting}, active=${stats.active}, completed=${stats.completed}, failed=${stats.failed}`);
    } catch (error) {
      console.error('Failed to get queue stats:', error);
    }
  }, 60000); // Every minute

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    clearInterval(statsInterval);

    await worker.close();
    await closeQueue();

    console.log('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start HTTP health check server for Railway
  const healthPort = parseInt(process.env.PORT || '3000', 10);
  const healthServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  healthServer.listen(healthPort, () => {
    console.log(`Health check server listening on port ${healthPort}`);
  });

  console.log('Worker is running and waiting for jobs...');
}

// Start the worker
startWorker().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
