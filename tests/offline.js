// Real Service Worker lifecycle tests, served below a GitHub Pages-style subpath.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const current = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const old = execFileSync('git', ['show', '9500387:sw.js'], { cwd: root, encoding: 'utf8' });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let version = 'current', fail = false;
const server = http.createServer((req, res) => {
  const file = new URL(req.url, 'http://localhost').pathname.replace(/^\/app\//, '') || 'index.html';
  if (fail && file === 'js/core-data.js') { res.writeHead(503); res.end('injected failure'); return; }
  let body;
  try { body = file === 'sw.js' ? (version === 'old' ? old : current) : fs.readFileSync(path.join(root, file)); }
  catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
});
async function controlled(page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}
async function update(page) {
  return page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    const done = new Promise(resolve => r.addEventListener('updatefound', () => {
      const worker = r.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' || worker.state === 'redundant') resolve(worker.state);
      });
    }, { once: true }));
    await r.update();
    return done;
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
  try {
    const base = `http://127.0.0.1:${server.address().port}/app/`;
    for (const scenario of ['fresh', 'upgrade', 'failed-upgrade']) {
      version = scenario === 'fresh' ? 'current' : 'old'; fail = false;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await ctx.newPage(); page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base); await controlled(page);
      await page.evaluate(async () => { await caches.open('unrelated-cache'); });
      if (scenario !== 'fresh') {
        version = 'current'; fail = scenario === 'failed-upgrade';
        const outcome = await update(page);
        assert.equal(outcome, fail ? 'redundant' : 'activated', scenario);
        if (fail) {
          const keys = await page.evaluate(() => caches.keys());
          assert(keys.includes('goto-tanteidan-v4'), 'failed update must retain v4');
          assert(keys.includes('unrelated-cache'), 'unrelated cache must survive');
          console.log('PASS failed precache rejects installation and preserves old worker/cache');
          fail = false;
          assert.equal(await update(page), 'activated', 'retry succeeds');
        }
      }
      await page.waitForFunction(async () => !(await caches.keys()).includes('goto-tanteidan-v4'));
      const assets = await page.evaluate(async () => {
        const c = await caches.open('goto-tanteidan-v5');
        return (await c.keys()).map(r => new URL(r.url).pathname);
      });
      for (const file of ['styles.css', ...['core-data','state-missions','home-sheets','map-ranking','camera-setup','layers-init'].map(x => `js/${x}.js`)]) assert(assets.includes(`/app/${file}`), file);
      await page.evaluate(() => { ONBOARDED = true; saveState(); });
      await ctx.setOffline(true); await page.reload();
      await page.waitForFunction(() => typeof switchView === 'function');
      for (const tab of ['map', 'rank', 'book', 'cam', 'home']) {
        await page.locator(`.tab[data-view="${tab}"]`).click();
        assert(await page.locator(`#view-${tab}`).evaluate(el => el.classList.contains('active')));
        if (tab === 'map') {
          await page.waitForFunction(() => map && map.getSize().y > 0 && document.querySelectorAll('.leaflet-marker-icon').length > 0);
          await page.locator('#map').dispatchEvent('wheel', { deltaY: -100 });
          await page.locator('#pill-heat').click();
        }
        assert(await page.locator('.tabbar').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
        if (process.env.SCREENSHOT_DIR) { fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${scenario}-${tab}.png`) }); }
      }
      assert(await page.locator('link[href="styles.css"]').evaluate(el => !!el.sheet));
      assert.deepEqual(errors, []);
      assert((await page.evaluate(() => caches.keys())).includes('unrelated-cache'));
      console.log(`PASS ${scenario}: offline reload, 6 scripts/CSS, five tabs, map pins/heat, 390x844 bounds`);
      await ctx.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
