// KIMI AROUND THE WORLD — i18n (Chinese / English)
// All user-visible strings live here. Default = Chinese, toggle via setLang('en') / setLang('zh').
// Persisted in localStorage key 'kaw_lang'.

const LANG_KEY = 'kaw_lang';
const SUPPORTED = ['zh', 'en'];

// Detect initial language: localStorage > navigator.language > 'zh'
// Default to Chinese for this Chinese-led project, unless user explicitly chose English.
function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch (e) { }
  // Only switch to English if the browser language is explicitly English
  // AND no Chinese preference is in navigator.languages.
  const nav = (navigator.language || 'zh').toLowerCase();
  const navs = (navigator.languages || []).map(l => (l || '').toLowerCase());
  const hasZh = navs.some(l => l.startsWith('zh'));
  if (!hasZh && nav.startsWith('en')) return 'en';
  return 'zh';
}

let current = detectLang();

// String table. Nested by key. zh / en.
export const STR = {
  // ---- index.html ----
  brand:           { zh: 'INTERACTIVE EXPERIENCE', en: 'INTERACTIVE EXPERIENCE' },
  title:           { zh: 'AROUND THE WORLD', en: 'AROUND THE WORLD' },
  boot_init:       { zh: 'INITIALIZING SURFACE SYSTEMS…', en: 'INITIALIZING SURFACE SYSTEMS…' },
  foot:            { zh: 'SINGLE PLAYER · THREE r169<br>ESC PAUSE · CLICK MENU TO TRAVEL',
                     en: 'SINGLE PLAYER · THREE r169<br>ESC PAUSE · CLICK MENU TO TRAVEL' },

  // Menu items
  game_lobby:      { zh: 'LUNAR LOBBY', en: 'LUNAR LOBBY' },
  game_lobby_sub:  { zh: '月球大厅 · 自由探索', en: 'Moon base · free explore' },
  game_race:       { zh: 'MOON RACE', en: 'MOON RACE' },
  game_race_sub:   { zh: '8.8KM 环形陨石坑竞速', en: '8.8km crater ring race' },
  game_venice:     { zh: 'VENICE SPEED', en: 'VENICE SPEED' },
  game_venice_sub: { zh: '晨光运河 · 贡多拉', en: 'Dawn canals · gondola' },
  game_cyber:      { zh: 'CYBER SPACESHIP', en: 'CYBER SPACESHIP' },
  game_cyber_sub:  { zh: '雨夜霓虹 · 飞行出租车', en: 'Rainy neon city · flight taxi' },
  settings:        { zh: 'SETTINGS', en: 'SETTINGS' },
  settings_sub:    { zh: '画质 · 声音', en: 'Quality · Sound' },
  controls:        { zh: 'CONTROLS', en: 'CONTROLS' },
  controls_sub:    { zh: '操作说明', en: 'How to play' },
  language:        { zh: 'LANGUAGE', en: 'LANGUAGE' },
  language_sub:    { zh: '中英切换', en: '中文 / English' },

  // Settings panel
  set_quality:     { zh: 'QUALITY 画质', en: 'QUALITY' },
  set_sound:       { zh: 'SOUND 声音', en: 'SOUND' },
  set_volume:      { zh: 'VOLUME 音量', en: 'VOLUME' },
  quality_low:     { zh: 'LOW', en: 'LOW' },
  quality_med:     { zh: 'MEDIUM', en: 'MEDIUM' },
  quality_high:    { zh: 'HIGH', en: 'HIGH' },
  sound_on:        { zh: 'ON', en: 'ON' },
  sound_off:       { zh: 'OFF', en: 'OFF' },
  btn_close:       { zh: 'CLOSE', en: 'CLOSE' },
  btn_resume:      { zh: 'RESUME', en: 'RESUME' },
  btn_restart:     { zh: 'RESTART', en: 'RESTART' },
  btn_lobby:       { zh: 'LOBBY', en: 'LOBBY' },
  btn_hub:         { zh: 'HUB', en: 'HUB' },
  btn_menu:        { zh: 'MENU', en: 'MENU' },

  // Pause
  paused:          { zh: 'PAUSED', en: 'PAUSED' },
  paused_hint:     { zh: '已暂停', en: 'paused' },

  // Help — desktop
  help_desktop: {
    zh: `<h2>CONTROLS</h2><p>
LUNAR LOBBY — WASD 移动 · 鼠标拖拽/←→ 转镜头 · 滚轮缩放 · 走上发光平台开始游戏<br><br>
MOON RACE — W 加速 · S 刹车/倒车 · A/D 转向 · SPACE 使用道具 · SHIFT 小喷<br><br>
VENICE SPEED — W 划桨加速 · S 减速 · A/D 转向 · SPACE 使用道具<br><br>
CYBER — 鼠标控制方向 · W/S 调速 · SHIFT 加速(积热) · SPACE 向上突进 · 左键射击(空战)<br><br>
通用 — ESC 暂停 · 页面失焦自动暂停 · 本地保存最佳成绩</p>`,
    en: `<h2>CONTROLS</h2><p>
LUNAR LOBBY — WASD move · drag mouse / ← → to look · wheel to zoom · walk onto a glowing pad to launch a game<br><br>
MOON RACE — W accelerate · S brake / reverse · A / D steer · SPACE use item · SHIFT mini-boost<br><br>
VENICE SPEED — W row to accelerate · S slow down · A / D steer · SPACE use item<br><br>
CYBER — mouse steer · W / S throttle · SHIFT boost (heat) · SPACE upward dash · left-click to shoot (battle)<br><br>
General — ESC pause · auto-pause on tab blur · personal bests saved locally</p>`,
  },
  // Help — mobile
  help_mobile: {
    zh: `<h2>触屏操作</h2><p style="line-height:1.9">
LUNAR LOBBY — 左下摇杆移动 · 右半屏拖拽转镜头 · 双指捏合缩放 · 走上发光平台进入游戏<br><br>
MOON RACE — 左下摇杆 推上加速/左右转向 · BOOST 加速键 · ITEM 道具键<br><br>
VENICE SPEED — 左下摇杆 推上划桨/左右转向 · ITEM 道具键<br><br>
CYBER — 左下摇杆控制俯仰偏航 · 右下摇杆 推上加速/下减速 · FIRE 射击 · BOOST 加速 · DASH 突进<br><br>
通用 — 顶部 ‖ 暂停 · ☰ 呼出菜单 · ESC 同样可暂停 · 本地保存最佳成绩</p>`,
    en: `<h2>TOUCH CONTROLS</h2><p style="line-height:1.9">
LUNAR LOBBY — left stick to move · drag right side to look · pinch to zoom · walk onto a glowing pad to enter a game<br><br>
MOON RACE — left stick push up to accelerate / left-right to steer · BOOST button · ITEM button<br><br>
VENICE SPEED — left stick push up to row / left-right to steer · ITEM button<br><br>
CYBER — left stick yaw / pitch · right stick up to accelerate / down to brake · FIRE · BOOST · DASH buttons<br><br>
General — ‖ top pause · ☰ open menu · ESC also pauses · personal bests saved locally</p>`,
  },

  // ---- Per-game hints ----
  hint_lobby_d:     { zh: 'WASD 移动 · 鼠标拖拽/←→ 镜头 · 滚轮缩放 · ESC 暂停',
                      en: 'WASD move · drag mouse / ← → to look · wheel to zoom · ESC pause' },
  hint_lobby_m:     { zh: '左摇杆移动 · 右屏拖镜头 · 双指缩放 · 顶部 ‖ 暂停',
                      en: 'Left stick move · drag right side to look · pinch to zoom · top ‖ pause' },
  hint_race_d:      { zh: 'W 加速 · S 刹车 · A/D 转向 · SPACE 道具 · SHIFT 小喷 · ESC 暂停',
                      en: 'W accelerate · S brake · A/D steer · SPACE item · SHIFT boost · ESC pause' },
  hint_race_m:      { zh: '左摇杆 加速/转向 · BOOST 加速 · ITEM 道具 · 顶部 ‖ 暂停',
                      en: 'Left stick accelerate/steer · BOOST · ITEM · top ‖ pause' },
  hint_venice_d:    { zh: 'W 划桨 · S 减速 · A/D 转向 · SPACE 道具 · ESC 暂停',
                      en: 'W row · S slow · A/D steer · SPACE item · ESC pause' },
  hint_venice_m:    { zh: '左摇杆 划桨/转向 · ITEM 道具 · 顶部 ‖ 暂停',
                      en: 'Left stick row/steer · ITEM · top ‖ pause' },
  hint_cyber_d:     { zh: '鼠标 方向 · W/S 调速 · SHIFT 加速 · SPACE 突进/道具 · 左键射击 · ESC 暂停',
                      en: 'Mouse steer · W/S throttle · SHIFT boost · SPACE dash/item · click to fire · ESC pause' },
  hint_cyber_m:     { zh: '左摇杆 方向 · 右摇杆 加速 · FIRE 射击 · BOOST 加速 · DASH 突进/道具 · 顶部 ‖ 暂停',
                      en: 'Left stick steer · right stick throttle · FIRE · BOOST · DASH/item · top ‖ pause' },

  // ---- Lobby ----
  lobby_hud: {
    zh: (crew) => `CREW ${crew} · 走上发光平台开始游戏`,
    en: (crew) => `CREW ${crew} · walk onto a glowing pad to start`,
  },
  lobby_hud_m_extra: { zh: ' · 左摇杆移动 · 右屏拖镜头 · 双指缩放', en: ' · left stick · drag right · pinch zoom' },
  lobby_entering:     { zh: (label) => `ENTERING ${label}`, en: (label) => `ENTERING ${label}` },

  // ---- Moon race ----
  race_hud: { zh: 'MOON RACE', en: 'MOON RACE' },
  race_lap:  { zh: (a, b) => `LAP ${a}/${b}`, en: (a, b) => `LAP ${a}/${b}` },
  race_pos:  { zh: (n) => `P${n}/4`, en: (n) => `P${n}/4` },
  race_time: { zh: 'TIME', en: 'TIME' },
  race_speed:{ zh: (v) => `${v} KM/H`, en: (v) => `${v} KM/H` },
  race_item: { zh: 'ITEM', en: 'ITEM' },
  race_boost: { zh: 'BOOST', en: 'BOOST' },
  race_use_item_space: { zh: '· SPACE 使用', en: '· press SPACE' },
  race_got:    { zh: (item) => `GOT ${item} · SPACE 使用`, en: (item) => `GOT ${item} · press SPACE` },
  race_boost_toast: { zh: 'BOOST!', en: 'BOOST!' },
  race_rocket_toast:{ zh: 'ROCKET AWAY!', en: 'ROCKET AWAY!' },
  race_banana_toast: { zh: 'BANANA DROPPED', en: 'BANANA DROPPED' },
  race_hit_toast: { zh: (cause) => `${cause} — HIT!`, en: (cause) => `${cause} — HIT!` },
  race_rocket_hit_toast: { zh: (name) => `${name} HIT BY ROCKET`, en: (name) => `${name} HIT BY ROCKET` },
  race_lap_toast: { zh: (n, t) => `LAP ${n} · ${t}`, en: (n, t) => `LAP ${n} · ${t}` },
  race_result_title: { zh: 'RACE RESULT', en: 'RACE RESULT' },
  race_your_time: { zh: (t, best) => `YOUR TIME ${t} · BEST LAP ${best}`, en: (t, best) => `YOUR TIME ${t} · BEST LAP ${best}` },
  race_all_best:  { zh: (best) => `ALL-TIME BEST ${best}`, en: (best) => `ALL-TIME BEST ${best}` },
  race_new_record:{ zh: '· <span style="color:#8dff6a">NEW RECORD!</span>', en: '· <span style="color:#8dff6a">NEW RECORD!</span>' },
  race_dnf:       { zh: 'DNF', en: 'DNF' },

  // ---- Venice ----
  venice_hud:      { zh: 'VENICE SPEED', en: 'VENICE SPEED' },
  venice_ferry:    { zh: 'VENICE · FERRY', en: 'VENICE · FERRY' },
  venice_race:     { zh: 'VENICE · RACE', en: 'VENICE · RACE' },
  venice_score:    { zh: 'SCORE', en: 'SCORE' },
  venice_trips:    { zh: 'TRIPS', en: 'TRIPS' },
  venice_ferry_intro: { zh: '前往发光码头接送乘客!', en: 'Go to a glowing dock to pick up passengers!' },
  venice_passenger_on: { zh: '乘客已上船 — 前往绿色码头', en: 'Passenger aboard — head to the green dock' },
  venice_delivered: { zh: (pts) => `送达! +${pts} PTS · +25s`, en: (pts) => `Delivered! +${pts} PTS · +25s` },
  venice_carrying:   { zh: '乘客在车上 · 前往 <b>绿色光柱</b>', en: 'Passenger aboard · head to <b>green beacon</b>' },
  venice_pickup:     { zh: '前往 <b>金色光柱</b> 接乘客', en: 'Head to <b>gold beacon</b> to pick up' },
  venice_ferry_hud_bc: {
    zh: 'W 划桨 · S 减速 · A/D 转向 · 靠近光柱码头并减速完成上下客',
    en: 'W row · S slow · A/D steer · approach a beacon dock and slow down to board',
  },
  venice_ferry_title: { zh: 'FERRY COMPLETE', en: 'FERRY COMPLETE' },
  venice_ferry_summary: { zh: (trips) => `完成接送 ${trips} 次 · 用时奖励已计入`,
                          en: (trips) => `${trips} deliveries · time bonus included` },
  venice_pts: { zh: (n) => `${n} PTS`, en: (n) => `${n} PTS` },
  venice_best_label: { zh: (n) => `历史最佳 ${n} PTS`, en: (n) => `All-time best ${n} PTS` },
  venice_race_title: { zh: 'RACE RESULT', en: 'RACE RESULT' },
  venice_race_best: { zh: (t) => `BEST ${t}`, en: (t) => `BEST ${t}` },
  venice_btn_ferry: { zh: 'FERRY 接送乘客', en: 'FERRY passenger run' },
  venice_btn_race:  { zh: 'RACE 水上竞速', en: 'RACE canal race' },
  venice_menu_intro: { zh: '晨光中的运河 · 贡多拉', en: 'Dawn canals · gondola' },
  venice_splash_toast: { zh: 'SPLASH!', en: 'SPLASH!' },
  venice_splashed_other: { zh: (n) => `${n} SPLASHED!`, en: (n) => `${n} SPLASHED!` },
  venice_mine_dropped: { zh: 'MINE DROPPED', en: 'MINE DROPPED' },
  venice_mine_hit:    { zh: 'MINE — HIT!', en: 'MINE — HIT!' },
  venice_mine_other:  { zh: (n) => `${n} HIT A MINE`, en: (n) => `${n} hit a mine` },

  // ---- Cyber ----
  cyber_hud:        { zh: 'CYBER SPACESHIP', en: 'CYBER SPACESHIP' },
  cyber_chase_hud:  { zh: 'CHASE', en: 'CHASE' },
  cyber_battle_hud: { zh: 'BATTLE', en: 'BATTLE' },
  cyber_chase_intro:{ zh: '甩开追捕者 · 穿过封锁缺口!', en: 'Outrun pursuers · breach the gaps!' },
  cyber_battle_intro:{ zh: '3:00 空战开始 — 命中敌机得分!', en: '3:00 air battle — score hits!' },
  cyber_respawn:    { zh: 'RESPAWN', en: 'RESPAWN' },
  cyber_shield_on:  { zh: 'SHIELD ON', en: 'SHIELD ON' },
  cyber_dash_toast: { zh: 'DASH!', en: 'DASH!' },
  cyber_emp:        { zh: 'EMP BURST', en: 'EMP BURST' },
  cyber_shock:      { zh: 'SHOCKWAVE!', en: 'SHOCKWAVE!' },
  cyber_overheat:   { zh: '过热! 加速受限', en: 'Overheat! boost limited' },
  cyber_near_miss:  { zh: 'NEAR MISS +25', en: 'NEAR MISS +25' },
  cyber_wall_warn:  { zh: '前方封锁 — 穿过缺口!', en: 'Barricade ahead — fly through the gap!' },
  cyber_breach:     { zh: (alt) => `突破封锁! +200 · 追捕增强 · 升限 ${alt}m`,
                       en: (alt) => `Breach! +200 · pursuers up · ceiling ${alt}m` },
  cyber_chase_intensity: { zh: '追捕强度', en: 'intensity' },
  cyber_chase_bc:   { zh: (near, br, best) => `擦身 ${near} · 突破 ${br} · BEST ${best}`,
                       en: (near, br, best) => `near-miss ${near} · breaches ${br} · BEST ${best}` },
  cyber_overheat_label: { zh: 'OVERHEAT', en: 'OVERHEAT' },
  cyber_boost_hint: { zh: 'SHIFT 加速 · SPACE 突进', en: 'SHIFT boost · SPACE dash' },
  cyber_picked:     { zh: (k) => `拾取 ${k} · SPACE 使用`, en: (k) => `Picked ${k} · press SPACE` },
  cyber_hit_by:     { zh: (n) => `被 ${n} 命中 — 失控!`, en: (n) => `Hit by ${n} — out of control!` },
  cyber_chase_title:{ zh: 'CHASE OVER', en: 'CHASE OVER' },
  cyber_battle_title:{ zh: 'BATTLE RESULT', en: 'BATTLE RESULT' },
  cyber_chase_dist: { zh: 'DISTANCE 距离', en: 'DISTANCE' },
  cyber_chase_near: { zh: 'NEAR MISS 擦身', en: 'NEAR MISS' },
  cyber_chase_breach:{ zh: 'BREACH 突破封锁', en: 'BREACH' },
  cyber_chase_best: { zh: 'BEST 历史最佳', en: 'BEST' },
  cyber_btn_chase:  { zh: 'CHASE 追逐模式', en: 'CHASE pursuit' },
  cyber_btn_battle: { zh: 'BATTLE 空战模式', en: 'BATTLE air combat' },
  cyber_menu_intro: { zh: '雨夜霓虹都市 · 飞行出租车', en: 'Rainy neon city · flight taxi' },

  // CREW names are kept as-is in both languages (they're proper names)
};

// ---- API ----
export function getLang() { return current; }
export function setLang(l) {
  if (!SUPPORTED.includes(l)) return;
  current = l;
  try { localStorage.setItem(LANG_KEY, l); } catch (e) { }
  document.documentElement.lang = l;
  applyI18n();
  // Notify games that language changed so they can update HUD text
  window.dispatchEvent(new CustomEvent('kaw-lang-change', { detail: l }));
}
export function toggleLang() {
  setLang(current === 'zh' ? 'en' : 'zh');
}

// Translate a key. Args are positional and passed to function-form strings.
export function t(key, ...args) {
  const entry = STR[key];
  if (!entry) { console.warn('i18n missing:', key); return key; }
  const v = entry[current];
  if (typeof v === 'function') {
    try { return v(...args); } catch (e) { console.warn('i18n fn err', key, e); return key; }
  }
  return v;
}

// Convenience: t() but fall back to other language if missing
export function tf(key, ...args) {
  const entry = STR[key];
  if (!entry) return key;
  let v = entry[current];
  if (v == null) v = entry[Object.keys(entry).find(k => k !== current)] ?? key;
  if (typeof v === 'function') {
    try { return v(...args); } catch (e) { return key; }
  }
  return v;
}

// Apply translations to all elements with data-i18n attribute.
// Supports interpolation: data-i18n-args="1,2,3" (split by comma, numbers parsed).
export function applyI18n() {
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    let args = [];
    const argAttr = el.getAttribute('data-i18n-args');
    if (argAttr) {
      args = argAttr.split(',').map(s => {
        const n = Number(s.trim());
        return isNaN(n) ? s.trim() : n;
      });
    }
    try {
      el.innerHTML = t(key, ...args);
    } catch (e) {
      console.warn('i18n apply err', key, e);
    }
  });
  // Language toggle buttons reflect current state
  document.querySelectorAll('[data-lang-label]').forEach(el => {
    el.textContent = current === 'zh' ? 'EN' : '中';
  });
  // Title element if present
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = t('title');
}

// Auto-apply on first import
if (typeof document !== 'undefined') {
  // Wait for DOM ready if not already
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyI18n);
  } else {
    applyI18n();
  }
}
