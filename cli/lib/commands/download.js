const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config');
const apiClient = require('../api-client');
const { error, success, info, warning } = require('../utils/formatters');

async function downloadCommand(jobId, options) {
  try {
    if (!config.isAuthenticated()) {
      error('Not logged in. Use "litrev login" first.');
      process.exit(1);
    }

    if (!jobId) {
      error('Job ID is required');
      info('Usage: litrev download <job-id> [options]');
      process.exit(1);
    }

    // First, get job details to check what's available
    const job = await apiClient.getSearchJob(jobId);

    if (job.status !== 'completed') {
      warning(`Job is not completed yet (status: ${job.status})`);
      if (!options.force) {
        error('Use --force to download partial results');
        process.exit(1);
      }
    }

    const outputDir = options.output || process.cwd();

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      error(`Failed to create output directory: ${err.message}`);
      process.exit(1);
    }

    const downloads = [];

    // Determine what to download
    const downloadAll = options.all || (!options.csv && !options.prisma && !options.latex && !options.bibtex);

    if (downloadAll || options.csv) {
      if (job.csv_file_path) {
        downloads.push({ type: 'csv', name: 'CSV file' });
      }
    }

    if (downloadAll || options.prisma) {
      if (job.prisma_diagram_path) {
        downloads.push({ type: 'prisma', name: 'PRISMA diagram' });
      }
    }

    if (downloadAll || options.latex) {
      if (job.latex_file_path) {
        downloads.push({ type: 'latex', name: 'LaTeX document' });
      }
    }

    if (downloadAll || options.bibtex) {
      if (job.bibtex_file_path) {
        downloads.push({ type: 'bibtex', name: 'BibTeX file' });
      }
    }

    if (downloads.length === 0) {
      warning('No files available for download');
      info('The job may not have completed yet or no results were found');
      return;
    }

    info(`Downloading ${downloads.length} file(s) to ${outputDir}...`);

    for (const download of downloads) {
      try {
        let data, filename;

        switch (download.type) {
          case 'csv':
            data = await apiClient.downloadCsv(jobId);
            filename = `job_${jobId}_results.csv`;
            break;
          case 'prisma':
            data = await apiClient.downloadPrismaDiagram(jobId);
            filename = `job_${jobId}_prisma_diagram.svg`;
            break;
          case 'latex':
            data = await apiClient.downloadLatex(jobId);
            filename = `job_${jobId}_review.tex`;
            break;
          case 'bibtex':
            data = await apiClient.downloadBibtex(jobId);
            filename = `job_${jobId}_references.bib`;
            break;
        }

        const filepath = path.join(outputDir, filename);
        await fs.writeFile(filepath, data);
        success(`Downloaded ${download.name}: ${filepath}`);

      } catch (err) {
        error(`Failed to download ${download.name}: ${err.message}`);
      }
    }

    console.log('');
    success(`Download complete! Files saved to: ${outputDir}`);

  } catch (err) {
    error(`Download failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  downloadCommand
};
