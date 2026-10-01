import { CONFIG, TILE, LEVELS, CHARACTERS, tileToWorld, worldToTile } from './config.js';
import { TAU, clamp, dist, angleTo, rand, lerp, formatTime } from './utils.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Projectiles, Effects } from './projectiles.js';
import { Treasure } from './treasure.js';
import { Camera } from './camera.js';
import { Particles, Texts } from './particles.js';
import { storage } from './storage.js';
import { drawAster, drawLiora } from './characters.js';

export class Game {
  constructor() {
    this.state = 'boot';
    this.level = LEVELS[0];
    this.map = new GameMap(this.level);
    this.player = new Player();
    this.camera = new Camera(this.map.W, this.map.H);
    this.particles = new Particles(520);
    this.texts = new Texts(48);
    this.projectiles = new Projectiles(80);
    this.effects = new Effects();
    this.treasure = new Treasure(this.level);
    this.enemies = [];
    this.boss = null;
    this.bossActivated = false;
    this.bossDead = false;
    this.bossClearT = 0;
    this.time = 0;
    this.score = 0;
    this.mouseWX = 0;
    this.mouseWY = 0;
    this.ambientT = 0;
    this.input = null;
    this.audio = null;
    this.ui = null;
    this.attractT = 0;
    this.selectT = 0;
    this.selectHover = -1;
    this.selectChosen = -1;
    this.playerName = '旅行者';
    this.buildLevel();
  }

  bindIO(input, audio, ui) {
    this.input = input;
    this.audio = audio;
    this.ui = ui;
  }

  buildLevel() {
    this.enemies = [];
    for (const def of this.level.enemies) {
      const e = new Enemy(def);
      const w = tileToWorld(def.tx, def.ty);
      e.spawn(def.tx, def.ty);
      this.enemies.push(e);
    }
    this.boss = new Enemy({ type: 'relicguard' });
    this.boss.spawn(this.level.boss.tx, this.level.boss.ty);
    this.enemies.push(this.boss);
    this.map.gateClosed = false;
    this.map.exitOpen = false;
    this.bossActivated = false;
    this.bossDead = false;
    this.bossClearT = 0;
    this.treasure.reset();
    this.spawnPos = tileToWorld(this.level.spawn.tx, this.level.spawn.ty);
    this.exitPos = tileToWorld(this.level.exit.tx, this.level.exit.ty);
    this.player.x = this.spawnPos.x;
    this.player.y = this.spawnPos.y;
    this.camera.snapTo(this.player.x, this.player.y);
  }

  startGame(name, characterId) {
    this.playerName = name;
    this.player.name = name;
    this.player.characterId = characterId;
    this.player.reset();
    this.player.x = this.spawnPos.x;
    this.player.y = this.spawnPos.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.buildLevel();
    this.score = 0;
    this.time = 0;
    this.camera.snapTo(this.player.x, this.player.y);
    this.camera.zoomTarget = CONFIG.zoom.base;
    this.state = 'playing';
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  toSelect() {
    this.state = 'select';
    this.selectHover = -1;
    this.selectChosen = -1;
    const sx = 4.2 * TILE;
    const sy = 23.2 * TILE;
    this.camera.snapTo(sx + 3.1 * TILE, sy);
  }

  toBoot() {
    this.state = 'boot';
  }

  selectCharAt(wx, wy) {
    const pos = [
      { x: 4.2 * TILE, y: 23.2 * TILE, id: 'aster' },
      { x: 10.6 * TILE, y: 23.2 * TILE, id: 'liora' },
    ];
    for (let i = 0; i < pos.length; i++) {
      if (Math.abs(wx - pos[i].x) < 85 && Math.abs(wy - pos[i].y) < 180) {
        if (this.selectChosen !== i) {
          this.selectChosen = i;
          if (this.audio) {
            this.audio.click();
            this.audio.vibrate(20);
          }
          this.particles.sparks(pos[i].x, pos[i].y - 130, '#ffd76a', 26, 260);
          this.particles.ring(pos[i].x, pos[i].y - 130, '#ffe9a0', 30, 0.6);
        }
        if (this.ui) this.ui.onCharSelected(pos[i].id);
        return pos[i].id;
      }
    }
    return null;
  }

  hitEnemy(e, dmg, fromX, fromY) {
    if (!e.alive || e.state === 'dead') return;
    const res = e.hurt(dmg, fromX, fromY);
    this.texts.add(e.x + rand(-10, 10), e.y - e.r - 16, '-' + dmg, '#ffffff', e.kind === 'boss' ? 20 : 15, 0.6);
    this.particles.sparks(e.x, e.y - e.r * 0.4, '#ffffff', 4, 140);
    if (this.audio) this.audio.enemyHit();
    if (res === 'enrage') {
      this.texts.add(e.x, e.y - e.r - 34, '遗迹守卫狂怒了！', '#ff8a3c', 20, 1.4);
      this.camera.shake(0.5);
      if (this.audio) this.audio.bossRoar();
      this.effects.aura(e.x, e.y, 'rgba(255,106,60,0.8)', 110, 0.6);
    } else if (res === true) {
      this.killEnemy(e);
    }
  }

  killEnemy(e) {
    e.state = 'dead';
    this.player.kills++;
    this.score += e.cfg.score;
    this.particles.burst(e.x, e.y, e.kind === 'boss' ? '#c9b89a' : e.cfg.color, 16, 220);
    this.particles.ring(e.x, e.y, '#ffffff', e.r, 0.4);
    if (this.audio) this.audio.enemyDie();
    this.camera.shake(e.kind === 'boss' ? 0.8 : 0.12);
    if (e.kind === 'boss') {
      this.bossDead = true;
      this.bossClearT = 1.4;
      this.texts.add(e.x, e.y - e.r - 30, '遗迹守卫倒下了！', '#ffe9a0', 24, 1.8);
    } else {
      this.treasure.dropCoin(e.x, e.y, Math.max(1, Math.round(e.cfg.coin / 2)));
      if (Math.random() < 0.3) this.treasure.dropHeart(e.x, e.y);
    }
  }

  hitPlayer(dmg, fromX, fromY) {
    if (this.player.hurt(dmg, fromX, fromY)) {
      this.camera.shake(0.35);
      this.particles.burst(this.player.x, this.player.y - 20, '#ff6b7a', 10, 200);
      this.texts.add(this.player.x, this.player.y - 56, '-' + dmg, '#ff6b5e', 18, 0.8);
      if (this.audio) {
        this.audio.hurt();
        this.audio.vibrate(40);
      }
      if (this.ui) this.ui.flashDamage();
      if (this.player.dead) {
        this.particles.burst(this.player.x, this.player.y - 20, '#fff3c4', 26, 300);
        this.particles.ring(this.player.x, this.player.y, '#ffd23e', 40, 0.7);
        if (this.audio) this.audio.defeat();
      }
    }
  }

  update(dt, view) {
    if (this.state === 'boot' || this.state === 'select') {
      this.updateScene(dt, view);
      return;
    }
    if (this.state === 'playing') this.updatePlay(dt, view);
    else if (this.state === 'gameover' || this.state === 'victory') {
      this.map.update(dt);
      this.particles.update(dt);
      this.texts.update(dt);
      if (this.state === 'victory') this.player.update(dt, this.input, this.map, this);
    }
  }

  updateScene(dt, view) {
    this.time += dt;
    this.map.update(dt);
    this.particles.update(dt);
    this.texts.update(dt);

    if (this.state === 'boot') {
      this.attractT += dt;
      const cx = this.map.W / 2 + Math.cos(this.attractT * 0.08) * 700;
      const cy = this.map.H / 2 + Math.sin(this.attractT * 0.06) * 500;
      this.camera.follow(cx, cy, dt, view.w, view.h);
      this.camera.zoomTarget = 0.75;
    } else {
      this.selectT += dt;
      const focus = this.selectHover >= 0 ? (this.selectHover === 0 ? 4.2 : 10.6) : 7.4;
      const tx = focus * TILE;
      this.camera.follow(tx + 0.05 * Math.sin(this.selectT * 0.5) * 200, 23.2 * TILE, dt, view.w, view.h);
      this.camera.zoomTarget = clamp(Math.min(view.w / 820, view.h / 560), 0.45, 1.0);
      this.updateSelectPointer(view);
      this.selectAmbient(dt, view);
    }
    this.ambient(dt, view);
  }

  updateSelectPointer(view) {
    if (!this.input) return;
    const mx = this.input.mouse.x;
    const my = this.input.mouse.y;
    const z = this.camera.zoom;
    const wx = this.camera.x + (mx - view.w / 2) / z;
    const wy = this.camera.y + (my - view.h / 2) / z;
    this.mouseWX = wx;
    this.mouseWY = wy;
    let hover = -1;
    const pos = [
      { x: 4.2 * TILE, y: 23.2 * TILE },
      { x: 10.6 * TILE, y: 23.2 * TILE },
    ];
    for (let i = 0; i < pos.length; i++) {
      if (Math.abs(wx - pos[i].x) < 85 && Math.abs(wy - pos[i].y) < 180) hover = i;
    }
    if (hover !== this.selectHover) {
      this.selectHover = hover;
      if (this.ui) this.ui.onCharHover(hover);
      if (hover >= 0 && this.audio) this.audio.click();
    }
  }

  selectAmbient(dt, view) {
    if (Math.random() < dt * 2) {
      const x = 10.6 * TILE + rand(-30, 30);
      const y = 23.2 * TILE - 100 + rand(-30, 30);
      this.particles.add({
        type: 3,
        x,
        y,
        vx: rand(-6, 6),
        vy: rand(-26, -12),
        maxLife: rand(1.2, 2.2),
        size: rand(2, 3.6),
        color: 'rgba(255,220,150,0.9)',
        spin: 0,
      });
    }
  }

  updatePlay(dt, view) {
    this.time += dt;
    this.map.update(dt);

    const z = this.camera.zoom;
    this.mouseWX = this.camera.x + (this.input.mouse.x - view.w / 2) / z;
    this.mouseWY = this.camera.y + (this.input.mouse.y - view.h / 2) / z;

    this.player.update(dt, this.input, this.map, this);
    this.camera.follow(
      this.player.x + this.player.vx * CONFIG.camera.lead,
      this.player.y + this.player.vy * CONFIG.camera.lead,
      dt,
      view.w,
      view.h
    );
    this.camera.zoomTarget = CONFIG.zoom.base;

    this.checkArenaTrigger();
    this.checkExit();

    for (const e of this.enemies) {
      if (e === this.boss && !this.bossActivated) {
        e.animT += dt;
        continue;
      }
      e.update(dt, this.player, this.map, this);
    }

    this.separateEnemies();

    this.projectiles.update(dt, this.map);
    this.resolveProjectiles();
    this.effects.update(dt);
    this.treasure.update(dt, this.player, this);
    this.treasure.tryOpenChest(this.player.x, this.player.y, this.player.r, this);
    this.particles.update(dt);
    this.texts.update(dt);

    this.ambient(dt, view);

    if (this.bossDead && this.bossClearT > 0) {
      this.bossClearT -= dt;
      if (this.bossClearT <= 0) {
        this.map.gateClosed = false;
        this.map.exitOpen = true;
        this.texts.add(this.exitPos.x, this.exitPos.y - 40, '出口已开启！', '#bff8ff', 22, 1.8);
        if (this.audio) {
          this.audio.gateOpen();
          this.audio.victory();
        }
        if (this.ui) {
          this.ui.banner('挑战完成', '遗迹守卫已被击败，出口开启了！');
          this.ui.hideBossBar();
        }
        this.particles.sparks(this.exitPos.x, this.exitPos.y, '#bff8ff', 30, 260);
      }
    }

    if (this.player.dead && this.player.deadT > 1.3) {
      this.state = 'gameover';
      storage.setGames(storage.getGames() + 1);
      if (this.ui) this.ui.showGameover(this.player);
    }

    if (this.ui) this.ui.updateHud(this);
  }

  checkArenaTrigger() {
    if (this.bossActivated || this.bossDead) return;
    const a = this.level.arena;
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    if (tx >= a.x0 && tx <= a.x1 && ty >= a.y0 && ty <= a.y1) {
      this.bossActivated = true;
      this.map.gateClosed = true;
      this.camera.shake(0.6);
      if (this.audio) this.audio.bossRoar();
      if (this.ui) {
        this.ui.banner('遗迹守卫', '沉睡的守卫苏醒了！');
        this.ui.showBossBar(this.boss);
      }
      this.effects.aura(this.boss.x, this.boss.y, 'rgba(255,215,106,0.7)', 120, 0.8);
    }
  }

  checkExit() {
    if (!this.map.exitOpen) return;
    if (this.state !== 'playing') return;
    if (dist(this.player.x, this.player.y, this.exitPos.x, this.exitPos.y) < 44) {
      this.state = 'victory';
      this.player.startVictory();
      this.player.vx = 0;
      this.player.vy = 0;
      const best = storage.getBestTime();
      const clearTime = this.player.runTime;
      const isBest = best === null || clearTime < best;
      if (isBest) storage.setBestTime(Math.round(clearTime));
      storage.setClears(storage.getClears() + 1);
      storage.setGames(storage.getGames() + 1);
      if (this.audio) this.audio.portal();
      if (this.ui) {
        this.ui.showVictory(this.player, clearTime, isBest, this.score);
        this.ui.hideBossBar();
      }
      this.particles.sparks(this.player.x, this.player.y, '#bff8ff', 40, 320);
      this.particles.ring(this.player.x, this.player.y, '#bff8ff', 60, 0.9);
    }
  }

  separateEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive || a.state === 'dead') continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive || b.state === 'dead') continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r * 0.8 + b.r * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) / d / 2;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
  }

  resolveProjectiles() {
    for (const p of this.projectiles.items) {
      if (!p.active && !p.exploded) continue;
      if (p.exploded) {
        p.exploded = false;
        this.effects.explode(p.tx, p.ty, 'rgba(200,180,255,0.9)', p.radius || 120);
        this.camera.shake(0.25);
        if (this.audio) this.audio.skill1();
        for (const e of this.enemies) {
          if (!e.alive || e.state === 'dead') continue;
          if (dist(p.tx, p.ty, e.x, e.y) < (p.radius || 120) + e.r * 0.5) {
            this.hitEnemy(e, p.dmg, p.tx, p.ty);
          }
        }
        continue;
      }
      if (!p.active) continue;
      if (p.from === 'player') {
        for (const e of this.enemies) {
          if (!e.alive || e.state === 'dead') continue;
          if (dist(p.x, p.y, e.x, e.y) < p.r + e.r * 0.6) {
            p.active = false;
            this.hitEnemy(e, p.dmg, p.x - p.vx, p.y - p.vy);
            this.particles.sparks(p.x, p.y, '#b9a8ff', 6, 160);
            break;
          }
        }
      } else {
        if (this.player.state !== 'dead' && dist(p.x, p.y, this.player.x, this.player.y - 12) < p.r + this.player.r) {
          p.active = false;
          this.hitPlayer(p.dmg, p.x - p.vx, p.y - p.vy);
          this.particles.sparks(p.x, p.y, '#ff7ab8', 6, 160);
        }
      }
    }
  }

  ambient(dt, view) {
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = 0.25;
    const hw = view.w / (2 * this.camera.zoom) + 40;
    const hh = view.h / (2 * this.camera.zoom) + 40;
    const x = this.camera.x + rand(-hw, hw);
    const y = this.camera.y + rand(-hh, hh);
    if (x < 20 || y < 20 || x > this.map.W - 20 || y > this.map.H - 20) return;
    if (Math.random() < 0.6) {
      this.particles.add({
        type: 1,
        x,
        y: y + 10,
        vx: rand(-8, 8),
        vy: rand(-30, -14),
        maxLife: rand(1, 1.8),
        size: rand(2, 4),
        wob: rand(3, 7),
        wobFreq: rand(3, 6),
        alpha: rand(0.3, 0.6),
      });
    }
  }

  render(ctx, view, dpr) {
    const w = view.w;
    const h = view.h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cam = this.camera;
    const z = cam.zoom;
    ctx.save();
    ctx.setTransform(
      dpr * z,
      0,
      0,
      dpr * z,
      (w / 2 - (cam.x - cam.shakeX) * z) * dpr,
      (h / 2 - (cam.y - cam.shakeY) * z) * dpr
    );

    this.map.drawGround(ctx, cam, view, z);
    this.map.drawRocks(ctx, cam, view, z);
    this.map.drawTrunks(ctx, cam, view, z);

    if (this.state === 'boot' || this.state === 'select') {
      this.treasure.draw(ctx, this.time);
      this.map.drawGate(ctx, cam, view, z);
      this.map.drawExit(ctx, cam, view, z);
      if (this.state === 'select') this.drawSelectScene(ctx);
      this.map.drawCanopy(ctx, cam, view, z);
      this.particles.draw(ctx);
      this.texts.draw(ctx);
      ctx.restore();
      this.drawVignette(ctx, w, h);
      return;
    }

    this.treasure.draw(ctx, this.time);

    const entities = [...this.enemies];
    entities.sort((a, b) => a.y - b.y);
    for (const e of entities) {
      if (!e.alive && e.state !== 'dead') continue;
      if (e.state === 'dead' && e.deadT > 0.6) continue;
      if (e.x < cam.x - w / (2 * z) - 80 || e.x > cam.x + w / (2 * z) + 80) continue;
      if (e.y < cam.y - h / (2 * z) - 80 || e.y > cam.y + h / (2 * z) + 80) continue;
      e.draw(ctx, this.time);
    }

    this.map.drawGate(ctx, cam, view, z);
    this.map.drawExit(ctx, cam, view, z);

    this.projectiles.draw(ctx, this.time);
    this.effects.draw(ctx);
    this.player.draw(ctx, this.time);
    this.particles.draw(ctx);
    this.texts.draw(ctx);
    this.map.drawCanopy(ctx, cam, view, z);

    this.drawSignpostPrompts(ctx);

    ctx.restore();
    this.drawVignette(ctx, w, h);
  }

  drawSignpostPrompts(ctx) {
    const p = this.player;
    for (const s of this.map.signposts) {
      if (dist(p.x, p.y, s.x, s.y) < 80) {
        ctx.fillStyle = 'rgba(20,30,20,0.72)';
        ctx.font = '600 15px "PingFang SC","Microsoft YaHei",sans-serif';
        const tw = ctx.measureText(s.text).width + 20;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(s.x - tw / 2, s.y - 78, tw, 28, 10) : ctx.rect(s.x - tw / 2, s.y - 78, tw, 28);
        ctx.fill();
        ctx.fillStyle = '#ffe9a0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.text, s.x, s.y - 64);
      }
    }
  }

  drawSelectScene(ctx) {
    const t = this.selectT;
    const pos = [
      { x: 4.2 * TILE, y: 23.2 * TILE, id: 'aster', color: 'rgba(62,198,168,0.28)' },
      { x: 10.6 * TILE, y: 23.2 * TILE, id: 'liora', color: 'rgba(138,123,255,0.28)' },
    ];
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i];
      const hover = this.selectHover === i;
      const chosen = this.selectChosen === i;
      const scale = hover || chosen ? 1.18 : 1.0;

      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 0.5 + Math.sin(t * 2.4 + i * 2) * 0.15;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 86 * scale, 26 * scale, 0, 0, TAU);
      ctx.fill();

      if (hover || chosen) {
        const g = ctx.createRadialGradient(0, -120, 10, 0, -120, 130 * scale);
        g.addColorStop(0, chosen ? 'rgba(255,215,106,0.35)' : p.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, -120, 130 * scale, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = chosen ? '#ffd76a' : 'rgba(255,255,255,0.65)';
        ctx.lineWidth = chosen ? 3.5 : 2;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -t * 30;
        ctx.beginPath();
        ctx.ellipse(0, -120, 74, 158, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        if (chosen) {
          ctx.fillStyle = '#ffd76a';
          ctx.font = '900 26px "PingFang SC","Microsoft YaHei",sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✔', 0, -268);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      if (i === 0) {
        drawAster(ctx, { x: 0, y: 0, scale: 1.15, time: t, state: 'idle', facing: 1, blink: Math.floor(t * 0.5) % 7 === 0 ? 0.14 : 0 });
      } else {
        drawLiora(ctx, { x: 0, y: 0, scale: 1.15, time: t, state: 'idle', facing: -1, blink: Math.floor(t * 0.5) % 5 === 0 ? 0.14 : 0 });
      }
      ctx.restore();
    }
  }

  drawVignette(ctx, w, h) {
    if (!this.vignetteCache) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.5, w / 2, h / 2, Math.max(w, h) * 0.8);
      vg.addColorStop(0, 'rgba(20,40,30,0)');
      vg.addColorStop(1, 'rgba(12,30,24,0.28)');
      this.vignetteCache = vg;
    }
    ctx.fillStyle = this.vignetteCache;
    ctx.fillRect(0, 0, w, h);
  }
}
