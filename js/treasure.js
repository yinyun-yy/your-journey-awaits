import { TILE } from './config.js';
import { TAU, dist, rand } from './utils.js';

export class Treasure {
  constructor(level) {
    this.chests = [];
    this.coins = [];
    this.hearts = [];
    for (const c of level.chests || []) {
      this.chests.push({
        x: (c.tx + 0.5) * TILE,
        y: (c.ty + 0.5) * TILE,
        opened: false,
        animT: 0,
        phase: rand(TAU),
      });
    }
    for (const c of level.coins || []) {
      for (let i = 0; i < c.n; i++) {
        this.coins.push({
          x: (c.tx + 0.5) * TILE + rand(-18, 18),
          y: (c.ty + 0.5) * TILE + rand(-18, 18),
          vx: 0,
          vy: 0,
          taken: false,
          phase: rand(TAU),
          life: 0,
          scatterT: 0,
        });
      }
    }
  }

  reset() {
    for (const c of this.chests) {
      c.opened = false;
      c.animT = 0;
    }
    for (const c of this.coins) {
      c.taken = false;
      c.life = 0;
      c.scatterT = 0;
      c.vx = 0;
      c.vy = 0;
    }
    this.hearts.length = 0;
  }

  dropCoin(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.coins.push({
        x: x + rand(-8, 8),
        y: y + rand(-8, 8),
        vx: rand(-150, 150),
        vy: rand(-220, -60),
        taken: false,
        phase: rand(TAU),
        life: 24,
        scatterT: 0.5,
      });
    }
  }

  dropHeart(x, y) {
    this.hearts.push({
      x,
      y,
      vx: rand(-60, 60),
      vy: rand(-160, -90),
      taken: false,
      life: 20,
      phase: rand(TAU),
      scatterT: 0.5,
    });
  }

  tryOpenChest(x, y, r, game) {
    for (const c of this.chests) {
      if (c.opened) continue;
      if (dist(x, y, c.x, c.y) < r + 30) {
        c.opened = true;
        c.animT = 0;
        game.audio.chest();
        game.particles.sparks(c.x, c.y - 20, '#ffd76a', 24, 240);
        game.particles.burst(c.x, c.y - 20, '#fff3c4', 14, 200);
        game.texts.add(c.x, c.y - 46, '宝箱 +50 🪙', '#ffe9a0', 18, 1.2);
        this.dropCoin(c.x, c.y, 10);
        game.player.heal(30);
        game.player.coins += 50;
        game.score += 150;
        if (game.ui) game.ui.flashCoinPop();
        return true;
      }
    }
    return false;
  }

  update(dt, player, game) {
    for (const c of this.chests) {
      if (c.opened) c.animT += dt;
    }
    for (const c of this.coins) {
      if (c.taken) continue;
      c.phase += dt;
      if (c.life > 0) c.life -= dt;
      if (c.scatterT > 0) {
        c.scatterT -= dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 700 * dt;
      }
      if (c.life <= 0) {
        c.taken = true;
        continue;
      }
      if (dist(c.x, c.y, player.x, player.y) < player.r + 16) {
        c.taken = true;
        player.coins += 1;
        game.score += 5;
        game.audio.coin();
        game.particles.sparks(c.x, c.y, '#ffd76a', 5, 90);
        game.texts.add(c.x, c.y - 18, '+1 🪙', '#ffe9a0', 13, 0.7);
      }
    }
    for (const h of this.hearts) {
      if (h.taken) continue;
      h.phase += dt;
      h.life -= dt;
      if (h.scatterT > 0) {
        h.scatterT -= dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.vy += 700 * dt;
      }
      if (h.life <= 0) {
        h.taken = true;
        continue;
      }
      if (dist(h.x, h.y, player.x, player.y) < player.r + 16) {
        h.taken = true;
        player.heal(12);
        game.audio.coin();
        game.particles.sparks(h.x, h.y, '#ff8a7a', 8, 110);
        game.texts.add(h.x, h.y - 20, '+12 ❤', '#ff9b9b', 14, 0.8);
      }
    }
  }

  draw(ctx, time) {
    for (const c of this.chests) {
      this.drawChest(ctx, c, time);
    }
    for (const c of this.coins) {
      if (c.taken) continue;
      const bob = Math.sin(time * 3 + c.phase) * 3;
      const flicker = c.life < 3 && c.life > 0 && Math.floor(time * 8) % 2 === 0;
      if (flicker) continue;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      const w = Math.abs(Math.cos(time * 2.4 + c.phase));
      ctx.scale(Math.max(0.25, w), 1);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#d8a63c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(-2, -2, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    for (const h of this.hearts) {
      if (h.taken) continue;
      const flicker = h.life < 3 && Math.floor(time * 8) % 2 === 0;
      if (flicker) continue;
      const bob = Math.sin(time * 3 + h.phase) * 3;
      ctx.save();
      ctx.translate(h.x, h.y + bob);
      ctx.fillStyle = '#ff6b7a';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-12, -2, -7, -12, 0, -5);
      ctx.bezierCurveTo(7, -12, 12, -2, 0, 6);
      ctx.fill();
      ctx.strokeStyle = '#c9404f';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(-3, -4, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawChest(ctx, c, time) {
    ctx.save();
    ctx.translate(c.x, c.y);
    const hop = c.opened ? 0 : Math.sin(time * 2 + c.phase) * 1.4;

    ctx.fillStyle = 'rgba(40,50,30,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 26, 9, 0, 0, TAU);
    ctx.fill();

    ctx.translate(0, hop);
    if (c.opened && c.animT < 0.5) {
      const f = Math.min(1, c.animT / 0.5);
      ctx.save();
      ctx.translate(0, -8);
      ctx.rotate(-f * 1.1);
      ctx.fillStyle = '#8a5a3b';
      ctx.fillRect(-22, -16, 44, 12);
      ctx.strokeStyle = 'rgba(60,35,20,0.7)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-22, -16, 44, 12);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(-14, -11, 28, 3);
      ctx.restore();
    } else if (!c.opened) {
      ctx.fillStyle = '#8a5a3b';
      ctx.fillRect(-22, -20, 44, 13);
      ctx.strokeStyle = 'rgba(60,35,20,0.7)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-22, -20, 44, 13);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(-14, -15, 28, 3);
    }

    const g = ctx.createLinearGradient(0, -8, 0, 16);
    g.addColorStop(0, '#9a6b3f');
    g.addColorStop(1, '#6b4a2e');
    ctx.fillStyle = g;
    ctx.fillRect(-22, -8, 44, 24);
    ctx.strokeStyle = 'rgba(60,35,20,0.7)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-22, -8, 44, 24);

    ctx.strokeStyle = '#d8a63c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22, -2);
    ctx.lineTo(22, -2);
    ctx.stroke();

    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(-4, -4, 8, 12);
    ctx.strokeStyle = '#b8862f';
    ctx.lineWidth = 2;
    ctx.strokeRect(-4, -4, 8, 12);

    if (!c.opened) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 3 + c.phase) * 0.25;
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = time * 1.5 + (i / 4) * TAU;
        const px = Math.cos(a) * 30;
        const py = -14 + Math.sin(a) * 6;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        ctx.lineTo(Math.cos(a) * 34, -14 + Math.sin(a) * 6);
      }
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
