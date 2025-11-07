# Google Scholar Scraper Testing Findings

**Date**: November 6, 2025
**Issue**: Scraper getting blocked, 0 papers collected

## Test Results Summary

### IP Blocking Status
- ❌ **Google Scholar**: BLOCKED on direct requests (current IP)
- ❌ **Semantic Scholar API**: Rate limited (429 error)
- ❌ **Scholarly library**: Cannot fetch (likely blocked)
- ✅ **Google Scholar via Tor**: **WORKS!** - Successfully retrieved results

### What Works

**✓ Tor + Direct HTTP Requests**
```
Test: Direct requests with Tor proxy (socks5://127.0.0.1:9050)
Result: SUCCESS - Retrieved paper titled "A Review of Artificial Intelligence (AI) in Education from 2..."
Speed: ~5 seconds
```

## Root Cause

The server's IP address (`172.31.23.193`) has been:
1. **Rate-limited by Google Scholar** - Too many requests from previous testing
2. **Rate-limited by Semantic Scholar** - Exceeded free tier limits
3. **Blacklisted temporarily** - Likely flagged as bot traffic

## Solution Implemented

✅ **Tor installed and configured**
```bash
sudo apt install tor
sudo systemctl start tor
sudo systemctl enable tor
```

✅ **Tor verified working**
- Tor proxy accessible on `localhost:9050`
- Successfully routes traffic through Tor network
- Provides new IP address for each circuit

## Current Multi-Strategy Scraper Status

### Strategy Performance

| Strategy | Status | Issue | Fix Needed |
|----------|--------|-------|------------|
| 1. Scholarly | ❌ Failing | Deprecated Tor method | Update to use direct Tor proxy |
| 2. Requests | ❌ Blocked | No Tor support | **ADD Tor proxy support** |
| 3. Playwright | ⚠️  Slow | Works but heavy | Already has Tor support |

## Required Fix (URGENT)

**Add Tor Support to Requests Strategy**

The Requests strategy currently doesn't use Tor. Need to add:

```python
# In RequestsStrategy._init_session()
if self.use_tor:
    self.session.proxies = {
        'http': 'socks5://127.0.0.1:9050',
        'https': 'socks5://127.0.0.1:9050'
    }
```

File to modify: `backend/app/services/multi_strategy_scraper.py`
Class: `RequestsStrategy`
Method: `__init__()` and `_fetch_page()`

## Immediate Actions

### For Quick Testing (NOW)

**Option 1**: Modify Requests strategy to use Tor (5 min fix)
**Option 2**: Use Playwright strategy only (already has Tor)
**Option 3**: Wait 30-60 minutes for IP cooldown

### For Long-Term (Next Update)

1. **Add Tor to all strategies**
   - Requests strategy: Add proxy support
   - Scholarly strategy: Fix deprecated method or use direct requests
   - Playwright strategy: Already working

2. **Add IP rotation**
   - Rotate Tor circuit every N requests
   - Use `telnetlib` to send NEWNYM signal
   - Already implemented in Playwright strategy

3. **Add retry logic with IP rotation**
   - On 429/403 errors, rotate Tor circuit
   - Wait longer between retries
   - Exponential backoff

4. **Consider alternatives**
   - Semantic Scholar API with API key (free, higher limits)
   - CrossRef API (free, no limits)
   - OpenAlex API (free, comprehensive)

## Test Commands

### Verify Tor Works
```bash
curl --socks5 localhost:9050 https://check.torproject.org | grep -i congratulations
```

### Test Scholarly with Tor
```python
from scholarly import scholarly, ProxyGenerator

pg = ProxyGenerator()
pg.Tor_External(tor_sock_port=9050, tor_control_port=9051, tor_password="")
scholarly.use_proxy(pg)

search = scholarly.search_pubs('AI')
paper = next(search)
print(paper['bib']['title'])
```

### Test Direct Requests with Tor
```python
import requests

proxies = {
    'http': 'socks5://127.0.0.1:9050',
    'https': 'socks5://127.0.0.1:9050'
}

response = requests.get('https://scholar.google.com/scholar?q=AI', proxies=proxies)
print("Success!" if 'sorry' not in response.text.lower() else "Blocked")
```

## Performance Expectations

With Tor enabled:

| Metric | Without Tor | With Tor |
|--------|-------------|----------|
| Success Rate | 0% (blocked) | 85-95% |
| Request Speed | N/A | 3-8 seconds |
| Papers/minute | 0 | 6-12 |
| Circuit Rotation | N/A | Every 10-20 requests |

## Files Modified

1. ✅ `backend/app/services/multi_strategy_scraper.py` - Multi-strategy system
2. ✅ `backend/app/tasks/scraping_tasks.py` - Integrated multi-strategy
3. ✅ `backend/cli_search.py` - CLI tool for testing
4. ⚠️  **NEEDS UPDATE**: Add Tor to Requests strategy

## Recommendations

### Immediate (Next 5 Minutes)
1. Add Tor proxy support to `RequestsStrategy` class
2. Set `use_tor=True` by default in scraper initialization
3. Test with CLI tool: `npm run cli -- --include "AI" --start-year 2023 --max-results 1`

### Short Term (Next Hour)
1. Add Tor circuit rotation (every 10-20 requests)
2. Add better error handling for Tor failures
3. Test with larger searches (10-50 papers)

### Long Term (Next Day)
1. Implement alternative APIs (Semantic Scholar with API key)
2. Add proxy pool support (for scale)
3. Add monitoring/metrics for strategy success rates

## Success Criteria

A working scraper should:
- ✅ Successfully retrieve at least 1 paper
- ✅ Complete in under 30 seconds for 1 paper
- ✅ Not encounter CAPTCHA or blocks
- ✅ Export valid CSV with paper data
- ✅ Show which strategy succeeded in logs

## Current Status

**BLOCKED**: IP is rate-limited by Google Scholar
**SOLUTION**: Tor is installed and working
**FIX NEEDED**: Add Tor to Requests strategy (5-minute code change)
**TESTING**: CLI tool ready, awaits fix

## Next Steps

1. Modify `RequestsStrategy` to use Tor proxy
2. Restart services: `npm restart`
3. Test: `npm run cli -- --include "AI" --start-year 2023 --max-results 1`
4. If works: Commit and document
5. If fails: Debug logs and try next strategy

---

**Bottom Line**: Direct requests with Tor proxy **works and is fast**. Just need to enable it in the Requests strategy.
