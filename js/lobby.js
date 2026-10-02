// LUNAR LOBBY — explorable moon base with NPC Kimis and game portals
import * as THREE from '../vendor/three.module.js';
import { CREW, makeKimi, makeNameSprite, canvasTex, sfx, buildHUD, clamp, lerp, MOBILE, PHONE, shadowMapSize, shouldEnableShadows, mobileScale } from './common.js';
import { Joystick, DragArea, PinchZoom } from './touch.js';
import { t } from './i18n.js';

function moonHeight(x, z) {
  return Math.sin(x * 0.045) * Math.cos(z * 0.05) * 2.2
    + Math.sin(x * 0.13 + 1.7) * Math.cos(z * 0.11) * 0.9
    + Math.sin(x * 0.31) * Math.sin(z * 0.27) * 0.35;
}

export function start(ctx) {
  const { renderer, returnToLobby } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  scene.fog = new THREE.Fog(0x000005, 90, 260);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);

  // lights
  scene.add(new THREE.AmbientLight(0x334466, 0.9));
  const sun = new THREE.DirectionalLight(0xf5f0e0, 2.0);
  sun.position.set(60, 90, 30);
  if (shouldEnableShadows()) {
    sun.castShadow = true;
    const sms = shadowMapSize(2048);
    sun.shadow.mapSize.set(sms, sms);
    sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  } else {
    sun.castShadow = false;
  }
  scene.add(sun);

  // stars
  {
    const n = PHONE ? 300 : (MOBILE ? 600 : 1500), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 700, t = Math.random() * Math.PI * 2, p = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = Math.abs(r * Math.cos(p)) - 40; pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.4, sizeAttenuation: false })));
  }

  // Earth hanging in the black sky
  {
    const earthTex = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#1c4d8f'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#3f7a3a';
      for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 55, 12 + Math.random() * 30, Math.random() * 3, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 40; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 14 + Math.random() * 40, 5 + Math.random() * 10, 0, 0, 7); x.fill(); }
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(26, 48, 32),
      new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.9, emissive: 0x113355, emissiveIntensity: 0.5 }));
    earth.position.set(-120, 110, -260);
    scene.add(earth);
    scene.userData.earth = earth;
  }

  // moon terrain
  const SIZE = 320, SEG = 128;
  const groundGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  groundGeo.rotateX(-Math.PI / 2);
  {
    const p = groundGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let h = moonHeight(x, z);
      const d = Math.hypot(x, z);
      if (d < 26) h *= (d / 26) * 0.25; // flattened base area
      // craters
      for (const c of [[48, -55, 14], [-70, 40, 18], [20, 85, 10], [-40, -90, 12]]) {
        const cd = Math.hypot(x - c[0], z - c[1]);
        if (cd < c[2]) h -= Math.cos(cd / c[2] * Math.PI / 2) * 2.4;
        else if (cd < c[2] * 1.35) h += Math.cos((cd - c[2]) / (c[2] * 0.35) * Math.PI / 2) * 0.8;
      }
      p.setY(i, h);
    }
    groundGeo.computeVertexNormals();
  }
  const moonTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#9a9aa2'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${100 + Math.random() * 60 | 0},${100 + Math.random() * 60 | 0},${110 + Math.random() * 60 | 0},.5)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  moonTex.repeat.set(24, 24);
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // base structures: domes, towers, solar panels
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.5, metalness: 0.4 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x4da3ff, emissive: 0x4da3ff, emissiveIntensity: 1.4 });
  const domeAt = (x, z, r) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xb9d2e8, roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.85 }));
    d.position.set(x, moonHeight(x, z), z); d.castShadow = true; scene.add(d);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.25, 8, 32), baseMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, moonHeight(x, z) + 0.1, z); scene.add(ring);
  };
  domeAt(10, 6, 6); domeAt(-12, -4, 4.5); domeAt(16, -12, 3.5);
  for (const [x, z] of [[-18, 12], [22, 14], [-6, -18]]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 10), baseMat);
    tower.position.set(x, moonHeight(x, z) + 3.5, z); tower.castShadow = true; scene.add(tower);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), glowMat);
    tip.position.set(x, moonHeight(x, z) + 7.2, z); scene.add(tip);
  }
  for (const [x, z, ry] of [[-24, -14, 0.4], [26, -2, -0.7]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.3, metalness: 0.7, emissive: 0x0a1c4a, emissiveIntensity: 0.6 }));
    p.position.set(x, moonHeight(x, z) + 1.6, z); p.rotation.z = 0.35; p.rotation.y = ry; scene.add(p);
  }

  // game portals
  const portals = [
    { game: 'race', label: 'MOON RACE', x: -10, z: 18, color: 0x4da3ff },
    { game: 'venice', label: 'VENICE SPEED', x: 12, z: 22, color: 0x6ad9ff },
    { game: 'cyber', label: 'CYBER SPACESHIP', x: 0, z: -22, color: 0xff7ad9 },
  ];
  const portalMeshes = [];
  for (const p of portals) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.3, 24),
      new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 }));
    pad.position.set(p.x, moonHeight(p.x, p.z) + 0.15, p.z); scene.add(pad);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 7, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(p.x, moonHeight(p.x, p.z) + 3.7, p.z); scene.add(beam);
    const lbl = makeNameSprite(p.label, '#9fd0ff'); lbl.scale.set(5, 1.25, 1);
    lbl.position.set(p.x, moonHeight(p.x, p.z) + 8.2, p.z); scene.add(lbl);
    portalMeshes.push({ ...p, pad, beam });
  }

  // characters
  const player = makeKimi(CREW[0].color); player.position.set(0, 1, 8); scene.add(player);
  const tag = makeNameSprite(CREW[0].name, '#7fb8ff'); tag.position.y = 1.3; player.add(tag);
  const npcs = CREW.slice(1).map((c, i) => {
    const k = makeKimi(c.color);
    k.position.set(Math.cos(i * 2.1) * 12, 1, Math.sin(i * 2.1) * 12);
    const ntag = makeNameSprite(c.name, '#ffffff'); ntag.position.y = 1.3; k.add(ntag);
    scene.add(k);
    return { m: k, tx: k.position.x, tz: k.position.z, wait: 0, speed: 3 + Math.random() * 2 };
  });

  // HUD + input
  const hud = buildHUD(document.body, ['tl']);
  function updateLobbyHud() {
    hud.tl.innerHTML = `<b>${t('game_lobby')}</b><br>${t('lobby_hud', CREW.length)}${MOBILE ? t('lobby_hud_m_extra') : ''}`;
  }
  updateLobbyHud();
  // Re-localize on language change
  window.addEventListener('kaw-lang-change', updateLobbyHud);
  const keys = {};
  let camYaw = 0.6, camPitch = 0.32, camDist = 10, dragging = false, px = 0, py = 0;
  // Touch state for movement
  let joyX = 0, joyY = 0; // y: -1 = forward (up on joystick), x: -1 = left, +1 = right
  const kd = e => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return; keys[e.code] = true; };
  const ku = e => keys[e.code] = false;
  const md = e => { dragging = true; px = e.clientX; py = e.clientY; };
  const mu = () => dragging = false;
  const mm = e => { if (dragging) { camYaw -= (e.clientX - px) * 0.005; camPitch = clamp(camPitch + (e.clientY - py) * 0.004, -0.1, 1.1); px = e.clientX; py = e.clientY; } };
  const wh = e => camDist = clamp(camDist + e.deltaY * 0.01, 5, 24);
  // Mobile controls
  let joystick = null, drag = null, pinch = null;
  if (MOBILE) {
    joystick = new Joystick({ side: 'left', label: 'MOVE', onChange: s => { joyX = s.x; joyY = s.y; } });
    // Drag-area: ignore touches that start on the joystick (already handled by joystick's own element)
    drag = new DragArea({
      except: (target) => {
        if (!target) return false;
        return target.closest('.kjoy') || target.closest('.kbtn') || target.closest('.kmob-top')
          || target.closest('#menu') || target.closest('#menu-open-btn') || target.closest('.overlay');
      },
      onMove: ({ dx, dy }) => {
        camYaw -= dx * 0.005;
        camPitch = clamp(camPitch + dy * 0.004, -0.1, 1.1);
      },
    });
    pinch = new PinchZoom({
      onZoom: (z) => { camDist = clamp(camDist / Math.max(0.4, Math.min(z, 2.4)), 5, 24); },
    });
  }
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  if (!MOBILE) {
    renderer.domElement.addEventListener('mousedown', md);
    addEventListener('mouseup', mu); addEventListener('mousemove', mm);
    renderer.domElement.addEventListener('wheel', wh);
  }

  let vel = new THREE.Vector3(), launched = false;
  let bob = 0;
  // Reusable temp vector to avoid GC pressure from camera.lerp allocations each frame.
  const _camTarget = new THREE.Vector3();
  // Throttle timer for cosmetic updates (portal pulse, earth rotation).
  let cosmeticT = 0;

  function update(dt) {
    if (launched) return;
    // movement relative to camera yaw
    const f = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const acc = new THREE.Vector3();
    if (keys.KeyW) acc.add(f); if (keys.KeyS) acc.sub(f);
    if (keys.KeyD) acc.add(r); if (keys.KeyA) acc.sub(r);
    if (keys.ArrowLeft) camYaw += dt * 2.2;
    if (keys.ArrowRight) camYaw -= dt * 2.2;
    // Mobile joystick: y up = forward, x right = right (matches WASD)
    if (MOBILE && (joyX !== 0 || joyY !== 0)) {
      acc.addScaledVector(f, -joyY);
      acc.addScaledVector(r, joyX);
    }
    if (acc.lengthSq() > 1) acc.normalize().multiplyScalar(26);
    else acc.multiplyScalar(26);
    vel.lerp(acc, 1 - Math.exp(-6 * dt));
    player.position.addScaledVector(vel, dt);
    const R = SIZE / 2 - 6;
    player.position.x = clamp(player.position.x, -R, R);
    player.position.z = clamp(player.position.z, -R, R);
    const gy = moonHeight(player.position.x, player.position.z);
    bob += dt * (2 + vel.length() * 0.3);
    player.position.y = lerp(player.position.y, gy + 0.55 + Math.abs(Math.sin(bob * 3)) * 0.12 * Math.min(1, vel.length() / 8), 0.4);
    if (vel.lengthSq() > 0.5) player.rotation.y = Math.atan2(vel.x, vel.z);
    player.userData.body.rotation.x += vel.length() * dt * 1.4;

    // NPC wander inside base
    for (const n of npcs) {
      const dx = n.tx - n.m.position.x, dz = n.tz - n.m.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1) {
        n.wait -= dt;
        if (n.wait <= 0) { const a = Math.random() * Math.PI * 2, rr = 4 + Math.random() * 16; n.tx = Math.cos(a) * rr; n.tz = Math.sin(a) * rr; n.wait = 1 + Math.random() * 3; }
      } else {
        n.m.position.x += dx / d * n.speed * dt; n.m.position.z += dz / d * n.speed * dt;
        n.m.rotation.y = Math.atan2(dx, dz);
        n.m.userData.body.rotation.x += n.speed * dt * 1.4;
      }
      n.m.position.y = moonHeight(n.m.position.x, n.m.position.z) + 0.55;
    }

    // portal check — pulse throttled (cosmetic only) on mobile to save CPU
    cosmeticT += dt;
    const pulseNow = (!MOBILE || cosmeticT > 0.08);
    if (pulseNow) cosmeticT = 0;
    for (const p of portalMeshes) {
      if (pulseNow) p.pad.material.emissiveIntensity = 0.7 + Math.sin(performance.now() * 0.004) * 0.35;
      if (!launched && Math.hypot(player.position.x - p.x, player.position.z - p.z) < 2.4) {
        launched = true; sfx.win();
        hud.showToast(t('lobby_entering', p.label), 900);
        setTimeout(() => ctx.launchGame(p.game), 500);
      }
    }
    if (!MOBILE || cosmeticT > 0) scene.userData.earth.rotation.y += dt * 0.02;

    // camera
    const cx = player.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const cz = player.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    let cy = player.position.y + Math.sin(camPitch) * camDist + 1.2;
    const minY = moonHeight(cx, cz) + 0.6; if (cy < minY) cy = minY; // keep camera above terrain
    _camTarget.set(cx, cy, cz);
    camera.position.lerp(_camTarget, 1 - Math.exp(-8 * dt));
    camera.lookAt(player.position.x, player.position.y + 0.8, player.position.z);
  }

  return {
    scene, camera, update,
    hint: MOBILE ? t('hint_lobby_m') : t('hint_lobby_d'),
    pause() { }, resume() { },
    dispose() {
      hud.hide();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      removeEventListener('kaw-lang-change', updateLobbyHud);
      if (!MOBILE) {
        renderer.domElement.removeEventListener('mousedown', md);
        removeEventListener('mouseup', mu); removeEventListener('mousemove', mm);
        renderer.domElement.removeEventListener('wheel', wh);
      } else {
        if (joystick) joystick.dispose();
        if (drag) drag.dispose();
        if (pinch) pinch.dispose();
      }
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); } });
    },
  };
}
