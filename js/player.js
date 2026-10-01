import { CONFIG, SKILLS, CHARACTERS } from './config.js';
import { TAU, clamp, dist, angleTo, rand } from './utils.js';
import { CHARACTER_DRAW } from './characters.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.r = CONFIG.player.r;
    this.facing = 1;
    this.aim = 0;
    this.facingAngle = 0;
    this.lockTarget = null;
    this.name = '旅行者';
    this.characterId = 'aster';
    this.reset();
  }

  get character() {
    return CHARACTERS.find((c) => c.id === this.characterId) || CHARACTERS[0];
  }

  get skills() {
    return SKILLS[this.characterId];
  }

  reset() {
    this.hp = CONFIG.player.hpMax;
    this.stamina = CONFIG.player.staminaMax;
    this.lockTarget = null;
    this.animT = rand(TAU);
    this.blinkT = rand(2, 5);
    this.blink = 0;
    this.hurtT = 0;
    this.invulnT = 0;
    this.dead = false;
    this.deadT = 0;
    this.boosting = false;
    this.staminaDelay = 0;
    this.moving = false;
    this.attackT = -1;
    this.attackCd = 0;
    this.combo = 0;
    this.comboT = 0;
    this.skill1Cd = 0;
    this.skill2Cd = 0;
    this.dashT = 0;
    this.dashDir = { x: 1, y: 0 };
    this.dashHit = new Set();
    this.spinT = 0;
    this.spinHit = new Set();
    this.ringT = 0;
    this.ringHit = new Set();
    this.walkPhase = 0;
    this.vx = 0;
    this.vy = 0;
    this.coins = 0;
    this.kills = 0;
    this.hurtFlash = false;
    this.victoryT = 0;
    this.runTime = 0;
  }

  get dodging() {
    return this.dashT > 0;
  }

  get state() {
    if (this.dead) return 'dead';
    if (this.hurtT > 0) return 'hurt';
    if (this.dashT > 0) return 'dash';
    if (this.spinT > 0) return 'skill2';
    if (this.ringT > 0) return 'skill2';
    if (this.attackT >= 0) return 'attack';
    if (this.moving) return 'walk';
    return 'idle';
  }

  hurt(dmg, fromX, fromY) {
    if (this.invulnT > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtT = 0.35;
    this.hurtFlash = true;
    this.invulnT = CONFIG.player.invuln;
    const a = angleTo(fromX, fromY, this.x, this.y);
    this.vx += Math.cos(a) * 320;
    this.vy += Math.sin(a) * 320;
    if (this.hp <= 0) {
      this.dead = true;
      this.deadT = 0;
      this.vx = 0;
      this.vy = 0;
    }
    return true;
  }

  heal(n) {
    this.hp = Math.min(CONFIG.player.hpMax, this.hp + n);
  }

  startVictory() {
    this.victoryT = 0;
  }

  update(dt, input, map, game) {
    this.animT += dt;
    this.runTime += dt;
    if (this.dead) {
      this.deadT += dt;
      return;
    }
    if (this.victoryT > 0) {
      this.victoryT -= dt;
    }

    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.hurtFlash && this.hurtT <= 0) this.hurtFlash = false;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.skill1Cd > 0) this.skill1Cd -= dt;
    if (this.skill2Cd > 0) this.skill2Cd -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.attackT >= 0) {
      this.attackT += dt;
      if (this.attackT > 0.18) this.attackT = -1;
    }
    if (this.spinT > 0) {
      this.spinT -= dt;
      this.spinUpdate(game);
    }
    if (this.ringT > 0) {
      this.ringT -= dt;
      this.ringUpdate(game);
    }

    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.14;
      this.blinkT = rand(2.4, 5.5);
    }
    if (this.blink > 0) this.blink -= dt;

    const move = input.moveVector();
    this.moving = move.x !== 0 || move.y !== 0;

    const wantBoost = input.boostHeld() && this.stamina > 0.5;
    if (wantBoost) {
      this.stamina = Math.max(0, this.stamina - dt * CONFIG.player.staminaDrain);
      this.staminaDelay = CONFIG.player.staminaDelay;
      this.boosting = true;
    } else {
      this.boosting = false;
      if (this.staminaDelay > 0) this.staminaDelay -= dt;
      else this.stamina = Math.min(CONFIG.player.staminaMax, this.stamina + dt * CONFIG.player.staminaRegen);
    }

    const maxSpeed = CONFIG.player.speed * (this.boosting ? CONFIG.player.boostMult : 1);
    const k = 1 - Math.exp(-dt * (this.dashT > 0 ? 14 : 9));
    this.vx += (move.x * maxSpeed - this.vx) * k;
    this.vy += (move.y * maxSpeed - this.vy) * k;

    if (this.dashT > 0) {
      this.dashT -= dt;
      const ds = 1150;
      this.vx = this.dashDir.x * ds;
      this.vy = this.dashDir.y * ds;
      game.particles.streak(this.x, this.y, Math.atan2(this.vy, this.vx) + Math.PI, 'rgba(140,255,220,0.8)', 26);
      if (Math.random() < dt * 40) {
        game.particles.add({
          x: this.x + rand(-10, 10),
          y: this.y + rand(-10, 10),
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          maxLife: 0.3,
          size: 3,
          color: '#b8ffe8',
        });
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    map.resolveCircle(this, this.r);

    const speed = Math.hypot(this.vx, this.vy);
    this.walkPhase += dt * (6 + speed * 0.02);
    if (this.moving && this.dashT <= 0) {
      if (Math.abs(this.vx) > 10) this.facing = this.vx > 0 ? 1 : -1;
    }

    this.updateAim(dt, input, game);

    if (input.consumeSkill1()) {
      this.trySkill1(game);
    }
    if (input.consumeSkill2()) {
      this.trySkill2(game);
    }

    if (input.consumeAttack() || input.consumeClickAttack()) {
      this.tryAttack(game);
    } else if (input.btnAttack && this.attackCd <= 0) {
      this.tryAttack(game);
    }

    if (this.boosting && speed > 40 && Math.random() < dt * 12) {
      const a = Math.atan2(this.vy, this.vx) + Math.PI;
      game.particles.streak(
        this.x + Math.cos(a) * 12,
        this.y + Math.sin(a) * 12,
        a,
        this.characterId === 'aster' ? 'rgba(120,255,200,0.55)' : 'rgba(180,170,255,0.55)',
        18
      );
    }
  }

  updateAim(dt, input, game) {
    if (
      this.lockTarget &&
      (!this.lockTarget.alive ||
        this.lockTarget.state === 'dead' ||
        dist(this.x, this.y, this.lockTarget.x, this.lockTarget.y) > 560)
    ) {
      this.lockTarget = null;
    }
    const mv = input.moveVector();
    if (mv.x !== 0 || mv.y !== 0) {
      const moveAngle = Math.atan2(mv.y, mv.x);
      if (input.isTouch) {
        this.facingAngle = moveAngle;
      } else if (!input.mouse.used) {
        this.facingAngle = moveAngle;
      }
    }
    if (this.lockTarget) {
      this.aim = angleTo(this.x, this.y, this.lockTarget.x, this.lockTarget.y);
      this.facingAngle = this.aim;
    } else if (input.isTouch) {
      this.aim = this.facingAngle;
    } else if (input.mouse.used) {
      this.aim = angleTo(this.x, this.y, game.mouseWX, game.mouseWY);
      this.facingAngle = this.aim;
    } else {
      this.aim = this.facingAngle;
    }
    this.facing = Math.cos(this.aim) < -0.2 ? -1 : 1;
  }

  findLockTarget(game, preferMouse) {
    let target = null;
    if (preferMouse && game.input.mouse.used && !game.input.isTouch) {
      const mouseA = angleTo(this.x, this.y, game.mouseWX, game.mouseWY);
      let bestDiff = 1.05;
      for (const e of game.enemies) {
        if (!e.alive || e.state === 'dead') continue;
        const d = dist(this.x, this.y, e.x, e.y);
        if (d > 520) continue;
        const ea = angleTo(this.x, this.y, e.x, e.y);
        let diff = Math.abs(ea - mouseA);
        if (diff > Math.PI) diff = TAU - diff;
        if (diff < bestDiff) {
          bestDiff = diff;
          target = e;
        }
      }
      return target;
    }
    let bd = 520;
    for (const e of game.enemies) {
      if (!e.alive || e.state === 'dead') continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < bd) {
        bd = d;
        target = e;
      }
    }
    return target;
  }

  tryAttack(game) {
    if (this.attackCd > 0) return;
    if (this.character.attackType === 'melee') {
      this.meleeSlash(game);
    } else {
      this.fireStar(game);
    }
    this.attackCd = this.skills.attack.cd;
  }

  meleeSlash(game) {
    const cfg = this.skills.attack;
    this.attackT = 0;
    this.comboT = 0.9;
    const a = this.aim + (this.combo === 1 ? -0.35 : this.combo === 2 ? 0.35 : 0);
    this.combo = (this.combo + 1) % 3;
    game.effects.slash(this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20, a, 'rgba(120,255,220,0.8)', cfg.range);
    game.audio.attack();
    const cx = this.x + Math.cos(a) * cfg.range * 0.55;
    const cy = this.y + Math.sin(a) * cfg.range * 0.55;
    for (const e of game.enemies) {
      if (!e.alive || e.state === 'dead') continue;
      const d = dist(cx, cy, e.x, e.y);
      const ang = Math.abs(((angleTo(cx, cy, e.x, e.y) - a + Math.PI * 3) % TAU) - Math.PI);
      if (d < cfg.range + e.r * 0.6 && ang < cfg.arc) {
        game.hitEnemy(e, cfg.dmg, this.x, this.y);
      }
    }
    const lx = Math.cos(a) * 34;
    const ly = Math.sin(a) * 34;
    this.vx += lx;
    this.vy += ly;
  }

  fireStar(game) {
    const cfg = this.skills.attack;
    const target = this.findLockTarget(game, true);
    const a = target ? angleTo(this.x, this.y, target.x, target.y) : this.aim;
    game.projectiles.add({
      type: 0,
      x: this.x + Math.cos(a) * 24,
      y: this.y - 14 + Math.sin(a) * 24,
      vx: Math.cos(a) * cfg.speed,
      vy: Math.sin(a) * cfg.speed,
      r: cfg.size,
      dmg: cfg.dmg,
      from: 'player',
      life: target ? 2.4 : 1.4,
      target,
      turnRate: target ? 9 : 0,
    });
    if (target) {
      this.lockTarget = target;
      this.aim = a;
      this.facingAngle = a;
      this.facing = Math.cos(a) < -0.2 ? -1 : 1;
    }
    game.audio.ranged();
  }

  trySkill1(game) {
    if (this.skill1Cd > 0) return;
    if (this.characterId === 'aster') {
      this.dashT = 0.24;
      this.dashDir = { x: Math.cos(this.aim), y: Math.sin(this.aim) };
      this.dashHit = new Set();
      this.invulnT = Math.max(this.invulnT, 0.28);
      this.attackT = 0;
      game.audio.dash();
      game.effects.aura(this.x, this.y, 'rgba(120,255,220,0.7)', 60, 0.3);
    } else {
      const cfg = this.skills.skill1;
      let tx;
      let ty;
      let target = null;
      if (game.input.isTouch) {
        target = this.findLockTarget(game, false);
        if (target) {
          tx = target.x;
          ty = target.y;
        } else {
          tx = this.x + Math.cos(this.aim) * cfg.maxDist;
          ty = this.y + Math.sin(this.aim) * cfg.maxDist;
        }
      } else {
        tx = game.mouseWX;
        ty = game.mouseWY;
      }
      const d = dist(this.x, this.y, tx, ty);
      const clamped = Math.min(d, cfg.maxDist);
      const a = angleTo(this.x, this.y, tx, ty);
      const px = this.x + Math.cos(a) * clamped;
      const py = this.y + Math.sin(a) * clamped;
      game.projectiles.add({
        type: 1,
        x: this.x + Math.cos(a) * 22,
        y: this.y - 14 + Math.sin(a) * 22,
        vx: Math.cos(a) * cfg.speed,
        vy: Math.sin(a) * cfg.speed,
        r: 9,
        dmg: cfg.dmg,
        from: 'player',
        life: 2.5,
        tx: px,
        ty: py,
        radius: cfg.radius,
        target,
        turnRate: target ? 8 : 0,
      });
      if (target) {
        this.lockTarget = target;
        this.aim = a;
        this.facingAngle = a;
        this.facing = Math.cos(a) < -0.2 ? -1 : 1;
      }
      game.audio.skill1();
      game.camera.shake(0.12);
    }
    this.skill1Cd = this.skills.skill1.cd;
  }

  trySkill2(game) {
    if (this.skill2Cd > 0) return;
    if (this.characterId === 'aster') {
      this.spinT = 0.32;
      this.spinHit = new Set();
      game.effects.spin(this.x, this.y, 'rgba(120,255,220,0.9)', this.skills.skill2.radius);
      game.audio.spin();
      this.spinUpdate(game);
    } else {
      this.ringT = 0.4;
      this.ringHit = new Set();
      game.effects.ring(this.x, this.y, 'rgba(190,170,255,0.9)', this.skills.skill2.radius, 0.4);
      game.audio.skill2();
      this.ringUpdate(game);
    }
    this.skill2Cd = this.skills.skill2.cd;
  }

  spinUpdate(game) {
    const cfg = this.skills.skill2;
    for (const e of game.enemies) {
      if (!e.alive || e.state === 'dead' || this.spinHit.has(e)) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < cfg.radius + e.r * 0.5) {
        this.spinHit.add(e);
        game.hitEnemy(e, cfg.dmg, this.x, this.y);
      }
    }
  }

  ringUpdate(game) {
    const cfg = this.skills.skill2;
    const prog = 1 - this.ringT / 0.4;
    const rr = cfg.radius * (0.25 + prog * 0.75);
    for (const e of game.enemies) {
      if (!e.alive || e.state === 'dead' || this.ringHit.has(e)) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < rr + e.r * 0.4) {
        this.ringHit.add(e);
        game.hitEnemy(e, cfg.dmg, this.x, this.y);
      }
    }
  }

  drawFacingIndicator(ctx) {
    const a = this.aim;
    const attacking = this.attackT >= 0 || this.dashT > 0;
    const k = attacking ? 1.25 : 1;
    const d = 44 * k;
    const ax = this.x + Math.cos(a) * d;
    const ay = this.y + Math.sin(a) * d;
    const color = this.characterId === 'aster' ? '#7dffe0' : '#c8baff';

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(a);
    ctx.globalAlpha = attacking ? 0.95 : 0.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(11 * k, 0);
    ctx.lineTo(-7 * k, 8 * k);
    ctx.lineTo(-2 * k, 0);
    ctx.lineTo(-7 * k, -8 * k);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  draw(ctx, time) {
    const draw = CHARACTER_DRAW[this.characterId];
    const blink = this.blink > 0 ? Math.abs(Math.sin((1 - this.blink / 0.14) * Math.PI)) : 0;
    let rot = 0;
    if (this.spinT > 0) {
      rot = (0.32 - this.spinT) * 22;
    }
    if (this.state === 'dead') rot = 0;
    const invulnBlink = this.invulnT > 0 && !this.dead && Math.floor(time * 14) % 2 === 0;

    if (!this.dead) {
      this.drawFacingIndicator(ctx);
    }

    ctx.save();
    if (invulnBlink) ctx.globalAlpha = 0.45;
    draw(ctx, {
      x: this.x,
      y: this.y,
      scale: 0.5,
      time,
      state: this.state,
      facing: this.facing,
      blink,
      hurtFlash: this.hurtFlash,
      walk: this.walkPhase,
      attackT: this.attackT,
      deadT: this.deadT,
      rot,
      spinT: 0.32 - this.spinT,
    });
    ctx.restore();
    if (this.ringT > 0) {
      const prog = 1 - this.ringT / 0.4;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = (1 - prog) * 0.6;
      ctx.strokeStyle = '#c8baff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.skills.skill2.radius * (0.25 + prog * 0.75), 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}
