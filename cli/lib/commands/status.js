const config = require('../utils/config');
const apiClient = require('../api-client');
const { error, formatJobDetails, info } = require('../utils/formatters');

async function statusCommand(jobId, options) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    if (!jobId) {
      error('Job ID is required');
      info('Usage: litrev status <job-id>');
      process.exit(1);
    }

    info(`Fetching job ${jobId}...`);
    const job = await apiClient.getSearchJob(jobId);

    console.log(formatJobDetails(job));

  } catch (err) {
    error(`Failed to get job status: ${err.message}`);
    process.exit(1);
  }
}

async function resumeCommand(jobId) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    if (!jobId) {
      error('Job ID is required');
      info('Usage: litrev resume <job-id>');
      process.exit(1);
    }

    info(`Resuming job ${jobId}...`);
    const job = await apiClient.resumeSearchJob(jobId);

    success(`Job ${jobId} resumed successfully`);
    info(`Use "litrev watch ${jobId}" to monitor progress`);

  } catch (err) {
    error(`Failed to resume job: ${err.message}`);
    process.exit(1);
  }
}

async function deleteCommand(jobId, options) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    if (!jobId) {
      error('Job ID is required');
      info('Usage: litrev delete <job-id>');
      process.exit(1);
    }

    if (!options.force) {
      const inquirer = require('inquirer');
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete job ${jobId}?`,
          default: false
        }
      ]);

      if (!confirm) {
        info('Deletion cancelled');
        return;
      }
    }

    info(`Deleting job ${jobId}...`);
    await apiClient.deleteSearchJob(jobId);

    success(`Job ${jobId} deleted successfully`);

  } catch (err) {
    error(`Failed to delete job: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  statusCommand,
  resumeCommand,
  deleteCommand
};

const { success } = require('../utils/formatters');
