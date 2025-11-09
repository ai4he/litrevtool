/**
 * Standalone worker process for BullMQ
 * This runs as a separate PM2 process to handle background jobs
 */
import { Worker, Job } from 'bullmq';
import logger from '../core/logger';
import { connection } from './queue';
import { runSearchJob, resumeSearchJob } from './scrapingTasks';

logger.info('Starting BullMQ worker...');

// Create worker to process jobs (ONLY in worker process, not in backend)
const searchJobWorker = new Worker(
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

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing worker');
  await searchJobWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing worker');
  await searchJobWorker.close();
  process.exit(0);
});

// Keep the process running
logger.info('BullMQ worker is running and waiting for jobs');
