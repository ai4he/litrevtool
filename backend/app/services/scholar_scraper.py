import time
import logging
from typing import List, Dict, Optional, Callable
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from tenacity import retry, stop_after_attempt, wait_exponential
import re

logger = logging.getLogger(__name__)


class GoogleScholarScraper:
    """
    Google Scholar scraper that can extract more than 1000 papers.

    Strategy to overcome 1000 paper limit:
    1. Split searches by year if date range is specified
    2. Use multiple keyword combinations to divide results
    3. Implement pagination through all available pages
    4. Handle rate limiting and CAPTCHAs gracefully
    """

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None
        self.ua = UserAgent()

    def _init_driver(self):
        """Initialize Selenium WebDriver with anti-detection measures."""
        chrome_options = Options()

        if self.headless:
            chrome_options.add_argument("--headless")

        # Anti-detection measures
        chrome_options.add_argument(f"user-agent={self.ua.random}")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)

        # Remove webdriver flag
        self.driver.execute_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

    def close(self):
        """Close the WebDriver."""
        if self.driver:
            self.driver.quit()
            self.driver = None

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
        if not self.driver:
            self._init_driver()

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

        logger.info(f"Fetching: {url}")

        try:
            self.driver.get(url)

            # Random delay to appear more human-like
            time.sleep(2 + (time.time() % 3))

            # Check for CAPTCHA
            if "sorry" in self.driver.current_url.lower() or "captcha" in self.driver.page_source.lower():
                logger.warning("CAPTCHA detected! Waiting longer...")
                time.sleep(30)  # Wait longer and retry
                raise Exception("CAPTCHA detected")

            # Wait for results to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "gs_res_ccl_mid"))
            )

            return self.driver.page_source

        except TimeoutException:
            logger.error("Timeout waiting for results to load")
            raise
        except WebDriverException as e:
            logger.error(f"WebDriver error: {e}")
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

                        # Be nice to Google's servers
                        time.sleep(3 + (time.time() % 2))

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
