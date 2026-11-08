// Real Service Worker lifecycle tests, served below a GitHub Pages-style subpath.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const current = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
// Immutable pre-JS-split revision: exercise the actual v4 application shell.
const oldFiles = new Map();
function oldFile(file) {
  const ref = version === 'main' ? 'ece41767e8ab6fe624d05c71ccd5441361ab96c2' : '9500387';
  const key = `${ref}:${file}`;
  if (!oldFiles.has(key)) oldFiles.set(key, execFileSync('git', ['show', key], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }));
  return oldFiles.get(key);
}
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let version = 'current', fail = false;
const server = http.createServer((req, res) => {
  const file = new URL(req.url, 'http://localhost').pathname.replace(/^\/app\//, '') || 'index.html';
  if (fail && file === 'js/core-data.js') { res.writeHead(503); res.end('injected failure'); return; }
  let body;
  try { body = version !== 'current' ? oldFile(file) : file === 'sw.js' ? current : fs.readFileSync(path.join(root, file)); }
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
    // Negative control: use the actual main map code; the same rapid exit must fail.
    const negative = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const np = await negative.newPage();
    const negativeErrors = [];
    np.on('pageerror', e => negativeErrors.push(e.message));
    await np.route('**/js/map-ranking.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: execFileSync('git', ['show', 'ece41767e8ab6fe624d05c71ccd5441361ab96c2:js/map-ranking.js'], { cwd: root, encoding: 'utf8' }),
    }));
    await np.goto(base);
    await np.evaluate(() => { switchView('map'); toggleHeat(); switchView('rank'); });
    await np.waitForTimeout(350);
    assert(negativeErrors.some(e => /source width|canvas/i.test(e)), `main must reproduce hidden Canvas error: ${negativeErrors}`);
    await negative.close();
    console.log('PASS negative control: main reproduces hidden Canvas error');
    for (const scenario of ['fresh', 'upgrade', 'failed-upgrade', 'main-upgrade', 'main-failed-upgrade']) {
      version = scenario === 'fresh' ? 'current' : scenario.startsWith('main-') ? 'main' : 'old';
      const oldCache = version === 'main' ? 'goto-tanteidan-v5' : 'goto-tanteidan-v4'; fail = false;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await ctx.newPage(); page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base); await controlled(page);
      await page.evaluate(async () => { ONBOARDED = true; saveState(); const c = await caches.open('unrelated-cache'); await c.put('/other-app/sentinel', new Response('keep-me')); });
      if (scenario !== 'fresh') {
        const before = await page.evaluate(async name => {
          const c = await caches.open(name);
          return { script: await (await c.match('./index.html')).text() };
        }, oldCache);
        await page.evaluate(() => { window.previousController = navigator.serviceWorker.controller; });
        version = 'current'; fail = scenario.endsWith('failed-upgrade');
        const outcome = await update(page);
        assert.equal(outcome, fail ? 'redundant' : 'activated', scenario);
        if (fail) {
          const keys = await page.evaluate(() => caches.keys());
          assert(keys.includes(oldCache), 'failed update must retain old cache');
          assert(await page.evaluate(() => navigator.serviceWorker.controller === window.previousController), 'old controller remains active');
          assert.equal(await page.evaluate(async name => (await (await caches.open(name)).match('./index.html')).text(), oldCache), before.script, 'old shell unchanged');
          await ctx.setOffline(true);
          await page.reload();
          await page.waitForFunction(() => typeof switchView === 'function');
          await page.evaluate(() => { switchView('book'); switchView('home'); });
          assert.equal(await page.evaluate(async () => (await caches.match('/other-app/sentinel')).text()), 'keep-me');
          await ctx.setOffline(false);
          assert(keys.includes('unrelated-cache'), 'unrelated cache must survive');
          console.log('PASS failed precache rejects installation and preserves old worker/cache');
          fail = false;
          assert.equal(await update(page), 'activated', 'retry succeeds');
        }
      }
      await page.waitForFunction(async () => !(await caches.keys()).includes('goto-tanteidan-v4'));
      const assets = await page.evaluate(async () => {
        const c = await caches.open('goto-tanteidan-v7');
        return (await c.keys()).map(r => new URL(r.url).pathname);
      });
      for (const file of ['styles.css', ...['core-data','state-missions','home-sheets','map-ranking','camera-setup','layers-init'].map(x => `js/${x}.js`)]) assert(assets.includes(`/app/${file}`), file);
      await page.evaluate(() => { ONBOARDED = true; saveState(); });
      await ctx.setOffline(true); await page.reload();
      await page.waitForFunction(() => typeof switchView === 'function');
      // All three actions run in one task, before either delayed resize can fire.
      await page.evaluate(() => { switchView('map'); toggleHeat(); switchView('rank'); });
      await page.waitForTimeout(300);
      for (const tab of ['map', 'rank', 'book', 'cam', 'home']) {
        await page.locator(`.tab[data-view="${tab}"]`).click();
        assert(await page.locator(`#view-${tab}`).evaluate(el => el.classList.contains('active')));
        if (tab === 'map') {
          await page.waitForFunction(() => map && map.getSize().y > 0 && document.querySelectorAll('.leaflet-marker-icon').length > 0);
          await page.locator('#map').dispatchEvent('wheel', { deltaY: -100 });
          await page.locator('#pill-heat').click();
        }
        assert(await page.locator('.tabbar').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
        if (process.env.SCREENSHOT_DIR) { await page.waitForTimeout(800); fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${scenario}-${tab}.png`) }); }
      }
      assert(await page.locator('link[href="styles.css"]').evaluate(el => !!el.sheet));
      assert.deepEqual(errors, []);
      assert((await page.evaluate(() => caches.keys())).includes('unrelated-cache'));
      assert.equal(await page.evaluate(async () => (await caches.match('/other-app/sentinel')).text()), 'keep-me');
      console.log(`PASS ${scenario}: offline reload, 6 scripts/CSS, five tabs, map pins/heat, 390x844 bounds`);
      await ctx.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
