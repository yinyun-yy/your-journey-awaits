export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { down: false, x: 0, y: 0, clickX: 0, clickY: 0, justClicked: false, used: false };
    this.joy = { active: false, x: 0, y: 0, id: null, baseCX: 0, baseCY: 0, maxR: 60 };
    this.boost = false;
    this.btnAttack = false;
    this.btnSkill1 = false;
    this.btnSkill2 = false;
    this.isTouch = false;
    this.attackQueued = false;
    this.skill1Queued = false;
    this.skill2Queued = false;
    try {
      this.isTouch =
        window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    } catch (e) {
      this.isTouch = 'ontouchstart' in window;
    }
    this.onPause = null;
    this.onFirstGesture = null;

    this.bindKeyboard();
    this.bindMouse();
    if (this.isTouch) {
      this.bindJoystick();
      this.bindActionButtons();
    } else {
      this.bindPcActionClicks();
    }
  }

  key(k) {
    return this.keys.has(k);
  }

  moveVector() {
    const joy = this.joyVector();
    if (joy) return joy;
    const left = this.key('a') || this.key('arrowleft');
    const right = this.key('d') || this.key('arrowright');
    const up = this.key('w') || this.key('arrowup');
    const down = this.key('s') || this.key('arrowdown');
    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down ? 1 : 0) - (up ? 1 : 0);
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    const l = Math.hypot(dx, dy);
    return { x: dx / l, y: dy / l };
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) &&
        !this.isTyping()
      ) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(k);
      if ((k === 'escape' || k === 'p') && this.onPause) this.onPause();
      if (this.isTyping()) return;
      if (k === 'j' || k === 'z') this.attackQueued = true;
      if (k === 'k' || k === 'x') this.skill1Queued = true;
      if (k === 'l' || k === 'c') this.skill2Queued = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  isTyping() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }

  consumeAttack() {
    const q = this.attackQueued;
    this.attackQueued = false;
    return q;
  }

  consumeSkill1() {
    const q = this.skill1Queued;
    this.skill1Queued = false;
    return q;
  }

  consumeSkill2() {
    const q = this.skill2Queued;
    this.skill2Queued = false;
    return q;
  }

  consumeClickAttack() {
    const q = this.mouse.justClicked;
    this.mouse.justClicked = false;
    return q;
  }

  bindMouse() {
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouse.down = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (!this.isTouch && !this.isTyping()) this.mouse.justClicked = true;
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.used = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    window.addEventListener('pointerdown', () => {
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindJoystick() {
    const zone = document.getElementById('joy-zone');
    const knob = document.getElementById('joy-knob');
    if (!zone || !knob) return;

    const setKnob = (dx, dy) => {
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };

    const update = (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.baseCX;
      let dy = e.clientY - this.joy.baseCY;
      const appEl = document.getElementById('app');
      if (appEl && appEl.classList.contains('rotated')) {
        const t = dx;
        dx = dy;
        dy = -t;
      }
      const d = Math.hypot(dx, dy);
      if (d > this.joy.maxR) {
        dx = (dx / d) * this.joy.maxR;
        dy = (dy / d) * this.joy.maxR;
      }
      setKnob(dx, dy);
      this.joy.x = dx / this.joy.maxR;
      this.joy.y = dy / this.joy.maxR;
      this.joy.active = true;
    };

    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null;
      this.joy.active = false;
      this.joy.x = 0;
      this.joy.y = 0;
      setKnob(0, 0);
    };

    zone.addEventListener('pointerdown', (e) => {
      if (!this.isTouch) return;
      this.joy.id = e.pointerId;
      try {
        zone.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      const r = zone.getBoundingClientRect();
      this.joy.baseCX = r.left + r.width / 2;
      this.joy.baseCY = r.top + r.height / 2;
      this.joy.maxR = r.width * 0.36;
      if (this.onFirstGesture) this.onFirstGesture();
      update(e);
    });
    zone.addEventListener('pointermove', update);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  bindButton(id, onDown) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.onFirstGesture) this.onFirstGesture();
      onDown(true);
    });
    const release = () => onDown(false);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }

  bindActionButtons() {
    this.bindButton('btn-skill1', (d) => {
      if (d) this.skill1Queued = true;
    });
    this.bindButton('btn-attack', (d) => {
      this.btnAttack = d;
      if (d) this.attackQueued = true;
    });
    this.bindButton('btn-skill2', (d) => {
      if (d) this.skill2Queued = true;
    });
    this.bindButton('btn-boost', (d) => {
      this.boost = d;
      const el = document.getElementById('btn-boost');
      if (el) el.classList.toggle('active', d);
    });
  }

  bindPcActionClicks() {
    document.querySelectorAll('.pc-abil').forEach((btn) => {
      const id = btn.id;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (id === 'pc-attack') this.attackQueued = true;
        if (id === 'pc-skill1') this.skill1Queued = true;
        if (id === 'pc-skill2') this.skill2Queued = true;
      });
    });
  }

  joyVector() {
    return this.joy.active ? { x: this.joy.x, y: this.joy.y } : null;
  }

  boostHeld() {
    return this.boost || this.key(' ');
  }
}
