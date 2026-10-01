import fs from 'node:fs';

const BASE = 'http://127.0.0.1:' + (process.env.CDP_PORT || '9222');
const URL = process.env.TEST_URL || 'http://localhost:8000/index.html';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tabRes = await fetch(BASE + '/json/new?about:blank', { method: 'PUT' });
const tab = await tabRes.json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
const exceptions = [];

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exceptions.push((d.exception && d.exception.description) || d.text);
  }
};

function send(method, params) {
  return new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}

await new Promise((r) => (ws.onopen = r));
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: URL });
await sleep(1600);

async function evaljs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'EVAL_ERR ' + r.result.exceptionDetails.text;
  return r.result ? r.result.result.value : undefined;
}

await evaljs(`document.getElementById('name-input').value='像素'; document.getElementById('btn-start').click()`);
await sleep(1500);

console.log('--- select scene pixel probe ---');
const probe = await evaljs(
  `(() => {
    const g = window.__game;
    const cv = document.getElementById('game');
    const ctx2 = cv.getContext('2d');
    const dpr = cv.width / cv.clientWidth;
    const z = g.camera.zoom;
    const toScreen = (wx, wy) => {
      const sx = (cv.clientWidth / 2 + (wx - g.camera.x) * z);
      const sy = (cv.clientHeight / 2 + (wy - g.camera.y) * z);
      return { sx, sy };
    };
    const chars = [
      { id: 'aster', wx: 4.2 * 64, wy: 23.2 * 64 - 110 },
      { id: 'liora', wx: 10.6 * 64, wy: 23.2 * 64 - 110 },
    ];
    const out = [];
    for (const c of chars) {
      const { sx, sy } = toScreen(c.wx, c.wy);
      const x0 = Math.round(sx * dpr) - 60;
      const y0 = Math.round(sy * dpr) - 150;
      const w = 120, h = 240;
      if (x0 < 0 || y0 < 0 || x0 + w > cv.width || y0 + h > cv.height) {
        out.push({ id: c.id, err: 'out of bounds', x0, y0 });
        continue;
      }
      const data = ctx2.getImageData(x0, y0, w, h).data;
      const colors = new Set();
      let painted = 0;
      let bg = 0;
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], gg = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a > 0) bg++;
        if (a > 0) {
          colors.add(((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4));
        }
      }
      out.push({ id: c.id, colors: colors.size, painted: bg });
    }
    return JSON.stringify(out);
  })()`
);
console.log('SELECT PIXELS', probe);

console.log('--- gameplay fps probe ---');
await evaljs(`window.__game.selectCharAt(4.2*64, 23.2*64)`);
await sleep(300);
await evaljs(`document.getElementById('btn-journey').click()`);
await sleep(1000);
const fps = await evaljs(
  `(async () => {
    const t0 = performance.now();
    let frames = 0;
    await new Promise((res) => {
      const tick = () => {
        frames++;
        if (performance.now() - t0 > 3000) res();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return JSON.stringify({ fps: Math.round(frames / 3), state: window.__game.state });
  })()`
);
console.log('FPS', await fps);

console.log('--- gameplay pixel probe (player) ---');
const playProbe = await evaljs(
  `(() => {
    const g = window.__game;
    const cv = document.getElementById('game');
    const ctx2 = cv.getContext('2d');
    const dpr = cv.width / cv.clientWidth;
    const z = g.camera.zoom;
    const sx = cv.clientWidth / 2 + (g.player.x - g.camera.x) * z;
    const sy = cv.clientHeight / 2 + (g.player.y - g.camera.y) * z;
    const x0 = Math.round(sx * dpr) - 45;
    const y0 = Math.round(sy * dpr) - 110;
    const w = 90, h = 130;
    const data = ctx2.getImageData(x0, y0, w, h).data;
    const colors = new Set();
    let painted = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], gg = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 0) { painted++; colors.add(((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4)); }
    }
    return JSON.stringify({ colors: colors.size, painted });
  })()`
);
console.log('PLAYER PIXELS', playProbe);

console.log('--- boss pixel probe ---');
await evaljs(`(() => { const g=window.__game; g.player.x=24.5*64; g.player.y=7.5*64; g.camera.snapTo(g.player.x, g.player.y); })()`);
await sleep(1500);
const bossProbe = await evaljs(
  `(() => {
    const g = window.__game;
    const cv = document.getElementById('game');
    const ctx2 = cv.getContext('2d');
    const dpr = cv.width / cv.clientWidth;
    const z = g.camera.zoom;
    const sx = cv.clientWidth / 2 + (g.boss.x - g.camera.x) * z;
    const sy = cv.clientHeight / 2 + (g.boss.y - g.camera.y) * z;
    const x0 = Math.round(sx * dpr) - 70;
    const y0 = Math.round(sy * dpr) - 90;
    const w = 140, h = 140;
    const data = ctx2.getImageData(x0, y0, w, h).data;
    const colors = new Set();
    let painted = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], gg = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 0) { painted++; colors.add(((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4)); }
    }
    return JSON.stringify({ colors: colors.size, painted, activated: g.bossActivated });
  })()`
);
console.log('BOSS PIXELS', bossProbe);

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);
