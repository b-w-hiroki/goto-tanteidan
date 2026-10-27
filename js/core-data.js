// ───────────────────────────── アイコン ─────────────────────────────
// UIの部品に絵文字を使うと、OS任せの色と形が混ざって画面の統一感が崩れる。
// タブバーと同じ作法（24×24・線幅1.8・currentColor）で描いた線画に統一する。
// 絵文字を残すのは「中身そのもの」＝アバターとマーキング記号だけ。
const ICONS = {
  folder:   '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  bell:     '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  clipboard:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  camera:   '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  unlock:   '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  flame:    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chart:    '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  film:     '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 12h20M2 7.5h5M2 16.5h5M17 16.5h5M17 7.5h5"/>',
  sun:      '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M1.5 12H4M20 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/>',
  cloudSun: '<circle cx="8.5" cy="8" r="3.4"/><path d="M8.5 1.6v1.6M3.3 3.3l1.2 1.2M1.6 8.5h1.6M13.7 3.3l-1.2 1.2"/><path d="M18 21H9a4 4 0 0 1-.5-7.97A4.6 4.6 0 0 1 17.4 13 4 4 0 0 1 18 21z"/>',
  alert:    '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17.5h.01"/>',
  megaphone:'<path d="M4 9.5v5l14 5V4.5z"/><path d="M4 9.5H2.8v5H4M8 15.5v3a2 2 0 0 0 4 0v-1.6"/>',
  book:     '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  search:   '<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.6-4.6"/>',
  trophy:   '<path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 5H3.5v1.5A3.5 3.5 0 0 0 6 9.9M18 5h2.5v1.5A3.5 3.5 0 0 1 18 9.9"/>',
  user:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  target:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  share:    '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.4 13.4l7.2 4.2M15.6 6.4L8.4 10.6"/>',
  check:    '<path d="M20 6L9 17l-5-5"/>',
  checkCircle:'<path d="M21.5 11.1V12a9.5 9.5 0 1 1-5.6-8.7"/><path d="M21.5 4.5L12 14l-2.8-2.8"/>',
  zap:      '<path d="M13 2L3.5 14H12l-1 8 9.5-12H12l1-8z"/>',
  map:      '<path d="M1.5 6.2v15.3l7-3.7 7 3.7 7-3.7V2.5l-7 3.7-7-3.7-7 3.7z"/><path d="M8.5 2.5v15.3M15.5 6.2v15.3"/>',
  award:    '<circle cx="12" cy="8.5" r="6"/><path d="M8.2 13.7L7 22l5-2.8 5 2.8-1.2-8.3"/>',
  crown:    '<path d="M2.5 6.5l4 4.5 5.5-7 5.5 7 4-4.5-1.8 12H4.3z"/><path d="M4.5 22h15"/>',
  gem:      '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3L8 9l4 12 4-12-3-6M2 9h20"/>',
  bulb:     '<path d="M9 18.5h6M10 22h4"/><path d="M15.1 14.5c.2-1 .6-1.7 1.4-2.5A4.6 4.6 0 0 0 18 8.5a6 6 0 0 0-12 0c0 1 .2 2.2 1.5 3.5.8.8 1.2 1.5 1.4 2.5"/>',
  cpu:      '<rect x="4.5" y="4.5" width="15" height="15" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1.5V4M15 1.5V4M9 20v2.5M15 20v2.5M20 9h2.5M20 15h2.5M1.5 9H4M1.5 15H4"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2"/><path d="M10 6h4M10 10h4M10 14h4"/>',
  phone:    '<path d="M21.5 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 4.2 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.6 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  gift:     '<path d="M20 12.5V21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5"/><rect x="2" y="7.5" width="20" height="5" rx="1"/><path d="M12 22V7.5"/><path d="M12 7.5H7.8a2.5 2.5 0 1 1 0-5C11 2.5 12 7.5 12 7.5zM12 7.5h4.2a2.5 2.5 0 1 0 0-5C13 2.5 12 7.5 12 7.5z"/>',
  star:     '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
  trendUp:  '<path d="M22.5 6.5L13.5 15.5l-5-5-7 7"/><path d="M16.5 6.5h6v6"/>',
  route:    '<circle cx="6" cy="19" r="2.6"/><circle cx="18" cy="5" r="2.6"/><path d="M9 19h5.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H15"/>',
  square:   '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  siren:    '<path d="M7.9 2.5h8.2L21.5 8v8.2l-5.4 5.3H7.9L2.5 16.1V7.9z"/><path d="M12 8v4.5M12 16h.01"/>',
  signal:   '<path d="M2 20h2M8 20v-5M14 20V9M20 20V3" stroke-width="2.4"/>',
  battery:  '<rect x="2" y="8" width="16" height="9" rx="2"/><path d="M21 11.5v2"/><path d="M5 11.5h8" stroke-width="3"/>',
  arrowRight:'<path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5"/>',
  lock:     '<rect x="4" y="11" width="16" height="10.5" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  home:     '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.6V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.6"/>',
  flag:     '<path d="M5.5 21.5V3M5.5 3.5h11l-2.2 4 2.2 4h-11"/>',
};
function icon(name, size = 16, extra = ''){
  const body = ICONS[name];
  if(!body) return '';
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"${extra?` style="${extra}"`:''}>${body}</svg>`;
}

// ── ホーム画面への追加（PWA）──
// Service Worker は前からあるのに、入れてもらう導線がなかった。
// ブラウザがインストール可能と判断したときだけボタンを出す。
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  const btn = document.getElementById('mp-install');
  if(btn) btn.style.display = '';
});
window.addEventListener('appinstalled', () => { installPrompt = null; });
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
async function promptInstall(){
  if(!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if(outcome === 'accepted') installPrompt = null;
  const btn = document.getElementById('mp-install');
  if(btn && !installPrompt) btn.style.display = 'none';
}

// ───────────────────────────── i18n ─────────────────────────────
let LANG = 'ja';
const I18N = {
  ja: {
    pitch_lead:'市民が「探偵」となり、街のマーキングを発見・投稿。AIが判定し、防犯マップがリアルタイムに育つ。',
    pitch_f1t:'撮って投稿', pitch_f1d:'通勤・通学路の不審な記号を撮影しGPS付きで投稿',
    pitch_f2t:'AIが自動判定', pitch_f2d:'マーキングか偶然かをAIが判別しマップへ反映',
    pitch_f3t:'ポイント＆ランキング', pitch_f3d:'貢献に応じて捜査ポイント・特典・地域ランク',
    pitch_note:'※ これは概念実証用のプロトタイプです。地図・投稿・AI判定・ポイントはすべてダミーデータで動作します。実際のタブを操作してみてください →',
    home_greet:'こんにちは、探偵', home_sub:'昼間は記号がいちばん見つけやすい',
    greet_morning:'おはよう、探偵', sub_morning:'出かける前に、玄関まわりの確認を',
    greet_day:'こんにちは、探偵', sub_day:'昼間は記号がいちばん見つけやすい',
    greet_evening:'お疲れ様、探偵', sub_evening:'今日も一日お疲れ様でした',
    greet_night:'夜もパトロール中', sub_night:'深夜もパトロールありがとう',
    pts_label:'捜査ポイント', perk_hint:'特典を見る ›', name_suffix:' さん',
    aria_cam:'カメラで撮影する', aria_profile:'マイページを開く', aria_notif:'新着通知を開く',
    stat_posts:'投稿数', stat_areas:'解放エリア', stat_streak:'連続記録',
    stat_posts_lbl:'投稿数', stat_areas_lbl:'エリア', stat_streak_lbl:'連続日',
    sec_missions:'今日のミッション', sec_weekly:'今週のチャレンジ', sec_feed:'みんなの捜査ログ',
    ff_all:'すべて', ff_ok:'濃厚', ff_warn:'要確認', ff_ng:'偶然',
    feed_empty:'該当する投稿はありません',
    rank_title:'ランキング', rank_sub:'渋谷区エリア',
    rt_solo:'個人', rt_team:'探偵団',
    seg_week:'今週', seg_month:'今月', seg_all:'総合',
    team_rank_title:'探偵団ランキング',
    book_title:'探偵手帳', book_sub:'マーキング図鑑',
    book_desc:'侵入犯罪で使われるとされるマーキング記号の一覧。発見したらカメラで投稿してください。',
    book_search_ph:'記号名・意味で検索…', book_empty:'該当する記号が見つかりません',
    bf_all:'すべて', bf_danger:'要注意', bf_warn:'要確認', bf_safe:'偶然', bf_unfound:'未発見',
    chip_danger:'要注意', chip_warn:'要確認', chip_safe:'偶然多め',
    book_freq:'出現頻度', book_ex:'例',
    tab_home:'ホーム', tab_map:'マップ', tab_rank:'ランク', tab_book:'手帳',
    ob1t:'GO-TO 探偵団へ<br>ようこそ', ob1d:'市民が「探偵」となり、街の不審なマーキングを発見・投稿。AIが判定し、防犯マップをリアルタイムに育てるアプリです。',
    ob2t:'見つけたら、その場で撮る', ob2d:'中央のカメラボタンをタップして撮影。AIが自動でマーキングを判定し、捜査ポイントを獲得できます。',
    ob3t:'投稿が地図を育てる', ob3d:'投稿が増えるほど防犯マップが充実。ヒートマップや統計で危険スポットを把握できます。',
    ob_next:'次へ', ob_start:'はじめる',
    ob_f1:'見つけて撮影', ob_f2:'AIが自動判定', ob_f3:'マップが育つ',
    next_rank:'次のランク', to_next:'まで あと', pt:'pt', max_rank:'最高ランク',
    perks_title:'ランク特典', now_lv:'現在', next_is:'次は', promote_in:'で昇格', reach_max:'最高ランクに到達しています', all_unlocked:'すべての特典が解放されています',
    st_done:'達成済み', st_cur:'現在', st_left:'あと',
    mypage:'マイページ', mp_avatar:'アバター', mp_name:'探偵名', mp_team:'所属探偵団',
    mp_summary:'今週のまとめ', mp_week_posts:'今週の投稿', mp_earned:'獲得ポイント', mp_week_rank:'週間ランキング', mp_streak:'連続記録',
    mp_badges:'実績バッジ', mp_reset:'データをリセット', mp_reset_confirm:'すべての記録（ポイント・投稿・実績）を初期化します。よろしいですか？',
    mp_lang:'言語 / Language', rank_suffix:'位', mp_accent:'アクセントカラー',
    mp_frames:'称号フレーム', frame_equipped:'装備中', frame_lv_need:'Lv.{0}で解放',
    notif_title:'新着通知',
    recent_posts:'最近の投稿', detected_danger:'濃厚 検出', detected_warn:'要確認',
    my_team_sub:'あなたの所属する探偵団', team_total:'団の総ポイント', team_members:'団員数', your_contrib:'あなたの貢献',
    teams_suffix:'団', members_unit:'名', your_team:'あなたの団',
    ov_danger:'危険', ov_warn:'要確認', ov_recent:'24h以内', ov_count:'件', ov_heat:'ヒートマップ', ov_stats:'エリア統計',
    lg_danger:'マーキング濃厚', lg_warn:'要確認', lg_safe:'偶然・誤検知',
    as_title:'渋谷区宇田川町 今週の危険度', as_alert:'警戒', as_caution:'やや注意', as_safe:'比較的安全',
    as_danger:'マーキング濃厚', as_warn:'要確認', as_safe2:'偶然・誤検知', as_total:'累計投稿', as_24h:'24時間以内',
    cam_hint:'怪しい記号にカメラを向けて撮影', cam_r1:'画像をアップロード中…', cam_r2:'AIがマーキングを解析中…', cam_r3:'位置情報とマップを照合中…',
    cam_conf:'AI信頼度', cam_added:'防犯マップに追加されます。', cam_got:'捜査ポイント', cam_bonus:' 初回ボーナス込み',
    cam_reflect:'マップに反映する', cam_again:'もう一度撮影', cam_share:'結果をシェア',
    toast_posted:'投稿しました +', toast_pt_got:'pt 獲得', toast_daily:'デイリー達成 ', toast_weekly:'ウィークリー達成 ', toast_ach:'実績を解除 ', toast_copy:'クリップボードにコピーしました', toast_heat_err:'ヒートマップを読み込めませんでした', toast_map_need:'マップの読み込み後に利用できます',
    chip_resolved:'対処済み', resolve_btn:'対処済みとして報告する', toast_resolved:'対処済み報告 +20pt',
    resolve_badge_title:'対処済み', resolve_badge_sub:'この記号は撤去・対処されました',
    patrol_start:'START', patrol_stop:'STOP', patrol_need_map:'マップを読み込めませんでした',
    patrol_done_title:'パトロール完了', patrol_time:'所要時間', patrol_close:'閉じる',
    reward_gauge_title:'今日の報酬ゲージ', reward_claim:'受け取る', reward_claimed:'ボーナスを獲得しました', reward_allclaimed:'本日の報酬はすべて受け取り済み',
    dm_title:'投稿詳細', dm_posted_by:'投稿:', dm_catalog:'探偵手帳で詳しく見る →',
    lvup_title:'レベルアップ', lvup_to:'に昇進しました',
    just_now:'たった今', posted_suffix:'を投稿', your_new_post:'あなたの新規投稿',
    map_fail:'地図の読み込みに失敗しました。<br>通信環境を確認して再読み込みしてください。',
    mp_install:'ホーム画面に追加',
    route_short:'通学路', route_title:'通学路の状況', route_set:'通学路を登録',
    route_empty:'自宅と学校・職場を登録すると、その道沿いだけを表示します',
    route_pick1:'地図で自宅の位置をタップ', route_pick2:'次に学校・職場の位置をタップ',
    route_cancel:'やめる', route_clean:'この道沿いに未対処はありません',
    route_danger:'濃厚', route_warn:'要確認', route_edit:'設定しなおす', route_clear:'登録を削除',
    fc_label:'今日の地域の警戒度', fc_safe:'落ち着いています', fc_caution:'やや注意', fc_alert:'警戒',
    fc_safe_msg:'目立った不審情報は少なめ。油断せずパトロールを。', fc_caution_msg:'要確認の投稿が増加中。周辺に注意を。', fc_alert_msg:'濃厚なマーキングが多発。戸締まりを厳重に。',
    quiz_btn:'今日の防犯クイズ', quiz_title:'防犯クイズ', quiz_q:'この記号の意味は？', quiz_done_today:'本日のクイズは回答済み',
    quiz_correct:'正解', quiz_wrong:'残念、不正解', quiz_reward:'クイズ正解', quiz_next:'閉じる', quiz_answered_msg:'また明日チャレンジしてください',
    card_btn:'戦績カードを作成', card_title:'戦績カード', card_save:'画像を保存', card_share:'シェア', card_close:'閉じる',
    card_role:'称号', card_posts:'投稿', card_rank:'週間順位', card_made:'GO-TO 探偵団で活動中',
    stats_btn:'アクティビティ統計', stats_title:'アクティビティ統計',
    stats_activity:'週間アクティビティ', stats_breakdown:'種類別の内訳', stats_calendar:'投稿カレンダー',
    stats_total_posts:'累計投稿', stats_active_days:'活動日数', stats_no_data:'データがありません',
    cal_today:'今日', wd_sun:'日', wd_mon:'月', wd_tue:'火', wd_wed:'水', wd_thu:'木', wd_fri:'金', wd_sat:'土',
    react_up:'役立った', react_warn:'注意', react_check:'確認した',
    safety_btn:'防犯Tips・緊急', safety_title:'防犯Tips・緊急',
    tips_sec:'今日の防犯Tip', checklist_sec:'外出前チェック', emergency_sec:'緊急連絡先',
    emergency_note:'タップで発信できます（実機）',
    sec_alerts:'地域アラート',
    alert_cat_police:'警察署', alert_cat_city:'区役所', alert_cat_watch:'自警団',
    alerts_viewall:'すべてのアラートを見る →',
    alerts_title:'地域アラート',
    info_title:'最新情報', info_sub:'地域のアラート・活動',
    info_breaking:'速報', info_community:'コミュニティ活動',
    info_cat_all:'すべて', info_cat_police:'警察', info_cat_city:'区役所', info_cat_watch:'自警団', info_cat_activity:'活動',
    info_unread:'未読', info_today_danger:'今日の危険', info_activities:'コミュ活動',
    info_no_alerts:'この分類のアラートはありません',
    ci_streak_day:'日連続',
    ci_bonus:'チェックインボーナス',
    ci_milestone_7:'7日連続達成 ・ ボーナス +30pt',
    ci_milestone_14:'2週間連続 ・ ボーナス +50pt',
    ci_milestone_30:'1ヶ月連続 ・ ボーナス +100pt',
    td_posts:'今日の投稿', td_patrol:'パトロール', td_missions:'完了ミッション',
  },
  en: {
    pitch_lead:'Citizens become "detectives," spotting and reporting street markings. AI judges them and the crime-prevention map grows in real time.',
    pitch_f1t:'Snap & Post', pitch_f1d:'Photograph suspicious marks on your commute and post with GPS',
    pitch_f2t:'AI Auto-Judges', pitch_f2d:'AI tells markings from coincidence and reflects them on the map',
    pitch_f3t:'Points & Ranking', pitch_f3d:'Earn investigation points, perks and area ranks for contributing',
    pitch_note:'* This is a proof-of-concept prototype. The map, posts, AI judgments and points all run on dummy data. Try operating the tabs →',
    home_greet:'Hello, Detective', home_sub:'Daylight is when markings show up best',
    greet_morning:'Good morning, Detective', sub_morning:'Check around your entrance before you head out',
    greet_day:'Hello, Detective', sub_day:'Daylight is when markings show up best',
    greet_evening:'Good evening, Detective', sub_evening:'Good work today',
    greet_night:'Night patrol active', sub_night:'Thanks for patrolling tonight',
    pts_label:'investigation pts', perk_hint:'See perks ›', name_suffix:'',
    aria_cam:'Open camera', aria_profile:'Open my page', aria_notif:'Open notifications',
    stat_posts:'Posts', stat_areas:'Areas', stat_streak:'Streak',
    stat_posts_lbl:'posts', stat_areas_lbl:'areas', stat_streak_lbl:'days',
    sec_missions:'Today\'s Missions', sec_weekly:'Weekly Challenges', sec_feed:'Community Log',
    ff_all:'All', ff_ok:'Likely', ff_warn:'Check', ff_ng:'Coincidence',
    feed_empty:'No matching posts',
    rank_title:'Ranking', rank_sub:'Shibuya area',
    rt_solo:'Solo', rt_team:'Squad',
    seg_week:'Week', seg_month:'Month', seg_all:'All-time',
    team_rank_title:'Squad Ranking',
    book_title:'Detective Handbook', book_sub:'Marking Encyclopedia',
    book_desc:'A list of marking symbols said to be used in break-in crimes. If you spot one, post it from the camera.',
    book_search_ph:'Search by name or meaning…', book_empty:'No matching symbols found',
    bf_all:'All', bf_danger:'Caution', bf_warn:'Check', bf_safe:'Coincidence', bf_unfound:'Not found',
    chip_danger:'Caution', chip_warn:'Check', chip_safe:'Often false',
    book_freq:'Frequency', book_ex:'e.g.',
    tab_home:'Home', tab_map:'Map', tab_rank:'Rank', tab_book:'Book',
    ob1t:'Welcome to<br>GO-TO Detectives', ob1d:'Citizens become "detectives" who find and post suspicious street markings. AI judges them and grows the crime-prevention map in real time.',
    ob2t:'Shoot it where you find it', ob2d:'Tap the center camera button to shoot. AI auto-judges the marking and you earn investigation points.',
    ob3t:'Your posts grow the map', ob3d:'The more posts, the richer the map. Grasp danger spots via the heatmap and stats.',
    ob_next:'Next', ob_start:'Start',
    ob_f1:'Spot & shoot', ob_f2:'AI verdict', ob_f3:'Map grows',
    next_rank:'Next rank', to_next:'— left:', pt:'pt', max_rank:'Max rank',
    perks_title:'Rank Perks', now_lv:'Now', next_is:'Next:', promote_in:'to promote', reach_max:'Max rank', all_unlocked:'All perks are unlocked',
    st_done:'Achieved', st_cur:'Current', st_left:'left:',
    mypage:'My Page', mp_avatar:'Avatar', mp_name:'Detective name', mp_team:'Your squad',
    mp_summary:'This week', mp_week_posts:'Posts this week', mp_earned:'Points earned', mp_week_rank:'Weekly rank', mp_streak:'Streak',
    mp_badges:'Achievements', mp_reset:'Reset data', mp_reset_confirm:'This will reset all records (points, posts, achievements). Are you sure?',
    mp_lang:'言語 / Language', rank_suffix:'', mp_accent:'Accent color',
    mp_frames:'Title Frames', frame_equipped:'Equipped', frame_lv_need:'Unlocks at Lv.{0}',
    notif_title:'New notifications',
    recent_posts:'Recent posts', detected_danger:'Likely found', detected_warn:'To check',
    my_team_sub:'The squad you belong to', team_total:'Squad total pts', team_members:'Members', your_contrib:'Your contribution',
    teams_suffix:' squads', members_unit:'', your_team:'Your squad',
    ov_danger:'Danger', ov_warn:'Check', ov_recent:'<24h', ov_count:'', ov_heat:'Heatmap', ov_stats:'Area stats',
    lg_danger:'Marking likely', lg_warn:'Needs check', lg_safe:'Coincidence',
    as_title:'Udagawa-cho, Shibuya — danger this week', as_alert:'Alert', as_caution:'Caution', as_safe:'Relatively safe',
    as_danger:'Marking likely', as_warn:'Needs check', as_safe2:'Coincidence', as_total:'Total posts', as_24h:'Within 24h',
    cam_hint:'Point the camera at a suspicious symbol', cam_r1:'Uploading image…', cam_r2:'AI analyzing marking…', cam_r3:'Matching location with map…',
    cam_conf:'AI confidence', cam_added:'It will be added to the map.', cam_got:'investigation points', cam_bonus:' incl. first-time bonus',
    cam_reflect:'Add to map', cam_again:'Shoot again', cam_share:'Share result',
    toast_posted:'Posted! +', toast_pt_got:' pts', toast_daily:'Daily done ', toast_weekly:'Weekly done ', toast_ach:'Unlocked ', toast_copy:'Copied to clipboard', toast_heat_err:'Could not load the heatmap', toast_map_need:'Available after the map loads',
    chip_resolved:'Resolved', resolve_btn:'Report as resolved', toast_resolved:'Resolved +20pt',
    resolve_badge_title:'Resolved', resolve_badge_sub:'This marking has been removed or addressed',
    patrol_start:'START', patrol_stop:'STOP', patrol_need_map:'Could not load the map',
    patrol_done_title:'Patrol complete', patrol_time:'Time', patrol_close:'Close',
    reward_gauge_title:"Today's reward gauge", reward_claim:'Claim', reward_claimed:'Bonus earned', reward_allclaimed:"All of today's rewards claimed",
    dm_title:'Post detail', dm_posted_by:'By:', dm_catalog:'See details in the handbook →',
    lvup_title:'Level up', lvup_to:'',
    just_now:'just now', posted_suffix:'', your_new_post:'Your new post',
    map_fail:'Failed to load the map.<br>Check your connection and reload.',
    mp_install:'Add to home screen',
    route_short:'My route', route_title:'On your route', route_set:'Set your route',
    route_empty:'Register home and school to see only what sits along that walk',
    route_pick1:'Tap your home on the map', route_pick2:'Now tap the school or workplace',
    route_cancel:'Cancel', route_clean:'Nothing unresolved along this route',
    route_danger:'likely', route_warn:'to check', route_edit:'Set again', route_clear:'Remove',
    fc_label:"Today's area alert level", fc_safe:'Calm', fc_caution:'Some caution', fc_alert:'Alert',
    fc_safe_msg:'Few notable reports. Stay vigilant on patrol.', fc_caution_msg:'"Needs-check" posts are rising. Watch your surroundings.', fc_alert_msg:'Many strong markings reported. Lock up carefully.',
    quiz_btn:"Today's crime-prevention quiz", quiz_title:'Crime-Prevention Quiz', quiz_q:'What does this symbol mean?', quiz_done_today:"Today's quiz is answered",
    quiz_correct:'Correct', quiz_wrong:'Sorry, wrong', quiz_reward:'Quiz correct', quiz_next:'Close', quiz_answered_msg:'Come back tomorrow',
    card_btn:'Create stats card', card_title:'Stats Card', card_save:'Save image', card_share:'Share', card_close:'Close',
    card_role:'Title', card_posts:'Posts', card_rank:'Weekly rank', card_made:'Active in GO-TO Detectives',
    stats_btn:'Activity stats', stats_title:'Activity Stats',
    stats_activity:'Weekly activity', stats_breakdown:'By category', stats_calendar:'Post calendar',
    stats_total_posts:'Total posts', stats_active_days:'Active days', stats_no_data:'No data yet',
    cal_today:'Today', wd_sun:'S', wd_mon:'M', wd_tue:'T', wd_wed:'W', wd_thu:'T', wd_fri:'F', wd_sat:'S',
    react_up:'Helpful', react_warn:'Caution', react_check:'Confirmed',
    safety_btn:'Tips & Emergency', safety_title:'Tips & Emergency',
    tips_sec:"Today's tip", checklist_sec:'Before you go out', emergency_sec:'Emergency contacts',
    emergency_note:'Tap to call (on device)',
    sec_alerts:'Area Alerts',
    alert_cat_police:'Police', alert_cat_city:'City Hall', alert_cat_watch:'Neighborhood Watch',
    alerts_viewall:'View all alerts →',
    alerts_title:'Area Alerts',
    info_title:'Latest Info', info_sub:'Area alerts & community',
    info_breaking:'Breaking', info_community:'Community Activity',
    info_cat_all:'All', info_cat_police:'Police', info_cat_city:'City Hall', info_cat_watch:'Watch', info_cat_activity:'Activity',
    info_unread:'Unread', info_today_danger:"Today's dangers", info_activities:'Activities',
    info_no_alerts:'No alerts in this category',
    ci_streak_day:' day streak',
    ci_bonus:'Check-in bonus',
    ci_milestone_7:'7-day streak · Bonus +30pt',
    ci_milestone_14:'2-week streak · Bonus +50pt',
    ci_milestone_30:'1-month streak · Bonus +100pt',
    td_posts:"Today's posts", td_patrol:'Patrol', td_missions:'Missions done',
  }
};
function t(k){ return (I18N[LANG] && I18N[LANG][k]!=null) ? I18N[LANG][k] : (I18N.ja[k]!=null ? I18N.ja[k] : k); }
function tx(o, f){ return (LANG==='en' && o[f+'_en']!=null) ? o[f+'_en'] : o[f]; }

// よく使う固有表現の対訳（中央辞書）
const LABELS = {
  'インターホン側面の傷':'Scratch on intercom side', '郵便受け裏の記号':'Mark behind the mailbox',
  '表札周りのシール':'Sticker near the nameplate', 'メーターボックスの矢印':'Arrow on the meter box',
  '玄関枠の小さな点':'Small dot on the door frame', '誤検知（落書き）':'False positive (graffiti)',
  '玄関柱のアルファベット':'Letter on the entrance pillar', 'ベランダ柵の三点マーク':'Three dots on the balcony rail',
  'ベランダ柵のテープ':'Tape on the balcony rail', 'ガスメーターの数字':'Number on the gas meter',
  '分電盤近くの線刻':'Scoring near the breaker', '塀の上の引っかき傷':'Scratch atop the wall',
  '郵便受けの点':'Dot on the mailbox', 'ドア枠の傷':'Scratch on the door frame',
  '玄関枠の点':'Dot on the door frame', 'ポストの角':'Corner of the postbox', '壁面の記号':'Symbol on the wall',
  '経年劣化の汚れ':'Age-related stains', 'チョークの落書き':'Chalk graffiti', '落書き・自然な汚れ':'Graffiti / natural stains',
  'メーターの矢印':'Meter arrow', 'ガスメーターの数字':'Number on the gas meter', '玄関枠の小さな点':'Small dot on the door frame',
};
// 実際の名簿は表記の形がばらける（ひらがな・カタカナ・漢字・英数字・通り名）。
// 全員がカタカナ2〜3文字だと、それだけで自動生成された一覧に見える。
const NAMES = { 'はるき':'Haruki','ミク':'Miku','山下':'Yamashita','あや':'Aya','夜回り':'Yomawari','ユウキ':'Yuki' };
function txLabel(s){ return LANG==='en' ? (LABELS[s]||s) : s; }
function txName(s){ if(LANG!=='en') return s; for(const k in NAMES) s = s.split(k).join(NAMES[k]); return s.replace('（あなた）',' (You)'); }
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function txVerdict(v){ if(LANG!=='en') return v; return v==='マーキング濃厚'?'Marking likely':v==='要確認'?'Needs check':v==='偶然と判定'?'Coincidence':v; }
function txAgo(a){ if(LANG!=='en') return a; if(a==='たった今') return 'just now'; if(a==='昨日') return 'yesterday';
  let m=a.match(/^(\d+)分前$/); if(m) return m[1]+' min ago'; m=a.match(/^(\d+)時間前$/); if(m) return m[1]+' hr ago'; return a; }
function txChip(c0){ return c0==='ok'?t('ff_ok'):c0==='warn'?t('ff_warn'):c0==='ng'?t('ff_ng'):t('chip_resolved'); }
function txArea(s){ if(LANG!=='en') return s; return s.replace('渋谷','Shibuya').replace('・',' · ').replace(/(\d+)件/,'$1 posts'); }
function txFreq(f){ if(LANG!=='en') return f; return f==='高頻度'?'High':f==='中頻度'?'Medium':f==='低頻度'?'Low':f; }
// 頻度のドットゲージ（テキストラベルと併記して使う）
function freqDotsHtml(f){
  const n = f==='高頻度'?3 : f==='中頻度'?2 : f==='低頻度'?1 : 0;
  if(!n) return '';
  return `<span class="freq-dots" aria-hidden="true">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(3-n)}</span>`;
}

// ───────────────────────────── DUMMY DATA ─────────────────────────────
const STATE = { points: 2687, posts: 38, unread: 0, streak: 5,
  myPosts: 0, dangerFound: 0, shares: 0, earned: 0, resolved: 0, patrols: 0, patrolKm: 0, lastCheckin: '', history: {}, checklist: { date:'', done:{} }, camCombo: 0,
  // 手帳コレクション: 自分が投稿した記号（mark文字 → true）。
  // 初期プロフィール（38投稿のベテラン）と辻褄が合うよう、主要4種は発見済みで開始
  found: { '⚡': true, '→': true, '●': true, '○': true } };

const PROFILE = { name: 'ユウキ', avatar: '🕵️', team: 'shibuya', accent: 'amber', frame: 'amber' };

// 称号フレーム（レベルで解放・ヒーローカードに装備）
const TITLE_FRAMES = [
  { id:'none',    name:'フレームなし',   name_en:'No Frame',          icon:'square', unlockLv:1, color:'transparent' },
  { id:'copper',  name:'古銅の探偵',     name_en:'Copper Detective',  icon:'award', unlockLv:1, color:'#CD7F32' },
  { id:'silver',  name:'銀の鑑識',       name_en:'Silver Analyst',    icon:'award', unlockLv:3, color:'#B0BCC8' },
  { id:'amber',   name:'琥珀の目',       name_en:'Amber Eye',         icon:'search', unlockLv:5, color:'#C8960A' },
  { id:'gold',    name:'黄金の鑑識官',   name_en:'Gold Inspector',    icon:'award', unlockLv:6, color:'#D4A820' },
  { id:'crimson', name:'深紅の守護者',   name_en:'Crimson Guardian',  icon:'shield', unlockLv:7, color:'#DC143C' },
  { id:'violet',  name:'紫煙の謎解き',   name_en:'Violet Sleuth',     icon:'gem', unlockLv:8, color:'#8B5CF6' },
  { id:'legend',  name:'伝説のエース',   name_en:'Legendary Ace',     icon:'crown', unlockLv:9, color:'#FFD700' },
];
const ACCENTS = [
  { id:'amber',  color:'#C8960A' }, { id:'red',  color:'#E63946' },
  { id:'blue',   color:'#3E8FD0' }, { id:'green', color:'#2FA56E' },
  { id:'purple', color:'#8B5CF6' }, { id:'pink',  color:'#EC4899' },
];
function applyAccent(){
  if(PROFILE.accent && PROFILE.accent!=='red') document.documentElement.dataset.accent = PROFILE.accent;
  else { delete document.documentElement.dataset.accent; }
}
function isFrameUnlocked(f){ return f.id==='none' || getLevelInfo(STATE.points).cur.lv >= f.unlockLv; }
function applyFrame(){
  const hero = document.getElementById('home-hero');
  if(!hero) return;
  const fid = PROFILE.frame || 'none';
  hero.className = 'hero' + (fid !== 'none' ? ' frame-'+fid : '');
}
const AVATARS = ['🕵️','🦊','🐱','🐼','🐰','🐻','🦉','🐯','🐶','🐹','🦝','🐲'];

// 探偵団（チーム）。pt は基礎値で、自分の所属チームには自分の貢献(STATE.earned)を加算して表示
const TEAMS = [
  { id:'shinjuku', name:'新宿パトロール隊',   name_en:'Shinjuku Patrol',     emoji:'🦉', members:156, pt:52184 },
  { id:'shibuya',  name:'渋谷探偵団',         name_en:'Shibuya Detectives',  emoji:'🦊', members:128, pt:46037 },
  { id:'setagaya', name:'世田谷見守り隊',     name_en:'Setagaya Watch',      emoji:'🐻', members:142, pt:45412 },
  { id:'minato',   name:'港区ガーディアン',   name_en:'Minato Guardians',    emoji:'🐯', members:87,  pt:41776 },
  { id:'meguro',   name:'目黒セーフティ',     name_en:'Meguro Safety',       emoji:'🐱', members:98,  pt:38509 },
];
function teamDisplayPt(t){ return t.pt + (t.id===PROFILE.team ? STATE.earned : 0); }
function myTeam(){ return TEAMS.find(t=>t.id===PROFILE.team) || TEAMS[1]; }
function teamsSorted(){ return TEAMS.slice().sort((a,b)=>teamDisplayPt(b)-teamDisplayPt(a)); }

// 実績バッジ
const ACHIEVEMENTS = [
  { id:'first',  icon:'star', title:'初投稿',          desc:'はじめて投稿した',         title_en:'First Post',      desc_en:'Made your first post',     cond:()=>STATE.myPosts>=1 },
  { id:'patrol', icon:'camera', title:'パトロール開始',   desc:'5件投稿した',             title_en:'On Patrol',       desc_en:'Posted 5 times',           cond:()=>STATE.myPosts>=5 },
  { id:'vet',    icon:'award', title:'ベテラン探偵',     desc:'15件投稿した',            title_en:'Veteran',         desc_en:'Posted 15 times',          cond:()=>STATE.myPosts>=15 },
  { id:'hunter', icon:'zap', title:'危険ハンター',     desc:'危険を5件発見した',       title_en:'Danger Hunter',   desc_en:'Found 5 dangers',          cond:()=>STATE.dangerFound>=5 },
  { id:'streak', icon:'flame', title:'継続は力なり',     desc:'連続記録10を達成',        title_en:'Persistence',     desc_en:'Reached a 10-day streak',  cond:()=>STATE.streak>=10 },
  { id:'share',  icon:'share', title:'街に拡散',         desc:'結果をシェアした',         title_en:'Spread the Word', desc_en:'Shared a result',          cond:()=>STATE.shares>=1 },
  { id:'ace',    icon:'crown', title:'エース昇格',       desc:'Lv.8 に到達した',         title_en:'Ace Promotion',   desc_en:'Reached Lv.8',             cond:()=>STATE.points>=3000 },
  { id:'master', icon:'gem', title:'ポイントマスター', desc:'5,000pt に到達した',      title_en:'Point Master',    desc_en:'Reached 5,000 pts',        cond:()=>STATE.points>=5000 },
  { id:'collect3',   icon:'book', title:'図鑑コレクター',   desc:'3種の記号を発見した',   title_en:'Collector',          desc_en:'Found 3 mark types',    cond:()=>MARK_CATALOG.filter(m=>(STATE.found||{})[m.mark]).length>=3 },
  { id:'collectall', icon:'trophy', title:'図鑑コンプリート', desc:'全種の記号を発見した', title_en:'Complete Handbook',  desc_en:'Found every mark type', cond:()=>MARK_CATALOG.filter(m=>(STATE.found||{})[m.mark]).length>=MARK_CATALOG.length },
];
let ACH_UNLOCKED = [];

// デイリーミッション
const DAILY_POOL = [
  { id:'post2',   icon:'search', title:'2件調査する',     desc:'今日2件投稿する',       title_en:'Investigate 2',    desc_en:'Post 2 times today',      reward:50, goal:2, metric:'posts'  },
  { id:'post3',   icon:'target', title:'3件パトロール',   desc:'今日3件投稿する',       title_en:'Patrol 3',         desc_en:'Post 3 times today',      reward:90, goal:3, metric:'posts'  },
  { id:'post5',   icon:'camera', title:'集中パトロール',   desc:'今日5件投稿する',       title_en:'Focused Patrol',   desc_en:'Post 5 times today',      reward:150, goal:5, metric:'posts' },
  { id:'danger1', icon:'zap', title:'危険を1件発見',   desc:'濃厚判定を1件出す',     title_en:'Find 1 danger',    desc_en:'Get one "likely" result', reward:80, goal:1, metric:'danger' },
  { id:'danger2', icon:'siren', title:'危険を2件発見',   desc:'濃厚判定を2件出す',     title_en:'Find 2 dangers',   desc_en:'Get two "likely" results',reward:130, goal:2, metric:'danger'},
  { id:'map',     icon:'map', title:'防犯マップを確認', desc:'マップタブを開く',       title_en:'Check the map',    desc_en:'Open the map tab',        reward:30, goal:1, metric:'map'    },
  { id:'share',   icon:'share', title:'結果をシェア',     desc:'判定結果を1回シェア',   title_en:'Share a result',   desc_en:'Share a result once',     reward:40, goal:1, metric:'share'  },
  { id:'safe1',   icon:'checkCircle', title:'安全を確認',       desc:'偶然判定を1件記録',     title_en:'Confirm safety',   desc_en:'Log one coincidence',     reward:30, goal:1, metric:'safe'   },
  { id:'quiz1',   icon:'bulb', title:'クイズに挑戦',     desc:'防犯クイズに正解する',   title_en:'Take the quiz',    desc_en:'Answer the quiz correctly',reward:40, goal:1, metric:'quiz'  },
  { id:'check1',  icon:'check', title:'外出前チェック',   desc:'チェックリストを完了',   title_en:'Pre-departure check',desc_en:'Finish the checklist',   reward:50, goal:5, metric:'check' },
  { id:'resolve1',icon:'checkCircle', title:'対処済みを報告',   desc:'投稿を1件対処済みにする', title_en:'Report resolved',    desc_en:'Mark one post resolved', reward:60, goal:1, metric:'resolve' },
  { id:'patrol1', icon:'route', title:'パトロールに出る', desc:'パトロールを1回完了する', title_en:'Go on patrol',       desc_en:'Finish one patrol',     reward:70, goal:1, metric:'patrol' },
];
// 週替わりのチャレンジ（目標が大きく、報酬も高い）
const WEEKLY_POOL = [
  { id:'wpost10', icon:'camera', title:'週間パトロール隊', desc:'今週10件投稿する',      title_en:'Weekly Patroller', desc_en:'Post 10 times this week',  reward:300, goal:10, metric:'posts' },
  { id:'wpost20', icon:'award', title:'週間エース',       desc:'今週20件投稿する',      title_en:'Weekly Ace',       desc_en:'Post 20 times this week',  reward:650, goal:20, metric:'posts' },
  { id:'wdanger5',icon:'zap', title:'危険ハンター',     desc:'今週濃厚判定を5件',     title_en:'Danger Hunter',    desc_en:'Get 5 "likely" results',   reward:400, goal:5,  metric:'danger'},
  { id:'wshare3', icon:'megaphone', title:'情報拡散',         desc:'今週3回シェアする',     title_en:'Spread the Word',  desc_en:'Share 3 times this week',  reward:220, goal:3,  metric:'share' },
  { id:'wquiz5',  icon:'bulb', title:'防犯マスター',     desc:'今週クイズに5回正解',   title_en:'Safety Master',    desc_en:'Get 5 quizzes right',      reward:280, goal:5,  metric:'quiz'  },
  { id:'wmap5',   icon:'map', title:'マップ巡回',       desc:'今週マップを5回確認',   title_en:'Map Rounds',       desc_en:'Open the map 5 times',     reward:180, goal:5,  metric:'map'   },
  { id:'wsafe3',   icon:'checkCircle', title:'安全確認の達人',   desc:'今週偶然判定を3件記録', title_en:'Safety Verifier',   desc_en:'Log 3 coincidences',         reward:200, goal:3,  metric:'safe'    },
  { id:'wresolve3',icon:'checkCircle', title:'対処済み処理班',   desc:'今週3件対処済みにする', title_en:'Resolution Crew',   desc_en:'Mark 3 posts resolved',      reward:250, goal:3,  metric:'resolve' },
  { id:'wpatrol3', icon:'route', title:'週間パトロール部', desc:'今週3回パトロール完了', title_en:'Patrol Squad',      desc_en:'Finish 3 patrols this week', reward:300, goal:3,  metric:'patrol'  },
];
const DAILY = { date:'', picks:[], progress:{}, done:{}, earned:0, claimed:[] };
const WEEKLY = { week:'', picks:[], progress:{}, done:{} };
// 段階報酬ティア（その日に稼いだポイントの累計で解放）
const REWARD_TIERS = [
  { at:100, bonus:30 },
  { at:250, bonus:70 },
  { at:500, bonus:150 },
];
const QUIZ = { date:'', answered:false, correct:false, markIdx:0 };
let ONBOARDED = false;

const MARKINGS = [
  { lat: 35.6595, lng: 139.7005, type: 'danger', label: 'インターホン側面の傷', mark: '⚡', user: 'はるき', ago: '7分前', verdict: 'マーキング濃厚' },
  { lat: 35.6580, lng: 139.7020, type: 'danger', label: '郵便受け裏の記号', mark: '✕', user: 'ミク', ago: '23分前', verdict: 'マーキング濃厚' },
  { lat: 35.6610, lng: 139.6985, type: 'warn', label: '表札周りのシール', mark: '●', user: 'ken_1984', ago: '1時間前', verdict: '要確認' },
  { lat: 35.6570, lng: 139.7040, type: 'danger', label: 'メーターボックスの矢印', mark: '→', user: 'あや', ago: '2時間前', verdict: 'マーキング濃厚' },
  { lat: 35.6625, lng: 139.7015, type: 'warn', label: '玄関枠の小さな点', mark: '∴', user: 'ユウキ', ago: '4時間前', verdict: '要確認' },
  { lat: 35.6555, lng: 139.6995, type: 'safe', label: '誤検知（落書き）', mark: '○', user: '夜回り', ago: '昨日', verdict: '偶然と判定' },
  { lat: 35.6600, lng: 139.7055, type: 'danger', label: 'ベランダ柵のテープ', mark: 'M', user: '山下', ago: '昨日', verdict: 'マーキング濃厚' },
  { lat: 35.6635, lng: 139.6970, type: 'warn', label: 'ガスメーターの数字', mark: '7', user: 'hana', ago: '昨日', verdict: '要確認' },
];

const FEED = [
  { mark:'⚡', bg:'rgba(230,57,70,.2)', who:'はるき', act:'インターホン側面を投稿', act_en:'posted a scratch on intercom side', ago:'7分前', chip:['ok','濃厚'],
    label:'インターホン側面の傷', verdict:'マーキング濃厚', conf:92,
    aiComment:'表面の細い線刻は空き巣グループが住居の特徴を記録する「ターゲットマーク」と判定。電源系への干渉を示唆する可能性があります。',
    aiComment_en:'The thin scoring is judged a "target mark" used by burglary groups to record a home\'s features. It may suggest tampering with the power system.' },
  { mark:'→', bg:'rgba(230,57,70,.2)', who:'あや', act:'メーターの矢印を投稿', act_en:'posted an arrow on the meter', ago:'2時間前', chip:['ok','濃厚'],
    label:'メーターボックスの矢印', verdict:'マーキング濃厚', conf:89,
    aiComment:'侵入経路または逃走ルートを示す矢印と判定。近隣に類似記号がないか広域調査を推奨します。',
    aiComment_en:'Judged an arrow indicating an entry or escape route. A wider survey for similar nearby symbols is recommended.' },
  { mark:'●', bg:'rgba(244,162,97,.2)', who:'ken_1984', act:'表札のシールを投稿', act_en:'posted a sticker by the nameplate', ago:'1時間前', chip:['warn','要確認'],
    label:'表札周りのシール', verdict:'要確認', conf:64,
    aiComment:'ターゲットを示すドット状記号の可能性があります。単体では確定できないため経過観察を推奨。',
    aiComment_en:'Possibly a dot-style symbol marking a target. It cannot be confirmed alone, so monitoring is advised.' },
  { mark:'○', bg:'rgba(100,116,139,.2)', who:'夜回り', act:'落書きを投稿', act_en:'posted graffiti', ago:'昨日', chip:['ng','偶然'],
    label:'誤検知（落書き）', verdict:'偶然と判定', conf:83,
    aiComment:'経年劣化によるシミまたはチョークの落書きと判定。マーキングの特徴的なパターンは検出されませんでした。',
    aiComment_en:'Judged as age-related stains or chalk graffiti. No characteristic marking pattern was detected.' },
];

const MARK_CATALOG = [
  { mark:'⚡', name:'電気系マーク', color:'danger', frequency:'高頻度',
    name_en:'Electrical mark',
    meaning:'配電盤・インターホンの位置を示すとされる記号。電源を切って警報を無効化する意図がある場合も。',
    meaning_en:'A symbol said to mark the breaker or intercom. It may aim to cut power and disable alarms.',
    examples:['インターホン側面の傷','分電盤近くの線刻'] },
  { mark:'→', name:'方向指示マーク', color:'danger', frequency:'高頻度',
    name_en:'Direction mark',
    meaning:'侵入経路・逃走ルートを示す矢印。複数の記号が連なる場合は特に要注意。',
    meaning_en:'An arrow showing an entry or escape route. Several in a row are especially concerning.',
    examples:['メーターボックスの矢印','塀の上の引っかき傷'] },
  { mark:'●', name:'ターゲットドット', color:'warn', frequency:'中頻度',
    name_en:'Target dot',
    meaning:'対象住居をマークする記号。単体では確定できないが複数あれば要警戒。',
    meaning_en:'A symbol marking a target home. Not conclusive alone, but multiple warrant caution.',
    examples:['表札周りのシール','郵便受けの点'] },
  { mark:'✕', name:'除外マーク', color:'warn', frequency:'中頻度',
    name_en:'Exclusion mark',
    meaning:'「犯行済みまたは対象外」を示す可能性。グループ内の情報共有に使用されるとされる。',
    meaning_en:'May indicate "already done or not a target," said to be used for sharing info within a group.',
    examples:['郵便受け裏の記号','ドア枠の傷'] },
  { mark:'∴', name:'三点マーク', color:'warn', frequency:'低頻度',
    name_en:'Three-dot mark',
    meaning:'在否・生活習慣などを記録した可能性のある複合記号。海外での報告事例あり。',
    meaning_en:'A compound symbol possibly recording presence or routines. Reported overseas.',
    examples:['玄関枠の点','ポストの角'] },
  { mark:'M', name:'アルファベット記号', color:'danger', frequency:'中頻度',
    name_en:'Alphabet symbol',
    meaning:'チームや物件のコード番号を示すとされる。海外でも同様の事例が報告されている。',
    meaning_en:'Said to indicate a team or property code. Similar cases reported overseas.',
    examples:['ベランダ柵のテープ','壁面の記号'] },
  { mark:'○', name:'偶然・誤検知', color:'safe', frequency:'—',
    name_en:'Coincidence / false positive',
    meaning:'マーキングに見えるが実際は落書きや自然な汚れ。AIが偶然と判定したケース。',
    meaning_en:'Looks like a marking but is actually graffiti or natural staining. Cases AI judged coincidental.',
    examples:['経年劣化の汚れ','チョークの落書き'] },
];

const RANKS = {
  week: [
    { av:'🦊', bg:'rgba(244,162,97,.25)', name:'はるき', area:'渋谷・34件', pt:1847 },
    { av:'🐱', bg:'rgba(69,123,157,.25)', name:'ミク', area:'渋谷・29件', pt:1663 },
    { av:'🐼', bg:'rgba(45,106,79,.25)', name:'山下', area:'渋谷・25件', pt:1392 },
    { av:'🕵️', bg:'rgba(230,57,70,.25)', name:'ユウキ（あなた）', area:'渋谷・21件', pt:1213, me:true },
    { av:'🐰', bg:'rgba(69,123,157,.25)', name:'あや', area:'渋谷・18件', pt:986 },
    { av:'🐻', bg:'rgba(244,162,97,.25)', name:'ken_1984', area:'渋谷・15件', pt:874 },
  ],
  month: [
    { av:'🐱', bg:'rgba(69,123,157,.25)', name:'ミク', area:'渋谷・98件', pt:5463 },
    { av:'🦊', bg:'rgba(244,162,97,.25)', name:'はるき', area:'渋谷・91件', pt:5128 },
    { av:'🕵️', bg:'rgba(230,57,70,.25)', name:'ユウキ（あなた）', area:'渋谷・76件', pt:4291, me:true },
    { av:'🐼', bg:'rgba(45,106,79,.25)', name:'山下', area:'渋谷・70件', pt:3947 },
    { av:'🐻', bg:'rgba(244,162,97,.25)', name:'ken_1984', area:'渋谷・55件', pt:3024 },
  ],
  all: [
    { av:'🦊', bg:'rgba(244,162,97,.25)', name:'はるき', area:'渋谷・412件', pt:24863 },
    { av:'🐱', bg:'rgba(69,123,157,.25)', name:'ミク', area:'渋谷・389件', pt:23178 },
    { av:'🐼', bg:'rgba(45,106,79,.25)', name:'山下', area:'渋谷・340件', pt:19942 },
    { av:'🐻', bg:'rgba(244,162,97,.25)', name:'ken_1984', area:'渋谷・301件', pt:17615 },
    { av:'🕵️', bg:'rgba(230,57,70,.25)', name:'ユウキ（あなた）', area:'渋谷・38件', pt:2687, me:true },
  ],
};

const TYPE_COLOR = { danger:'#E63946', warn:'#F4A261', safe:'#64748B' };

// 防犯Tips・チェックリスト・緊急連絡先
const TIPS = [
  { text:'郵便受けや表札周りに見慣れない記号がないか、月1回チェックしましょう。', text_en:'Check around your mailbox and nameplate for unfamiliar marks once a month.' },
  { text:'在宅時でも玄関は施錠を。短時間の外出でも必ず鍵をかけましょう。', text_en:'Lock the door even when home. Always lock up, even for a short errand.' },
  { text:'インターホンや door の傷・シールは記録（撮影）して共有を。', text_en:'Photograph and share any scratches or stickers on intercoms and doors.' },
  { text:'夜間はセンサーライトの活用が侵入抑止に効果的です。', text_en:'Motion-sensor lights at night are effective at deterring intruders.' },
  { text:'郵便物や新聞をためないことが「留守」を悟らせない基本です。', text_en:"Don't let mail or papers pile up — it signals an empty home." },
  { text:'窓には補助錠を。ガラス破りに時間をかけさせるのが有効です。', text_en:'Add auxiliary window locks to make glass-breaking take longer.' },
  { text:'不審な記号を見つけたら、消す前に必ず撮影・投稿しましょう。', text_en:'If you find a suspicious mark, photograph and post it before erasing.' },
];
const CHECKLIST = [
  { text:'玄関・勝手口を施錠した', text_en:'Locked the front and back doors' },
  { text:'すべての窓を施錠した', text_en:'Locked all windows' },
  { text:'郵便受けを確認した', text_en:'Checked the mailbox' },
  { text:'インターホン周りに記号がない', text_en:'No marks around the intercom' },
  { text:'センサーライトが作動する', text_en:'Sensor lights are working' },
];
const EMERGENCY = [
  { label:'警察（事件・事故）', label_en:'Police (crime / accident)', num:'110' },
  { label:'警察相談専用ダイヤル', label_en:'Police consultation line', num:'#9110' },
  { label:'消防・救急', label_en:'Fire / ambulance', num:'119' },
];

// コミュニティ活動フィード（他の探偵団メンバーの最近の活動）
const COMMUNITY_ACTIVITY = [
  { type:'patrol',  user:'はるき',  user_en:'Haruki', icon:'route', desc:'代々木公園周辺パトロール完了',     desc_en:'Completed patrol around Yoyogi Park',        pts:173, ago:'6分前'  },
  { type:'resolve', user:'ミク',    user_en:'Miku',    icon:'checkCircle', desc:'マーキングの対処済み報告',          desc_en:'Reported a marking as resolved',              pts:20,  ago:'19分前' },
  { type:'post',    user:'山下',  user_en:'Yamashita',    icon:'camera', desc:'南平台で要確認の記号を投稿',        desc_en:'Posted a check-needed marking in Minamidai',  pts:30,  ago:'34分前' },
  { type:'patrol',  user:'あや',    user_en:'Aya',     icon:'route', desc:'松濤エリアパトロール完了',           desc_en:'Completed patrol in Shouto area',             pts:128, ago:'1時間前' },
  { type:'post',    user:'ken_1984',    user_en:'ken_1984',     icon:'camera', desc:'渋谷駅付近で濃厚マーキング検出',    desc_en:'Detected strong marking near Shibuya Sta.',   pts:50,  ago:'2時間前' },
  { type:'resolve', user:'hana',    user_en:'hana',    icon:'checkCircle', desc:'対処済み報告が確認された',          desc_en:'Resolve report confirmed',                    pts:20,  ago:'5時間前' },
];

// 地域アラート（自治体・警察・自警団からのお知らせ）
const ALERTS = [
  { id:1, src:'shield', org:'渋谷警察署', org_en:'Shibuya Police Station', cat:'police',
    title:'侵入盗の被害増加に関する注意喚起', title_en:'Burglary increase alert',
    body:'本年度に入り渋谷区内での侵入盗被害が前年比120%増加しています。外出前の施錠確認と、見慣れない記号の投稿へのご協力をお願いします。',
    body_en:'Burglary damage in Shibuya has risen 120% year-on-year. Please ensure locks are checked before going out, and continue reporting unfamiliar markings.',
    date:'2026-06-20', isNew:true },
  { id:2, src:'building', org:'渋谷区役所', org_en:'Shibuya City Hall', cat:'city',
    title:'防犯カメラ設置箇所の更新について', title_en:'CCTV location update',
    body:'区内の防犯カメラ42台を高解像度モデルに更新しました。設置場所は区公式サイトの「防犯マップ」ページでご確認いただけます。',
    body_en:'42 CCTV cameras in the ward have been upgraded to high-resolution models. See the latest locations on the ward\'s official "Safety Map" page.',
    date:'2026-06-18', isNew:false },
  { id:3, src:'user', org:'代々木上原自警団', org_en:'Yoyogi-Uehara Neighborhood Watch', cat:'watch',
    title:'不審者目撃情報 — 代々木上原駅周辺', title_en:'Suspicious person sighting near station',
    body:'6/17夜20時頃、代々木上原駅北口付近で不審者の目撃情報が寄せられています。見慣れない人物を見かけた際は無理に近づかず110番通報をお願いします。',
    body_en:'A suspicious person was reported near Yoyogi-Uehara Station north exit around 8 pm on Jun 17. Do not approach; call 110 if you see an unfamiliar individual.',
    date:'2026-06-17', isNew:false },
  { id:4, src:'shield', org:'渋谷警察署', org_en:'Shibuya Police Station', cat:'police',
    title:'マーキング被害相談窓口を設置しました', title_en:'Marking consultation office opened',
    body:'マーキング等の特殊詐欺前兆事案に関する専用相談窓口を設置しました。相談は月〜金 9:00〜17:00。お気軽にご連絡ください。',
    body_en:'A dedicated consultation service for marking-related suspicious activity has opened. Available Mon–Fri 9:00–17:00. Feel free to call.',
    date:'2026-06-14', isNew:false },
  { id:5, src:'building', org:'渋谷区役所', org_en:'Shibuya City Hall', cat:'city',
    title:'防犯パトロール強化月間（7月）のお知らせ', title_en:'Reinforced patrol month — July',
    body:'7月を「防犯パトロール強化月間」と定め、区内12か所でパトロールイベントを開催します。詳細は後日、区公式サイトよりお知らせします。',
    body_en:'July is designated "Reinforced Patrol Month," with 12 patrol events across the ward. Full details will be posted on the ward\'s official site.',
    date:'2026-06-10', isNew:false },
];

const LEVELS = [
  { lv:1, title:'見習い探偵', min:0,    icon:'search', perk:'撮影・投稿・防犯マップ閲覧の基本機能',          title_en:'Trainee Detective',  perk_en:'Basics: shoot, post, view the map' },
  { lv:2, title:'初級探偵',   min:200,  icon:'clipboard', perk:'投稿履歴の閲覧と探偵バッジの獲得',              title_en:'Junior Detective',   perk_en:'View post history and earn badges' },
  { lv:3, title:'中級探偵',   min:500,  icon:'flame', perk:'ヒートマップ表示とエリア統計が解放',            title_en:'Detective',          perk_en:'Unlock heatmap and area stats' },
  { lv:4, title:'上級探偵',   min:900,  icon:'chart', perk:'週間活動レポートと優先通知が届く',              title_en:'Senior Detective',   perk_en:'Weekly reports and priority alerts' },
  { lv:5, title:'熟練探偵',   min:1400, icon:'star', perk:'カスタムエリア監視・限定アバター',              title_en:'Expert Detective',   perk_en:'Custom area watch and exclusive avatars' },
  { lv:6, title:'特上探偵',   min:2000, icon:'award', perk:'地域ランキング表彰と特別ミッション',            title_en:'Elite Detective',    perk_en:'Area-ranking honors and special missions' },
  { lv:7, title:'特級探偵',   min:2400, icon:'shield', perk:'自治体連携データ閲覧・探偵団リーダー権限',      title_en:'Special-Class',      perk_en:'Civic data access and squad-leader rights' },
  { lv:8, title:'エース探偵', min:3000, icon:'crown', perk:'AI判定の詳細レポートと新機能の先行利用',        title_en:'Ace Detective',      perk_en:'Detailed AI reports and early feature access' },
  { lv:9, title:'伝説の探偵', min:4000, icon:'trophy', perk:'殿堂入り・全特典開放とプレミアム称号',          title_en:'Legendary Detective',perk_en:'Hall of fame, all perks and premium title' },
];

// 撮影結果のパターン（毎回ランダムに抽選）
const CAM_OUTCOMES = [
  { weight:3, type:'danger', mark:'⚡', title:'マーキング濃厚', title_en:'Marking likely', conf:[88,96], pts:50,
    label:'インターホン側面の傷', desc:'「侵入経路の目印」と判定されました。', desc_en:'Judged a "marker for an entry route."', verdict:'マーキング濃厚' },
  { weight:2, type:'danger', mark:'→', title:'マーキング濃厚', title_en:'Marking likely', conf:[85,94], pts:50,
    label:'メーターボックスの矢印', desc:'「方向を示す記号」と判定されました。', desc_en:'Judged a "symbol indicating direction."', verdict:'マーキング濃厚' },
  { weight:2, type:'danger', mark:'M', title:'マーキング濃厚', title_en:'Marking likely', conf:[82,93], pts:50,
    label:'玄関柱のアルファベット', desc:'「属性を記録する記号」と判定されました。', desc_en:'Judged a "symbol encoding household info."', verdict:'マーキング濃厚' },
  { weight:3, type:'warn', mark:'●', title:'要確認', title_en:'Needs check', conf:[58,74], pts:30,
    label:'表札周りのシール', desc:'マーキングの可能性あり。再調査を推奨します。', desc_en:'Possibly a marking. Re-investigation is advised.', verdict:'要確認' },
  { weight:2, type:'warn', mark:'✕', title:'要確認', title_en:'Needs check', conf:[55,72], pts:30,
    label:'郵便受け裏の記号', desc:'除外マークの可能性あり。再調査を推奨します。', desc_en:'Possibly an exclusion mark. Re-investigation is advised.', verdict:'要確認' },
  { weight:1, type:'warn', mark:'∴', title:'要確認', title_en:'Needs check', conf:[52,70], pts:30,
    label:'ベランダ柵の三点マーク', desc:'三点マークの可能性あり。再調査を推奨します。', desc_en:'Possibly a three-dot mark. Re-investigation is advised.', verdict:'要確認' },
  { weight:2, type:'safe', mark:'○', title:'偶然と判定', title_en:'Judged coincidence', conf:[76,90], pts:10,
    label:'落書き・自然な汚れ', desc:'マーキングではないとAIが判断しました。', desc_en:'AI judged this is not a marking.', verdict:'偶然と判定' },
];
function pickOutcome(){
  const total = CAM_OUTCOMES.reduce((s,o)=>s+o.weight,0);
  let r = Math.random()*total;
  for (const o of CAM_OUTCOMES){ if ((r-=o.weight) < 0) return o; }
  return CAM_OUTCOMES[0];
}
function randInt(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }

// ── 時間帯検出 ──
function getTimeOfDay(){ const h=new Date().getHours(); return h>=5&&h<11?'morning':h>=11&&h<17?'day':h>=17&&h<21?'evening':'night'; }
function applyTimeOfDay(){ const ph=document.querySelector('.phone'); if(ph) ph.dataset.time=getTimeOfDay(); }
function updateStatusTime(){
  const now=new Date(), h=now.getHours(), m=String(now.getMinutes()).padStart(2,'0');
  const el=document.querySelector('.statusbar span:first-child'); if(el) el.textContent=h+':'+m;
}

