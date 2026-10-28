// ── ミッションシート ──
function openMissionSheet(){
  const sheet = document.getElementById('mission-sheet');
  if(!sheet) return;
  const dailySec = LANG==='en' ? "Today's Missions" : '今日のミッション';
  const weeklySec = LANG==='en' ? 'Weekly Challenges' : '今週のチャレンジ';
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="ms-hd">
      <b style="font-size:15px;font-weight:800">${LANG==='en'?'Missions':'ミッション'}</b>
      <button class="ms-close" onclick="document.getElementById('mission-sheet').classList.remove('open')">×</button>
    </div>
    <div class="ms-body">
      ${rewardGaugeHtml()}
      <div class="ms-sec">${dailySec}</div>
      <div id="missions">${DAILY.picks.map(id=>missionCard(DAILY, DAILY_POOL, id, false)).join('')}</div>
      <div class="ms-sec">${weeklySec}</div>
      <div id="weekly-missions">${WEEKLY.picks.map(id=>missionCard(WEEKLY, WEEKLY_POOL, id, true)).join('')}</div>
    </div>`;
  sheet.classList.add('open');
}
// 段階報酬ゲージのHTML
function rewardGaugeHtml(){
  const earned = DAILY.earned||0, claimed = DAILY.claimed||[];
  const maxAt = REWARD_TIERS[REWARD_TIERS.length-1].at;
  const pct = Math.min(100, Math.round(earned / maxAt * 100));
  const nodes = REWARD_TIERS.map((tr,i)=>{
    const reached = earned >= tr.at, isClaimed = claimed.includes(i);
    const cls = isClaimed ? 'claimed' : (reached ? 'reached' : '');
    const dot = isClaimed ? '✓' : '';
    const left = Math.min(100, tr.at / maxAt * 100);
    return `<div class="rg-node ${cls}" style="left:${left}%">
      <div class="rg-dot">${dot}</div>
      <div class="rg-at">${tr.at}</div>
    </div>`;
  }).join('');
  // 受け取り可能な最小ティア（手前から順に受け取り）
  let claimBtn = '';
  const nextClaim = REWARD_TIERS.findIndex((tr,i)=> earned >= tr.at && !claimed.includes(i));
  if(nextClaim >= 0){
    claimBtn = `<button class="rg-claim" onclick="claimRewardTier(${nextClaim})">${icon('gift',14)} ${t('reward_claim')} +${REWARD_TIERS[nextClaim].bonus}${t('pt')}</button>`;
  } else if(claimed.length === REWARD_TIERS.length){
    claimBtn = `<div class="rg-allclaimed">✓ ${t('reward_allclaimed')}</div>`;
  }
  return `<div class="rg-card">
    <div class="rg-top"><b>${icon('gift',15)} ${t('reward_gauge_title')}</b><span class="rg-earned">${fmt(earned)} ${t('pt')}</span></div>
    <div class="rg-track">
      <div class="rg-fill" style="width:${pct}%"></div>
      ${nodes}
    </div>
    ${claimBtn}
  </div>`;
}
function updateMissionBadge(){
  const el = document.getElementById('mission-count');
  if(!el) return;
  const undone = DAILY.picks.filter(id=>!DAILY.done[id]).length
               + WEEKLY.picks.filter(id=>!WEEKLY.done[id]).length;
  const count = undone + claimableTiers();
  el.textContent = count;
  el.classList.toggle('show', count > 0);
}
function showStatTip(el, key){
  const tip = el.querySelector('.stat-tip');
  if(!tip) return;
  tip.textContent = t(key);
  tip.classList.add('show');
  clearTimeout(el._tipTimer);
  el._tipTimer = setTimeout(()=>tip.classList.remove('show'), 1600);
}

// 通学路カード（未登録なら誘導、登録済みならその道沿いの未対処だけを出す）
function renderRouteCard(){
  const el = document.getElementById('route-card');
  if(!el) return;
  if(!hasRoute()){
    el.className = 'route-card empty';
    el.innerHTML = `
      <div class="rc-top"><span class="rc-ic">${icon('route',16)}</span><b>${t('route_set')}</b><span class="rc-arr">›</span></div>
      <div class="rc-body">${t('route_empty')}</div>`;
    el.onclick = startRoutePick;
    return;
  }
  const st = routeStats();
  const km = (routeLengthM()/1000).toFixed(1);
  const body = st.total === 0
    ? `<div class="rc-ok">${icon('checkCircle',14)} ${t('route_clean')}</div>`
    : `<div class="rc-counts">
         ${st.danger ? `<span class="rc-count"><span class="dot" style="background:#E63946"></span><b style="color:#E63946">${st.danger}</b>${t('route_danger')}</span>` : ''}
         ${st.warn   ? `<span class="rc-count"><span class="dot" style="background:#F4A261"></span><b style="color:#F4A261">${st.warn}</b>${t('route_warn')}</span>` : ''}
       </div>`;
  el.className = 'route-card';
  el.innerHTML = `
    <div class="rc-top"><span class="rc-ic">${icon('route',16)}</span><b>${t('route_title')}</b>
      <span style="font-size:11px;color:var(--gray)">${km}km</span><span class="rc-arr">›</span></div>
    ${body}`;
  el.onclick = () => { routeFocus = true; switchView('map'); refreshMapPins(); renderMapOverlay(); };
}

// ── 実績バッジ ──
function checkAchievements(){
  ACHIEVEMENTS.forEach(a=>{
    if(!ACH_UNLOCKED.includes(a.id) && a.cond()){
      ACH_UNLOCKED.push(a.id);
      setTimeout(()=>showToast(`${t('toast_ach')}${tx(a,'title')}`), 1500);
    }
  });
}

function showLevelUp(lvObj){
  const el = document.createElement('div');
  el.className = 'levelup';
  const body = LANG==='en'
    ? `Lv.${lvObj.lv}<br>Promoted to <b>${tx(lvObj,'title')}</b>`
    : `Lv.${lvObj.lv}<br><b>${tx(lvObj,'title')}</b> に昇進しました`;
  el.innerHTML = `<div class="lv-big">${icon('star',60)}</div><h3>${t('lvup_title')}</h3><div class="lv-sub">${body}</div>`;
  document.querySelector('.phone').appendChild(el);
  launchConfetti();
  setTimeout(()=>el.remove(), 3300);
}

// レベルアップ時の紙吹雪
function launchConfetti(){
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const phone = document.querySelector('.phone');
  const colors = ['#E63946','#F4A261','#457B9D','#2D6A4F','#FFD700','#fff'];
  for (let i=0; i<26; i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.6 + Math.random()*1.2) + 's';
    c.style.animationDelay = (Math.random()*0.5) + 's';
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    if (Math.random() < .4) c.style.borderRadius = '50%';
    phone.appendChild(c);
    setTimeout(()=>c.remove(), 3200);
  }
}

function updateRankData(gained){
  Object.values(RANKS).forEach(seg=>{
    const me = seg.find(r=>r.me);
    if(!me) return;
    me.pt += gained;
    me.area = me.area.replace(/(\d+)件/,(_,n)=>`${+n+1}件`);
  });
  const activeSeg = document.querySelector('.seg button.active');
  if(activeSeg) renderRank(activeSeg.dataset.seg);
}

function renderHome(){
  const info = getLevelInfo(STATE.points);
  const trEl = document.getElementById('hero-today');
  if(trEl) trEl.innerHTML = todayRowHtml();
  document.getElementById('home-role').textContent = `${tx(info.cur,'title')} / Lv.${info.cur.lv}`;
  document.getElementById('home-name').textContent = `${txName(PROFILE.name)}${t('name_suffix')}`;
  document.getElementById('profile-btn').textContent = PROFILE.avatar;
  document.getElementById('home-pt').textContent = fmt(STATE.points);
  document.getElementById('stat-posts').textContent = STATE.posts;
  document.getElementById('stat-streak').textContent = STATE.streak;
  document.getElementById('lvbar').style.width = info.pct + '%';
  document.getElementById('home-lvtx').textContent = info.next
    ? (LANG==='en'
        ? `${t('next_rank')} "${tx(info.next,'title')}" ${t('to_next')} ${fmt(info.rem)} ${t('pt')}`
        : `${t('next_rank')}「${tx(info.next,'title')}」${t('to_next')} ${fmt(info.rem)} ${t('pt')}`)
    : t('max_rank');
  const items = FEED.map((f,i)=>({f,i})).filter(o => feedFilter==='all' || o.f.chip[0]===feedFilter);
  // 隠れるのが1件だけなら折りたたまない
  const collapsible = items.length > 4;
  const shown = (feedExpanded || !collapsible) ? items : items.slice(0,3);
  const moreBtn = collapsible
    ? `<button class="feed-more" onclick="toggleFeedExpand()">${feedExpanded
        ? (LANG==='en' ? '− Show less' : '− 閉じる')
        : (LANG==='en' ? `View all (${items.length}) →` : `すべて見る（${items.length}件）→`)}</button>`
    : '';
  document.getElementById('feed').innerHTML = shown.length
    ? shown.map(({f,i}) => `
      <div class="feed-item${f.resolved?' resolved':''}" onclick="openDetail(${i})">
        <div class="thumb" style="background:${f.bg}">${f.mark}</div>
         <div class="ft"><b>${escapeHTML(txName(f.who))}</b> <span>${tx(f,'act')} · ${txAgo(f.ago)}</span></div>
        <span class="chip ${f.resolved?'resolved':f.chip[0]}">${f.resolved?t('chip_resolved'):txChip(f.chip[0])}</span>
        <div class="row-arr">›</div>
      </div>`).join('') + moreBtn
    : `<div class="feed-empty">${t('feed_empty')}</div>`;
  renderMissions();
  updateMissionBadge();
  updateInfoBadge();
  renderSafetyLine();
  // 時間帯グリーティング＋称号フレーム
  applyTimeOfDay();
  applyFrame();
  const tod = getTimeOfDay();
  const greetEl = document.querySelector('[data-i18n="home_greet"]');
  if(greetEl) greetEl.textContent = t('greet_'+tod);
  const subEl = document.querySelector('[data-i18n="home_sub"]');
  if(subEl) subEl.textContent = t('sub_'+tod);
  renderRouteCard();
  // レベルアップナッジ
  const nudgeEl = document.getElementById('lv-nudge');
  if(nudgeEl){
    if(info.next){
      const avgPts = STATE.myPosts>0 ? Math.max(10, STATE.earned/STATE.myPosts) : 40;
      const postsToGo = Math.ceil(info.rem / avgPts);
      const q = LANG==='en'?['"','"']:['「','」'];
      nudgeEl.style.display = 'flex';
      nudgeEl.innerHTML = `<span class="nudge-ic">${icon('trendUp',16)}</span><span>${LANG==='en'
        ? `${postsToGo} more post${postsToGo!==1?'s':''} to ${q[0]}${tx(info.next,'title')}${q[1]}!`
        : `あと${postsToGo}投稿で${q[0]}${tx(info.next,'title')}${q[1]}に昇格`}</span>`;
    } else {
      nudgeEl.style.display = 'none';
    }
  }
}

// ── 危険度予報ウィジェット ──
function hashStr(s){ let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))>>>0; return h; }
function dayHash(){ return hashStr(todayStr()); }
function dateKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
// 過去の活動履歴をダミー生成（初回のみ）
function seedHistory(){
  if(STATE.history && Object.keys(STATE.history).length) return;
  STATE.history = STATE.history || {};
  const today = new Date();
  for(let i=1;i<=34;i++){
    const d = new Date(today); d.setDate(today.getDate()-i);
    const k = dateKey(d), h = hashStr(k);
    const v = (h%10) < 6 ? (h%5) : 0;
    if(v>0) STATE.history[k] = v;
  }
  saveState();
}
function recordPostToday(){
  const k = todayStr();
  STATE.history[k] = (STATE.history[k]||0) + 1;
}
// 自分の過去投稿から手帳コレクションを復元（冪等）
function seedFound(){
  STATE.found = STATE.found || {};
  FEED.forEach(f => { if(f.who === PROFILE.name && f.mark) STATE.found[f.mark] = true; });
}
// フィード投稿のリアクション初期値を付与
function seedReactions(){
  const seeds = [[14,2,8],[9,1,5],[6,3,2],[3,0,1]];
  FEED.forEach((f,i)=>{
    if(!f.reactions){
      const s = seeds[i] || [hashStr((f.label||'x'))%12, hashStr((f.act||'y'))%4, hashStr((f.who||'z'))%6];
      f.reactions = { up:s[0], warn:s[1], check:s[2] };
    }
    if(f.myReaction===undefined) f.myReaction = null;
  });
}
let feedFilter = 'all';
let feedExpanded = false;
function toggleFeedExpand(){ feedExpanded = !feedExpanded; renderHome(); }

// ── ランク特典シート ──
function openLevelSheet(){
  const info = getLevelInfo(STATE.points);
  const cur = info.cur, next = info.next;
  const sheet = document.getElementById('level-sheet');

  const q = LANG==='en' ? ['"','"'] : ['「','」'];
  const nextBlock = next ? `
    <div class="ls-next">
      <div class="lsn-top">
        <div class="lsn-ic">${icon(next.icon,22)}</div>
        <div class="lsn-tt"><b>${t('next_is')} Lv.${next.lv}${q[0]}${tx(next,'title')}${q[1]}</b><span>${t('st_left')} ${fmt(info.rem)} ${t('pt')} ${t('promote_in')}</span></div>
      </div>
      <div class="lsn-perk">${icon('gift',13)} ${tx(next,'perk')}</div>
      <div class="lsn-bar"><i style="width:${info.pct}%"></i></div>
    </div>`
    : `<div class="ls-next"><div class="lsn-top"><div class="lsn-ic">${icon('trophy',22)}</div>
        <div class="lsn-tt"><b>${t('reach_max')}</b><span>${t('all_unlocked')}</span></div></div></div>`;

  const rows = LEVELS.map(l=>{
    const status = l.lv < cur.lv ? 'done' : l.lv === cur.lv ? 'cur' : 'locked';
    const stLabel = status==='done' ? t('st_done') : status==='cur' ? t('st_cur') : `${t('st_left')} ${fmt(Math.max(0, l.min - STATE.points))} ${t('pt')}`;
    const stCls = status==='done' ? 's-done' : status==='cur' ? 's-cur' : 's-lock';
    return `<div class="ls-row ${status}">
      <div class="lr-ic">${icon(l.icon,20)}</div>
      <div class="lr-tx"><b>Lv.${l.lv} ${tx(l,'title')}</b><span class="lr-perk">${tx(l,'perk')}</span></div>
      <div class="lr-st ${stCls}">${stLabel}</div>
    </div>`;
  }).join('');

  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="ls-hd"><b>${t('perks_title')}</b><button class="ls-close" id="ls-close">×</button></div>
    <div class="ls-now">${t('now_lv')} Lv.${cur.lv}${q[0]}${tx(cur,'title')}${q[1]} · ${fmt(STATE.points)} ${t('pt')}</div>
    ${nextBlock}
    <div class="ls-list">${rows}</div>`;
  document.getElementById('ls-close').onclick = ()=>sheet.classList.remove('open');
  sheet.classList.add('open');
}

// ── マイページ（プロフィール / 週間まとめ / 実績）──
function openMyPage(){
  const sheet = document.getElementById('mypage-sheet');
  const weekMe = RANKS.week.find(r=>r.me);
  const weekRank = RANKS.week.indexOf(weekMe) + 1;

  const avHtml = AVATARS.map(a=>
    `<div class="mp-av ${a===PROFILE.avatar?'sel':''}" data-av="${a}">${a}</div>`).join('');

  const achHtml = ACHIEVEMENTS.map(a=>{
    const got = ACH_UNLOCKED.includes(a.id);
    return `<div class="mp-ach ${got?'':'locked'}">
      <div class="ach-ic">${got?icon(a.icon,22):icon('lock',20)}</div>
      <div class="ach-tx"><b>${tx(a,'title')}</b><span>${tx(a,'desc')}</span></div>
    </div>`;
  }).join('');
  const gotCount = ACH_UNLOCKED.length;

  const teamHtml = TEAMS.map(tm=>
    `<div class="ts-opt ${tm.id===PROFILE.team?'sel':''}" data-team="${tm.id}">${tm.emoji} ${tx(tm,'name')}</div>`).join('');

  const langHtml = `
    <div class="ts-opt ${LANG==='ja'?'sel':''}" data-lang="ja">🇯🇵 日本語</div>
    <div class="ts-opt ${LANG==='en'?'sel':''}" data-lang="en">🇬🇧 English</div>`;

  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="mp-hd"><b>${t('mypage')}</b><button class="mp-close" id="mp-close">×</button></div>
    <div class="mp-body">
      <div class="mp-sec">${t('mp_lang')}</div>
      <div class="team-switch" id="mp-langs">${langHtml}</div>
      <div style="height:14px"></div>
      <div class="mp-sec">${t('mp_accent')}</div>
      <div class="accent-row" id="mp-accents">${ACCENTS.map(a=>`<button class="accent-dot ${PROFILE.accent===a.id?'sel':''}" data-accent="${a.id}" style="background:${a.color}" aria-label="${a.id}"></button>`).join('')}</div>
      <div style="height:14px"></div>
      <div class="mp-sec">${t('mp_avatar')}</div>
      <div class="mp-avgrid" id="mp-avgrid">${avHtml}</div>
      <div style="height:14px"></div>
      <div class="mp-sec">${t('mp_frames')}（${TITLE_FRAMES.filter(f=>isFrameUnlocked(f)).length}/${TITLE_FRAMES.length}）</div>
      <div class="frame-grid" id="mp-frames">${TITLE_FRAMES.map(f=>{
        const unlocked = isFrameUnlocked(f);
        const sel = f.id === (PROFILE.frame||'none');
        const lockTip = !unlocked ? t('frame_lv_need').replace('{0}',f.unlockLv) : '';
        return `<div class="frame-cell${!unlocked?' locked':''}${sel?' sel':''}" data-fid="${f.id}" title="${lockTip||tx(f,'name')}">
          ${sel?`<span class="frame-equipped">${t('frame_equipped')}</span>`:''}
          ${!unlocked?`<span class="frame-lock">${icon('lock',14)}</span>`:''}
          <span class="frame-ic">${icon(f.icon,20)}</span>
          <span class="frame-lbl">${tx(f,'name')}</span>
        </div>`;
      }).join('')}</div>
      <div class="mp-sec">${t('mp_name')}</div>
       <input class="mp-name" id="mp-name" type="text" maxlength="12" value="${escapeHTML(PROFILE.name)}" />
      <div class="mp-sec">${t('mp_team')}</div>
      <div class="team-switch" id="mp-teams">${teamHtml}</div>
      <div style="height:14px"></div>
      <div class="mp-sec">${t('mp_summary')}</div>
      <div class="mp-summary">
        <div class="mp-scell"><b>${STATE.myPosts}</b><span>${t('mp_week_posts')}</span></div>
        <div class="mp-scell"><b style="color:var(--gold)">${fmt(STATE.earned)}</b><span>${t('mp_earned')}</span></div>
        <div class="mp-scell"><b>${weekRank}${t('rank_suffix')}</b><span>${t('mp_week_rank')}</span></div>
        <div class="mp-scell"><b>${STATE.streak}</b><span>${t('mp_streak')}</span></div>
      </div>
      <div class="mp-sec">${t('mp_badges')}（${gotCount}/${ACHIEVEMENTS.length}）</div>
      <div class="mp-achgrid">${achHtml}</div>
      <button class="panel-btn" id="mp-stats" style="margin-bottom:10px">${t('stats_btn')}</button>
      <button class="panel-btn accent" id="mp-card" style="margin-bottom:10px">${t('card_btn')}</button>
      <div class="mp-sec">${t('route_title')}</div>
      <div class="mp-route">
        <button class="panel-btn" id="mp-route-edit">${icon('route',14)} ${hasRoute()?t('route_edit'):t('route_set')}</button>
        ${hasRoute()?`<button class="panel-btn danger" id="mp-route-clear">${t('route_clear')}</button>`:''}
      </div>
      <button class="panel-btn" id="mp-install" style="margin-bottom:10px;display:${installPrompt&&!isStandalone()?'':'none'}">${icon('trendUp',14)} ${t('mp_install')}</button>
      <button class="panel-btn" id="mp-demo" style="margin-bottom:10px">${icon('film',14)} ${LANG==='en'?'Demo mode (auto-play)':'デモモード（自動再生）'}</button>
      <button class="mp-reset" id="mp-reset">${t('mp_reset')}</button>
    </div>`;

  document.getElementById('mp-langs').querySelectorAll('.ts-opt').forEach(el=>{
    el.onclick = () => { setLang(el.dataset.lang); openMyPage(); };
  });
  document.getElementById('mp-accents').querySelectorAll('.accent-dot').forEach(el=>{
    el.onclick = () => {
      PROFILE.accent = el.dataset.accent; applyAccent();
      document.getElementById('mp-accents').querySelectorAll('.accent-dot').forEach(x=>x.classList.remove('sel'));
      el.classList.add('sel');
      saveState();
    };
  });
  document.getElementById('mp-close').onclick = ()=>sheet.classList.remove('open');
  document.getElementById('mp-frames').querySelectorAll('.frame-cell:not(.locked)').forEach(el=>{
    el.onclick = () => {
      PROFILE.frame = el.dataset.fid;
      applyFrame(); saveState();
      document.getElementById('mp-frames').querySelectorAll('.frame-cell').forEach(x=>{
        x.classList.remove('sel');
        const eq = x.querySelector('.frame-equipped');
        if(eq) eq.remove();
      });
      el.classList.add('sel');
      const eq = document.createElement('span');
      eq.className = 'frame-equipped'; eq.textContent = t('frame_equipped');
      el.prepend(eq);
    };
  });
  document.getElementById('mp-avgrid').querySelectorAll('.mp-av').forEach(el=>{
    el.onclick = () => {
      PROFILE.avatar = el.dataset.av;
      document.getElementById('mp-avgrid').querySelectorAll('.mp-av').forEach(x=>x.classList.remove('sel'));
      el.classList.add('sel');
      syncProfileToRanks(); renderHome(); saveState();
    };
  });
  const nameInput = document.getElementById('mp-name');
  nameInput.oninput = () => {
    const v = nameInput.value.trim() || (LANG==='en'?'Detective':'探偵');
    PROFILE.name = v;
    syncProfileToRanks(); renderHome(); saveState();
  };
  document.getElementById('mp-teams').querySelectorAll('.ts-opt').forEach(el=>{
    el.onclick = () => {
      PROFILE.team = el.dataset.team;
      document.getElementById('mp-teams').querySelectorAll('.ts-opt').forEach(x=>x.classList.remove('sel'));
      el.classList.add('sel');
      saveState();
    };
  });
  document.getElementById('mp-stats').onclick = () => { sheet.classList.remove('open'); openStats(); };
  document.getElementById('mp-card').onclick = () => { sheet.classList.remove('open'); openStatsCard(); };
  document.getElementById('mp-route-edit').onclick = () => { sheet.classList.remove('open'); startRoutePick(); };
  const rc = document.getElementById('mp-route-clear');
  if(rc) rc.onclick = () => { clearRoute(); openMyPage(); };
  document.getElementById('mp-install').onclick = promptInstall;
  document.getElementById('mp-demo').onclick = () => { sheet.classList.remove('open'); startDemo(); };
  document.getElementById('mp-reset').onclick = () => {
    if (confirm(t('mp_reset_confirm'))) resetAll();
  };
  sheet.classList.add('open');
}

// ── 防犯クイズ ──
function openQuiz(){
  const sheet = document.getElementById('quiz-sheet');
  const today = todayStr();
  if(QUIZ.date !== today){ QUIZ.date = today; QUIZ.answered = false; QUIZ.correct = false; QUIZ.markIdx = Math.floor(Math.random()*MARK_CATALOG.length); saveState(); }
  const cat = MARK_CATALOG[QUIZ.markIdx];
  // 選択肢：正解 + ランダムな別の名称3つ
  const others = MARK_CATALOG.filter((_,i)=>i!==QUIZ.markIdx);
  for(let i=others.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [others[i],others[j]]=[others[j],others[i]]; }
  const opts = [cat, ...others.slice(0,3)];
  for(let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }

  const optHtml = opts.map(o=>`<button class="qz-opt" data-correct="${o===cat?'1':'0'}">${tx(o,'name')}</button>`).join('');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="qz-hd"><b>${t('quiz_title')}</b><button class="qz-close" id="qz-close">×</button></div>
    <div class="qz-mark">${cat.mark}</div>
    <div class="qz-q">${t('quiz_q')}</div>
    <div class="qz-opts" id="qz-opts">${optHtml}</div>
    <div id="qz-result"></div>`;
  document.getElementById('qz-close').onclick = ()=>sheet.classList.remove('open');

  const reveal = (correct) => {
    document.querySelectorAll('#qz-opts .qz-opt').forEach(b=>{
      b.disabled = true;
      if(b.dataset.correct==='1') b.classList.add('correct');
    });
    document.getElementById('qz-result').innerHTML = `
      <div class="qz-expl"><b>${correct?t('quiz_correct'):t('quiz_wrong')}</b> — ${tx(cat,'name')}<br>${tx(cat,'meaning')}</div>
      <button class="ms-book-link" onclick="document.getElementById('quiz-sheet').classList.remove('open');switchView('book');openBookSheet(${QUIZ.markIdx})">${icon('book',14)} ${LANG==='en'?'See in handbook':'手帳でくわしく見る'}</button>`;
  };

  if(QUIZ.answered){
    reveal(QUIZ.correct);
    document.querySelectorAll('#qz-opts .qz-opt').forEach(b=>{ if(b.dataset.correct!=='1') b.style.opacity=.5; });
  } else {
    document.querySelectorAll('#qz-opts .qz-opt').forEach(b=>{
      b.onclick = () => {
        const correct = b.dataset.correct==='1';
        if(!correct) b.classList.add('wrong');
        QUIZ.answered = true; QUIZ.correct = correct;
        if(correct){ gainPoints(40); bumpDaily('quiz'); renderHome(); setTimeout(()=>showToast(`${t('toast_daily')}${t('quiz_reward')} +40${t('pt')}`), 400); }
        saveState();
        reveal(correct);
      };
    });
  }
  sheet.classList.add('open');
}

// ── 戦績カード（canvas画像生成）──
function openStatsCard(){
  const sheet = document.getElementById('card-sheet');
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="cd-hd"><b>${t('card_title')}</b><button class="cd-close" id="cd-close">×</button></div>
    <div class="cd-canvas-wrap"><canvas id="cd-canvas" width="1080" height="1080"></canvas></div>
    <div class="cd-actions">
      <button class="btn primary" id="cd-save">${t('card_save')}</button>
      <button class="btn ghost" id="cd-share">${t('card_share')}</button>
    </div>`;
  const canvas = document.getElementById('cd-canvas');
  drawStatsCard(canvas);
  document.getElementById('cd-close').onclick = ()=>sheet.classList.remove('open');
  document.getElementById('cd-save').onclick = () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'goto-tanteidan-card.png';
    a.click();
  };
  document.getElementById('cd-share').onclick = async () => {
    try {
      if(navigator.canShare && canvas.toBlob){
        canvas.toBlob(async (blob)=>{
          const file = new File([blob], 'goto-tanteidan-card.png', { type:'image/png' });
          if(navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:'GO-TO 探偵団' }); }
          else { showToast(t('toast_copy')); }
        }, 'image/png');
      } else { showToast(t('toast_copy')); }
    } catch(e){ /* キャンセル等は無視 */ }
  };
  sheet.classList.add('open');
}

function drawStatsCard(canvas){
  const x = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const info = getLevelInfo(STATE.points);
  const weekMe = RANKS.week.find(r=>r.me); const weekRank = RANKS.week.indexOf(weekMe)+1;
  // 背景
  const g = x.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#1d1d3a'); g.addColorStop(1,'#0b0b1a');
  x.fillStyle = g; x.fillRect(0,0,W,H);
  // アクセントの光
  const rg = x.createRadialGradient(W*0.18,H*0.12,40, W*0.18,H*0.12,W*0.8);
  rg.addColorStop(0,'rgba(230,57,70,.30)'); rg.addColorStop(1,'rgba(230,57,70,0)');
  x.fillStyle = rg; x.fillRect(0,0,W,H);
  // 角丸枠
  x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 4;
  roundRect(x, 48, 48, W-96, H-96, 40); x.stroke();
  // ヘッダー
  x.fillStyle = '#E63946'; roundRect(x, 90, 96, 250, 56, 28); x.fill();
  x.fillStyle = '#fff'; x.font = '700 28px sans-serif'; x.textBaseline='middle';
  x.fillText('GO-TO 探偵団', 112, 124);
  // アバター
  x.font = '150px sans-serif'; x.textAlign='center';
  x.fillText(PROFILE.avatar, W/2, 330);
  // 名前
  x.fillStyle = '#fff'; x.font = '800 64px sans-serif';
  x.fillText(`${txName(PROFILE.name)}${t('name_suffix')}`, W/2, 440);
  // 称号
  x.fillStyle = '#F4A261'; x.font = '700 38px sans-serif';
  x.fillText(`Lv.${info.cur.lv}  ${tx(info.cur,'title')}`, W/2, 510);
  // 大きなポイント
  x.fillStyle = '#fff'; x.font = '800 150px sans-serif';
  x.fillText(fmt(STATE.points), W/2, 660);
  x.fillStyle = '#A8C4D4'; x.font = '600 34px sans-serif';
  x.fillText(t('pts_label'), W/2, 740);
  // ステータス3つ
  const cells = [
    [String(STATE.posts), t('card_posts')],
    [String(STATE.streak), t('stat_streak')],
    [`${weekRank}${t('rank_suffix')||''}`.trim()||`#${weekRank}`, t('card_rank')],
  ];
  const cw = (W-180-60)/3;
  cells.forEach((c,i)=>{
    const cx0 = 90 + i*(cw+30);
    x.fillStyle = 'rgba(255,255,255,.06)'; roundRect(x, cx0, 800, cw, 150, 24); x.fill();
    x.fillStyle = '#F4A261'; x.font = '800 56px sans-serif'; x.textAlign='center';
    x.fillText(c[0], cx0+cw/2, 868);
    x.fillStyle = '#A8C4D4'; x.font = '600 26px sans-serif';
    x.fillText(c[1], cx0+cw/2, 918);
  });
  // フッター
  x.fillStyle = '#5a6478'; x.font = '600 28px sans-serif'; x.textAlign='center';
  x.fillText(t('card_made'), W/2, 1010);
}
function roundRect(x, X, Y, w, h, r){
  x.beginPath();
  x.moveTo(X+r, Y); x.arcTo(X+w, Y, X+w, Y+h, r); x.arcTo(X+w, Y+h, X, Y+h, r);
  x.arcTo(X, Y+h, X, Y, r); x.arcTo(X, Y, X+w, Y, r); x.closePath();
}

// ── 統計ダッシュボード ──
function openStats(){
  const sheet = document.getElementById('stats-sheet');
  const today = new Date();

  // 週間アクティビティ（直近7日）
  const wdKeys = ['wd_sun','wd_mon','wd_tue','wd_wed','wd_thu','wd_fri','wd_sat'];
  const days = [];
  for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); days.push(d); }
  const counts = days.map(d=>STATE.history[dateKey(d)]||0);
  const maxC = Math.max(1, ...counts);
  const todayKey = dateKey(today);
  const barsHtml = days.map((d,i)=>{
    const isToday = dateKey(d)===todayKey;
    const h = Math.round(counts[i]/maxC*84);
    return `<div class="st-bar ${isToday?'today':''}">
      <div class="bar-val">${counts[i]||''}</div>
      <div class="bar-fill" style="height:${counts[i]?h:0}px"></div>
      <div class="bar-day">${t(wdKeys[d.getDay()])}</div>
    </div>`;
  }).join('');

  // 種類別の内訳（ドーナツ）
  const dC=MARKINGS.filter(m=>m.type==='danger').length;
  const wC=MARKINGS.filter(m=>m.type==='warn').length;
  const sC=MARKINGS.filter(m=>m.type==='safe').length;
  const tot=dC+wC+sC || 1;
  const R=54, C=2*Math.PI*R;
  let acc=0;
  const seg=(val,color)=>{ const len=C*(val/tot); const off=C - acc; acc+=len;
    return `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="14"
      stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"/>`; };
  const donut = `<svg class="st-donut" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--night)" stroke-width="14"/>
    ${seg(dC,'#E63946')}${seg(wC,'#F4A261')}${seg(sC,'#64748B')}
    <text x="60" y="58" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">${tot}</text>
    <text x="60" y="76" text-anchor="middle" font-size="10" fill="#8A97AD">${t('stats_total_posts')}</text>
  </svg>`;
  const legend = `<div class="st-legend">
    <div><span class="dot" style="background:#E63946"></span>${t('lg_danger')}<span class="lg-val" style="color:#E63946">${dC}</span></div>
    <div><span class="dot" style="background:#F4A261"></span>${t('lg_warn')}<span class="lg-val" style="color:#F4A261">${wC}</span></div>
    <div><span class="dot" style="background:#64748B"></span>${t('lg_safe')}<span class="lg-val" style="color:#9aa6ba">${sC}</span></div>
  </div>`;

  // 投稿カレンダー（今月）
  const y=today.getFullYear(), mo=today.getMonth();
  const first=new Date(y,mo,1).getDay(), dim=new Date(y,mo+1,0).getDate();
  let cells='';
  for(let i=0;i<7;i++) cells+=`<div class="cal-wd">${t(wdKeys[i])}</div>`;
  for(let i=0;i<first;i++) cells+=`<div class="cal-cell empty"></div>`;
  let activeDays=0;
  for(let dnum=1; dnum<=dim; dnum++){
    const k=`${y}-${mo+1}-${dnum}`; const v=STATE.history[k]||0;
    if(v>0) activeDays++;
    const lv = v>=3?'lv3':v===2?'lv2':v===1?'lv1':'';
    const isToday = (dnum===today.getDate());
    cells+=`<div class="cal-cell ${lv} ${isToday?'today':''}">${dnum}</div>`;
  }

  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="st-hd"><b>${t('stats_title')}</b><button class="st-close" id="st-close">×</button></div>
    <div class="st-body">
      <div class="st-kpis">
        <div class="st-kpi"><b>${STATE.myPosts}</b><span>${t('mp_week_posts')}</span></div>
        <div class="st-kpi"><b>${activeDays}</b><span>${t('stats_active_days')}</span></div>
      </div>
      <div class="st-sec">${t('stats_activity')}</div>
      <div class="st-card"><div class="st-bars">${barsHtml}</div></div>
      <div class="st-sec">${t('stats_breakdown')}</div>
      <div class="st-card"><div class="st-donut-row">${donut}${legend}</div></div>
      <div class="st-sec">${t('stats_calendar')}</div>
      <div class="st-card"><div class="st-cal">${cells}</div></div>
    </div>`;
  document.getElementById('st-close').onclick = ()=>sheet.classList.remove('open');
  sheet.classList.add('open');
}

// ── セーフティハブ（Tips・チェックリスト・緊急連絡先）──
function openSafety(){
  const sheet = document.getElementById('safety-sheet');
  // チェックリストは日替わりでリセット
  const today = todayStr();
  if(STATE.checklist.date !== today){ STATE.checklist = { date: today, done:{} }; saveState(); }
  const tip = TIPS[dayHash() % TIPS.length];
  const checkHtml = CHECKLIST.map((c,i)=>{
    const done = !!STATE.checklist.done[i];
    return `<div class="sf-check ${done?'done':''}" data-ci="${i}">
      <div class="ck-box">${done?'✓':''}</div><div class="ck-tx">${tx(c,'text')}</div>
    </div>`;
  }).join('');
  const callHtml = EMERGENCY.map(e=>`
    <a class="sf-call" href="tel:${e.num.replace('#','%23')}">
      <span class="cl-num">${e.num}</span><span class="cl-lbl">${tx(e,'label')}</span><span class="cl-go">›</span>
    </a>`).join('');

  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="sf-hd"><b>${t('safety_title')}</b><button class="sf-close" id="sf-close">×</button></div>
    <div class="sf-body">
      <div class="sf-sec">${t('tips_sec')}</div>
      <div class="sf-tip">${icon('bulb',15)} ${tx(tip,'text')}</div>
      <div class="sf-sec">${t('checklist_sec')}</div>
      <div id="sf-checks">${checkHtml}</div>
      <div class="sf-sec">${t('emergency_sec')}</div>
      ${callHtml}
      <div class="sf-note">${t('emergency_note')}</div>
    </div>`;
  document.getElementById('sf-close').onclick = ()=>sheet.classList.remove('open');
  document.getElementById('sf-checks').querySelectorAll('.sf-check').forEach(el=>{
    el.onclick = () => {
      const i = el.dataset.ci;
      const nowDone = !STATE.checklist.done[i];
      STATE.checklist.done[i] = nowDone;
      el.classList.toggle('done', nowDone);
      el.querySelector('.ck-box').textContent = nowDone ? '✓' : '';
      if(nowDone) bumpDaily('check');
      saveState();
    };
  });
  sheet.classList.add('open');
}

function openDetail(idx){
  const f = FEED[idx];
  const color = f.chip[0]==='ok'?'#E63946':f.chip[0]==='warn'?'#F4A261':'#64748B';
  const badgeBg = f.chip[0]==='ok'?'rgba(230,57,70,.2)':f.chip[0]==='warn'?'rgba(244,162,97,.2)':'rgba(100,116,139,.2)';
  const catIdx = MARK_CATALOG.findIndex(c=>c.mark===f.mark);
  const cat = catIdx >= 0 ? MARK_CATALOG[catIdx] : null;
  const modal = document.getElementById('detail-modal');
  modal.innerHTML = `
    <div class="dm-head">
      <button class="dm-back" onclick="document.getElementById('detail-modal').classList.remove('open')">←</button>
      <span style="font-size:16px;font-weight:800">${t('dm_title')}</span>
    </div>
    <div style="padding:0 18px 24px">
      <div class="dm-mark" style="${f.resolved?'opacity:.6;filter:grayscale(.4)':''}">${f.mark}</div>
      <div class="dm-label">${txLabel(f.label)||tx(f,'act')}</div>
      <div class="dm-meta">
        <span class="dm-badge" style="background:${f.resolved?'rgba(59,130,246,.2)':badgeBg};color:${f.resolved?'#7dd3fc':color}">${f.resolved?t('chip_resolved'):(txVerdict(f.verdict)||txChip(f.chip[0]))}</span>
         <span style="font-size:11px;color:var(--gray);margin-left:8px">${t('dm_posted_by')} ${escapeHTML(txName(f.who))} · ${txAgo(f.ago)}</span>
      </div>
      <div class="conf-row">
        <span class="conf-lbl">${t('cam_conf')}</span>
        <div class="conf-bar"><i style="width:${f.conf}%;background:${color}"></i></div>
        <span class="conf-val" style="color:${color}">${f.conf}%</span>
      </div>
      <div class="ai-comment">${icon('cpu',14)} ${tx(f,'aiComment')}</div>
      <div class="react-row" id="react-row">${reactionBtns(f)}</div>
      ${cat ? `<div class="catalog-link" onclick="document.getElementById('detail-modal').classList.remove('open');switchView('book');openBookSheet(${catIdx})">
        <div class="cl-icon" style="width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(230,57,70,.15)">${cat.mark}</div>
        <div class="cl-info"><b>${tx(cat,'name')}</b><span>${t('dm_catalog')}</span></div>
      </div>` : ''}
      ${f.resolved
        ? `<div class="resolve-badge"><div class="rb-ic">${icon('checkCircle',20)}</div><div class="rb-tx"><b>${t('resolve_badge_title')}</b><span>${t('resolve_badge_sub')}</span></div></div>`
        : `<button class="resolve-btn" onclick="resolveMarking(${idx})">${t('resolve_btn')}</button>`
      }
    </div>`;
  modal.classList.add('open');
  bindReactions(idx);
}

// 対処のビフォーアフター：警戒度の低下を即フィードバック＋累積記録（週報用）
function resolvedFeedbackToast(before){
  const after = forecastLevel().score;
  if(before > after) STATE.riskReduced = (STATE.riskReduced||0) + (before - after);
  showToast(before > after
    ? `${t('toast_resolved')} ・ ${LANG==='en'?'Risk':'警戒度'} ${before}→${after}`
    : t('toast_resolved'));
}
function resolveMarking(idx){
  const f = FEED[idx];
  if(f.resolved) return;
  const beforeScore = forecastLevel().score;
  f.resolved = true;
  f.resolvedAt = new Date().toISOString();
  // mark the corresponding MARKING as resolved
  const m = MARKINGS.find(mk => mk.mark===f.mark && mk.user===f.who);
  if(m) m.resolved = true;
  gainPoints(20);
  STATE.resolved = (STATE.resolved||0) + 1;
  bumpDaily('resolve');
  checkAchievements();
  updateRankData(20);
  resolvedFeedbackToast(beforeScore);
  renderHome();
  renderMapOverlay();
  // re-render map pins if map is open
  if(typeof markerLayer!=='undefined' && markerLayer) refreshMapPins();
  document.getElementById('detail-modal').classList.remove('open');
  saveState();
}

const REACTIONS = [ {k:'up',ic:'check',key:'react_up'}, {k:'warn',ic:'alert',key:'react_warn'}, {k:'check',ic:'checkCircle',key:'react_check'} ];
function reactionBtns(f){
  if(!f.reactions) f.reactions = {up:0,warn:0,check:0};
  return REACTIONS.map(r=>`
    <button class="react-btn ${f.myReaction===r.k?'on':''}" data-react="${r.k}">
      <span class="re-emoji">${icon(r.ic,15)}</span><span class="re-lbl">${t(r.key)}</span><span class="re-cnt">${f.reactions[r.k]||0}</span>
    </button>`).join('');
}
function bindReactions(idx){
  const f = FEED[idx];
  document.querySelectorAll('#react-row .react-btn').forEach(btn=>{
    btn.onclick = () => {
      const k = btn.dataset.react;
      if(f.myReaction===k){ f.reactions[k]=Math.max(0,(f.reactions[k]||0)-1); f.myReaction=null; }
      else {
        if(f.myReaction){ f.reactions[f.myReaction]=Math.max(0,(f.reactions[f.myReaction]||0)-1); }
        f.reactions[k]=(f.reactions[k]||0)+1; f.myReaction=k;
      }
      document.getElementById('react-row').innerHTML = reactionBtns(f);
      bindReactions(idx);
      saveState();
    };
  });
}

let bookQuery = '', bookFilter = 'all';
function renderBook(){
  const q = bookQuery.trim().toLowerCase();
  const allList = MARK_CATALOG.map((m,i)=>({m,i}));
  const list = allList.filter(({m})=>{
    if(bookFilter === 'unfound'){ if(STATE.found[m.mark]) return false; }
    else if(bookFilter !== 'all' && m.color !== bookFilter) return false;
    if(!q) return true;
    const hay = (m.name + ' ' + m.meaning + ' ' + m.examples.join(' ') + ' ' +
      (m.name_en||'') + ' ' + (m.meaning_en||'') + ' ' + m.examples.map(txLabel).join(' ')).toLowerCase();
    return hay.includes(q);
  });
  const foundCount = MARK_CATALOG.filter(m => STATE.found[m.mark]).length;
  const progressHtml = `
    <div class="book-progress">
      <span>${icon('book',13)} ${LANG==='en'?'Found':'発見済み'} <b>${foundCount}</b>/${MARK_CATALOG.length}</span>
      <div class="bp-bar"><i style="width:${Math.round(foundCount/MARK_CATALOG.length*100)}%"></i></div>
    </div>`;
  document.getElementById('book-list').innerHTML = progressHtml + (list.length ? list.map(({m,i})=>{
    const chipCls = m.color==='danger'?'ok':m.color==='warn'?'warn':'ng';
    const chipLbl = m.color==='danger'?t('chip_danger'):m.color==='warn'?t('chip_warn'):t('chip_safe');
    const bg = m.color==='danger'?'rgba(230,57,70,.18)':m.color==='warn'?'rgba(244,162,97,.18)':'rgba(100,116,139,.18)';
    const found = !!STATE.found[m.mark];
    return `<div class="book-row" onclick="openBookSheet(${i})">
      <div class="book-row-mark" style="background:${bg}">${m.mark}${found?'<span class="br-found">✓</span>':''}</div>
      <div class="book-row-info">
        <b>${tx(m,'name')} <span class="chip ${chipCls}" style="font-size:10px">${chipLbl}</span></b>
        <div class="book-row-freq">${freqDotsHtml(m.frequency)}${txFreq(m.frequency)}</div>
      </div>
      <div class="book-row-arr">›</div>
    </div>`;
  }).join('') : `<div class="book-empty">${t('book_empty')}</div>`);
}
function openBookSheet(idx){
  const m = MARK_CATALOG[idx];
  if(!m) return;
  const chipCls = m.color==='danger'?'ok':m.color==='warn'?'warn':'ng';
  const chipLbl = m.color==='danger'?t('chip_danger'):m.color==='warn'?t('chip_warn'):t('chip_safe');
  const bg = m.color==='danger'?'rgba(230,57,70,.18)':m.color==='warn'?'rgba(244,162,97,.18)':'rgba(100,116,139,.18)';
  const sep = LANG==='en' ? ', ' : '、';
  document.getElementById('book-sheet').innerHTML = `
    <div class="grab"></div>
    <div class="bs-head">
      <div class="bs-icon" style="background:${bg}">${m.mark}</div>
      <div class="bs-title">
        <b>${tx(m,'name')}</b>
        <span class="chip ${chipCls}">${chipLbl}</span>${STATE.found[m.mark]?` <span class="chip found">✓ ${LANG==='en'?'Found':'発見済み'}</span>`:''}
      </div>
      <button class="bs-close" onclick="closeBookSheet()">×</button>
    </div>
    <div class="bs-body">
      <div class="bs-section">
        <div class="bs-label">${LANG==='en'?'WHAT IT MEANS':'意味・特徴'}</div>
        <div class="bs-text">${tx(m,'meaning')}</div>
      </div>
      <div class="bs-section">
        <div class="bs-label">${LANG==='en'?'FREQUENCY':'出現頻度'}</div>
        <div class="bs-text">${freqDotsHtml(m.frequency)}${txFreq(m.frequency)}</div>
      </div>
      <div class="bs-section">
        <div class="bs-label">${LANG==='en'?'WHERE IT APPEARS':'よく見られる場所'}</div>
        <div class="bs-examples">${m.examples.map(e=>`<span class="bs-ex-chip">${txLabel(e)}</span>`).join('')}</div>
      </div>
      <button class="bs-cam-btn" onclick="closeBookSheet(); switchView('cam')">${icon('camera',14)} ${LANG==='en'?'Shoot this mark':'このマークを撮影する'}</button>
    </div>`;
  document.getElementById('book-sheet').classList.add('open');
}
function closeBookSheet(){
  document.getElementById('book-sheet').classList.remove('open');
}

let currentSeg = 'week';
function renderRank(seg){
  currentSeg = seg;
  const list = RANKS[seg];
  renderMyContrib();
  document.getElementById('rank-list').innerHTML = list.map((r,i)=>{
    const cls = i===0?'g':i===1?'s':i===2?'b':'';
    const medal = i<3 ? icon('award',20,`color:${['#D4A820','#B8BEC8','#C08552'][i]}`) : (i+1);
    return `<div class="rank-row ${r.me?'me':''}" onclick="openRankSheet(${i})" style="cursor:pointer">
      <div class="pos ${cls}">${medal}</div>
      <div class="av" style="background:${r.bg}">${r.av}</div>
       <div class="rn"><b>${escapeHTML(txName(r.name))}</b><span>${txArea(r.area)}</span></div>
      <div class="rp">${fmt(r.pt)}</div>
      <div class="row-arr">›</div>
    </div>`;
  }).join('');
}

