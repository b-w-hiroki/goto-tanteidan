// Short screens must keep the demo notice, all intro content and Next usable.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.readFile(file, (err, data) => { res.statusCode = err ? 404 : 200; res.end(err ? '' : data); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
    for (const [width, height] of [[320,480], [390,480], [320,568], [390,844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForTimeout(500);
      if (process.env.QA_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.QA_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.QA_SCREENSHOT_DIR, `onboarding-${width}x${height}.png`) });
      }
      for (let i = 0; i < 3; i++) {
        const slide = page.locator('.ob-slide').nth(i);
        const layout = await slide.evaluate(e => ({
          top: e.getBoundingClientRect().top,
          first: e.firstElementChild.getBoundingClientRect().top,
          notice: document.querySelector('.prototype-notice').getBoundingClientRect().bottom
        }));
        assert.ok(layout.first >= layout.notice && layout.top >= layout.notice, 'notice must not cover intro');
        await slide.evaluate(e => { e.scrollTop = e.scrollHeight; });
        assert.ok(await slide.evaluate(e => e.lastElementChild.getBoundingClientRect().bottom <= e.getBoundingClientRect().bottom + 1), 'last content reachable');
        const button = await page.locator('#ob-next').boundingBox();
        assert.ok(button && button.y >= 0 && button.y + button.height <= height && button.height >= 44, 'Next fits viewport');
        await page.locator('#ob-next').click();
        await page.waitForTimeout(450);
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: all three slides readable; Next usable; no JS errors`);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
