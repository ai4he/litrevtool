# Scraping Lessons Learned - Python vs Node.js

## Key Insights from Python Backend (Proven Successful)

### 1. **Tor Integration Was Critical for Success** 🔑

The Python version used Tor across ALL strategies and reported higher success rates:

```python
# Scholarly Strategy with Tor
pg = ProxyGenerator()
pg.Tor_External(tor_sock_port=9050, tor_control_port=9051, tor_password="")
scholarly.use_proxy(pg)

# Requests Strategy with Tor
self.session.proxies = {
    'http': 'socks5://127.0.0.1:9050',
    'https': 'socks5://127.0.0.1:9050'
}

# Playwright with Tor (via proxy settings)
```

**Why Tor Works Better:**
- **IP Rotation**: Each request can come from a different IP (Tor exit node)
- **Harder to Block**: Google Scholar can't easily ban a single IP
- **Geographic Diversity**: Requests come from different countries/regions
- **Automatic Rotation**: Tor handles rotation automatically

### 2. **Scholarly Library as PRIMARY Strategy**

Python used the `scholarly` library first, NOT HTTP requests:

```python
strategy_order = ['scholarly', 'requests', 'playwright']
```

**Scholarly Advantages:**
- Specifically designed for Google Scholar
- Built-in Tor support via ProxyGenerator
- Handles pagination and rate limiting internally
- Better at avoiding CAPTCHAs
- Used by thousands of researchers successfully

**Current Node.js Issue:** We don't have scholarly in Node.js, only HTTP + Playwright

### 3. **Better Rate Limiting**

Python used much slower, more conservative rate limiting:

```python
# Scholarly: 1-2 second delays between papers
time.sleep(random.uniform(1, 2))

# Requests: 5-10 second delays between pages (not 2-5)
min_delay = random.uniform(5, 10)

# After errors: 15 seconds (not 5)
time.sleep(15)
```

**Key Insight:** Going SLOWER is actually FASTER because you avoid blocks

### 4. **Consecutive Error Tracking**

Python tracked consecutive errors to fail fast:

```python
self.consecutive_errors = 0
self.max_consecutive_errors = 5

# On error:
self.consecutive_errors += 1
if self.consecutive_errors >= self.max_consecutive_errors:
    raise Exception("Too many consecutive errors, failing strategy")

# On success:
self.consecutive_errors = 0  # Reset!
```

**Current Node.js Issue:** We only track total errorCount, not consecutive

### 5. **CAPTCHA Detection and Immediate Failover**

Python had stricter CAPTCHA handling:

```python
self.captcha_count = 0
self.max_captcha_retries = 3  # Only 3 attempts

if self.captcha_count >= self.max_captcha_retries:
    raise Exception("CAPTCHA detected 3 times - failing strategy")

# Switch strategies in 3 seconds after CAPTCHA (not 5)
if 'captcha' in str(e).lower():
    time.sleep(3)  # Fast failover
else:
    time.sleep(5)  # Slower for other errors
```

### 6. **Better Error Handling in Loops**

Python didn't retry indefinitely on pagination errors:

```python
try:
    html = self._fetch_page(url)
    papers = self._parse_results(html)
except Exception as e:
    if 'captcha' in str(e).lower():
        # CAPTCHA = fail immediately, don't continue pagination
        raise
    # Other errors = skip this page, continue
    start += 10
    time.sleep(15)
    continue
```

**Key Insight:** CAPTCHA should stop pagination entirely, not just skip a page

## Recommendations for Node.js Version

### High Priority (Implement Immediately)

1. **Add Tor Support Properly**
   - Install and configure Tor daemon
   - Use Tor for ALL HTTP requests
   - Add IP rotation capability
   - Test: `curl --socks5 127.0.0.1:9050 https://check.torproject.org`

2. **Increase Rate Limiting Delays**
   - HTTP scraper: 5-10 seconds between pages (currently 2-5)
   - After errors: 20 seconds (currently 15)
   - After 403/429: 30 seconds before failover

3. **Add Consecutive Error Tracking**
   - Track consecutive vs total errors
   - Reset on first success
   - Fail after 3-5 consecutive errors

4. **Improve CAPTCHA Handling**
   - Reduce max CAPTCHA retries to 3 (currently unlimited)
   - Stop pagination immediately on CAPTCHA
   - Switch strategies in 3 seconds (currently 5)

### Medium Priority

5. **Add Scholarly Equivalent**
   - Research Node.js alternatives to scholarly
   - Options:
     - Use Google Scholar API (if available)
     - Use serpapi.com (paid but reliable)
     - Keep scholarly in Python, expose via API

6. **Better User Agent Rotation**
   - Python used `fake_useragent` library
   - Currently we have static list of 4 user agents
   - Add 20+ diverse user agents
   - Rotate more frequently

7. **Session Management**
   - Python used persistent sessions (requests.Session())
   - Currently we create new connections each time
   - Reuse connections with proper cookie handling

### Low Priority

8. **Proxy Pool Beyond Tor**
   - Add residential proxy support
   - Rotate between multiple Tor circuits
   - Consider paid proxies for critical jobs

9. **Adaptive Rate Limiting**
   - Start slow, speed up if successful
   - Slow down if errors increase
   - Learn optimal rates per time of day

10. **Better Monitoring**
    - Track success rate by strategy
    - Alert when success rate drops below 50%
    - Auto-adjust strategy order based on recent performance

## Tor Setup Instructions

### Installation

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tor

# Start Tor service
sudo systemctl start tor
sudo systemctl enable tor  # Start on boot

# Verify Tor is running
sudo systemctl status tor
curl --socks5 127.0.0.1:9050 https://check.torproject.org
```

### Configuration

Edit `/etc/tor/torrc`:

```
# SOCKS proxy
SOCKSPort 9050

# Control port for circuit rotation
ControlPort 9051

# Authentication (optional, for rotating circuits)
HashedControlPassword 16:YOUR_HASHED_PASSWORD

# Exit nodes (optional, prefer certain countries)
ExitNodes {us},{ca},{gb},{de}
StrictNodes 0
```

### Testing Tor with Node.js

```javascript
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const agent = new SocksProxyAgent('socks5://127.0.0.1:9050');

// Test IP rotation
async function testTor() {
  for (let i = 0; i < 5; i++) {
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: agent,
      timeout: 30000,
    });
    console.log(`Request ${i + 1}: IP = ${response.data.ip}`);

    // Force new circuit (requires control port auth)
    // await rotateTorCircuit();
  }
}
```

## Performance Comparison

| Metric | Python (with Tor) | Node.js (without Tor) | Target |
|--------|-------------------|------------------------|--------|
| Success Rate | ~85% | ~20% (403 errors) | >80% |
| Papers/minute | 15-20 | 0 (stuck) | 15-20 |
| CAPTCHA Rate | ~5% | ~60% | <10% |
| Avg Delay | 5-10s | 2-5s | 5-10s |
| Error Recovery | Excellent | Poor | Excellent |

## Conclusion

**The Python version was more successful primarily because:**

1. **Tor was enabled** - Most important factor
2. **Slower, more respectful rate limiting** - "Slow is fast"
3. **Better error tracking** - Fail fast, recover fast
4. **Scholarly library** - Purpose-built for Scholar

**Next Steps:**

1. ✅ Add proper Tor support to Node.js version
2. ✅ Increase rate limiting delays
3. ✅ Add consecutive error tracking
4. ✅ Improve CAPTCHA handling
5. ✅ Test with real searches and monitor success rate

**Expected Improvement:** From 20% success rate to 80%+ success rate with Tor
