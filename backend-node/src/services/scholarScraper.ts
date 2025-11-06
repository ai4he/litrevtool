import { chromium, Browser, Page } from 'playwright';
import logger from '../core/logger';

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
}

export class ScholarScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    logger.info('Scholar scraper initialized');
  }

  async search(options: SearchOptions): Promise<Paper[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized');
    }

    const papers: Paper[] = [];
    const query = options.keywords.join(' ');
    let url = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;

    if (options.startYear && options.endYear) {
      url += `&as_ylo=${options.startYear}&as_yhi=${options.endYear}`;
    }

    logger.info(`Searching: ${url}`);

    try {
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for results
      await this.page.waitForSelector('.gs_r', { timeout: 10000 });

      // Extract papers from current page
      const extractedPapers = await this.extractPapers();
      papers.push(...extractedPapers);

      logger.info(`Found ${papers.length} papers`);

      // TODO: Implement pagination for more results
      // For now, just return first page results

      return papers;
    } catch (error) {
      logger.error('Error during search:', error);
      throw error;
    }
  }

  private async extractPapers(): Promise<Paper[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const papers = await this.page.$$eval('.gs_r.gs_or.gs_scl', (elements) => {
      return elements.map((el) => {
        const titleEl = el.querySelector('.gs_rt a');
        const title = titleEl?.textContent?.trim() || '';
        const url = (titleEl as any)?.href || '';

        const authorsEl = el.querySelector('.gs_a');
        const authorsText = authorsEl?.textContent?.trim() || '';
        const authorsParts = authorsText.split('-');
        const authors = authorsParts[0]?.trim() || '';

        // Extract year from authors line
        const yearMatch = authorsText.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;

        // Extract source/publisher
        const source = authorsParts[1]?.trim() || '';

        // Extract citations
        const citedByEl = el.querySelector('.gs_fl a');
        const citedByText = citedByEl?.textContent || '';
        const citationsMatch = citedByText.match(/Cited by (\d+)/);
        const citations = citationsMatch ? parseInt(citationsMatch[1], 10) : 0;

        // Extract abstract/snippet
        const abstractEl = el.querySelector('.gs_rs');
        const abstract = abstractEl?.textContent?.trim() || '';

        return {
          title,
          authors,
          year,
          source,
          citations,
          abstract,
          url,
        };
      });
    });

    return papers;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('Scholar scraper closed');
    }
  }
}
