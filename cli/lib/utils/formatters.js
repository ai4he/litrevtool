const chalk = require('chalk');
const Table = require('cli-table3');

function formatStatus(status) {
  const statusColors = {
    pending: chalk.yellow,
    running: chalk.blue,
    completed: chalk.green,
    failed: chalk.red
  };

  const formatter = statusColors[status] || chalk.white;
  return formatter(status.toUpperCase());
}

function formatDate(dateString) {
  if (!dateString) return chalk.gray('N/A');
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDuration(startDate, endDate) {
  if (!startDate) return chalk.gray('N/A');

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const durationMs = end - start;

  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatJobsTable(jobs) {
  const table = new Table({
    head: ['ID', 'Name', 'Status', 'Papers', 'Created', 'Duration'].map(h => chalk.cyan(h)),
    colWidths: [5, 30, 12, 8, 20, 15]
  });

  jobs.forEach(job => {
    table.push([
      job.id,
      job.name.length > 27 ? job.name.substring(0, 24) + '...' : job.name,
      formatStatus(job.status),
      job.papers_collected || 0,
      formatDate(job.created_at),
      formatDuration(job.started_at, job.completed_at)
    ]);
  });

  return table.toString();
}

function formatJobDetails(job) {
  const lines = [];

  lines.push(chalk.bold.cyan('\n=== Job Details ===\n'));
  lines.push(`${chalk.bold('ID:')} ${job.id}`);
  lines.push(`${chalk.bold('Name:')} ${job.name}`);
  lines.push(`${chalk.bold('Status:')} ${formatStatus(job.status)}`);
  lines.push(`${chalk.bold('Search Query:')} ${job.search_query}`);

  if (job.year_from || job.year_to) {
    lines.push(`${chalk.bold('Year Range:')} ${job.year_from || 'N/A'} - ${job.year_to || 'N/A'}`);
  }

  if (job.include_keywords) {
    lines.push(`${chalk.bold('Include Keywords:')} ${job.include_keywords}`);
  }

  if (job.exclude_keywords) {
    lines.push(`${chalk.bold('Exclude Keywords:')} ${job.exclude_keywords}`);
  }

  if (job.semantic_criteria) {
    lines.push(`${chalk.bold('Semantic Criteria:')} ${job.semantic_criteria}`);
    lines.push(`${chalk.bold('Batch Mode:')} ${job.semantic_batch_mode ? 'Yes' : 'No'}`);
  }

  lines.push(`${chalk.bold('Papers Collected:')} ${job.papers_collected || 0}`);

  if (job.status_message) {
    lines.push(`${chalk.bold('Status Message:')} ${job.status_message}`);
  }

  lines.push(`${chalk.bold('Created:')} ${formatDate(job.created_at)}`);

  if (job.started_at) {
    lines.push(`${chalk.bold('Started:')} ${formatDate(job.started_at)}`);
  }

  if (job.completed_at) {
    lines.push(`${chalk.bold('Completed:')} ${formatDate(job.completed_at)}`);
    lines.push(`${chalk.bold('Duration:')} ${formatDuration(job.started_at, job.completed_at)}`);
  }

  // PRISMA metrics
  if (job.prisma_metrics) {
    lines.push(chalk.bold.cyan('\n=== PRISMA Metrics ===\n'));
    const metrics = job.prisma_metrics;

    if (metrics.identification) {
      lines.push(chalk.bold('Identification:'));
      lines.push(`  Records identified: ${metrics.identification.records_identified || 0}`);
    }

    if (metrics.screening) {
      lines.push(chalk.bold('Screening:'));
      lines.push(`  Records after duplicates removed: ${metrics.screening.records_after_duplicates_removed || 0}`);
      lines.push(`  Records screened: ${metrics.screening.records_screened || 0}`);
    }

    if (metrics.eligibility) {
      lines.push(chalk.bold('Eligibility:'));
      lines.push(`  Papers assessed: ${metrics.eligibility.papers_assessed || 0}`);
      lines.push(`  Papers excluded: ${metrics.eligibility.papers_excluded || 0}`);
    }

    if (metrics.included) {
      lines.push(chalk.bold('Included:'));
      lines.push(`  Papers included: ${metrics.included.papers_included || 0}`);
    }
  }

  // Available files
  lines.push(chalk.bold.cyan('\n=== Available Downloads ===\n'));
  const files = [];

  if (job.csv_file_path) {
    files.push(chalk.green('✓') + ' CSV file');
  }

  if (job.prisma_diagram_path) {
    files.push(chalk.green('✓') + ' PRISMA diagram (SVG)');
  }

  if (job.latex_file_path) {
    files.push(chalk.green('✓') + ' LaTeX document');
  }

  if (job.bibtex_file_path) {
    files.push(chalk.green('✓') + ' BibTeX file');
  }

  if (files.length > 0) {
    files.forEach(f => lines.push(f));
  } else {
    lines.push(chalk.gray('No files available yet'));
  }

  return lines.join('\n') + '\n';
}

function formatProgress(job) {
  const percentage = job.papers_collected || 0;
  const barLength = 30;
  const filled = Math.min(Math.floor(barLength * percentage / 100), barLength);
  const empty = barLength - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `[${bar}] ${percentage}% - ${job.status_message || 'Processing...'}`;
}

function success(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function error(message) {
  console.log(chalk.red('✗') + ' ' + message);
}

function warning(message) {
  console.log(chalk.yellow('⚠') + ' ' + message);
}

function info(message) {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

module.exports = {
  formatStatus,
  formatDate,
  formatDuration,
  formatJobsTable,
  formatJobDetails,
  formatProgress,
  success,
  error,
  warning,
  info
};
