const config = require('../utils/config');
const apiClient = require('../api-client');
const { error, formatJobsTable, info } = require('../utils/formatters');

async function listCommand(options) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    const limit = options.limit || 100;
    const skip = options.skip || 0;

    info(`Fetching search jobs...`);
    const jobs = await apiClient.getSearchJobs(skip, limit);

    if (!jobs || jobs.length === 0) {
      console.log('');
      console.log('No search jobs found.');
      console.log('');
      info('Create a new job with: litrev create --interactive');
      return;
    }

    // Filter by status if specified
    let filteredJobs = jobs;
    if (options.status) {
      filteredJobs = jobs.filter(j => j.status === options.status);
    }

    console.log('');
    console.log(`Found ${filteredJobs.length} job(s):`);
    console.log('');
    console.log(formatJobsTable(filteredJobs));
    console.log('');

    info(`Use "litrev status <ID>" to view details`);

  } catch (err) {
    error(`Failed to list jobs: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  listCommand
};
