// ── 実カメラ（getUserMedia）: 許可されればライブプレビュー、不可なら絵文字モードのまま ──
let camStream = null, camShot = null;
async function startCamPreview(){
  const vid = document.getElementById('cam-video');
  if(!vid || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    vid.srcObject = camStream;
    await vid.play();
    const stage = document.getElementById('cam-stage');
    if(stage) stage.classList.add('live');
  } catch(e){ /* 権限拒否・非対応 → 絵文字モードのまま */ }
}
function stopCamPreview(){
  if(camStream){ camStream.getTracks().forEach(tr=>tr.stop()); camStream = null; }
  const stage = document.getElementById('cam-stage');
  if(stage) stage.classList.remove('live');
}
function captureShot(){
  const vid = document.getElementById('cam-video');
  if(!camStream || !vid || !vid.videoWidth) return null;
  const c = document.createElement('canvas');
  c.width = vid.videoWidth; c.height = vid.videoHeight;
  c.getContext('2d').drawImage(vid, 0, 0);
  try { return c.toDataURL('image/jpeg', .8); } catch(e){ return null; }
}
function camIdle(){
  const s = CAM_SUBJECTS[Math.floor(Math.random()*CAM_SUBJECTS.length)];
  camShot = null;
  document.getElementById('cam-stage').innerHTML = `
    <div class="viewfinder">
      <video id="cam-video" class="cam-video" autoplay playsinline muted></video>
      <div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>
      <div class="scan"></div>
      <div class="target" id="vtarget">${s.target}</div>
    </div>
    <div class="cam-hint">${tx(s,'place')}<br>${t('cam_hint')}</div>
    <div class="shutter" id="shutter" role="button" aria-label="${LANG==='en'?'Take photo':'撮影する'}">${icon('camera',26)}</div>`;
  document.getElementById('shutter').onclick = () => {
    camShot = captureShot();
    stopCamPreview();
    camAnalyze();
  };
  startCamPreview();
}

function camAnalyze(){
  const stage = document.getElementById('cam-stage');
  stage.innerHTML = `
    <div class="viewfinder">
      ${camShot ? `<img src="${camShot}" class="cam-shot" alt="">` : ''}
      <div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>
      <div class="scan" style="display:block"></div>
      ${camShot ? '' : `<div class="target">${icon('search',54)}</div>`}
    </div>
    <div class="ai-box">
      <div class="ai-row" id="r1"><div class="spin"></div><span>${t('cam_r1')}</span></div>
      <div class="ai-row" id="r2"><div class="spin"></div><span>${t('cam_r2')}</span></div>
      <div class="ai-row" id="r3"><div class="spin"></div><span>${t('cam_r3')}</span></div>
    </div>`;
  const steps = ['r1','r2','r3'];
  let i = 0;
  document.getElementById('r1').classList.add('on');
  const tick = () => {
    if (i < steps.length){
      const el = document.getElementById(steps[i]);
      el.classList.add('on');
      setTimeout(()=>{
        el.classList.add('done');
        i++;
        if (i < steps.length) document.getElementById(steps[i]).classList.add('on');
        tick();
      }, 850);
    } else {
      setTimeout(camResult, 500);
    }
  };
  tick();
}

function camResult(){
  const o = pickOutcome();
  const gained = o.pts;
  const conf = randInt(o.conf[0], o.conf[1]);
  const color = TYPE_COLOR[o.type];
  const bonus = STATE.posts === 38 ? t('cam_bonus') : '';
  // コンボ判定（連続 danger で加点＆演出）
  const prevCombo = STATE.camCombo || 0;
  const isCombo = o.type === 'danger' && prevCombo >= 1;
  const comboCount = o.type === 'danger' ? prevCombo + 1 : 0;
  const comboBonus = isCombo ? Math.min(30, prevCombo * 10) : 0;
  const totalGained = gained + comboBonus;
  const comboBadge = isCombo
    ? `<div class="combo-badge">${icon('flame',13)} ${LANG==='en'?'COMBO':'コンボ'} ×${comboCount}  +${comboBonus}pt</div>` : '';
  const tileBg = { danger:'rgba(230,57,70,.18)', warn:'rgba(244,162,97,.18)', safe:'rgba(100,116,139,.18)' }[o.type];
  const markVisual = camShot
    ? `<div class="rc-photo"><img src="${camShot}" alt=""><span class="rc-mark" style="background:${tileBg};border:2px solid ${color}">${o.mark}</span></div>`
    : `<div><span class="rc-mark" style="background:${tileBg};border:2px solid ${color}">${o.mark}</span></div>`;
  document.getElementById('cam-stage').innerHTML = `
    <div class="result-card">
      ${comboBadge}
      ${markVisual}
      <h3 style="color:${color}">${tx(o,'title')}</h3>
      <div class="desc">${t('cam_conf')} <b>${conf}%</b><br>${tx(o,'desc')}<br>${t('cam_added')}</div>
      <div class="pt-pop"><div class="n">+${totalGained} ${t('pt')}</div><div class="l">${t('cam_got')}${bonus}</div></div>
      <button class="btn primary" id="cam-done">${t('cam_reflect')}</button>
      <div class="rc-secondary">
        <button class="btn ghost" id="cam-again">${LANG==='en'?'Shoot again':'もう一度撮影'}</button>
        <button class="btn ghost" id="cam-share">${t('cam_share')}</button>
      </div>
    </div>`;
  document.getElementById('cam-done').onclick = () => {
    STATE.camCombo = comboCount;
    const oldLv = getLevelInfo(STATE.points).cur.lv;
    gainPoints(totalGained);
    STATE.posts += 1; STATE.myPosts += 1;
    if(o.type==='danger') STATE.dangerFound += 1;
    STATE.found[o.mark] = true;  // 手帳コレクションに記録
    recordPostToday();
    // フィードに先頭追加（日英両方を保存して言語切替に対応）
    const bgMap = { danger:'rgba(230,57,70,.2)', warn:'rgba(244,162,97,.2)', safe:'rgba(100,116,139,.2)' };
    const chipMap = { danger:['ok','濃厚'], warn:['warn','要確認'], safe:['ng','偶然'] };
    const aiCommentMap = {
      danger:'高い信頼度でマーキングと判定。近隣での類似事例と照合した結果、侵入犯罪の予告記号の特徴と一致します。',
      warn:'マーキングの可能性が確認されましたが確定には至りません。周辺の類似報告と合わせて判断することを推奨します。',
      safe:'自然な経年劣化またはチョーク等による偶然の記号と判定。マーキングの特徴的なパターンは検出されませんでした。'
    };
    const aiCommentMapEn = {
      danger:'Judged a marking with high confidence. Cross-checking similar nearby cases, it matches the traits of a break-in warning symbol.',
      warn:'A possible marking was confirmed but not conclusive. Judging together with similar nearby reports is recommended.',
      safe:'Judged a coincidental symbol from natural aging or chalk. No characteristic marking pattern was detected.'
    };
    const enLabel = LABELS[o.label] || o.label;
    FEED.unshift({ mark:o.mark, bg:bgMap[o.type], who:PROFILE.name,
      act:o.label+'を投稿', act_en:'posted '+enLabel, ago:'たった今', chip:chipMap[o.type],
      label:o.label, label_en:enLabel, verdict:o.verdict, conf:conf,
      aiComment:aiCommentMap[o.type], aiComment_en:aiCommentMapEn[o.type],
      reactions:{up:0,warn:0,check:0}, myReaction:null });
    STATE.unread++; renderBadge();
    // デイリーミッション・実績・ランキング更新
    bumpDaily('posts'); bumpDaily(o.type);
    checkAchievements();
    updateRankData(totalGained);
    renderHome();
    // レベルアップ判定
    const newLv = getLevelInfo(STATE.points).cur;
    if(newLv.lv > oldLv) setTimeout(()=>showLevelUp(newLv), 800);
    // add a fresh marking near center
    const compLabel = LANG==='en' ? `${t('your_new_post')} (${enLabel})` : 'あなたの新規投稿（'+o.label+'）';
    const m = { lat:35.6595+(Math.random()-.5)*.004, lng:139.7010+(Math.random()-.5)*.004,
      type:o.type, mark:o.mark, verdict:o.verdict, user:PROFILE.name, label:compLabel, ago:'たった今' };
    MARKINGS.push(m);
    if (map && markerLayer && !(routeFocus && hasRoute() && !onRoute(m))){
      const icon = L.divIcon({ className:'', html:`<div class="pin" style="background:${color};animation:none"><span>${o.mark}</span></div>`, iconSize:[26,26], iconAnchor:[13,26] });
      L.marker([m.lat,m.lng],{icon}).addTo(markerLayer).on('click', ()=>openMarkingSheet(m));
    }
    renderMapOverlay();
    refreshHeat();
    saveState();
    switchView('map');
    showToast(t('toast_posted')+totalGained+t('toast_pt_got'));
    setTimeout(camIdle, 400);
  };
  document.getElementById('cam-again').onclick = camIdle;
  document.getElementById('cam-share').onclick = () => {
    const text = LANG==='en'
      ? `GO-TO Detectives\n${tx(o,'title')} (AI confidence ${conf}%)\nMy post was added to the crime-prevention map\nhttps://b-w-hiroki.github.io/goto-tanteidan/`
      : `GO-TO探偵団\n${tx(o,'title')}（AI信頼度 ${conf}%）\n投稿が防犯マップに追加されました\nhttps://b-w-hiroki.github.io/goto-tanteidan/`;
    if (navigator.share) { navigator.share({ title: 'GO-TO探偵団', text }).catch(()=>{}); }
    else { navigator.clipboard?.writeText(text).then(() => showToast(t('toast_copy'))); }
    STATE.shares += 1; bumpDaily('share'); checkAchievements(); saveState();
  };
}

// ── Toast ──
let toastT;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('show'), 2200);
}

// ── Notification badge + sheet ──
function renderBadge(){
  const el = document.getElementById('home-badge');
  if (!el) return;
  if (STATE.unread > 0) { el.textContent = STATE.unread; el.style.display = 'flex'; }
  else { el.style.display = 'none'; }
}
function openNotifSheet(){
  const sheet = document.getElementById('notif-sheet');
  const items = FEED.slice(0, STATE.unread || FEED.length);
  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="ns-hd">
      <b>${t('notif_title')} ${STATE.unread > 0 ? `<span style="font-size:12px;background:var(--red);color:#fff;border-radius:10px;padding:1px 7px;margin-left:6px">${STATE.unread}</span>` : ''}</b>
      <button class="ns-close" id="ns-close">×</button>
    </div>
    <div class="notif-list">
      ${items.map((f,i)=>`
        <div class="notif-item" onclick="closeNotifSheet();openDetail(${i})">
          <div class="ni-icon" style="background:${f.bg}">${f.mark}</div>
           <div class="ni-tx"><b>${escapeHTML(txName(f.who))}</b><span>${tx(f,'act')} · ${txAgo(f.ago)}</span></div>
          <span class="chip ${f.chip[0]}">${txChip(f.chip[0])}</span>
          <div class="row-arr">›</div>
        </div>`).join('')}
    </div>`;
  document.getElementById('ns-close').onclick = closeNotifSheet;
  STATE.unread = 0; renderBadge();
  sheet.classList.add('open');
}
function closeNotifSheet(){
  document.getElementById('notif-sheet').classList.remove('open');
}

// ── Onboarding ──
// ── アカウントセットアップ ──
let _setupName = '', _setupAv = '', _setupTeam = '';

function showSetup(){
  _setupName = ''; _setupAv = PROFILE.avatar || '🕵️'; _setupTeam = PROFILE.team || 'shibuya';
  renderSetupStep(1);
  document.getElementById('setup-view').classList.add('open');
  const ob = document.getElementById('onboard');
  if(ob){ ob.classList.add('gone'); setTimeout(()=>{ if(ob.parentNode) ob.remove(); }, 450); }
}

function renderSetupStep(step){
  const el = document.getElementById('setup-view');
  const dots = [1,2,3].map(i=>`<div class="setup-prog-dot${i===step?' on':''}"></div>`).join('');
  const prog = `<div class="setup-progress">${dots}</div>`;

  if(step === 1){
    el.innerHTML = `
      <div class="setup-hdr">${prog}
        <div class="setup-title">${LANG==='en'?'Choose your<br>detective name':'探偵名を<br>つけてください'}</div>
        <div class="setup-sub">${LANG==='en'?'This is the name shown in rankings':'ランキングに表示される名前です'}</div>
      </div>
      <div class="setup-body" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:56px">
        <span class="setup-av-ic">${_setupAv}</span>
        <input class="setup-name-inp" id="su-name" type="text" maxlength="12"
          placeholder="${LANG==='en'?'e.g. Haruki':'例：はるき'}" value="${_setupName}"
          autocomplete="off" inputmode="text" />
        <div class="setup-name-hint">${LANG==='en'?'Up to 12 characters':'最大12文字'}</div>
      </div>
      <div class="setup-foot">
        <button class="btn primary" onclick="suNext1()">${LANG==='en'?'Next →':'次へ →'}</button>
      </div>`;
    setTimeout(()=>{ const i=document.getElementById('su-name'); if(i) i.focus(); }, 120);

  } else if(step === 2){
    const avHtml = AVATARS.map(a=>
      `<div class="setup-av-cell${a===_setupAv?' sel':''}" onclick="suPickAv(this,'${a}')">${a}</div>`
    ).join('');
    el.innerHTML = `
      <div class="setup-hdr">${prog}
        <div class="setup-title">${LANG==='en'?'Choose your<br>avatar':'アバターを<br>選んでください'}</div>
      </div>
      <div class="setup-body"><div class="setup-av-grid">${avHtml}</div></div>
      <div class="setup-foot">
        <button class="btn primary" onclick="renderSetupStep(3)">${LANG==='en'?'Next →':'次へ →'}</button>
      </div>`;

  } else if(step === 3){
    const teamHtml = TEAMS.map(tm=>`
      <div class="setup-team-item${tm.id===_setupTeam?' sel':''}" onclick="suPickTeam(this,'${tm.id}')">
        <div class="setup-team-ic">${tm.emoji}</div>
        <div class="setup-team-name">
          <b>${tx(tm,'name')}</b>
          <span>${tm.members}${LANG==='en'?'':' '}${LANG==='en'?'members':'名'} · ${Math.round(teamDisplayPt(tm)/1000)}K pt</span>
        </div>
        <div class="setup-team-chk">✓</div>
      </div>`).join('');
    el.innerHTML = `
      <div class="setup-hdr">${prog}
        <div class="setup-title">${LANG==='en'?'Join a squad':'探偵団に<br>参加しますか？'}</div>
        <div class="setup-sub">${LANG==='en'?'You can change this later in your profile':'あとでマイページから変更できます'}</div>
      </div>
      <div class="setup-body">${teamHtml}</div>
      <div class="setup-foot">
        <button class="btn primary" onclick="finishSetup()">${LANG==='en'?'Start':'はじめる'}</button>
        <button class="setup-skip" onclick="finishSetup()">${LANG==='en'?'Skip for now':'あとで設定する'}</button>
      </div>`;
  }
}

function suNext1(){
  const inp = document.getElementById('su-name');
  const name = inp ? inp.value.trim() : '';
  if(!name){ if(inp){ inp.classList.add('err'); inp.placeholder = LANG==='en'?'Please enter a name':'名前を入力してください'; } return; }
  _setupName = name;
  renderSetupStep(2);
}
function suPickAv(el, av){
  _setupAv = av;
  document.querySelectorAll('.setup-av-cell').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
  // Update the avatar preview on step 1 via _setupAv (only on step 2 so no-op needed)
}
function suPickTeam(el, team){
  _setupTeam = team;
  document.querySelectorAll('.setup-team-item').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
}
function finishSetup(){
  if(_setupName) PROFILE.name = _setupName;
  if(_setupAv)   PROFILE.avatar = _setupAv;
  if(_setupTeam) PROFILE.team = _setupTeam;
  ONBOARDED = true; saveState();
  syncProfileToRanks(); renderHome();
  const sv = document.getElementById('setup-view');
  sv.classList.remove('open');
  const ob = document.getElementById('onboard');
  if(ob){ ob.classList.add('gone'); setTimeout(()=>ob.remove(), 450); }
  setTimeout(()=>sv.remove(), 450);
  const welcome = LANG==='en'
    ? `Welcome, ${PROFILE.name}`
    : `ようこそ、${PROFILE.name}${t('name_suffix')}`;
  setTimeout(()=>showToast(welcome), 700);
}

