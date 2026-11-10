// GO-TO 探偵団 — スモークテスト
// 使い方: node tests/smoke.js
//   要: playwright（npm i -D playwright && npx playwright install chromium）
//   環境変数 PW_EXECUTABLE で Chromium バイナリを指定可能
// 主要フローを一気通貫で検証し、失敗があれば非0で終了する。

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, () => resolve(srv));
  });
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  const { chromium } = require('playwright');
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch(
    process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {}
  );
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  await page.goto(base);
  await page.evaluate((t) => {
    localStorage.setItem('goto-tanteidan-save-v1', JSON.stringify({
      v: 1,
      state: { points: 2480, posts: 38, myPosts: 14, streak: 5, earned: 1240, lastCheckin: t, history: {} },
      profile: { name: 'ユウキ', avatar: '🕵️', team: 'shibuya' },
      daily: { date: t, picks: ['post2', 'danger1', 'patrol1'], progress: {}, done: {}, earned: 0, claimed: [] },
      onboarded: true
    }));
  }, todayStr);
  await page.reload();
  await page.waitForTimeout(1500);


  const assert = require('node:assert/strict');
  fs.mkdirSync('test-results/camera', {recursive:true});
  await page.route('https://**/*', route => route.abort());
  await page.evaluate(() => {
    window.__cameraRequests = 0;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {configurable:true,value:async()=>{
      window.__cameraRequests++; throw new Error('permission denied');
    }});
  });
  for (const [width,height] of [[390,844],[320,640]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>switchView('cam'));
    await page.waitForFunction(()=>document.getElementById('cam-status').textContent.includes('写真なし'));
    assert.match(await page.locator('.camera-demo-note').innerText(),/架空/);
    await page.waitForTimeout(400);
    await page.screenshot({path:`test-results/camera/idle-${width}.png`,fullPage:true});
    await page.locator('#shutter').click();
    await page.locator('#cam-cancel').click();
    await page.waitForTimeout(3300);
    assert.equal(await page.locator('#cam-done').count(),0);
    await page.locator('#shutter').click();
    await page.evaluate(()=>switchView('home'));
    await page.waitForTimeout(3300);
    assert.equal(await page.locator('#cam-done').count(),0);
    await page.evaluate(()=>switchView('cam'));
    await page.locator('#shutter').click();
    await page.locator('#cam-done').waitFor();
    await page.screenshot({path:`test-results/camera/result-${width}.png`,fullPage:true});
    const before = await page.evaluate(()=>({posts:STATE.posts,requests:window.__cameraRequests}));
    await page.evaluate(()=>{ window.__confirmCamera = document.getElementById('cam-done').onclick; });
    await page.locator('#cam-done').click();
    await page.evaluate(()=>window.__confirmCamera());
    await page.waitForTimeout(2400);
    assert.equal(await page.evaluate(()=>STATE.posts),before.posts+1);
    assert.equal(await page.evaluate(()=>window.__cameraRequests),before.requests,'map must not restart camera');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
  }
  assert.deepEqual(pageErrors,[]);
  console.log('Camera denial/cancel/leave/result/map regressions passed at 390 and 320');
  await browser.close(); srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
