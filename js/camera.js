import { clamp, lerp } from './utils.js';

export class Camera {
  constructor(worldW, worldH) {
    this.x = worldW / 2;
    this.y = worldH / 2;
    this.worldW = worldW;
    this.worldH = worldH;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }

  follow(tx, ty, dt, viewW, viewH) {
    const k = Math.min(1, dt * 5);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    this.clamp(viewW, viewH);
    this.zoom = lerp(this.zoom, this.zoomTarget, Math.min(1, dt * 3));
    this.shakeX = 0;
    this.shakeY = 0;
    if (this.trauma > 0.001) {
      const s = this.trauma * this.trauma * 16;
      const a = Math.random() * Math.PI * 2;
      this.shakeX = Math.cos(a) * s;
      this.shakeY = Math.sin(a) * s;
      this.trauma = Math.max(0, this.trauma - dt * 2.4);
    }
  }

  clamp(viewW, viewH) {
    const hw = viewW / (2 * this.zoom);
    const hh = viewH / (2 * this.zoom);
    if (this.worldW >= viewW / this.zoom) {
      this.x = clamp(this.x, hw, this.worldW - hw);
    } else {
      this.x = this.worldW / 2;
    }
    if (this.worldH >= viewH / this.zoom) {
      this.y = clamp(this.y, hh, this.worldH - hh);
    } else {
      this.y = this.worldH / 2;
    }
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }
}
