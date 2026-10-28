// ── ランキング: 自分の貢献カード ──
function renderMyContrib(){
  const el = document.getElementById('my-contrib-wrap');
  if(!el) return;
  // 週間ランキングの自分の行と同じデータ源から導出し、画面間で数字を一致させる
  const meRow = RANKS.week.find(r=>r.me);
  const weekPosts = meRow ? +(meRow.area.match(/(\d+)件/)||[0,0])[1] : (STATE.myPosts||0);
  const weekScore = meRow ? meRow.pt : 0;
  const title = LANG==='en' ? 'YOUR CONTRIBUTION' : 'あなたの今週の貢献';
  el.innerHTML = `
    <div class="my-contrib">
      <div class="my-contrib-title">${title}</div>
      <div class="my-contrib-grid">
        <div class="mc-cell"><b>${weekPosts}</b><span>${LANG==='en'?'Posts':'投稿数'}</span></div>
        <div class="mc-cell"><b>${STATE.patrols||0}</b><span>${LANG==='en'?'Patrols':'パトロール'}</span></div>
        <div class="mc-cell"><b>${STATE.resolved||0}</b><span>${LANG==='en'?'Resolved':'対処済み'}</span></div>
        <div class="mc-cell"><b>${fmt(weekScore)}</b><span>${LANG==='en'?'Week score':'週間スコア'}</span></div>
      </div>
    </div>`;
}

let obStep = 0;
function obGo(step){
  const slides = document.querySelectorAll('.ob-slide');
  const dots = document.querySelectorAll('.ob-dot');
  slides.forEach((s, i) => { s.style.transform = `translateX(${(i - step) * 100}%)`; });
  dots.forEach((d, i) => { d.className = 'ob-dot' + (i === step ? ' on' : ''); });
  obStep = step;
  document.getElementById('ob-next').textContent = step < slides.length - 1 ? t('ob_next') : t('ob_start');
}
document.getElementById('ob-next').onclick = () => {
  const slides = document.querySelectorAll('.ob-slide');
  if (obStep < slides.length - 1) {
    obGo(obStep + 1);
  } else {
    showSetup();
  }
};

// ── Nav ──
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active','anim-in'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const view = document.getElementById('view-'+name);
  view.classList.add('active');
  // スタッガー演出はタブ切替時のみ（renderHome等の再描画では再生しない）
  if(name !== 'map' && name !== 'cam'){
    view.classList.add('anim-in');
    clearTimeout(view._animT);
    view._animT = setTimeout(()=>view.classList.remove('anim-in'), 700);
  }
  document.querySelector(`.tab[data-view="${name}"]`).classList.add('active');
  if (name!=='map') { cancelPatrol(); if(typeof stopTimelapse==='function' && tlPlaying) stopTimelapse(); }
  if (name!=='cam') stopCamPreview();
  if (name==='map') { initMap(); bumpDaily('map'); saveState(); }
  if (name==='cam') camIdle();
  if (name==='book') renderBook();
  if (name==='home') { STATE.unread = 0; renderBadge(); }
  if (name==='rank' && rankTab==='team') renderTeam();
  // タブ切替時はモーダル・シート類をすべて閉じる
  document.getElementById('detail-modal').classList.remove('open');
  document.getElementById('info-view').classList.remove('open');
  document.getElementById('gov-view').classList.remove('open');
  ['notif-sheet','rank-sheet','area-sheet','level-sheet','mypage-sheet','quiz-sheet','card-sheet','stats-sheet','safety-sheet','alert-sheet','mission-sheet','book-sheet','mark-sheet','report-sheet'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
}

// inject map container into map view once
document.getElementById('view-map').innerHTML = `
  <div id="map"></div>
  <div class="patrol-hud" id="patrol-hud">
    <div class="ph-cell"><span class="ph-ic">⏱</span><b id="ph-time">0:00</b></div>
    <div class="ph-cell"><span class="ph-ic">${icon('map',13)}</span><b id="ph-dist">0.00</b></div>
    <div class="ph-cell pts"><span class="ph-ic">${icon('star',13)}</span><b id="ph-pts">0</b></div>
  </div>
  <div class="map-overlay" id="map-overlay"></div>
  <button class="patrol-fab" id="patrol-fab" onclick="togglePatrol()" aria-label="パトロールを開始">
    <span class="pf-ic">${icon('route',18)}</span><span class="pf-lbl" id="pf-lbl">START</span>
  </button>
  <div class="map-tools" id="map-tools"></div>
  <div class="route-pick-bar" id="route-pick-bar"></div>
  <div class="patrol-done" id="patrol-done"></div>
  <div class="area-sheet" id="area-sheet"></div>
  <div class="tl-hud" id="tl-hud"></div>`;

function isRecent(ago){ return /分前|時間前|たった今/.test(ago); }

// ── タイムラプス：直近30日のマーキング出現→対処の推移を再生 ──
let tlPlaying = false, tlTimer = null;
function seedTimeline(){
  MARKINGS.forEach(m => {
    if(m.tlDay === undefined){
      m.tlDay = hashStr((m.label||'') + (m.user||'') + m.lat) % 28;          // 出現日（0=30日前側）
      if(m.resolved) m.tlResolveDay = Math.min(29, m.tlDay + 2 + hashStr((m.mark||'') + m.lng) % 6);
    } else if(m.resolved && m.tlResolveDay === undefined){
      m.tlResolveDay = Math.min(29, m.tlDay + 2 + hashStr((m.mark||'') + m.lng) % 6);
    }
  });
}
function timelapseStats(step){
  const shown = MARKINGS.filter(m => m.tlDay <= step);
  const isDone = m => m.tlResolveDay !== undefined && m.tlResolveDay <= step;
  const active = shown.filter(m => !isDone(m));
  const danger = active.filter(m => m.type==='danger').length;
  const warn   = active.filter(m => m.type==='warn').length;
  const score  = Math.min(100, danger*10 + warn*4 + (dayHash()%18));
  return { shown, isDone, resolvedCount: shown.length - active.length, score };
}
function renderTimelapsePins(st){
  if(!map || !markerLayer) return;
  markerLayer.clearLayers();
  st.shown.forEach(m => {
    const done = st.isDone(m);
    const color = done ? '#3B82F6' : TYPE_COLOR[m.type];
    const opacity = done ? 'opacity:.55;filter:grayscale(.4)' : '';
    const icon = L.divIcon({ className:'', html:`<div class="pin" style="background:${color};${opacity};animation:none"><span>${m.mark}</span></div>`, iconSize:[26,26], iconAnchor:[13,26] });
    L.marker([m.lat, m.lng], { icon }).addTo(markerLayer);
  });
}
function toggleTimelapse(){
  if(tlPlaying){ stopTimelapse(); return; }
  if(!map || mapFailed){ showToast(t('toast_map_need')); return; }
  seedTimeline();
  tlPlaying = true;
  renderMapOverlay();
  const hud = document.getElementById('tl-hud');
  let step = 0;
  const tick = () => {
    const st = timelapseStats(step);
    const d = new Date(); d.setDate(d.getDate() - (29 - step));
    const dateLbl = `${d.getMonth()+1}/${d.getDate()}`;
    if(hud){
      hud.classList.add('on');
      hud.innerHTML = `
        <b>${icon('film',13)} ${dateLbl}</b>
        <div class="tl-meta">${LANG==='en'
          ? `${st.shown.length} markings · ${st.resolvedCount} resolved · risk ${st.score}`
          : `マーキング ${st.shown.length}件 ・ 対処 ${st.resolvedCount}件 ・ 警戒度 ${st.score}`}</div>
        <div class="tl-track"><i style="width:${Math.round((step+1)/30*100)}%"></i></div>`;
    }
    renderTimelapsePins(st);
    step++;
    if(step >= 30){
      if(hud) hud.innerHTML = `<b>${LANG==='en'?'Today':'現在'}</b><div class="tl-meta">${LANG==='en'?'Back to live map':'現在のマップに戻ります'}</div><div class="tl-track"><i style="width:100%"></i></div>`;
      tlTimer = setTimeout(stopTimelapse, 1400);
    } else {
      tlTimer = setTimeout(tick, 190);
    }
  };
  tick();
}
function stopTimelapse(){
  tlPlaying = false;
  clearTimeout(tlTimer);
  const hud = document.getElementById('tl-hud');
  if(hud) hud.classList.remove('on');
  if(map && markerLayer) refreshMapPins();
  renderMapOverlay();
}

// ── デモモード：主要フローを自動再生（展示・プレゼン用）──
let demoOn = false, demoTimer = null;
const DEMO_STEPS = [
  [() => switchView('home'), 2600],
  [() => openMissionSheet(), 3200],
  [() => { document.getElementById('mission-sheet').classList.remove('open'); switchView('map'); }, 1800],
  [() => { if(!tlPlaying) toggleTimelapse(); }, 9200],
  [() => switchView('cam'), 1600],
  [() => { const s = document.getElementById('shutter'); if(s) s.click(); }, 4200],
  [() => { const b = document.getElementById('cam-done'); if(b) b.click(); }, 3200],
  [() => switchView('book'), 1400],
  [() => openBookSheet(Math.floor(Math.random()*MARK_CATALOG.length)), 3200],
  [() => { closeBookSheet(); switchView('rank'); switchRankTab('team'); }, 3800],
  [() => openWeeklyReport(), 4200],
  [() => document.getElementById('report-sheet').classList.remove('open'), 700],
];
function demoTick(i){
  if(!demoOn) return;
  const [fn, wait] = DEMO_STEPS[i % DEMO_STEPS.length];
  try { fn(); } catch(e) { /* デモ中の一時的な状態差異は無視して次へ */ }
  demoTimer = setTimeout(() => demoTick(i + 1), wait);
}
function startDemo(){
  if(demoOn) return;
  demoOn = true;
  const ind = document.createElement('div');
  ind.className = 'demo-ind';
  ind.id = 'demo-ind';
  ind.textContent = LANG==='en' ? 'Demo — tap anywhere to exit' : 'デモ再生中 ・ タップで終了';
  document.querySelector('.phone').appendChild(ind);
  setTimeout(() => document.addEventListener('pointerdown', stopDemo, true), 400);
  demoTick(0);
}
function stopDemo(){
  if(!demoOn) return;
  demoOn = false;
  clearTimeout(demoTimer);
  document.removeEventListener('pointerdown', stopDemo, true);
  const ind = document.getElementById('demo-ind');
  if(ind) ind.remove();
  if(tlPlaying) stopTimelapse();
  switchView('home');
}
function setMapFilter(type){
  mapTypeFilter = mapTypeFilter === type ? 'all' : type;
  refreshMapPins();
  renderMapOverlay();
}
function renderMapOverlay(){
  // ピルは「未対処の脅威」件数（対処済みは警戒度からも除外済み）
  const danger = MARKINGS.filter(m=>m.type==='danger' && !m.resolved).length;
  const warn   = MARKINGS.filter(m=>m.type==='warn' && !m.resolved).length;
  const safe   = MARKINGS.filter(m=>m.type==='safe').length;
  const recent = MARKINGS.filter(m=>isRecent(m.ago)).length;
  const ov = document.getElementById('map-overlay');
  if(ov){
    const lvl = forecastLevel();
    const topAlert = ALERTS[0];
    const topTitle = topAlert ? (LANG==='en' ? (topAlert.title_en||topAlert.title) : topAlert.title) : '';
    const restTx = ALERTS.length>1 ? (LANG==='en' ? ` +${ALERTS.length-1} more` : ` ほか${ALERTS.length-1}件`) : '';
    ov.innerHTML = `
      <div class="map-brief" id="map-brief" role="button" aria-label="地域アラート一覧を開く">
        <span class="mb-ic" style="color:${lvl.c}">${icon(lvl.ic,26)}</span>
        <div class="mb-tx">
          <b>${t('fc_label')}${LANG==='en'?': ':'：'}<span style="color:${lvl.c}">${t('fc_'+lvl.k)}</span> <span style="color:var(--gray);font-weight:600">${lvl.score}/100</span></b>
          <span>${icon('megaphone',13)} ${topTitle}${restTx}</span>
        </div>
        <div class="row-arr">›</div>
      </div>
      <div class="map-pill filter-danger${mapTypeFilter==='danger'?' on':''}" id="pill-danger"><span class="dot" style="background:#E63946"></span>${t('ov_danger')} ${danger}</div>
      <div class="map-pill filter-warn${mapTypeFilter==='warn'?' on':''}" id="pill-warn"><span class="dot" style="background:#F4A261"></span>${t('ov_warn')} ${warn}</div>
      <div class="map-pill filter-safe${mapTypeFilter==='safe'?' on':''}" id="pill-safe"><span class="dot" style="background:#64748B"></span>${LANG==='en'?'Safe':'偶然'} ${safe}</div>`;
    document.getElementById('map-brief').onclick = openAlertSheet;
    document.getElementById('pill-danger').onclick = () => setMapFilter('danger');
    document.getElementById('pill-warn').onclick   = () => setMapFilter('warn');
    document.getElementById('pill-safe').onclick   = () => setMapFilter('safe');
  }
  // 表示レイヤーの切替（絞り込みチップとは役割が違うので下部に分離）
  const tools = document.getElementById('map-tools');
  if(tools){
    tools.innerHTML = `
      <button class="map-tool${heatOn?' on':''}" id="pill-heat">${icon('flame',13)} ${t('ov_heat')}</button>
      <button class="map-tool" id="pill-stats">${icon('chart',13)} ${t('ov_stats')}</button>
      <button class="map-tool${tlPlaying?' on':''}" id="pill-timelapse">${icon('film',13)} ${LANG==='en'?'Timeline':'推移'}</button>
      <button class="map-tool${routeFocus?' on':''}" id="pill-route">${icon('route',13)} ${t('route_short')}</button>`;
    document.getElementById('pill-heat').onclick = toggleHeat;
    document.getElementById('pill-stats').onclick = openAreaSheet;
    document.getElementById('pill-timelapse').onclick = toggleTimelapse;
    document.getElementById('pill-route').onclick = toggleRouteFocus;
  }
  // 通学路の登録ガイド（地図をタップさせる短い案内）
  const rp = document.getElementById('route-pick-bar');
  if(rp){
    if(routePick){
      rp.innerHTML = `<span>${icon('route',14)} ${routePick.step===0?t('route_pick1'):t('route_pick2')}</span>
        <button class="rpb-cancel" onclick="cancelRoutePick()">${t('route_cancel')}</button>`;
      rp.classList.add('show');
    } else rp.classList.remove('show');
  }
}

// ── ヒートマップ ──
const HEAT_WEIGHT = { danger:1.0, warn:0.55, safe:0.2 };
let heatLayer = null, heatOn = false;
function buildHeat(){
  const pts = MARKINGS.map(m=>[m.lat, m.lng, HEAT_WEIGHT[m.type]||0.4]);
  return L.heatLayer(pts, { radius:38, blur:26, maxZoom:17,
    gradient:{0.3:'#457B9D', 0.55:'#F4A261', 0.8:'#E63946'} });
}
function toggleHeat(){
  if(!map || mapFailed){ showToast(t('toast_map_need')); return; }
  if(typeof L.heatLayer !== 'function'){ showToast(t('toast_heat_err')); return; }
  heatOn = !heatOn;
  if(heatOn){ heatLayer = buildHeat(); heatLayer.addTo(map); }
  else if(heatLayer){ map.removeLayer(heatLayer); heatLayer = null; }
  renderMapOverlay();
}
function refreshHeat(){
  if(heatOn && map){
    if(heatLayer) map.removeLayer(heatLayer);
    heatLayer = buildHeat(); heatLayer.addTo(map);
  }
}

// ── エリア統計シート ──
function openAreaSheet(){
  const danger = MARKINGS.filter(m=>m.type==='danger').length;
  const warn   = MARKINGS.filter(m=>m.type==='warn').length;
  const safe   = MARKINGS.filter(m=>m.type==='safe').length;
  const total  = MARKINGS.length;
  // ホーム/マップ/HQと同じ警戒度スケールに統一
  const fc = forecastLevel();
  const score = fc.score;
  const lvl = { label: t('fc_'+fc.k), c: fc.c };
  const sheet = document.getElementById('area-sheet');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="as-hd"><b>${t('as_title')}</b><button class="as-close" id="as-close">×</button></div>
    <div class="as-score"><b style="color:${lvl.c}">${score}</b><span>/100 · ${lvl.label}</span></div>
    <div class="danger-meter"><i style="width:${score}%;background:${lvl.c}"></i></div>
    <div class="as-grid">
      <div class="as-cell"><b style="color:#E63946">${danger}</b><span>${t('as_danger')}</span></div>
      <div class="as-cell"><b style="color:#F4A261">${warn}</b><span>${t('as_warn')}</span></div>
      <div class="as-cell"><b style="color:#64748B">${safe}</b><span>${t('as_safe2')}</span></div>
    </div>
    <div class="as-grid" style="grid-template-columns:1fr 1fr">
      <div class="as-cell"><b>${total}</b><span>${t('as_total')}</span></div>
      <div class="as-cell"><b>${MARKINGS.filter(m=>isRecent(m.ago)).length}</b><span>${t('as_24h')}</span></div>
    </div>`;
  document.getElementById('as-close').onclick = ()=>sheet.classList.remove('open');
  sheet.classList.add('open');
}
renderMapOverlay();

document.querySelectorAll('.tab').forEach(t=>{
  t.onclick = () => switchView(t.dataset.view);
});
document.querySelectorAll('.seg button').forEach(b=>{
  b.onclick = () => {
    document.querySelectorAll('.seg button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    renderRank(b.dataset.seg);
  };
});

// rank tabs: 個人 / 探偵団
document.querySelectorAll('#rank-tabs .rt').forEach(b=>{
  b.onclick = () => switchRankTab(b.dataset.rtab);
});

// badge click → open notif sheet without switching tab
document.getElementById('home-badge').addEventListener('click', e => {
  e.stopPropagation();
  openNotifSheet();
});

// hero tap → open level perks sheet
document.getElementById('home-hero').addEventListener('click', openLevelSheet);

// profile (avatar) tap → open my page
document.getElementById('profile-btn').addEventListener('click', openMyPage);

// feed filter chips
document.querySelectorAll('#feed-filter .ff-chip').forEach(b=>{
  b.onclick = () => {
    document.querySelectorAll('#feed-filter .ff-chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    feedFilter = b.dataset.filter;
    renderHome();
  };
});

// book search + filter
document.getElementById('book-search').addEventListener('input', e => {
  bookQuery = e.target.value; renderBook();
});
document.querySelectorAll('#book-filter .ff-chip').forEach(b=>{
  b.onclick = () => {
    document.querySelectorAll('#book-filter .ff-chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    bookFilter = b.dataset.bfilter;
    renderBook();
  };
});

// 防犯クイズ / セーフティ
document.getElementById('quiz-btn').addEventListener('click', openQuiz);
document.getElementById('safety-btn').addEventListener('click', openSafety);

// PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

// init: 保存データの復元 → デイリー更新 → 言語適用 → 初回はオンボーディング
loadState();
const isNewDay = ensureDaily();
ensureWeekly();
seedHistory();
seedFound();
seedReactions();
syncProfileToRanks();
applyAccent();
applyStaticI18n();
if (ONBOARDED) {
  const ob = document.getElementById('onboard');
  if (ob) ob.remove();
}
renderHome();
// 初回表示にもスタッガー演出
(() => {
  const hv = document.getElementById('view-home');
  hv.classList.add('anim-in');
  setTimeout(()=>hv.classList.remove('anim-in'), 700);
})();
if(isNewDay) setTimeout(doCheckin, 900);
renderRank('week');
renderMapOverlay();
updateStatusTime();
setInterval(updateStatusTime, 30000);

// ── シート共通UX：背景タップ＆（ボトムシートは）下スワイプで閉じる ──
const SHEET_SELECTOR = '.notif-sheet,.rank-sheet,.area-sheet,.level-sheet,.mypage-sheet,.quiz-sheet,.card-sheet,.stats-sheet,.safety-sheet,.alert-sheet,.mission-sheet,.book-sheet,.mark-sheet,.report-sheet,.detail-modal';
// ボトムシート（下から出る詳細系）だけスワイプで閉じられる。他は中央モーダル
const BOTTOM_SHEETS = ['mark-sheet', 'book-sheet', 'area-sheet', 'notif-sheet'];
// マップ上のシートは地図操作を妨げない非モーダル扱い（背景暗転なし）
const NONMODAL_SHEETS = ['mark-sheet', 'area-sheet'];
function openModalSheets(){
  return [...document.querySelectorAll(SHEET_SELECTOR)]
    .filter(s => s.classList.contains('open') && !NONMODAL_SHEETS.includes(s.id));
}
function syncSheetBackdrop(){
  const modal = openModalSheets().length > 0;
  document.getElementById('sheet-backdrop').classList.toggle('show', modal);
  const screenEl = document.getElementById('screen');
  if(screenEl) screenEl.setAttribute('aria-hidden', modal ? 'true' : 'false');
}
// 端末フレーム（.phone）は overflow:hidden でも「プログラム的スクロール」は可能で、
// 入力欄フォーカス時にブラウザが自動スクロールさせると画面全体がずれたまま戻らない。
// 常に原点へ引き戻して端末フレームを固定する。
function lockPhoneFrame(){
  const ph = document.querySelector('.phone');
  if(!ph) return;
  const reset = () => { if(ph.scrollTop || ph.scrollLeft){ ph.scrollTop = 0; ph.scrollLeft = 0; } };
  ph.addEventListener('scroll', reset, { passive: true });
  ph.addEventListener('focusin', () => setTimeout(reset, 0));
  reset();
}
lockPhoneFrame();

// 開いたシートへフォーカスを移し、閉じたら元の場所へ返す。
// これがないと、キーボードだけで開いたときに背後の画面をたどることになる。
let _focusBeforeSheet = null;
function focusFirstIn(el){
  const f = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  (f || el).focus({ preventScroll: true });
}
function syncSheetFocus(){
  const open = [...document.querySelectorAll(SHEET_SELECTOR)].filter(s => s.classList.contains('open'));
  const top = open[open.length - 1];
  if(top){
    if(!top.contains(document.activeElement)){
      if(!_focusBeforeSheet) _focusBeforeSheet = document.activeElement;
      focusFirstIn(top);
    }
  } else if(_focusBeforeSheet){
    if(document.body.contains(_focusBeforeSheet)) _focusBeforeSheet.focus({ preventScroll: true });
    _focusBeforeSheet = null;
  }
}

function initSheetUX(){
  const sheets = document.querySelectorAll(SHEET_SELECTOR);
  // 支援技術にモーダルとして伝える
  sheets.forEach(s => {
    s.setAttribute('role', 'dialog');
    s.setAttribute('aria-modal', 'true');
    if(!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '-1');
  });
  const onChange = () => { syncSheetBackdrop(); syncSheetFocus(); };
  const mo = new MutationObserver(onChange);
  sheets.forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));
  document.getElementById('sheet-backdrop').onclick = () => {
    openModalSheets().forEach(s => s.classList.remove('open'));
  };
  // Escで最前面のモーダル/シート → フルスクリーンビューの順に閉じる
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const opens = [...document.querySelectorAll(SHEET_SELECTOR)].filter(s => s.classList.contains('open'));
    if (opens.length){ opens.forEach(s => s.classList.remove('open')); return; }
    for (const id of ['info-view', 'gov-view', 'hq-view']){
      const el = document.getElementById(id);
      if (el && el.classList.contains('open')){ el.classList.remove('open'); return; }
    }
  });
  [...sheets].filter(s => BOTTOM_SHEETS.includes(s.id)).forEach(sheet => {
    let startY = null, dy = 0, dragging = false;
    sheet.addEventListener('touchstart', e => {
      // 中身がスクロール済みなら引き下げジェスチャーは発火させない
      let el = e.target;
      while (el && el !== sheet){ if (el.scrollTop > 0) return; el = el.parentElement; }
      startY = e.touches[0].clientY; dy = 0; dragging = true;
      sheet.classList.add('sheet-dragging');
    }, { passive: true });
    sheet.addEventListener('touchmove', e => {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      sheet.style.transform = dy > 0 ? `translateY(${dy}px)` : '';
    }, { passive: true });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove('sheet-dragging');
      sheet.style.transform = '';
      if (dy > 90) sheet.classList.remove('open');
    };
    sheet.addEventListener('touchend', endDrag);
    sheet.addEventListener('touchcancel', endDrag);
  });
}
initSheetUX();
