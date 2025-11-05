import time
import logging
from typing import List, Dict, Optional, Callable
from playwright.sync_api import sync_playwright, Page, Browser
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from tenacity import retry, stop_after_attempt, wait_exponential
import re
import random
import socket
import socks
import os
from datetime import datetime

logger = logging.getLogger(__name__)


class GoogleScholarScraper:
    """
    Google Scholar scraper that can extract more than 1000 papers using Playwright with Tor.

    Strategy to overcome 1000 paper limit:
    1. Split searches by year if date range is specified
    2. Use multiple keyword combinations to divide results
    3. Implement pagination through all available pages
    4. Handle rate limiting and CAPTCHAs gracefully
    5. Use Tor for IP rotation
    """

    def __init__(self, headless: bool = True, use_tor: bool = True, job_id: Optional[str] = None, screenshot_dir: Optional[str] = None):
        self.headless = headless
        self.use_tor = use_tor
        self.job_id = job_id
        self.screenshot_dir = screenshot_dir
        self.browser = None
        self.page = None
        self.playwright = None
        self.ua = UserAgent()
        self.request_count = 0
        self.last_request_time = 0

        # Create screenshot directory if specified
        if self.screenshot_dir:
            os.makedirs(self.screenshot_dir, exist_ok=True)

    def _capture_screenshot(self, suffix: str = ""):
        """
        Capture a screenshot of the current page.

        Args:
            suffix: Optional suffix to add to the filename
        """
        if not self.screenshot_dir or not self.page:
            return

        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # Include milliseconds
            filename = f"scraper_{self.job_id}_{timestamp}"
            if suffix:
                filename += f"_{suffix}"
            filename += ".png"

            screenshot_path = os.path.join(self.screenshot_dir, filename)
            self.page.screenshot(path=screenshot_path, full_page=False)
            logger.info(f"Screenshot saved: {screenshot_path}")

            # Keep only the latest screenshot for this job (delete older ones)
            self._cleanup_old_screenshots()

        except Exception as e:
            logger.error(f"Error capturing screenshot: {e}")

    def _cleanup_old_screenshots(self):
        """Remove old screenshots for this job, keeping only the most recent one."""
        if not self.screenshot_dir or not self.job_id:
            return

        try:
            # Get all screenshot files for this job
            prefix = f"scraper_{self.job_id}_"
            screenshots = [
                f for f in os.listdir(self.screenshot_dir)
                if f.startswith(prefix) and f.endswith('.png')
            ]

            # Sort by filename (which includes timestamp)
            screenshots.sort()

            # Keep only the latest one, delete the rest
            if len(screenshots) > 1:
                for old_screenshot in screenshots[:-1]:
                    old_path = os.path.join(self.screenshot_dir, old_screenshot)
                    os.remove(old_path)
                    logger.debug(f"Removed old screenshot: {old_screenshot}")
        except Exception as e:
            logger.error(f"Error cleaning up old screenshots: {e}")

    def _rotate_tor_circuit(self):
        """Request a new Tor circuit to get a new IP address."""
        try:
            import telnetlib
            with telnetlib.Telnet('127.0.0.1', 9051) as tn:
                tn.write(b"AUTHENTICATE\r\n")
                tn.read_until(b"250 OK", timeout=5)
                tn.write(b"SIGNAL NEWNYM\r\n")
                tn.read_until(b"250 OK", timeout=5)
            logger.info("Tor circuit rotated successfully")
            time.sleep(5)  # Wait for new circuit
        except Exception as e:
            logger.warning(f"Could not rotate Tor circuit: {e}")

    def _init_browser(self):
        """Initialize Playwright browser with anti-detection measures and Tor proxy."""
        self.playwright = sync_playwright().start()

        # Browser launch args
        args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
        ]

        # Add Tor proxy
        if self.use_tor:
            args.append('--proxy-server=socks5://127.0.0.1:9050')
            logger.info("Using Tor SOCKS proxy on 127.0.0.1:9050")

        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=args
        )

        # Create context with custom user agent
        context = self.browser.new_context(
            user_agent=self.ua.random,
            viewport={'width': 1920, 'height': 1080}
        )

        self.page = context.new_page()

        # Remove webdriver flags
        self.page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

    def close(self):
        """Close the browser."""
        if self.page:
            self.page.close()
            self.page = None
        if self.browser:
            self.browser.close()
            self.browser = None
        if self.playwright:
            self.playwright.stop()
            self.playwright = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _search_page(self, query: str, start: int = 0, year_low: Optional[int] = None,
                     year_high: Optional[int] = None) -> str:
        """
        Fetch a single page of Google Scholar results.

        Args:
            query: Search query string
            start: Starting index for pagination (0, 10, 20, ...)
            year_low: Optional lower bound for publication year
            year_high: Optional upper bound for publication year

        Returns:
            HTML content of the page
        """
        if not self.page:
            self._init_browser()

        # Rotate Tor circuit every 10-20 requests if using Tor
        if self.use_tor and self.request_count > 0 and self.request_count % random.randint(10, 20) == 0:
            logger.info(f"Rotating Tor circuit after {self.request_count} requests")
            self._rotate_tor_circuit()

        # Dynamic delay based on request count and time since last request
        current_time = time.time()
        if self.last_request_time > 0:
            time_since_last = current_time - self.last_request_time
            # Ensure minimum delay of 8-15 seconds between requests
            min_delay = random.uniform(8, 15)
            if time_since_last < min_delay:
                wait_time = min_delay - time_since_last
                logger.info(f"Dynamic delay: waiting {wait_time:.2f} seconds")
                time.sleep(wait_time)

        self.request_count += 1
        self.last_request_time = time.time()

        # Build URL
        base_url = "https://scholar.google.com/scholar"
        params = f"?start={start}&q={query}&hl=en"

        if year_low and year_high:
            params += f"&as_ylo={year_low}&as_yhi={year_high}"
        elif year_low:
            params += f"&as_ylo={year_low}"
        elif year_high:
            params += f"&as_yhi={year_high}"

        url = base_url + params

        logger.info(f"Fetching: {url} (request #{self.request_count})")

        try:
            self.page.goto(url, wait_until='networkidle', timeout=30000)

            # Additional random delay to appear more human-like
            human_delay = random.uniform(2, 5)
            logger.info(f"Human-like delay: {human_delay:.2f} seconds")
            time.sleep(human_delay)

            # Check for CAPTCHA
            page_content = self.page.content()
            if "sorry" in self.page.url.lower() or "captcha" in page_content.lower():
                logger.warning("CAPTCHA detected! Rotating circuit and waiting longer...")
                if self.use_tor:
                    self._rotate_tor_circuit()
                time.sleep(60)  # Wait longer and retry
                raise Exception("CAPTCHA detected")

            # Wait for results to load
            try:
                self.page.wait_for_selector("#gs_res_ccl_mid", timeout=10000)
            except:
                logger.warning("Results container not found, but continuing...")

            # Capture screenshot after successful page load
            self._capture_screenshot(f"page_{start}")

            return page_content

        except Exception as e:
            logger.error(f"Error fetching page: {e}")
            raise

    def _parse_results(self, html: str) -> List[Dict]:
        """
        Parse Google Scholar HTML to extract paper information.

        Args:
            html: HTML content from Google Scholar

        Returns:
            List of dictionaries containing paper metadata
        """
        soup = BeautifulSoup(html, 'lxml')
        papers = []

        # Find all result divs
        results = soup.find_all('div', class_='gs_r gs_or gs_scl')

        for result in results:
            try:
                paper = {}

                # Title and link
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
                    continue  # Skip if no title

                # Authors and publication info
                author_elem = result.find('div', class_='gs_a')
                if author_elem:
                    author_text = author_elem.get_text()
                    parts = author_text.split('-')

                    if len(parts) >= 1:
                        paper['authors'] = parts[0].strip()
                    if len(parts) >= 2:
                        paper['source'] = parts[1].strip()
                    if len(parts) >= 3:
                        # Try to extract year
                        year_match = re.search(r'\b(19|20)\d{2}\b', parts[2])
                        if year_match:
                            paper['year'] = int(year_match.group())
                        paper['publisher'] = parts[2].strip()

                # Abstract/snippet
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
                logger.error(f"Error parsing result: {e}")
                continue

        return papers

    def search(
        self,
        keywords_include: List[str],
        keywords_exclude: List[str] = None,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        max_results: Optional[int] = None,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[Dict]:
        """
        Search Google Scholar with given criteria.

        Strategy to get more than 1000 results:
        - If date range spans multiple years, search year by year
        - Each year can return up to 1000 results
        - This allows extracting many more papers than the single 1000 limit

        Args:
            keywords_include: List of keywords that must be present
            keywords_exclude: List of keywords to exclude
            start_year: Starting year for search
            end_year: Ending year for search
            max_results: Maximum number of results to return (None for all)
            progress_callback: Optional callback function(current, total) for progress updates

        Returns:
            List of paper dictionaries
        """
        try:
            all_papers = []
            seen_titles = set()  # To avoid duplicates

            # Build query
            query_parts = []
            for kw in keywords_include:
                if ' ' in kw:
                    query_parts.append(f'"{kw}"')
                else:
                    query_parts.append(kw)

            base_query = ' '.join(query_parts)

            if keywords_exclude:
                for kw in keywords_exclude:
                    base_query += f' -"{kw}"' if ' ' in kw else f' -{kw}'

            # Determine year range for searching
            if start_year and end_year:
                years = list(range(start_year, end_year + 1))
                logger.info(f"Searching {len(years)} years individually to overcome 1000 limit")
            else:
                years = [None]  # Single search without year restriction

            total_years = len(years)

            for year_idx, year in enumerate(years):
                if max_results and len(all_papers) >= max_results:
                    break

                year_low = year
                year_high = year

                if year is None:
                    year_low = start_year
                    year_high = end_year

                logger.info(f"Searching year: {year if year else 'all'}")

                # Paginate through results (Google Scholar shows 10 results per page)
                start = 0
                consecutive_empty = 0

                while True:
                    if max_results and len(all_papers) >= max_results:
                        break

                    try:
                        html = self._search_page(base_query, start, year_low, year_high)
                        papers = self._parse_results(html)

                        if not papers:
                            consecutive_empty += 1
                            if consecutive_empty >= 2:
                                # No more results for this year
                                break
                        else:
                            consecutive_empty = 0

                        # Filter duplicates
                        for paper in papers:
                            title = paper.get('title', '').strip().lower()
                            if title and title not in seen_titles:
                                seen_titles.add(title)
                                all_papers.append(paper)

                                if max_results and len(all_papers) >= max_results:
                                    break

                        # Update progress
                        if progress_callback:
                            # Estimate total (rough estimate)
                            estimated_total = max_results if max_results else len(all_papers) * 2
                            progress_callback(len(all_papers), estimated_total)

                        logger.info(f"Collected {len(all_papers)} papers so far...")

                        # Check if we've hit Google Scholar's limit for this query
                        if start >= 990:  # Google Scholar typically stops around 1000
                            logger.info(f"Reached pagination limit for year {year}")
                            break

                        # Move to next page
                        start += 10

                        # Note: Dynamic delays are handled in _search_page() method

                    except Exception as e:
                        logger.error(f"Error fetching page {start}: {e}")
                        # Try to continue with next page
                        start += 10
                        time.sleep(10)  # Wait longer after error
                        continue

                logger.info(f"Completed year {year if year else 'all'}: {len(all_papers)} total papers")

                # Update progress after completing year
                if progress_callback:
                    progress_callback(len(all_papers), len(all_papers))

            logger.info(f"Search complete: {len(all_papers)} papers found")
            return all_papers

        finally:
            self.close()


def test_scraper():
    """Test function for the scraper."""
    scraper = GoogleScholarScraper(headless=False)

    try:
        papers = scraper.search(
            keywords_include=["machine learning", "deep learning"],
            keywords_exclude=["medical"],
            start_year=2023,
            end_year=2023,
            max_results=50
        )

        print(f"Found {len(papers)} papers")
        for i, paper in enumerate(papers[:5]):
            print(f"\n{i+1}. {paper.get('title')}")
            print(f"   Authors: {paper.get('authors')}")
            print(f"   Year: {paper.get('year')}")
            print(f"   Citations: {paper.get('citations', 0)}")

    finally:
        scraper.close()


if __name__ == "__main__":
    test_scraper()
