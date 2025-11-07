#!/usr/bin/env node
/**
 * Debug Job Script - Comprehensive debugging for stuck/failed search jobs
 * Usage: node debug-job.js [job_id]
 */

const path = require('path');
const baseDir = process.cwd().endsWith('backend-node') ? process.cwd() : path.join(process.cwd(), 'backend-node');
const { SearchJob, Paper } = require(path.join(baseDir, 'dist/models'));
const { sequelize } = require(path.join(baseDir, 'dist/db'));
const { Queue } = require(path.join(baseDir, 'node_modules/bullmq'));
const { config } = require(path.join(baseDir, 'dist/core/config'));

const REDIS_CONFIG = {
  host: config.REDIS_HOST || 'localhost',
  port: config.REDIS_PORT || 6379,
};

async function debugJob(jobId) {
  try {
    console.log('🔍 LitRevTool Job Debugger\n');
    console.log('═'.repeat(60));

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get job from database
    const job = jobId
      ? await SearchJob.findByPk(jobId)
      : await SearchJob.findOne({ order: [['createdAt', 'DESC']] });

    if (!job) {
      console.log('❌ Job not found');
      process.exit(1);
    }

    // Display job information
    console.log('📋 JOB INFORMATION');
    console.log('─'.repeat(60));
    console.log(`ID:              ${job.id}`);
    console.log(`Name:            ${job.name}`);
    console.log(`Status:          ${job.status}`);
    console.log(`Progress:        ${job.progress.toFixed(2)}%`);
    console.log(`Papers Found:    ${job.totalPapersFound}`);
    console.log(`Papers Processed: ${job.papersProcessed}`);
    console.log(`Created:         ${job.createdAt}`);
    console.log(`Started:         ${job.startedAt || 'Not started'}`);
    console.log(`Completed:       ${job.completedAt || 'Not completed'}`);
    console.log(`Celery Task ID:  ${job.celeryTaskId || 'None'}\n`);

    // Display search criteria
    console.log('🔎 SEARCH CRITERIA');
    console.log('─'.repeat(60));
    console.log(`Keywords Include: ${job.keywordsInclude.join(', ')}`);
    console.log(`Keywords Exclude: ${job.keywordsExclude.join(', ')}`);
    console.log(`Year Range:       ${job.startYear || '?'} - ${job.endYear || '?'}`);
    console.log(`Max Results:      ${job.maxResults || 'Unlimited'}\n`);

    // Display status and errors
    if (job.statusMessage) {
      console.log('📝 STATUS MESSAGE');
      console.log('─'.repeat(60));
      console.log(job.statusMessage);
      console.log();
    }

    if (job.errorMessage) {
      console.log('❌ ERROR MESSAGE');
      console.log('─'.repeat(60));
      console.log(job.errorMessage);
      console.log();
    }

    // Display checkpoint information
    if (job.lastCheckpoint) {
      console.log('💾 LAST CHECKPOINT');
      console.log('─'.repeat(60));
      console.log(JSON.stringify(job.lastCheckpoint, null, 2));
      console.log();
    }

    // Check BullMQ queue
    console.log('🎯 QUEUE INFORMATION');
    console.log('─'.repeat(60));

    const searchQueue = new Queue('search-jobs', { connection: REDIS_CONFIG });

    if (job.celeryTaskId) {
      const queueJob = await searchQueue.getJob(job.celeryTaskId);

      if (queueJob) {
        const state = await queueJob.getState();
        console.log(`Queue Job State:  ${state}`);
        console.log(`Attempts:         ${queueJob.attemptsMade}/${queueJob.opts.attempts || 1}`);
        console.log(`Progress:         ${queueJob.progress}%`);

        if (queueJob.failedReason) {
          console.log(`Failed Reason:    ${queueJob.failedReason}`);
        }

        if (queueJob.stacktrace && queueJob.stacktrace.length > 0) {
          console.log('\n📚 STACK TRACE');
          console.log('─'.repeat(60));
          console.log(queueJob.stacktrace[queueJob.stacktrace.length - 1]);
        }
      } else {
        console.log('⚠️  Job not found in queue (may have been completed or failed)');
      }
    } else {
      console.log('⚠️  No queue job ID associated');
    }
    console.log();

    // Get paper count
    const paperCount = await Paper.count({ where: { searchJobId: job.id } });
    console.log('📄 PAPERS COLLECTED');
    console.log('─'.repeat(60));
    console.log(`Total Papers:     ${paperCount}`);
    console.log();

    // Show recent papers
    if (paperCount > 0) {
      const recentPapers = await Paper.findAll({
        where: { searchJobId: job.id },
        order: [['createdAt', 'DESC']],
        limit: 5,
      });

      console.log('📑 RECENT PAPERS (Last 5)');
      console.log('─'.repeat(60));
      recentPapers.forEach((paper, index) => {
        console.log(`${index + 1}. ${paper.title}`);
        console.log(`   Authors: ${paper.authors || 'N/A'}`);
        console.log(`   Year: ${paper.year || 'N/A'} | Citations: ${paper.citations || 0}`);
        console.log();
      });
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(60));

    if (job.status === 'running' && paperCount === 0 && job.startedAt) {
      const runningTime = Date.now() - new Date(job.startedAt).getTime();
      const runningMinutes = Math.floor(runningTime / 60000);

      if (runningMinutes > 5) {
        console.log('⚠️  Job has been running for', runningMinutes, 'minutes with no papers collected');
        console.log('   - Check worker logs: pm2 logs litrev-worker');
        console.log('   - Job may be stuck due to scraping issues (403 errors, CAPTCHA, etc.)');
        console.log('   - Consider resetting: npm run debug:reset-jobs');
      }
    }

    if (job.status === 'failed') {
      console.log('🔧 To retry this job:');
      console.log(`   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" https://litrev.haielab.org/api/v1/jobs/${job.id}/resume`);
    }

    if (job.status === 'running' && job.errorMessage) {
      console.log('⚠️  Job is marked as running but has error messages');
      console.log('   - This indicates the worker may have crashed');
      console.log('   - Reset stuck jobs: npm run debug:reset-jobs');
    }

    console.log();
    console.log('═'.repeat(60));

    await searchQueue.close();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const jobId = process.argv[2];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node debug-job.js [job_id]');
  console.log('');
  console.log('If no job_id is provided, debugs the most recent job.');
  console.log('');
  console.log('Examples:');
  console.log('  node debug-job.js                           # Debug most recent job');
  console.log('  node debug-job.js 1be9acd3-6c52-4c32-9866   # Debug specific job');
  process.exit(0);
}

debugJob(jobId);
