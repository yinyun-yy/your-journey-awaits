import { TAU, rand, clamp } from './utils.js';

const P_ORB = 0;
const P_STARFALL = 1;
const P_ENEMY = 2;
const P_RUNE = 3;

export class Projectiles {
  constructor(max) {
    this.max = max;
    this.items = [];
    for (let i = 0; i < max; i++) {
      this.items.push({
        active: false,
        type: P_ORB,
        x: 0, y: 0, vx: 0, vy: 0,
        r: 6,
        dmg: 10,
        life: 3,
        maxLife: 3,
        from: 'player',
        color: '#8a7bff',
        tx: 0, ty: 0,
        trail: 0,
        boss: false,
        target: null,
        turnRate: 0,
        spd: 0,
      });
    }
    this.cursor = 0;
  }

  add(props) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    p.active = true;
    p.type = props.type !== undefined ? props.type : P_ORB;
    p.x = props.x;
    p.y = props.y;
    p.vx = props.vx || 0;
    p.vy = props.vy || 0;
    p.r = props.r || 6;
    p.dmg = props.dmg || 10;
    p.life = props.life || 3;
    p.maxLife = p.life;
    p.from = props.from || 'player';
    p.color = props.color || '#8a7bff';
    p.tx = props.tx || p.x;
    p.ty = props.ty || p.y;
    p.trail = 0;
    p.boss = !!props.boss;
    p.rot = props.rot !== undefined ? props.rot : rand(TAU);
    p.target = props.target || null;
    p.turnRate = props.turnRate || 0;
    p.spd = Math.hypot(p.vx, p.vy);
    return p;
  }

  update(dt, map) {
    for (const p of this.items) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      if (p.turnRate > 0 && p.target && p.target.alive && p.target.state !== 'dead') {
        const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        let diff = want - cur;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const turn = clamp(diff, -p.turnRate * dt, p.turnRate * dt);
        const na = cur + turn;
        p.vx = Math.cos(na) * p.spd;
        p.vy = Math.sin(na) * p.spd;
        p.rot = na;
        if (p.type === P_STARFALL) {
          p.tx = p.target.x;
          p.ty = p.target.y;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === P_STARFALL) {
        const d = Math.hypot(p.tx - p.x, p.ty - p.y);
        if (d < 14) {
          p.active = false;
          p.exploded = true;
        }
      }
      if (map.solidAtWorld(p.x, p.y)) {
        if (p.type === P_ENEMY || p.type === P_RUNE) {
          p.active = false;
          p.exploded = false;
        }
      }
    }
  }

  draw(ctx, time) {
    for (const p of this.items) {
      if (!p.active) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.type === P_ENEMY) {
        const pulse = 1 + Math.sin(time * 12) * 0.14;
        ctx.fillStyle = 'rgba(255,140,190,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 1.8 * pulse, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ff7ab8';
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140,40,90,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(-2, -2, 2.4, 0, TAU);
        ctx.fill();
      } else if (p.type === P_RUNE) {
        const pulse = 1 + Math.sin(time * 10) * 0.18;
        ctx.fillStyle = p.boss ? 'rgba(255,120,60,0.4)' : 'rgba(255,190,80,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 2 * pulse, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = time * 5 + (i / 4) * TAU;
          const px = Math.cos(a) * p.r * 1.15;
          const py = Math.sin(a) * p.r * 1.15;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,70,20,0.7)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (p.type === P_STARFALL) {
        const a = p.rot + time * 6;
        ctx.fillStyle = 'rgba(200,190,255,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 2, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = '#d9c8ff';
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r * 0.35, 0);
        ctx.lineTo(0, p.r);
        ctx.lineTo(-p.r * 0.35, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,200,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      } else {
        const a = p.rot + time * 5;
        ctx.fillStyle = 'rgba(190,180,255,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 1.9, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = '#b9a8ff';
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r * 0.4, 0);
        ctx.lineTo(0, p.r);
        ctx.lineTo(-p.r * 0.4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(110,80,200,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export class Effects {
  constructor() {
    this.items = [];
  }

  add(e) {
    e.t = 0;
    e.done = false;
    this.items.push(e);
    return e;
  }

  slash(x, y, angle, color, radius) {
    this.add({ kind: 'slash', x, y, angle, color, radius, dur: 0.18 });
  }

  spin(x, y, color, radius) {
    this.add({ kind: 'spin', x, y, color, radius, dur: 0.32, rot: 0 });
  }

  ring(x, y, color, radius, dur) {
    this.add({ kind: 'ring', x, y, color, radius, dur, rot: 0 });
  }

  shock(x, y, color, radius, dur) {
    this.add({ kind: 'shock', x, y, color, radius, dur, rot: 0 });
  }

  explode(x, y, color, radius) {
    this.add({ kind: 'explode', x, y, color, radius, dur: 0.35 });
  }

  aura(x, y, color, radius, dur) {
    this.add({ kind: 'aura', x, y, color, radius, dur, rot: 0 });
  }

  update(dt) {
    for (const e of this.items) {
      if (e.done) continue;
      e.t += dt;
      if (e.t >= e.dur) e.done = true;
    }
    this.items = this.items.filter((e) => !e.done);
  }

  draw(ctx) {
    for (const e of this.items) {
      const f = e.t / e.dur;
      if (e.kind === 'slash') {
        const a0 = e.angle - 1.1;
        const a1 = e.angle + 1.1;
        const sweep = a0 + (a1 - a0) * Math.min(1, f * 2.2);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(sweep);
        ctx.globalAlpha = 1 - f;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, e.radius, -0.5, 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = (1 - f) * 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.85, -0.5, 0.5);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'spin') {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(f * 3.2);
        ctx.globalAlpha = 1 - f;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 5 * (1 - f) + 1;
        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
          const a = i * Math.PI;
          ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.quadraticCurveTo(
            Math.cos(a + 0.5) * e.radius * 0.7,
            Math.sin(a + 0.5) * e.radius * 0.7,
            Math.cos(a + 1.4) * e.radius,
            Math.sin(a + 1.4) * e.radius
          );
        }
        ctx.stroke();
        ctx.globalAlpha = (1 - f) * 0.35;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * f, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'ring' || e.kind === 'shock') {
        const rr = e.radius * (0.25 + f * 0.85);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = 1 - f;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.kind === 'shock' ? 8 * (1 - f) + 2 : 4 * (1 - f) + 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
        if (e.kind === 'ring') {
          ctx.globalAlpha = (1 - f) * 0.3;
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(0, 0, rr, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'explode') {
        const rr = e.radius * (0.3 + f * 0.9);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = 1 - f;
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, rr);
        g.addColorStop(0, e.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = (1 - f) * 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, rr * 0.6, 0, TAU);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'aura') {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = (1 - f) * 0.5;
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, e.radius);
        g.addColorStop(0, e.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
  }
}
