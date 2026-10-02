// VENICE SPEED — dawn canal gondola: ferry missions & water race
import * as THREE from '../vendor/three.module.js';
import { CREW, makeKimi, makeNameSprite, canvasTex, sfx, buildHUD, showPanel, hidePanel, resultRows, fmtTime, clamp, lerp, bests, MOBILE, PHONE, shadowMapSize, shouldEnableShadows, mobileScale } from './common.js';
import { Joystick, TouchButton } from './touch.js';
import { t } from './i18n.js';

const CANAL_W = 13;      // half width of water
const LAPS = 2;

// closed canal circuit
const circuit = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, -160), new THREE.Vector3(90, 0, -150), new THREE.Vector3(150, 0, -90),
  new THREE.Vector3(160, 0, 0), new THREE.Vector3(150, 0, 90), new THREE.Vector3(90, 0, 150),
  new THREE.Vector3(0, 0, 160), new THREE.Vector3(-90, 0, 150), new THREE.Vector3(-150, 0, 90),
  new THREE.Vector3(-160, 0, 0), new THREE.Vector3(-150, 0, -90), new THREE.Vector3(-90, 0, -150),
], true, 'catmullrom', 0.6);
const TRACK_LEN = circuit.getLength();

function buildGondola(color) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.4, metalness: 0.3 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 5.5, 6, 12), hullMat);
  hull.rotation.z = Math.PI / 2; hull.scale.z = 0.55; hull.position.y = 0.35; hull.castShadow = true; g.add(hull);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xc9a86a, metalness: 0.7, roughness: 0.3 }));
    tip.rotation.z = -s * Math.PI / 2.4; tip.position.set(s * 3.6, 0.75, 0); g.add(tip);
  }
  const trim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 6, 20), new THREE.MeshBasicMaterial({ color }));
  trim.rotation.x = Math.PI / 2; trim.scale.x = 3.2; trim.position.y = 0.42; g.add(trim);
  const kimi = makeKimi(color, 0.9); kimi.position.set(0, 1.1, -1.6); g.add(kimi);
  // oar
  const oar = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x8a6b3d, roughness: 0.8 }));
  shaft.rotation.z = 0.9; oar.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 1.0), shaft.material);
  blade.position.set(-1.5, -1.0, 0); blade.rotation.z = 0.9; oar.add(blade);
  oar.position.set(0, 1.5, -2.2); g.add(oar);
  g.userData.oar = oar;
  return g;
}

export function start(ctx) {
  const { renderer, returnToLobby, standalone } = ctx;
  const scene = new THREE.Scene();
  // dawn sky
  scene.background = new THREE.Color(0x2a3550);
  scene.fog = new THREE.Fog(0xd8926a, 120, 620);
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.5, 1500);

  scene.add(new THREE.AmbientLight(0xffd9b0, 0.55));
  const sun = new THREE.DirectionalLight(0xffb27a, 2.2);
  sun.position.set(-300, 140, -200);
  if (shouldEnableShadows()) {
    sun.castShadow = true;
    const sms = shadowMapSize(2048);
    sun.shadow.mapSize.set(sms, sms);
    sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
  } else {
    sun.castShadow = false;
  }
  scene.add(sun);
  // sun glow disc
  const glow = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: 0xffd0a0, fog: false }));
  glow.position.set(-600, 130, -400); glow.lookAt(0, 40, 0); scene.add(glow);

  // water: ring under canal + big ground slab, with animated shimmer
  const waterUniforms = { t: { value: 0 } };
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x2e6f8e, shininess: 180, specular: 0xffc9a0, transparent: true, opacity: 0.92 });
  {
    const shape = new THREE.Shape();
    const N = 120;
    const outer = [], inner = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = circuit.getPointAt(u), tan = circuit.getTangentAt(u);
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      outer.push([p.x + n.x * CANAL_W, -(p.z + n.z * CANAL_W)]);
      inner.push([p.x - n.x * CANAL_W, -(p.z - n.z * CANAL_W)]);
    }
    shape.moveTo(outer[0][0], outer[0][1]);
    for (const p of outer) shape.lineTo(p[0], p[1]);
    for (let i = inner.length - 1; i >= 0; i--) shape.lineTo(inner[i][0], inner[i][1]);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(geo, waterMat);
    water.position.y = 0; scene.add(water);
    // moving reflection streaks — fewer on phone for perf
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xffc9a0, transparent: true, opacity: 0.18, depthWrite: false });
    const streaks = [];
    const streakCount = PHONE ? 16 : (MOBILE ? 28 : 40);
    for (let i = 0; i < streakCount; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1 + Math.random() * 2, 6 + Math.random() * 10), streakMat);
      s.rotation.x = -Math.PI / 2;
      const u = Math.random(), p = circuit.getPointAt(u), tan = circuit.getTangentAt(u);
      const n = new THREE.Vector3(-tan.z, 0, tan.x), off = (Math.random() * 2 - 1) * (CANAL_W - 2);
      s.position.set(p.x + n.x * off, 0.06, p.z + n.z * off);
      s.rotation.z = Math.atan2(tan.x, tan.z);
      scene.add(s); streaks.push(s);
    }
    scene.userData.streaks = streaks;
  }
  // city ground
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ color: 0x6b5a4e, roughness: 1 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.4; g.receiveShadow = true; scene.add(g);
  }
  // quay walls along canal
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 200; i++) {
      const u = i / 200, p = circuit.getPointAt(u), tan = circuit.getTangentAt(u);
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      pts.push(new THREE.Vector3(p.x + n.x * CANAL_W * s, 0.9, p.z + n.z * CANAL_W * s));
    }
    const wall = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 0.5, 6, true),
      new THREE.MeshStandardMaterial({ color: 0x9a8570, roughness: 0.9 }));
    scene.add(wall);
  }

  // buildings: rings inside & outside canal
  const palette = [0xd9b48a, 0xc98d6b, 0xe8cfa8, 0xb87f5f, 0xdba57e, 0xc46e52];
  const winTex = canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = '#00000000'; x.clearRect(0, 0, w, h);
    for (let yy = 8; yy < h - 8; yy += 18) for (let xx = 8; xx < w - 8; xx += 16) {
      x.fillStyle = Math.random() < 0.35 ? '#ffd98a' : '#3a3f55';
      x.fillRect(xx, yy, 8, 10);
    }
  });
  const buildingSpots = [];
  // Mobile: scale down building counts for perf
  const bldMult = PHONE ? 0.4 : (MOBILE ? 0.55 : 1);
  function addBuildings(u0, u1, count, side, dMin, dMax) {
    const realCount = Math.max(2, Math.round(count * bldMult));
    for (let i = 0; i < realCount; i++) {
      const u = u0 + (u1 - u0) * (i + 0.5) / count;
      const p = circuit.getPointAt(u % 1), tan = circuit.getTangentAt(u % 1);
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      const d = CANAL_W + dMin + Math.random() * (dMax - dMin);
      const x = p.x + n.x * d * side, z = p.z + n.z * d * side;
      if (Math.abs(x) > 600 || Math.abs(z) > 600) continue;
      const w = 10 + Math.random() * 8, dep = 10 + Math.random() * 6, h = 10 + Math.random() * 22;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep),
        new THREE.MeshStandardMaterial({ color: palette[Math.random() * palette.length | 0], roughness: 0.85, emissiveMap: winTex, emissive: 0xffc27a, emissiveIntensity: 0.5 }));
      b.position.set(x, h / 2 - 0.4, z);
      b.rotation.y = Math.atan2(tan.x, tan.z) + (Math.random() - 0.5) * 0.2;
      b.castShadow = true; b.receiveShadow = true; scene.add(b);
      buildingSpots.push({ x, z, r: Math.max(w, dep) * 0.72 });
    }
  }
  addBuildings(0, 1, 46, 1, 13, 30);
  addBuildings(0, 1, 40, -1, 13, 26);
  addBuildings(0, 1, 24, 1, 40, 70);
  addBuildings(0, 1, 22, -1, 36, 65);

  // docks
  const docks = [];
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5) / 8, p = circuit.getPointAt(u), tan = circuit.getTangentAt(u);
    const n = new THREE.Vector3(-tan.z, 0, tan.x);
    const side = i % 2 ? 1 : -1;
    const dock = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 3),
      new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.9 }));
    dock.position.set(p.x + n.x * (CANAL_W - 2) * side, 0.3, p.z + n.z * (CANAL_W - 2) * side);
    dock.rotation.y = Math.atan2(tan.x, tan.z);
    scene.add(dock);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    lamp.position.copy(dock.position).add(new THREE.Vector3(0, 2.2, 0)); scene.add(lamp);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x33241a }));
    pole.position.copy(dock.position).add(new THREE.Vector3(0, 1.1, 0)); scene.add(pole);
    docks.push({ u, pos: dock.position.clone(), side });
  }

  // bridges (arches across canal, boat passes under)
  const bridges = [];
  for (const u of [0.06, 0.31, 0.56, 0.81]) {
    const p = circuit.getPointAt(u), tan = circuit.getTangentAt(u);
    const n = new THREE.Vector3(-tan.z, 0, tan.x);
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(CANAL_W * 2 + 8, 1.2, 5),
      new THREE.MeshStandardMaterial({ color: 0xcbb49a, roughness: 0.8 }));
    deck.position.y = 5.2; g.add(deck);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.2, 5), deck.material);
      leg.position.set((CANAL_W + 1.5) * s, 2.2, 0); g.add(leg);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(CANAL_W * 2 + 8, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x8a7460 }));
      rail.position.set(0, 6.2, 2.2 * s); g.add(rail);
    }
    g.position.copy(p);
    g.rotation.y = Math.atan2(n.x, n.z) + Math.PI / 2;
    g.traverse(o => { o.castShadow = true; });
    scene.add(g);
    bridges.push({ u, pos: p.clone() });
  }

  // item boxes (race mode)
  const boxes = [];
  {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x3fd0ff, emissiveIntensity: 1.3, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 18; i++) {
      const u = (i + 0.5) / 18, p = circuit.getPointAt(u), tan = circuit.getTangentAt(u);
      const n = new THREE.Vector3(-tan.z, 0, tan.x), off = (Math.random() * 2 - 1) * (CANAL_W - 3);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.x + n.x * off, 0.9, p.z + n.z * off);
      m.userData = { taken: 0 };
      scene.add(m); boxes.push(m);
    }
  }

  // racers/gondolas
  const boats = CREW.map((c, i) => {
    const mesh = buildGondola(c.color);
    const tag = makeNameSprite(c.name, i === 0 ? '#7fb8ff' : '#fff');
    tag.position.y = 2.6; tag.scale.set(2.6, 0.65, 1); mesh.add(tag);
    scene.add(mesh);
    return { ...c, mesh, idx: i, u: 1 - i * 0.004, heading: 0, speed: 0, lat: (i % 2 ? 4 : -4), lap: 0, item: null, stun: 0, boost: 0, finished: false, finishTime: 0, oarT: Math.random() * 6 };
  });

  // hazards from items
  const mines = [], splashes = [];

  const hud = buildHUD(document.body, ['tl', 'tr', 'bc', 'bl']);
  const keys = {};
  // Touch state
  let joyX = 0, joyY = 0, touchItemTap = false;
  const kd = e => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return; keys[e.code] = true; };
  const ku = e => keys[e.code] = false;
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  // Mobile controls
  let joystick = null, btnItem = null;
  if (MOBILE) {
    joystick = new Joystick({ side: 'left', label: 'ROW', onChange: s => { joyX = s.x; joyY = s.y; } });
    btnItem = new TouchButton({
      label: 'ITEM', side: 'right', row: 0, big: true, color: '#9fe8ff',
      onTap: () => { touchItemTap = true; },
    });
  }
  // Reusable temp vectors to avoid per-frame allocations in update().
  const _camBack = new THREE.Vector3();
  const _camUp = new THREE.Vector3(0, 5, 0);

  let mode = null, phase = 'menu', raceT = 0, count = 3, lastCount = 4, t0 = 0;
  let ferry = null; // {pickup:dock, drop:dock, carrying, timeLeft, score, trips}

  function boatPose(b) {
    const p = circuit.getPointAt(((b.u % 1) + 1) % 1), tan = circuit.getTangentAt(((b.u % 1) + 1) % 1);
    const n = new THREE.Vector3(-tan.z, 0, tan.x);
    return { p, tan, n };
  }

  function startRace() {
    hidePanel();
    mode = 'race'; phase = 'count'; count = 3; lastCount = 4; raceT = 0; t0 = performance.now();
    boats.forEach((b, i) => {
      b.u = 1 - i * 0.004; b.lat = (i % 2 ? 4 : -4); b.speed = 0; b.lap = 0; b.item = null; b.stun = 0; b.boost = 0; b.finished = false; b.prevU = undefined;
      const { tan } = boatPose(b); b.heading = Math.atan2(tan.x, tan.z);
      b.mesh.position.copy(boatPose(b).p);
    });
    mines.length = 0; splashes.length = 0;
    scene.children.filter(o => o.userData.temp).forEach(o => scene.remove(o));
    hud.countdown(3);
  }
  function startFerry() {
    hidePanel();
    mode = 'ferry'; phase = 'play'; raceT = 0;
    const b = boats[0];
    b.u = 0.999; b.lat = 0; b.speed = 0; b.prevU = undefined;
    const { p: bp, tan: bt } = boatPose(b);
    b.mesh.position.copy(bp); b.heading = Math.atan2(bt.x, bt.z);
    ferry = { timeLeft: 150, score: 0, trips: 0, carrying: false, target: pickDock(), from: null };
    hud.showToast(t('venice_ferry_intro'), 2500);
    for (let i = 1; i < 4; i++) { boats[i].u = i * 0.25; boats[i].speed = 14 + i; } // NPCs cruise around
  }
  function pickDock(except) {
    let d; do { d = docks[Math.random() * docks.length | 0]; } while (d === except);
    return d;
  }

  // dock beacon
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 14, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd97a, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  beacon.visible = false; scene.add(beacon);

  function endFerry() {
    phase = 'done';
    const newBest = bests.set('venice_ferry', ferry.score, (a, b) => a > b);
    sfx.win();
    showPanel(`<h2>${t('venice_ferry_title')}</h2>
      <div class="big">${t('venice_pts', ferry.score)}</div>
      <p>${t('venice_ferry_summary', ferry.trips)}<br>
      ${t('venice_best_label', bests.get('venice_ferry') ?? 0)} ${newBest ? t('race_new_record') : ''}</p>`, [
      { label: t('btn_restart'), fn: startFerry },
      { label: t('btn_menu'), ghost: true, fn: showMenu },
    ]);
  }
  function endRace() {
    phase = 'done';
    const me = boats[0];
    const order = [...boats].sort((a, b) => (a.finished && b.finished) ? a.finishTime - b.finishTime : a.finished ? -1 : b.finished ? 1 : (b.lap - a.lap) || (b.u - a.u));
    const mePos = order.indexOf(me);
    mePos === 0 ? sfx.win() : sfx.lose();
    const newBest = bests.set('venice_race', me.finishTime, (a, b) => a < b);
    showPanel(`<h2>${t('venice_race_title')}</h2>
      <div class="big">P${mePos + 1}</div>
      ${resultRows(order.map(b => ({ name: b.name, value: b.finished ? fmtTime(b.finishTime) : t('race_dnf') })), mePos)}
      <p style="margin-top:14px">${t('venice_race_best', bests.get('venice_race') ? fmtTime(bests.get('venice_race')) : '—')} ${newBest ? t('race_new_record') : ''}</p>`, [
      { label: t('btn_restart'), fn: startRace },
      { label: t('btn_menu'), ghost: true, fn: showMenu },
    ]);
  }
  function showMenu() {
    phase = 'menu'; mode = null; beacon.visible = false;
    boats.forEach((b, i) => { b.u = 1 - i * 0.004; b.speed = 0; b.lat = (i % 2 ? 4 : -4); b.lap = 0; b.finished = false; });
    hud.clearCenter();
    showPanel(`<h2>${t('game_venice')}</h2><p>${t('venice_menu_intro')}<br>${MOBILE ? t('hint_venice_m') : t('hint_venice_d')}</p>`, [
      { label: t('venice_btn_ferry'), fn: startFerry },
      { label: t('venice_btn_race'), fn: startRace },
      standalone ? { label: t('btn_hub'), ghost: true, fn: () => location.href = 'index.html' } : { label: t('btn_lobby'), ghost: true, fn: returnToLobby },
    ]);
  }
  showMenu();

  function useItem(b) {
    if (!b.item || phase !== 'race') return;
    const it = b.item; b.item = null;
    if (it === 'boost') { b.boost = 2.4; sfx.boost(); if (b.idx === 0) hud.showToast(t('race_boost_toast')); }
    else if (it === 'mine') {
      sfx.beep(260, 0.15, 'triangle', 0.8);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222833, emissive: 0xff4444, emissiveIntensity: 0.8, roughness: 0.4 }));
      m.userData.temp = true;
      const { p, tan, n } = boatPose(b);
      m.position.copy(b.mesh.position).addScaledVector(tan, -5).setY(0.4);
      scene.add(m); mines.push({ m });
      if (b.idx === 0) hud.showToast(t('venice_mine_dropped'));
    } else if (it === 'splash') {
      sfx.noise(0.3, 0.8, 1200);
      const { tan } = boatPose(b);
      const m = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 10), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.6 }));
      m.userData.temp = true;
      m.position.copy(b.mesh.position).addScaledVector(tan, 7).setY(1.5);
      scene.add(m); splashes.push({ m, life: 0.8 });
      // stun boats ahead within 9m
      for (const o of boats) {
        if (o.idx === b.idx) continue;
        if (o.mesh.position.distanceTo(m.position) < 6) {
          o.stun = 1.4; o.speed *= 0.3; sfx.hit();
          hud.showToast(t('venice_splashed_other', o.name), 1200);
        }
      }
      if (b.idx === 0) hud.showToast(t('venice_splash_toast'));
    }
  }

  function update(dt) {
    waterUniforms.t.value += dt;
    // streak shimmer — throttled on phone to every other frame
    if (!PHONE || (performance.now() | 0) % 2 === 0) {
      const now = performance.now();
      for (const s of scene.userData.streaks) {
        s.material.opacity = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(now * 0.002 + s.position.x));
      }
    }
    if (phase === 'count') {
      const el = (performance.now() - t0) / 1000, c = 3 - Math.floor(el);
      if (c !== lastCount && c > 0) { lastCount = c; hud.countdown(c); sfx.count(false); }
      if (el >= 3.8) { phase = 'race'; hud.countdown(0, 'GO!'); sfx.count(true); setTimeout(() => hud.clearCenter(), 800); }
    }
    if (phase === 'race') raceT += dt;
    if (phase === 'play' && mode === 'ferry') {
      ferry.timeLeft -= dt;
      if (ferry.timeLeft <= 0) { ferry.timeLeft = 0; endFerry(); }
    }

    for (const b of boats) {
      if (b.stun > 0) { b.stun -= dt; b.mesh.rotation.z = Math.sin(performance.now() * 0.03) * 0.2; }
      else b.mesh.rotation.z = 0;
      const { p, tan, n } = boatPose(b);

      if (b.idx === 0) {
        const active = (phase === 'race' || (phase === 'play' && mode === 'ferry')) && b.stun <= 0;
        const paddle = active && keys.KeyW;
        const brake = active && keys.KeyS;
        // Touch: joystick Y up = paddle, Y down = brake
        const touchPaddle = MOBILE && active && joyY < -0.15;
        const touchBrake = MOBILE && active && joyY > 0.15;
        // rowing: pulses of thrust
        b.oarT += dt * ((paddle || touchPaddle) ? 3.2 : 1.2);
        const stroke = Math.max(0, Math.sin(b.oarT * Math.PI));
        if (paddle || touchPaddle) b.speed += (10 + stroke * 16) * dt;
        if (brake || touchBrake) b.speed -= (MOBILE ? joyY : 1) * 18 * dt;
        b.speed = clamp(b.speed, -6, 26 + (b.boost > 0 ? 12 : 0));
        if (!paddle && !brake && !touchPaddle && !touchBrake) b.speed = lerp(b.speed, 0, 1 - Math.exp(-0.35 * dt));
        // steering with inertia: turn rate depends on speed
        const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0) + (MOBILE ? joyX : 0);
        b.heading += steer * dt * clamp(Math.abs(b.speed) * 0.06, 0, 1.1) * Math.sign(b.speed || 1);
        if ((keys.Space && b.item) || (MOBILE && touchItemTap && b.item)) { useItem(b); keys.Space = false; touchItemTap = false; }
        // move freely in water, constrained to canal ring
        const dir = new THREE.Vector3(Math.sin(b.heading), 0, Math.cos(b.heading));
        b.mesh.position.addScaledVector(dir, b.speed * dt);
        // project back into canal: find nearest u
        let bestU = b.u, bestD = 1e9;
        for (let k = -4; k <= 4; k++) {
          const uu = ((b.u + k * 0.002) % 1 + 1) % 1;
          const pp = circuit.getPointAt(uu);
          const d = pp.distanceToSquared(b.mesh.position);
          if (d < bestD) { bestD = d; bestU = uu; }
        }
        b.u = bestU;
        const { p: cp, n: cn } = boatPose(b);
        const rel = b.mesh.position.clone().sub(cp);
        const lat = rel.dot(cn);
        if (Math.abs(lat) > CANAL_W - 1.6) {
          // hit quay wall: slide + slow, never pass
          b.mesh.position.copy(cp).addScaledVector(cn, Math.sign(lat) * (CANAL_W - 1.6));
          b.speed *= 0.55; sfx.noise(0.12, 0.5, 500);
        }
        b.lat = lat;
      } else {
        // NPC: follow circuit
        const meB = boats[0];
        let want;
        if (mode === 'ferry') want = 13 + b.idx; // cruising traffic
        else if (phase === 'race') {
          const diff = (meB.lap + meB.u) - (b.lap + b.u);
          want = 17 + b.idx * 0.6 + clamp(diff * 6, -3, 4);
        } else want = 0;
        if (b.stun > 0) want = 3;
        b.speed = lerp(b.speed, want + (b.boost > 0 ? 11 : 0), 1 - Math.exp(-1.4 * dt));
        b.u += b.speed * dt / TRACK_LEN;
        b.oarT += dt * 3;
        const wantLat = Math.sin(b.u * 40 + b.idx * 2) * (CANAL_W - 4);
        b.lat = lerp(b.lat, wantLat, 1 - Math.exp(-1.6 * dt));
        const { p: cp, tan: ct, n: cn } = boatPose(b);
        b.mesh.position.set(cp.x + cn.x * b.lat, 0, cp.z + cn.z * b.lat);
        b.heading = Math.atan2(ct.x, ct.z);
        if (b.item && Math.random() < dt * 0.5) useItem(b);
        if (phase === 'race') {
          const newLap = Math.floor((b.u));
          // lap tracking via crossing u wrap
        }
      }
      if (b.boost > 0) b.boost -= dt;

      // lap tracking via u wrap
      if (b.idx === 0 || true) {
        if (b.prevU !== undefined && b.prevU > 0.9 && b.u % 1 < 0.1 && phase === 'race') {
          b.lap++;
          if (b.idx === 0) hud.showToast(t('race_lap_toast', Math.min(b.lap + 1, LAPS), LAPS), 1400);
          if (b.lap > LAPS && !b.finished) {
            b.finished = true; b.finishTime = raceT;
            if (b.idx === 0) endRace();
          }
        }
      }
      b.prevU = ((b.u % 1) + 1) % 1;
      b.u = ((b.u % 1) + 1) % 1;

      // pose & oar animation
      b.mesh.position.y = 0.15 + Math.sin(performance.now() * 0.003 + b.idx * 2) * 0.08;
      b.mesh.rotation.y = b.heading;
      b.mesh.rotation.x = clamp(-b.speed * 0.004, -0.1, 0.02);
      const oar = b.mesh.userData.oar;
      oar.rotation.x = Math.sin(b.oarT * Math.PI) * 0.7 - 0.2;

      // item pickup (race only)
      if (phase === 'race') {
        for (const bx of boxes) {
          if (bx.userData.taken > 0) { bx.userData.taken -= dt; bx.visible = bx.userData.taken <= 0; continue; }
          if (bx.visible && bx.position.distanceTo(b.mesh.position) < 2.8) {
            bx.userData.taken = 6; bx.visible = false;
            if (!b.item) {
              b.item = ['boost', 'mine', 'splash'][Math.random() * 3 | 0];
              if (b.idx === 0) { sfx.pickup(); hud.showToast(t('race_got', b.item.toUpperCase())); }
            }
          }
        }
      }
      // mines
      for (let i = mines.length - 1; i >= 0; i--) {
        const m = mines[i];
        m.m.rotation.y += dt;
        if (m.m.position.distanceTo(b.mesh.position) < 2.4) {
          scene.remove(m.m); mines.splice(i, 1);
          b.stun = 1.8; b.speed *= 0.2; sfx.boom();
          if (b.idx === 0) hud.showToast(t('venice_mine_hit'), 1400); else hud.showToast(t('venice_mine_other', b.name), 1200);
        }
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      splashes[i].life -= dt; splashes[i].m.material.opacity = Math.max(0, splashes[i].life);
      if (splashes[i].life <= 0) { scene.remove(splashes[i].m); splashes.splice(i, 1); }
    }
    for (const bx of boxes) if (bx.visible) bx.rotation.y += dt * 2;

    const me = boats[0];
    // ferry logic
    if (mode === 'ferry' && phase === 'play') {
      const tgt = ferry.target;
      beacon.visible = true;
      beacon.position.copy(tgt.pos).setY(7);
      beacon.material.color.setHex(ferry.carrying ? 0x8dff6a : 0xffd97a);
      const d = me.mesh.position.distanceTo(tgt.pos);
      if (d < 5 && Math.abs(me.speed) < 4) {
        if (!ferry.carrying) {
          ferry.carrying = true; ferry.from = tgt; ferry.target = pickDock(tgt);
          sfx.pickup(); hud.showToast(t('venice_passenger_on'), 2000);
        } else if (tgt !== ferry.from) {
          ferry.carrying = false; ferry.trips++;
          const bonus = Math.round(ferry.timeLeft * 0.2);
          const pts = 100 + bonus; ferry.score += pts;
          ferry.timeLeft = Math.min(150, ferry.timeLeft + 25);
          ferry.target = pickDock(tgt);
          sfx.win(); hud.showToast(t('venice_delivered', pts), 1800);
        }
      }
      hud.tl.innerHTML = `<b>${t('venice_ferry')}</b><br>${t('venice_score')} <b>${ferry.score}</b> · ${t('venice_trips')} <b>${ferry.trips}</b>`;
      hud.tr.innerHTML = `${t('race_time')} <b class="${ferry.timeLeft < 20 ? 'hud-warn' : ''}">${fmtTime(ferry.timeLeft)}</b><br>${t('race_speed', Math.max(0, me.speed * 3.6 | 0))}`;
      hud.bl.innerHTML = ferry.carrying ? t('venice_carrying') : t('venice_pickup');
      hud.bc.innerHTML = t('venice_ferry_hud_bc');
    } else if (mode === 'race') {
      const order = [...boats].sort((a, b2) => (b2.lap - a.lap) || (b2.u - a.u));
      const mePos = order.indexOf(me);
      hud.tl.innerHTML = `<b>${t('venice_race')}</b><br>${t('race_lap', Math.min(me.lap + 1, LAPS), LAPS)} · POS <b>${t('race_pos', mePos + 1)}</b>`;
      hud.tr.innerHTML = `${t('race_time')} <b>${fmtTime(raceT)}</b><br>${t('race_speed', Math.max(0, me.speed * 3.6 | 0))}`;
      hud.bl.innerHTML = `${t('race_item')} <b>${me.item ? me.item.toUpperCase() : '—'}</b>${me.boost > 0 ? ' · <span class="hud-warn">' + t('race_boost') + '</span>' : ''}`;
      hud.bc.innerHTML = order.map((b2, i) => `${i + 1}. ${b2.name}`).join(' · ');
    } else {
      hud.tl.innerHTML = `<b>${t('venice_hud')}</b>`; hud.tr.innerHTML = ''; hud.bl.innerHTML = ''; hud.bc.innerHTML = '';
    }

    // chase camera, avoid buildings — reuse vector to avoid GC pressure
    _camBack.set(Math.sin(me.heading), 0, Math.cos(me.heading)).multiplyScalar(-11).add(me.mesh.position).add(_camUp);
    // keep camera out of shoreline buildings
    for (const bs of buildingSpots) {
      const d = Math.hypot(_camBack.x - bs.x, _camBack.z - bs.z);
      if (d < bs.r + 3) _camBack.y = Math.max(_camBack.y, 16);
    }
    camera.position.lerp(_camBack, 1 - Math.exp(-4.5 * dt));
    camera.lookAt(me.mesh.position.x, me.mesh.position.y + 1.4, me.mesh.position.z);
  }

  return {
    scene, camera, update, hideMenu: true,
    hint: MOBILE ? t('hint_venice_m') : t('hint_venice_d'),
    pause() { }, resume() { },
    dispose() {
      hud.hide(); hidePanel();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      if (MOBILE) {
        if (joystick) joystick.dispose();
        if (btnItem) btnItem.dispose();
      }
    },
  };
}
