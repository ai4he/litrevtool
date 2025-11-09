import { Queue } from 'bullmq';
import { config } from '../core/config';
import logger from '../core/logger';

// Create Redis connection
export const connection = {
  host: new URL(config.REDIS_URL).hostname,
  port: parseInt(new URL(config.REDIS_URL).port || '6379'),
};

// Create job queue (only queue, no worker)
export const searchJobQueue = new Queue('search-jobs', { connection });

// Add a search job to the queue
export async function addSearchJobToQueue(jobId: string, isResume = false): Promise<string> {
  const job = await searchJobQueue.add(
    'run-search-job',
    { jobId, isResume },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  logger.info(`Added search job ${jobId} to queue with job ID ${job.id}`);
  return job.id!;
}
