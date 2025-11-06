import { Router, Response } from 'express';
import { SearchJob, Paper } from '../models';
import { authenticate, AuthRequest } from './middleware/auth';
import { addSearchJobToQueue } from '../tasks/queue';
import logger from '../core/logger';
import path from 'path';
import fs from 'fs';
import { config } from '../core/config';
import glob from 'glob';
import { promisify } from 'util';

const router = Router();
const globAsync = promisify(glob);

// POST /jobs - Create a new search job
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      keywords_include,
      keywords_exclude,
      semantic_criteria,
      semantic_batch_mode,
      generate_latex,
      start_year,
      end_year,
      max_results,
    } = req.body;

    // Validate parameters
    if (start_year && end_year && start_year > end_year) {
      return res.status(400).json({ detail: 'start_year must be less than or equal to end_year' });
    }

    if (!keywords_include || keywords_include.length === 0) {
      return res.status(400).json({ detail: 'At least one inclusion keyword is required' });
    }

    // Create job
    const job = await SearchJob.create({
      userId: req.user!.id,
      name,
      keywordsInclude: keywords_include,
      keywordsExclude: keywords_exclude || [],
      semanticCriteria: semantic_criteria || null,
      semanticBatchMode: semantic_batch_mode !== undefined ? semantic_batch_mode : true,
      generateLatex: generate_latex !== undefined ? generate_latex : false,
      startYear: start_year,
      endYear: end_year,
      maxResults: max_results,
      status: 'pending',
    });

    // Add job to queue
    const jobId = await addSearchJobToQueue(job.id);
    job.celeryTaskId = jobId;
    await job.save();

    logger.info(`Search job created: ${job.id}`);

    return res.status(201).json(job);
  } catch (error) {
    logger.error('Error creating search job:', error);
    return res.status(500).json({ detail: 'Failed to create search job' });
  }
});

// GET /jobs - List all search jobs for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const { count, rows } = await SearchJob.findAndCountAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit,
    });

    return res.json({ jobs: rows, total: count });
  } catch (error) {
    logger.error('Error listing search jobs:', error);
    return res.status(500).json({ detail: 'Failed to list search jobs' });
  }
});

// GET /jobs/:job_id - Get a specific search job
router.get('/:job_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    return res.json(job);
  } catch (error) {
    logger.error('Error getting search job:', error);
    return res.status(500).json({ detail: 'Failed to get search job' });
  }
});

// PATCH /jobs/:job_id - Update a search job
router.patch('/:job_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;
    const { name, status } = req.body;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    // Update fields
    if (name !== undefined) {
      job.name = name;
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ detail: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      job.status = status;
    }

    await job.save();

    return res.json(job);
  } catch (error) {
    logger.error('Error updating search job:', error);
    return res.status(500).json({ detail: 'Failed to update search job' });
  }
});

// DELETE /jobs/:job_id - Delete a search job
router.delete('/:job_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    // Delete CSV file if exists
    if (job.csvFilePath && fs.existsSync(job.csvFilePath)) {
      fs.unlinkSync(job.csvFilePath);
    }

    await job.destroy();

    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting search job:', error);
    return res.status(500).json({ detail: 'Failed to delete search job' });
  }
});

// POST /jobs/:job_id/pause - Pause a running search job
router.post('/:job_id/pause', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    if (job.status !== 'running') {
      return res.status(400).json({ detail: 'Only running jobs can be paused' });
    }

    job.status = 'paused';
    job.statusMessage = 'Pausing job...';
    await job.save();

    return res.json(job);
  } catch (error) {
    logger.error('Error pausing search job:', error);
    return res.status(500).json({ detail: 'Failed to pause search job' });
  }
});

// POST /jobs/:job_id/resume - Resume a failed or paused search job
router.post('/:job_id/resume', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    if (!['failed', 'paused'].includes(job.status)) {
      return res.status(400).json({ detail: 'Only failed or paused jobs can be resumed' });
    }

    // Add job to queue for resumption
    await addSearchJobToQueue(job.id, true);

    return res.json(job);
  } catch (error) {
    logger.error('Error resuming search job:', error);
    return res.status(500).json({ detail: 'Failed to resume search job' });
  }
});

// GET /jobs/:job_id/papers - Get papers for a specific search job
router.get('/:job_id/papers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    // Verify job belongs to current user
    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    // Get papers for this job
    const { count, rows } = await Paper.findAndCountAll({
      where: { searchJobId: job_id },
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit,
    });

    return res.json({ papers: rows, total: count });
  } catch (error) {
    logger.error('Error getting papers:', error);
    return res.status(500).json({ detail: 'Failed to get papers' });
  }
});

// GET /jobs/:job_id/download - Download CSV results
router.get('/:job_id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ detail: 'Job is not completed yet' });
    }

    if (!job.csvFilePath || !fs.existsSync(job.csvFilePath)) {
      return res.status(404).json({ detail: 'Results file not found' });
    }

    const filename = `${job.name.replace(/\s+/g, '_')}_${job.id}.csv`;

    return res.download(job.csvFilePath, filename);
  } catch (error) {
    logger.error('Error downloading results:', error);
    return res.status(500).json({ detail: 'Failed to download results' });
  }
});

// GET /jobs/:job_id/prisma-diagram - Download PRISMA diagram
router.get('/:job_id/prisma-diagram', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ detail: 'Job is not completed yet' });
    }

    if (!job.prismaDiagramPath || !fs.existsSync(job.prismaDiagramPath)) {
      return res.status(404).json({ detail: 'PRISMA diagram not found' });
    }

    const filename = `${job.name.replace(/\s+/g, '_')}_PRISMA_${job.id}.svg`;

    return res.download(job.prismaDiagramPath, filename);
  } catch (error) {
    logger.error('Error downloading PRISMA diagram:', error);
    return res.status(500).json({ detail: 'Failed to download PRISMA diagram' });
  }
});

// GET /jobs/:job_id/latex - Download LaTeX document
router.get('/:job_id/latex', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ detail: 'Job is not completed yet' });
    }

    if (!job.latexFilePath || !fs.existsSync(job.latexFilePath)) {
      return res.status(404).json({ detail: 'LaTeX document not found' });
    }

    const filename = `${job.name.replace(/\s+/g, '_')}_Review_${job.id}.tex`;

    return res.download(job.latexFilePath, filename);
  } catch (error) {
    logger.error('Error downloading LaTeX:', error);
    return res.status(500).json({ detail: 'Failed to download LaTeX document' });
  }
});

// GET /jobs/:job_id/bibtex - Download BibTeX file
router.get('/:job_id/bibtex', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ detail: 'Job is not completed yet' });
    }

    if (!job.bibtexFilePath || !fs.existsSync(job.bibtexFilePath)) {
      return res.status(404).json({ detail: 'BibTeX file not found' });
    }

    const filename = `${job.name.replace(/\s+/g, '_')}_References_${job.id}.bib`;

    return res.download(job.bibtexFilePath, filename);
  } catch (error) {
    logger.error('Error downloading BibTeX:', error);
    return res.status(500).json({ detail: 'Failed to download BibTeX file' });
  }
});

// GET /jobs/:job_id/screenshot - Get latest screenshot
router.get('/:job_id/screenshot', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { job_id } = req.params;

    // Verify job belongs to current user
    const job = await SearchJob.findOne({
      where: { id: job_id, userId: req.user!.id },
    });

    if (!job) {
      return res.status(404).json({ detail: 'Search job not found' });
    }

    // Find the latest screenshot for this job
    const screenshotDir = path.join(config.UPLOAD_DIR, 'screenshots');
    const pattern = path.join(screenshotDir, `scraper_${job_id}_*.png`);

    const screenshots = await globAsync(pattern);

    if (!screenshots || screenshots.length === 0) {
      return res.status(404).json({ detail: 'No screenshot available yet' });
    }

    // Get the most recent screenshot
    const latestScreenshot = screenshots.sort((a: string, b: string) => {
      return fs.statSync(b).ctime.getTime() - fs.statSync(a).ctime.getTime();
    })[0];

    return res.sendFile(latestScreenshot, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error('Error getting screenshot:', error);
    return res.status(500).json({ detail: 'Failed to get screenshot' });
  }
});

export default router;
