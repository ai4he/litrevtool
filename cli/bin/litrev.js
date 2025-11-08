#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import commands
const { loginCommand, logoutCommand, whoamiCommand, configCommand } = require('../lib/commands/login');
const { createCommand } = require('../lib/commands/create');
const { listCommand } = require('../lib/commands/list');
const { statusCommand, resumeCommand, deleteCommand } = require('../lib/commands/status');
const { downloadCommand } = require('../lib/commands/download');
const { watchCommand } = require('../lib/commands/watch');
const apiClient = require('../lib/api-client');
const { success, error, info } = require('../lib/utils/formatters');

const program = new Command();

program
  .name('litrev')
  .description('LitRevTool CLI - Literature Review Tool that overcomes Google Scholar limitations')
  .version(packageJson.version);

// Login command
program
  .command('login')
  .description('Login to LitRevTool')
  .option('--api <url>', 'API URL (default: http://localhost:8000)')
  .action(loginCommand);

// Logout command
program
  .command('logout')
  .description('Logout from LitRevTool')
  .action(logoutCommand);

// Whoami command
program
  .command('whoami')
  .description('Show current user info')
  .action(whoamiCommand);

// Config command
program
  .command('config')
  .description('Configure CLI settings')
  .option('--token <token>', 'Set API token')
  .option('--api <url>', 'Set API URL')
  .option('--show', 'Show current configuration')
  .action(configCommand);

// Create command
program
  .command('create')
  .description('Create a new search job')
  .option('-n, --name <name>', 'Job name')
  .option('-q, --query <query>', 'Search query')
  .option('--year-from <year>', 'Start year')
  .option('--year-to <year>', 'End year')
  .option('--include <keywords>', 'Include keywords (comma-separated)')
  .option('--exclude <keywords>', 'Exclude keywords (comma-separated)')
  .option('--semantic-criteria <criteria>', 'Semantic filtering criteria')
  .option('--semantic-batch', 'Use batch mode for semantic filtering')
  .option('-i, --interactive', 'Interactive mode')
  .action(createCommand);

// List command
program
  .command('list')
  .description('List all search jobs')
  .option('-s, --status <status>', 'Filter by status (pending, running, completed, failed)')
  .option('-l, --limit <number>', 'Maximum number of jobs to show', '100')
  .option('--skip <number>', 'Number of jobs to skip', '0')
  .action(listCommand);

// Status command
program
  .command('status <job-id>')
  .description('Show detailed status of a search job')
  .action(statusCommand);

// Resume command
program
  .command('resume <job-id>')
  .description('Resume a failed search job')
  .action(resumeCommand);

// Delete command
program
  .command('delete <job-id>')
  .description('Delete a search job')
  .option('-f, --force', 'Force deletion without confirmation')
  .action(deleteCommand);

// Download command
program
  .command('download <job-id>')
  .description('Download job results')
  .option('-o, --output <dir>', 'Output directory (default: current directory)')
  .option('--csv', 'Download CSV file only')
  .option('--prisma', 'Download PRISMA diagram only')
  .option('--latex', 'Download LaTeX document only')
  .option('--bibtex', 'Download BibTeX file only')
  .option('--all', 'Download all available files (default)')
  .option('-f, --force', 'Force download even if job not completed')
  .action(downloadCommand);

// Watch command
program
  .command('watch <job-id>')
  .description('Watch job progress in real-time')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '5')
  .action(watchCommand);

// Health check command
program
  .command('health')
  .description('Check API health')
  .action(async () => {
    try {
      info('Checking API health...');
      const health = await apiClient.health();
      success('API is healthy!');
      console.log(JSON.stringify(health, null, 2));
    } catch (err) {
      error(`Health check failed: ${err.message}`);
      process.exit(1);
    }
  });

// Quick start guide
program
  .command('quickstart')
  .description('Show quick start guide')
  .action(() => {
    console.log(chalk.bold.cyan('\n=== LitRevTool CLI Quick Start ===\n'));
    console.log('1. Configure the CLI:');
    console.log(chalk.gray('   $ litrev config --api http://localhost:8000\n'));
    console.log('2. Set your API token:');
    console.log(chalk.gray('   $ litrev config --token YOUR_TOKEN\n'));
    console.log('3. Create a search job:');
    console.log(chalk.gray('   $ litrev create --interactive\n'));
    console.log('   Or with options:');
    console.log(chalk.gray('   $ litrev create --query "machine learning" --year-from 2020 --year-to 2023\n'));
    console.log('4. Watch progress:');
    console.log(chalk.gray('   $ litrev watch <job-id>\n'));
    console.log('5. Download results:');
    console.log(chalk.gray('   $ litrev download <job-id>\n'));
    console.log(chalk.bold('For more help:'));
    console.log(chalk.gray('   $ litrev --help\n'));
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
