/**
 * HTTP-based Google Scholar Scraper using Axios + Cheerio
 * FALLBACK 1 - Lightweight and fast with user agent rotation
 *
 * Features Tor circuit rotation for dynamic IP changes when blocked
 */
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { SocksProxyAgent } from 'socks-proxy-agent';
import logger from '../../core/logger';
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

interface ScraperStats {
  successCount: number;
  failureCount: number;
  captchaCount: number;
  errorCount: number;
  consecutiveErrors: number;
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
      errorCount: 0,
      consecutiveErrors: 0,
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
      // RESEARCH-PROVEN: 45 seconds for Google Scholar scraping
      // Community reports: 3+ days uninterrupted scraping with 45s delays
      // See docs/GOOGLE_SCHOLAR_SCRAPING_RESEARCH.md
      const minDelay = 45000; // 45 seconds (proven successful)

      if (timeSinceLastadded < minDelay) {
        const waitTime = minDelay - timeSinceLastadded;
        logger.info(`HTTP Scraper: Rate limit delay ${(waitTime / 1000).toFixed(1)}s (research-proven)`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    this.lastRequestTime = Date.now();
  }

  private async fetchPage(url: string, retryCount: number = 0): Promise<string> {
    const MAX_ROTATION_RETRIES = 10; // Try up to 10 different Tor circuits

    await this.rateLimit();

    // Rotate user agent
    this.client.defaults.headers['User-Agent'] = this.getRandomUserAgent();

    logger.info(`HTTP Scraper: Fetching ${url} (rotation attempt ${retryCount}/${MAX_ROTATION_RETRIES})`);

    const response = await this.client.get(url);

    // Check for CAPTCHA or blocking
    const text = response.data.toString();
    const textLower = text.toLowerCase();
    const urlLower = response.request.res.responseUrl.toLowerCase();

    const isBlocked =
      urlLower.includes('sorry') ||
      textLower.includes('captcha') ||
      textLower.includes('automated queries') ||
      textLower.includes("we're sorry") ||
      textLower.includes('<title>sorry');

    if (isBlocked) {
      logger.warn(
        `HTTP Scraper: Blocking detected! Attempt ${retryCount + 1}/${MAX_ROTATION_RETRIES}`
      );

      // Try rotating Tor circuit instead of failing immediately
      if (this.useTor && retryCount < MAX_ROTATION_RETRIES) {
        logger.info(`HTTP Scraper: 🔄 Rotating Tor circuit (attempt ${retryCount + 1}/${MAX_ROTATION_RETRIES})...`);

        try {
          await rotateTorCircuit();
          logger.info(`HTTP Scraper: ✅ New IP obtained, retrying request...`);

          // Wait 10 seconds for circuit to stabilize (not 45s - we're being aggressive)
          await new Promise((resolve) => setTimeout(resolve, 10000));

          // Recursive retry with new circuit
          return await this.fetchPage(url, retryCount + 1);
        } catch (rotError) {
          logger.error(`HTTP Scraper: ❌ Circuit rotation ${retryCount + 1} failed, trying again...`);

          // Still try next rotation
          if (retryCount + 1 < MAX_ROTATION_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return await this.fetchPage(url, retryCount + 1);
          }
        }
      }

      // Only fail after exhausting all rotation attempts
      if (retryCount >= MAX_ROTATION_RETRIES) {
        throw new Error(
          `Blocking persists after ${MAX_ROTATION_RETRIES} Tor circuit rotations - switching strategy`
        );
      }

      throw new Error('Blocking/CAPTCHA detected');
    }

    // Reset counters on success
    if (this.stats.captchaCount > 0 || this.stats.consecutiveErrors > 0) {
      logger.info(
        `HTTP Scraper: ✅ Success after ${retryCount} rotation(s)! Resetting counters.`
      );
      this.stats.captchaCount = 0;
      this.stats.consecutiveErrors = 0;
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
    progressCallback?: (current: number, total: number) => void | Promise<void>;
    papersCallback?: (papers: Paper[]) => void | Promise<void>;
    statusCallback?: (message: string) => void | Promise<void>;
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

      if (options.statusCallback) {
        const yearText = year !== null ? `year ${year}` : 'all years';
        await options.statusCallback(`🌐 HTTP scraping ${yearText} | Papers collected: ${allPapers.length}`);
      }

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

          if (options.statusCallback) {
            const yearText = year !== null ? `year ${year}` : 'all years';
            const pageNum = start / 10 + 1;
            await options.statusCallback(
              `🔍 Fetching ${yearText}, page ${pageNum} | Papers: ${allPapers.length} | Next: Random delay (2-4s) then page ${pageNum + 1}`
            );
          }

          // Fetch and parse
          const html = await this.fetchPage(url);
          const papers = this.parseResults(html);

          if (!papers.length) {
            consecutiveEmpty++;
            if (consecutiveEmpty >= 5) {
              logger.info('HTTP Scraper: 5 consecutive empty pages - end of results');
              break;
            }
          } else {
            consecutiveEmpty = 0;
          }

          // Deduplicate and collect new papers from this page
          const newPapers: Paper[] = [];
          for (const paper of papers) {
            const titleKey = paper.title.trim().toLowerCase();
            if (titleKey && !seenTitles.has(titleKey)) {
              seenTitles.add(titleKey);
              allPapers.push(paper);
              newPapers.push(paper);

              if (options.maxResults && allPapers.length >= options.maxResults) break;
            }
          }

          logger.info(`HTTP Scraper: Collected ${allPapers.length} papers`);

          // Report incremental progress
          if (newPapers.length > 0) {
            if (options.papersCallback) {
              await options.papersCallback(newPapers);
            }
            if (options.progressCallback) {
              await options.progressCallback(allPapers.length, options.maxResults || allPapers.length * 2);
            }
          }

          // Pagination limit
          if (start >= 990) {
            logger.info('HTTP Scraper: Reached pagination limit');
            break;
          }

          start += 10;
        } catch (error: any) {
          logger.error(`HTTP Scraper: Error fetching page ${start}`, error);

          // Track consecutive errors (LESSON LEARNED from Python)
          this.stats.consecutiveErrors++;
          this.stats.errorCount++;

          // Fail immediately on CAPTCHA
          if (error.message?.toLowerCase().includes('captcha')) {
            logger.error(
              `HTTP Scraper: CAPTCHA error (consecutive: ${this.stats.consecutiveErrors}) - failing strategy`
            );
            throw error;
          }

          // On 403 Forbidden - try rotating Tor circuit first
          if (error.response?.status === 403 || error.status === 403) {
            logger.error(
              `HTTP Scraper: 403 Forbidden (consecutive: ${this.stats.consecutiveErrors}) - blocked by Google Scholar`
            );

            if (this.useTor) {
              logger.info('HTTP Scraper: Attempting Tor circuit rotation to bypass 403...');
              try {
                await rotateTorCircuit();
                logger.info('HTTP Scraper: New IP obtained, continuing with 45s delay');
                await new Promise((resolve) => setTimeout(resolve, 45000));
                // Continue to next iteration instead of throwing
                start += 10;
                continue;
              } catch (rotError) {
                logger.error('HTTP Scraper: Circuit rotation failed, failing over');
              }
            }

            throw new Error(
              `HTTP Scraper blocked by Google Scholar (403 Forbidden) - failing over to browser strategy`
            );
          }

          // On 429 Rate Limited - rotate circuit and slow down
          if (error.response?.status === 429 || error.status === 429) {
            logger.error(
              `HTTP Scraper: 429 Rate Limited (consecutive: ${this.stats.consecutiveErrors}) - too many requests`
            );

            if (this.useTor) {
              logger.info('HTTP Scraper: Attempting Tor circuit rotation to bypass 429...');
              try {
                await rotateTorCircuit();
                logger.info('HTTP Scraper: New IP obtained, waiting 60s before retry');
                await new Promise((resolve) => setTimeout(resolve, 60000));
                // Continue to next iteration instead of throwing
                start += 10;
                continue;
              } catch (rotError) {
                logger.error('HTTP Scraper: Circuit rotation failed, failing over');
              }
            }

            throw new Error(`HTTP Scraper rate limited (429) - failing over to browser strategy`);
          }

          // LESSON LEARNED: Fail after 5 consecutive errors (not total)
          if (this.stats.consecutiveErrors >= 5) {
            logger.error(
              `HTTP Scraper: Too many consecutive errors (${this.stats.consecutiveErrors}) - failing strategy`
            );
            throw new Error(
              `HTTP Scraper: ${this.stats.consecutiveErrors} consecutive errors - failing over`
            );
          }

          // LESSON LEARNED: Wait 20 seconds after errors (Python used 15, we go slower)
          logger.warn(
            `HTTP Scraper: Error ${this.stats.consecutiveErrors}/5, waiting 20s before retry...`
          );
          start += 10;
          await new Promise((resolve) => setTimeout(resolve, 20000));
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
