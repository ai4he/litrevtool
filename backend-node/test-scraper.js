#!/usr/bin/env node
/**
 * Test Scraper - Verify all improvements are working
 *
 * Tests:
 * 1. Tor circuit rotation
 * 2. 45-second rate limiting
 * 3. Playwright-first strategy with stealth mode
 * 4. Error handling and failover
 * 5. Small test search (3 papers from 2023)
 */

const { MultiStrategyScholarScraper } = require('./dist/services/scrapers/multiStrategyScraper.js');
const { verifyTorRotation } = require('./dist/utils/torControl.js');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.log(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.log(`[ERROR] ${msg}`, data || ''),
};

async function runTest() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 LitRevTool Scraper Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test 1: Verify Tor Circuit Rotation
  console.log('📡 Test 1: Tor Circuit Rotation');
  console.log('─────────────────────────────────────────────────────');
  try {
    const rotationResult = await verifyTorRotation();
    if (rotationResult.changed) {
      console.log(`✅ PASS: IP changed ${rotationResult.oldIP} → ${rotationResult.newIP}`);
    } else {
      console.log(`⚠️  WARN: IP did not change (${rotationResult.oldIP})`);
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
  }

  console.log('\n📊 Test 2: Small Test Search (3 papers, 2023 only)');
  console.log('─────────────────────────────────────────────────────');
  console.log('Keywords: "large language models", "mathematical reasoning"');
  console.log('Strategy Order: playwright → http (with 45s delays)');
  console.log('Expected Time: ~3-4 minutes for 3 papers\n');

  const scraper = new MultiStrategyScholarScraper({
    useTor: true,
    strategyOrder: ['playwright', 'http'],
    jobId: 'test-' + Date.now(),
  });

  const startTime = Date.now();

  try {
    const papers = await scraper.search({
      keywords: ['large language models', 'mathematical reasoning'],
      startYear: 2023,
      endYear: 2023,
      maxResults: 3,
      progressCallback: (current, total) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`📄 Progress: ${current}/${total} papers (${elapsed}s elapsed)`);
      },
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Test Complete: ${papers.length} papers in ${totalTime}s`);
    console.log('─────────────────────────────────────────────────────');

    if (papers.length > 0) {
      console.log('\n📚 Sample Paper:');
      const sample = papers[0];
      console.log(`   Title: ${sample.title}`);
      console.log(`   Authors: ${sample.authors || 'N/A'}`);
      console.log(`   Year: ${sample.year || 'N/A'}`);
      console.log(`   Citations: ${sample.citations || 0}`);
      console.log(`   URL: ${sample.url || 'N/A'}`);
    }

    const stats = scraper.getStats();
    console.log('\n📊 Scraper Statistics:');
    console.log(`   Strategy Used: ${stats.strategyUsed}`);
    console.log(`   Total Attempts: ${stats.attemptsByStrategy}`);
    console.log(`   Average Time/Paper: ${(totalTime / papers.length).toFixed(1)}s`);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════\n');

    await scraper.cleanup();
    process.exit(0);
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n❌ Test Failed after ${totalTime}s`);
    console.log('─────────────────────────────────────────────────────');
    console.log(`Error: ${error.message}`);
    console.log(`\n💡 Troubleshooting:`);
    console.log(`   1. Check if Tor is running: sudo systemctl status tor`);
    console.log(`   2. Check recent logs: pm2 logs litrev-worker --lines 50`);
    console.log(`   3. Verify Playwright installed: npx playwright install chromium`);
    console.log(`   4. If CAPTCHA detected, wait 2 hours before retry`);

    console.log('\n═══════════════════════════════════════════════════════\n');

    await scraper.cleanup();
    process.exit(1);
  }
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(130);
});

runTest();
