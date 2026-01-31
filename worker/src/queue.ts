/**
 * BullMQ queue configuration for compression jobs.
 * Uses Upstash Redis as the backing store.
 */
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  throw new Error('Missing UPSTASH_REDIS_URL environment variable');
}

// Create Redis connection for BullMQ
// Upstash requires TLS and specific configuration
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  tls: {
    rejectUnauthorized: false, // Upstash uses self-signed certs
  },
});

// Queue name constant
export const COMPRESSION_QUEUE_NAME = 'scan-compression';

// Job data interface
export interface CompressionJobData {
  scanId: string;
  projectId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

// Job result interface
export interface CompressionJobResult {
  success: boolean;
  compressedFileUrl?: string;
  compressedFileSize?: number;
  compressionRatio?: number;
  errorMessage?: string;
}

// Create the compression queue
export const compressionQueue = new Queue<CompressionJobData, CompressionJobResult>(
  COMPRESSION_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // Start with 1 minute, then 5 min, then 15 min
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  }
);

// Queue events for monitoring
export const queueEvents = new QueueEvents(COMPRESSION_QUEUE_NAME, {
  connection: redisConnection,
});

/**
 * Add a compression job to the queue
 */
export async function enqueueCompressionJob(
  data: CompressionJobData
): Promise<string> {
  const job = await compressionQueue.add('compress', data, {
    jobId: `compress-${data.scanId}`, // Use scanId as job ID to prevent duplicates
  });

  console.log(`Enqueued compression job for scan ${data.scanId}, job ID: ${job.id}`);
  return job.id!;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    compressionQueue.getWaitingCount(),
    compressionQueue.getActiveCount(),
    compressionQueue.getCompletedCount(),
    compressionQueue.getFailedCount(),
    compressionQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Graceful shutdown
 */
export async function closeQueue(): Promise<void> {
  await compressionQueue.close();
  await queueEvents.close();
  await redisConnection.quit();
}
