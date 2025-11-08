#!/usr/bin/env python3
"""
Quick scraper tester - tries multiple methods rapidly to find what works.
"""

import sys
import time

print("=" * 70)
print("RAPID SCRAPER TESTING - Finding what works fast")
print("=" * 70)

# Test 1: Scholarly library direct
print("\n[TEST 1] Scholarly library (direct, no Tor)...")
start = time.time()
try:
    from scholarly import scholarly

    search_query = scholarly.search_pubs('machine learning')
    paper = next(search_query)

    print(f"✓ SUCCESS in {time.time()-start:.1f}s")
    print(f"  Title: {paper['bib'].get('title', 'N/A')[:60]}")
    print(f"  Year: {paper['bib'].get('pub_year', 'N/A')}")
except Exception as e:
    print(f"✗ FAILED in {time.time()-start:.1f}s: {str(e)[:100]}")

# Test 2: Scholarly with free proxy
print("\n[TEST 2] Scholarly with free proxy...")
start = time.time()
try:
    from scholarly import scholarly, ProxyGenerator

    pg = ProxyGenerator()
    success = pg.FreeProxies()
    scholarly.use_proxy(pg)

    search_query = scholarly.search_pubs('AI')
    paper = next(search_query)

    print(f"✓ SUCCESS in {time.time()-start:.1f}s")
    print(f"  Title: {paper['bib'].get('title', 'N/A')[:60]}")
except Exception as e:
    print(f"✗ FAILED in {time.time()-start:.1f}s: {str(e)[:100]}")

# Test 3: Direct requests with minimal headers
print("\n[TEST 3] Direct requests (minimal, fast)...")
start = time.time()
try:
    import requests
    from bs4 import BeautifulSoup

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    url = "https://scholar.google.com/scholar?q=AI&num=1"
    response = requests.get(url, headers=headers, timeout=10)

    soup = BeautifulSoup(response.text, 'html.parser')
    title_elem = soup.find('h3', class_='gs_rt')

    if title_elem:
        print(f"✓ SUCCESS in {time.time()-start:.1f}s")
        print(f"  Title: {title_elem.get_text()[:60]}")
    else:
        print(f"✗ FAILED: No results found (possibly blocked)")
        print(f"  Status: {response.status_code}")
        if 'sorry' in response.text.lower():
            print(f"  BLOCKED: Google CAPTCHA detected")

except Exception as e:
    print(f"✗ FAILED in {time.time()-start:.1f}s: {str(e)[:100]}")

# Test 4: Selenium with undetected_chromedriver
print("\n[TEST 4] Checking undetected_chromedriver availability...")
start = time.time()
try:
    import undetected_chromedriver as uc
    print(f"✓ Library available - could use for anti-detection")
except ImportError:
    print(f"✗ Not installed (can install: pip install undetected-chromedriver)")

# Test 5: Check if we're rate limited
print("\n[TEST 5] Checking Google Scholar accessibility...")
start = time.time()
try:
    import requests

    response = requests.get("https://scholar.google.com/", timeout=5)

    if response.status_code == 200:
        if 'sorry' in response.text.lower() or 'captcha' in response.text.lower():
            print(f"✗ BLOCKED: IP is rate-limited/blocked by Google")
            print(f"  Action needed: Wait 30+ minutes or use different IP/proxy")
        else:
            print(f"✓ Google Scholar accessible")
    else:
        print(f"✗ HTTP {response.status_code}")

except Exception as e:
    print(f"✗ FAILED: {str(e)[:100]}")

# Test 6: Alternative - Semantic Scholar API (free, no rate limits)
print("\n[TEST 6] Semantic Scholar API (free alternative)...")
start = time.time()
try:
    import requests

    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        'query': 'machine learning',
        'limit': 1,
        'fields': 'title,year,authors,abstract,citationCount'
    }

    response = requests.get(url, params=params, timeout=10)

    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            paper = data['data'][0]
            print(f"✓ SUCCESS in {time.time()-start:.1f}s")
            print(f"  Title: {paper.get('title', 'N/A')[:60]}")
            print(f"  Year: {paper.get('year', 'N/A')}")
            print(f"  Citations: {paper.get('citationCount', 0)}")
            print(f"  NOTE: This is a FREE alternative to Google Scholar!")
    else:
        print(f"✗ HTTP {response.status_code}")

except Exception as e:
    print(f"✗ FAILED: {str(e)[:100]}")

# Test 7: Check Tor availability
print("\n[TEST 7] Checking Tor service...")
start = time.time()
try:
    import requests

    proxies = {
        'http': 'socks5://127.0.0.1:9050',
        'https': 'socks5://127.0.0.1:9050'
    }

    response = requests.get('https://check.torproject.org', proxies=proxies, timeout=10)

    if 'Congratulations' in response.text:
        print(f"✓ Tor is working - can use for IP rotation")
    else:
        print(f"✗ Tor not working properly")

except Exception as e:
    print(f"✗ Tor not available: {str(e)[:50]}")
    print(f"  Install with: sudo apt install tor")

# Test 8: CrossRef API (another free alternative)
print("\n[TEST 8] CrossRef API (free, academic papers)...")
start = time.time()
try:
    import requests

    url = "https://api.crossref.org/works"
    params = {
        'query': 'machine learning',
        'rows': 1
    }

    response = requests.get(url, params=params, timeout=10)

    if response.status_code == 200:
        data = response.json()
        if data.get('message', {}).get('items'):
            paper = data['message']['items'][0]
            print(f"✓ SUCCESS in {time.time()-start:.1f}s")
            print(f"  Title: {paper.get('title', ['N/A'])[0][:60]}")
            print(f"  Year: {paper.get('published-print', {}).get('date-parts', [[None]])[0][0]}")
            print(f"  NOTE: Another FREE alternative!")
    else:
        print(f"✗ HTTP {response.status_code}")

except Exception as e:
    print(f"✗ FAILED: {str(e)[:100]}")

print("\n" + "=" * 70)
print("RECOMMENDATIONS:")
print("=" * 70)

print("""
Based on test results:

IF Google Scholar accessible:
  → Use scholarly library with fresh session
  → Consider installing Tor for IP rotation
  → Use longer delays (10-15 seconds between requests)

IF Google Scholar blocked:
  → Wait 30-60 minutes before retrying
  → Use Tor or VPN to change IP
  → Consider free alternatives: Semantic Scholar or CrossRef API

QUICK FIXES TO TRY:
  1. Install Tor: sudo apt install tor && sudo systemctl start tor
  2. Install undetected-chromedriver: pip install undetected-chromedriver
  3. Use Semantic Scholar API (free, unlimited): https://api.semanticscholar.org
  4. Increase delays to 15+ seconds between requests
  5. Use residential proxies (paid but reliable)
  6. Try at different times of day (less traffic = less blocking)
""")

print("\n" + "=" * 70)
