// MOON RACE — 8.8km crater-ring hover race vs 3 NPC Kimis
import * as THREE from '../vendor/three.module.js';
import { CREW, makeKimi, makeNameSprite, canvasTex, sfx, buildHUD, showPanel, hidePanel, resultRows, fmtTime, clamp, lerp, bests, MOBILE, PHONE, shadowMapSize, shouldEnableShadows, mobileScale } from './common.js';
import { Joystick, TouchButton } from './touch.js';
import { t } from './i18n.js';

const R = 1400;                 // track radius → circumference ≈ 8.8 km
const W = 9;                    // half width
const LAPS = 2;
const SECTORS = 16;
const CIRC = 2 * Math.PI * R;

function centerAt(th) { return new THREE.Vector3(R * Math.cos(th), 6 * Math.sin(3 * th) + 4 * Math.sin(7 * th + 1), R * Math.sin(th)); }
function tangentAt(th) { return new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)); }
function terrainH(x, z) {
  const r = Math.hypot(x, z), d = Math.abs(r - R);
  let h = Math.sin(x * 0.01) * Math.cos(z * 0.012) * 9 + Math.sin(x * 0.05 + 2) * Math.cos(z * 0.04) * 3 + Math.sin(x * 0.2) * Math.sin(z * 0.17) * 0.8;
  if (d < 60) { // blend toward road height
    const th = Math.atan2(z, x);
    const rh = 6 * Math.sin(3 * th) + 4 * Math.sin(7 * th + 1);
    h = lerp(rh - 0.6, h, clamp((d - W) / (60 - W), 0, 1));
  }
  return h;
}

function buildCar(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8dce4, roughness: 0.35, metalness: 0.6 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 2.6, 6, 12), bodyMat);
  hull.rotation.z = Math.PI / 2; hull.position.y = 0.7; hull.castShadow = true; g.add(hull);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.6, metalness: 0.5 }));
  skirt.position.y = 0.25; g.add(skirt);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.09, 8, 24), new THREE.MeshBasicMaterial({ color }));
  glow.rotation.x = Math.PI / 2; glow.position.y = 0.05; g.add(glow);
  const kimi = makeKimi(color, 0.9); kimi.position.set(0, 1.35, -0.2); g.add(kimi);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 10), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.8 }));
  flame.rotation.x = Math.PI / 2; flame.position.set(0, 0.55, 2.6); g.add(flame);
  g.userData.flame = flame; g.userData.glow = glow;
  return g;
}

export function start(ctx) {
  const { renderer, returnToLobby, standalone } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000004);
  scene.fog = new THREE.Fog(0x000004, 200, 900);
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.5, 3000);

  scene.add(new THREE.AmbientLight(0x445577, 0.85));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(500, 800, 300); scene.add(sun);
  // stars
  {
    const n = PHONE ? 400 : (MOBILE ? 800 : 2000), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2600, t = Math.random() * Math.PI * 2, p = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = Math.abs(r * Math.cos(p)); pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.6, sizeAttenuation: false })));
  }
  // earth
  {
    const earthTex = canvasTex(256, 128, (x, w, h) => {
      x.fillStyle = '#1c4d8f'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#3f7a3a'; for (let i = 0; i < 18; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 12 + Math.random() * 30, 8 + Math.random() * 16, 0, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 22; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 24, 4 + Math.random() * 8, 0, 0, 7); x.fill(); }
    });
    const e = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 24), new THREE.MeshStandardMaterial({ map: earthTex, emissive: 0x113355, emissiveIntensity: 0.6 }));
    e.position.set(800, 500, -1800); scene.add(e);
  }

  // terrain (chunked ring region only for perf)
  {
    const G = 3400, SEG = PHONE ? 80 : (MOBILE ? 110 : 170);
    const geo = new THREE.PlaneGeometry(G, G, SEG, SEG); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const tex = canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#8f8f98'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${90 + Math.random() * 60 | 0},${100 + Math.random() * 60 | 0},.55)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    tex.repeat.set(40, 40);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    scene.add(m);
  }

  // road ribbon
  {
    const N = 720, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const th = i / N * Math.PI * 2, c = centerAt(th), t = tangentAt(th);
      const nx = -t.z, nz = t.x;
      pos.push(c.x + nx * W, c.y, c.z + nz * W, c.x - nx * W, c.y, c.z - nz * W);
      uv.push(0, i / N * 220, 1, i / N * 220);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const rt = canvasTex(128, 128, (x, w, h) => {
      x.fillStyle = '#3a3f4a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#4da3ff'; x.lineWidth = 5;
      x.beginPath(); x.moveTo(6, 0); x.lineTo(6, h); x.moveTo(w - 6, 0); x.lineTo(w - 6, h); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    });
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: rt, roughness: 0.7, metalness: 0.25, side: THREE.DoubleSide }));
    scene.add(road);
    // guard glow rails
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 360; i++) {
        const th = i / 360 * Math.PI * 2, c = centerAt(th), t = tangentAt(th);
        pts.push(new THREE.Vector3(c.x - t.z * (W + 0.4) * s, c.y + 0.9, c.z + t.x * (W + 0.4) * s));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 360, 0.12, 6, true),
        new THREE.MeshBasicMaterial({ color: 0x4da3ff }));
      scene.add(tube);
    }
  }

  // item boxes
  const boxes = [];
  const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x4da3ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
  const boxCount = Math.round((PHONE ? 22 : 44) * mobileScale());
  for (let i = 0; i < boxCount; i++) {
    const th = i / 44 * Math.PI * 2 + 0.03, c = centerAt(th), t = tangentAt(th);
    const off = (Math.random() * 2 - 1) * (W - 2.5);
    const m = new THREE.Mesh(boxGeo, boxMat);
    m.position.set(c.x - t.z * off, c.y + 1.2, c.z + t.x * off);
    m.userData = { taken: 0 };
    scene.add(m); boxes.push(m);
  }

  // racers
  const racers = CREW.map((c, i) => {
    const mesh = buildCar(c.color);
    const tag = makeNameSprite(c.name, i === 0 ? '#7fb8ff' : '#fff');
    tag.position.y = 2.8; tag.scale.set(3, 0.75, 1); mesh.add(tag);
    scene.add(mesh);
    const th0 = -0.012 * (i + 1);
    return {
      ...c, mesh, idx: i,
      th: th0, lat: (i % 2 ? 3.5 : -3.5) * (i > 1 ? -1 : 1),
      speed: 0, yaw: 0, lap: 0, sector: SECTORS - 1 - 0, passed: 0,
      item: null, spin: 0, boost: 0, finished: false, finishTime: 0,
      bestLap: null, lapStart: 0, progress: 0, offTrack: false,
    };
  });

  // projectiles & bananas
  const rockets = [], bananas = [];

  const hud = buildHUD(document.body, ['tl', 'tr', 'bc', 'bl']);
  const keys = {};
  // Touch state
  let joyX = 0, joyY = 0;
  let touchBoost = false, touchItemTap = false;
  const kd = e => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return; keys[e.code] = true; };
  const ku = e => keys[e.code] = false;
  // Mobile controls
  let joystick = null, btnBoost = null, btnItem = null;
  if (MOBILE) {
    joystick = new Joystick({
      side: 'left', label: 'STEER',
      onChange: s => { joyX = s.x; joyY = s.y; },
    });
    btnBoost = new TouchButton({
      label: 'BOOST', side: 'right', row: 0, big: true, color: '#ffb84d',
      onHold: (down) => { touchBoost = down; },
    });
    btnItem = new TouchButton({
      label: 'ITEM', side: 'right', row: 1,
      onTap: () => { touchItemTap = true; },
    });
  }
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  let phase = 'count', t0 = performance.now(), count = 3, lastCount = 4, raceT = 0;
  hud.countdown(3);

  function resetRace() {
    hidePanel();
    racers.forEach((r, i) => {
      r.th = -0.012 * (i + 1); r.lat = (i % 2 ? 3.5 : -3.5) * (i > 1 ? -1 : 1);
      r.speed = 0; r.lap = 0; r.sector = SECTORS - 1; r.item = null; r.spin = 0; r.boost = 0;
      r.finished = false; r.bestLap = null; r.lapStart = 0;
    });
    rockets.length = 0; bananas.length = 0;
    scene.children.filter(o => o.userData.temp).forEach(o => scene.remove(o));
    phase = 'count'; count = 3; lastCount = 4; raceT = 0; t0 = performance.now();
    hud.countdown(3);
  }

  function sectorOf(th) { let a = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return Math.floor(a / (2 * Math.PI) * SECTORS); }

  function useItem(r) {
    if (!r.item || phase !== 'race') return;
    const it = r.item; r.item = null;
    if (it === 'boost') { r.boost = 2.2; sfx.boost(); if (r.idx === 0) hud.showToast(t('race_boost_toast')); }
    else if (it === 'rocket') {
      sfx.shoot();
      const c = centerAt(r.th), tan = tangentAt(r.th);
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.8, 8), new THREE.MeshBasicMaterial({ color: 0xff8855 }));
      m.userData.temp = true;
      m.position.copy(r.mesh.position).add(new THREE.Vector3(0, 0.8, 0));
      m.rotation.x = Math.PI / 2;
      scene.add(m);
      rockets.push({ m, th: r.th, owner: r.idx, life: 4 });
      if (r.idx === 0) hud.showToast(t('race_rocket_toast'));
    } else if (it === 'banana') {
      sfx.beep(300, 0.15, 'triangle', 0.8);
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.28, 8, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffe14d, roughness: 0.5 }));
      m.userData.temp = true;
      const tan = tangentAt(r.th);
      m.position.copy(r.mesh.position).addScaledVector(tan, -4).setY(centerAt(r.th - 0.003).y + 0.5);
      scene.add(m);
      bananas.push({ m, th: r.th - 0.0035, lat: r.lat });
      if (r.idx === 0) hud.showToast(t('race_banana_toast'));
    }
  }

  function spinOut(r, cause) {
    if (r.spin > 0 || r.finished) return;
    r.spin = 1.6; r.speed *= 0.25; sfx.hit();
    if (r.idx === 0) hud.showToast(t('race_hit_toast', cause), 1500);
    else if (cause === 'ROCKET') hud.showToast(t('race_rocket_hit_toast', r.name), 1200);
  }

  function finishRace() {
    phase = 'done';
    const me = racers[0];
    const order = [...racers].sort((a, b) => (a.finished && b.finished) ? a.finishTime - b.finishTime : a.finished ? -1 : b.finished ? 1 : b.progress - a.progress);
    const mePos = order.indexOf(me);
    if (mePos === 0) sfx.win(); else sfx.lose();
    const newBest = bests.set('race_time', me.finishTime, (a, b) => a < b);
    const best = bests.get('race_time');
    showPanel(`<h2>${t('race_result_title')}</h2>
      <div class="big">P${mePos + 1}</div>
      ${resultRows(order.map(r => ({ name: r.name, value: r.finished ? fmtTime(r.finishTime) : t('race_dnf') })), mePos)}
      <p style="margin-top:14px">${t('race_your_time', fmtTime(me.finishTime), me.bestLap ? fmtTime(me.bestLap) : '—')}<br>
      ${t('race_all_best', best ? fmtTime(best) : '—')} ${newBest ? t('race_new_record') : ''}</p>`, [
      { label: t('btn_restart'), fn: resetRace },
      standalone ? { label: t('btn_menu'), ghost: true, fn: () => location.reload() } : { label: t('btn_lobby'), ghost: true, fn: returnToLobby },
    ]);
  }

  function update(dt) {
    // countdown
    if (phase === 'count') {
      const el = (performance.now() - t0) / 1000;
      const c = 3 - Math.floor(el);
      if (c !== lastCount && c > 0) { lastCount = c; hud.countdown(c); sfx.count(false); }
      if (el >= 3.8) { phase = 'race'; raceT = 0; hud.countdown(0, 'GO!'); sfx.count(true); setTimeout(() => hud.clearCenter(), 800); }
    }
    if (phase === 'race') raceT += dt;

    // rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
      const rk = rockets[i]; rk.life -= dt; rk.th += dt * 90 / R;
      // home to nearest racer ahead
      let target = null, bestD = 1e9;
      for (const r of racers) {
        if (r.idx === rk.owner || r.finished) continue;
        let d = r.th - rk.th; if (d < 0) d += Math.PI * 2;
        if (d * R < bestD && d * R < 300) { bestD = d * R; target = r; }
      }
      const c = centerAt(rk.th);
      if (target) rk.m.position.lerp(new THREE.Vector3(target.mesh.position.x, c.y + 1, target.mesh.position.z), 1 - Math.exp(-3 * dt));
      else rk.m.position.set(c.x, c.y + 1, c.z);
      if (target && rk.m.position.distanceTo(target.mesh.position) < 3.5) { spinOut(target, 'ROCKET'); scene.remove(rk.m); rockets.splice(i, 1); continue; }
      if (rk.life <= 0) { scene.remove(rk.m); rockets.splice(i, 1); }
    }

    // racers
    for (const r of racers) {
      if (r.finished) { r.speed = lerp(r.speed, 30, dt); }
      if (r.spin > 0) { r.spin -= dt; r.mesh.rotation.y += dt * 14; }
      const c = centerAt(r.th), tan = tangentAt(r.th);
      let targetSpeed, steerTarget = 0;
      if (r.idx === 0) {
        // player
        const accel = phase === 'race' && r.spin <= 0 ? (keys.KeyW ? 42 : 0) : 0;
        const brake = (keys.KeyS && phase === 'race') ? 55 : 0;
        r.speed += (accel - brake) * dt;
        const maxS = r.offTrack ? 26 : 62;
        const boostActive = (keys.ShiftLeft && phase === 'race') || (MOBILE && touchBoost && phase === 'race');
        r.speed = clamp(r.speed, -12, maxS + (r.boost > 0 ? 26 : 0) + (boostActive ? 8 : 0));
        if (!keys.KeyW && !keys.KeyS && !(MOBILE && joyY < -0.05)) r.speed = lerp(r.speed, 0, 1 - Math.exp(-0.5 * dt));
        const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0) + (MOBILE ? joyX : 0);
        r.lat += steer * dt * (10 + r.speed * 0.12);
        if ((keys.Space && r.item) || (MOBILE && touchItemTap && r.item)) { useItem(r); keys.Space = false; touchItemTap = false; }
        // Mobile: joystick Y axis — up = accelerate (joyY < 0)
        if (MOBILE && phase === 'race' && r.spin <= 0) {
          if (joyY < -0.15) r.speed += (-joyY) * 42 * dt;
          if (joyY > 0.15) r.speed -= joyY * 55 * dt;
        }
      } else {
        // NPC driver: follow centerline with personal lateral line + rubber banding
        const meP = racers[0];
        const diff = (meP.lap * CIRC + meP.th * R) - (r.lap * CIRC + r.th * R);
        let want = 52 + r.idx * 1.5 + clamp(diff * 0.02, -6, 10); // rubber band
        if (phase !== 'race') want = 0;
        if (r.spin > 0) want = 8;
        r.speed = lerp(r.speed, want + (r.boost > 0 ? 22 : 0), 1 - Math.exp(-1.2 * dt));
        const wantLat = Math.sin(r.th * 5 + r.idx * 2) * (W - 3);
        r.lat = lerp(r.lat, wantLat, 1 - Math.exp(-1.5 * dt));
        // NPC uses items
        if (r.item && Math.random() < dt * 0.5) useItem(r);
      }
      if (r.boost > 0) r.boost -= dt;
      // advance along track
      r.th += r.speed * dt / R;
      // lateral limits
      if (Math.abs(r.lat) > W - 1.2) { r.lat = clamp(r.lat, -(W + 6), W + 6); r.offTrack = Math.abs(r.lat) > W; }
      else r.offTrack = false;
      if (r.offTrack) r.speed = Math.min(r.speed, 26);

      // checkpoints / laps
      const sec = sectorOf(r.th);
      if (sec !== r.sector) {
        const prev = r.sector;
        r.sector = sec;
        if (prev === SECTORS - 1 && sec === 0 && phase === 'race') {
          if (r.lap > 0 || r.th > 0) {
            const lapTime = raceT - r.lapStart; r.lapStart = raceT;
            if (r.lap >= 0 && lapTime > 5) { if (!r.bestLap || lapTime < r.bestLap) r.bestLap = lapTime; if (r.idx === 0 && r.lap > 0) hud.showToast(t('race_lap_toast', r.lap + 1, fmtTime(lapTime)), 1600); }
          }
          r.lap++;
          if (r.lap > LAPS && !r.finished) {
            r.finished = true; r.finishTime = raceT;
            if (r.idx === 0) finishRace();
          }
        }
      }
      r.progress = r.lap * SECTORS + r.sector;

      // position on track
      const px = c.x - tan.z * r.lat, pz = c.z + tan.x * r.lat;
      const py = terrainH(px, pz);
      const hover = (r.offTrack ? 0.7 : 1.1) + Math.sin(performance.now() * 0.005 + r.idx) * 0.12;
      r.mesh.position.set(px, lerp(r.mesh.position.y || py + hover, py + hover, 1 - Math.exp(-10 * dt)), pz);
      const heading = Math.atan2(tan.x, tan.z) + clamp(-r.lat * 0.02, -0.4, 0.4) + (r.idx === 0 ? ((keys.KeyA ? 0.25 : 0) - (keys.KeyD ? 0.25 : 0)) : 0);
      if (r.spin <= 0) r.mesh.rotation.y = lerp(r.mesh.rotation.y, heading, 1 - Math.exp(-8 * dt));
      r.mesh.rotation.z = clamp(-(r.idx === 0 ? ((keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0) + (MOBILE ? joyX : 0)) : 0) * 0.18, -0.3, 0.3);
      r.mesh.userData.flame.scale.setScalar(0.6 + Math.max(0, r.speed) / 50 + (r.boost > 0 ? 0.8 : 0));
      r.mesh.userData.glow.material.color.setHex(r.boost > 0 ? 0xffffff : r.color);

      // item box pickup
      for (const b of boxes) {
        if (b.userData.taken > 0) { b.userData.taken -= dt; b.visible = b.userData.taken <= 0; continue; }
        if (b.visible && b.position.distanceTo(r.mesh.position) < 3) {
          b.userData.taken = 6; b.visible = false;
          if (!r.item) {
            r.item = ['rocket', 'banana', 'boost'][Math.floor(Math.random() * 3)];
            if (r.idx === 0) { sfx.pickup(); hud.showToast(t('race_got', r.item.toUpperCase())); }
          }
        }
      }
      // banana slip
      for (let i = bananas.length - 1; i >= 0; i--) {
        const bn = bananas[i];
        if (bn.m.position.distanceTo(r.mesh.position) < 2.4) {
          spinOut(r, 'BANANA'); scene.remove(bn.m); bananas.splice(i, 1);
        }
      }
    }

    // ranking
    const order = [...racers].sort((a, b) => b.progress - a.progress || b.th - a.th);
    const mePos = order.indexOf(racers[0]);
    const me = racers[0];
    hud.tl.innerHTML = `<b>${t('race_hud')}</b><br>${t('race_lap', Math.min(me.lap, LAPS), LAPS)} · POS <b>${t('race_pos', mePos + 1)}</b>`;
    hud.tr.innerHTML = `${t('race_time')} <b>${fmtTime(raceT)}</b><br>${t('race_speed', Math.max(0, me.speed * 3.6 | 0))}`;
    hud.bl.innerHTML = `${t('race_item')} <b>${me.item ? me.item.toUpperCase() : '—'}</b>${me.boost > 0 ? ' · <span class="hud-warn">' + t('race_boost') + '</span>' : ''}`;
    hud.bc.innerHTML = order.map((r, i) => `${i + 1}. ${r.name}`).join(' · ');

    // chase camera
    const tan = tangentAt(me.th);
    const back = me.mesh.position.clone().addScaledVector(tan, -13).add(new THREE.Vector3(0, 5.5, 0));
    const minY = terrainH(back.x, back.z) + 1.2; if (back.y < minY) back.y = minY;
    camera.position.lerp(back, 1 - Math.exp(-5 * dt));
    camera.lookAt(me.mesh.position.x, me.mesh.position.y + 1.5, me.mesh.position.z);
    // boxes spin — throttled on phone for perf
    if (!PHONE || (performance.now() | 0) % 2 === 0) {
      for (const b of boxes) if (b.visible) b.rotation.y += dt * 2;
    }
  }

  return {
    scene, camera, update, hideMenu: true,
    hint: MOBILE ? t('hint_race_m') : t('hint_race_d'),
    pause() { }, resume() { },
    dispose() {
      hud.hide(); hidePanel();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      if (MOBILE) {
        if (joystick) joystick.dispose();
        if (btnBoost) btnBoost.dispose();
        if (btnItem) btnItem.dispose();
      }
    },
  };
}
