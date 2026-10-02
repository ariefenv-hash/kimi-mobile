// CYBER SPACESHIP — rainy neon city: chase mode & 3-min air battle
import * as THREE from '../vendor/three.module.js';
import { CREW, makeKimi, makeNameSprite, canvasTex, sfx, buildHUD, showPanel, hidePanel, resultRows, fmtTime, clamp, lerp, bests, MOBILE, PHONE, mobileScale } from './common.js';
import { Joystick, TouchButton } from './touch.js';
import { t } from './i18n.js';

const CITY = 1200;            // wrap size for battle arena
const NEON = [0x4da3ff, 0xff7ad9, 0x8dff6a, 0xffb84d, 0x6ad9ff, 0xb98dff];

function buildShip(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x30343f, roughness: 0.35, metalness: 0.8 });
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 8), bodyMat);
  hull.rotation.x = -Math.PI / 2; hull.castShadow = true; g.add(hull);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x9fd0ff, roughness: 0.1, metalness: 0.4, emissive: 0x224466, emissiveIntensity: 0.8 }));
  cab.position.set(0, 0.35, -0.2); g.add(cab);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.0), bodyMat);
    wing.position.set(1.1 * s, 0, 0.6); wing.rotation.z = -0.15 * s; g.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.9), new THREE.MeshBasicMaterial({ color }));
    tip.position.set(1.9 * s, 0.1, 0.6); g.add(tip);
  }
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.85 }));
  jet.rotation.x = Math.PI / 2; jet.position.set(0, 0, 2.0); g.add(jet);
  const kimi = makeKimi(color, 0.7); kimi.position.set(0, 0.5, 0.4); g.add(kimi);
  g.userData.jet = jet;
  return g;
}

// neon window texture
function neonTex() {
  return canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = '#0a0d14'; x.fillRect(0, 0, w, h);
    for (let yy = 4; yy < h - 4; yy += 10) for (let xx = 4; xx < w - 4; xx += 9) {
      if (Math.random() < 0.5) {
        const c = NEON[Math.random() * NEON.length | 0].toString(16).padStart(6, '0');
        x.fillStyle = '#' + c; x.globalAlpha = 0.5 + Math.random() * 0.5;
        x.fillRect(xx, yy, 5, 6); x.globalAlpha = 1;
      }
    }
  });
}

export function start(ctx) {
  const { renderer, returnToLobby, standalone } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060e);
  scene.fog = new THREE.FogExp2(0x0a0e1e, 0.0035);
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.5, 2500);

  scene.add(new THREE.AmbientLight(0x334, 1.2));
  const moon = new THREE.DirectionalLight(0x8899ff, 0.7); moon.position.set(200, 400, 100); scene.add(moon);

  const winT = neonTex();
  // -------- city: instanced-like group of buildings on a grid --------
  const CELL = 60, GRID = Math.floor(CITY / CELL);
  // Mobile: skip more cells (wider streets) for fewer buildings; phone skips even more
  const streetSkip = PHONE ? 0.55 : (MOBILE ? 0.40 : 0.25);
  const buildings = [];
  const bldGroup = new THREE.Group(); scene.add(bldGroup);
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let gx = 0; gx < GRID; gx++) for (let gz = 0; gz < GRID; gz++) {
    if (Math.random() < streetSkip) continue; // streets
    const w = 24 + Math.random() * 22, d = 24 + Math.random() * 22, h = 40 + Math.random() * 160;
    const x = -CITY / 2 + gx * CELL + CELL / 2, z = -CITY / 2 + gz * CELL + CELL / 2;
    const mat = new THREE.MeshStandardMaterial({ color: 0x11141f, roughness: 0.6, metalness: 0.4, emissiveMap: winT, emissive: 0xffffff, emissiveIntensity: 0.9 });
    const m = new THREE.Mesh(bGeo, mat);
    m.scale.set(w, h, d); m.position.set(x, h / 2, z);
    bldGroup.add(m);
    const rec = { x, z, w: w / 2, d: d / 2, h, mesh: m };
    buildings.push(rec);
    // rooftop beacon (child so it recycles with the building)
    if (Math.random() < 0.3) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: NEON[Math.random() * NEON.length | 0] }));
      b.position.set(0, 0.6, 0); m.add(b);
    }
  }
  // skybridges
  const skybridgeCount = PHONE ? 6 : (MOBILE ? 12 : 26);
  for (let i = 0; i < skybridgeCount; i++) {
    const b1 = buildings[Math.random() * buildings.length | 0];
    const b2 = buildings[Math.random() * buildings.length | 0];
    if (!b1 || !b2 || b1 === b2) continue;
    const dx = b2.x - b1.x, dz = b2.z - b1.z, len = Math.hypot(dx, dz);
    if (len > 200 || len < 40) continue;
    const y = Math.min(b1.h, b2.h) * (0.4 + Math.random() * 0.4);
    const br = new THREE.Mesh(new THREE.BoxGeometry(4, 3, len), new THREE.MeshStandardMaterial({ color: 0x1a2030, emissive: 0x4da3ff, emissiveIntensity: 0.25, roughness: 0.5 }));
    br.position.set((b1.x + b2.x) / 2, y, (b1.z + b2.z) / 2);
    br.rotation.y = Math.atan2(dx, dz);
    bldGroup.add(br);
    buildings.push({ x: br.position.x, z: br.position.z, w: 3, d: len / 2, h: y, y0: y - 1.5, rot: br.rotation.y, bridge: true, mesh: br });
  }
  // billboards
  const billboards = [];
  const billboardCount = PHONE ? 8 : (MOBILE ? 16 : 34);
  for (let i = 0; i < billboardCount; i++) {
    const b = buildings[Math.random() * buildings.length | 0];
    if (!b || b.bridge) continue;
    const c = NEON[Math.random() * NEON.length | 0];
    const tex = canvasTex(128, 64, (x, w, h) => {
      x.fillStyle = '#05070c'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#' + c.toString(16).padStart(6, '0');
      x.font = '700 30px "Geist Mono",monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(['NEON', 'CYBER', 'NEXUS', 'ORBIT', 'Δ-9', '飛行'][Math.random() * 6 | 0], w / 2, h / 2);
    });
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(26, 13),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    bb.userData.bld = b;
    bb.userData.ox = (Math.random() - 0.5) * 10;
    bb.userData.fy = 0.5 + Math.random() * 0.4;
    bb.position.set(b.x + bb.userData.ox, b.h * bb.userData.fy, b.z + b.d + 0.6);
    scene.add(bb); billboards.push(bb);
  }
  // traffic flow: simple moving light streaks
  const traffic = [];
  {
    const tGeo = new THREE.BoxGeometry(0.6, 0.6, 6);
    const tCount = Math.round((PHONE ? 24 : 60) * mobileScale());
    for (let i = 0; i < tCount; i++) {
      const c = Math.random() < 0.5 ? 0xff6666 : 0xffe0aa;
      const m = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: c }));
      m.position.set((Math.random() - 0.5) * CITY, 8 + Math.random() * 30, (Math.random() - 0.5) * CITY);
      const a = Math.random() < 0.5 ? 0 : Math.PI / 2;
      m.rotation.y = a;
      m.userData.v = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 25);
      scene.add(m); traffic.push(m);
    }
  }
  // rain — fewer on phone for perf
  const RAIN = PHONE ? Math.round(900 * mobileScale()) : (MOBILE ? Math.round(900 * mobileScale()) : 900);
  const rainPos = new Float32Array(RAIN * 3);
  for (let i = 0; i < RAIN; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 300; rainPos[i * 3 + 1] = Math.random() * 160; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 300; }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x8fb8dd, size: 0.35, transparent: true, opacity: 0.55 }));
  scene.add(rain);
  // ground haze plane
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(CITY * 2, CITY * 2), new THREE.MeshBasicMaterial({ color: 0x0a1020 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.5; scene.add(g);
    const gridH = new THREE.GridHelper(CITY * 2, 80, 0x14203a, 0x0d1526);
    gridH.position.y = 0; scene.add(gridH);
  }

  // -------- entities --------
  const ships = CREW.map((c, i) => {
    const mesh = buildShip(c.color);
    const tag = makeNameSprite(c.name, i === 0 ? '#7fb8ff' : '#fff');
    tag.position.y = 2.2; tag.scale.set(2.6, 0.65, 1); mesh.add(tag);
    scene.add(mesh);
    return {
      ...c, mesh, idx: i, pos: new THREE.Vector3((i - 1.5) * 30, 90, i * 15), yaw: 0, pitch: 0,
      speed: 40, heat: 0, overheat: 0, alive: true, respawn: 0, invuln: 0,
      stun: 0, shield: 0, dash: 0, item: null, score: 0, hits: 0, kills: 0, deaths: 0,
      target: null, aiT: Math.random() * 5, trail: null,
    };
  });

  // pursuers for chase mode
  const pursuers = [];
  for (let i = 0; i < 3; i++) {
    const p = buildShip(0xff3344);
    p.userData.jet.material.color.setHex(0xff5544);
    scene.add(p); pursuers.push({ mesh: p, off: (i - 1) * 8, speed: 60 });
  }

  const bullets = [], pickups = [], walls = [], explosions = [];
  // pickups for battle
  {
    const kinds = ['shock', 'emp', 'shield', 'dash'];
    const cols = { shock: 0xffb84d, emp: 0x6ad9ff, shield: 0x8dff6a, dash: 0xff7ad9 };
    const pickupCount = PHONE ? 4 : (MOBILE ? 6 : 10);
    for (let i = 0; i < pickupCount; i++) {
      const k = kinds[i % 4];
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0),
        new THREE.MeshStandardMaterial({ color: cols[k], emissive: cols[k], emissiveIntensity: 1.4, transparent: true, opacity: 0.9 }));
      m.position.set((Math.random() - 0.5) * (CITY - 200), 40 + Math.random() * 140, (Math.random() - 0.5) * (CITY - 200));
      m.userData = { kind: k, taken: 0 };
      m.userData.temp = false;
      scene.add(m); pickups.push(m);
    }
  }

  const hud = buildHUD(document.body, ['tl', 'tr', 'bc', 'bl']);
  const crosshair = document.getElementById('crosshair');

  const keys = {};
  const kd = e => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return; keys[e.code] = true; };
  const ku = e => keys[e.code] = false;
  let mouseX = 0, mouseY = 0, mouseDown = false;
  const mm = e => { mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = (e.clientY / innerHeight) * 2 - 1; };
  const mdn = e => { if (e.target === renderer.domElement) mouseDown = true; };
  const mup = () => mouseDown = false;
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  addEventListener('mousemove', mm); addEventListener('mousedown', mdn); addEventListener('mouseup', mup);
  // Mobile touch controls
  let joyL = null, joyR = null, btnFire = null, btnBoost = null, btnDash = null;
  let joyLX = 0, joyLY = 0, joyRX = 0, joyRY = 0;
  let touchFire = false, touchBoost = false, touchActionTap = false;
  if (MOBILE) {
    // Left joystick: yaw + pitch steering
    joyL = new Joystick({ side: 'left', label: 'STEER', radius: 70,
      onChange: s => { joyLX = s.x; joyLY = s.y; } });
    // Right joystick: throttle (Y up = accelerate, Y down = brake)
    joyR = new Joystick({ side: 'right', label: 'SPEED', radius: 70,
      onChange: s => { joyRX = s.x; joyRY = s.y; } });
    // FIRE button (hold to shoot) — battle mode
    btnFire = new TouchButton({ label: 'FIRE', side: 'right', row: 0, big: true, color: '#ff5e5e',
      onHold: (down) => { touchFire = down; } });
    // BOOST button (hold to boost)
    btnBoost = new TouchButton({ label: 'BOOST', side: 'right', row: 1, color: '#ffb84d',
      onHold: (down) => { touchBoost = down; } });
    // DASH/ITEM button (tap to dash in chase mode OR use item in battle mode)
    btnDash = new TouchButton({ label: 'DASH', side: 'right', row: 2,
      onTap: () => { touchActionTap = true; } });
  }

  let mode = null, phase = 'menu', battleT = 0, chase = null, fireCd = 0, killLog = [];

  // collision with buildings in wrapped space
  function hitBuilding(pos, r = 2) {
    for (const b of buildings) {
      let dx = pos.x - b.x, dz = pos.z - b.z;
      // wrap-aware for battle
      if (mode === 'battle') {
        if (dx > CITY / 2) dx -= CITY; if (dx < -CITY / 2) dx += CITY;
        if (dz > CITY / 2) dz -= CITY; if (dz < -CITY / 2) dz += CITY;
      }
      if (Math.abs(dx) < b.w + r && Math.abs(dz) < b.d + r) {
        const y0 = b.bridge ? b.y0 : 0;
        if (pos.y > y0 - r && pos.y < b.h + r) return true;
      }
    }
    return false;
  }
  function wrapPos(p) {
    if (mode !== 'battle') return;
    if (p.x > CITY / 2) p.x -= CITY; if (p.x < -CITY / 2) p.x += CITY;
    if (p.z > CITY / 2) p.z -= CITY; if (p.z < -CITY / 2) p.z += CITY;
  }
  function findSpawn() {
    for (let i = 0; i < 60; i++) {
      const p = new THREE.Vector3((Math.random() - 0.5) * (CITY - 300), 60 + Math.random() * 120, (Math.random() - 0.5) * (CITY - 300));
      const yaw = Math.random() * Math.PI * 2;
      const behind = p.clone().add(new THREE.Vector3(Math.sin(yaw) * 14, 0, Math.cos(yaw) * 14));
      if (!hitBuilding(p, 10) && !hitBuilding(behind, 8)) return { p, yaw };
    }
    return { p: new THREE.Vector3(0, 220, 0), yaw: 0 };
  }

  function wrapDelta(a, b) { // shortest delta a-b wrapped
    const d = a.clone().sub(b);
    if (mode === 'battle') {
      if (d.x > CITY / 2) d.x -= CITY; if (d.x < -CITY / 2) d.x += CITY;
      if (d.z > CITY / 2) d.z -= CITY; if (d.z < -CITY / 2) d.z += CITY;
    }
    return d;
  }

  function explode(pos, color = 0xffaa55) {
    sfx.boom();
    const g = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.7, 6, 6),
        new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? color : 0xffffff, transparent: true, opacity: 1 }));
      s.position.copy(pos);
      s.userData.v = new THREE.Vector3().randomDirection().multiplyScalar(12 + Math.random() * 22);
      g.add(s);
    }
    g.userData.temp = true;
    scene.add(g);
    explosions.push({ g, life: 0.9 });
  }

  function log(msg) {
    killLog.unshift(msg); killLog = killLog.slice(0, 4);
  }

  function startChase() {
    hidePanel();
    mode = 'chase'; phase = 'play';
    chase = { dist: 0, score: 0, near: 0, breaches: 0, intensity: 1, maxAlt: 200, nextWall: 500, best: bests.get('cyber_chase', 0) };
    const me = ships[0];
    me.pos.set(0, 80, 0); me.yaw = 0; me.pitch = 0; me.speed = 50; me.heat = 0; me.overheat = 0; me.alive = true; me.mesh.visible = true;
    walls.forEach(w => scene.remove(w.group)); walls.length = 0;
    pursuers.forEach((p, i) => { p.mesh.visible = true; p.speed = 60; p.mesh.position.set(p.off, 75, 30 + i * 12); });
    for (let i = 1; i < 4; i++) ships[i].mesh.visible = false;
    crosshair.style.display = 'block';
    hud.showToast(t('cyber_chase_intro'), 2400);
  }

  function startBattle() {
    hidePanel();
    mode = 'battle'; phase = 'play'; battleT = 180; killLog = [];
    ships.forEach((s, i) => {
      const sp = findSpawn();
      s.pos.copy(sp.p); s.yaw = sp.yaw; s.pitch = 0;
      s.speed = 45; s.alive = true; s.score = 0; s.hits = 0; s.kills = 0; s.deaths = 0;
      s.item = null; s.shield = 0; s.stun = 0; s.invuln = 2; s.respawn = 0; s.mesh.visible = true;
    });
    pursuers.forEach(p => { p.mesh.visible = false; p.mesh.position.set(0, -200, 0); });
    crosshair.style.display = 'block';
    hud.showToast(t('cyber_battle_intro'), 2400);
  }

  function endChase() {
    phase = 'done';
    crosshair.style.display = 'none';
    explode(ships[0].pos);
    const sc = Math.round(chase.score);
    const newBest = bests.set('cyber_chase', sc, (a, b) => a > b);
    sfx.lose();
    const stat = (n, v) => `<div class="result-row"><span class="nm">${n}</span><span class="vl">${v}</span></div>`;
    showPanel(`<h2>${t('cyber_chase_title')}</h2>
      <div class="big">${sc} PTS</div>
      ${stat(t('cyber_chase_dist'), (chase.dist / 1000).toFixed(2) + ' KM')}
      ${stat(t('cyber_chase_near'), chase.near)}
      ${stat(t('cyber_chase_breach'), chase.breaches)}
      ${stat(t('cyber_chase_best'), bests.get('cyber_chase'))}
      <p style="margin-top:14px">${newBest ? t('race_new_record') : ''}</p>`, [
      { label: t('btn_restart'), fn: startChase },
      { label: t('btn_menu'), ghost: true, fn: showMenu },
    ]);
  }
  function endBattle() {
    phase = 'done';
    crosshair.style.display = 'none';
    const order = [...ships].sort((a, b) => b.score - a.score);
    const mePos = order.indexOf(ships[0]);
    mePos === 0 ? sfx.win() : sfx.lose();
    const newBest = bests.set('cyber_battle', ships[0].score, (a, b) => a > b);
    showPanel(`<h2>${t('cyber_battle_title')}</h2>
      <div class="big">P${mePos + 1}</div>
      ${resultRows(order.map(s => ({ name: s.name, value: `${s.score} PTS · ${s.hits} HITS · ${s.kills}K/${s.deaths}D` })), mePos)}
      <p style="margin-top:14px">${newBest ? t('race_new_record') : ''}</p>`, [
      { label: t('btn_restart'), fn: startBattle },
      { label: t('btn_menu'), ghost: true, fn: showMenu },
    ]);
  }
  function showMenu() {
    phase = 'menu'; mode = null; crosshair.style.display = 'none';
    walls.forEach(w => scene.remove(w.group)); walls.length = 0;
    pursuers.forEach(p => p.mesh.position.set(0, -100, 0));
    hud.clearCenter();
    showPanel(`<h2>${t('game_cyber')}</h2><p>${t('cyber_menu_intro')}<br>${MOBILE ? t('hint_cyber_m') : t('hint_cyber_d')}</p>`, [
      { label: t('cyber_btn_chase'), fn: startChase },
      { label: t('cyber_btn_battle'), fn: startBattle },
      standalone ? { label: t('btn_hub'), ghost: true, fn: () => location.href = 'index.html' } : { label: t('btn_lobby'), ghost: true, fn: returnToLobby },
    ]);
  }
  showMenu();

  function makeWall(gapY, gapHalf) {
    // blockade wall spanning the canyon with a shrinking gap
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4455, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const W2 = CITY / 2, H = 260;
    const mk = (w, h, x, y) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, 0); g.add(m);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2), new THREE.MeshBasicMaterial({ color: 0xff5566 }));
      edge.position.set(x, y + h / 2, 0.1); g.add(edge);
      const edge2 = edge.clone(); edge2.position.y = y - h / 2; g.add(edge2);
    };
    // gap rectangle centered (0, gapY), half height gapHalf, half width 30
    const gw = 30;
    mk(W2 * 2, Math.max(0.1, gapY - gapHalf), 0, (gapY - gapHalf) / 2); // bottom band
    mk(W2 * 2, Math.max(0.1, H - gapY - gapHalf), 0, (H + gapY + gapHalf) / 2); // top band
    mk(W2 - gw, gapHalf * 2, -(gw + W2) / 2, gapY); // left
    mk(W2 - gw, gapHalf * 2, (gw + W2) / 2, gapY); // right
    g.userData = { gapY, gapHalf, gw };
    return g;
  }

  function shoot(s) {
    sfx.shoot();
    const dir = new THREE.Vector3(Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), Math.cos(s.yaw) * Math.cos(s.pitch)).negate();
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), new THREE.MeshBasicMaterial({ color: s.color }));
    m.userData.temp = true;
    m.position.copy(s.pos).addScaledVector(dir, 3);
    scene.add(m);
    bullets.push({ m, v: dir.multiplyScalar(180), life: 2.2, owner: s.idx });
  }

  function useItemBattle(s) {
    if (!s.item) return;
    const it = s.item; s.item = null;
    if (it === 'shield') { s.shield = 6; sfx.pickup(); if (s.idx === 0) hud.showToast(t('cyber_shield_on')); }
    else if (it === 'dash') { s.dash = 1.2; sfx.boost(); if (s.idx === 0) hud.showToast(t('cyber_dash_toast')); }
    else if (it === 'emp') {
      sfx.beep(200, 0.5, 'sawtooth', 1, -150);
      for (const o of ships) {
        if (o.idx === s.idx || !o.alive) continue;
        if (wrapDelta(o.pos, s.pos).length() < 90) { o.stun = 2.5; log(`${s.name} EMP → ${o.name}`); }
      }
      if (s.idx === 0) hud.showToast(t('cyber_emp'));
    } else if (it === 'shock') {
      sfx.boom();
      for (const o of ships) {
        if (o.idx === s.idx || !o.alive) continue;
        const d = wrapDelta(o.pos, s.pos);
        if (d.length() < 70) {
          registerHit(s, o, true);
        }
      }
      if (s.idx === 0) hud.showToast(t('cyber_shock'));
    }
  }

  function registerHit(attacker, victim, heavy = false) {
    if (victim.invuln > 0 || !victim.alive) return;
    if (victim.shield > 0) { victim.shield -= heavy ? 2 : 1; sfx.hit(); log(`${victim.name} 护盾格挡`); return; }
    attacker.hits++; attacker.score += heavy ? 30 : 10;
    victim.stun = heavy ? 2.2 : 1.3;
    sfx.hit();
    if (victim.idx === 0) hud.showToast(t('cyber_hit_by', attacker.name), 1300);
    log(`${attacker.name} HIT ${victim.name}`);
    // heavy hits can kill if recently hit? keep: stun only, kills from crashes while stunned count to attacker
    victim.lastHitBy = attacker.idx;
  }

  function crashShip(s, why = 'crash') {
    if (!s.alive || s.invuln > 0) return;
    if (s.shield > 0 && mode === 'battle') { s.shield = 0; s.invuln = 1.5; sfx.hit(); return; }
    explode(s.pos, s.color);
    s.alive = false; s.deaths = (s.deaths || 0) + 1; s.respawn = 2.5;
    s.mesh.visible = false;
    const killer = ships[s.lastHitBy];
    if (mode === 'battle') {
      if (killer && killer.idx !== s.idx) { killer.kills++; killer.score += 50; log(`${killer.name} ☠ ${s.name}`); }
      else log(`${s.name} 撞毁`);
    }
    if (s.idx === 0 && mode === 'chase') endChase();
  }

  function update(dt) {
    // rain follows camera
    rain.position.copy(camera.position);
    // On phone: rain particles update every other frame for perf; full update on desktop/tablet.
    if (!PHONE || (performance.now() | 0) % 2 === 0) {
      const rp = rain.geometry.attributes.position;
      for (let i = 0; i < RAIN; i++) {
        let y = rp.getY(i) - dt * 90;
        if (y < 0) y = 160;
        rp.setY(i, y);
      }
      rp.needsUpdate = true;
    }
    for (const t of traffic) {
      if (t.rotation.y === 0) { t.position.z += t.userData.v * dt; if (Math.abs(t.position.z) > CITY / 2) t.position.z *= -1; }
      else { t.position.x += t.userData.v * dt; if (Math.abs(t.position.x) > CITY / 2) t.position.x *= -1; }
    }
    // billboards wobble — throttled on phone
    if (!PHONE || (performance.now() | 0) % 4 === 0) {
      const now = performance.now();
      for (const b of billboards) b.rotation.y += Math.sin(now * 0.001 + b.position.x) * 0.0005;
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i]; e.life -= dt;
      e.g.children.forEach(s => { s.position.addScaledVector(s.userData.v, dt); s.material.opacity = Math.max(0, e.life); });
      if (e.life <= 0) { scene.remove(e.g); explosions.splice(i, 1); }
    }

    if (phase !== 'play') {
      // menu backdrop: slow orbit over city
      // Throttle to ~15fps on phone since the user is reading the panel, not the city.
      if (!PHONE || (performance.now() | 0) % 4 === 0) {
        const tm = performance.now() * 0.00005;
        camera.position.set(Math.cos(tm) * 400, 180, Math.sin(tm) * 400);
        camera.lookAt(0, 60, 0);
      }
      hud.tl.innerHTML = `<b>${t('cyber_hud')}</b>`; hud.tr.innerHTML = ''; hud.bl.innerHTML = ''; hud.bc.innerHTML = '';
      return;
    }

    const me = ships[0];
    if (mode === 'battle') {
      battleT -= dt;
      if (battleT <= 0) { battleT = 0; endBattle(); return; }
    }

    // ---- respawns ----
    for (const s of ships) {
      if (mode === 'chase' && s.idx > 0) continue;
      if (!s.alive) {
        s.respawn -= dt;
        if (s.respawn <= 0) {
          s.alive = true; s.mesh.visible = true; s.invuln = 2.5; s.stun = 0;
          const sp = findSpawn();
          s.pos.copy(sp.p); s.yaw = sp.yaw; s.pitch = 0;
          s.speed = 45;
          if (s.idx === 0) hud.showToast(t('cyber_respawn'), 900);
        }
        continue;
      }
      if (s.invuln > 0) { s.invuln -= dt; s.mesh.visible = Math.sin(performance.now() * 0.02) > -0.4; }
      else s.mesh.visible = true;
      if (s.stun > 0) s.stun -= dt;
      if (s.shield > 0) s.shield -= dt * (s.shieldOn ? 0 : 0); // shield decays on use; passive
      if (s.dash > 0) s.dash -= dt;
    }

    // ---- player control ----
    if (me.alive) {
      if (me.stun <= 0) {
        // Desktop: mouse-driven yaw/pitch; Mobile: left joystick yaw/pitch
        let targetYaw, targetPitch;
        if (MOBILE) {
          targetYaw = me.yaw + joyLX * dt * 2.6;
          targetPitch = clamp(me.pitch + joyLY * dt * 2.0, -1.1, 1.1);
        } else {
          targetYaw = me.yaw + mouseX * dt * 2.6;
          targetPitch = clamp(me.pitch - mouseY * dt * 2.0, -1.1, 1.1);
        }
        me.yaw = targetYaw; me.pitch = lerp(me.pitch, targetPitch, 1 - Math.exp(-6 * dt));
        // Throttle: desktop W/S; mobile right joystick Y
        if (keys.KeyW) me.speed += 45 * dt;
        if (keys.KeyS) me.speed -= 55 * dt;
        if (MOBILE) {
          if (joyRY < -0.15) me.speed += (-joyRY) * 45 * dt;
          if (joyRY > 0.15) me.speed -= joyRY * 55 * dt;
        }
        // shift boost with heat
        const boostActive = keys.ShiftLeft || (MOBILE && touchBoost);
        if (boostActive && me.overheat <= 0) {
          me.speed += 60 * dt; me.heat += dt * 0.55;
          if (me.heat >= 1) { me.overheat = 2.2; me.heat = 1; sfx.beep(180, 0.4, 'square', 0.8, -80); hud.showToast(t('cyber_overheat'), 1400); }
        } else me.heat = Math.max(0, me.heat - dt * 0.3);
        if (me.overheat > 0) me.overheat -= dt;
        // space: upward dash (chase mode) — desktop
        const dashTap = MOBILE ? touchActionTap : keys.Space;
        if (mode === 'chase' && dashTap && (!me.dashCd || me.dashCd <= 0)) { me.dashCd = 2.5; me.vy = 55; sfx.boost(); touchActionTap = false; keys.Space = false; }
      }
      if (me.dashCd > 0) me.dashCd -= dt;
      const maxS = mode === 'chase' ? 130 : 110;
      me.speed = clamp(me.speed, 20, maxS + (me.dash > 0 ? 60 : 0));
      const dir = new THREE.Vector3(-Math.sin(me.yaw) * Math.cos(me.pitch), Math.sin(me.pitch), -Math.cos(me.yaw) * Math.cos(me.pitch));
      me.pos.addScaledVector(dir, me.speed * dt * (me.stun > 0 ? 0.3 : 1));
      if (me.vy) { me.pos.y += me.vy * dt; me.vy = lerp(me.vy, 0, 1 - Math.exp(-3 * dt)); if (Math.abs(me.vy) < 1) me.vy = 0; }
      // altitude
      const ceiling = mode === 'chase' ? chase.maxAlt : 240;
      if (me.pos.y > ceiling) me.pos.y = ceiling;
      if (me.pos.y < 4) { me.pos.y = 4; if (mode === 'chase') crashShip(me); }
      wrapPos(me.pos);
      // building collision
      if (hitBuilding(me.pos)) {
        if (mode === 'chase') { endChase(); return; }
        crashShip(me);
      }
      // battle shooting — desktop: mouseDown; mobile: touchFire
      const fireActive = mode === 'battle' && (mouseDown || (MOBILE && touchFire)) && me.stun <= 0;
      if (fireActive) {
        fireCd -= dt;
        if (fireCd <= 0) { fireCd = 0.18; shoot(me); }
      }
      const itemTap = MOBILE ? touchActionTap : keys.KeyE;
      if (mode === 'battle' && itemTap && me.item) { useItemBattle(me); keys.KeyE = false; touchActionTap = false; }
      if (mode === 'battle' && keys.Space && me.item) { useItemBattle(me); keys.Space = false; }
    }

    // ---- chase mode logic ----
    if (mode === 'chase' && me.alive) {
      // recycle city around the player → endless canyon
      let cityShifted = false;
      for (const b of buildings) {
        while (b.z - me.pos.z > CITY / 2) { b.z -= CITY; b.mesh.position.z -= CITY; cityShifted = true; }
        while (b.z - me.pos.z < -CITY / 2) { b.z += CITY; b.mesh.position.z += CITY; cityShifted = true; }
        while (b.x - me.pos.x > CITY / 2) { b.x -= CITY; b.mesh.position.x -= CITY; cityShifted = true; }
        while (b.x - me.pos.x < -CITY / 2) { b.x += CITY; b.mesh.position.x += CITY; cityShifted = true; }
      }
      if (cityShifted) for (const bb of billboards) {
        const b = bb.userData.bld;
        bb.position.set(b.x + bb.userData.ox, b.h * bb.userData.fy, b.z + b.d + 0.6);
      }
      for (const t of traffic) {
        for (const ax of ['x', 'z']) {
          while (t.position[ax] - me.pos[ax] > CITY / 2) t.position[ax] -= CITY;
          while (t.position[ax] - me.pos[ax] < -CITY / 2) t.position[ax] += CITY;
        }
      }
      chase.dist += me.speed * dt;
      chase.score += me.speed * dt * 0.12 * chase.intensity;
      // near miss detection
      for (const b of buildings) {
        if (b.bridge) continue;
        const dx = me.pos.x - b.x, dz = me.pos.z - b.z;
        if (Math.abs(dx) < b.w + 7 && Math.abs(dz) < b.d + 7 && me.pos.y < b.h) {
          if (!b.nearCd || b.nearCd <= 0) { b.nearCd = 2; chase.near++; chase.score += 25; hud.showToast('NEAR MISS +25', 500); sfx.beep(1200, 0.05, 'square', 0.5); }
        }
        if (b.nearCd > 0) b.nearCd -= dt;
      }
      // walls
      chase.nextWall -= me.speed * dt;
      if (chase.nextWall <= 0) {
        const gapY = 30 + Math.random() * (chase.maxAlt - 60);
        const gapHalf = Math.max(9, 26 - chase.breaches * 3);
        const w = makeWall(gapY, gapHalf);
        w.position.set(me.pos.x, 0, me.pos.z - 700);
        scene.add(w);
        walls.push({ group: w, z: me.pos.z - 700, ...w.userData, passed: false });
        chase.nextWall = 620;
        hud.showToast('前方封锁 — 穿过缺口!', 1500);
      }
      for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        const dz = w.z - me.pos.z;
        if (!w.passed && dz > 0) {
          w.passed = true;
          const inGap = Math.abs(me.pos.x - w.group.position.x) < w.gw - 2 && Math.abs(me.pos.y - w.gapY) < w.gapHalf - 2;
          if (inGap) {
            chase.breaches++; chase.score += 200; chase.intensity += 0.35;
            chase.maxAlt = Math.max(90, chase.maxAlt - 12);
            pursuers.forEach(p => p.speed += 6);
            sfx.win(); hud.showToast(`突破封锁! +200 · 追捕增强 · 升限 ${chase.maxAlt | 0}m`, 2000);
          } else { endChase(); return; }
        }
        if (dz > 200) { scene.remove(w.group); walls.splice(i, 1); }
      }
      // pursuers chase
      for (const p of pursuers) {
        const target = me.pos.clone(); target.x += p.off; target.y -= 3; target.z += 24;
        p.mesh.position.lerp(target, 1 - Math.exp(-1.2 * dt * chase.intensity));
        p.mesh.lookAt(me.pos);
        // if pursuer catches you
        if (p.mesh.position.distanceTo(me.pos) < 6) { endChase(); return; }
      }
      // camera: behind ship
      const camT = me.pos.clone().add(new THREE.Vector3(Math.sin(me.yaw) * 12, 4, Math.cos(me.yaw) * 12));
      camera.position.lerp(camT, 1 - Math.exp(-8 * dt));
      camera.lookAt(me.pos.x - Math.sin(me.yaw) * 10, me.pos.y + me.pitch * 8, me.pos.z - Math.cos(me.yaw) * 10);
      hud.tl.innerHTML = `<b>${t('cyber_chase_hud')}</b> · ${t('cyber_chase_intensity')} <b>x${chase.intensity.toFixed(2)}</b><br>SCORE <b>${Math.round(chase.score)}</b>`;
      hud.tr.innerHTML = `DIST <b>${(chase.dist / 1000).toFixed(2)} KM</b><br>ALT <b>${me.pos.y | 0}/${chase.maxAlt | 0}m</b>`;
      hud.bl.innerHTML = `SPEED <b>${me.speed * 3.6 | 0} KM/H</b><div class="bar heat"><i style="width:${me.heat * 100}%"></i></div>${me.overheat > 0 ? '<span class="hud-warn">' + t('cyber_overheat_label') + '</span>' : t('cyber_boost_hint')}`;
      hud.bc.innerHTML = t('cyber_chase_bc', chase.near, chase.breaches, chase.best);
    }

    // ---- battle mode logic ----
    if (mode === 'battle') {
      // NPC AI
      for (const s of ships) {
        if (s.idx === 0 || !s.alive) continue;
        s.aiT -= dt;
        if (s.aiT <= 0) {
          s.aiT = 1 + Math.random() * 2;
          // pick nearest alive enemy
          let bd = 1e9; s.target = null;
          for (const o of ships) {
            if (o.idx === s.idx || !o.alive) continue;
            const d = wrapDelta(o.pos, s.pos).length();
            if (d < bd) { bd = d; s.target = o; }
          }
        }
        if (s.stun <= 0 && s.target && s.target.alive) {
          const d = wrapDelta(s.target.pos, s.pos);
          const wantYaw = Math.atan2(-d.x, -d.z);
          let dy = wantYaw - s.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          s.yaw += clamp(dy, -1.6 * dt, 1.6 * dt);
          const wantPitch = clamp(Math.asin(clamp(d.y / Math.max(1, d.length()), -1, 1)), -0.8, 0.8);
          s.pitch = lerp(s.pitch, wantPitch, 1 - Math.exp(-3 * dt));
          s.speed = lerp(s.speed, d.length() > 60 ? 70 : 35, dt);
          // avoid buildings: raycast-ish lookahead
          const look = s.pos.clone().add(new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw)).multiplyScalar(26));
          if (hitBuilding(look, 4) || look.y < 12) s.pitch = lerp(s.pitch, 0.5, 0.5);
          if (look.y > 220) s.pitch = lerp(s.pitch, -0.4, 0.3);
          // shoot when roughly aligned
          if (Math.abs(dy) < 0.12 && d.length() < 160 && Math.random() < dt * 3) shoot(s);
          // use items
          if (s.item && Math.random() < dt * 0.6) useItemBattle(s);
        }
        const dir = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));
        s.pos.addScaledVector(dir, s.speed * dt * (s.stun > 0 ? 0.3 : 1) * (s.dash > 0 ? 2.2 : 1));
        s.pos.y = clamp(s.pos.y, 6, 240);
        wrapPos(s.pos);
        if (hitBuilding(s.pos)) crashShip(s);
      }
      // pickups
      for (const p of pickups) {
        if (p.userData.taken > 0) { p.userData.taken -= dt; p.visible = p.userData.taken <= 0; continue; }
        p.rotation.y += dt * 2; p.rotation.x += dt;
        for (const s of ships) {
          if (!s.alive || s.item) continue;
          if (wrapDelta(p.position, s.pos).length() < 4) {
            p.userData.taken = 12; p.visible = false;
            s.item = p.userData.kind;
            if (s.idx === 0) { sfx.pickup(); hud.showToast('拾取 ' + p.userData.kind.toUpperCase() + ' · SPACE 使用'); }
          }
        }
      }
      // bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.life -= dt;
        b.m.position.addScaledVector(b.v, dt);
        wrapPos(b.m.position);
        let dead = b.life <= 0 || hitBuilding(b.m.position, 0.5);
        if (!dead) for (const s of ships) {
          if (s.idx === b.owner || !s.alive || s.invuln > 0) continue;
          if (wrapDelta(b.m.position, s.pos).length() < 2.6) {
            registerHit(ships[b.owner], s);
            dead = true; break;
          }
        }
        if (dead) { scene.remove(b.m); bullets.splice(i, 1); }
      }
      // camera
      const camT = me.pos.clone().add(new THREE.Vector3(Math.sin(me.yaw) * 11, 3.5, Math.cos(me.yaw) * 11));
      camera.position.lerp(camT, 1 - Math.exp(-9 * dt));
      camera.lookAt(me.pos.x - Math.sin(me.yaw) * 10, me.pos.y + me.pitch * 8, me.pos.z - Math.cos(me.yaw) * 10);
      const order = [...ships].sort((a, b) => b.score - a.score);
      hud.tl.innerHTML = `<b>${t('cyber_battle_hud')}</b> · POS <b>P${order.indexOf(me) + 1}/4</b><br>SCORE <b>${me.score}</b> · HITS <b>${me.hits}</b>`;
      hud.tr.innerHTML = `${t('race_time')} <b class="${battleT < 20 ? 'hud-warn' : ''}">${fmtTime(battleT)}</b><br>SPD <b>${me.speed * 3.6 | 0}</b>`;
      hud.bl.innerHTML = `${t('race_item')} <b>${me.item ? me.item.toUpperCase() : '—'}</b>${me.shield > 0 ? ' · <span style="color:#8dff6a">' + t('cyber_shield_on') + '</span>' : ''}<div class="bar heat"><i style="width:${me.heat * 100}%"></i></div>`;
      hud.bc.innerHTML = killLog.join('<br>') || order.map((s, i) => `${i + 1}. ${s.name} ${s.score}`).join(' · ');
    }

    // ---- ship visuals ----
    for (const s of ships) {
      if (mode === 'chase' && s.idx > 0) continue;
      s.mesh.position.copy(s.pos);
      s.mesh.rotation.set(0, 0, 0);
      s.mesh.rotateY(s.yaw + Math.PI); // model forward
      s.mesh.rotateX(-s.pitch * 0.7);
      if (s.stun > 0) s.mesh.rotateZ(Math.sin(performance.now() * 0.04) * 0.4);
      s.mesh.userData.jet.scale.setScalar(0.7 + s.speed / 90 + (s.dash > 0 ? 1.2 : 0));
      if (s.shield > 0) {
        if (!s.shieldMesh) {
          s.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10),
            new THREE.MeshBasicMaterial({ color: 0x8dff6a, transparent: true, opacity: 0.18, depthWrite: false }));
          s.mesh.add(s.shieldMesh);
        }
        s.shieldMesh.visible = true;
      } else if (s.shieldMesh) s.shieldMesh.visible = false;
    }
  }

  return {
    scene, camera, update, hideMenu: true,
    hint: MOBILE ? '左摇杆 方向 · 右摇杆 加速 · FIRE 射击 · BOOST 加速 · DASH 突进/道具 · 顶部 ‖ 暂停' : '鼠标 方向 · W/S 调速 · SHIFT 加速 · SPACE 突进/道具 · 左键射击 · ESC 暂停',
    pause() { }, resume() { },
    dispose() {
      hud.hide(); hidePanel();
      crosshair.style.display = 'none';
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      removeEventListener('mousemove', mm); removeEventListener('mousedown', mdn); removeEventListener('mouseup', mup);
      if (MOBILE) {
        if (joyL) joyL.dispose();
        if (joyR) joyR.dispose();
        if (btnFire) btnFire.dispose();
        if (btnBoost) btnBoost.dispose();
        if (btnDash) btnDash.dispose();
      }
    },
  };
}
