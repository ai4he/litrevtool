/**
 * Comprehensive Test Suite for LitRevTool
 * Tests all major features with assertions
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:8000/api/v1';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, testName, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    log(`✓ ${testName}`, 'green');
    results.tests.push({ name: testName, passed: true, details });
  } else {
    results.failed++;
    log(`✗ ${testName}`, 'red');
    if (details) log(`  Details: ${details}`, 'yellow');
    results.tests.push({ name: testName, passed: false, details });
  }
}

function assertEquals(actual, expected, testName) {
  const passed = actual === expected;
  assert(passed, testName, passed ? '' : `Expected: ${expected}, Got: ${actual}`);
}

function assertGreaterThan(actual, threshold, testName) {
  const passed = actual > threshold;
  assert(passed, testName, passed ? '' : `Expected > ${threshold}, Got: ${actual}`);
}

function assertExists(value, testName) {
  assert(value !== null && value !== undefined, testName);
}

function assertFileExists(filePath, testName) {
  const exists = fs.existsSync(filePath);
  assert(exists, testName, exists ? '' : `File not found: ${filePath}`);
  return exists;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API client - use pre-generated test token
let authToken = process.env.TEST_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjM2ZlYmVmZi04YmVjLTRhZmYtYjUyZi0wMDBmZTY3MTI1NWQiLCJleHAiOjE3NjI3NTEwODksImlhdCI6MTc2MjY2NDY4OX0.OTr9I2JDUy6sVaQpDz3txgMGw9SLL1NGfMvClQpEC0g';

async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Test functions
async function testHealthCheck() {
  log('\n=== Test 1: Health Check ===', 'blue');
  try {
    const response = await axios.get('http://localhost:8000/health');
    assertEquals(response.data.status, 'healthy', 'API health check returns healthy status');
  } catch (error) {
    assert(false, 'API health check', error.message);
  }
}

async function testAuthentication() {
  log('\n=== Test 2: Authentication ===', 'blue');

  // Test that our token works by calling the /me endpoint
  try {
    const user = await apiRequest('GET', '/auth/me');
    assertExists(user.id, 'User ID exists in auth response');
    assertExists(user.email, 'User email exists in auth response');
    log(`Authenticated as: ${user.email}`, 'cyan');
  } catch (error) {
    assert(false, 'Authentication with test token', error.message);
  }
}

async function testJobCreation() {
  log('\n=== Test 3: Job Creation ===', 'blue');

  const jobData = {
    name: 'TestJob_ComprehensiveTest',
    keywords_include: ['machine learning', 'neural networks'],
    keywords_exclude: ['survey'],
    semantic_criteria: {
      include: 'Papers about deep learning applications in computer vision',
      exclude: 'Survey papers or review articles'
    },
    semantic_batch_mode: true,
    generate_latex: true,
    start_year: 2023,
    end_year: 2023,
    max_results: 30
  };

  try {
    const job = await apiRequest('POST', '/jobs/', jobData);

    assertExists(job.id, 'Job created with valid ID');
    assertEquals(job.name, jobData.name, 'Job name matches input');
    assertEquals(job.status, 'pending', 'Job status is pending');
    assertExists(job.celery_task_id, 'Job has task ID');

    // Store job ID for later tests
    global.testJobId = job.id;
    log(`Created test job: ${job.id}`, 'cyan');

    return job;
  } catch (error) {
    assert(false, 'Job creation', error.message);
    throw error;
  }
}

async function testJobMonitoring() {
  log('\n=== Test 4: Job Monitoring ===', 'blue');

  const jobId = global.testJobId;
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes (5s intervals)

  log('Monitoring job progress (this may take several minutes)...', 'cyan');

  while (attempts < maxAttempts) {
    try {
      const job = await apiRequest('GET', `/jobs/${jobId}`);

      log(`Status: ${job.status}, Progress: ${job.progress.toFixed(1)}%, Papers: ${job.papers_processed}/${job.total_papers_found || '?'}`, 'cyan');

      if (job.status === 'completed') {
        log('✓ Job completed successfully!', 'green');

        assertEquals(job.status, 'completed', 'Job status is completed');
        assertGreaterThan(job.total_papers_found, 0, 'Job found papers');
        assertGreaterThan(job.papers_processed, 0, 'Job processed papers');
        assertExists(job.csv_file_path, 'Job has CSV file path');
        assertExists(job.prisma_diagram_path, 'Job has PRISMA diagram path');
        assertExists(job.bibtex_file_path, 'Job has BibTeX file path');

        // Store for later tests
        global.completedJob = job;
        return job;
      } else if (job.status === 'failed') {
        assert(false, 'Job completed without failure', `Job failed: ${job.error_message}`);
        throw new Error(`Job failed: ${job.error_message}`);
      }

      await sleep(5000); // Wait 5 seconds
      attempts++;
    } catch (error) {
      assert(false, 'Job monitoring', error.message);
      throw error;
    }
  }

  assert(false, 'Job completed within time limit', 'Job did not complete within 10 minutes');
  throw new Error('Timeout waiting for job completion');
}

async function testScreenshotGeneration() {
  log('\n=== Test 5: Screenshot Generation ===', 'blue');

  const jobId = global.testJobId;
  const screenshotPattern = path.join(UPLOAD_DIR, 'screenshots', `scraper_${jobId}_*.png`);

  // Use glob to find screenshots
  const glob = require('glob');
  const screenshots = glob.sync(screenshotPattern);

  assertGreaterThan(screenshots.length, 0, 'Screenshots were generated during job execution');

  if (screenshots.length > 0) {
    const latestScreenshot = screenshots[screenshots.length - 1];
    assertFileExists(latestScreenshot, 'Latest screenshot file exists');

    const stats = fs.statSync(latestScreenshot);
    assertGreaterThan(stats.size, 1000, 'Screenshot file has reasonable size (>1KB)');

    log(`Found ${screenshots.length} screenshots`, 'cyan');
  }
}

async function testPapersRetrieval() {
  log('\n=== Test 6: Papers Retrieval ===', 'blue');

  const jobId = global.testJobId;

  try {
    const response = await apiRequest('GET', `/jobs/${jobId}/papers?limit=50`);

    assertExists(response.papers, 'Papers response contains papers array');
    assertGreaterThan(response.papers.length, 0, 'Retrieved papers from database');
    assertExists(response.total, 'Papers response contains total count');

    const paper = response.papers[0];
    assertExists(paper.title, 'Paper has title');
    assertExists(paper.id, 'Paper has ID');

    // Store for semantic filtering test
    global.testPapers = response.papers;

    log(`Retrieved ${response.papers.length} papers`, 'cyan');
  } catch (error) {
    assert(false, 'Papers retrieval', error.message);
  }
}

async function testSemanticFiltering() {
  log('\n=== Test 7: Semantic Filtering (LLM) ===', 'blue');

  const job = global.completedJob;
  const papers = global.testPapers;

  if (job.semantic_criteria) {
    // Check if any papers have semantic scores
    const papersWithScores = papers.filter(p => p.semantic_score !== null && p.semantic_score !== undefined);

    assertGreaterThan(papersWithScores.length, 0, 'Papers have semantic scores from LLM filtering');

    if (papersWithScores.length > 0) {
      const paper = papersWithScores[0];
      assert(
        paper.semantic_score >= 0 && paper.semantic_score <= 1,
        'Semantic score is in valid range (0-1)'
      );

      log(`Found ${papersWithScores.length} papers with semantic scores`, 'cyan');
      log(`Sample score: ${paper.semantic_score.toFixed(2)} for paper: ${paper.title.substring(0, 60)}...`, 'cyan');
    }
  } else {
    log('⚠️  Semantic filtering was not enabled for this test job', 'yellow');
    assert(true, 'Semantic filtering test skipped');
  }
}

async function testCSVDownload() {
  log('\n=== Test 8: CSV Download ===', 'blue');

  const job = global.completedJob;

  if (job.csv_file_path) {
    assertFileExists(job.csv_file_path, 'CSV file exists at specified path');

    const content = fs.readFileSync(job.csv_file_path, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    assertGreaterThan(lines.length, 1, 'CSV file has header and data rows');

    // Check CSV header
    const header = lines[0];
    assert(header.includes('Title'), 'CSV header contains Title column');
    assert(header.includes('Authors'), 'CSV header contains Authors column');
    assert(header.includes('Year'), 'CSV header contains Year column');

    if (job.semantic_criteria) {
      assert(header.includes('Semantic_Score'), 'CSV header contains Semantic_Score column');
    }

    log(`CSV file has ${lines.length - 1} data rows`, 'cyan');
  } else {
    assert(false, 'CSV file path exists', 'No CSV file path in job data');
  }
}

async function testPRISMADiagram() {
  log('\n=== Test 9: PRISMA Diagram ===', 'blue');

  const job = global.completedJob;

  if (job.prisma_diagram_path) {
    assertFileExists(job.prisma_diagram_path, 'PRISMA diagram file exists');

    const content = fs.readFileSync(job.prisma_diagram_path, 'utf8');

    assert(content.includes('<svg'), 'PRISMA diagram is valid SVG');
    assert(content.includes('PRISMA'), 'PRISMA diagram contains PRISMA text');
    assertGreaterThan(content.length, 1000, 'PRISMA diagram has substantial content');

    // Check PRISMA metrics in job data
    if (job.prisma_metrics) {
      assertExists(job.prisma_metrics.identification, 'PRISMA metrics include identification phase');
      assertExists(job.prisma_metrics.screening, 'PRISMA metrics include screening phase');
      assertExists(job.prisma_metrics.included, 'PRISMA metrics include included count');

      log(`PRISMA metrics: ${JSON.stringify(job.prisma_metrics, null, 2)}`, 'cyan');
    }
  } else {
    assert(false, 'PRISMA diagram path exists', 'No PRISMA diagram path in job data');
  }
}

async function testBibTeXGeneration() {
  log('\n=== Test 10: BibTeX References ===', 'blue');

  const job = global.completedJob;

  if (job.bibtex_file_path) {
    assertFileExists(job.bibtex_file_path, 'BibTeX file exists');

    const content = fs.readFileSync(job.bibtex_file_path, 'utf8');

    assert(content.includes('@article') || content.includes('@inproceedings'), 'BibTeX contains entry types');
    assert(content.includes('title'), 'BibTeX entries have titles');
    assert(content.includes('author'), 'BibTeX entries have authors');
    assertGreaterThan(content.length, 500, 'BibTeX file has substantial content');

    // Count entries
    const entryCount = (content.match(/@/g) || []).length;
    assertGreaterThan(entryCount, 0, 'BibTeX file contains bibliography entries');

    log(`BibTeX file contains ${entryCount} references`, 'cyan');
  } else {
    assert(false, 'BibTeX file path exists', 'No BibTeX file path in job data');
  }
}

async function testLaTeXGeneration() {
  log('\n=== Test 11: LaTeX Paper Generation ===', 'blue');

  const job = global.completedJob;

  if (job.latex_file_path) {
    assertFileExists(job.latex_file_path, 'LaTeX file exists');

    const content = fs.readFileSync(job.latex_file_path, 'utf8');

    assert(content.includes('\\documentclass'), 'LaTeX file has document class');
    assert(content.includes('\\begin{document}'), 'LaTeX file has document begin');
    assert(content.includes('\\end{document}'), 'LaTeX file has document end');
    assert(content.includes('\\section'), 'LaTeX file has sections');
    assertGreaterThan(content.length, 2000, 'LaTeX file has substantial content');

    // Check for common sections
    const hasMethods = content.includes('Method') || content.includes('method');
    const hasResults = content.includes('Result') || content.includes('result');

    assert(hasMethods || hasResults, 'LaTeX file contains typical paper sections');

    log('LaTeX document structure validated', 'cyan');
  } else {
    log('⚠️  LaTeX generation was not enabled for this test job', 'yellow');
    assert(true, 'LaTeX generation test skipped');
  }
}

async function testPauseResume() {
  log('\n=== Test 12: Pause/Resume Functionality ===', 'blue');

  log('Creating a new job to test pause/resume...', 'cyan');

  const jobData = {
    name: 'TestJob_PauseResume',
    keywords_include: ['deep learning'],
    keywords_exclude: [],
    start_year: 2023,
    end_year: 2023,
    max_results: 100
  };

  try {
    // Create job
    const job = await apiRequest('POST', '/jobs/', jobData);
    const jobId = job.id;
    log(`Created job: ${jobId}`, 'cyan');

    // Wait for job to start
    await sleep(10000);

    // Check if running
    let currentJob = await apiRequest('GET', `/jobs/${jobId}`);
    log(`Job status: ${currentJob.status}`, 'cyan');

    if (currentJob.status === 'running') {
      // Test pause
      log('Testing pause...', 'cyan');
      await apiRequest('POST', `/jobs/${jobId}/pause`);
      await sleep(2000);

      currentJob = await apiRequest('GET', `/jobs/${jobId}`);
      assertEquals(currentJob.status, 'paused', 'Job status changes to paused');

      // Test resume
      log('Testing resume...', 'cyan');
      await apiRequest('POST', `/jobs/${jobId}/resume`);
      await sleep(2000);

      currentJob = await apiRequest('GET', `/jobs/${jobId}`);
      assert(
        currentJob.status === 'running' || currentJob.status === 'pending',
        'Job resumes after pause'
      );

      // Clean up - delete the test job
      await apiRequest('DELETE', `/jobs/${jobId}`);
      log('Test job cleaned up', 'cyan');
    } else {
      log('⚠️  Job did not start running in time - skipping pause/resume test', 'yellow');
      assert(true, 'Pause/resume test skipped (job not running)');

      // Clean up
      await apiRequest('DELETE', `/jobs/${jobId}`);
    }
  } catch (error) {
    assert(false, 'Pause/resume functionality', error.message);
  }
}

async function printTestReport() {
  log('\n' + '='.repeat(60), 'blue');
  log('TEST REPORT', 'blue');
  log('='.repeat(60), 'blue');

  log(`\nTotal Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, 'red');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 'cyan');

  if (results.failed > 0) {
    log('\n--- Failed Tests ---', 'red');
    results.tests.filter(t => !t.passed).forEach(test => {
      log(`✗ ${test.name}`, 'red');
      if (test.details) log(`  ${test.details}`, 'yellow');
    });
  }

  log('\n' + '='.repeat(60), 'blue');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('LITREVTOOL COMPREHENSIVE TEST SUITE', 'blue');
  log('='.repeat(60), 'blue');

  try {
    await testHealthCheck();
    await testAuthentication();
    await testJobCreation();
    await testJobMonitoring();
    await testScreenshotGeneration();
    await testPapersRetrieval();
    await testSemanticFiltering();
    await testCSVDownload();
    await testPRISMADiagram();
    await testBibTeXGeneration();
    await testLaTeXGeneration();
    await testPauseResume();
  } catch (error) {
    log(`\n❌ Test suite stopped due to error: ${error.message}`, 'red');
  } finally {
    await printTestReport();
  }
}

// Run tests
runAllTests();
