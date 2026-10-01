import { TILE } from './config.js';
import { TAU, hash2, clamp } from './utils.js';

const GRASS_BASE = '#8fce66';
const GRASS_DARK = '#7dbb56';
const PATH_COLOR = '#d9bc84';
const PATH_EDGE = '#c2a56c';

export class GameMap {
  constructor(level) {
    this.rows = level.rows;
    this.cols = this.rows[0].length;
    this.rowsCount = this.rows.length;
    this.W = this.cols * TILE;
    this.H = this.rowsCount * TILE;
    this.time = 0;
    this.gateClosed = false;
    this.exitOpen = false;
    this.flowers = [];
    this.signposts = [];
    this.exitTx = Math.floor(level.exit.tx);
    this.exitTy = Math.floor(level.exit.ty);
    this.gateTx = level.gate.tx;
    this.gateTy = level.gate.ty;
    this.buildDecor(level);
  }

  buildDecor(level) {
    this.flowers = [];
    this.signposts = [];
    for (let ty = 0; ty < this.rowsCount; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const c = this.tileChar(tx, ty);
        if (c === 'F') {
          this.flowers.push({
            x: (tx + 0.5 + (hash2(tx, ty) - 0.5) * 0.5) * TILE,
            y: (ty + 0.5 + (hash2(ty, tx) - 0.5) * 0.5) * TILE,
            color: ['#FF8FB1', '#FFC46B', '#C79BF2', '#FF9B9B', '#FFE08A'][Math.floor(hash2(tx * 3 + 1, ty * 7 + 2) * 5)],
            phase: hash2(tx * 11, ty * 13) * TAU,
          });
        }
      }
    }
    for (const s of level.signposts || []) {
      this.signposts.push({
        x: (s.tx + 0.5) * TILE,
        y: (s.ty + 0.5) * TILE,
        text: s.text,
        shown: false,
      });
    }
  }

  tileChar(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rowsCount) return '#';
    return this.rows[ty][tx];
  }

  solidAt(tx, ty) {
    const c = this.tileChar(tx, ty);
    if (c === '#' || c === 'T' || c === 'B' || c === 'R' || c === 'W') return true;
    if (c === 'E' && !this.exitOpen) return true;
    if (c === 'G' && this.gateClosed) return true;
    return false;
  }

  solidAtWorld(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (this.solidAt(tx, ty)) return true;
    const r = 15;
    if (x - tx * TILE < r && this.solidAt(tx - 1, ty)) return true;
    if (tx * TILE + TILE - x < r && this.solidAt(tx + 1, ty)) return true;
    if (y - ty * TILE < r && this.solidAt(tx, ty - 1)) return true;
    if (ty * TILE + TILE - y < r && this.solidAt(tx, ty + 1)) return true;
    return false;
  }

  solidKind(tx, ty) {
    const c = this.tileChar(tx, ty);
    if (c === 'T' || c === 'B') return 'trunk';
    if (c === '#' || c === 'R' || c === 'W') return 'block';
    if (c === 'E' && !this.exitOpen) return 'block';
    if (c === 'G' && this.gateClosed) return 'block';
    return null;
  }

  resolveCircle(ent, r) {
    for (let pass = 0; pass < 2; pass++) {
      const tx0 = Math.floor((ent.x - r) / TILE) - 1;
      const tx1 = Math.floor((ent.x + r) / TILE) + 1;
      const ty0 = Math.floor((ent.y - r) / TILE) - 1;
      const ty1 = Math.floor((ent.y + r) / TILE) + 1;
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const kind = this.solidKind(tx, ty);
          if (!kind) continue;
          const x = tx * TILE;
          const y = ty * TILE;
          if (kind === 'trunk') {
            const cx = x + TILE / 2;
            const cy = y + TILE / 2;
            const rr = r + 13;
            const dx = ent.x - cx;
            const dy = ent.y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= rr * rr || d2 === 0) continue;
            const d = Math.sqrt(d2);
            ent.x = cx + (dx / d) * rr;
            ent.y = cy + (dy / d) * rr;
          } else {
            const cx = clamp(ent.x, x, x + TILE);
            const cy = clamp(ent.y, y, y + TILE);
            const dx = ent.x - cx;
            const dy = ent.y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= r * r) continue;
            if (d2 === 0) {
              const left = ent.x - x;
              const right = x + TILE - ent.x;
              const top = ent.y - y;
              const bottom = y + TILE - ent.y;
              const m = Math.min(left, right, top, bottom);
              if (m === left) ent.x = x - r;
              else if (m === right) ent.x = x + TILE + r;
              else if (m === top) ent.y = y - r;
              else ent.y = y + TILE + r;
            } else {
              const d = Math.sqrt(d2);
              ent.x = cx + (dx / d) * r;
              ent.y = cy + (dy / d) * r;
            }
          }
        }
      }
    }
    ent.x = clamp(ent.x, r, this.W - r);
    ent.y = clamp(ent.y, r, this.H - r);
  }

  update(dt) {
    this.time += dt;
    const sign = this.signposts.find((s) => !s.shown);
    if (sign) sign.shown = true;
  }

  /* ---------------- rendering ---------------- */

  drawGround(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom);
    const hh = view.h / (2 * zoom);
    const x0 = Math.max(0, Math.floor((cam.x - hw) / TILE));
    const x1 = Math.min(this.cols - 1, Math.floor((cam.x + hw) / TILE));
    const y0 = Math.max(0, Math.floor((cam.y - hh) / TILE));
    const y1 = Math.min(this.rowsCount - 1, Math.floor((cam.y + hh) / TILE));

    ctx.fillStyle = GRASS_BASE;
    ctx.fillRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        this.drawTileBase(ctx, tx, ty);
      }
    }

    for (const f of this.flowers) {
      if (f.x < x0 * TILE - 40 || f.x > (x1 + 1) * TILE + 40 || f.y < y0 * TILE - 40 || f.y > (y1 + 1) * TILE + 40) continue;
      this.drawFlower(ctx, f.x, f.y, f.color, this.time + f.phase);
    }

    for (const s of this.signposts) {
      if (s.x < x0 * TILE - 60 || s.x > (x1 + 1) * TILE + 60 || s.y < y0 * TILE - 60 || s.y > (y1 + 1) * TILE + 60) continue;
      this.drawSignpost(ctx, s.x, s.y, this.time);
    }
  }

  drawTileBase(ctx, tx, ty) {
    const c = this.tileChar(tx, ty);
    const x = tx * TILE;
    const y = ty * TILE;

    if (c === '#' || c === 'W' || c === 'b' || c === 'p' || c === '=' || c === 'G' || c === 'E') {
      if (c === 'W') {
        this.drawWaterTile(ctx, tx, ty);
      } else if (c === 'b' || c === 'G' || c === 'E') {
        this.drawStoneTile(ctx, tx, ty);
      } else if (c === 'p') {
        this.drawPathTile(ctx, tx, ty);
      } else if (c === '=') {
        this.drawBridgeTile(ctx, tx, ty);
      } else {
        this.drawWallTile(ctx, tx, ty);
      }
    } else if (c === 'T' || c === 'B') {
      const h = hash2(tx, ty);
      if (h < 0.5) {
        ctx.fillStyle = 'rgba(60,120,50,0.10)';
        ctx.beginPath();
        ctx.ellipse(x + TILE / 2 + 6, y + TILE / 2 + 8, TILE * 0.5, TILE * 0.3, 0, 0, TAU);
        ctx.fill();
      }
    } else {
      const h = hash2(tx, ty);
      if (h > 0.62) {
        const gx = x + h * TILE;
        const gy = y + hash2(ty, tx) * TILE;
        this.drawGrassTuft(ctx, gx, gy, hash2(tx + 5, ty + 9) * TAU, this.time * 1.2 + h * TAU, 0.8 + h * 0.5);
      } else if (h < 0.3) {
        ctx.fillStyle = h < 0.15 ? 'rgba(70,130,60,0.14)' : 'rgba(190,240,150,0.12)';
        ctx.beginPath();
        ctx.ellipse(x + (0.2 + h * 1.4) * TILE, y + (0.2 + hash2(ty, tx)) * TILE, TILE * 0.3, TILE * 0.18, h * TAU, 0, TAU);
        ctx.fill();
      }
      if (c === ',') {
        this.drawTallGrass(ctx, x + TILE / 2, y + TILE / 2, this.time + hash2(tx, ty) * TAU);
      }
    }
  }

  drawPathTile(ctx, tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = PATH_COLOR;
    ctx.fillRect(x, y, TILE, TILE);
    const n = (dx, dy, ok) => {
      const c = this.tileChar(tx + dx, ty + dy);
      return c === 'p' || c === '=' || c === 'S' || c === 'G' || c === 'E' || c === 'b';
    };
    ctx.fillStyle = GRASS_BASE;
    if (!n(-1, 0) && !n(0, -1)) {
      ctx.beginPath();
      ctx.arc(x, y, TILE * 0.4, -Math.PI / 2, 0);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }
    if (!n(1, 0) && !n(0, -1)) {
      ctx.beginPath();
      ctx.arc(x + TILE, y, TILE * 0.4, Math.PI, Math.PI * 1.5);
      ctx.lineTo(x + TILE, y);
      ctx.closePath();
      ctx.fill();
    }
    if (!n(-1, 0) && !n(0, 1)) {
      ctx.beginPath();
      ctx.arc(x, y + TILE, TILE * 0.4, Math.PI / 2, Math.PI);
      ctx.lineTo(x, y + TILE);
      ctx.closePath();
      ctx.fill();
    }
    if (!n(1, 0) && !n(0, 1)) {
      ctx.beginPath();
      ctx.arc(x + TILE, y + TILE, TILE * 0.4, 0, Math.PI / 2);
      ctx.lineTo(x + TILE, y + TILE);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(160,130,80,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const h1 = hash2(tx * 3 + i, ty * 5 + i);
      const h2 = hash2(tx * 7 + i, ty * 11 + i);
      ctx.beginPath();
      ctx.ellipse(x + h1 * TILE, y + h2 * TILE, 3 + h1 * 3, 1.6 + h2 * 2, h1 * TAU, 0, TAU);
      ctx.stroke();
    }
  }

  drawStoneTile(ctx, tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    const h = hash2(tx, ty);
    ctx.fillStyle = h < 0.5 ? '#9aa093' : '#a8a89c';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(80,85,80,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    if (h > 0.4) {
      ctx.fillStyle = 'rgba(70,75,70,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + h * TILE, y + hash2(ty, tx) * TILE, TILE * 0.3, TILE * 0.16, h * TAU, 0, TAU);
      ctx.fill();
    }
  }

  drawWallTile(ctx, tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = '#6d7268';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#7e8378';
    ctx.beginPath();
    ctx.moveTo(x, y + TILE);
    ctx.lineTo(x, y);
    ctx.lineTo(x + TILE, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,50,45,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    const h = hash2(tx, ty);
    if (h > 0.55) {
      ctx.fillStyle = 'rgba(120,130,120,0.5)';
      ctx.fillRect(x + 8 + h * 20, y + 8, 10, 5);
      ctx.fillRect(x + 10, y + 20 + h * 16, 8, 5);
    }
  }

  drawWaterTile(ctx, tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = '#4fb0d8';
    ctx.fillRect(x, y, TILE, TILE);
    const waterLike = (dx, dy) => {
      const c = this.tileChar(tx + dx, ty + dy);
      return c === 'W' || c === '=';
    };
    const n = waterLike;
    if (!n(-1, 0) && !n(0, -1)) {
      ctx.fillStyle = GRASS_BASE;
      ctx.beginPath();
      ctx.arc(x, y, TILE * 0.5, -Math.PI / 2, 0);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }
    if (!n(1, 0) && !n(0, -1)) {
      ctx.fillStyle = GRASS_BASE;
      ctx.beginPath();
      ctx.arc(x + TILE, y, TILE * 0.5, Math.PI, Math.PI * 1.5);
      ctx.lineTo(x + TILE, y);
      ctx.closePath();
      ctx.fill();
    }
    if (!n(-1, 0) && !n(0, 1)) {
      ctx.fillStyle = GRASS_BASE;
      ctx.beginPath();
      ctx.arc(x, y + TILE, TILE * 0.5, Math.PI / 2, Math.PI);
      ctx.lineTo(x, y + TILE);
      ctx.closePath();
      ctx.fill();
    }
    if (!n(1, 0) && !n(0, 1)) {
      ctx.fillStyle = GRASS_BASE;
      ctx.beginPath();
      ctx.arc(x + TILE, y + TILE, TILE * 0.5, 0, Math.PI / 2);
      ctx.lineTo(x + TILE, y + TILE);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(238,210,148,0.85)';
    ctx.lineWidth = 3.5;
    if (!n(-1, 0)) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 10);
      ctx.lineTo(x + 2, y + TILE - 10);
      ctx.stroke();
    }
    if (!n(1, 0)) {
      ctx.beginPath();
      ctx.moveTo(x + TILE - 2, y + 10);
      ctx.lineTo(x + TILE - 2, y + TILE - 10);
      ctx.stroke();
    }
    if (!n(0, -1)) {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 2);
      ctx.lineTo(x + TILE - 10, y + 2);
      ctx.stroke();
    }
    if (!n(0, 1)) {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + TILE - 2);
      ctx.lineTo(x + TILE - 10, y + TILE - 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,100,140,0.3)';
    ctx.lineWidth = 1.5;
    if (!n(-1, 0)) {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 14);
      ctx.lineTo(x + 6, y + TILE - 14);
      ctx.stroke();
    }
    if (!n(1, 0)) {
      ctx.beginPath();
      ctx.moveTo(x + TILE - 6, y + 14);
      ctx.lineTo(x + TILE - 6, y + TILE - 14);
      ctx.stroke();
    }
    if (!n(0, -1)) {
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 6);
      ctx.lineTo(x + TILE - 14, y + 6);
      ctx.stroke();
    }
    if (!n(0, 1)) {
      ctx.beginPath();
      ctx.moveTo(x + 14, y + TILE - 6);
      ctx.lineTo(x + TILE - 14, y + TILE - 6);
      ctx.stroke();
    }

    const t = this.time;
    for (let i = 0; i < 3; i++) {
      const h1 = hash2(tx * 3 + i, ty * 7 + i);
      const h2 = hash2(tx * 11 + i, ty * 17 + i);
      const cycle = (t * (0.18 + h1 * 0.16) + h2) % 1;
      const fade = Math.sin(cycle * Math.PI);
      ctx.globalAlpha = 0.3 * fade;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(
        x + TILE * (0.18 + h2 * 0.64),
        y + TILE * (0.16 + cycle * 0.62),
        7 + h1 * 5,
        2.6,
        h2 * TAU,
        0,
        TAU
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const band = (t * 10 + hash2(tx, ty) * 100) % (TILE * 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.ellipse(x + TILE / 2, y + band, TILE * 0.52, 12, 0, 0, TAU);
    ctx.fill();
  }

  drawBridgeTile(ctx, tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = '#5db8d8';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#a9744a';
    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
    ctx.strokeStyle = 'rgba(70,45,25,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + TILE * (0.3 + i * 0.22));
      ctx.lineTo(x + TILE - 6, y + TILE * (0.3 + i * 0.22));
      ctx.stroke();
    }
  }

  drawGrassTuft(ctx, x, y, rot, sway, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(84,160,60,0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + sway * 0.14;
      const len = (7 + (i % 2) * 2.5) * s;
      const ex = Math.cos(a) * len;
      const ey = Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(ex * 0.5, ey * 0.5 - 1.5, ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTallGrass(ctx, x, y, sway) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(96,172,64,0.75)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.3 + Math.sin(sway + i) * 0.16;
      ctx.beginPath();
      ctx.moveTo(i * 5, 14);
      ctx.quadraticCurveTo(i * 6, 4, i * 8 + Math.sin(sway + i) * 3, -6);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFlower(ctx, x, y, color, sway) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.12);
    ctx.fillStyle = color;
    const pr = 3.6;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, pr * 0.85, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(0, 0, pr * 0.72, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawSignpost(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(40,60,30,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 20, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8a5a3b';
    ctx.fillRect(-4, -18, 8, 36);
    ctx.fillStyle = '#a9744a';
    ctx.beginPath();
    ctx.moveTo(-4, -20);
    ctx.lineTo(26, -26);
    ctx.lineTo(26, -6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,45,25,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff6e0';
    ctx.font = '700 12px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('!', 6, -10);
    ctx.restore();
  }

  drawRocks(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom);
    const hh = view.h / (2 * zoom);
    const x0 = Math.max(0, Math.floor((cam.x - hw) / TILE));
    const x1 = Math.min(this.cols - 1, Math.floor((cam.x + hw) / TILE));
    const y0 = Math.max(0, Math.floor((cam.y - hh) / TILE));
    const y1 = Math.min(this.rowsCount - 1, Math.floor((cam.y + hh) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.tileChar(tx, ty) !== 'R') continue;
        const x = tx * TILE + TILE / 2;
        const y = ty * TILE + TILE / 2;
        const h = hash2(tx, ty);
        ctx.fillStyle = 'rgba(40,60,40,0.18)';
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 12, 22, 10, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = h < 0.5 ? '#b9bec6' : '#aab0b8';
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 12);
        ctx.lineTo(x - 12, y - 14);
        ctx.lineTo(x + 8, y - 18);
        ctx.lineTo(x + 20, y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,110,120,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 10);
        ctx.lineTo(x - 6, y - 14);
        ctx.lineTo(x + 4, y - 12);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawTrunks(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom) + TILE;
    const hh = view.h / (2 * zoom) + TILE;
    const x0 = Math.max(0, Math.floor((cam.x - hw) / TILE));
    const x1 = Math.min(this.cols - 1, Math.floor((cam.x + hw) / TILE));
    const y0 = Math.max(0, Math.floor((cam.y - hh) / TILE));
    const y1 = Math.min(this.rowsCount - 1, Math.floor((cam.y + hh) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileChar(tx, ty);
        if (c === 'T') {
          const x = tx * TILE + TILE / 2;
          const y = ty * TILE + TILE / 2;
          ctx.fillStyle = 'rgba(40,70,40,0.22)';
          ctx.beginPath();
          ctx.ellipse(x + 4, y + 14, 22, 10, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#7a5230';
          ctx.fillRect(x - 9, y + 4, 18, 20);
          ctx.fillStyle = '#8f6338';
          ctx.fillRect(x - 9, y + 4, 7, 20);
          ctx.strokeStyle = 'rgba(60,40,20,0.5)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 9, y + 4, 18, 20);
        } else if (c === 'B') {
          const x = tx * TILE + TILE / 2;
          const y = ty * TILE + TILE / 2;
          ctx.fillStyle = 'rgba(40,70,40,0.22)';
          ctx.beginPath();
          ctx.ellipse(x + 3, y + 12, 20, 9, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#5f8f3c';
          ctx.beginPath();
          ctx.arc(x, y + 8, 15, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  drawCanopy(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom) + TILE;
    const hh = view.h / (2 * zoom) + TILE;
    const x0 = Math.max(0, Math.floor((cam.x - hw) / TILE));
    const x1 = Math.min(this.cols - 1, Math.floor((cam.x + hw) / TILE));
    const y0 = Math.max(0, Math.floor((cam.y - hh) / TILE));
    const y1 = Math.min(this.rowsCount - 1, Math.floor((cam.y + hh) / TILE));
    const t = this.time;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileChar(tx, ty);
        const x = tx * TILE + TILE / 2;
        const y = ty * TILE + TILE / 2;
        const h = hash2(tx, ty);
        if (c === 'T') {
          const sway = Math.sin(t * 1.2 + h * TAU) * 2;
          ctx.fillStyle = '#3c7f45';
          ctx.beginPath();
          ctx.arc(x + sway, y - 8, 30, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#4f9a52';
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TAU + h * TAU;
            ctx.beginPath();
            ctx.arc(x + sway + Math.cos(a) * 14, y - 8 + Math.sin(a) * 10, 17, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = '#5fae5f';
          ctx.beginPath();
          ctx.arc(x + sway, y - 10, 20, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath();
          ctx.arc(x + sway - 8, y - 18, 11, 0, TAU);
          ctx.fill();
        } else if (c === 'B') {
          ctx.fillStyle = '#4c8a3c';
          ctx.beginPath();
          ctx.arc(x - 7, y - 2, 10, 0, TAU);
          ctx.arc(x + 7, y - 4, 11, 0, TAU);
          ctx.arc(x, y - 8, 12, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#5f9e4a';
          ctx.beginPath();
          ctx.arc(x - 3, y - 8, 9, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  drawGate(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom) + TILE;
    const hh = view.h / (2 * zoom) + TILE;
    for (let ty = Math.max(0, Math.floor((cam.y - hh) / TILE)); ty <= Math.min(this.rowsCount - 1, Math.floor((cam.y + hh) / TILE)); ty++) {
      for (let tx = Math.max(0, Math.floor((cam.x - hw) / TILE)); tx <= Math.min(this.cols - 1, Math.floor((cam.x + hw) / TILE)); tx++) {
        if (this.tileChar(tx, ty) !== 'G') continue;
        const x = tx * TILE;
        const y = ty * TILE;
        if (this.gateClosed) {
          ctx.fillStyle = '#6d7268';
          ctx.fillRect(x + 6, y - 6, TILE - 12, TILE + 12);
          ctx.fillStyle = '#8a8f84';
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(x + 10, y - 2 + i * 16, TILE - 20, 8);
          }
          ctx.strokeStyle = 'rgba(45,50,45,0.6)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 6, y - 6, TILE - 12, TILE + 12);
          ctx.fillStyle = '#e8c94a';
          ctx.fillRect(x + TILE / 2 - 6, y + TILE / 2 - 6, 12, 12);
        } else {
          ctx.fillStyle = 'rgba(80,85,80,0.85)';
          ctx.fillRect(x + 8, y - 4, 10, TILE + 8);
          ctx.fillRect(x + TILE - 18, y - 4, 10, TILE + 8);
          ctx.fillStyle = '#a8a89c';
          ctx.fillRect(x + 6, y - 14, TILE - 12, 10);
        }
      }
    }
  }

  drawExit(ctx, cam, view, zoom) {
    const tx = this.exitTx;
    const ty = this.exitTy;
    if (tx * TILE < cam.x - view.w / (2 * zoom) - TILE * 2 || tx * TILE > cam.x + view.w / (2 * zoom) + TILE * 2) return;
    if (ty * TILE < cam.y - view.h / (2 * zoom) - TILE * 2 || ty * TILE > cam.y + view.h / (2 * zoom) + TILE * 2) return;
    const x = tx * TILE + TILE * 1.5;
    const y = ty * TILE + TILE * 1.5;
    const t = this.time;
    ctx.save();
    ctx.translate(x, y);
    if (this.exitOpen) {
      const pulse = 0.75 + Math.sin(t * 3) * 0.25;
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 52 * pulse);
      grad.addColorStop(0, 'rgba(190,255,240,0.95)');
      grad.addColorStop(0.5, 'rgba(110,220,255,0.5)');
      grad.addColorStop(1, 'rgba(110,220,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 52 * pulse, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,235,255,0.35)';
      for (let i = 0; i < 3; i++) {
        const a = t * 1.8 + (i / 3) * TAU;
        ctx.beginPath();
        ctx.arc(0, 0, 26 + Math.sin(t * 2 + i) * 4, a, a + 1.2);
        ctx.strokeStyle = 'rgba(190,255,250,0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(110,120,115,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(110,120,115,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(60,65,60,0.5)';
      ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('封', 0, 0);
    }
    ctx.restore();
  }
}
