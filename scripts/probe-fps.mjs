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

async function evaljs(expression, awaitPromise) {
  const r = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: !!awaitPromise,
  });
  if (r.result && r.result.exceptionDetails) return 'EVAL_ERR ' + r.result.exceptionDetails.text;
  return r.result ? r.result.result.value : undefined;
}

await evaljs(`document.getElementById('name-input').value='帧率'; document.getElementById('btn-start').click()`);
await sleep(800);
await evaljs(`window.__game.selectCharAt(4.2*64, 23.2*64)`);
await sleep(300);
await evaljs(`document.getElementById('btn-journey').click()`);
await sleep(1500);

const fpsSelect = await evaljs(
  `(async () => { const t0=performance.now(); let f=0; await new Promise(res=>{const t=()=>{f++; if(performance.now()-t0>3000) res(); else requestAnimationFrame(t);}; requestAnimationFrame(t);}); return JSON.stringify({fps:Math.round(f/3)}); })()`,
  true
);
console.log('FPS in select:', await fpsSelect);

await evaljs(`window.__game.toSelect()`);
await sleep(800);
console.log('select again ok, state=', await evaljs(`window.__game.state`));

const fpsBoot = await evaljs(
  `(async () => { const t0=performance.now(); let f=0; await new Promise(res=>{const t=()=>{f++; if(performance.now()-t0>3000) res(); else requestAnimationFrame(t);}; requestAnimationFrame(t);}); return JSON.stringify({fps:Math.round(f/3)}); })()`,
  true
);
console.log('FPS in select scene:', await fpsBoot);

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);
