import { Queue, Worker, Job } from 'bullmq';
import { config } from '../core/config';
import logger from '../core/logger';
import { runSearchJob, resumeSearchJob } from './scrapingTasks';

// Create Redis connection
const connection = {
  host: new URL(config.REDIS_URL).hostname,
  port: parseInt(new URL(config.REDIS_URL).port || '6379'),
};

// Create job queue
export const searchJobQueue = new Queue('search-jobs', { connection });

// Create worker to process jobs
export const searchJobWorker = new Worker(
  'search-jobs',
  async (job: Job) => {
    logger.info(`Processing job ${job.id}: ${job.name}`);

    if (job.name === 'run-search-job') {
      const { jobId, isResume } = job.data;
      if (isResume) {
        await resumeSearchJob(jobId);
      } else {
        await runSearchJob(jobId);
      }
    }

    return { success: true };
  },
  {
    connection,
    concurrency: 1, // Process one job at a time to avoid SQLite locking
  }
);

// Worker event handlers
searchJobWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

searchJobWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

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
