/**
 * Comprehensive Scraping Task Orchestration
 * Uses multi-strategy scraper, semantic filtering, and generates all outputs
 */
import { SearchJob, Paper, User } from '../models';
import { MultiStrategyScholarScraper } from '../services/scrapers/multiStrategyScraper';
import SemanticFilter from '../services/semanticFilter';
import emailService from '../services/emailService';
import { writePapersToCSV } from '../services/csvWriter';
import { generatePrismaDiagram } from '../services/prismaDiagram';
import { generateBibtexFile } from '../services/bibtexGenerator';
import { generateLatexReview } from '../services/latexGenerator';
import logger from '../core/logger';
import { config } from '../core/config';
import path from 'path';

export async function runSearchJob(jobId: string): Promise<void> {
  logger.info(`Running search job: ${jobId}`);

  const scraper = new MultiStrategyScholarScraper({
    useTor: config.USE_TOR, // Use Tor if enabled in .env
    headless: true,
    jobId,
    screenshotDir: path.join(config.UPLOAD_DIR, 'screenshots'),
  });

  try {
    const job = await SearchJob.findByPk(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job status
    job.status = 'running';
    job.startedAt = new Date();
    job.statusMessage = 'Initializing multi-strategy scraper...';
    await job.save();

    // Progress callback
    const progressCallback = async (current: number, total: number) => {
      const progress = (current / (total || 1)) * 50; // First 50% is scraping
      job.progress = Math.min(progress, 50);
      job.totalPapersFound = current;
      await job.save();
    };

    // Incremental paper save callback
    const papersCallback = async (newPapers: any[]) => {
      for (const paper of newPapers) {
        await Paper.create({
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
      }
      job.papersProcessed += newPapers.length;
      await job.save();
    };

    job.statusMessage = 'Searching Google Scholar with multi-strategy approach...';
    await job.save();

    // Perform search with multi-strategy scraper
    const papers = await scraper.search({
      keywords: job.keywordsInclude,
      startYear: job.startYear || undefined,
      endYear: job.endYear || undefined,
      maxResults: job.maxResults || undefined,
      progressCallback,
      papersCallback,
    });

    logger.info(`Found ${papers.length} papers for job ${jobId}`);

    // Log strategy stats
    const strategyStats = scraper.getStrategyStats();
    logger.info(`Strategy stats: ${JSON.stringify(strategyStats)}`);

    job.totalPapersFound = papers.length;
    job.progress = 50;
    job.statusMessage = `Found ${papers.length} papers. Processing...`;
    await job.save();

    // Get all papers from database
    let savedPapers = await Paper.findAll({
      where: { searchJobId: jobId },
    });

    // Apply semantic filter if criteria provided
    let includedPapers = savedPapers;
    if (job.semanticCriteria) {
      job.statusMessage = 'Applying semantic filtering with Gemini AI...';
      job.progress = 60;
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

      // Update semantic scores and exclusion status for ALL papers
      for (const filteredPaper of filtered) {
        const paper = savedPapers.find((p) => p.title === filteredPaper.title);
        if (paper) {
          paper.semanticScore = filteredPaper.semantic_score || 0;
          paper.isExcluded = filteredPaper.is_excluded || false;
          paper.exclusionReason = filteredPaper.exclusion_reason || undefined;
          paper.semanticRationale = filteredPaper.semantic_rationale || undefined;
          await paper.save();
        }
      }

      includedPapers = savedPapers.filter((p) => !p.isExcluded);
      logger.info(`Semantic filtering: ${includedPapers.length}/${savedPapers.length} papers included, ${savedPapers.length - includedPapers.length} excluded`);
    }

    job.progress = 70;
    job.statusMessage = 'Generating outputs...';
    await job.save();

    // Generate CSV with ALL papers (including excluded ones)
    logger.info('Generating CSV export...');
    const csvPath = await writePapersToCSV(
      savedPapers.map((p) => ({
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
        isExcluded: p.isExcluded,
        exclusionReason: p.exclusionReason,
        semanticRationale: p.semanticRationale,
      })),
      jobId,
      job.name
    );
    job.csvFilePath = csvPath;
    job.progress = 75;
    await job.save();

    // Generate PRISMA metrics (following PRISMA 2020 standards)
    const duplicatesRemoved = papers.length - savedPapers.length; // Papers found - papers saved (duplicates)
    const semanticExcluded = savedPapers.length - includedPapers.length;

    const prismaMetrics = {
      identification: {
        records_identified: papers.length,
      },
      screening: {
        records_excluded_duplicates: duplicatesRemoved,
        records_after_duplicates_removed: savedPapers.length,
      },
      eligibility: {
        full_text_assessed: savedPapers.length,
        full_text_excluded_semantic: semanticExcluded,
      },
      included: {
        studies_included: includedPapers.length,
      },
    };
    job.prismaMetrics = prismaMetrics;

    // Generate PRISMA diagram
    logger.info('Generating PRISMA diagram...');
    const prismaDiagramPath = generatePrismaDiagram(prismaMetrics, jobId, job.name);
    job.prismaDiagramPath = prismaDiagramPath;
    job.progress = 80;
    await job.save();

    // Generate BibTeX file (only included papers)
    logger.info('Generating BibTeX file...');
    const bibtexFilename = `${job.name.replace(/\s+/g, '_')}_References_${jobId}.bib`;
    const bibtexPath = path.join(config.UPLOAD_DIR, bibtexFilename);
    generateBibtexFile(
      includedPapers.map((p) => ({
        title: p.title,
        authors: p.authors,
        year: p.year,
        source: p.source,
        publisher: p.publisher,
        abstract: p.abstract,
        url: p.url,
      })),
      bibtexPath
    );
    job.bibtexFilePath = bibtexPath;
    job.progress = 85;
    await job.save();

    // Generate LaTeX document if requested
    if (job.generateLatex) {
      logger.info('Generating LaTeX systematic review...');
      job.statusMessage = 'Generating AI-powered LaTeX document...';
      await job.save();

      const latexFilename = `${job.name.replace(/\s+/g, '_')}_Review_${jobId}.tex`;
      const latexPath = path.join(config.UPLOAD_DIR, latexFilename);

      await generateLatexReview({
        papers: includedPapers.map((p) => ({
          title: p.title,
          authors: p.authors,
          year: p.year,
          source: p.source,
          publisher: p.publisher,
          abstract: p.abstract,
          url: p.url,
          citations: p.citations,
        })),
        searchCriteria: {
          keywords_include: job.keywordsInclude,
          keywords_exclude: job.keywordsExclude,
          start_year: job.startYear,
          end_year: job.endYear,
        },
        prismaMetrics,
        title: `Systematic Literature Review: ${job.name}`,
        outputPath: latexPath,
      });

      job.latexFilePath = latexPath;
      job.progress = 95;
      await job.save();
    }

    // Mark as completed
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    job.statusMessage = `Completed! Found ${savedPapers.length} papers (${includedPapers.length} included, ${savedPapers.length - includedPapers.length} excluded).`;
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
          includedPapers.length,
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
    // TODO: Implement proper checkpoint-based resumption using lastCheckpoint
    job.status = 'pending';
    job.errorMessage = undefined;
    job.progress = 0;
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
