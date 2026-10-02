// KIMI AROUND THE WORLD — mobile touch controls
// Provides: isMobile(), isTouch(), Joystick, TouchButton, DragArea, PinchZoom, TouchHUD
// All controls render as DOM elements fixed on top of the canvas (z-index 50, below overlay 60).

// ---------- device detection ----------
export function isTouch() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
    (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
}
export function isMobile() {
  return isTouch() && (window.innerWidth <= 1024 || /Mobi|Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent));
}
export function isPhone() {
  return isTouch() && Math.min(window.innerWidth, window.innerHeight) <= 600;
}

// ---------- base helpers ----------
function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------- virtual joystick ----------
// Returns { x: -1..1, y: -1..1, active: bool } via .state and 'change' callback
export class Joystick {
  constructor(opts = {}) {
    this.side = opts.side || 'left';        // 'left' or 'right' anchor
    this.dead = opts.dead || 0.08;          // dead-zone
    this.radius = opts.radius || 60;        // max thumb travel px
    this.label = opts.label || '';
    this.state = { x: 0, y: 0, active: false };
    this.onChange = opts.onChange || (() => {});

    this._root = el('div', `kjoy kjoy-${this.side}`);
    this._root.innerHTML = `<div class="kjoy-base"><div class="kjoy-thumb"></div></div>`;
    if (this.label) {
      const lbl = el('div', 'kjoy-label', this._root);
      lbl.textContent = this.label;
    }
    document.body.appendChild(this._root);

    this._thumb = this._root.querySelector('.kjoy-thumb');
    this._base = this._root.querySelector('.kjoy-base');
    this._baseRect = null;
    this._touchId = null;
    this._origin = { x: 0, y: 0 };

    this._onDown = (e) => this._handleDown(e);
    this._onMove = (e) => this._handleMove(e);
    this._onUp = (e) => this._handleUp(e);

    this._root.addEventListener('touchstart', this._onDown, { passive: false });
    this._root.addEventListener('touchmove', this._onMove, { passive: false });
    this._root.addEventListener('touchend', this._onUp, { passive: false });
    this._root.addEventListener('touchcancel', this._onUp, { passive: false });
    // also support mouse drag for testing
    this._root.addEventListener('mousedown', this._onDown);
    addEventListener('mousemove', this._onMove);
    addEventListener('mouseup', this._onUp);
  }
  _handleDown(e) {
    e.preventDefault();
    let pt;
    if (e.touches) {
      if (this._touchId !== null) return;
      const t = e.changedTouches[0];
      this._touchId = t.identifier;
      pt = { x: t.clientX, y: t.clientY };
    } else {
      if (e.button !== 0) return;
      this._touchId = 'mouse';
      pt = { x: e.clientX, y: e.clientY };
    }
    this._baseRect = this._base.getBoundingClientRect();
    this._origin = { x: this._baseRect.left + this._baseRect.width / 2, y: this._baseRect.top + this._baseRect.height / 2 };
    this._update(pt);
    this.state.active = true;
    this._root.classList.add('active');
    this.onChange({ ...this.state });
  }
  _handleMove(e) {
    if (this._touchId === null) return;
    let pt = null;
    if (e.touches) {
      for (const t of e.touches) if (t.identifier === this._touchId) { pt = { x: t.clientX, y: t.clientY }; break; }
      if (!pt) return;
    } else if (this._touchId === 'mouse') {
      pt = { x: e.clientX, y: e.clientY };
    } else return;
    e.preventDefault();
    this._update(pt);
  }
  _handleUp(e) {
    if (this._touchId === null) return;
    if (e.changedTouches) {
      let match = false;
      for (const t of e.changedTouches) if (t.identifier === this._touchId) match = true;
      if (!match) return;
    } else if (this._touchId !== 'mouse') return;
    this._touchId = null;
    this.state.x = 0; this.state.y = 0; this.state.active = false;
    this._thumb.style.transform = `translate(-50%, -50%)`;
    this._root.classList.remove('active');
    this.onChange({ ...this.state });
  }
  _update(pt) {
    let dx = pt.x - this._origin.x;
    let dy = pt.y - this._origin.y;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) { dx = dx / len * this.radius; dy = dy / len * this.radius; }
    let nx = dx / this.radius, ny = dy / this.radius;
    if (Math.hypot(nx, ny) < this.dead) { nx = 0; ny = 0; }
    this.state.x = +nx.toFixed(3);
    this.state.y = +ny.toFixed(3);
    this._thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.onChange({ ...this.state });
  }
  show() { this._root.style.display = ''; }
  hide() { this._root.style.display = 'none'; }
  dispose() {
    this._root.remove();
    this._root.removeEventListener('touchstart', this._onDown);
    this._root.removeEventListener('touchmove', this._onMove);
    this._root.removeEventListener('touchend', this._onUp);
    this._root.removeEventListener('touchcancel', this._onUp);
    this._root.removeEventListener('mousedown', this._onDown);
    removeEventListener('mousemove', this._onMove);
    removeEventListener('mouseup', this._onUp);
  }
}

// ---------- tap / hold button ----------
// opts: { label, side, color, onTap, onHold, holdRepeat, big }
export class TouchButton {
  constructor(opts = {}) {
    this.label = opts.label || '';
    this.side = opts.side || 'right';        // 'right' anchor column
    this.row = opts.row || 0;                // vertical stack index
    this.big = opts.big || false;
    this.color = opts.color || null;
    this.onTap = opts.onTap || (() => {});
    this.onHold = opts.onHold || null;       // if set, button is a hold-type
    this.holdRepeat = opts.holdRepeat || 0;  // ms between repeats while held (0 = none)
    this.repeatTimer = null;
    this.holding = false;

    this._root = el('div', `kbtn kbtn-${this.side}${this.big ? ' kbtn-big' : ''}`);
    this._root.style.setProperty('--row', this.row);
    if (this.color) this._root.style.setProperty('--kbtn-color', this.color);
    this._root.innerHTML = `<span>${this.label}</span>`;
    document.body.appendChild(this._root);

    this._onDown = (e) => {
      e.preventDefault();
      this._root.classList.add('pressed');
      if (this.onHold) {
        this.holding = true;
        this.onHold(true);
        if (this.holdRepeat > 0) {
          this.repeatTimer = setInterval(() => { if (this.holding) this.onHold(true); }, this.holdRepeat);
        }
      } else {
        this.onTap();
      }
    };
    this._onUp = (e) => {
      e.preventDefault();
      this._root.classList.remove('pressed');
      if (this.onHold) {
        this.holding = false;
        if (this.repeatTimer) { clearInterval(this.repeatTimer); this.repeatTimer = null; }
        this.onHold(false);
      }
    };
    this._root.addEventListener('touchstart', this._onDown, { passive: false });
    this._root.addEventListener('touchend', this._onUp, { passive: false });
    this._root.addEventListener('touchcancel', this._onUp, { passive: false });
    this._root.addEventListener('mousedown', this._onDown);
    this._root.addEventListener('mouseup', this._onUp);
    this._root.addEventListener('mouseleave', this._onUp);
  }
  show() { this._root.style.display = ''; }
  hide() { this._root.style.display = 'none'; }
  setLabel(t) { this._root.querySelector('span').textContent = t; }
  setHighlight(on) { this._root.classList.toggle('glow', !!on); }
  dispose() {
    if (this.repeatTimer) clearInterval(this.repeatTimer);
    this._root.remove();
  }
}

// ---------- drag area (camera) ----------
// Reports { dx, dy } deltas when user drags. Multi-touch aware: only takes 1 finger.
export class DragArea {
  constructor(opts = {}) {
    this.except = opts.except || (() => false);  // function(el) -> bool to skip drag if target is interactive
    this.state = { dx: 0, dy: 0, active: false };
    this.onMove = opts.onMove || (() => {});
    this._touchId = null;
    this._last = null;
    this._onStart = (e) => {
      if (this._touchId !== null) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (this.except(e.target)) return;
      e.preventDefault();
      this._touchId = e.changedTouches ? t.identifier : 'mouse';
      this._last = { x: t.clientX, y: t.clientY };
      this.state.active = true;
    };
    this._onMove = (e) => {
      if (this._touchId === null) return;
      let pt = null;
      if (e.touches) {
        for (const t of e.touches) if (t.identifier === this._touchId) { pt = { x: t.clientX, y: t.clientY }; break; }
        if (!pt) return;
      } else if (this._touchId === 'mouse') {
        pt = { x: e.clientX, y: e.clientY };
      } else return;
      e.preventDefault();
      const dx = pt.x - this._last.x, dy = pt.y - this._last.y;
      this._last = pt;
      this.onMove({ dx, dy });
    };
    this._onEnd = (e) => {
      if (this._touchId === null) return;
      if (e.changedTouches) {
        let match = false;
        for (const t of e.changedTouches) if (t.identifier === this._touchId) match = true;
        if (!match) return;
      }
      this._touchId = null;
      this._last = null;
      this.state.active = false;
    };
    addEventListener('touchstart', this._onStart, { passive: false });
    addEventListener('touchmove', this._onMove, { passive: false });
    addEventListener('touchend', this._onEnd, { passive: false });
    addEventListener('touchcancel', this._onEnd, { passive: false });
    addEventListener('mousedown', this._onStart);
    addEventListener('mousemove', this._onMove);
    addEventListener('mouseup', this._onEnd);
  }
  dispose() {
    removeEventListener('touchstart', this._onStart);
    removeEventListener('touchmove', this._onMove);
    removeEventListener('touchend', this._onEnd);
    removeEventListener('touchcancel', this._onEnd);
    removeEventListener('mousedown', this._onStart);
    removeEventListener('mousemove', this._onMove);
    removeEventListener('mouseup', this._onEnd);
  }
}

// ---------- pinch-to-zoom ----------
// Reports { scale } factor relative to start; triggers onZoom(zoom) where zoom = current scale.
export class PinchZoom {
  constructor(opts = {}) {
    this.onZoom = opts.onZoom || (() => {});
    this._touches = new Map();
    this._startDist = 0;
    this._startZoom = 1;
    this._onStart = (e) => {
      for (const t of e.changedTouches) this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      if (this._touches.size === 2) {
        const [a, b] = [...this._touches.values()];
        this._startDist = Math.hypot(a.x - b.x, a.y - b.y);
        this._startZoom = 1;
      }
    };
    this._onMove = (e) => {
      if (this._touches.size !== 2) return;
      e.preventDefault();
      for (const t of e.changedTouches) if (this._touches.has(t.identifier)) this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      const [a, b] = [...this._touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this._startDist > 0) {
        const scale = d / this._startDist;
        this.onZoom(this._startZoom * scale);
      }
    };
    this._onEnd = (e) => {
      for (const t of e.changedTouches) this._touches.delete(t.identifier);
      if (this._touches.size < 2) this._startDist = 0;
    };
    addEventListener('touchstart', this._onStart, { passive: false });
    addEventListener('touchmove', this._onMove, { passive: false });
    addEventListener('touchend', this._onEnd, { passive: false });
    addEventListener('touchcancel', this._onEnd, { passive: false });
  }
  dispose() {
    removeEventListener('touchstart', this._onStart);
    removeEventListener('touchmove', this._onMove);
    removeEventListener('touchend', this._onEnd);
    removeEventListener('touchcancel', this._onEnd);
  }
}

// ---------- mobile top-bar (pause + menu toggle) ----------
export class MobileTopBar {
  constructor(opts = {}) {
    this.onPause = opts.onPause || (() => {});
    this.onMenu = opts.onMenu || (() => {});
    this._root = el('div', 'kmob-top');
    this._root.innerHTML = `
      <button class="kmob-btn kmob-menu" aria-label="Menu">☰</button>
      <button class="kmob-btn kmob-pause" aria-label="Pause">‖</button>`;
    document.body.appendChild(this._root);
    this._menu = this._root.querySelector('.kmob-menu');
    this._pause = this._root.querySelector('.kmob-pause');
    this._menu.onclick = (e) => { e.preventDefault(); this.onMenu(); };
    this._pause.onclick = (e) => { e.preventDefault(); this.onPause(); };
  }
  show() { this._root.style.display = ''; }
  hide() { this._root.style.display = 'none'; }
  dispose() { this._root.remove(); }
}
