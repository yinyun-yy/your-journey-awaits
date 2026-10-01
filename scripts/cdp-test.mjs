import fs from 'node:fs';

const BASE = 'http://127.0.0.1:' + (process.env.CDP_PORT || '9222');
const URL = process.env.TEST_URL || 'http://localhost:8000/index.html';
const SHOT_DIR = process.env.SHOT_DIR || 'screenshots';

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
await sleep(1800);

async function evaljs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'EVAL_ERR ' + r.result.exceptionDetails.text;
  return r.result ? r.result.result.value : undefined;
}

async function shot(name) {
  try {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
  } catch (e) { /* ignore */ }
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOT_DIR + '/' + name + '.png', Buffer.from(r.result.data, 'base64'));
  console.log('shot saved:', name);
}

const state = () =>
  evaljs(
    `JSON.stringify({state:window.__game.state, err:window.__lastError, profile:JSON.parse(localStorage.getItem('yja_profile')||'null')})`
  );

console.log('BOOT       ', await state());
await shot('01-intro');

console.log('empty name test');
await evaljs(`document.getElementById('name-input').value='   '; document.getElementById('btn-start').click()`);
await sleep(300);
console.log('NAME ERR   ', await evaljs(`document.getElementById('name-err').textContent`));

console.log('enter name 音韵');
await evaljs(`document.getElementById('name-input').value='音韵'; document.getElementById('btn-start').click()`);
await sleep(1200);
console.log('SELECT     ', await state());
await shot('02-select');

console.log('select Aster');
await evaljs(
  `(() => { const g=window.__game; g.selectCharAt(4.2*64, 23.2*64); })()`
);
await sleep(600);
console.log(
  'CHOSEN     ',
  await evaljs(
    `JSON.stringify({chosen:window.__game.selectChosen, infoShown:!document.getElementById('char-info').classList.contains('hidden'), btnDisabled:document.getElementById('btn-journey').classList.contains('disabled')})`
  )
);
await shot('03-select-aster');

console.log('switch to Liora');
await evaljs(
  `(() => { const g=window.__game; g.selectCharAt(10.6*64, 23.2*64); })()`
);
await sleep(600);
console.log(
  'LIORA      ',
  await evaljs(
    `JSON.stringify({chosen:window.__game.selectChosen, name:document.getElementById('char-name').textContent, title:document.getElementById('char-title').textContent})`
  )
);
await shot('03b-select-liora');

console.log('switch back to Aster');
await evaljs(
  `(() => { const g=window.__game; g.selectCharAt(4.2*64, 23.2*64); })()`
);
await sleep(400);

console.log('start journey');
await evaljs(`document.getElementById('btn-journey').click()`);
await sleep(1500);
console.log('PLAYING    ', await state());
console.log(
  'PLAYER     ',
  await evaljs(
    `JSON.stringify({hp:window.__game.player.hp, name:window.__game.player.name, char:window.__game.player.characterId, x:Math.round(window.__game.player.x), y:Math.round(window.__game.player.y), enemies:window.__game.enemies.filter(e=>e.alive&&e.state!=='dead').length, hudShown:!document.getElementById('hud').classList.contains('hidden')})`
  )
);
await shot('04-playing');

console.log('move right (D held)');
await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'d'}))`);
await sleep(800);
await evaljs(`window.dispatchEvent(new KeyboardEvent('keyup',{key:'d'}))`);
console.log('MOVED      ', await evaljs(`Math.round(window.__game.player.x)`));

console.log('attack test (J)');
await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'j'}))`);
await sleep(200);
console.log('ATTACK     ', await evaljs(`JSON.stringify({state:window.__game.player.state, attackT:window.__game.player.attackT>=0})`));

console.log('skill1 test (K)');
await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'k'}))`);
await sleep(400);
console.log('SKILL1     ', await evaljs(`JSON.stringify({state:window.__game.player.state, cd:window.__game.player.skill1Cd.toFixed(1)})`));

console.log('skill2 test (L)');
await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'l'}))`);
await sleep(400);
console.log('SKILL2     ', await evaljs(`JSON.stringify({state:window.__game.player.state, cd:window.__game.player.skill2Cd.toFixed(1)})`));

console.log('boost test (Space)');
await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:' '}))`);
await sleep(600);
console.log('BOOST      ', await evaljs(`JSON.stringify({boosting:window.__game.player.boosting, stamina:Math.round(window.__game.player.stamina)})`));
await evaljs(`window.dispatchEvent(new KeyboardEvent('keyup',{key:' '}))`);

console.log('teleport to enemy + fight');
await evaljs(
  `(() => { const g=window.__game; const e=g.enemies.find(x=>x.alive&&x.state!=='dead'&&x.kind==='melee'); g.player.x=e.x-60; g.player.y=e.y; g.camera.snapTo(g.player.x, g.player.y); const sx=innerWidth/2+(e.x-g.camera.x)*g.camera.zoom; const sy=innerHeight/2+(e.y-g.camera.y)*g.camera.zoom; g.input.mouse.x=sx; g.input.mouse.y=sy; })()`
);
await sleep(600);
for (let i = 0; i < 6; i++) {
  await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'j'}))`);
  await sleep(260);
}
await sleep(600);
console.log(
  'AFTER HITS ',
  await evaljs(
    `JSON.stringify({kills:window.__game.player.kills, coins:window.__game.player.coins, hp:Math.round(window.__game.player.hp), enemies:window.__game.enemies.filter(e=>e.alive&&e.state!=='dead').length})`
  )
);

console.log('test Liora ranged attack');
await evaljs(`window.__game.player.characterId='liora'`);
await evaljs(
  `(() => { const g=window.__game; const e=g.enemies.find(x=>x.alive&&x.state!=='dead'&&x.kind==='melee'); g.player.x=e.x-220; g.player.y=e.y; g.camera.snapTo(g.player.x, g.player.y); const sx=innerWidth/2+(e.x-g.camera.x)*g.camera.zoom; const sy=innerHeight/2+(e.y-g.camera.y)*g.camera.zoom; g.input.mouse.x=sx; g.input.mouse.y=sy; })()`
);
await sleep(300);
await evaljs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'j'}))`);
await sleep(800);
console.log(
  'RANGED     ',
  await evaljs(
    `JSON.stringify({proj:window.__game.projectiles.items.filter(p=>p.active).length, kills:window.__game.player.kills, targets:window.__game.enemies.filter(x=>x.alive&&x.state!=='dead'&&x.kind==='melee').map(e=>Math.round(e.hp))})`
  )
);

console.log('chest test (hidden area)');
await evaljs(
  `(() => { const g=window.__game; g.player.characterId='aster'; const c=g.treasure.chests[0]; g.player.x=c.x; g.player.y=c.y; g.camera.snapTo(g.player.x, g.player.y); })()`
);
await sleep(1200);
console.log(
  'CHEST      ',
  await evaljs(
    `JSON.stringify({opened:window.__game.treasure.chests[0].opened, coins:window.__game.player.coins, hp:Math.round(window.__game.player.hp), score:window.__game.score})`
  )
);

console.log('teleport to boss arena');
await evaljs(
  `(() => { const g=window.__game; g.player.x=24.5*64; g.player.y=7.5*64; g.camera.snapTo(g.player.x, g.player.y); })()`
);
await sleep(1200);
console.log(
  'BOSS       ',
  await evaljs(
    `JSON.stringify({activated:window.__game.bossActivated, gate:window.__game.map.gateClosed, barShown:!document.getElementById('boss-bar').classList.contains('hidden'), bossHp:window.__game.boss.hp})`
  )
);
await shot('05-boss');

console.log('fight boss (invincible + kill)');
await evaljs(`window.__game.player.invulnT=9999; window.__game.player.hp=100;`);
await evaljs(
  `(() => { const g=window.__game; g.player.x=g.boss.x-60; g.player.y=g.boss.y; g.camera.snapTo(g.player.x, g.player.y); const sx=innerWidth/2+(g.boss.x-g.camera.x)*g.camera.zoom; const sy=innerHeight/2+(g.boss.y-g.camera.y)*g.camera.zoom; g.input.mouse.x=sx; g.input.mouse.y=sy; })()`
);
await sleep(400);
for (let i = 0; i < 45; i++) {
  await evaljs(
    `(() => { const g=window.__game; const sx=innerWidth/2+(g.boss.x-g.camera.x)*g.camera.zoom; const sy=innerHeight/2+(g.boss.y-g.camera.y)*g.camera.zoom; g.input.mouse.x=sx; g.input.mouse.y=sy; g.player.x=g.boss.x-60; g.player.y=g.boss.y; g.player.invulnT=9999; window.dispatchEvent(new KeyboardEvent('keydown',{key:'j'})); window.dispatchEvent(new KeyboardEvent('keydown',{key:'k'})); window.dispatchEvent(new KeyboardEvent('keydown',{key:'l'})); })()`
  );
  await sleep(260);
}
await sleep(2200);
console.log(
  'BOSS DEAD  ',
  await evaljs(
    `JSON.stringify({bossDead:window.__game.bossDead, exitOpen:window.__game.map.exitOpen, gate:window.__game.map.gateClosed, bossHp:window.__game.boss.hp, kills:window.__game.player.kills, coins:window.__game.player.coins})`
  )
);
await shot('06-boss-dead');

console.log('walk to exit');
await evaljs(
  `(() => { const g=window.__game; g.player.x=g.exitPos.x; g.player.y=g.exitPos.y; })()`
);
await sleep(1600);
console.log('VICTORY    ', await state());
console.log(
  'VICTORY UI ',
  await evaljs(
    `JSON.stringify({shown:!document.getElementById('victory').classList.contains('hidden'), title:document.getElementById('v-title').textContent, time:document.getElementById('v-time').textContent, kills:document.getElementById('v-kills').textContent, coins:document.getElementById('v-coins').textContent, best:document.getElementById('v-best').textContent})`
  )
);
await shot('07-victory');

console.log('replay');
await evaljs(`document.getElementById('btn-victory-again').click()`);
await sleep(1200);
console.log('REPLAY     ', await state());

console.log('pause test');
await evaljs(`document.getElementById('btn-pause').click()`);
await sleep(500);
console.log('PAUSED     ', await state());
await evaljs(`document.getElementById('btn-resume').click()`);
await sleep(400);
console.log('RESUMED    ', await state());

console.log('rename test');
await evaljs(`document.getElementById('btn-pause').click()`);
await sleep(300);
await evaljs(`document.getElementById('btn-rename').click()`);
await sleep(300);
await evaljs(`document.getElementById('rename-input').value='音韵2'; document.getElementById('btn-rename-ok').click()`);
await sleep(300);
console.log(
  'RENAMED    ',
  await evaljs(
    `JSON.stringify({name:window.__game.player.name, profile:JSON.parse(localStorage.getItem('yja_profile')).name, hud:document.getElementById('hud-name').textContent})`
  )
);

console.log('death test');
await evaljs(`document.getElementById('btn-resume').click()`);
await sleep(300);
await evaljs(`window.__game.player.invulnT=0; window.__game.hitPlayer(1000, window.__game.player.x+50, window.__game.player.y);`);
await sleep(2200);
console.log(
  'GAMEOVER   ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, shown:!document.getElementById('gameover').classList.contains('hidden'), title:document.getElementById('go-title').textContent})`
  )
);
await shot('08-gameover');

console.log('back home');
await evaljs(`document.getElementById('btn-home2').click()`);
await sleep(600);
console.log(
  'HOME       ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, introShown:!document.getElementById('intro').classList.contains('hidden'), continueShown:!document.getElementById('btn-continue').classList.contains('hidden'), label:document.getElementById('continue-label').textContent})`
  )
);

console.log('continue journey (direct start)');
await evaljs(`document.getElementById('btn-continue').click()`);
await sleep(1200);
console.log(
  'CONTINUE   ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, name:window.__game.player.name, char:window.__game.player.characterId})`
  )
);

console.log('reload persistence test');
await send('Page.reload', {});
await sleep(1800);
console.log(
  'RELOADED   ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, input:document.getElementById('name-input').value, continueShown:!document.getElementById('btn-continue').classList.contains('hidden'), label:document.getElementById('continue-label').textContent})`
  )
);

console.log('mobile touch test');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await send('Page.reload', {});
await sleep(2000);
console.log(
  'MOBILE BOOT',
  await evaljs(
    `JSON.stringify({isTouch:window.__game.input.isTouch, introShown:!document.getElementById('intro').classList.contains('hidden')})`
  )
);
await evaljs(`document.getElementById('btn-continue').click()`);
await sleep(1500);
console.log(
  'MOBILE GAME',
  await evaljs(
    `JSON.stringify({state:window.__game.state, touchShown:!document.getElementById('touch-controls').classList.contains('hidden'), pcHintHidden:document.getElementById('pc-hints').classList.contains('hidden'), rotated:document.getElementById('app').classList.contains('rotated')})`
  )
);
await shot('09-mobile-game');

console.log('mobile buttons test');
await evaljs(
  `(() => { const b=document.getElementById('btn-attack'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); })()`
);
await sleep(300);
console.log(
  'BTN ATTACK ',
  await evaljs(`JSON.stringify({cd:window.__game.player.attackCd.toFixed(2), state:window.__game.player.state})`)
);
await evaljs(
  `(() => { const b=document.getElementById('btn-skill1'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); })()`
);
await sleep(300);
console.log(
  'BTN SKILL1 ',
  await evaljs(`JSON.stringify({cd:window.__game.player.skill1Cd.toFixed(1)})`)
);
await evaljs(
  `(() => { const b=document.getElementById('btn-skill2'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); })()`
);
await sleep(300);
console.log(
  'BTN SKILL2 ',
  await evaljs(`JSON.stringify({cd:window.__game.player.skill2Cd.toFixed(1)})`)
);
await evaljs(
  `(() => { const b=document.getElementById('btn-boost'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); })()`
);
await sleep(500);
console.log(
  'BTN BOOST  ',
  await evaljs(`JSON.stringify({boost:window.__game.input.boost, active:document.getElementById('btn-boost').classList.contains('active'), stamina:Math.round(window.__game.player.stamina)})`)
);
await evaljs(`document.getElementById('btn-boost').dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))`);

console.log('mobile joystick test');
await evaljs(
  `(() => { const z=document.getElementById('joy-zone'); const r=z.getBoundingClientRect(); z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2})); z.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+r.width/2+40,clientY:r.top+r.height/2})); })()`
);
await sleep(500);
console.log(
  'JOYSTICK   ',
  await evaljs(
    `JSON.stringify({active:window.__game.input.joy.active, x:window.__game.input.joy.x.toFixed(2), y:window.__game.input.joy.y.toFixed(2), playerMoved:Math.round(window.__game.player.x)!==Math.round(window.__game.player.x)})`
  )
);
const joyMoved = await evaljs(
  `(() => { const x0=window.__game.player.x; return JSON.stringify({x0:Math.round(x0)}); })()`
);
await sleep(800);
console.log('JOY MOVED  ', await evaljs(`JSON.stringify({x:Math.round(window.__game.player.x), prev:` + joyMoved + `})`));
await evaljs(`(() => { const z=document.getElementById('joy-zone'); z.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); })()`);

await send('Emulation.setTouchEmulationEnabled', { enabled: false });

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);
