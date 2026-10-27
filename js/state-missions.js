// ───────────────────────────── RENDER ─────────────────────────────
function fmt(n){ return n.toLocaleString('ja-JP'); }

function getLevelInfo(pts){
  let idx = 0;
  for(let i=0;i<LEVELS.length;i++){ if(pts>=LEVELS[i].min) idx=i; else break; }
  const cur=LEVELS[idx], next=LEVELS[idx+1]||null;
  const pct = next ? Math.min(100,Math.round((pts-cur.min)/(next.min-cur.min)*100)) : 100;
  const rem = next ? Math.max(0,next.min-pts) : 0;
  return { cur, next, pct, rem };
}

// ── ポイント加算（全獲得ポイントを集約。デイリー報酬ゲージにも反映） ──
function gainPoints(n){
  if(!n) return;
  STATE.points += n;
  STATE.earned += n;
  DAILY.earned = (DAILY.earned||0) + n;
}
// 受け取り可能な段階報酬の数
function claimableTiers(){
  const earned = DAILY.earned||0, claimed = DAILY.claimed||[];
  return REWARD_TIERS.filter((tr,i)=> earned >= tr.at && !claimed.includes(i)).length;
}
// 指定ティアの段階報酬を受け取る（ボーナスはゲージに加算しない＝多重解放を防ぐ）
function claimRewardTier(i){
  const tr = REWARD_TIERS[i];
  if(!tr) return;
  if(!DAILY.claimed) DAILY.claimed = [];
  if((DAILY.earned||0) < tr.at || DAILY.claimed.includes(i)) return;
  DAILY.claimed.push(i);
  STATE.points += tr.bonus; STATE.earned += tr.bonus;
  showToast(`${t('reward_claimed')} +${tr.bonus}${t('pt')}`);
  checkAchievements();
  updateRankData(tr.bonus);
  renderHome();
  openMissionSheet(); // ゲージを再描画
  saveState();
}

// ── 永続化（localStorage）──
const SAVE_KEY = 'goto-tanteidan-save-v1';
function saveState(){
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v:1, state:STATE, profile:PROFILE, feed:FEED, markings:MARKINGS,
      ach:ACH_UNLOCKED, daily:DAILY, weekly:WEEKLY, quiz:QUIZ, ranks:RANKS, onboarded:ONBOARDED, lang:LANG
    }));
  } catch(e){ /* localStorage 不可環境は無視 */ }
}
function loadState(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const d = JSON.parse(raw);
    if(d.state) Object.assign(STATE, d.state);
    if(d.profile) Object.assign(PROFILE, d.profile);
    if(Array.isArray(d.feed)){ FEED.length=0; FEED.push(...d.feed); }
    if(Array.isArray(d.markings)){ MARKINGS.length=0; MARKINGS.push(...d.markings); }
    if(Array.isArray(d.ach)) ACH_UNLOCKED = d.ach.slice();
    if(d.daily) Object.assign(DAILY, d.daily);
    if(d.weekly) Object.assign(WEEKLY, d.weekly);
    if(d.quiz) Object.assign(QUIZ, d.quiz);
    if(d.ranks){ ['week','month','all'].forEach(k=>{ if(d.ranks[k]) RANKS[k] = d.ranks[k]; }); }
    ONBOARDED = !!d.onboarded;
    if(d.lang) LANG = d.lang;
    return true;
  } catch(e){ return false; }
}
function resetAll(){
  try { localStorage.removeItem(SAVE_KEY); } catch(e){}
  location.reload();
}

// ── 言語切替 ──
function applyStaticI18n(){
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k = el.getAttribute('data-i18n');
    el.innerHTML = t(k);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  const ob = document.getElementById('ob-next');
  if(ob) ob.textContent = (typeof obStep!=='undefined' && obStep>=2) ? t('ob_start') : t('ob_next');
}
function setLang(lang){
  if(lang===LANG) return;
  LANG = lang;
  syncProfileToRanks();
  applyStaticI18n();
  renderHome();
  if(typeof currentSeg!=='undefined') renderRank(currentSeg);
  renderBook();
  if(typeof rankTab!=='undefined' && rankTab==='team') renderTeam();
  renderMapOverlay();
  saveState();
}

// プロフィール名をランキングの自分の行に反映
function syncProfileToRanks(){
  const suffix = LANG==='en' ? ' (You)' : '（あなた）';
  Object.values(RANKS).forEach(seg=>{
    const me = seg.find(r=>r.me);
    if(me){ me.name = `${PROFILE.name}${suffix}`; me.av = PROFILE.avatar; }
  });
}

// ── デイリー / ウィークリーミッション ──
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
// 今週（月曜始まり）の識別キー
function weekStr(){
  const d=new Date(); const day=(d.getDay()+6)%7; // 月曜=0
  const mon=new Date(d); mon.setDate(d.getDate()-day); mon.setHours(0,0,0,0);
  return mon.getFullYear()+'-'+(mon.getMonth()+1)+'-'+mon.getDate();
}
// 共通：プール から n 個ランダムに引いてストアを初期化
function rollMissions(store, pool, n, keyField, keyVal){
  store[keyField] = keyVal;
  const bag = pool.slice(), picks = [];
  while(picks.length < n && bag.length){
    picks.push(bag.splice(Math.floor(Math.random()*bag.length),1)[0].id);
  }
  store.picks = picks; store.progress = {}; store.done = {};
  picks.forEach(id=>{ store.progress[id]=0; store.done[id]=false; });
  store.earned = 0; store.claimed = [];
}
function ensureDaily(){
  const today = todayStr();
  if(DAILY.date === today && DAILY.picks.length){
    if(DAILY.earned === undefined) DAILY.earned = 0;
    if(!DAILY.claimed) DAILY.claimed = [];
    return false; // same day, no check-in needed
  }
  // New day — compute consecutive streak
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yStr = yest.getFullYear()+'-'+(yest.getMonth()+1)+'-'+yest.getDate();
  if(!STATE.lastCheckin){
    // first ever check-in — keep preset streak value as-is
  } else if(STATE.lastCheckin === yStr){
    STATE.streak = (STATE.streak || 0) + 1;  // consecutive
  } else if(STATE.lastCheckin !== today){
    STATE.streak = 1; // streak broken
  }
  STATE.lastCheckin = today;
  rollMissions(DAILY, DAILY_POOL, 3, 'date', today);
  saveState();
  return true; // new day — trigger check-in
}
function ensureWeekly(){
  if(WEEKLY.week === weekStr() && WEEKLY.picks.length) return;
  rollMissions(WEEKLY, WEEKLY_POOL, 3, 'week', weekStr());
  saveState();
}

function todayRowHtml(){
  const postsToday = STATE.history[todayStr()] || 0;
  const patrolDone = DAILY.progress && (DAILY.progress['patrol'] || 0) > 0;
  const mDone = Object.keys(DAILY.done||{}).filter(k=>DAILY.done[k]).length;
  const mTotal = DAILY.picks ? DAILY.picks.length : 3;
  return `
    <div class="hero-cell${postsToday>0?' active':''}" onclick="switchView('cam')">
      <div class="hc-ic">${icon('camera',15)}</div><b>${postsToday}</b><span>${t('td_posts')}</span>
    </div>
    <div class="hero-cell${patrolDone?' done':''}" onclick="switchView('map')">
      <div class="hc-ic">${icon('route',15)}</div><b>${patrolDone?'✓':(LANG==='en'?'–':'未')}</b><span>${t('td_patrol')}</span>
    </div>
    <div class="hero-cell${mDone>=mTotal&&mTotal>0?' done':mDone>0?' active':''}" onclick="openMissionSheet()">
      <div class="hc-ic">${icon('clipboard',15)}</div><b>${mDone}/${mTotal}</b><span>${t('td_missions')}</span>
    </div>`;
}

function showCheckinOverlay(basePts, streakDay, milestone){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const phone = document.querySelector('.phone');
  const el = document.createElement('div');
  el.className = 'ci-overlay';
  const streakLbl = LANG==='en' ? `${streakDay}${t('ci_streak_day')}` : `${streakDay}${t('ci_streak_day')}`;
  const milestoneHtml = milestone ? `<div class="ci-milestone">${milestone}</div>` : '';
  el.innerHTML = `<div class="ci-flame">${icon('flame',54)}</div>
    <div class="ci-streak">${streakDay}</div>
    <div class="ci-streak-lbl">${streakLbl}</div>
    <div class="ci-pts">+${basePts}pt ${t('ci_bonus')}</div>${milestoneHtml}`;
  phone.appendChild(el);
  if(milestone) launchConfetti();
  setTimeout(()=>el.remove(), 3200);
}

function doCheckin(){
  const day = STATE.streak || 1;
  const milestoneMap = {7:t('ci_milestone_7'), 14:t('ci_milestone_14'), 30:t('ci_milestone_30')};
  const milestone = milestoneMap[day] || null;
  const bonusPts = day===30?100 : day===14?50 : day===7?30 : 0;
  const basePts = 10 + bonusPts;
  gainPoints(basePts);
  showCheckinOverlay(basePts, day, milestone);
  if(milestone) setTimeout(()=>showToast(milestone), 3400);
}

function missionActionLabel(metric){
  if(metric==='posts'||metric==='danger'||metric==='safe') return icon('camera',13)+(LANG==='en'?' Shoot':' 撮影');
  if(metric==='patrol') return icon('route',13)+(LANG==='en'?' Patrol':' 出発');
  if(metric==='quiz')   return icon('bulb',13)+(LANG==='en'?' Quiz':' クイズ');
  if(metric==='map')    return icon('map',13)+(LANG==='en'?' Map':' マップ');
  if(metric==='check')  return icon('check',13)+(LANG==='en'?' Check':' チェック');
  if(metric==='resolve') return icon('checkCircle',13)+(LANG==='en'?' Resolve':' 確認');
  return '→';
}
function missionAction(metric){
  const sheet = document.getElementById('mission-sheet');
  if(sheet) sheet.classList.remove('open');
  if(metric==='posts'||metric==='danger'||metric==='safe'||metric==='share') switchView('cam');
  else if(metric==='patrol') { switchView('map'); }
  else if(metric==='quiz') { switchView('book'); setTimeout(()=>{ const qb=document.getElementById('quiz-btn'); if(qb) qb.click(); },300); }
  else if(metric==='map') switchView('map');
  else if(metric==='check') { switchView('home'); }
  else if(metric==='resolve') switchView('home');
}
function missionCard(store, pool, id, weekly){
  const m = pool.find(x=>x.id===id);
  if(!m) return '';
  const done = store.done[id];
  const prog = Math.min(store.progress[id]||0, m.goal);
  const progTxt = m.goal>1 ? ` <span style="color:var(--gray);font-weight:600">(${prog}/${m.goal})</span>` : '';
  const barHtml = (m.goal>1 && !done) ? `<div class="m-bar"><i style="width:${Math.round(prog/m.goal*100)}%"></i></div>` : '';
  const actionBtn = !done ? `<button class="m-action" onclick="event.stopPropagation();missionAction('${m.metric}')">${missionActionLabel(m.metric)}</button>` : '';
  return `<div class="card mission${weekly?' weekly':''}${done?' done':''}">
    <div class="mi">${done?icon('check',19):icon(m.icon,19)}</div>
    <div class="mt"><b>${tx(m,'title')}${progTxt}</b><span>${tx(m,'desc')}</span>${barHtml}</div>
    ${done?`<span class="done-badge">${LANG==='en'?'Done':'完了'}</span>`:actionBtn+'<div class="mr">+'+m.reward+t('pt')+'</div>'}
  </div>`;
}
function renderMissions(){
  const dEl = document.getElementById('missions');
  if(dEl) dEl.innerHTML = DAILY.picks.map(id=>missionCard(DAILY, DAILY_POOL, id, false)).join('');
  const wEl = document.getElementById('weekly-missions');
  if(wEl) wEl.innerHTML = WEEKLY.picks.map(id=>missionCard(WEEKLY, WEEKLY_POOL, id, true)).join('');
}
// ストア単位で進捗を加算（達成時に報酬付与＋トースト）
function bumpStore(store, pool, metric, toastKey){
  store.picks.forEach(id=>{
    const m = pool.find(x=>x.id===id);
    if(!m || m.metric!==metric || store.done[id]) return;
    store.progress[id] = (store.progress[id]||0) + 1;
    if(store.progress[id] >= m.goal){
      store.done[id] = true;
      gainPoints(m.reward);
      setTimeout(()=>showToast(`${t(toastKey)}${tx(m,'title')} +${m.reward}${t('pt')}`), 2300);
    }
  });
}
function bumpDaily(metric){
  bumpStore(DAILY, DAILY_POOL, metric, 'toast_daily');
  bumpStore(WEEKLY, WEEKLY_POOL, metric, 'toast_weekly');
  renderMissions();
  updateMissionBadge();
}

// ── 地域アラート・警戒度 ──
function alertCatLabel(cat){ return t('alert_cat_'+cat); }
function forecastLevel(){
  // 対処済みは脅威から除外 —「対処すると街の警戒度が下がる」因果を成立させる
  const danger = MARKINGS.filter(m=>m.type==='danger' && !m.resolved).length;
  const warn   = MARKINGS.filter(m=>m.type==='warn' && !m.resolved).length;
  const score  = Math.min(100, danger*10 + warn*4 + (dayHash()%18));
  const lvl = score>=60 ? {k:'alert', ic:'alert', c:'#E63946'}
            : score>=32 ? {k:'caution', ic:'cloudSun', c:'#F4A261'}
            : {k:'safe', ic:'sun', c:'#6ee7a8'};
  return { score, ...lvl };
}
// ヒーロー内の警戒度バッジ（タップでマップへ。詳細はマップに集約）
function renderSafetyLine(){
  const el = document.getElementById('fc-badge');
  if(!el) return;
  const lvl = forecastLevel();
  const newAlerts = ALERTS.filter(a=>a.isNew).length;
  const alertTx = newAlerts>0 ? ` · ${icon('megaphone',13)} ${newAlerts}` : '';
  el.innerHTML = `${icon(lvl.ic,15)} ${t('fc_'+lvl.k)}${alertTx} ›`;
}
function openAlertSheet(){
  const sheet = document.getElementById('alert-sheet');
  if(!sheet) return;
  const listHtml = ALERTS.map(a=>{
    const titleTx = LANG==='en' ? (a.title_en||a.title) : a.title;
    const orgTx   = LANG==='en' ? (a.org_en||a.org)     : a.org;
    const bodyTx  = LANG==='en' ? (a.body_en||a.body)   : a.body;
    return `<div class="al-item">
      <div class="al-item-top">
        <div class="al-item-src alert-src-ic ${a.cat}">${icon(a.src,18)}</div>
        <div class="al-item-info">
          <b>${titleTx}</b>
          <div class="al-item-meta">
            <span class="alert-chip ${a.cat}">${alertCatLabel(a.cat)}</span>
            <span style="font-size:11px;color:var(--gray)">${orgTx} · ${a.date.slice(5).replace('-','/')}</span>
            ${a.isNew?'<div class="alert-new-dot"></div>':''}
          </div>
        </div>
      </div>
      <div class="al-item-body">${bodyTx}</div>
    </div>`;
  }).join('');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="al-hd"><b>${t('alerts_title')}</b><button class="al-close" id="al-close">×</button></div>
    <div class="al-body">${listHtml}</div>`;
  document.getElementById('al-close').onclick = ()=>sheet.classList.remove('open');
  sheet.classList.add('open');
  // 開いたら既読化（NEWドットは今回の表示までは残す）
  ALERTS.forEach(a=>a.isNew=false);
  renderSafetyLine();
  updateInfoBadge();
}

// ── 最新情報ビュー ──
// ── 捜査本部ブリーフィング ──
function openHQBriefing(){ renderHQBriefing(); document.getElementById('hq-view').classList.add('open'); }
function closeHQBriefing(){ document.getElementById('hq-view').classList.remove('open'); }

function renderHQBriefing(){
  const el = document.getElementById('hq-view');
  if(!el) return;

  const danger = MARKINGS.filter(m=>m.type==='danger').length;
  const warn   = MARKINGS.filter(m=>m.type==='warn').length;
  // ホーム/マップと同じ警戒度スケールに統一
  const fc  = forecastLevel();
  const tc  = fc.c;
  const tPct = fc.score;

  const zones = [
    { name:LANG==='en'?'South Shibuya':'渋谷南部',   cnt:Math.max(4, Math.floor(danger*.35)), type:'danger' },
    { name:LANG==='en'?'Udagawacho':'宇田川町',       cnt:Math.max(3, Math.floor(warn*.3)),   type:'warn'   },
    { name:LANG==='en'?'Dogenzaka':'道玄坂',           cnt:Math.max(2, Math.floor(danger*.2)), type:'warn'   },
  ];

  const postsToday    = (COMMUNITY_ACTIVITY.filter(a=>a.type==='post').length)   + (STATE.history[todayStr()]||0);
  const patrolsToday  = (COMMUNITY_ACTIVITY.filter(a=>a.type==='patrol').length) + (STATE.patrols||0);
  const resolvedToday = (COMMUNITY_ACTIVITY.filter(a=>a.type==='resolve').length)+ (STATE.resolved||0);

  const mDone  = Object.keys(DAILY.done||{}).filter(k=>DAILY.done[k]).length;
  const mTotal = DAILY.picks ? DAILY.picks.length : 3;

  const actions = [
    { ic:'route', title:LANG==='en'?'Patrol South Shibuya':'渋谷南部をパトロール',
      desc:LANG==='en'?'3 markings confirmed — early patrol recommended':'マーキング3件確認済み・早期パトロール推奨',
      fn:`switchView('map')` },
    { ic:'camera', title:LANG==='en'?'Post a marking':'マーキングを投稿',
      desc:LANG==='en'?"Today's find stays on the map":'今日の一件が地図に残ります',
      fn:`switchView('cam')` },
    { ic:'clipboard', title:LANG==='en'?'Daily missions':'デイリーミッション',
      desc:LANG==='en'?`${mDone}/${mTotal} done`:`${mDone}/${mTotal}件完了`,
      fn:`openMissionSheet()` },
  ];

  const personalScore = Math.min(100, Math.round(
    ((STATE.myPosts||0)*4 + (STATE.patrols||0)*8 + (STATE.resolved||0)*6 + (STATE.streak||0)*3) / 3
  ));

  const dateStr = (() => {
    const d = new Date();
    return LANG==='en'
      ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  })();

  const zoneMax = Math.max(1, ...zones.map(z=>z.cnt));
  const zoneHtml = zones.map(z=>{
    const zc = z.type==='danger' ? '#E63946' : 'var(--gold)';
    return `
    <div class="hq-zone">
      <div class="hq-zone-dot" style="background:${zc}"></div>
      <div class="hq-zone-info">
        <b>${z.name}</b>
        <span>${z.type==='danger'?(LANG==='en'?'Marking likely':'マーキング濃厚'):(LANG==='en'?'Needs check':'要確認')}</span>
        <div class="hq-zone-bar"><i style="width:${Math.round(z.cnt/zoneMax*100)}%;background:${zc}"></i></div>
      </div>
      <div class="hq-zone-cnt">${z.cnt}</div>
    </div>`;
  }).join('');

  const actHtml = actions.map(a=>`
    <div class="hq-action" onclick="${a.fn};closeHQBriefing()">
      <div class="hq-action-ic">${icon(a.ic,20)}</div>
      <div class="hq-action-body"><b>${a.title}</b><span>${a.desc}</span></div>
      <div class="hq-action-arr">›</div>
    </div>`).join('');

  el.innerHTML = `
    <div class="hq-hdr">
      <button class="hq-back" onclick="closeHQBriefing()">✕</button>
      <div class="hq-title">
        <b>${icon('folder',15)} ${LANG==='en'?'HQ Briefing':'捜査本部'}</b>
        <span>${dateStr}</span>
      </div>
      <span class="hq-badge">${LANG==='en'?'TOP SECRET':'機密情報'}</span>
    </div>
    <div class="hq-body">

      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'THREAT LEVEL':'脅威レベル'}</div>
        <div class="hq-threat">
          <div class="hq-threat-bar">
            <div class="hq-threat-lv" style="color:${tc}">${t('fc_'+fc.k)} <span style="font-size:12px;font-weight:600;color:var(--gray)">${fc.score}/100</span></div>
            <div class="hq-threat-sub">${LANG==='en'?'Shibuya area · now':'渋谷エリア · 現在'}</div>
            <div class="hq-threat-track"><div class="hq-threat-fill" style="width:${tPct}%;background:${tc}"></div></div>
          </div>
          <div class="hq-threat-ic" style="color:${tc}">${icon(fc.ic,38)}</div>
        </div>
      </div>

      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'PRIORITY ZONES':'重点監視エリア'}</div>
        ${zoneHtml}
      </div>

      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'COMMUNITY TODAY':'コミュニティ活動'}</div>
        <div class="hq-comm-grid">
          <div class="hq-comm-cell"><b>${postsToday}</b><span>${LANG==='en'?'Posts':'投稿数'}</span></div>
          <div class="hq-comm-cell"><b>${patrolsToday}</b><span>${LANG==='en'?'Patrols':'パトロール'}</span></div>
          <div class="hq-comm-cell"><b>${resolvedToday}</b><span>${LANG==='en'?'Resolved':'対処済み'}</span></div>
        </div>
      </div>

      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'RECOMMENDED':'推奨アクション'}</div>
        ${actHtml}
      </div>

      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'YOUR SCORE':'捜査スコア'}</div>
        <div class="hq-score">
          <div class="hq-score-row"><span class="hq-score-lbl">${LANG==='en'?'Streak':'連続記録'}</span><span class="hq-score-val">${STATE.streak||0}${LANG==='en'?' days':'日'}</span></div>
          <div class="hq-score-row"><span class="hq-score-lbl">${LANG==='en'?'Posts today':'今日の投稿'}</span><span class="hq-score-val">${STATE.history[todayStr()]||0}</span></div>
          <div class="hq-score-row"><span class="hq-score-lbl">${LANG==='en'?'Total patrols':'総パトロール'}</span><span class="hq-score-val">${STATE.patrols||0}</span></div>
          <div class="hq-score-row"><span class="hq-score-lbl">${LANG==='en'?'Investigation score':'捜査スコア'}</span><span class="hq-score-val">${personalScore}<span style="font-size:10px;color:var(--gray)">/100</span></span></div>
        </div>
        <button class="panel-btn" style="margin-top:12px" onclick="closeHQBriefing();openWeeklyReport()">${icon('clipboard',15)} ${LANG==='en'?'Weekly Investigation Report':'週刊 捜査報告書を見る'}</button>
        <button class="panel-btn" style="margin-top:2px" onclick="closeHQBriefing();openGovDash()">${icon('building',15)} ${LANG==='en'?'City Dashboard (mock)':'行政ダッシュボード（モック）'}</button>
      </div>

    </div>`;
}

// 直近7日の投稿バーチャート（単一系列・ゴールド／値ラベルは今日と最大値のみ）
function weekBarsHtml(){
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push({ lbl:`${d.getMonth()+1}/${d.getDate()}`, v: STATE.history[dateKey(d)]||0 });
  }
  const mx = Math.max(1, ...days.map(x=>x.v));
  return `<div class="bar7" role="img" aria-label="${LANG==='en'?'Posts in the last 7 days':'直近7日間の投稿数'}">
    ${days.map((x,i)=>`
      <div class="bar7-col" title="${x.lbl}: ${x.v}">
        <span class="bar7-val">${(i===6||x.v===mx)&&x.v>0?x.v:''}</span>
        <div class="bar7-track"><i style="${x.v>0?`height:${Math.max(8,Math.round(x.v/mx*100))}%`:'height:3px;opacity:.28'}"></i></div>
        <span class="bar7-lbl${i===6?' today':''}">${i===6?(LANG==='en'?'Today':'今日'):x.lbl}</span>
      </div>`).join('')}
  </div>`;
}

// ── 行政ダッシュボード（自治体向けモック）──
function openGovDash(){ renderGovDash(); document.getElementById('gov-view').classList.add('open'); }
function closeGovDash(){ document.getElementById('gov-view').classList.remove('open'); }
function renderGovDash(){
  const el = document.getElementById('gov-view');
  if(!el) return;
  // 30日間の投稿推移（STATE.history から）
  const days = [];
  for(let i=29;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push({ lbl:`${d.getMonth()+1}/${d.getDate()}`, v: STATE.history[dateKey(d)]||0 });
  }
  const mx = Math.max(1, ...days.map(x=>x.v));
  const monthTotal = days.reduce((s,x)=>s+x.v, 0) + 26;   // コミュニティ分のダミー加算
  const danger = MARKINGS.filter(m=>m.type==='danger').length;
  const warn   = MARKINGS.filter(m=>m.type==='warn').length;
  const safe   = MARKINGS.filter(m=>m.type==='safe').length;
  const threats = danger + warn;
  const resolvedCnt = MARKINGS.filter(m=>m.resolved).length;
  const resolveRate = threats ? Math.round(resolvedCnt/threats*100) : 0;
  const catTotal = Math.max(1, danger + warn + safe);
  // 投稿0の日も薄いスタブを描き、グラフが歯抜けに見えないようにする
  const bars30 = days.map(x=>`<div class="gd-bcol" title="${x.lbl}: ${x.v}${LANG==='en'?'':'件'}"><i style="${x.v>0?`height:${Math.max(6,Math.round(x.v/mx*100))}%`:'height:3px;opacity:.28'}"></i></div>`).join('');
  const axisLbls = [days[0].lbl, days[10].lbl, days[20].lbl, LANG==='en'?'Today':'今日'];
  const catRow = (lbl, cnt, color) => `
    <div class="gd-cat">
      <span class="gd-cat-lbl"><i style="background:${color}"></i>${lbl}</span>
      <div class="gd-cat-bar"><i style="width:${Math.round(cnt/catTotal*100)}%;background:${color}"></i></div>
      <b>${cnt}</b>
    </div>`;
  el.innerHTML = `
    <div class="hq-hdr">
      <button class="hq-back" onclick="closeGovDash()">←</button>
      <div class="hq-title"><b>${icon('building',15)} ${LANG==='en'?'Shibuya Safety Dashboard':'渋谷区 防犯ダッシュボード'}</b><span>${LANG==='en'?'For city officials · all dummy data':'行政向けモック ・ 全データはダミー'}</span></div>
      <span class="hq-badge" style="background:var(--blue)">MOCK</span>
    </div>
    <div class="hq-body">
      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'THIS MONTH':'今月のサマリー'}</div>
        <div class="gd-kpis">
          <div class="gd-kpi"><b>${fmt(monthTotal)}</b><span>${LANG==='en'?'Reports':'住民からの投稿'}</span></div>
          <div class="gd-kpi"><b>${resolveRate}<small>%</small></b><span>${LANG==='en'?'Resolve rate':'対処率'}</span></div>
          <div class="gd-kpi"><b>128</b><span>${LANG==='en'?'Active detectives':'参加探偵数'}</span></div>
          <div class="gd-kpi"><b>${resolvedCnt>0?'26<small>h</small>':'—'}</b><span>${LANG==='en'?'Avg. response':'平均対処時間'}</span></div>
        </div>
      </div>
      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'REPORTS — LAST 30 DAYS':'投稿推移（30日間）'}</div>
        <div class="gd-chart">
          <div class="gd-bars">${bars30}</div>
          <div class="gd-axis">${axisLbls.map(a=>`<span>${a}</span>`).join('')}</div>
        </div>
      </div>
      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'BREAKDOWN BY VERDICT':'判定種別の内訳'}</div>
        <div class="gd-cats">
          ${catRow(LANG==='en'?'Likely':'濃厚', danger, '#E63946')}
          ${catRow(LANG==='en'?'Needs check':'要確認', warn, '#F4A261')}
          ${catRow(LANG==='en'?'Coincidence':'偶然', safe, '#64748B')}
        </div>
      </div>
      <div class="hq-sec">
        <div class="hq-sec-title">${LANG==='en'?'RESOLUTION PROGRESS':'対処の進捗'}</div>
        <div class="gd-resolve">
          <div class="gd-resolve-bar"><i style="width:${resolveRate}%"></i></div>
          <span>${LANG==='en'?`${resolvedCnt} of ${threats} threats resolved`:`脅威 ${threats}件中 ${resolvedCnt}件 対処済み`}</span>
        </div>
      </div>
      <div style="padding:4px 0 24px;text-align:center;font-size:10px;color:var(--gray)">
        ${LANG==='en'?'Prototype mock — numbers are illustrative.':'※ 概念実証用のモック画面です。数値はすべてダミーです。'}
      </div>
    </div>`;
}

// ── 週刊 捜査報告書 ──
function openWeeklyReport(){
  const sheet = document.getElementById('report-sheet');
  if(!sheet) return;
  const fc = forecastLevel();
  const weekMe = RANKS.week.find(r=>r.me);
  const weekRank = RANKS.week.indexOf(weekMe) + 1;
  const foundCount = MARK_CATALOG.filter(m=>(STATE.found||{})[m.mark]).length;
  const riskReduced = STATE.riskReduced || 0;
  // 今週（月〜日）の日付レンジ
  const now = new Date();
  const dow = (now.getDay()+6)%7;
  const mon = new Date(now); mon.setDate(now.getDate()-dow);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const range = `${mon.getMonth()+1}/${mon.getDate()} – ${sun.getMonth()+1}/${sun.getDate()}`;
  const impactHtml = riskReduced > 0
    ? `<div class="rp-impact"><span class="ri-ic">${icon('shield',26)}</span><div>
         <b>${LANG==='en'?`You lowered the area risk by ${riskReduced}`:`あなたの対処で警戒度を ${riskReduced} 下げました`}</b>
         <span>${LANG==='en'?`Current area level: ${t('fc_'+fc.k)} ${fc.score}/100`:`現在のエリア警戒度: ${t('fc_'+fc.k)} ${fc.score}/100`}</span>
       </div></div>`
    : `<div class="rp-impact" style="background:rgba(212,168,32,.08);border-color:rgba(212,168,32,.3)"><span class="ri-ic">${icon('search',26)}</span><div>
         <b>${LANG==='en'?'Resolve markings to lower the risk':'マーキングを対処すると警戒度が下がります'}</b>
         <span>${LANG==='en'?`Current area level: ${t('fc_'+fc.k)} ${fc.score}/100`:`現在のエリア警戒度: ${t('fc_'+fc.k)} ${fc.score}/100`}</span>
       </div></div>`;
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="rp-hd"><b>${icon('clipboard',16)} ${LANG==='en'?'Weekly Investigation Report':'週刊 捜査報告書'}</b><button class="rp-close" onclick="document.getElementById('report-sheet').classList.remove('open')">×</button></div>
    <div class="rp-body">
      <div class="rp-doc">
         <div class="rp-meta"><span class="rp-av">${PROFILE.avatar}</span><span>${escapeHTML(txName(PROFILE.name))}${t('name_suffix')} ・ ${range}</span><span class="hq-badge" style="margin-left:auto">${LANG==='en'?'CONFIDENTIAL':'機密情報'}</span></div>
        <div class="rp-sec">${LANG==='en'?'THIS WEEK':'今週の活動'}</div>
        <div class="rp-grid">
          <div class="rp-cell"><b>${STATE.myPosts||0}</b><span>${LANG==='en'?'Posts':'投稿'}</span></div>
          <div class="rp-cell"><b>${STATE.patrols||0}</b><span>${LANG==='en'?'Patrols':'パトロール'}</span></div>
          <div class="rp-cell"><b>${STATE.resolved||0}</b><span>${LANG==='en'?'Resolved':'対処済み'}</span></div>
          <div class="rp-cell"><b style="color:var(--gold)">+${fmt(STATE.earned||0)}</b><span>${LANG==='en'?'Points earned':'獲得ポイント'}</span></div>
        </div>
        <div class="rp-sec">${LANG==='en'?'7-DAY POSTS':'7日間の投稿'}</div>
        ${weekBarsHtml()}
        <div class="rp-sec">${LANG==='en'?'IMPACT ON THE TOWN':'街への影響'}</div>
        ${impactHtml}
        <div class="rp-sec">${LANG==='en'?'STANDING':'成績'}</div>
        <div class="rp-grid">
          <div class="rp-cell"><b>${weekRank>0?weekRank+t('rank_suffix'):'–'}</b><span>${t('mp_week_rank')}</span></div>
          <div class="rp-cell"><b>${STATE.streak||0}${LANG==='en'?'d':'日'}</b><span>${t('mp_streak')}</span></div>
          <div class="rp-cell"><b>${foundCount}/${MARK_CATALOG.length}</b><span>${LANG==='en'?'Handbook':'図鑑'}</span></div>
          <div class="rp-cell"><b>${Object.keys(ACH_UNLOCKED).length||ACH_UNLOCKED.length}</b><span>${LANG==='en'?'Badges':'実績'}</span></div>
        </div>
        <div class="rp-foot">${LANG==='en'?'— Keep the town safe next week too, Detective.':'— 来週も街の安全を頼むぞ、探偵。'}</div>
      </div>
    </div>`;
  sheet.classList.add('open');
}

let infoCat = 'all';
let _infoUnreadShown = false;

function openInfoView(cat){
  cat = cat || 'all';
  infoCat = cat;
  renderInfoView(cat);
  document.getElementById('info-view').classList.add('open');
  // clear badge once opened
  if(!_infoUnreadShown){
    _infoUnreadShown = true;
    updateInfoBadge();
  }
}
function closeInfoView(){
  document.getElementById('info-view').classList.remove('open');
}
function renderInfoView(cat){
  cat = cat || infoCat || 'all';
  infoCat = cat;
  const view = document.getElementById('info-view');
  if(!view) return;

  const newCount = _infoUnreadShown ? 0 : ALERTS.filter(a => a.isNew).length;
  const dangerCount = MARKINGS.filter(m => m.type === 'danger').length;

  const breakingAlert = ALERTS.find(a => a.isNew) || ALERTS[0];
  const breakingTitle = LANG==='en' ? (breakingAlert.title_en||breakingAlert.title) : breakingAlert.title;
  const breakingBody  = LANG==='en' ? (breakingAlert.body_en||breakingAlert.body)   : breakingAlert.body;
  const breakingOrg   = LANG==='en' ? (breakingAlert.org_en||breakingAlert.org)     : breakingAlert.org;

  const cats = [
    { id:'all',      label:t('info_cat_all') },
    { id:'police',   label:t('info_cat_police') },
    { id:'city',     label:t('info_cat_city') },
    { id:'watch',    label:t('info_cat_watch') },
    { id:'activity', label:t('info_cat_activity') },
  ];
  const catHtml = cats.map(c =>
    `<button class="iv-cat${cat===c.id?' active':''}" onclick="renderInfoView('${c.id}')">${c.label}</button>`
  ).join('');

  const filteredAlerts = (cat === 'all')      ? ALERTS
                       : (cat === 'activity') ? []
                       : ALERTS.filter(a => a.cat === cat);

  const alertCardsHtml = filteredAlerts.map(a => {
    const titleTx = LANG==='en' ? (a.title_en||a.title) : a.title;
    const orgTx   = LANG==='en' ? (a.org_en||a.org)     : a.org;
    const bodyTx  = LANG==='en' ? (a.body_en||a.body)   : a.body;
    const newPill = a.isNew
      ? ` <span style="background:var(--red);color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;font-weight:800;vertical-align:middle;margin-left:3px">NEW</span>`
      : '';
    return `<div class="iv-alert">
      <div class="iv-alert-top">
        <div class="iv-alert-src ${a.cat}">${icon(a.src,18)}</div>
        <div class="iv-alert-info">
          <b>${titleTx}${newPill}</b>
          <div class="iv-alert-meta">
            <span class="alert-chip ${a.cat}">${alertCatLabel(a.cat)}</span>
            <span style="font-size:11px;color:var(--gray)">${orgTx} · ${a.date.slice(5).replace('-','/')}</span>
          </div>
        </div>
      </div>
      <div class="iv-alert-body">${bodyTx}</div>
    </div>`;
  }).join('');

  const showBreaking  = (cat === 'all');
  const showAlerts    = filteredAlerts.length > 0;
  const showActivity  = (cat === 'all' || cat === 'activity');

  const breakingHtml = showBreaking ? `
    <div class="iv-breaking">
      <div class="iv-breaking-label">${t('info_breaking')} · ${breakingOrg}</div>
      <div class="iv-breaking-title">${breakingTitle}</div>
      <div class="iv-breaking-body">${breakingBody}</div>
    </div>` : '';

  const alertsSectionHtml = showAlerts
    ? `<div class="sec-title">${t('sec_alerts')}</div>${alertCardsHtml}`
    : (cat !== 'activity' ? `<div style="padding:20px 0;text-align:center;color:var(--gray);font-size:12px">${t('info_no_alerts')}</div>` : '');

  const activityHtml = showActivity ? `
    <div class="sec-title" style="margin-top:${filteredAlerts.length?'6px':'0'}">${t('info_community')}</div>
    <div class="card" style="padding:8px 12px">
      ${COMMUNITY_ACTIVITY.map(a => {
        const userTx = LANG==='en' ? (a.user_en||a.user) : a.user;
        const descTx = LANG==='en' ? (a.desc_en||a.desc) : a.desc;
        return `<div class="iv-act-item">
          <div class="iv-act-ic ${a.type}">${icon(a.icon,18)}</div>
          <div class="iv-act-tx"><b>${userTx}</b><span>${descTx} · ${txAgo(a.ago)}</span></div>
          <div class="iv-act-pts">+${a.pts}pt</div>
        </div>`;
      }).join('')}
    </div>` : '';

  view.innerHTML = `
    <div class="iv-hdr">
      <button class="iv-back" onclick="closeInfoView()">←</button>
      <div class="iv-hdr-tx"><h2>${t('info_title')}</h2><div class="sub">${t('info_sub')}</div></div>
    </div>
    <div class="iv-body">
      <div class="iv-strip">
        <div class="iv-strip-cell"><b style="color:var(--red)">${newCount}</b><span>${t('info_unread')}</span></div>
        <div class="iv-strip-cell"><b style="color:var(--gold)">${dangerCount}</b><span>${t('info_today_danger')}</span></div>
        <div class="iv-strip-cell"><b style="color:var(--blue)">${COMMUNITY_ACTIVITY.length}</b><span>${t('info_activities')}</span></div>
      </div>
      <div class="iv-cats">${catHtml}</div>
      ${breakingHtml}
      ${alertsSectionHtml}
      ${activityHtml}
    </div>`;
}
function updateInfoBadge(){
  const badge = document.getElementById('info-badge');
  if(!badge) return;
  const count = _infoUnreadShown ? 0 : ALERTS.filter(a => a.isNew).length;
  badge.textContent = count;
  badge.classList.toggle('show', count > 0);
}

