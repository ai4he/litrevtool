/**
 * Standalone worker process for BullMQ
 * This runs as a separate PM2 process to handle background jobs
 */
import logger from '../core/logger';
import { searchJobWorker } from './queue';

logger.info('Starting BullMQ worker...');

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
