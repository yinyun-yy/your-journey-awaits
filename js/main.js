import { Game } from './game.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';
import { Input } from './input.js';
import { storage } from './storage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const view = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };

const audio = new AudioManager();
const input = new Input(canvas);
const game = new Game();
const ui = new UI(game);
game.bindIO(input, audio, ui);

input.onPause = () => ui.onPauseRequest();
input.onFirstGesture = () => {
  audio.init();
  tryLockLandscape();
};

function resize() {
  const portrait = window.innerHeight > window.innerWidth;
  const inGame = ['playing', 'paused', 'gameover', 'victory'].includes(game.state);
  const rotated = input.isTouch && portrait && inGame;
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.toggle('rotated', rotated);
  if (rotated) {
    view.w = window.innerHeight;
    view.h = window.innerWidth;
  } else {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
  }
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  canvas.style.width = view.w + 'px';
  canvas.style.height = view.h + 'px';
  ui.onResize();
}

function tryLockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () {});
    }
  } catch (e) {
    /* unsupported */
  }
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

canvas.addEventListener('pointerdown', (e) => {
  if (game.state !== 'select') return;
  const rect = canvas.getBoundingClientRect();
  let mx = e.clientX - rect.left;
  let my = e.clientY - rect.top;
  if (appRotated()) {
    const nx = my;
    const ny = view.w - mx;
    mx = nx;
    my = ny;
  }
  const z = game.camera.zoom;
  const wx = game.camera.x + (mx - view.w / 2) / z;
  const wy = game.camera.y + (my - view.h / 2) / z;
  game.selectCharAt(wx, wy);
});

function appRotated() {
  const appEl = document.getElementById('app');
  return appEl && appEl.classList.contains('rotated');
}

let last = performance.now();
let lastState = game.state;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (game.state !== lastState) {
    lastState = game.state;
    resize();
  }
  if (!document.hidden) {
    game.update(dt, view);
    game.render(ctx, view, view.dpr);
  }
}
requestAnimationFrame(loop);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') {
    ui.pauseGame();
  }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

window.addEventListener('error', (e) => {
  const info = document.getElementById('bootinfo');
  if (info) {
    info.style.display = 'block';
    info.textContent = 'ERR ' + e.message;
  }
  window.__lastError = e.message + ' @ ' + (e.filename || '') + ':' + e.lineno;
});
window.__lastError = '';

window.__game = game;
window.__ui = ui;
document.body.dataset.booted = '1';
