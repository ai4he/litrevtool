/**
 * Enhanced Playwright-based Google Scholar Scraper
 * FALLBACK 2 - Most reliable but resource-intensive
 */
import { chromium, Browser, Page } from 'playwright';
import logger from '../../core/logger';
import path from 'path';
import fs from 'fs';

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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    };

    // Add Tor proxy if enabled
    if (this.useTor) {
      launchOptions.proxy = {
        server: 'socks5://127.0.0.1:9050',
      };
      logger.info('Playwright: Using Tor proxy');
    }

    this.browser = await chromium.launch(launchOptions);
    this.page = await this.browser.newPage();

    // Set realistic viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Set user agent
    await this.page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    logger.info('Playwright: Initialized');
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

    const papers = await this.page.$$eval('.gs_r.gs_or.gs_scl', (elements) => {
      return elements.map((el) => {
        const titleEl = el.querySelector('.gs_rt a');
        const title = titleEl?.textContent?.trim() || '';
        const url = (titleEl as any)?.href || '';

        const authorsEl = el.querySelector('.gs_a');
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
        const citedByEl = el.querySelector('.gs_fl a');
        const citedByText = citedByEl?.textContent || '';
        const citationsMatch = citedByText.match(/Cited by (\d+)/);
        const citations = citationsMatch ? parseInt(citationsMatch[1], 10) : 0;

        // Extract abstract
        const abstractEl = el.querySelector('.gs_rs');
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
    });

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

          // Navigate
          await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

          // Take screenshot
          await this.takeScreenshot(`year_${year || 'all'}_page_${start / 10}`);

          // Check for CAPTCHA
          const content = await this.page!.content();
          if (content.toLowerCase().includes('captcha') || this.page!.url().includes('sorry')) {
            logger.warn('Playwright: CAPTCHA detected');
            await this.takeScreenshot('captcha');
            throw new Error('CAPTCHA detected');
          }

          // Wait for results
          await this.page!.waitForSelector('.gs_r', { timeout: 10000 });

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

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));

          start += 10;
        } catch (error: any) {
          logger.error(`Playwright: Error on page ${start}`, error);
          if (error.message?.toLowerCase().includes('captcha')) {
            throw error;
          }
          start += 10;
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
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
