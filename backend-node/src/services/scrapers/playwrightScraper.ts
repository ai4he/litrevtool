/**
 * Enhanced Playwright-based Google Scholar Scraper
 * FALLBACK 2 - Most reliable but resource-intensive
 *
 * Features Tor circuit rotation for dynamic IP changes when blocked
 */
import { chromium, Browser, Page } from 'playwright';
import logger from '../../core/logger';
import path from 'path';
import fs from 'fs';
import { rotateTorCircuit } from '../../utils/torControl';

interface Paper {
  title: string;
  authors?: string;
  year?: number;
  source?: string;
  publisher?: string;
  citations?: number;
  abstract?: string;
  url?: string;
}

export class PlaywrightScholarScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private headless: boolean;
  private useTor: boolean;
  private jobId?: string;
  private screenshotDir?: string;
  private successCount: number = 0;
  private failureCount: number = 0;
  private requestCount: number = 0; // Track requests for proactive rotation

  constructor(options: {
    headless?: boolean;
    useTor?: boolean;
    jobId?: string;
    screenshotDir?: string;
  }) {
    this.headless = options.headless !== undefined ? options.headless : true;
    this.useTor = options.useTor || false;
    this.jobId = options.jobId;
    this.screenshotDir = options.screenshotDir;
  }

  async initialize(): Promise<void> {
    const launchOptions: any = {
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security', // Help with CORS issues
        '--disable-features=IsolateOrigins,site-per-process', // Help with Scholar
      ],
    };

    // Add Tor proxy if enabled
    if (this.useTor) {
      launchOptions.proxy = {
        server: 'socks5://127.0.0.1:9050',
      };
      logger.info('Playwright: Using Tor proxy');
    }

    this.browser = await chromium.launch(launchOptions);
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    this.page = await context.newPage();

    // Hide automation indicators (script runs in browser context)
    await this.page.addInitScript(() => {
      // @ts-ignore - This runs in browser context
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      // @ts-ignore
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    logger.info('Playwright: Initialized with stealth mode');
  }

  private async takeScreenshot(label: string): Promise<void> {
    if (!this.page || !this.screenshotDir || !this.jobId) return;

    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `scraper_${this.jobId}_${label}_${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      await this.page.screenshot({ path: filepath, fullPage: true });
      logger.info(`Playwright: Screenshot saved: ${filepath}`);
    } catch (error) {
      logger.error('Playwright: Screenshot error', error);
    }
  }

  private async extractPapers(): Promise<Paper[]> {
    if (!this.page) throw new Error('Page not initialized');

    // Try multiple selectors - Google Scholar structure has changed
    let elements: any[] = [];
    const selectors = [
      '.gs_r.gs_or.gs_scl',  // Old structure (3 classes)
      '.gs_r',                // Newer structure (single class)
      '[data-cid]',          // Alternative data attribute
    ];

    for (const selector of selectors) {
      elements = await this.page.$$(selector);
      if (elements.length > 0) {
        logger.info(`Playwright: Found ${elements.length} results using selector: ${selector}`);
        break;
      }
    }

    if (elements.length === 0) {
      logger.warn('Playwright: No elements found with any selector');
      return [];
    }

    const papers = await Promise.all(elements.map(async (el) => {
      return await el.evaluate((element: any) => {
        const titleEl = element.querySelector('.gs_rt a, h3 a');
        const title = titleEl?.textContent?.trim() || '';
        const url = titleEl?.href || '';

        const authorsEl = element.querySelector('.gs_a');
        const authorsText = authorsEl?.textContent?.trim() || '';
        const authorsParts = authorsText.split('-');
        const authors = authorsParts[0]?.trim() || '';

        // Extract year
        const yearMatch = authorsText.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;

        // Extract source/publisher
        const source = authorsParts[1]?.trim() || '';
        const publisher = authorsParts[2]?.trim() || '';

        // Extract citations
        const citedByEl = element.querySelector('.gs_fl a');
        const citedByText = citedByEl?.textContent || '';
        const citationsMatch = citedByText.match(/Cited by (\d+)/);
        const citations = citationsMatch ? parseInt(citationsMatch[1], 10) : 0;

        // Extract abstract
        const abstractEl = element.querySelector('.gs_rs');
        const abstract = abstractEl?.textContent?.trim() || '';

        return {
          title,
          authors,
          year,
          source,
          publisher,
          citations,
          abstract,
          url,
        };
      });
    }));

    return papers.filter((p) => p.title);
  }

  async search(options: {
    keywords: string[];
    startYear?: number;
    endYear?: number;
    maxResults?: number;
    progressCallback?: (current: number, total: number) => void;
  }): Promise<Paper[]> {
    if (!this.page) {
      await this.initialize();
    }

    const allPapers: Paper[] = [];
    const seenTitles = new Set<string>();
    const query = options.keywords.map((kw) => (kw.includes(' ') ? `"${kw}"` : kw)).join(' ');

    logger.info(`Playwright: Searching for: ${query}`);

    // Determine years
    const years =
      options.startYear && options.endYear
        ? Array.from(
            { length: options.endYear - options.startYear + 1 },
            (_, i) => options.startYear! + i
          )
        : [null];

    for (const year of years) {
      if (options.maxResults && allPapers.length >= options.maxResults) break;

      logger.info(`Playwright: Searching year ${year || 'all'}`);

      let start = 0;
      let consecutiveEmpty = 0;

      while (true) {
        if (options.maxResults && allPapers.length >= options.maxResults) break;

        try {
          // Build URL
          let url = `https://scholar.google.com/scholar?start=${start}&q=${encodeURIComponent(query)}&hl=en`;

          if (year) {
            url += `&as_ylo=${year}&as_yhi=${year}`;
          } else if (options.startYear || options.endYear) {
            if (options.startYear) url += `&as_ylo=${options.startYear}`;
            if (options.endYear) url += `&as_yhi=${options.endYear}`;
          }

          // Proactive Tor circuit rotation (Python strategy: every 10-20 requests)
          if (this.useTor && this.requestCount > 0 && this.requestCount % 15 === 0) {
            logger.info(`Playwright: Rotating Tor circuit after ${this.requestCount} requests (proactive)`);
            try {
              await rotateTorCircuit();
            } catch (error) {
              logger.warn('Playwright: Proactive circuit rotation failed, continuing');
            }
          }

          this.requestCount++;

          // Navigate (human-like wait)
          await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

          // Human-like behavior: scroll and wait
          await this.page!.evaluate(() => {
            // @ts-ignore - Browser context
            window.scrollBy(0, window.innerHeight / 2);
          });
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

          // Take screenshot
          await this.takeScreenshot(`year_${year || 'all'}_page_${start / 10}`);

          // Check for CAPTCHA
          const content = await this.page!.content();
          if (content.toLowerCase().includes('captcha') || this.page!.url().includes('sorry')) {
            logger.warn('Playwright: CAPTCHA detected - rotating Tor circuit');
            await this.takeScreenshot('captcha');

            // Rotate Tor circuit to get new IP before failing
            if (this.useTor) {
              logger.info('Playwright: Attempting Tor circuit rotation to bypass CAPTCHA...');
              try {
                await rotateTorCircuit();
                logger.info('Playwright: New Tor IP obtained, waiting 30s before retry...');
                await new Promise((resolve) => setTimeout(resolve, 30000));
                // Don't throw error yet, let the retry mechanism handle it
              } catch (error) {
                logger.error('Playwright: Circuit rotation failed');
              }
            }

            throw new Error('CAPTCHA detected');
          }

          // Wait for results (don't require visibility - some results may be lazily loaded)
          await this.page!.waitForSelector('.gs_r', { timeout: 10000, state: 'attached' });

          // Extract papers
          const papers = await this.extractPapers();

          if (!papers.length) {
            consecutiveEmpty++;
            if (consecutiveEmpty >= 2) break;
          } else {
            consecutiveEmpty = 0;
          }

          // Deduplicate
          for (const paper of papers) {
            const titleKey = paper.title.trim().toLowerCase();
            if (titleKey && !seenTitles.has(titleKey)) {
              seenTitles.add(titleKey);
              allPapers.push(paper);

              if (options.maxResults && allPapers.length >= options.maxResults) break;
            }
          }

          logger.info(`Playwright: Collected ${allPapers.length} papers`);

          if (options.progressCallback) {
            const estimated = options.maxResults || allPapers.length * 2;
            options.progressCallback(allPapers.length, estimated);
          }

          // Pagination limit
          if (start >= 990) {
            logger.info('Playwright: Reached pagination limit');
            break;
          }

          // Rate limiting - RESEARCH-PROVEN: 45 seconds for 3+ days uninterrupted scraping
          // Community consensus: 45s avoids ALL CAPTCHAs and rate limits
          // See docs/GOOGLE_SCHOLAR_SCRAPING_RESEARCH.md for evidence
          const delay = 45000; // 45 seconds (proven successful)
          logger.info(`Playwright: Waiting ${delay / 1000}s before next page (research-proven delay)...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          start += 10;
        } catch (error: any) {
          logger.error(`Playwright: Error on page ${start}`, error);

          // Rotate circuit on errors if using Tor
          if (this.useTor) {
            logger.info('Playwright: Rotating Tor circuit after error...');
            try {
              await rotateTorCircuit();
            } catch (rotError) {
              logger.warn('Playwright: Circuit rotation failed after error');
            }
          }

          if (error.message?.toLowerCase().includes('captcha')) {
            // CAPTCHA after circuit rotation - give up
            logger.error('Playwright: CAPTCHA persists after rotation - failing strategy');
            throw error;
          }

          start += 10;
          // Wait 2 minutes after errors (research-proven recovery time)
          logger.info('Playwright: Waiting 2 minutes after error (recovery time)...');
          await new Promise((resolve) => setTimeout(resolve, 120000));
        }
      }

      // Wait 60 seconds between years to allow Tor circuit rotation
      const yearIndex = years.findIndex(y => y === year);
      if (year && yearIndex >= 0 && yearIndex < years.length - 1) {
        logger.info('Playwright: Waiting 60s for Tor circuit rotation before next year...');
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }

    logger.info(`Playwright: Search complete - ${allPapers.length} papers found`);
    this.successCount++;
    return allPapers;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('Playwright: Closed');
    }
  }

  getStats() {
    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
    };
  }
}
