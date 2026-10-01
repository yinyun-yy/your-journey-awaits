import { ENEMIES, TILE } from './config.js';
import { TAU, clamp, dist, angleTo, rand } from './utils.js';

export class Enemy {
  constructor(def) {
    this.def = def;
    this.cfg = ENEMIES[def.type];
    this.kind = this.cfg.kind;
    this.x = 0;
    this.y = 0;
    this.spawnX = 0;
    this.spawnY = 0;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    this.r = this.cfg.r;
    this.alive = false;
    this.state = 'idle';
    this.facing = 1;
    this.animT = rand(TAU);
    this.wanderT = 0;
    this.wanderA = 0;
    this.windupT = 0;
    this.attackT = 0;
    this.attackCd = 0;
    this.hurtT = 0;
    this.deadT = 0;
    this.deadRot = 0;
    this.phase = 1;
    this.enraged = false;
    this.patternT = 0;
    this.pattern = 'chase';
    this.nextPatternAt = 2.2;
    this.volleyN = 0;
    this.volleyT = 0;
    this.slamWindup = 0;
    this.shockWindup = 0;
    this.contactCd = 0;
    this.chargeT = 0;
    this.chargeA = 0;
  }

  spawn(tx, ty) {
    this.x = (tx + 0.5) * TILE;
    this.y = (ty + 0.5) * TILE;
    this.spawnX = this.x;
    this.spawnY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    this.alive = true;
    this.state = 'idle';
    this.hurtT = 0;
    this.deadT = 0;
    this.phase = 1;
    this.enraged = false;
    this.pattern = 'chase';
    this.patternT = 0;
    this.nextPatternAt = 2.4;
    this.volleyN = 0;
    this.attackCd = rand(0.4, 1);
    this.animT = rand(TAU);
    this.contactCd = 0;
    this.chargeT = 0;
    this.chargeA = 0;
    this.slamWindup = 0;
    this.shockWindup = 0;
  }

  get dmgTaken() {
    return this.hurtT > 0;
  }

  hurt(dmg, fromX, fromY) {
    this.hp -= dmg;
    this.hurtT = 0.14;
    if (fromX !== undefined) {
      const a = angleTo(fromX, fromY, this.x, this.y);
      this.vx += Math.cos(a) * 240;
      this.vy += Math.sin(a) * 240;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.deadT = 0;
      this.deadRot = rand(-0.5, 0.5);
      return true;
    }
    if (this.kind === 'boss' && this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.enraged = true;
      return 'enrage';
    }
    return false;
  }

  update(dt, player, map, game) {
    if (!this.alive) return;
    this.animT += dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.state === 'dead') {
      this.deadT += dt;
      return;
    }
    if (this.attackCd > 0) this.attackCd -= dt;

    const d = dist(this.x, this.y, player.x, player.y);
    const dSpawn = dist(this.x, this.y, this.spawnX, this.spawnY);
    const aggro = this.kind === 'boss' || d < this.cfg.aggro;
    const leash = this.kind === 'boss' || dSpawn < 380;

    if (!aggro || !leash) {
      if (!aggro) this.state = 'idle';
      this.idleBehavior(dt, d);
    } else if (this.kind === 'boss') {
      this.bossBehavior(dt, player, game);
    } else if (this.state !== 'windup' && this.state !== 'attack') {
      this.combatBehavior(dt, player, game, d);
    } else {
      this.finishWindup(dt, player, game);
    }

    const k = 1 - Math.exp(-dt * 4);
    this.vx *= 1 - Math.exp(-dt * 3);
    this.vy *= 1 - Math.exp(-dt * 3);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.state !== 'dead') {
      map.resolveCircle(this, this.r * 0.75);
    }
    if (this.state === 'windup' || this.state === 'attack') return;
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 10) this.facing = this.vx >= 0 ? 1 : -1;
  }

  idleBehavior(dt, d) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rand(1.4, 3.2);
      this.wanderA = rand(TAU);
    }
    const k = 1 - Math.exp(-dt * 2);
    const tx = Math.cos(this.wanderA) * 30;
    const ty = Math.sin(this.wanderA) * 30;
    if (d > 120) {
      this.vx += (tx - this.vx) * k;
      this.vy += (ty - this.vy) * k;
    }
  }

  combatBehavior(dt, player, game, d) {
    const a = angleTo(this.x, this.y, player.x, player.y);
    if (this.kind === 'melee') {
      if (d > this.cfg.attackRange) {
        const spd = this.cfg.speed * (this.hp < this.maxHp * 0.4 ? 1.25 : 1);
        this.vx += (Math.cos(a) * spd - this.vx) * (1 - Math.exp(-dt * 5));
        this.vy += (Math.sin(a) * spd - this.vy) * (1 - Math.exp(-dt * 5));
        this.state = 'chase';
      } else if (this.attackCd <= 0) {
        this.state = 'windup';
        this.windupT = this.cfg.windup;
        this.attackCd = this.cfg.attackCd;
      }
    } else if (this.kind === 'ranged') {
      if (d < this.cfg.keepMin) {
        const back = a + Math.PI;
        const spd = this.cfg.speed;
        this.vx += (Math.cos(back) * spd - this.vx) * (1 - Math.exp(-dt * 4));
        this.vy += (Math.sin(back) * spd - this.vy) * (1 - Math.exp(-dt * 4));
      } else if (d > this.cfg.keepMax) {
        this.vx += (Math.cos(a) * this.cfg.speed - this.vx) * (1 - Math.exp(-dt * 4));
        this.vy += (Math.sin(a) * this.cfg.speed - this.vy) * (1 - Math.exp(-dt * 4));
      } else if (this.attackCd <= 0) {
        this.state = 'windup';
        this.windupT = 0.55;
        this.attackCd = this.cfg.attackCd;
      }
    }
  }

  finishWindup(dt, player, game) {
    if (this.state === 'windup') {
      this.windupT -= dt;
      if (this.windupT > 0) return;
      this.state = 'attack';
      this.attackT = 0.3;
      if (this.kind === 'melee') {
        this.meleeAttack(player, game);
      } else if (this.kind === 'ranged') {
        game.projectiles.add({
          type: 2,
          x: this.x,
          y: this.y - 10,
          vx: Math.cos(angleTo(this.x, this.y, player.x, player.y)) * this.cfg.projSpeed,
          vy: Math.sin(angleTo(this.x, this.y, player.x, player.y)) * this.cfg.projSpeed,
          r: 7,
          dmg: this.cfg.dmg,
          from: 'enemy',
          life: 3.2,
        });
        game.audio.ranged();
      }
    } else if (this.state === 'attack') {
      this.attackT -= dt;
      if (this.attackT <= 0) {
        this.state = 'chase';
      }
    }
  }

  meleeAttack(player, game) {
    const d = dist(this.x, this.y, player.x, player.y);
    if (d < this.cfg.attackRange + 16 && !player.dodging) {
      game.hitPlayer(this.cfg.dmg, this.x, this.y);
    }
    const a = angleTo(this.x, this.y, player.x, player.y);
    this.vx += Math.cos(a) * 260;
    this.vy += Math.sin(a) * 260;
  }

  bossBehavior(dt, player, game) {
    const spd = this.phase === 2 ? this.cfg.speed2 : this.cfg.speed;
    const a = angleTo(this.x, this.y, player.x, player.y);
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.contactCd > 0) this.contactCd -= dt;
    if (d < this.r + player.r + 10 && this.contactCd <= 0 && player.state !== 'dead') {
      this.contactCd = 1.0;
      if (!player.dodging) game.hitPlayer(this.cfg.dmg, this.x, this.y);
      const ka = a + Math.PI;
      player.vx += Math.cos(ka) * 280;
      player.vy += Math.sin(ka) * 280;
    }

    if (this.pattern === 'chase') {
      this.nextPatternAt -= dt;
      if (this.nextPatternAt <= 0) {
        this.pattern = 'slam';
        this.slamWindup = this.phase === 2 ? 0.6 : 0.9;
        this.attackCd = 1.6;
      } else {
        if (this.phase === 2 && d > 280 && Math.random() < dt * 0.5) {
          this.pattern = 'charge';
          this.chargeT = 0.75;
          this.chargeA = a;
        } else if (d > 80) {
          this.vx += (Math.cos(a) * spd - this.vx) * (1 - Math.exp(-dt * 3.5));
          this.vy += (Math.sin(a) * spd - this.vy) * (1 - Math.exp(-dt * 3.5));
        }
      }
    } else if (this.pattern === 'charge') {
      this.chargeT -= dt;
      const cs = spd * 2.7;
      this.vx += (Math.cos(this.chargeA) * cs - this.vx) * (1 - Math.exp(-dt * 8));
      this.vy += (Math.sin(this.chargeA) * cs - this.vy) * (1 - Math.exp(-dt * 8));
      if (this.chargeT <= 0) {
        this.pattern = 'chase';
        this.nextPatternAt = this.phase === 2 ? 1.2 : 2.0;
      }
    } else if (this.pattern === 'slam') {
      if (this.slamWindup > 0) {
        this.slamWindup -= dt;
        if (this.slamWindup <= 0) {
          this.pattern = 'slam2';
          this.attackT = 0.4;
          this.bossSlam(player, game);
        }
      }
    } else if (this.pattern === 'slam2') {
      this.attackT -= dt;
      if (this.attackT <= 0) {
        this.pattern = 'volley';
        this.volleyN = this.phase === 2 ? 7 : 5;
        this.volleyT = 0;
        this.attackCd = this.phase === 2 ? 1.4 : 1.9;
      }
    } else if (this.pattern === 'volley') {
      this.volleyT -= dt;
      if (this.volleyT <= 0 && this.volleyN > 0) {
        this.volleyN--;
        this.volleyT = 0.16;
        const base = angleTo(this.x, this.y, player.x, player.y) + (this.volleyN % 2 === 0 ? 0.3 : -0.3);
        game.projectiles.add({
          type: 3,
          x: this.x,
          y: this.y - 26,
          vx: Math.cos(base) * 250,
          vy: Math.sin(base) * 250,
          r: 8,
          dmg: this.cfg.volleyDmg,
          from: 'enemy',
          life: 3.5,
          color: '#ff8a3c',
          boss: true,
        });
        game.audio.ranged();
      }
      if (this.volleyN <= 0 && this.volleyT < -0.3) {
        this.pattern = 'wave';
        this.shockWindup = 0.7;
      }
    } else if (this.pattern === 'wave') {
      if (this.shockWindup > 0) {
        this.shockWindup -= dt;
        if (this.shockWindup <= 0) {
          game.effects.shock(this.x, this.y, '#ff8a3c', 190, 0.6);
          if (d < 190 && !player.dodging) {
            game.hitPlayer(this.cfg.waveDmg, this.x, this.y);
          }
          game.audio.shockwave();
          game.camera.shake(0.4);
          this.pattern = 'chase';
          this.nextPatternAt = this.phase === 2 ? 1.4 : 2.4;
        }
      }
    }
  }

  bossSlam(player, game) {
    const d = dist(this.x, this.y, player.x, player.y);
    game.effects.explode(this.x, this.y, '#c9b89a', 130);
    game.effects.shock(this.x, this.y, 'rgba(255,255,255,0.9)', 130, 0.45);
    game.camera.shake(0.55);
    game.audio.slam();
    if (d < this.cfg.slamR && !player.dodging) {
      game.hitPlayer(this.cfg.slamDmg, this.x, this.y);
    }
    const a = angleTo(this.x, this.y, player.x, player.y);
    this.vx += Math.cos(a) * 180;
    this.vy += Math.sin(a) * 180;
  }

  draw(ctx, time) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.state === 'dead') {
      ctx.rotate(this.deadRot * Math.min(1, this.deadT * 2));
      ctx.globalAlpha = clamp(1 - this.deadT * 1.6, 0, 1);
    }

    const hurt = this.hurtT > 0;
    if (this.kind === 'boss') this.drawBoss(ctx, time, hurt);
    else if (this.kind === 'melee') this.drawMossbeast(ctx, time, hurt);
    else this.drawDewsprit(ctx, time, hurt);

    ctx.restore();
  }

  drawMossbeast(ctx, time, hurt) {
    const r = this.r;
    const hop = Math.sin(this.animT * (this.state === 'chase' ? 11 : 4)) * 2.2;
    const windup = this.state === 'windup' ? Math.sin(this.animT * 30) * 3 : 0;
    const bob = Math.sin(time * 2.5 + this.animT) * 1.6;

    ctx.save();
    ctx.translate(0, -hop + windup);
    ctx.scale(this.facing, 1);

    ctx.fillStyle = 'rgba(40,60,40,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.9, r * 1.15, r * 0.42, 0, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      const lx = side * r * 0.62;
      const ly = r * 0.75;
      ctx.fillStyle = '#5c8a3e';
      ctx.beginPath();
      ctx.ellipse(lx, ly, r * 0.22, r * 0.14, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,70,40,0.6)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.15, 0, 0, r * 1.15);
    g.addColorStop(0, '#a8cf6e');
    g.addColorStop(0.55, '#7cab4e');
    g.addColorStop(1, '#4f7d38');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,70,40,0.65)';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.fillStyle = '#3f6630';
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, r * 0.1);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.55, -r * 0.55, r * 0.72);
    ctx.quadraticCurveTo(-r * 0.2, r * 0.55, -r * 0.35, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.8, r * 0.15);
    ctx.quadraticCurveTo(r * 0.9, r * 0.6, r * 0.5, r * 0.75);
    ctx.quadraticCurveTo(r * 0.15, r * 0.6, r * 0.3, r * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#4f7d38';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = -0.8 + i * 0.5 + Math.sin(time * 3 + i) * 0.08;
      const bx = Math.cos(a) * r * 0.42;
      const by = -r * 0.55 + Math.sin(a) * r * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx - 3, by);
      ctx.quadraticCurveTo(bx - 6, by - 7, bx - 9 + Math.sin(time * 4 + i) * 2, by - 12);
      ctx.stroke();
    }

    ctx.fillStyle = '#e8f5d8';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.28, r * 0.52, r * 0.34, 0, 0, TAU);
    ctx.fill();

    const eyeOpen = this.state === 'windup' ? 1.4 : 1;
    for (const side of [-1, 1]) {
      const ex = side * r * 0.34;
      const ey = -r * 0.34;
      ctx.fillStyle = '#fff9c9';
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.16 * eyeOpen, r * 0.2 * eyeOpen, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,80,40,0.7)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#3a2c14';
      ctx.beginPath();
      ctx.arc(ex + r * 0.05, ey, r * 0.08, 0, TAU);
      ctx.fill();
    }

    const mouth = this.state === 'windup' || this.state === 'attack' ? 1 : 0;
    ctx.fillStyle = '#3a2c14';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05, r * 0.3, r * 0.14 * (0.4 + mouth * 0.6), 0, 0, TAU);
    ctx.fill();
    if (mouth > 0) {
      ctx.fillStyle = '#ffffff';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.2, -r * 0.12);
        ctx.lineTo(side * r * 0.26, -r * 0.02);
        ctx.lineTo(side * r * 0.14, -r * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (hurt) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 1.05, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawDewsprit(ctx, time, hurt) {
    const r = this.r;
    const bob = Math.sin(time * 3 + this.animT) * 3;
    const windup = this.state === 'windup' ? 1 + Math.sin(this.animT * 25) * 0.22 : 1;

    ctx.save();
    ctx.translate(0, bob - 6);
    ctx.scale(this.facing, 1);

    ctx.fillStyle = 'rgba(60,120,140,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75 + 4, r * 0.7, r * 0.25, 0, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * r * 0.5, r * 0.1);
      ctx.rotate(side * (0.5 + Math.sin(time * 9 + side) * 0.4));
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(side * r * 0.4, 0, r * 0.42, r * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,180,210,0.6)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#6fae4e';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2 + this.animT;
      const px = Math.cos(a) * r * 0.55;
      const py = r * 0.5 + Math.sin(a) * r * 0.55;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.3, r * 0.14, a, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(50,100,50,0.5)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
    g.addColorStop(0, '#d9f4ff');
    g.addColorStop(0.5, '#8fd8f0');
    g.addColorStop(1, '#4fb4dc');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.2, r * 0.55, r * 0.75);
    ctx.quadraticCurveTo(0, r * 0.98, -r * 0.55, r * 0.75);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.2, 0, -r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,120,160,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.18, r * 0.3, -0.4, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      const ex = side * r * 0.28;
      const ey = -r * 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.2 * windup, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3a5a78';
      ctx.beginPath();
      ctx.arc(ex + r * 0.04, ey, r * 0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(ex + r * 0.07, ey - r * 0.04, r * 0.035, 0, TAU);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(70,110,140,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.18, 0.3, Math.PI - 0.3);
    ctx.stroke();

    if (this.state === 'windup') {
      ctx.globalAlpha = 0.5 + Math.sin(this.animT * 20) * 0.25;
      ctx.fillStyle = '#ff9ad0';
      ctx.beginPath();
      ctx.arc(r * 0.6, -r * 0.3, r * 0.4 * windup, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (hurt) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 1.1, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawBoss(ctx, time, hurt) {
    const r = this.r;
    const enraged = this.enraged;
    const coreColor = enraged ? '#ff6a3c' : '#ffd76a';
    const coreGlow = enraged ? 'rgba(255,106,60,0.55)' : 'rgba(255,215,106,0.4)';
    const windup = this.pattern === 'slam' ? Math.sin(this.animT * 22) * 4 : 0;
    const breath = Math.sin(time * 2.2) * 2;

    ctx.save();
    ctx.translate(0, breath + windup * 0.3);

    ctx.fillStyle = 'rgba(40,40,45,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, r * 1.05, r * 1.1, r * 0.4, 0, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      const lx = side * r * 0.66;
      const ly = r * 0.85;
      ctx.fillStyle = '#6f6a5e';
      ctx.beginPath();
      ctx.ellipse(lx, ly, r * 0.28, r * 0.18, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(45,42,38,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (const side of [-1, 1]) {
      const ax = side * r * 0.85;
      const ay = -r * 0.35;
      const armRaise = this.pattern === 'slam' ? -22 : this.pattern === 'wave' ? 8 : 0;
      ctx.fillStyle = '#7d7868';
      ctx.fillRect(ax - r * 0.17, ay - r * 0.3 + armRaise, r * 0.34, r * 0.95);
      ctx.strokeStyle = 'rgba(45,42,38,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeRect(ax - r * 0.17, ay - r * 0.3 + armRaise, r * 0.34, r * 0.95);
      ctx.fillStyle = '#6f6a5e';
      ctx.beginPath();
      ctx.arc(ax, ay + r * 0.7 + armRaise * 0.9, r * 0.24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = enraged ? '#ff6a3c' : '#c9b89a';
      ctx.beginPath();
      ctx.arc(ax, ay + r * 0.7 + armRaise * 0.9, r * 0.1, 0, TAU);
      ctx.fill();
      if (this.pattern === 'slam') {
        ctx.fillStyle = 'rgba(255,180,120,0.5)';
        ctx.beginPath();
        ctx.arc(ax, ay + r * 0.7 + armRaise * 0.9, r * 0.3 + Math.sin(this.animT * 20) * 4, 0, TAU);
        ctx.fill();
      }
    }

    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#a49a86');
    g.addColorStop(0.6, '#8d8572');
    g.addColorStop(1, '#6f6a5e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.55);
    ctx.lineTo(r * 0.85, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.8, r * 0.7, 0, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.8, r * 0.7, -r * 0.85, -r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,42,38,0.85)';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(60,55,48,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.5);
    ctx.lineTo(-r * 0.36, r * 0.5);
    ctx.moveTo(r * 0.3, -r * 0.5);
    ctx.lineTo(r * 0.36, r * 0.5);
    ctx.stroke();

    ctx.fillStyle = '#5f8f3c';
    ctx.beginPath();
    ctx.ellipse(r * 0.55, r * 0.4, r * 0.22, r * 0.12, 0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-r * 0.6, -r * 0.42, r * 0.18, r * 0.1, -0.4, 0, TAU);
    ctx.fill();

    const corePulse = 1 + Math.sin(time * 4) * 0.08;
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 0.34 * corePulse * 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = time * 1.5 + (i / 4) * TAU;
      const px = Math.cos(a) * r * 0.3 * corePulse;
      const py = -r * 0.05 + Math.sin(a) * r * 0.3 * corePulse;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = enraged ? 'rgba(200,70,30,0.9)' : 'rgba(150,120,60,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#8d8572';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.9);
    ctx.lineTo(r * 0.3, -r * 0.9);
    ctx.lineTo(r * 0.18, -r * 1.28);
    ctx.lineTo(-r * 0.18, -r * 1.28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,42,38,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = enraged ? '#ff6a3c' : '#c9b89a';
    ctx.fillRect(-r * 0.12, -r * 1.28, r * 0.24, 6);

    ctx.fillStyle = enraged ? '#ff6a3c' : '#ffd76a';
    ctx.save();
    ctx.globalAlpha = 0.9 + Math.sin(time * 6) * 0.1;
    ctx.beginPath();
    ctx.ellipse(r * 0.34, -r * 0.62, r * 0.12, r * 0.06, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (hurt) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 1.15, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
