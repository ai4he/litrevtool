import { SearchJob, Paper, User } from '../models';
import { ScholarScraper } from '../services/scholarScraper';
import SemanticFilter from '../services/semanticFilter';
import emailService from '../services/emailService';
import { writePapersToCSV } from '../services/csvWriter';
import { generatePrismaDiagram } from '../services/prismaDiagram';
import logger from '../core/logger';
import { config } from '../core/config';

export async function runSearchJob(jobId: string): Promise<void> {
  logger.info(`Running search job: ${jobId}`);

  const scraper = new ScholarScraper();

  try {
    const job = await SearchJob.findByPk(jobId, {
      include: [{ model: User, as: 'user' }],
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job status
    job.status = 'running';
    job.startedAt = new Date();
    job.statusMessage = 'Initializing scraper...';
    await job.save();

    // Initialize scraper
    await scraper.initialize();

    job.statusMessage = 'Searching Google Scholar...';
    await job.save();

    // Perform search
    const papers = await scraper.search({
      keywords: job.keywordsInclude,
      startYear: job.startYear || undefined,
      endYear: job.endYear || undefined,
      maxResults: job.maxResults || undefined,
    });

    logger.info(`Found ${papers.length} papers for job ${jobId}`);

    job.totalPapersFound = papers.length;
    job.statusMessage = `Found ${papers.length} papers. Saving to database...`;
    await job.save();

    // Save papers to database
    const savedPapers = [];
    for (const paper of papers) {
      const savedPaper = await Paper.create({
        searchJobId: jobId,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        source: paper.source,
        publisher: paper.publisher,
        citations: paper.citations || 0,
        abstract: paper.abstract,
        url: paper.url,
      });
      savedPapers.push(savedPaper);
    }

    job.papersProcessed = savedPapers.length;
    job.progress = 50;
    await job.save();

    // Apply semantic filter if criteria provided
    let filteredPapers = savedPapers;
    if (job.semanticCriteria) {
      job.statusMessage = 'Applying semantic filtering...';
      await job.save();

      const filter = new SemanticFilter();
      const papersForFilter = savedPapers.map((p) => ({
        title: p.title,
        abstract: p.abstract || '',
      }));

      const filtered = await filter.filterPapers(
        papersForFilter,
        job.semanticCriteria.inclusion,
        job.semanticCriteria.exclusion,
        job.semanticBatchMode ? 10 : 1
      );

      // Update semantic scores
      for (let i = 0; i < filtered.length; i++) {
        const paper = savedPapers.find((p) => p.title === filtered[i].title);
        if (paper && filtered[i].semantic_score) {
          paper.semanticScore = filtered[i].semantic_score;
          await paper.save();
        }
      }

      filteredPapers = savedPapers.filter((p) => p.semanticScore);
    }

    job.progress = 75;
    job.statusMessage = 'Generating CSV export...';
    await job.save();

    // Generate CSV
    const csvPath = await writePapersToCSV(
      filteredPapers.map((p) => ({
        title: p.title,
        authors: p.authors || '',
        year: p.year,
        source: p.source || '',
        publisher: p.publisher || '',
        citations: p.citations,
        abstract: p.abstract || '',
        url: p.url || '',
        doi: p.doi || '',
        semanticScore: p.semanticScore,
      })),
      jobId,
      job.name
    );

    job.csvFilePath = csvPath;

    // Generate PRISMA metrics
    const prismaMetrics = {
      identification: papers.length,
      screening: papers.length,
      eligibility: job.semanticCriteria ? savedPapers.length : papers.length,
      included: filteredPapers.length,
    };

    job.prismaMetrics = prismaMetrics;

    // Generate PRISMA diagram
    const prismaDiagramPath = generatePrismaDiagram(prismaMetrics, jobId, job.name);
    job.prismaDiagramPath = prismaDiagramPath;

    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    job.statusMessage = `Completed! Found ${filteredPapers.length} papers.`;
    await job.save();

    logger.info(`Search job ${jobId} completed successfully`);

    // Send completion email
    const user = await User.findByPk(job.userId);
    if (user) {
      try {
        const downloadUrl = `${config.FRONTEND_URL}/jobs/${jobId}`;
        await emailService.sendJobCompletionEmail(
          user.email,
          user.name || 'User',
          job.name,
          filteredPapers.length,
          downloadUrl
        );
      } catch (emailError) {
        logger.error('Failed to send completion email:', emailError);
        // Don't fail the job if email fails
      }
    }
  } catch (error) {
    logger.error(`Error running search job ${jobId}:`, error);

    const job = await SearchJob.findByPk(jobId);
    if (job) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.statusMessage = 'Job failed';
      await job.save();
    }

    throw error;
  } finally {
    await scraper.close();
  }
}

export async function resumeSearchJob(jobId: string): Promise<void> {
  logger.info(`Resuming search job: ${jobId}`);

  try {
    const job = await SearchJob.findByPk(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // For now, just restart the job
    // TODO: Implement proper checkpoint-based resumption
    job.status = 'pending';
    job.errorMessage = undefined;
    await job.save();

    await runSearchJob(jobId);
  } catch (error) {
    logger.error(`Error resuming search job ${jobId}:`, error);

    const job = await SearchJob.findByPk(jobId);
    if (job) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await job.save();
    }

    throw error;
  }
}
