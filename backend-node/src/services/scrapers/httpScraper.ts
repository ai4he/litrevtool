/**
 * HTTP-based Google Scholar Scraper using Axios + Cheerio
 * FALLBACK 1 - Lightweight and fast with user agent rotation
 */
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { SocksProxyAgent } from 'socks-proxy-agent';
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

interface ScraperStats {
  successCount: number;
  failureCount: number;
  captchaCount: number;
}

export class HttpScholarScraper {
  private client: AxiosInstance;
  private stats: ScraperStats;
  private lastRequestTime: number;
  private userAgents: string[];
  private useTor: boolean;

  constructor(useTor: boolean = false) {
    this.useTor = useTor;
    this.stats = {
      successCount: 0,
      failureCount: 0,
      captchaCount: 0,
    };
    this.lastRequestTime = 0;

    // Common user agents
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    ];

    // Setup axios instance
    const config: any = {
      timeout: 30000,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    };

    // Add Tor proxy if enabled
    if (useTor) {
      try {
        const agent = new SocksProxyAgent('socks5://127.0.0.1:9050');
        config.httpAgent = agent;
        config.httpsAgent = agent;
        logger.info('HTTP Scraper: Using Tor proxy on 127.0.0.1:9050');
      } catch (error) {
        logger.warn('HTTP Scraper: Could not configure Tor proxy', error);
        this.useTor = false;
      }
    }

    this.client = axios.create(config);
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    if (this.lastRequestTime > 0) {
      const timeSinceLastadded = now - this.lastRequestTime;
      const minDelay = 5000 + Math.random() * 5000; // 5-10 seconds

      if (timeSinceLastadded < minDelay) {
        const waitTime = minDelay - timeSinceLastadded;
        logger.debug(`HTTP Scraper: Rate limit delay ${(waitTime / 1000).toFixed(2)}s`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    this.lastRequestTime = Date.now();
  }

  private async fetchPage(url: string): Promise<string> {
    await this.rateLimit();

    // Rotate user agent
    this.client.defaults.headers['User-Agent'] = this.getRandomUserAgent();

    logger.info(`HTTP Scraper: Fetching ${url}`);

    const response = await this.client.get(url);

    // Check for CAPTCHA
    const text = response.data.toString();
    if (
      response.request.res.responseUrl.toLowerCase().includes('sorry') ||
      text.toLowerCase().includes('captcha')
    ) {
      this.stats.captchaCount++;
      logger.warn(`HTTP Scraper: CAPTCHA detected! (count: ${this.stats.captchaCount}/3)`);

      if (this.stats.captchaCount >= 3) {
        throw new Error(`CAPTCHA detected ${this.stats.captchaCount} times - HTTP strategy failed`);
      }
      throw new Error('CAPTCHA detected');
    }

    // Reset CAPTCHA counter on success
    if (this.stats.captchaCount > 0) {
      logger.info(`HTTP Scraper: Success, resetting CAPTCHA counter`);
      this.stats.captchaCount = 0;
    }

    // Human-like delay
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));

    return text;
  }

  private parseResults(html: string): Paper[] {
    const $ = cheerio.load(html);
    const papers: Paper[] = [];

    $('.gs_r.gs_or.gs_scl').each((_, elem) => {
      try {
        const paper: Paper = {
          title: '',
          citations: 0,
        };

        // Title and URL
        const titleElem = $(elem).find('h3.gs_rt');
        const link = titleElem.find('a');
        if (link.length) {
          paper.title = link.text().trim();
          paper.url = link.attr('href') || '';
        } else {
          paper.title = titleElem.text().trim();
        }

        if (!paper.title) return;

        // Authors, source, year
        const authorElem = $(elem).find('.gs_a');
        if (authorElem.length) {
          const authorText = authorElem.text();
          const parts = authorText.split('-');

          if (parts.length >= 1) {
            paper.authors = parts[0].trim();
          }
          if (parts.length >= 2) {
            paper.source = parts[1].trim();
          }
          if (parts.length >= 3) {
            const yearMatch = parts[2].match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              paper.year = parseInt(yearMatch[0], 10);
            }
            paper.publisher = parts[2].trim();
          }
        }

        // Abstract
        const abstractElem = $(elem).find('.gs_rs');
        if (abstractElem.length) {
          paper.abstract = abstractElem.text().trim();
        }

        // Citations
        const citeElem = $(elem).find('.gs_fl a:contains("Cited by")');
        if (citeElem.length) {
          const citeText = citeElem.text();
          const citeMatch = citeText.match(/\d+/);
          if (citeMatch) {
            paper.citations = parseInt(citeMatch[0], 10);
          }
        }

        papers.push(paper);
      } catch (error) {
        logger.error('HTTP Scraper: Error parsing result', error);
      }
    });

    return papers;
  }

  async search(options: {
    keywords: string[];
    startYear?: number;
    endYear?: number;
    maxResults?: number;
  }): Promise<Paper[]> {
    const allPapers: Paper[] = [];
    const seenTitles = new Set<string>();

    // Build query
    const query = options.keywords
      .map((kw) => (kw.includes(' ') ? `"${kw}"` : kw))
      .join(' ');

    logger.info(`HTTP Scraper: Searching for: ${query}`);

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

      logger.info(`HTTP Scraper: Searching year ${year || 'all'}`);

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

          // Fetch and parse
          const html = await this.fetchPage(url);
          const papers = this.parseResults(html);

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

          logger.info(`HTTP Scraper: Collected ${allPapers.length} papers`);

          // Pagination limit
          if (start >= 990) {
            logger.info('HTTP Scraper: Reached pagination limit');
            break;
          }

          start += 10;
        } catch (error: any) {
          logger.error(`HTTP Scraper: Error fetching page ${start}`, error);
          if (error.message?.toLowerCase().includes('captcha')) {
            throw error; // Fail immediately on CAPTCHA
          }
          start += 10;
          await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait longer after error
        }
      }
    }

    logger.info(`HTTP Scraper: Search complete - ${allPapers.length} papers found`);
    this.stats.successCount++;
    return allPapers;
  }

  getStats(): ScraperStats {
    return { ...this.stats };
  }
}
