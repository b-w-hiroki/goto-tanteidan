// GO-TO 探偵団 — スモークテスト
// 使い方: node tests/smoke.js
//   要: playwright（npm i -D playwright && npx playwright install chromium）
//   環境変数 PW_EXECUTABLE で Chromium バイナリを指定可能
// 主要フローを一気通貫で検証し、失敗があれば非0で終了する。

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

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

  // 1. 起動とタブ巡回
  for (const tab of ['map', 'rank', 'book', 'home']) {
    await page.evaluate(t => document.querySelector(`.tab[data-view="${t}"]`).click(), tab);
    await page.waitForTimeout(300);
  }
  check('起動＋全タブ巡回でJSエラーなし', pageErrors.length === 0, pageErrors[0]);

  // 1b. マップにピンが描画される（サイズ0キャッシュ退行の検知）
  await page.evaluate(() => document.querySelector('.tab[data-view="map"]').click());
  await page.waitForTimeout(800);
  const mapState = await page.evaluate(() => ({
    h: map ? map.getSize().y : 0,
    pins: document.querySelectorAll('.leaflet-marker-icon').length,
  }));
  check('マップが実サイズで初期化されピン描画', mapState.h > 0 && mapState.pins > 0, `h:${mapState.h} pins:${mapState.pins}`);
  await page.evaluate(() => document.querySelector('.tab[data-view="home"]').click());
  await page.waitForTimeout(300);

  // 2. 警戒度スケールの全画面一致（home badge / map brief / HQ / area sheet）
  const scale = await page.evaluate(() => {
    const s = forecastLevel().score;
    openHQBriefing();
    const hq = document.querySelector('.hq-threat-lv').textContent.includes(String(s));
    closeHQBriefing();
    openAreaSheet();
    const area = document.querySelector('.as-score').textContent.includes(String(s));
    document.getElementById('area-sheet').classList.remove('open');
    return { hq, area };
  });
  check('警戒度スケールが全画面で一致', scale.hq && scale.area);

  // 3. カメラ投稿フロー（絵文字フォールバック）
  const beforePosts = await page.evaluate(() => STATE.posts);
  await page.evaluate(() => document.querySelector('.tab[data-view="cam"]').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('shutter').click());
  await page.waitForTimeout(3600);
  await page.evaluate(() => document.getElementById('cam-done').click());
  await page.waitForTimeout(800);
  const afterPosts = await page.evaluate(() => STATE.posts);
  check('カメラ撮影→投稿でカウント増加', afterPosts === beforePosts + 1, `${beforePosts}→${afterPosts}`);

  // 4. 対処で警戒度が下がる
  const resolve = await page.evaluate(() => {
    const before = forecastLevel().score;
    openMarkingSheet(MARKINGS.find(m => m.type === 'danger' && !m.resolved));
    document.getElementById('ms-resolve-btn').click();
    return { before, after: forecastLevel().score };
  });
  check('対処で警戒度が低下', resolve.after < resolve.before, `${resolve.before}→${resolve.after}`);

  // 5. 図鑑コレクション（投稿したマークに✓）
  await page.evaluate(() => document.querySelector('.tab[data-view="book"]').click());
  await page.waitForTimeout(400);
  const bookBadges = await page.evaluate(() => document.querySelectorAll('.br-found').length);
  check('図鑑に発見済みバッジ', bookBadges >= 1, `${bookBadges}件`);

  // 6. 未発見フィルタ
  await page.evaluate(() => document.querySelector('[data-bfilter="unfound"]').click());
  await page.waitForTimeout(300);
  const unfound = await page.evaluate(() => ({
    rows: document.querySelectorAll('.book-row').length,
    badges: document.querySelectorAll('.br-found').length
  }));
  check('未発見フィルタが機能', unfound.badges === 0 && unfound.rows >= 1);

  // 7. モーダルシートとバックドロップ
  await page.evaluate(() => document.querySelector('.tab[data-view="home"]').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => openMissionSheet());
  await page.waitForTimeout(400);
  const modal = await page.evaluate(() => ({
    open: document.getElementById('mission-sheet').classList.contains('open'),
    backdrop: document.getElementById('sheet-backdrop').classList.contains('show')
  }));
  await page.mouse.click(215, 30);
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => !document.getElementById('mission-sheet').classList.contains('open'));
  check('モーダル＋背景タップで閉じる', modal.open && modal.backdrop && closed);

  // 8. 週刊報告書
  await page.evaluate(() => openWeeklyReport());
  await page.waitForTimeout(400);
  const report = await page.evaluate(() => ({
    open: document.getElementById('report-sheet').classList.contains('open'),
    bars: document.querySelectorAll('.bar7-col').length
  }));
  await page.evaluate(() => document.getElementById('report-sheet').classList.remove('open'));
  check('週刊報告書＋7日チャート', report.open && report.bars === 7);

  // 9. 言語切替の往復
  const lang = await page.evaluate(() => {
    setLangSafe('en');
    const en = document.querySelector('[data-i18n="tab_home"]').textContent;
    setLangSafe('ja');
    const ja = document.querySelector('[data-i18n="tab_home"]').textContent;
    function setLangSafe(l) {
      if (typeof setLang === 'function') { setLang(l); return; }
      LANG = l; applyStaticI18n(); renderHome();
    }
    return { en, ja };
  });
  check('言語切替の往復', lang.en === 'Home' && lang.ja === 'ホーム', JSON.stringify(lang));

  // 10. デモモードの開始と停止
  await page.evaluate(() => startDemo());
  await page.waitForTimeout(600);
  const demoStarted = await page.evaluate(() => demoOn && !!document.getElementById('demo-ind'));
  await page.evaluate(() => stopDemo());
  const demoStopped = await page.evaluate(() => !demoOn && !document.getElementById('demo-ind'));
  check('デモモードの開始/停止', demoStarted && demoStopped);

  // 11. 全体を通してJSエラーゼロ
  check('全フロー実行後もJSエラーなし', pageErrors.length === 0, pageErrors[0]);

  await browser.close();
  srv.close();

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
