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
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await send('Page.navigate', { url: URL });
await sleep(1800);

async function evaljs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'EVAL_ERR ' + r.result.exceptionDetails.text;
  return r.result ? r.result.result.value : undefined;
}

await evaljs(`document.getElementById('name-input').value='摇杆'; document.getElementById('btn-start').click()`);
await sleep(800);
await evaljs(`window.__game.selectCharAt(4.2*64, 23.2*64)`);
await sleep(300);
await evaljs(`document.getElementById('btn-journey').click()`);
await sleep(1200);

console.log('before:', await evaljs(`JSON.stringify({x:Math.round(window.__game.player.x), y:Math.round(window.__game.player.y)})`));
await evaljs(
  `(() => { const z=document.getElementById('joy-zone'); const r=z.getBoundingClientRect(); z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2})); z.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+r.width/2+45,clientY:r.top+r.height/2})); })()`
);
await sleep(1200);
console.log('during:', await evaljs(`JSON.stringify({x:Math.round(window.__game.player.x), y:Math.round(window.__game.player.y), active:window.__game.input.joy.active})`));
await evaljs(`(() => { const z=document.getElementById('joy-zone'); z.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); })()`);
await sleep(200);
console.log('after release:', await evaljs(`JSON.stringify({active:window.__game.input.joy.active})`));

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);
