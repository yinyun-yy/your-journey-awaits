export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const lerp = (a, b, t) => a + (b - a) * t;

export function rand(a = 1, b) {
  if (b === undefined) return Math.random() * a;
  return a + Math.random() * (b - a);
}

export const randInt = (a, b) => Math.floor(rand(a, b + 1));

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export function hash2(x, y) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export const expDamp = (dt, k) => 1 - Math.exp(-dt * k);

export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

export function fmtNum(n) {
  return Math.floor(n).toLocaleString('zh-CN');
}
