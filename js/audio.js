import { storage } from './storage.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.sfxOn = storage.getSfx();
    this.bgmOn = storage.getBgm();
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmOn ? 0.4 : 0;
      this.bgmGain.connect(this.master);
      if (this.bgmOn) this.startBgm();
    } catch (e) {
      this.ctx = null;
    }
  }

  setSfx(on) {
    this.sfxOn = on;
    storage.setSfx(on);
    if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0;
  }

  setBgm(on) {
    this.bgmOn = on;
    storage.setBgm(on);
    if (this.bgmGain) this.bgmGain.gain.value = on ? 0.4 : 0;
    if (!this.ctx) return;
    if (on) this.startBgm();
    else this.stopBgm();
  }

  tone(freq, dur, type, vol, glideTo, delay) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t0 = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freq), t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, glideTo), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) {
      /* ignore */
    }
  }

  noise(dur, vol, filterFreq, delay) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t0 = this.ctx.currentTime + (delay || 0);
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      src.start(t0);
    } catch (e) {
      /* ignore */
    }
  }

  click() {
    this.tone(700, 0.07, 'square', 0.1, 950);
  }

  attack() {
    this.noise(0.09, 0.16, 3400);
    this.tone(880, 0.07, 'triangle', 0.12, 500);
  }

  ranged() {
    this.tone(660, 0.12, 'sine', 0.16, 1180);
    this.noise(0.05, 0.08, 2600);
  }

  dash() {
    this.noise(0.18, 0.14, 1800);
    this.tone(220, 0.16, 'triangle', 0.14, 520);
  }

  spin() {
    this.tone(520, 0.22, 'sawtooth', 0.1, 1400);
    this.noise(0.16, 0.1, 2400);
  }

  skill1() {
    this.tone(392, 0.16, 'triangle', 0.16, undefined);
    this.tone(587, 0.2, 'triangle', 0.14, undefined, 0.06);
    this.tone(784, 0.26, 'sine', 0.14, undefined, 0.12);
  }

  skill2() {
    this.tone(300, 0.3, 'sawtooth', 0.12, 900);
    this.tone(600, 0.24, 'triangle', 0.12, undefined, 0.08);
  }

  enemyHit() {
    this.tone(190, 0.09, 'square', 0.12, 120);
    this.noise(0.06, 0.08, 1600);
  }

  enemyDie() {
    this.tone(300, 0.2, 'sawtooth', 0.14, 60);
    this.noise(0.16, 0.12, 900);
  }

  hurt() {
    this.tone(240, 0.25, 'sawtooth', 0.2, 70);
    this.noise(0.18, 0.16, 700);
  }

  coin() {
    this.tone(988, 0.09, 'square', 0.1, undefined);
    this.tone(1319, 0.18, 'square', 0.1, undefined, 0.07);
  }

  chest() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, undefined, i * 0.08));
    this.noise(0.3, 0.08, 1200, 0.3);
  }

  bossRoar() {
    this.tone(90, 0.7, 'sawtooth', 0.3, 45);
    this.noise(0.6, 0.2, 500);
    this.tone(55, 0.8, 'triangle', 0.26, 30, 0.15);
  }

  slam() {
    this.noise(0.3, 0.3, 700);
    this.tone(120, 0.3, 'sine', 0.3, 40);
  }

  shockwave() {
    this.tone(200, 0.4, 'sawtooth', 0.16, 60);
    this.noise(0.3, 0.12, 900);
  }

  gateOpen() {
    this.tone(180, 0.4, 'triangle', 0.16, 420);
    this.noise(0.3, 0.1, 800);
  }

  portal() {
    const notes = [392, 494, 587, 784, 988];
    notes.forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, undefined, i * 0.1));
  }

  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, undefined, i * 0.13));
  }

  defeat() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, 0.42, 'triangle', 0.18, undefined, i * 0.24));
  }

  boostLoop(on) {
    if (on) {
      this.tone(240, 0.3, 'triangle', 0.06, 600);
    }
  }

  vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {
      /* ignore */
    }
  }

  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const pattern = [0, 2, 4, 5, 4, 2, 3, 1];
    const play = () => {
      if (!this.ctx || !this.bgmOn) return;
      try {
        const f = scale[pattern[this.bgmStep % pattern.length]];
        this.bgmStep++;
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc2.type = 'sine';
        osc.frequency.value = f;
        osc2.frequency.value = f * 2;
        const vol = 0.05;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);
        osc.connect(g);
        osc2.connect(g);
        g.connect(this.bgmGain);
        osc.start(t0);
        osc2.start(t0);
        osc.stop(t0 + 1.75);
        osc2.stop(t0 + 1.75);
      } catch (e) {
        /* ignore */
      }
    };
    play();
    this.bgmTimer = setInterval(play, 620);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
