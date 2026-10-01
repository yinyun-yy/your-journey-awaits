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

await evaljs(`document.getElementById('name-input').value='撞墙'; document.getElementById('btn-start').click()`);
await sleep(800);
await evaljs(`window.__game.selectCharAt(4.2*64, 23.2*64)`);
await sleep(300);
await evaljs(`document.getElementById('btn-journey').click()`);
await sleep(1200);

console.log('--- wall collision probe ---');
// teleport player INSIDE the corner wall tile (0,0)
const deep = await evaljs(
  `(() => { const g=window.__game; g.player.x=10; g.player.y=10; g.map.resolveCircle(g.player, g.player.r); return JSON.stringify({x:g.player.x.toFixed(1), y:g.player.y.toFixed(1)}); })()`
);
console.log('DEEP PUSH   ', deep);

// walk player into the map border wall from inside and let physics push
const walk = await evaljs(
  `(() => { const g=window.__game; g.player.x=70; g.player.y=70; g.player.vx=0; g.player.vy=0; for (let i=0;i<120;i++){ g.player.x -= 2.2; g.player.y -= 2.2; g.map.resolveCircle(g.player, g.player.r); } return JSON.stringify({x:g.player.x.toFixed(1), y:g.player.y.toFixed(1), inside:g.map.solidAtWorld(g.player.x,g.player.y)}); })()`
);
console.log('WALK INTO WALL', walk);

// try to slip through a wall corner seam: push diagonally at corner between (0,1) and (1,0)
const corner = await evaljs(
  `(() => { const g=window.__game; g.player.x=90; g.player.y=68; g.player.vx=0; g.player.vy=0; for (let i=0;i<90;i++){ g.player.x -= 1.4; g.player.y -= 1.4; g.map.resolveCircle(g.player, g.player.r); } return JSON.stringify({x:g.player.x.toFixed(1), y:g.player.y.toFixed(1), inside:g.map.solidAtWorld(g.player.x,g.player.y)}); })()`
);
console.log('CORNER SEAM  ', corner);

// tree trunk: player should overlap canopy edge but not trunk center
const tree = await evaljs(
  `(() => { const g=window.__game; const tr=g.enemies[0]; g.player.x=4.2*64+24; g.player.y=23.2*64; g.map.resolveCircle(g.player, g.player.r); return JSON.stringify({solid:g.map.solidAtWorld(g.player.x,g.player.y)}); })()`
);
console.log('TREE AREA   ', tree);

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);
