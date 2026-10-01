import { TAU, rand } from './utils.js';

const PT_DOT = 0;
const PT_BUBBLE = 1;
const PT_RING = 2;
const PT_SPARK = 3;
const PT_STREAK = 4;

export class Particles {
  constructor(max) {
    this.max = max;
    this.items = [];
    for (let i = 0; i < max; i++) {
      this.items.push({
        active: false,
        type: PT_DOT,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        size: 4, grow: 0,
        color: '#fff',
        alpha: 1,
        grav: 0,
        drag: 0,
        rot: 0, spin: 0,
        wob: 0, wobFreq: 0,
      });
    }
    this.cursor = 0;
  }

  add(props) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    p.active = true;
    p.type = props.type !== undefined ? props.type : PT_DOT;
    p.x = props.x;
    p.y = props.y;
    p.vx = props.vx || 0;
    p.vy = props.vy || 0;
    p.life = 0;
    p.maxLife = props.maxLife || 0.7;
    p.size = props.size || 4;
    p.grow = props.grow || 0;
    p.color = props.color || '#fff';
    p.alpha = props.alpha !== undefined ? props.alpha : 1;
    p.grav = props.grav || 0;
    p.drag = props.drag !== undefined ? props.drag : 0.9;
    p.rot = props.rot || rand(TAU);
    p.spin = props.spin || 0;
    p.wob = props.wob || 0;
    p.wobFreq = props.wobFreq || 0;
    return p;
  }

  burst(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(spd * 0.3, spd);
      this.add({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        maxLife: rand(0.35, 0.7),
        size: rand(3, 7),
        color,
        grav: 60,
      });
    }
  }

  ring(x, y, color, size, maxLife) {
    this.add({ type: PT_RING, x, y, size: size || 10, maxLife: maxLife || 0.55, color });
  }

  bubbles(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.add({
        type: PT_BUBBLE,
        x: x + rand(-14, 14),
        y: y + rand(-8, 8),
        vx: rand(-12, 12),
        vy: rand(-46, -20),
        maxLife: rand(0.8, 1.6),
        size: rand(2.5, 6),
        wob: rand(3, 8),
        wobFreq: rand(3, 7),
        alpha: rand(0.35, 0.7),
      });
    }
  }

  sparks(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(spd * 0.4, spd);
      this.add({
        type: PT_SPARK,
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        maxLife: rand(0.4, 0.8),
        size: rand(2.5, 5),
        color,
        spin: rand(-6, 6),
      });
    }
  }

  streak(x, y, angle, color, len) {
    this.add({
      type: PT_STREAK,
      x, y,
      vx: Math.cos(angle) * 60,
      vy: Math.sin(angle) * 60,
      maxLife: 0.3,
      size: len || 16,
      color,
      alpha: 0.35,
      rot: angle,
    });
  }

  levelUp(x, y) {
    this.ring(x, y, '#ffe9a0', 30, 0.7);
    this.ring(x, y, '#7ed06a', 18, 0.6);
    this.ring(x, y, '#ffffff', 10, 0.5);
    this.sparks(x, y, '#ffd84a', 22, 260);
    this.sparks(x, y, '#a8e063', 14, 180);
    this.burst(x, y, '#ffffff', 12, 200);
    this.add({ type: PT_RING, x, y, size: 6, maxLife: 0.8, color: 'rgba(255,255,255,0.9)' });
  }

  eatPop(x, y, color, size) {
    this.ring(x, y, color, size * 0.5, 0.4);
    this.burst(x, y, color, 7, size * 6);
    this.sparks(x, y, '#ffffff', 4, size * 4);
    this.add({ type: PT_RING, x, y, size: 4, maxLife: 0.3, color: '#ffffff' });
  }

  splash(x, y, size) {
    this.ring(x, y, 'rgba(255,255,255,0.9)', size, 0.5);
    this.burst(x, y, '#bfe7f7', 8, size * 5);
  }

  dust(x, y) {
    this.add({
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      vx: rand(-20, 20),
      vy: rand(-26, -6),
      maxLife: rand(0.4, 0.7),
      size: rand(3, 6),
      color: 'rgba(150,190,120,0.8)',
      grav: -20,
    });
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy += p.grav * dt;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr;
      p.vy *= dr;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      if (!p.active) continue;
      const f = p.life / p.maxLife;
      const a = p.alpha * (1 - f);
      if (a <= 0.01) continue;
      if (p.type === PT_BUBBLE) {
        const bx = p.x + Math.sin(p.life * p.wobFreq) * p.wob;
        ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, p.y, p.size, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.4).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(bx - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, TAU);
        ctx.fill();
      } else if (p.type === PT_RING) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3 * (1 - f) + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.3 + f * 2.2), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.type === PT_SPARK) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const s = p.size * (1 - f * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.3, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.type === PT_STREAK) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(p.rot) * p.size, p.y - Math.sin(p.rot) * p.size);
        ctx.lineTo(p.x + Math.cos(p.rot) * p.size, p.y + Math.sin(p.rot) * p.size);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
}

export class Texts {
  constructor(max) {
    this.max = max;
    this.items = [];
    for (let i = 0; i < max; i++) {
      this.items.push({ active: false, x: 0, y: 0, text: '', color: '#fff', t: 0, dur: 1, size: 16 });
    }
    this.cursor = 0;
  }

  add(x, y, text, color, size, dur) {
    const t = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    t.active = true;
    t.x = x;
    t.y = y;
    t.text = text;
    t.color = color || '#fff';
    t.size = size || 16;
    t.dur = dur || 1.1;
    t.t = 0;
  }

  update(dt) {
    for (const t of this.items) {
      if (!t.active) continue;
      t.t += dt;
      if (t.t >= t.dur) t.active = false;
    }
  }

  draw(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.items) {
      if (!t.active) continue;
      const f = t.t / t.dur;
      const pop = f < 0.18 ? 0.5 + (f / 0.18) * 0.5 : 1;
      const y = t.y - f * 46;
      const a = f > 0.65 ? 1 - (f - 0.65) / 0.35 : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '900 ' + Math.round(t.size * pop) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(50,50,30,0.55)';
      ctx.strokeText(t.text, t.x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, y);
      ctx.globalAlpha = 1;
    }
  }
}
