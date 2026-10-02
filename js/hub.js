// KIMI AROUND THE WORLD — hub: menu, settings, pause, lunar lobby, game launcher
import * as THREE from '../vendor/three.module.js';
import { CREW, makeKimi, makeNameSprite, canvasTex, sfx, settings, bests, buildHUD, showPanel, hidePanel, applyQuality, clamp, lerp, isMobile, MOBILE } from './common.js';
import { t, applyI18n, toggleLang, getLang } from './i18n.js';

settings.load();

// ======== mobile flags ========
if (MOBILE) document.body.classList.add('mobile');

// Apply i18n right away (in case i18n.js auto-apply ran before DOM was ready).
applyI18n();

const app = document.getElementById('app');
const menu = document.getElementById('menu');
const hint = document.getElementById('kbd-hint');
const menuOpenBtn = document.getElementById('menu-open-btn');

let current = null;      // active game handle {update, dispose, pause, resume, name}
let paused = false;
let renderer, camera, clock;

renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: MOBILE ? 'default' : 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
applyQuality(renderer, settings.quality);
app.appendChild(renderer.domElement);
clock = new THREE.Clock();

// Prevent iOS double-tap zoom & rubber-band scroll on mobile
if (MOBILE) {
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
}

addEventListener('resize', () => {
  if (current && current.camera) { current.camera.aspect = innerWidth / innerHeight; current.camera.updateProjectionMatrix(); }
  renderer.setSize(innerWidth, innerHeight);
});
// Re-check mobile status on orientation change
addEventListener('orientationchange', () => setTimeout(() => {
  document.body.classList.toggle('portrait-locked', MOBILE && window.innerHeight > window.innerWidth);
}, 100));

// ---------------- mobile menu toggle ----------------
function setMenuHidden(hidden) {
  menu.classList.toggle('hidden', hidden);
}
if (menuOpenBtn) menuOpenBtn.onclick = () => { sfx.ui(); setMenuHidden(false); };
const menuCloseBtn = document.getElementById('menu-close-btn');
if (menuCloseBtn) menuCloseBtn.onclick = (e) => { e.stopPropagation(); sfx.ui(); setMenuHidden(true); };
const pauseBtn = document.getElementById('pause-btn');
if (pauseBtn) pauseBtn.onclick = () => { sfx.ui(); if (current && !paused) setPaused(true); else if (paused) setPaused(false); };
const langBtn = document.getElementById('lang-btn');
if (langBtn) langBtn.onclick = () => { sfx.ui(); toggleLang(); };
const langMenuBtn = document.getElementById('btn-language');
if (langMenuBtn) langMenuBtn.onclick = () => { sfx.ui(); toggleLang(); };

// ---------------- settings panel ----------------
function openSettings() {
  showPanel(`<h2>${t('settings')}</h2>
    <div class="set-row"><span class="nm">${t('set_quality')}</span>
      <select id="set-q">
        <option value="low">${t('quality_low')}</option><option value="medium">${t('quality_med')}</option><option value="high">${t('quality_high')}</option>
      </select></div>
    <div class="set-row"><span class="nm">${t('set_sound')}</span>
      <select id="set-s"><option value="1">${t('sound_on')}</option><option value="0">${t('sound_off')}</option></select></div>
    <div class="set-row"><span class="nm">${t('set_volume')}</span>
      <input id="set-v" type="range" min="0" max="100" value="${settings.volume * 100}"></div>`,
    [{ label: t('btn_close'), fn: () => { hidePanel(); } }]);
  const q = document.getElementById('set-q'); q.value = settings.quality;
  q.onchange = () => { settings.quality = q.value; settings.save(); applyQuality(renderer, q.value); };
  const s = document.getElementById('set-s'); s.value = settings.sound ? '1' : '0';
  s.onchange = () => { settings.sound = s.value === '1'; sfx.enabled = settings.sound; settings.save(); };
  const v = document.getElementById('set-v');
  v.oninput = () => { settings.volume = v.value / 100; sfx.volume = settings.volume; settings.save(); };
}

document.getElementById('btn-settings').onclick = () => { sfx.ui(); openSettings(); };
document.getElementById('btn-help').onclick = () => {
  sfx.ui();
  const html = MOBILE ? t('help_mobile') : t('help_desktop');
  showPanel(html, [{ label: t('btn_close'), fn: hidePanel }]);
};

// Re-apply i18n when language changes (also updates open panels if any)
window.addEventListener('kaw-lang-change', () => {
  applyI18n();
  // Re-read hint + name for the currently running game
  if (current && currentGameId) {
    current.name = NAMES[currentGameId]();
    // Each game module may expose a relocalize() hook for its HUD text
    if (typeof current.relocalize === 'function') current.relocalize();
    hint.textContent = current.hint || '';
  }
});

// ---------------- pause ----------------
function setPaused(p, silent = false) {
  if (!current) return;
  paused = p;
  if (p) { clock.getDelta(); if (current.pause) current.pause(); if (!silent) openPausePanel(); }
  else { if (current.resume) current.resume(); hidePanel(); }
}
function openPausePanel() {
  showPanel(`<h2>${t('paused')}</h2><p>${(current && current.name) || ''} · ${t('paused_hint')}</p>`, [
    { label: t('btn_resume'), fn: () => setPaused(false) },
    { label: t('btn_restart'), fn: () => { hidePanel(); const n = current.name; launch(n); } },
    { label: t('btn_lobby'), ghost: true, fn: () => { hidePanel(); launch('lobby'); } },
  ]);
}
addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (!paused) setPaused(true); else { hidePanel(); setPaused(false); } }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && current && !paused) setPaused(true); });
addEventListener('blur', () => { if (current && !paused) setPaused(true, true); });
// menu clicks must not leak into game controls
menu.addEventListener('mousedown', e => e.stopPropagation());
menu.addEventListener('keydown', e => e.stopPropagation());
menu.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

// ---------------- game modules ----------------
const loaders = {
  lobby: () => import('./lobby.js'),
  race: () => import('./moonrace.js'),
  venice: () => import('./venice.js'),
  cyber: () => import('./cyber.js'),
};
const NAMES = {
  lobby: () => t('game_lobby'),
  race: () => t('game_race'),
  venice: () => t('game_venice'),
  cyber: () => t('game_cyber'),
};

// Track the current game id so we can rebuild hint on language change
let currentGameId = null;

async function launch(name, opts = {}) {
  hidePanel();
  if (current) { try { current.dispose(); } catch (e) { } current = null; }
  paused = false;
  currentGameId = name;
  const mod = await loaders[name]();
  current = mod.start({
    renderer, clock, THREE,
    returnToLobby: () => launch('lobby'),
    launchGame: (g) => launch(g),
    standalone: false,
    ...opts,
  });
  current.name = NAMES[name]();
  hint.textContent = current.hint || '';
  // Menu visibility logic:
  // - Desktop: menu always shown for lobby, hidden for hideMenu games
  // - Mobile: menu always hidden by default (☰ button to reopen), so touch UI isn't blocked
  if (MOBILE) {
    document.body.classList.add('has-game');
    setMenuHidden(true);
  } else {
    menu.classList.toggle('hidden', name !== 'lobby' && !!current.hideMenu);
  }
}

document.querySelectorAll('#menu [data-game]').forEach(b => {
  b.onclick = () => { sfx.ui(); launch(b.dataset.game); };
});

// main loop
// On mobile, drop to 30fps when the document is hidden to save battery.
let lastFrameAt = performance.now();
let rafThrottle = 0;
function frame() {
  requestAnimationFrame(frame);
  // If paused or hidden, run at low rate (~5 fps) just to keep the loop alive.
  const now = performance.now();
  const isHidden = document.hidden;
  if (paused || isHidden) {
    if (now - lastFrameAt < 200) return;
    lastFrameAt = now;
    // Skip update; only render once in a while so any visible panel still looks fine.
    if (current && current.scene && current.camera) renderer.render(current.scene, current.camera);
    return;
  }
  // Mobile frame pacing: cap dt to 0.05 to avoid huge jumps after pause/lag.
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  lastFrameAt = now;
  if (current && !paused) current.update(dt);
  if (current && current.scene && current.camera) renderer.render(current.scene, current.camera);
}

addEventListener('DOMContentLoaded', async () => {
  await launch('lobby');
  const boot = document.getElementById('boot');
  boot.style.transition = 'opacity .6s'; boot.style.opacity = 0;
  setTimeout(() => boot.remove(), 650);
  frame();
});
