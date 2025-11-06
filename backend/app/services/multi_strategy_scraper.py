"""
Multi-Strategy Google Scholar Scraper

This module implements a robust Google Scholar scraping system that uses multiple
strategies in parallel/sequential order to maximize success rate and minimize blocks.

Strategies implemented:
1. Scholarly Library - Uses the scholarly Python library with Tor support (PRIMARY)
2. Direct Requests - Lightweight requests with user agent rotation (FALLBACK 1)
3. Playwright Browser - Full browser automation with stealth (FALLBACK 2 - existing)

Based on research from successful GitHub projects:
- scholarly: https://github.com/scholarly-python-package/scholarly
- scholar.py: https://github.com/ckreibich/scholar.py
- Various BeautifulSoup-based scrapers with ethical rate limiting
"""

import time
import logging
import random
from typing import List, Dict, Optional, Callable
from abc import ABC, abstractmethod
from datetime import datetime
import re

# Import for scholarly strategy
try:
    from scholarly import scholarly, ProxyGenerator
    SCHOLARLY_AVAILABLE = True
except ImportError:
    SCHOLARLY_AVAILABLE = False
    logging.warning("scholarly library not available")

# Import for requests strategy
import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Import existing Playwright scraper
from app.services.scholar_scraper import GoogleScholarScraper

logger = logging.getLogger(__name__)


class ScraperStrategy(ABC):
    """Abstract base class for scraping strategies."""

    def __init__(self, name: str):
        self.name = name
        self.success_count = 0
        self.failure_count = 0

    @abstractmethod
    def search(
        self,
        keywords_include: List[str],
        keywords_exclude: List[str],
        start_year: Optional[int],
        end_year: Optional[int],
        max_results: Optional[int],
        progress_callback: Optional[Callable],
        papers_callback: Optional[Callable]
    ) -> List[Dict]:
        """Execute search using this strategy."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this strategy can be used."""
        pass

    def get_success_rate(self) -> float:
        """Calculate success rate for this strategy."""
        total = self.success_count + self.failure_count
        if total == 0:
            return 1.0
        return self.success_count / total


class ScholarlyStrategy(ScraperStrategy):
    """
    Strategy using the scholarly library with Tor support.

    This is the PRIMARY strategy as scholarly is specifically designed to
    avoid CAPTCHAs and handle Google Scholar's anti-scraping measures.
    """

    def __init__(self, use_tor: bool = True):
        super().__init__("Scholarly")
        self.use_tor = use_tor
        self.initialized = False

    def _init_scholarly(self):
        """Initialize scholarly with proxy settings."""
        if self.initialized or not SCHOLARLY_AVAILABLE:
            return

        try:
            if self.use_tor:
                # Check if Tor is running
                try:
                    pg = ProxyGenerator()
                    pg.Tor_External(tor_sock_port=9050, tor_control_port=9051, tor_password="")
                    scholarly.use_proxy(pg)
                    logger.info("Scholarly: Tor proxy configured successfully")
                except Exception as e:
                    logger.warning(f"Scholarly: Could not configure Tor, using direct connection: {e}")

            self.initialized = True

        except Exception as e:
            logger.error(f"Scholarly: Initialization failed: {e}")
            raise

    def is_available(self) -> bool:
        """Check if scholarly library is available."""
        return SCHOLARLY_AVAILABLE

    def _build_query(self, keywords_include: List[str], keywords_exclude: List[str]) -> str:
        """Build search query string."""
        # Add include keywords
        query_parts = []
        for kw in keywords_include:
            if ' ' in kw:
                query_parts.append(f'"{kw}"')
            else:
                query_parts.append(kw)

        query = ' '.join(query_parts)

        # Add exclude keywords
        if keywords_exclude:
            for kw in keywords_exclude:
                if ' ' in kw:
                    query += f' -"{kw}"'
                else:
                    query += f' -{kw}'

        return query

    def search(
        self,
        keywords_include: List[str],
        keywords_exclude: List[str],
        start_year: Optional[int],
        end_year: Optional[int],
        max_results: Optional[int],
        progress_callback: Optional[Callable],
        papers_callback: Optional[Callable]
    ) -> List[Dict]:
        """Search using scholarly library."""
        try:
            self._init_scholarly()

            all_papers = []
            seen_titles = set()

            # Build query
            query = self._build_query(keywords_include, keywords_exclude)
            logger.info(f"Scholarly: Searching for: {query}")

            # Determine year range
            if start_year and end_year:
                years = list(range(start_year, end_year + 1))
                logger.info(f"Scholarly: Searching {len(years)} years individually")
            else:
                years = [None]

            for year in years:
                if max_results and len(all_papers) >= max_results:
                    break

                year_query = query
                if year:
                    year_query += f" after:{year-1} before:{year+1}"
                    logger.info(f"Scholarly: Searching year {year}")

                try:
                    # Search with scholarly
                    search_results = scholarly.search_pubs(year_query)

                    # Iterate through results
                    for i, result in enumerate(search_results):
                        if max_results and len(all_papers) >= max_results:
                            break

                        try:
                            # Extract paper info
                            paper = self._extract_paper_info(result)

                            # Filter year if specified
                            if year and paper.get('year') and paper['year'] != year:
                                continue

                            # Deduplicate
                            title = paper.get('title', '').strip().lower()
                            if title and title not in seen_titles:
                                seen_titles.add(title)
                                all_papers.append(paper)

                                # Save incrementally
                                if papers_callback:
                                    papers_callback([paper])

                                # Update progress
                                if progress_callback:
                                    estimated_total = max_results if max_results else len(all_papers) * 2
                                    progress_callback(len(all_papers), estimated_total)

                                logger.info(f"Scholarly: Collected {len(all_papers)} papers")

                        except StopIteration:
                            break
                        except Exception as e:
                            logger.warning(f"Scholarly: Error extracting paper: {e}")
                            continue

                        # Rate limiting - scholarly handles most of this, but add small delay
                        time.sleep(random.uniform(1, 2))

                except Exception as e:
                    logger.error(f"Scholarly: Error searching year {year}: {e}")
                    continue

            logger.info(f"Scholarly: Search complete - {len(all_papers)} papers found")
            self.success_count += 1
            return all_papers

        except Exception as e:
            logger.error(f"Scholarly: Strategy failed: {e}")
            self.failure_count += 1
            raise

    def _extract_paper_info(self, result: Dict) -> Dict:
        """Extract paper information from scholarly result."""
        paper = {}

        # Title
        paper['title'] = result.get('bib', {}).get('title', '')

        # Authors
        authors = result.get('bib', {}).get('author', [])
        if isinstance(authors, list):
            paper['authors'] = ', '.join(authors)
        else:
            paper['authors'] = str(authors)

        # Year
        year = result.get('bib', {}).get('pub_year')
        if year:
            try:
                paper['year'] = int(year)
            except:
                pass

        # Source/venue
        paper['source'] = result.get('bib', {}).get('venue', '')

        # Publisher
        paper['publisher'] = result.get('bib', {}).get('publisher', '')

        # Abstract
        paper['abstract'] = result.get('bib', {}).get('abstract', '')

        # URL
        paper['url'] = result.get('pub_url', '') or result.get('eprint_url', '')

        # Citations
        paper['citations'] = result.get('num_citations', 0)

        return paper


class RequestsStrategy(ScraperStrategy):
    """
    Strategy using direct HTTP requests with BeautifulSoup.

    This is FALLBACK 1 - lightweight and fast, uses rotating user agents
    and ethical rate limiting based on successful GitHub projects.
    """

    def __init__(self, use_tor: bool = True):
        super().__init__("Requests")
        self.ua = UserAgent()
        self.session = None
        self.request_count = 0
        self.last_request_time = 0
        self.use_tor = use_tor

    def is_available(self) -> bool:
        """Requests strategy is always available."""
        return True

    def _init_session(self):
        """Initialize requests session with headers and Tor proxy if enabled."""
        if self.session:
            return

        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })

        # Add Tor proxy if enabled
        if self.use_tor:
            try:
                self.session.proxies = {
                    'http': 'socks5://127.0.0.1:9050',
                    'https': 'socks5://127.0.0.1:9050'
                }
                logger.info("Requests: Using Tor proxy on 127.0.0.1:9050")
            except Exception as e:
                logger.warning(f"Requests: Could not configure Tor proxy: {e}")
                self.use_tor = False

    def _get_user_agent(self) -> str:
        """Get a rotating user agent."""
        return self.ua.random

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        retry=retry_if_exception_type((requests.RequestException, ConnectionError))
    )
    def _fetch_page(self, url: str) -> str:
        """Fetch a single page with retry logic."""
        self._init_session()

        # Rate limiting - 1-2 requests per second max, but we go slower
        current_time = time.time()
        if self.last_request_time > 0:
            time_since_last = current_time - self.last_request_time
            min_delay = random.uniform(5, 10)  # Slower than Playwright
            if time_since_last < min_delay:
                wait_time = min_delay - time_since_last
                logger.info(f"Requests: Rate limit delay {wait_time:.2f}s")
                time.sleep(wait_time)

        self.request_count += 1
        self.last_request_time = time.time()

        # Rotate user agent
        self.session.headers['User-Agent'] = self._get_user_agent()

        logger.info(f"Requests: Fetching {url} (request #{self.request_count})")

        response = self.session.get(url, timeout=30)
        response.raise_for_status()

        # Check for blocking
        if 'sorry' in response.url.lower() or 'captcha' in response.text.lower():
            logger.warning("Requests: CAPTCHA or block detected")
            raise Exception("CAPTCHA detected")

        # Human-like delay after successful request
        time.sleep(random.uniform(2, 4))

        return response.text

    def _parse_results(self, html: str) -> List[Dict]:
        """Parse Google Scholar HTML."""
        soup = BeautifulSoup(html, 'lxml')
        papers = []

        results = soup.find_all('div', class_='gs_r gs_or gs_scl')

        for result in results:
            try:
                paper = {}

                # Title
                title_elem = result.find('h3', class_='gs_rt')
                if title_elem:
                    link = title_elem.find('a')
                    if link:
                        paper['title'] = link.get_text()
                        paper['url'] = link.get('href', '')
                    else:
                        paper['title'] = title_elem.get_text()
                        paper['url'] = ''
                else:
                    continue

                # Authors and info
                author_elem = result.find('div', class_='gs_a')
                if author_elem:
                    author_text = author_elem.get_text()
                    parts = author_text.split('-')

                    if len(parts) >= 1:
                        paper['authors'] = parts[0].strip()
                    if len(parts) >= 2:
                        paper['source'] = parts[1].strip()
                    if len(parts) >= 3:
                        year_match = re.search(r'\b(19|20)\d{2}\b', parts[2])
                        if year_match:
                            paper['year'] = int(year_match.group())
                        paper['publisher'] = parts[2].strip()

                # Abstract
                abstract_elem = result.find('div', class_='gs_rs')
                if abstract_elem:
                    paper['abstract'] = abstract_elem.get_text().strip()

                # Citations
                cite_elem = result.find('div', class_='gs_fl')
                if cite_elem:
                    cite_link = cite_elem.find('a', string=re.compile(r'Cited by'))
                    if cite_link:
                        cite_text = cite_link.get_text()
                        cite_match = re.search(r'\d+', cite_text)
                        if cite_match:
                            paper['citations'] = int(cite_match.group())

                papers.append(paper)

            except Exception as e:
                logger.error(f"Requests: Error parsing result: {e}")
                continue

        return papers

    def search(
        self,
        keywords_include: List[str],
        keywords_exclude: List[str],
        start_year: Optional[int],
        end_year: Optional[int],
        max_results: Optional[int],
        progress_callback: Optional[Callable],
        papers_callback: Optional[Callable]
    ) -> List[Dict]:
        """Search using direct requests."""
        try:
            all_papers = []
            seen_titles = set()

            # Build query
            query_parts = []
            for kw in keywords_include:
                if ' ' in kw:
                    query_parts.append(f'"{kw}"')
                else:
                    query_parts.append(kw)

            query = ' '.join(query_parts)

            if keywords_exclude:
                for kw in keywords_exclude:
                    query += f' -"{kw}"' if ' ' in kw else f' -{kw}'

            logger.info(f"Requests: Searching for: {query}")

            # Year range
            if start_year and end_year:
                years = list(range(start_year, end_year + 1))
                logger.info(f"Requests: Searching {len(years)} years")
            else:
                years = [None]

            for year in years:
                if max_results and len(all_papers) >= max_results:
                    break

                logger.info(f"Requests: Searching year {year if year else 'all'}")

                # Paginate
                start = 0
                consecutive_empty = 0

                while True:
                    if max_results and len(all_papers) >= max_results:
                        break

                    try:
                        # Build URL
                        base_url = "https://scholar.google.com/scholar"
                        params = f"?start={start}&q={requests.utils.quote(query)}&hl=en"

                        if year:
                            params += f"&as_ylo={year}&as_yhi={year}"
                        elif start_year or end_year:
                            if start_year:
                                params += f"&as_ylo={start_year}"
                            if end_year:
                                params += f"&as_yhi={end_year}"

                        url = base_url + params

                        # Fetch and parse
                        html = self._fetch_page(url)
                        papers = self._parse_results(html)

                        if not papers:
                            consecutive_empty += 1
                            if consecutive_empty >= 2:
                                break
                        else:
                            consecutive_empty = 0

                        # Deduplicate
                        new_papers = []
                        for paper in papers:
                            title = paper.get('title', '').strip().lower()
                            if title and title not in seen_titles:
                                seen_titles.add(title)
                                all_papers.append(paper)
                                new_papers.append(paper)

                                if max_results and len(all_papers) >= max_results:
                                    break

                        # Callbacks
                        if papers_callback and new_papers:
                            papers_callback(new_papers)

                        if progress_callback:
                            estimated_total = max_results if max_results else len(all_papers) * 2
                            progress_callback(len(all_papers), estimated_total)

                        logger.info(f"Requests: Collected {len(all_papers)} papers")

                        # Check pagination limit
                        if start >= 990:
                            logger.info(f"Requests: Reached pagination limit")
                            break

                        start += 10

                    except Exception as e:
                        logger.error(f"Requests: Error fetching page {start}: {e}")
                        # If we get blocked, don't continue
                        if 'captcha' in str(e).lower():
                            raise
                        start += 10
                        time.sleep(15)  # Wait longer after error
                        continue

                logger.info(f"Requests: Completed year {year if year else 'all'}")

            logger.info(f"Requests: Search complete - {len(all_papers)} papers found")
            self.success_count += 1
            return all_papers

        except Exception as e:
            logger.error(f"Requests: Strategy failed: {e}")
            self.failure_count += 1
            raise


class PlaywrightStrategy(ScraperStrategy):
    """
    Strategy using Playwright browser automation.

    This is FALLBACK 2 - uses the existing GoogleScholarScraper with improvements.
    Most resource-intensive but can handle JavaScript and complex scenarios.
    """

    def __init__(self, headless: bool = True, use_tor: bool = False,
                 job_id: Optional[str] = None, screenshot_dir: Optional[str] = None):
        super().__init__("Playwright")
        self.headless = headless
        self.use_tor = use_tor
        self.job_id = job_id
        self.screenshot_dir = screenshot_dir

    def is_available(self) -> bool:
        """Playwright is always available."""
        return True

    def search(
        self,
        keywords_include: List[str],
        keywords_exclude: List[str],
        start_year: Optional[int],
        end_year: Optional[int],
        max_results: Optional[int],
        progress_callback: Optional[Callable],
        papers_callback: Optional[Callable]
    ) -> List[Dict]:
        """Search using Playwright."""
        try:
            scraper = GoogleScholarScraper(
                headless=self.headless,
                use_tor=self.use_tor,
                job_id=self.job_id,
                screenshot_dir=self.screenshot_dir
            )

            logger.info("Playwright: Starting search")

            results = scraper.search(
                keywords_include=keywords_include,
                keywords_exclude=keywords_exclude,
                start_year=start_year,
                end_year=end_year,
                max_results=max_results,
                progress_callback=progress_callback,
                papers_callback=papers_callback
            )

            logger.info(f"Playwright: Search complete - {len(results)} papers found")
            self.success_count += 1
            return results

        except Exception as e:
            logger.error(f"Playwright: Strategy failed: {e}")
            self.failure_count += 1
            raise


class MultiStrategyScholarScraper:
    """
    Multi-strategy Google Scholar scraper that tries multiple approaches.

    Strategy order (best practices from research):
    1. Scholarly library (fast, has proxy/Tor support, designed for Scholar)
    2. Direct requests (lightweight, good for simple queries)
    3. Playwright browser (heavy but most reliable for complex cases)
    """

    def __init__(
        self,
        use_tor: bool = True,
        headless: bool = True,
        job_id: Optional[str] = None,
        screenshot_dir: Optional[str] = None,
        strategy_order: Optional[List[str]] = None
    ):
        """
        Initialize multi-strategy scraper.

        Args:
            use_tor: Enable Tor proxy for strategies that support it
            headless: Run browsers in headless mode
            job_id: Job ID for logging/screenshots
            screenshot_dir: Directory for screenshots
            strategy_order: Custom strategy order (default: ["scholarly", "requests", "playwright"])
        """
        self.use_tor = use_tor
        self.headless = headless
        self.job_id = job_id
        self.screenshot_dir = screenshot_dir

        # Initialize strategies
        self.strategies = {}

        # Scholarly (PRIMARY)
        if SCHOLARLY_AVAILABLE:
            self.strategies['scholarly'] = ScholarlyStrategy(use_tor=use_tor)

        # Requests (FALLBACK 1)
        self.strategies['requests'] = RequestsStrategy(use_tor=use_tor)

        # Playwright (FALLBACK 2)
        self.strategies['playwright'] = PlaywrightStrategy(
            headless=headless,
            use_tor=use_tor,
            job_id=job_id,
            screenshot_dir=screenshot_dir
        )

        # Strategy order
        if strategy_order:
            self.strategy_order = strategy_order
        else:
            # Default order based on research: scholarly > requests > playwright
            self.strategy_order = ['scholarly', 'requests', 'playwright']

        # Filter out unavailable strategies
        self.strategy_order = [
            s for s in self.strategy_order
            if s in self.strategies and self.strategies[s].is_available()
        ]

        logger.info(f"MultiStrategy: Initialized with strategies: {self.strategy_order}")

    def search(
        self,
        keywords_include: List[str],
        keywords_exclude: List[str] = None,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        max_results: Optional[int] = None,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        papers_callback: Optional[Callable[[List[Dict]], None]] = None
    ) -> List[Dict]:
        """
        Search Google Scholar using multiple strategies with automatic failover.

        Args:
            keywords_include: Keywords that must be present
            keywords_exclude: Keywords to exclude
            start_year: Starting year
            end_year: Ending year
            max_results: Maximum results to return
            progress_callback: Progress callback function(current, total)
            papers_callback: Incremental save callback function(papers_batch)

        Returns:
            List of paper dictionaries
        """
        if keywords_exclude is None:
            keywords_exclude = []

        last_exception = None

        for strategy_name in self.strategy_order:
            strategy = self.strategies[strategy_name]

            logger.info(f"MultiStrategy: Trying {strategy_name} strategy...")

            try:
                results = strategy.search(
                    keywords_include=keywords_include,
                    keywords_exclude=keywords_exclude,
                    start_year=start_year,
                    end_year=end_year,
                    max_results=max_results,
                    progress_callback=progress_callback,
                    papers_callback=papers_callback
                )

                if results:
                    logger.info(
                        f"MultiStrategy: {strategy_name} succeeded with {len(results)} papers "
                        f"(success rate: {strategy.get_success_rate():.2%})"
                    )
                    return results
                else:
                    logger.warning(f"MultiStrategy: {strategy_name} returned no results")
                    last_exception = Exception(f"{strategy_name} returned no results")
                    continue

            except Exception as e:
                logger.warning(f"MultiStrategy: {strategy_name} failed: {e}")
                last_exception = e

                # Wait before trying next strategy
                time.sleep(10)
                continue

        # All strategies failed
        logger.error("MultiStrategy: All strategies failed")
        if last_exception:
            raise last_exception
        else:
            raise Exception("All scraping strategies failed")

    def get_strategy_stats(self) -> Dict[str, Dict]:
        """Get statistics for all strategies."""
        stats = {}
        for name, strategy in self.strategies.items():
            stats[name] = {
                'success_count': strategy.success_count,
                'failure_count': strategy.failure_count,
                'success_rate': strategy.get_success_rate()
            }
        return stats
