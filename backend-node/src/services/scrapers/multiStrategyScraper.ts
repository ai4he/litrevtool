/**
 * Multi-Strategy Google Scholar Scraper
 * Automatically tries multiple scraping approaches with intelligent fallback
 */
import { HttpScholarScraper } from './httpScraper';
import { PlaywrightScholarScraper } from './playwrightScraper';
import logger from '../../core/logger';

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

interface SearchOptions {
  keywords: string[];
  startYear?: number;
  endYear?: number;
  maxResults?: number;
  progressCallback?: (current: number, total: number) => void;
  papersCallback?: (papers: Paper[]) => void;
}

interface StrategyStats {
  successCount: number;
  failureCount: number;
  successRate: number;
}

abstract class ScraperStrategy {
  name: string;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  abstract search(options: SearchOptions): Promise<Paper[]>;
  abstract isAvailable(): boolean;

  getSuccessRate(): number {
    const total = this.successCount + this.failureCount;
    return total === 0 ? 1.0 : this.successCount / total;
  }

  getStats(): StrategyStats {
    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.getSuccessRate(),
    };
  }
}

class HttpStrategy extends ScraperStrategy {
  private scraper: HttpScholarScraper;

  constructor(useTor: boolean = false) {
    super('HTTP');
    this.scraper = new HttpScholarScraper(useTor);
  }

  isAvailable(): boolean {
    return true;
  }

  async search(options: SearchOptions): Promise<Paper[]> {
    try {
      logger.info('HTTP Strategy: Starting search');
      const results = await this.scraper.search({
        keywords: options.keywords,
        startYear: options.startYear,
        endYear: options.endYear,
        maxResults: options.maxResults,
      });

      // Call callbacks incrementally
      if (options.papersCallback && results.length > 0) {
        options.papersCallback(results);
      }

      if (options.progressCallback) {
        options.progressCallback(results.length, options.maxResults || results.length);
      }

      this.successCount++;
      return results;
    } catch (error) {
      this.failureCount++;
      throw error;
    }
  }
}

class PlaywrightStrategy extends ScraperStrategy {
  private headless: boolean;
  private useTor: boolean;
  private jobId?: string;
  private screenshotDir?: string;

  constructor(options: {
    headless?: boolean;
    useTor?: boolean;
    jobId?: string;
    screenshotDir?: string;
  }) {
    super('Playwright');
    this.headless = options.headless !== undefined ? options.headless : true;
    this.useTor = options.useTor || false;
    this.jobId = options.jobId;
    this.screenshotDir = options.screenshotDir;
  }

  isAvailable(): boolean {
    return true;
  }

  async search(options: SearchOptions): Promise<Paper[]> {
    const scraper = new PlaywrightScholarScraper({
      headless: this.headless,
      useTor: this.useTor,
      jobId: this.jobId,
      screenshotDir: this.screenshotDir,
    });

    try {
      logger.info('Playwright Strategy: Starting search');
      await scraper.initialize();

      const results = await scraper.search({
        keywords: options.keywords,
        startYear: options.startYear,
        endYear: options.endYear,
        maxResults: options.maxResults,
        progressCallback: options.progressCallback,
      });

      // Call papers callback
      if (options.papersCallback && results.length > 0) {
        options.papersCallback(results);
      }

      this.successCount++;
      return results;
    } catch (error) {
      this.failureCount++;
      throw error;
    } finally {
      await scraper.close();
    }
  }
}

export class MultiStrategyScholarScraper {
  private strategies: Map<string, ScraperStrategy>;
  private strategyOrder: string[];
  private useTor: boolean;
  private headless: boolean;
  private jobId?: string;
  private screenshotDir?: string;

  constructor(options: {
    useTor?: boolean;
    headless?: boolean;
    jobId?: string;
    screenshotDir?: string;
    strategyOrder?: string[];
  } = {}) {
    this.useTor = options.useTor || false;
    this.headless = options.headless !== undefined ? options.headless : true;
    this.jobId = options.jobId;
    this.screenshotDir = options.screenshotDir;

    // Initialize strategies
    this.strategies = new Map();

    // HTTP strategy (FALLBACK 1)
    this.strategies.set('http', new HttpStrategy(this.useTor));

    // Playwright strategy (FALLBACK 2)
    this.strategies.set(
      'playwright',
      new PlaywrightStrategy({
        headless: this.headless,
        useTor: this.useTor,
        jobId: this.jobId,
        screenshotDir: this.screenshotDir,
      })
    );

    // Strategy order (default: HTTP first, then Playwright as fallback)
    this.strategyOrder = options.strategyOrder || ['http', 'playwright'];

    // Filter out unavailable strategies
    this.strategyOrder = this.strategyOrder.filter((name) => {
      const strategy = this.strategies.get(name);
      return strategy && strategy.isAvailable();
    });

    logger.info(`MultiStrategy: Initialized with strategies: [${this.strategyOrder.join(', ')}]`);
  }

  async search(options: SearchOptions): Promise<Paper[]> {
    let lastException: Error | null = null;
    let strategyIndex = 0;

    for (const strategyName of this.strategyOrder) {
      strategyIndex++;
      const strategy = this.strategies.get(strategyName);

      if (!strategy) continue;

      logger.info(
        `MultiStrategy: Trying strategy ${strategyIndex}/${this.strategyOrder.length}: ${strategyName}`
      );

      try {
        const results = await strategy.search(options);

        if (results && results.length > 0) {
          logger.info(
            `MultiStrategy: ✓ ${strategyName} succeeded with ${results.length} papers (success rate: ${(strategy.getSuccessRate() * 100).toFixed(1)}%)`
          );
          return results;
        } else {
          logger.warn(
            `MultiStrategy: ${strategyName} returned no results, trying next strategy...`
          );
          lastException = new Error(`${strategyName} returned no results`);
          continue;
        }
      } catch (error: any) {
        logger.warn(`MultiStrategy: ✗ ${strategyName} failed: ${error.message}`);
        lastException = error;

        // LESSON LEARNED: Python switched faster on CAPTCHA (3s) than other errors (5s)
        // This allows faster failover to Playwright when HTTP is blocked
        const isCaptchaOrBlock =
          error.message?.toLowerCase().includes('captcha') ||
          error.message?.includes('403') ||
          error.message?.includes('429');

        const waitTime = isCaptchaOrBlock ? 3000 : 5000;
        logger.info(
          `MultiStrategy: ${isCaptchaOrBlock ? 'CAPTCHA/Block detected' : 'Error detected'}, waiting ${waitTime / 1000}s before trying next strategy...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
    }

    // All strategies failed
    logger.error('MultiStrategy: All strategies failed');
    throw lastException || new Error('All scraping strategies failed');
  }

  getStrategyStats(): Record<string, StrategyStats> {
    const stats: Record<string, StrategyStats> = {};
    this.strategies.forEach((strategy, name) => {
      stats[name] = strategy.getStats();
    });
    return stats;
  }
}
