// PWA update QA v1. Canonical source: studio-playbook/templates/pwa-update/.
// Test-only server; never point this harness at a public site or a user profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(process.env.PWA_ROOT || path.join(__dirname, '..'));
const config = JSON.parse(fs.readFileSync(path.resolve(process.argv[2] || path.join(__dirname, 'pwa-update.json'))));
assert(['manual', 'automatic'].includes(config.activation));
for (const field of ['worker', 'oldCache', 'newCache', 'failureAsset']) assert(config[field], field);
assert.notEqual(config.oldCache, config.newCache, 'use a real version migration');
const current = fs.readFileSync(path.join(root, config.worker));
const historical = file => config.oldRef
  ? execFileSync('git', ['show', `${config.oldRef}:${file}`], { cwd: root })
  : fs.readFileSync(path.join(root, file === config.worker ? config.oldWorker : file));
let state = { old: true, fail: false, offline: false };
let injected = 0;
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/app/__qa') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>PWA update contract</title>'); return;
  }
  let file = decodeURIComponent(pathname).replace(/^\/app\//, '') || 'index.html';
  if (file === config.worker) {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    res.end(state.old ? historical(file) : current); return;
  }
  if (state.offline) { req.socket.destroy(); return; }
  if (state.fail && file === config.failureAsset) {
    injected++; res.writeHead(503).end('injected required-asset failure'); return;
  }
  const full = path.resolve(root, file);
  if (!full.startsWith(root + path.sep)) { res.writeHead(404).end(); return; }
  try {
    const body = state.old ? historical(file) : fs.readFileSync(full);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    // Keep analytics, APIs and application initialization out of lifecycle QA.
    if (file.endsWith('.html')) res.setHeader('Content-Security-Policy', "script-src 'none'");
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const base = `http://127.0.0.1:${server.address().port}/app/`;
  const snapshot = name => page.evaluate(async name => {
    const cache = await caches.open(name);
    return Promise.all((await cache.keys()).map(async req => {
      const res = await cache.match(req);
      const bytes = await res.arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
      return [req.url, res.status, hash];
    }));
  }, name);
  const foreign = async () => assert.equal(await page.evaluate(async () => {
    const cache = await caches.open('foreign-pwa-v1');
    return (await cache.match('/other-app/sentinel'))?.text();
  }), 'keep');
  async function offlineNavigation() {
    for (const file of config.offlinePages) {
      const frame = await page.evaluateHandle(file => {
        const frame = document.createElement('iframe'); frame.src = file;
        document.body.append(frame); return frame;
      }, file);
      await page.waitForFunction(({ frame, marker }) => frame.contentDocument?.documentElement?.outerHTML.includes(marker), { frame, marker: config.htmlMarker });
      // Assert real application text, not a browser error page or an empty document.
      assert(await frame.evaluate((f, marker) => f.contentDocument.documentElement.outerHTML.includes(marker), config.htmlMarker));
      await frame.evaluate(f => f.remove()); await frame.dispose();
    }
  }
  async function update() {
    await page.evaluate(async () => {
      const r = window.registration;
      window.candidate = r.installing || r.waiting;
      r.addEventListener('updatefound', () => { window.candidate = r.installing; }, { once: true });
      await r.update();
      window.candidate = r.installing || r.waiting || window.candidate;
    });
  }
  try {
    await page.goto(base + '__qa');
    await page.evaluate(async worker => {
      window.registration = await navigator.serviceWorker.register(worker);
      await navigator.serviceWorker.ready;
    }, config.worker);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(async () => {
      window.previousController = navigator.serviceWorker.controller;
      const cache = await caches.open('foreign-pwa-v1');
      await cache.put('/other-app/sentinel', new Response('keep'));
    });
    const before = await snapshot(config.oldCache);
    assert(before.length > 0, 'old precache must be populated');
    state = { old: false, fail: true, offline: false };
    await update();
    await page.waitForFunction(() => window.candidate?.state === 'redundant');
    assert(injected > 0, '503 must actually be requested by the worker');
    assert(await page.evaluate(async () => {
      const r = window.registration;
      return !r.waiting && navigator.serviceWorker.controller === window.previousController && r.active.state === 'activated';
    }), 'failed candidate must leave the old controller active');
    assert.deepEqual(await snapshot(config.oldCache), before, 'old cached response bytes preserved');
    await foreign();
    state.offline = true;
    await offlineNavigation();
    state.offline = false; state.fail = false;
    await update();
    if (config.activation === 'manual') {
      await page.waitForFunction(async () => {
        const r = window.registration;
        if (r.waiting) window.candidate = r.waiting;
        return window.candidate?.state === 'installed' && !!r.waiting;
      });
      assert(await page.evaluate(() => navigator.serviceWorker.controller === window.previousController));
      assert.deepEqual(await snapshot(config.oldCache), before, 'cache retained until approval');
      await page.evaluate(message => {
        if (window.candidate?.state !== 'installed') throw new Error('manual candidate must remain installed until approval: ' + JSON.stringify({ candidate: window.candidate?.state, waiting: window.registration.waiting?.state, active: window.registration.active?.state }));
        window.candidate.postMessage(message);
      }, config.approvalMessage);
    }
    await page.waitForFunction(() => window.candidate?.state === 'activated' && navigator.serviceWorker.controller !== window.previousController);
    const keys = await page.evaluate(() => caches.keys());
    assert(!keys.includes(config.oldCache), 'obsolete own cache removed');
    assert(keys.includes(config.newCache), 'new cache exists');
    await foreign();
    for (const file of config.requiredAssets) {
      assert(await page.evaluate(async ({ name, file }) => !!(await (await caches.open(name)).match(file)), { name: config.newCache, file }), file);
    }
    state.offline = true; await offlineNavigation();
    state.offline = false;
    assert.equal((await page.request.get(base + 'index.html')).status(), 200, 'network recovery');
    console.log(JSON.stringify({ result: 'PASS', app: config.app, activation: config.activation, injected503: injected,
      oldEntries: before.length, workerSHA256: createHash('sha256').update(current).digest('hex'), browser: browser.version() }));
  } finally { await context.close(); await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { server.closeAllConnections(); server.close(); });
