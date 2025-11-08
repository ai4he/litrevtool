/**
 * Quick test to check Google Scholar HTML selectors
 */
const { chromium } = require('playwright');

async function testSelectors() {
  console.log('🔍 Testing Google Scholar selectors...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const query = '"large language models" "mathematical reasoning"';
  const url = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}&hl=en&as_ylo=2022&as_yhi=2022`;

  console.log(`Navigating to: ${url}\n`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Check what's actually on the page
  const pageContent = await page.evaluate(() => {
    return {
      title: document.title,
      bodyText: document.body.innerText.substring(0, 500),
      hasCaptcha: document.body.innerHTML.includes('captcha') || document.body.innerHTML.includes('sorry'),
      url: window.location.href,
      allDivs: document.querySelectorAll('div').length,
      allClasses: Array.from(new Set(
        Array.from(document.querySelectorAll('[class]')).flatMap(el => el.className.split(' '))
      )).filter(c => c.includes('gs')).slice(0, 20)
    };
  });

  console.log('📄 Page content check:');
  console.log(pageContent);
  console.log('');

  // Take a screenshot
  await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved to test-screenshot.png\n');

  // Test different selectors
  const selectors = [
    '.gs_r.gs_or.gs_scl',  // Current selector (all 3 classes together)
    '.gs_r',                // Base class
    '.gs_ri',               // Result item
    '[data-rp]',           // Data attribute
    '.gs_or',              // Organic result
    '.gs_scl',             // Scholar result
  ];

  console.log('Testing selectors:\n');
  for (const selector of selectors) {
    try {
      const count = await page.$$eval(selector, (els) => els.length);
      console.log(`✓ ${selector.padEnd(30)} → ${count} elements`);

      if (count > 0 && count < 20) {
        // Show first element structure
        const firstEl = await page.$eval(selector, (el) => {
          return {
            classes: el.className,
            hasTitle: !!el.querySelector('.gs_rt'),
            hasAuthors: !!el.querySelector('.gs_a'),
            html: el.innerHTML.substring(0, 200)
          };
        });
        console.log(`  First element:`, firstEl);
      }
    } catch (e) {
      console.log(`✗ ${selector.padEnd(30)} → Not found`);
    }
  }

  // Check actual page structure
  console.log('\n📄 Page structure analysis:');
  const structure = await page.evaluate(() => {
    const results = document.querySelectorAll('[data-cid], .gs_ri, .gs_r');
    if (results.length === 0) return 'No results found';

    const first = results[0];
    return {
      totalResults: results.length,
      firstElementTag: first.tagName,
      firstElementClasses: first.className,
      hasTitle: !!first.querySelector('.gs_rt, h3'),
      hasAuthors: !!first.querySelector('.gs_a, .gs_gray'),
      children: Array.from(first.children).map(child => ({
        tag: child.tagName,
        class: child.className
      }))
    };
  });

  console.log(structure);

  await browser.close();
  console.log('\n✅ Test complete');
}

testSelectors().catch(console.error);
