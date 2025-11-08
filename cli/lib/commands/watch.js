const config = require('../utils/config');
const apiClient = require('../api-client');
const { error, formatProgress, formatStatus, info } = require('../utils/formatters');
const chalk = require('chalk');

async function watchCommand(jobId, options) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    if (!jobId) {
      error('Job ID is required');
      info('Usage: litrev watch <job-id>');
      process.exit(1);
    }

    const interval = (options.interval || 5) * 1000; // Convert to milliseconds
    let lastStatus = null;
    let lastPapersCollected = 0;

    console.log('');
    info(`Watching job ${jobId}... (Press Ctrl+C to exit)`);
    console.log('');

    const updateStatus = async () => {
      try {
        const job = await apiClient.getSearchJob(jobId);

        // Clear previous line if status changed
        if (lastStatus !== null) {
          process.stdout.write('\r\x1b[K'); // Clear line
        }

        const statusStr = formatStatus(job.status);
        const papersStr = chalk.bold(job.papers_collected || 0);
        const messageStr = job.status_message || 'Processing...';

        // Show progress
        console.log(`Status: ${statusStr} | Papers: ${papersStr} | ${messageStr}`);

        // Show PRISMA metrics if available
        if (job.prisma_metrics && job.prisma_metrics.screening) {
          const metrics = job.prisma_metrics;
          console.log(chalk.gray(
            `  Identified: ${metrics.identification?.records_identified || 0} | ` +
            `Screened: ${metrics.screening?.records_screened || 0} | ` +
            `Included: ${metrics.included?.papers_included || 0}`
          ));
        }

        // Check if job is finished
        if (job.status === 'completed') {
          console.log('');
          console.log(chalk.green.bold('✓ Job completed successfully!'));
          console.log('');
          console.log(`Total papers collected: ${chalk.bold(job.papers_collected || 0)}`);

          if (job.completed_at) {
            const duration = new Date(job.completed_at) - new Date(job.started_at);
            const minutes = Math.floor(duration / 60000);
            console.log(`Duration: ${chalk.bold(minutes)} minutes`);
          }

          console.log('');
          info(`Download results with: litrev download ${jobId}`);
          process.exit(0);
        } else if (job.status === 'failed') {
          console.log('');
          error('Job failed!');
          if (job.status_message) {
            console.log(`Reason: ${job.status_message}`);
          }
          console.log('');
          info(`Try resuming with: litrev resume ${jobId}`);
          process.exit(1);
        }

        lastStatus = job.status;
        lastPapersCollected = job.papers_collected || 0;

      } catch (err) {
        error(`Failed to fetch job status: ${err.message}`);
        process.exit(1);
      }
    };

    // Initial update
    await updateStatus();

    // Set up interval
    const watchInterval = setInterval(updateStatus, interval);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(watchInterval);
      console.log('');
      info('Stopped watching. Job continues running in background.');
      info(`Check status with: litrev status ${jobId}`);
      process.exit(0);
    });

  } catch (err) {
    error(`Watch failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  watchCommand
};
