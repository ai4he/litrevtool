const inquirer = require('inquirer');
const config = require('../utils/config');
const apiClient = require('../api-client');
const { success, error, info } = require('../utils/formatters');

async function createCommand(options) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    let jobData = {};

    // Interactive mode if no search query provided
    if (!options.query && !options.interactive) {
      error('Search query is required. Use --query or --interactive');
      process.exit(1);
    }

    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Job name:',
          default: options.name || `Search ${new Date().toISOString().split('T')[0]}`
        },
        {
          type: 'input',
          name: 'search_query',
          message: 'Search query:',
          default: options.query,
          validate: input => input.trim().length > 0 || 'Search query is required'
        },
        {
          type: 'input',
          name: 'year_from',
          message: 'Year from (optional):',
          default: options.yearFrom,
          validate: input => !input || (!isNaN(input) && input >= 1900) || 'Must be a valid year'
        },
        {
          type: 'input',
          name: 'year_to',
          message: 'Year to (optional):',
          default: options.yearTo,
          validate: input => !input || (!isNaN(input) && input >= 1900) || 'Must be a valid year'
        },
        {
          type: 'input',
          name: 'include_keywords',
          message: 'Include keywords (comma-separated, optional):',
          default: options.include
        },
        {
          type: 'input',
          name: 'exclude_keywords',
          message: 'Exclude keywords (comma-separated, optional):',
          default: options.exclude
        },
        {
          type: 'confirm',
          name: 'use_semantic',
          message: 'Use semantic filtering (AI-based)?',
          default: false
        },
        {
          type: 'input',
          name: 'semantic_criteria',
          message: 'Semantic filtering criteria:',
          when: answers => answers.use_semantic,
          validate: input => input.trim().length > 0 || 'Criteria is required for semantic filtering'
        },
        {
          type: 'confirm',
          name: 'semantic_batch_mode',
          message: 'Use batch mode for semantic filtering (faster)?',
          when: answers => answers.use_semantic,
          default: true
        }
      ]);

      jobData = {
        name: answers.name,
        search_query: answers.search_query,
        year_from: answers.year_from ? parseInt(answers.year_from) : null,
        year_to: answers.year_to ? parseInt(answers.year_to) : null,
        include_keywords: answers.include_keywords || null,
        exclude_keywords: answers.exclude_keywords || null,
        semantic_criteria: answers.semantic_criteria || null,
        semantic_batch_mode: answers.semantic_batch_mode || false
      };
    } else {
      // Use command-line options
      jobData = {
        name: options.name || `Search ${new Date().toISOString().split('T')[0]}`,
        search_query: options.query,
        year_from: options.yearFrom ? parseInt(options.yearFrom) : null,
        year_to: options.yearTo ? parseInt(options.yearTo) : null,
        include_keywords: options.include || null,
        exclude_keywords: options.exclude || null,
        semantic_criteria: options.semanticCriteria || null,
        semantic_batch_mode: options.semanticBatch || false
      };
    }

    // Remove null values
    Object.keys(jobData).forEach(key => {
      if (jobData[key] === null || jobData[key] === '') {
        delete jobData[key];
      }
    });

    info('Creating search job...');
    const job = await apiClient.createSearchJob(jobData);

    success(`Job created successfully!`);
    console.log('');
    console.log(`Job ID: ${job.id}`);
    console.log(`Name: ${job.name}`);
    console.log(`Status: ${job.status}`);
    console.log('');
    info(`Use "litrev status ${job.id}" to check progress`);
    info(`Use "litrev watch ${job.id}" to monitor in real-time`);

  } catch (err) {
    error(`Failed to create job: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  createCommand
};
