// KIMI AROUND THE WORLD — shared utilities
import * as THREE from '../vendor/three.module.js';

export const CREW = [
  { name: 'YOU',   color: 0x4da3ff, isPlayer: true },
  { name: 'NOVA',  color: 0xff7ad9 },
  { name: 'ORBIT', color: 0x8dff6a },
  { name: 'COMET', color: 0xffb84d },
];

// ---------- Kimi character: ball + two white capsule eyes ----------
export function makeKimi(color, scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5 * scale, 24, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 })
  );
  body.castShadow = true;
  g.add(body);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x888888, emissiveIntensity: 0.35 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.075 * scale, 0.16 * scale, 4, 10), eyeMat);
    eye.position.set(0.16 * s * scale, 0.12 * scale, 0.42 * scale);
    g.add(eye);
  }
  g.userData.body = body;
  return g;
}

export function makeNameSprite(text, color = '#fff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.font = '600 34px "Geist Mono", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 14;
  x.fillStyle = color; x.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.4, 0.6, 1);
  return sp;
}

// ---------- canvas texture helper ----------
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- audio: tiny WebAudio synth ----------
export class Sfx {
  constructor() { this.ctx = null; this.volume = 0.5; this.enabled = true; }
  _ac() {
    if (!this.ctx) {
      if (!this._unlocked) return null; // wait for first user gesture
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  beep(freq = 440, dur = 0.08, type = 'square', vol = 1, slide = 0) {
    if (!this.enabled) return;
    const ac = this._ac(); if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ac.currentTime + dur);
    g.gain.setValueAtTime(this.volume * 0.18 * vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  }
  noise(dur = 0.2, vol = 1, low = 400) {
    if (!this.enabled) return;
    const ac = this._ac(); if (!ac) return;
    const n = ac.sampleRate * dur, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
    const g = ac.createGain(); g.gain.value = this.volume * 0.25 * vol;
    s.connect(f).connect(g).connect(ac.destination); s.start();
  }
  ui() { this.beep(660, 0.05, 'square', 0.6); }
  count(final = false) { this.beep(final ? 880 : 440, final ? 0.35 : 0.12, 'square', 1); }
  hit() { this.noise(0.25, 1, 300); this.beep(110, 0.25, 'sawtooth', 0.8, -60); }
  pickup() { this.beep(520, 0.07, 'triangle', 0.9, 380); }
  boost() { this.beep(180, 0.3, 'sawtooth', 0.8, 500); }
  shoot() { this.beep(900, 0.06, 'square', 0.5, -500); }
  boom() { this.noise(0.6, 1.4, 200); this.beep(70, 0.5, 'sawtooth', 1, -40); }
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.18, 'triangle', 1), i * 140)); }
  lose() { [400, 320, 240].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, 'sawtooth', 0.8), i * 170)); }
}
export const sfx = new Sfx();
const _unlock = () => { sfx._unlocked = true; removeEventListener('pointerdown', _unlock); removeEventListener('keydown', _unlock); };
addEventListener('pointerdown', _unlock); addEventListener('keydown', _unlock);

// ---------- settings + bests (localStorage) ----------
import { isMobile as _isMobileQ } from './touch.js';
export const settings = {
  quality: 'auto', sound: true, volume: 0.5,
  load() {
    try { Object.assign(this, JSON.parse(localStorage.getItem('kaw_settings') || '{}')); } catch (e) { }
    // First-run mobile default: medium for performance.
    if (this.quality === 'auto' && _isMobileQ()) this.quality = 'medium';
    sfx.enabled = this.sound; sfx.volume = this.volume;
  },
  save() { localStorage.setItem('kaw_settings', JSON.stringify({ quality: this.quality, sound: this.sound, volume: this.volume })); },
};
export const bests = {
  get(k, d = null) { try { const v = localStorage.getItem('kaw_best_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v, better = (a, b) => a > b) { const cur = this.get(k); if (cur === null || better(v, cur)) { localStorage.setItem('kaw_best_' + k, JSON.stringify(v)); return true; } return false; },
};

// ---------- HUD builder ----------
export function buildHUD(root, slots) {
  let hud = document.getElementById('hud');
  if (!hud) { hud = document.createElement('div'); hud.id = 'hud'; document.body.appendChild(hud); }
  hud.innerHTML = '';
  const els = {};
  for (const s of slots) {
    const d = document.createElement('div'); d.className = 'hud-' + s; hud.appendChild(d); els[s] = d;
  }
  const center = document.createElement('div'); center.className = 'hud-center'; hud.appendChild(center); els.center = center;
  const toast = document.createElement('div'); toast.className = 'toast'; hud.appendChild(toast); els.toast = toast;
  hud.classList.add('on');
  let toastT = null;
  els.showToast = (msg, ms = 1800) => {
    toast.textContent = msg; toast.style.opacity = 1;
    clearTimeout(toastT); toastT = setTimeout(() => toast.style.opacity = 0, ms);
  };
  els.countdown = (n, msg = '') => { center.innerHTML = (n ? `<div class="count">${n}</div>` : '') + (msg ? `<div class="msg">${msg}</div>` : ''); };
  els.clearCenter = () => { center.innerHTML = ''; };
  els.hide = () => hud.classList.remove('on');
  return els;
}

// ---------- overlay panel ----------
export function showPanel(html, buttons) {
  hidePanel();
  document.body.classList.add('panel-open');
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'kaw-overlay';
  const p = document.createElement('div'); p.className = 'panel'; p.innerHTML = html;
  for (const b of buttons) {
    const btn = document.createElement('button'); btn.className = 'btn' + (b.ghost ? ' ghost' : '');
    btn.textContent = b.label; btn.onclick = () => { sfx.ui(); b.fn(); }; p.appendChild(btn);
  }
  ov.appendChild(p); document.body.appendChild(ov);
  return ov;
}
export function hidePanel() { const o = document.getElementById('kaw-overlay'); if (o) o.remove(); document.body.classList.remove('panel-open'); }

export function resultRows(rows, meIdx) {
  return rows.map((r, i) =>
    `<div class="result-row${i === meIdx ? ' me' : ''}"><span class="pos">P${i + 1}</span><span class="nm">${r.name}</span><span class="vl">${r.value}</span></div>`
  ).join('');
}

// ---------- quality ----------
import { isMobile as _isMobile, isPhone as _isPhone } from './touch.js';
export const MOBILE = _isMobile();
export const PHONE = _isPhone();
export function isMobile() { return MOBILE; }
export function isPhone() { return PHONE; }

// Performance tier: 'phone' | 'tablet' | 'desktop'
export const PERF_TIER = PHONE ? 'phone' : (MOBILE ? 'tablet' : 'desktop');

export function applyQuality(renderer, q) {
  const dpr = window.devicePixelRatio || 1;
  // On mobile, hard-cap DPR — phones easily choke above 2 with 2048² shadow maps.
  const cap = MOBILE ? Math.min(dpr, PHONE ? 1.25 : 1.5) : dpr;
  let pr;
  if (q === 'auto') {
    pr = PHONE ? Math.min(cap, 0.85) : (MOBILE ? Math.min(cap, 1.0) : Math.min(cap, 1.75));
  } else if (q === 'low') {
    pr = Math.min(cap, PHONE ? 0.55 : (MOBILE ? 0.65 : 0.75));
  } else if (q === 'medium') {
    pr = Math.min(cap, PHONE ? 0.85 : (MOBILE ? 1.0 : 1.25));
  } else { // high
    pr = Math.min(cap, PHONE ? 1.1 : (MOBILE ? 1.3 : 1.75));
  }
  renderer.setPixelRatio(pr);
  // Tag for scene builders.
  if (MOBILE && renderer.shadowMap && renderer.shadowMap.enabled !== undefined) {
    renderer.capabilitiesMobile = true;
  }
  // Low-quality hint: scenes may disable shadows entirely.
  if (q === 'low' && PERF_TIER === 'phone') {
    renderer._hintDisableShadows = true;
  } else {
    renderer._hintDisableShadows = false;
  }
}

// Convenience: returns shadow map size hint based on device + quality
export function shadowMapSize(defaultSize = 2048) {
  if (PERF_TIER === 'phone') return Math.min(512, defaultSize);
  if (PERF_TIER === 'tablet') return Math.min(1024, defaultSize);
  return defaultSize;
}

// Whether to enable shadows at all for this tier/quality
export function shouldEnableShadows() {
  if (PERF_TIER === 'desktop') return true;
  if (PERF_TIER === 'tablet') return true;  // tablets usually OK with 1024
  return settings.quality !== 'low';  // phone + low → off
}

// Convenience: returns particle/instance count multiplier
export function mobileScale(base = 1) {
  if (PERF_TIER === 'phone') return Math.max(0.3, base * 0.4);
  if (PERF_TIER === 'tablet') return Math.max(0.5, base * 0.65);
  return base;
}

// ---------- misc ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function fmtTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}
export function makeRenderer(container) {
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  applyQuality(r, settings.quality);
  container.appendChild(r.domElement);
  return r;
}
