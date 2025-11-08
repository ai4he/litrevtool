#!/usr/bin/env python3
"""Ultra-fast scraper test with timeouts"""

import signal
import sys

def timeout_handler(signum, frame):
    raise TimeoutError("Test timed out")

def test_with_timeout(name, func, timeout_sec=5):
    """Run test with timeout"""
    print(f"\n[TEST] {name}...", end=" ", flush=True)

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout_sec)

    try:
        result = func()
        signal.alarm(0)  # Cancel alarm
        print(f"✓ WORKS!")
        if result:
            print(f"  → {result}")
        return True
    except TimeoutError:
        print(f"✗ TIMEOUT ({timeout_sec}s)")
        return False
    except Exception as e:
        signal.alarm(0)
        error_msg = str(e)[:80]
        print(f"✗ FAILED: {error_msg}")
        return False

print("="*70)
print("FAST SCRAPER TESTS (5s timeout per test)")
print("="*70)

# Test 1: Semantic Scholar API (FREE, NO LIMITS)
def test_semantic_scholar():
    import requests
    r = requests.get("https://api.semanticscholar.org/graph/v1/paper/search?query=AI&limit=1&fields=title,year", timeout=5)
    paper = r.json()['data'][0]
    return f"Title: {paper['title'][:40]}..."

# Test 2: CrossRef API (FREE)
def test_crossref():
    import requests
    r = requests.get("https://api.crossref.org/works?query=AI&rows=1", timeout=5)
    paper = r['message']['items'][0]
    return f"Title: {paper['title'][0][:40]}..."

# Test 3: Direct Google Scholar request
def test_direct_scholar():
    import requests
    from bs4 import BeautifulSoup
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    r = requests.get("https://scholar.google.com/scholar?q=AI&num=1", headers=headers, timeout=5)
    if 'sorry' in r.text.lower():
        raise Exception("BLOCKED by Google")
    soup = BeautifulSoup(r.text, 'html.parser')
    title = soup.find('h3', class_='gs_rt')
    if title:
        return f"Title: {title.get_text()[:40]}..."
    raise Exception("No results")

# Test 4: Scholarly library (quick)
def test_scholarly():
    from scholarly import scholarly
    search = scholarly.search_pubs('AI')
    paper = next(search)
    return f"Title: {paper['bib']['title'][:40]}..."

# Test 5: Check if Tor available
def test_tor():
    import requests
    proxies = {'http': 'socks5://127.0.0.1:9050', 'https': 'socks5://127.0.0.1:9050'}
    r = requests.get('https://check.torproject.org', proxies=proxies, timeout=5)
    if 'Congratulations' in r.text:
        return "Tor is working"
    raise Exception("Tor not working")

# Run tests
results = {}

results['semantic_scholar'] = test_with_timeout("Semantic Scholar API (FREE)", test_semantic_scholar, 10)
results['crossref'] = test_with_timeout("CrossRef API (FREE)", test_crossref, 10)
results['direct_scholar'] = test_with_timeout("Direct Google Scholar", test_direct_scholar, 10)
results['scholarly_lib'] = test_with_timeout("Scholarly library", test_scholarly, 10)
results['tor'] = test_with_timeout("Tor proxy", test_tor, 10)

print("\n" + "="*70)
print("SUMMARY")
print("="*70)

working = [k for k, v in results.items() if v]
failing = [k for k, v in results.items() if not v]

if working:
    print(f"\n✓ WORKING METHODS ({len(working)}):")
    for method in working:
        print(f"  - {method}")

if failing:
    print(f"\n✗ FAILING METHODS ({len(failing)}):")
    for method in failing:
        print(f"  - {method}")

print("\n" + "="*70)
print("RECOMMENDATIONS")
print("="*70)

if results.get('semantic_scholar') or results.get('crossref'):
    print("""
✓ BEST OPTION: Use Semantic Scholar or CrossRef API
  - FREE and unlimited
  - No CAPTCHA issues
  - Fast responses
  - Good metadata

IMPLEMENTATION PLAN:
  1. Add Semantic Scholar as Strategy 0 (before scholarly)
  2. Use as primary method
  3. Fall back to Google Scholar only if needed

API DOCS:
  - Semantic Scholar: https://api.semanticscholar.org/api-docs/
  - CrossRef: https://github.com/CrossRef/rest-api-doc
""")

elif results.get('direct_scholar') or results.get('scholarly_lib'):
    print("""
✓ Google Scholar is accessible
  - Direct requests or scholarly library working
  - Use with caution (rate limiting)
  - Add longer delays (10-15s between requests)
""")

elif results.get('tor'):
    print("""
✓ Tor is available
  - Use Tor proxies to rotate IP
  - Combine with scholarly library
  - Will help avoid rate limiting
""")

else:
    print("""
✗ ALL METHODS BLOCKED/FAILING

QUICK FIXES:
  1. Install Tor: sudo apt install tor && sudo systemctl start tor
  2. Wait 30-60 minutes (IP cooldown)
  3. Use Semantic Scholar API (doesn't require Google Scholar)
  4. Use VPN or residential proxies
""")

print()
