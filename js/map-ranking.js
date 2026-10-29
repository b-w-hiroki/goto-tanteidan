// ── 探偵団（チーム）ランキング ──
// 今週の対抗戦：隣接順位のチームとの週間ポイントバトル（決定的なダミー生成＋自分の獲得分）
function weeklyBattle(){
  const sorted = teamsSorted();
  const mine = myTeam();
  const myIdx = sorted.findIndex(t=>t.id===mine.id);
  const rival = sorted[myIdx === 0 ? 1 : myIdx - 1];       // 1つ上（首位なら2位）と対戦
  const seed = hashStr(weekStr() + mine.id + rival.id);
  const minePt  = 300 + (seed % 260) + Math.round((STATE.earned||0) * .4);
  const rivalPt = 300 + (hashStr(weekStr() + rival.id) % 320);
  const now = new Date();
  const daysLeft = 7 - ((now.getDay() + 6) % 7);           // 日曜終わりまで
  return { mine, rival, minePt, rivalPt, daysLeft };
}
function renderTeam(){
  const sorted = teamsSorted();
  const mine = myTeam();
  const myRank = sorted.findIndex(t=>t.id===mine.id) + 1;
  const memUnit = LANG==='en' ? '' : '名';
  const b = weeklyBattle();
  const total = Math.max(1, b.minePt + b.rivalPt);
  const mySharePct = Math.round(b.minePt / total * 100);
  const leading = b.minePt >= b.rivalPt;
  const battleHtml = `
    <div class="battle-card">
      <div class="bc-head">
        <b>${icon('shield',15)} ${LANG==='en'?'Weekly Squad Battle':'今週の対抗戦'}</b>
        <span class="bc-days">${LANG==='en'?`${b.daysLeft}d left`:`残り${b.daysLeft}日`}</span>
      </div>
      <div class="bc-sides">
        <div class="bc-side me${leading?' lead':''}">
          <span class="bc-emoji">${b.mine.emoji}</span>
          <b>${fmt(b.minePt)}</b><span>${tx(b.mine,'name')}</span>
        </div>
        <div class="bc-vs">VS</div>
        <div class="bc-side${leading?'':' lead'}">
          <span class="bc-emoji">${b.rival.emoji}</span>
          <b>${fmt(b.rivalPt)}</b><span>${tx(b.rival,'name')}</span>
        </div>
      </div>
      <div class="bc-bar">
        <i class="bc-mine" style="width:calc(${mySharePct}% - 1px)"></i>
        <i class="bc-rival" style="width:calc(${100-mySharePct}% - 1px)"></i>
      </div>
      <div class="bc-foot">
        <span>${leading
          ? (LANG==='en'?`Leading by ${fmt(b.minePt-b.rivalPt)}pt`:`${fmt(b.minePt-b.rivalPt)}pt リード中`)
          : (LANG==='en'?`${fmt(b.rivalPt-b.minePt)}pt behind`:`あと ${fmt(b.rivalPt-b.minePt)}pt で逆転`)}</span>
        <button class="bc-cta" onclick="openMissionSheet()">${LANG==='en'?'Contribute →':'ミッションで貢献 →'}</button>
      </div>
    </div>`;
  document.getElementById('myteam-card').innerHTML = `
    <div class="myteam">
      <div class="mt-top">
        <div class="mt-emoji">${mine.emoji}</div>
        <div class="mt-name"><b>${tx(mine,'name')}</b><span>${t('my_team_sub')}</span></div>
        <div class="mt-rankbadge">${myRank}${t('rank_suffix')} / ${TEAMS.length}${t('teams_suffix')}</div>
      </div>
      <div class="mt-stats">
        <div class="mt-cell"><b>${fmt(teamDisplayPt(mine))}</b><span>${t('team_total')}</span></div>
        <div class="mt-cell"><b>${mine.members}</b><span>${t('team_members')}</span></div>
        <div class="mt-cell"><b style="color:var(--gold)">${fmt(STATE.earned)}</b><span>${t('your_contrib')}</span></div>
      </div>
    </div>` + battleHtml;
  document.getElementById('team-list').innerHTML = sorted.map((tm,i)=>{
    const cls = i===0?'g':i===1?'s':i===2?'b':'';
    const medal = i<3 ? icon('award',20,`color:${['#D4A820','#B8BEC8','#C08552'][i]}`) : (i+1);
    const memLabel = LANG==='en' ? `${tm.members} members` : `${tm.members}名`;
    return `<div class="team-row ${tm.id===mine.id?'mine':''}">
      <div class="tr-pos ${cls}">${medal}</div>
      <div class="tr-emoji">${tm.emoji}</div>
      <div class="tr-info"><b>${tx(tm,'name')}</b><span>${memLabel}${tm.id===mine.id?' · '+t('your_team'):''}</span></div>
      <div class="tr-pt">${fmt(teamDisplayPt(tm))}</div>
    </div>`;
  }).join('');
}
let rankTab = 'solo';
function switchRankTab(tab){
  rankTab = tab;
  document.querySelectorAll('#rank-tabs .rt').forEach(b=>b.classList.toggle('active', b.dataset.rtab===tab));
  document.getElementById('rank-solo').style.display = tab==='solo' ? 'block' : 'none';
  document.getElementById('rank-team').style.display = tab==='team' ? 'block' : 'none';
  if(tab==='team') renderTeam();
}

// 各ランカーの代表的な投稿（ダミー生成）
const RS_SAMPLE_MARKS = [
  { mark:'⚡', bg:'rgba(230,57,70,.2)', label:'インターホン側面の傷', v:'濃厚' },
  { mark:'→', bg:'rgba(230,57,70,.2)', label:'メーターの矢印', v:'濃厚' },
  { mark:'●', bg:'rgba(244,162,97,.2)', label:'表札周りのシール', v:'要確認' },
  { mark:'✕', bg:'rgba(244,162,97,.2)', label:'郵便受け裏の記号', v:'要確認' },
  { mark:'M', bg:'rgba(230,57,70,.2)', label:'ベランダ柵のテープ', v:'濃厚' },
  { mark:'○', bg:'rgba(100,116,139,.2)', label:'落書き・自然な汚れ', v:'偶然' },
];
const RS_AGOS = ['たった今','1時間前','3時間前','昨日','2日前','3日前'];
function openRankSheet(idx){
  const r = RANKS[currentSeg][idx];
  const posts = Number((r.area.match(/(\d+)件/)||[])[1] || 0);
  // 件数に応じて代表投稿数を決定（最大6件表示）
  const show = Math.min(6, Math.max(3, posts % 6 + 3));
  const start = idx % RS_SAMPLE_MARKS.length;
  let html = '';
  const vMap = { '濃厚':t('ff_ok'), '要確認':t('ff_warn'), '偶然':t('ff_ng') };
  for (let k=0; k<show; k++){
    const p = RS_SAMPLE_MARKS[(start+k)%RS_SAMPLE_MARKS.length];
    const ago = txAgo(RS_AGOS[k%RS_AGOS.length]);
    html += `<div class="rs-post">
      <div class="rp-mark" style="background:${p.bg}">${p.mark}</div>
      <div class="rp-tx"><b>${txLabel(p.label)}</b><span>${vMap[p.v]||p.v} · ${ago}</span></div>
    </div>`;
  }
  const danger = Math.round(posts * 0.45);
  const warn = Math.round(posts * 0.35);
  const segLabel = currentSeg==='week'?t('seg_week'):currentSeg==='month'?t('seg_month'):t('seg_all');
  const sheet = document.getElementById('rank-sheet');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="rs-prof">
      <div class="rs-av" style="background:${r.bg}">${r.av}</div>
       <div class="rs-name"><b>${escapeHTML(txName(r.name))}</b><span>${txArea(r.area)}</span></div>
      <button class="rs-close" id="rs-close">×</button>
    </div>
    <div class="rs-stats">
      <div class="rs-stat"><b>${fmt(r.pt)}</b><span>${segLabel} ${t('pts_label')}</span></div>
      <div class="rs-stat"><b style="color:#E63946">${danger}</b><span>${t('detected_danger')}</span></div>
      <div class="rs-stat"><b style="color:#F4A261">${warn}</b><span>${t('detected_warn')}</span></div>
    </div>
    <div class="rs-sub">${t('recent_posts')}</div>
    <div class="rs-posts">${html}</div>`;
  document.getElementById('rs-close').onclick = ()=>sheet.classList.remove('open');
  sheet.classList.add('open');
}

// ── Map ──
let map = null, markerLayer = null, mapFailed = false;
function resizeVisibleMap(){
  // A delayed resize may run after the user has already left the map tab.
  const el = document.getElementById('map');
  if (map && el && el.clientWidth > 0 && el.clientHeight > 0) map.invalidateSize();
}
function initMap(){
  if (map) { setTimeout(resizeVisibleMap, 100); return; }
  if (typeof L === 'undefined' || typeof L.map !== 'function'){
    if (!mapFailed){
      mapFailed = true;
      const el = document.getElementById('map');
      if (el) el.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:30px;text-align:center;color:var(--gray)">
        <div style="color:var(--gray)">${icon('map',40)}</div>
        <div style="font-size:13px;line-height:1.7">${t('map_fail')}</div>
        <button class="btn primary" style="width:auto;padding:11px 26px;margin-top:6px" onclick="retryMap()">${LANG==='en'?'Retry':'再読み込み'}</button></div>`;
    }
    return;
  }
  map = L.map('map', { zoomControl:false, attributionControl:false }).setView([35.6595, 139.7010], 16);
  map.on('click', (e) => { if(routePick){ handleRoutePickTap(e.latlng); return; } closeMarkingSheet(); });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
  const useCluster = typeof L.markerClusterGroup === 'function';
  markerLayer = useCluster ? L.markerClusterGroup({ maxClusterRadius:50, disableClusteringAtZoom:17 }) : L.layerGroup();
  addMarkingsToLayer(markerLayer);
  markerLayer.addTo(map);
  setTimeout(resizeVisibleMap, 200);
  drawRouteOnMap();
}
// Leaflet読込失敗時の再試行：スクリプトを再挿入してから initMap をやり直す
function retryMap(){
  const el = document.getElementById('map');
  if (el) el.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:13px">⏳ ${LANG==='en'?'Loading map…':'マップを読み込み中…'}</div>`;
  const done = () => { mapFailed = false; initMap(); if (map) renderMapOverlay(); };
  if (typeof L !== 'undefined' && typeof L.map === 'function'){ done(); return; }
  const s = document.createElement('script');
  s.src = 'vendor/leaflet/leaflet.js';
  s.onload = done;
  s.onerror = done; // 失敗時は initMap が再びエラー表示を出す
  document.head.appendChild(s);
}
let mapTypeFilter = 'all';
function addMarkingsToLayer(layer){
  MARKINGS.forEach(m => {
    if(mapTypeFilter !== 'all' && m.type !== mapTypeFilter) return;
    if(routeFocus && hasRoute() && !onRoute(m)) return;   // 通学路沿いだけに絞る
    const color = m.resolved ? '#3B82F6' : TYPE_COLOR[m.type];
    const opacity = m.resolved ? 'opacity:.55;filter:grayscale(.4)' : '';
    const icon = L.divIcon({ className:'', html:`<div class="pin" style="background:${color};${opacity}"><span>${m.mark}</span></div>`, iconSize:[26,26], iconAnchor:[13,26] });
    L.marker([m.lat,m.lng], { icon }).addTo(layer)
      .on('click', () => openMarkingSheet(m));
  });
}
// 投稿されたあと、その記号がどうなったのか。トグル1つでは因果が見えないので、
// 投稿 → 住民の確認 → 対処 の3段を並べて、いまどこにいるかを示す。
function lifecycleHtml(m, feedEntry){
  const checks = feedEntry ? (feedEntry.reactions?.check || 0) : 0;
  const steps = [
    { done:true, label: LANG==='en'?'Reported':'投稿された',
       sub: `${escapeHTML(txName(m.user))} · ${txAgo(m.ago)}` },
    { done: checks>0, label: LANG==='en'?'Confirmed by neighbours':'近隣の探偵が確認',
      sub: checks>0 ? (LANG==='en'?`${checks} confirmations`:`${checks}人が現地を確認`)
                    : (LANG==='en'?'Awaiting confirmation':'確認待ち') },
    { done: !!m.resolved, label: LANG==='en'?'Addressed':'対処された',
      sub: m.resolved ? (LANG==='en'?'Removed and reported back':'消去・報告まで完了')
                      : (LANG==='en'?'Not yet addressed':'まだ対処されていません') },
  ];
  return `<div class="lifecycle">${steps.map((st,i)=>`
    <div class="lc-step${st.done?' done':''}${i===steps.length-1?' last':''}">
      <div class="lc-dot">${st.done?icon('check',11):''}</div>
      <div class="lc-tx"><b>${st.label}</b><span>${st.sub}</span></div>
    </div>`).join('')}</div>`;
}

function openMarkingSheet(m){
  const color = m.resolved ? '#3B82F6' : (m.type==='danger'?'#E63946':m.type==='warn'?'#F4A261':'#64748B');
  const badgeBg = m.resolved ? 'rgba(59,130,246,.2)' : (m.type==='danger'?'rgba(230,57,70,.2)':m.type==='warn'?'rgba(244,162,97,.2)':'rgba(100,116,139,.2)');
  const iconBg = m.type==='danger'?'rgba(230,57,70,.18)':m.type==='warn'?'rgba(244,162,97,.18)':'rgba(100,116,139,.18)';
  const verdictLbl = m.resolved ? (LANG==='en'?'Resolved':'対処済み') : txVerdict(m.verdict);
  const feedEntry = FEED.find(f => f.who===m.user && f.mark===m.mark);
  const conf = feedEntry ? feedEntry.conf : null;
  const aiComment = feedEntry ? tx(feedEntry,'aiComment') : null;
  const feedIdx = feedEntry ? FEED.indexOf(feedEntry) : -1;
  const resolvedSection = m.resolved
    ? `<div class="ms-resolved-badge"><span>${icon('checkCircle',20)}</span><div><b style="font-size:13px">${LANG==='en'?'Resolved':'対処済み'}</b><div style="font-size:11px;color:var(--gray)">${LANG==='en'?'This marking has been addressed.':'このマーキングは対処済みです。'}</div></div></div>`
    : `<button class="ms-resolve-btn" id="ms-resolve-btn">${icon('check',14)} ${LANG==='en'?'Mark as resolved':'対処済みにする'}</button>`;
  const lifecycle = lifecycleHtml(m, feedEntry);
  const catIdx = MARK_CATALOG.findIndex(c => c.mark === m.mark);
  const bookLink = catIdx >= 0
    ? `<button class="ms-book-link" onclick="closeMarkingSheet();switchView('book');openBookSheet(${catIdx})">${icon('book',14)} ${LANG==='en'?'What this mark means':'この記号の意味を手帳で見る'}</button>`
    : '';
  document.getElementById('mark-sheet').innerHTML = `
    <div class="grab"></div>
    <div class="ms-head">
      <div class="ms-icon" style="background:${iconBg}">${m.mark}</div>
      <div class="ms-info">
        <b>${txLabel(m.label)}</b>
        <div class="ms-meta">
          <span class="chip ${m.type==='danger'?'ok':m.type==='warn'?'warn':'ng'}" style="font-size:10px">${verdictLbl}</span>
        </div>
      </div>
      <button class="ms-close" onclick="closeMarkingSheet()">×</button>
    </div>
    <div class="ms-body">
      ${conf !== null ? `<div class="conf-row"><span class="conf-lbl">${t('cam_conf')}</span><div class="conf-bar"><i style="width:${conf}%;background:${color}"></i></div><span class="conf-val" style="color:${color}">${conf}%</span></div>` : ''}
      ${aiComment ? `<div class="ai-comment">${icon('cpu',14)} ${aiComment}</div>` : ''}
      ${lifecycle}
      ${resolvedSection}
      ${bookLink}
    </div>`;
  const resolveBtn = document.getElementById('ms-resolve-btn');
  if(resolveBtn){
    resolveBtn.onclick = () => {
      const beforeScore = forecastLevel().score;
      m.resolved = true;
      if(feedIdx >= 0){ FEED[feedIdx].resolved = true; }
      STATE.resolved = (STATE.resolved||0) + 1;
      gainPoints(20); bumpDaily('resolve'); checkAchievements(); updateRankData(20);
      resolvedFeedbackToast(beforeScore);
      renderHome(); renderMapOverlay(); refreshMapPins(); saveState();
      closeMarkingSheet();
    };
  }
  document.getElementById('mark-sheet').classList.add('open');
}
function closeMarkingSheet(){
  document.getElementById('mark-sheet').classList.remove('open');
}
function refreshMapPins(){
  if(!map || !markerLayer) return;
  markerLayer.clearLayers();
  addMarkingsToLayer(markerLayer);
}

// ── 通学路（マイルート）──
// このアプリは「渋谷区全体」の話をしていて、使う人自身の道の話をしていなかった。
// 自宅と目的地の2点を登録すると、その線から一定距離内のマーキングだけを切り出す。
const ROUTE_RADIUS_M = 160;   // 「その道沿い」とみなす距離
let routeFocus = false;       // マップをルート沿いだけに絞っているか
let routePick = null;         // 登録中: {step:0|1, from:{lat,lng}}
let routeLayer = null;

function hasRoute(){ const r = STATE.route; return !!(r && r.from && r.to); }
// 緯度経度をメートルの平面に落とす（数百m規模なら等距円筒近似で十分）
function toXY(p, originLat){
  const R = 6371000, rad = Math.PI/180;
  return { x: p.lng*rad*R*Math.cos(originLat*rad), y: p.lat*rad*R };
}
// 点と線分の距離（メートル）
function distToRouteM(p){
  const r = STATE.route;
  if(!hasRoute()) return Infinity;
  const o = r.from.lat;
  const a = toXY(r.from,o), b = toXY(r.to,o), c = toXY(p,o);
  const dx = b.x-a.x, dy = b.y-a.y;
  const len2 = dx*dx + dy*dy;
  let t = len2 ? ((c.x-a.x)*dx + (c.y-a.y)*dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(c.x-(a.x+t*dx), c.y-(a.y+t*dy));
}
function onRoute(m){ return distToRouteM(m) <= ROUTE_RADIUS_M; }
// ルート沿いの未対処件数
function routeStats(){
  const near = MARKINGS.filter(m=>!m.resolved && onRoute(m));
  return {
    danger: near.filter(m=>m.type==='danger').length,
    warn:   near.filter(m=>m.type==='warn').length,
    total:  near.length,
  };
}
function routeLengthM(){
  if(!hasRoute()) return 0;
  const o = STATE.route.from.lat;
  const a = toXY(STATE.route.from,o), b = toXY(STATE.route.to,o);
  return Math.hypot(b.x-a.x, b.y-a.y);
}

function drawRouteOnMap(){
  if(!map) return;
  if(routeLayer){ map.removeLayer(routeLayer); routeLayer = null; }
  if(!hasRoute()) return;
  const r = STATE.route;
  routeLayer = L.layerGroup();
  L.polyline([[r.from.lat,r.from.lng],[r.to.lat,r.to.lng]],
    { color:'#7DD3FC', weight:5, opacity:.85, dashArray:'1 9', lineCap:'round' }).addTo(routeLayer);
  [[r.from,'home'],[r.to,'school']].forEach(([pt,kind])=>{
    L.marker([pt.lat,pt.lng], { icon: L.divIcon({ className:'',
      html:`<div class="route-pin ${kind}">${icon(kind==='home'?'home':'flag',13)}</div>`,
      iconSize:[26,26], iconAnchor:[13,13] }) }).addTo(routeLayer);
  });
  routeLayer.addTo(map);
}

function startRoutePick(){
  switchView('map');
  routeFocus = false;
  routePick = { step:0, from:null };
  renderMapOverlay();
  showToast(LANG==='en' ? 'Tap your home on the map' : '地図で自宅の位置をタップ');
}
function cancelRoutePick(){ routePick = null; renderMapOverlay(); }
function handleRoutePickTap(latlng){
  if(!routePick) return;
  if(routePick.step === 0){
    routePick.from = { lat:latlng.lat, lng:latlng.lng };
    routePick.step = 1;
    renderMapOverlay();
    showToast(LANG==='en' ? 'Now tap the school or workplace' : '次に学校・職場の位置をタップ');
    return;
  }
  STATE.route = { from: routePick.from, to: { lat:latlng.lat, lng:latlng.lng } };
  routePick = null;
  routeFocus = true;
  saveState();
  drawRouteOnMap();
  refreshMapPins();
  renderMapOverlay();
  renderHome();
  showToast(LANG==='en' ? 'Route saved' : '通学路を登録しました');
}
function toggleRouteFocus(){
  if(!hasRoute()){ startRoutePick(); return; }
  routeFocus = !routeFocus;
  refreshMapPins();
  renderMapOverlay();
}
function clearRoute(){
  STATE.route = null; routeFocus = false; routePick = null;
  if(routeLayer && map){ map.removeLayer(routeLayer); routeLayer = null; }
  saveState(); refreshMapPins(); renderMapOverlay(); renderHome();
}

// ── パトロール記録 ──
// 渋谷周辺をぐるりと回る徒歩ルート（ダミーGPS）
const PATROL_ROUTE = [
  [35.6595,139.7010],[35.6600,139.7021],[35.6609,139.7028],[35.6617,139.7023],
  [35.6622,139.7011],[35.6618,139.6999],[35.6610,139.6991],[35.6601,139.6995],
  [35.6594,139.7001],[35.6589,139.7012],[35.6592,139.7024],[35.6599,139.7029],
  [35.6606,139.7019],[35.6598,139.7011],
];
const PATROL_PT_PER_KM = 120;
let patrolState = null; // { i, km, sec, line, walker, timer } | null
function haversineKm(a, b){
  const R = 6371, toR = Math.PI/180;
  const dLat = (b[0]-a[0])*toR, dLng = (b[1]-a[1])*toR;
  const la1 = a[0]*toR, la2 = b[0]*toR;
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function fmtTime(sec){ const m=Math.floor(sec/60), s=sec%60; return m+':'+String(s).padStart(2,'0'); }
function patrolHud(){
  const km = patrolState.km;
  document.getElementById('ph-time').textContent = fmtTime(patrolState.sec);
  document.getElementById('ph-dist').textContent = km.toFixed(2);
  document.getElementById('ph-pts').textContent = Math.round(km*PATROL_PT_PER_KM);
}
function togglePatrol(){
  if(patrolState) finishPatrol();
  else startPatrol();
}
function startPatrol(){
  if(!map || mapFailed){ showToast(t('patrol_need_map')); return; }
  map.setView(PATROL_ROUTE[0], 16);
  const line = L.polyline([PATROL_ROUTE[0]], { color:'#E63946', weight:5, opacity:.85 }).addTo(map);
  const wIcon = L.divIcon({ className:'', html:`<div class="patrol-walker">${icon('route',15)}</div>`, iconSize:[24,24], iconAnchor:[12,12] });
  const walker = L.marker(PATROL_ROUTE[0], { icon:wIcon, zIndexOffset:1000 }).addTo(map);
  patrolState = { i:0, km:0, sec:0, line, walker, timer:null };
  document.getElementById('patrol-hud').classList.add('show');
  document.getElementById('patrol-fab').classList.add('live');
  document.getElementById('pf-lbl').textContent = t('patrol_stop');
  patrolHud();
  patrolState.timer = setInterval(patrolTick, 750);
}
function patrolTick(){
  if(!patrolState) return;
  const next = patrolState.i + 1;
  if(next >= PATROL_ROUTE.length){ finishPatrol(); return; }
  const from = PATROL_ROUTE[patrolState.i], to = PATROL_ROUTE[next];
  patrolState.km += haversineKm(from, to);
  patrolState.sec += Math.round(haversineKm(from, to)*1000/1.3); // ~1.3m/s 徒歩換算
  patrolState.i = next;
  patrolState.line.addLatLng(to);
  patrolState.walker.setLatLng(to);
  map.panTo(to, { animate:true, duration:.6 });
  patrolHud();
}
function finishPatrol(){
  if(!patrolState) return;
  clearInterval(patrolState.timer);
  const km = patrolState.km, sec = patrolState.sec;
  const gained = Math.max(10, Math.round(km*PATROL_PT_PER_KM));
  // クリーンアップ
  if(patrolState.walker) map.removeLayer(patrolState.walker);
  const finishedLine = patrolState.line;
  setTimeout(()=>{ if(finishedLine && map) map.removeLayer(finishedLine); }, 4000);
  patrolState = null;
  document.getElementById('patrol-hud').classList.remove('show');
  document.getElementById('patrol-fab').classList.remove('live');
  document.getElementById('pf-lbl').textContent = t('patrol_start');
  // 報酬付与
  gainPoints(gained);
  STATE.patrols = (STATE.patrols||0) + 1;
  STATE.patrolKm = +(((STATE.patrolKm||0) + km).toFixed(2));
  bumpDaily('patrol');
  checkAchievements();
  updateRankData(gained);
  showPatrolDone(km, sec, gained);
  renderHome();
  saveState();
}
function cancelPatrol(){
  if(!patrolState) return;
  clearInterval(patrolState.timer);
  if(patrolState.walker && map) map.removeLayer(patrolState.walker);
  if(patrolState.line && map) map.removeLayer(patrolState.line);
  patrolState = null;
  const hud = document.getElementById('patrol-hud'); if(hud) hud.classList.remove('show');
  const fab = document.getElementById('patrol-fab'); if(fab) fab.classList.remove('live');
  const lbl = document.getElementById('pf-lbl'); if(lbl) lbl.textContent = t('patrol_start');
}
function showPatrolDone(km, sec, gained){
  const el = document.getElementById('patrol-done');
  if(!el) return;
  el.innerHTML = `
    <div class="pd-ic">${icon('award',46)}</div>
    <h3>${t('patrol_done_title')}</h3>
    <div class="pd-stats">
      <div class="pd-stat"><b>${km.toFixed(2)}</b><span>km</span></div>
      <div class="pd-stat"><b>${fmtTime(sec)}</b><span>${t('patrol_time')}</span></div>
    </div>
    <div class="pd-pts">+${fmt(gained)} ${t('pt')}</div>
    <button class="pd-close" onclick="document.getElementById('patrol-done').classList.remove('show')">${t('patrol_close')}</button>`;
  el.classList.add('show');
  launchConfetti();
}

// ── Camera flow ──
// 撮影対象（毎回ランダムでリプレイ感を出す）
const CAM_SUBJECTS = [
  { target:'📮', place:'渋谷区宇田川町付近', place_en:'near Udagawa-cho, Shibuya' },
  { target:'🚪', place:'渋谷区桜丘町付近', place_en:'near Sakuragaoka-cho, Shibuya' },
  { target:'📦', place:'渋谷区道玄坂付近', place_en:'near Dogenzaka, Shibuya' },
  { target:'🅿️', place:'渋谷区神南付近', place_en:'near Jinnan, Shibuya' },
  { target:'🏠', place:'渋谷区松濤付近', place_en:'near Shoto, Shibuya' },
  { target:'🔌', place:'渋谷区円山町付近', place_en:'near Maruyama-cho, Shibuya' },
];
