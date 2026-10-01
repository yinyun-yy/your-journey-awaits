import { TAU, clamp } from './utils.js';

function outline(ctx, color, lw) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function ell(ctx, x, y, rx, ry, fill, stroke, lw, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    outline(ctx, stroke, lw || 2);
    ctx.stroke();
  }
}

function shadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(30,50,35,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.38, 0, 0, TAU);
  ctx.fill();
}

/* ============================================================
   Aster — 疾风旅人 · 近战短刃 · 青绿斗篷 + 红色围巾
   ============================================================ */
export function drawAster(ctx, o) {
  const s = o.scale || 1;
  const t = o.time || 0;
  const state = o.state || 'idle';
  const small = s < 0.5;

  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.facing < 0 ? -1 : 1) * s, s);

  const ink = 'rgba(52,42,32,0.9)';
  const lw = small ? 2.6 : 2.2;

  const breathe = Math.sin(t * 2.2) * 0.016;
  const walk = o.walk || 0;
  const walkSin = Math.sin(walk);
  const walkCos = Math.cos(walk);
  const hurtF = o.hurtFlash ? 1 : 0;
  const blinkF = o.blink || 0;
  const deadK = state === 'dead' ? Math.min(1, o.deadT || 0.1) : 0;

  if (state === 'dead') {
    ctx.rotate(-1.35 * deadK);
  }

  let bodyY = 0;
  if (state === 'walk') bodyY = Math.abs(walkSin) * -3;
  if (state === 'attack') bodyY = -4;
  if (state === 'dash') bodyY = -2;

  shadow(ctx, 0, 6, 30);

  /* ---------- legs ---------- */
  const legSwing = state === 'walk' ? walkSin : 0;
  const pants = '#6b5335';
  const boots = '#4a3a28';
  for (const side of [-1, 1]) {
    const lx = side * 11;
    let fx = lx + side * 3 + (state === 'walk' ? legSwing * 12 * side : 0);
    let fy = -2 + (state === 'walk' ? Math.max(0, -walkCos * side) * 4 : 0);
    if (state === 'idle' || state === 'attack') fy = 0;
    if (state === 'dash') {
      fx = lx + side * 6;
    }
    ctx.strokeStyle = pants;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(lx, -52 + bodyY);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    outline(ctx, ink, 1.6);
    ctx.stroke();
    ctx.strokeStyle = boots;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + side * 4, 2);
    ctx.stroke();
    outline(ctx, ink, 1.6);
    ctx.stroke();
    ctx.fillStyle = '#5c4a33';
    ctx.beginPath();
    ctx.ellipse(fx + side * 5, 3, 9, 5, 0, 0, TAU);
    ctx.fill();
    outline(ctx, ink, 1.4);
    ctx.stroke();
  }

  /* ---------- cape (behind body) ---------- */
  const capeSway = Math.sin(t * 1.6) * 4 + (state === 'dash' ? -22 : state === 'walk' ? -6 : 0);
  ctx.fillStyle = '#2f9c85';
  ctx.beginPath();
  ctx.moveTo(-14, -118 + bodyY);
  ctx.quadraticCurveTo(-26, -60 + capeSway * 0.4, -30, -8 + capeSway);
  ctx.quadraticCurveTo(-16, -18, -8, -26 + capeSway * 0.5);
  ctx.lineTo(12, -24 + capeSway * 0.4);
  ctx.quadraticCurveTo(26, -56 + capeSway * 0.6, 14, -118 + bodyY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, lw * 0.8);
  ctx.stroke();
  ctx.fillStyle = '#3ec6a8';
  ctx.beginPath();
  ctx.moveTo(-14, -118 + bodyY);
  ctx.quadraticCurveTo(-8, -84, -26, -30 + capeSway * 0.5);
  ctx.lineTo(-12, -30 + capeSway * 0.5);
  ctx.quadraticCurveTo(-4, -80, 10, -112 + bodyY);
  ctx.closePath();
  ctx.fill();
  if (!small) {
    outline(ctx, 'rgba(255,255,255,0.25)', 1.2);
    ctx.beginPath();
    ctx.moveTo(-22, -96 + bodyY);
    ctx.quadraticCurveTo(-20, -70, -24, -50 + capeSway * 0.6);
    ctx.stroke();
  }

  /* ---------- torso / tunic ---------- */
  const sq = 1 + breathe;
  ctx.save();
  ctx.translate(0, -90 + bodyY);
  ctx.scale(sq, 1 - breathe);
  ctx.fillStyle = '#f5ead2';
  ctx.beginPath();
  ctx.moveTo(-17, -22);
  ctx.quadraticCurveTo(-21, 6, -13, 20);
  ctx.lineTo(13, 20);
  ctx.quadraticCurveTo(21, 6, 17, -22);
  ctx.quadraticCurveTo(0, -30, -17, -22);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, lw);
  ctx.stroke();
  ctx.fillStyle = '#3ec6a8';
  ctx.fillRect(-17, -24, 34, 7);
  outline(ctx, ink, 1.2);
  ctx.strokeRect(-17, -24, 34, 7);
  ctx.fillStyle = '#d9c896';
  ctx.beginPath();
  ctx.moveTo(-9, -20);
  ctx.lineTo(9, -20);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* ---------- belt + pouches ---------- */
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-16, -72 + bodyY, 32, 7);
  outline(ctx, ink, 1.3);
  ctx.strokeRect(-16, -72 + bodyY, 32, 7);
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(-5, -72 + bodyY, 10, 7);
  outline(ctx, ink, 1.2);
  ctx.strokeRect(-5, -72 + bodyY, 10, 7);
  for (const side of [-1, 1]) {
    const px = side * 13 - 6;
    ell(ctx, px, -64 + bodyY, 8, 7, '#9a6b3f', ink, 1.3);
    ell(ctx, px, -64 + bodyY, 3.5, 3, '#6b4a2e', null, 0);
  }

  /* ---------- left arm (behind scarf) ---------- */
  const armSwing = state === 'walk' ? -walkSin * 0.5 : 0;
  ctx.strokeStyle = '#f5ead2';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-14, -104 + bodyY);
  ctx.lineTo(-22, -70 + bodyY + armSwing * 8);
  ctx.stroke();
  outline(ctx, ink, 1.6);
  ctx.stroke();
  ell(ctx, -22, -68 + bodyY + armSwing * 8, 6, 5, '#ffd9b8', ink, 1.4);
  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(-27, -74 + bodyY + armSwing * 8, 9, 12);
  outline(ctx, ink, 1.2);
  ctx.strokeRect(-27, -74 + bodyY + armSwing * 8, 9, 12);

  /* ---------- scarf ---------- */
  const scarfFlow = Math.sin(t * 2) * 3 + (state === 'dash' ? 26 : 0);
  ctx.fillStyle = '#e8584a';
  ctx.beginPath();
  ctx.ellipse(0, -112 + bodyY, 17, 9, 0, 0, TAU);
  ctx.fill();
  outline(ctx, ink, lw);
  ctx.stroke();
  ctx.fillStyle = '#e8584a';
  ctx.beginPath();
  ctx.moveTo(4, -108 + bodyY);
  ctx.quadraticCurveTo(30, -100 + scarfFlow, 34, -78 + scarfFlow * 1.4);
  ctx.lineTo(24, -76 + scarfFlow);
  ctx.quadraticCurveTo(18, -96, 4, -102 + bodyY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, 1.4);
  ctx.stroke();
  if (!small) {
    ctx.fillStyle = '#c2403a';
    ctx.beginPath();
    ctx.moveTo(28, -92 + scarfFlow);
    ctx.lineTo(36, -94 + scarfFlow);
    ctx.lineTo(30, -86 + scarfFlow);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- head ---------- */
  const headY = -142 + bodyY + (state === 'walk' ? Math.abs(walkCos) * -2 : 0);
  const headTilt = state === 'attack' ? 0.06 : state === 'dash' ? -0.12 : Math.sin(t * 1.8) * 0.02;
  ctx.save();
  ctx.translate(0, headY);
  ctx.rotate(headTilt);

  ell(ctx, 0, 0, 23, 25, '#ffd9b8', ink, lw);
  if (!small) {
    ell(ctx, -9, -8, 5, 3.4, 'rgba(255,150,120,0.35)', null, 0, -0.4);
  }

  /* ears */
  ell(ctx, -21, -2, 4.5, 6.5, '#ffd9b8', ink, 1.4, -0.2);
  ell(ctx, 21, -2, 4.5, 6.5, '#ffd9b8', ink, 1.4, 0.2);

  /* eyes */
  const eyeY = -4;
  if (state === 'dead') {
    outline(ctx, ink, 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 12 - 4, eyeY - 4);
      ctx.lineTo(side * 12 + 4, eyeY + 4);
      ctx.moveTo(side * 12 + 4, eyeY - 4);
      ctx.lineTo(side * 12 - 4, eyeY + 4);
      ctx.stroke();
    }
  } else if (state === 'hurt') {
    outline(ctx, ink, 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 12, eyeY, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else if (blinkF > 0.05) {
    outline(ctx, ink, 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 12 - 4, eyeY);
      ctx.lineTo(side * 12 + 4, eyeY);
      ctx.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      ell(ctx, side * 12, eyeY, 5.6, 6.6, '#ffffff', ink, 1.3);
      ell(ctx, side * 12 + 1, eyeY + 1, 3.4, 4.4, '#c8791f', null, 0);
      ell(ctx, side * 12 + 1, eyeY + 1, 1.6, 2.2, '#4a2c10', null, 0);
      ell(ctx, side * 12 + 2.4, eyeY - 1.4, 1.1, 1.1, 'rgba(255,255,255,0.95)', null, 0);
    }
  }

  /* eyebrows */
  outline(ctx, ink, 1.8);
  if (state === 'attack' || state === 'dash') {
    ctx.beginPath();
    ctx.moveTo(4, eyeY - 10);
    ctx.lineTo(19, eyeY - 7);
    ctx.moveTo(-4, eyeY - 10);
    ctx.lineTo(-19, eyeY - 7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(5, eyeY - 11);
    ctx.lineTo(19, eyeY - 9);
    ctx.moveTo(-5, eyeY - 11);
    ctx.lineTo(-19, eyeY - 9);
    ctx.stroke();
  }

  /* nose + mouth */
  if (!small) {
    outline(ctx, ink, 1.2);
    ctx.beginPath();
    ctx.moveTo(14, 3);
    ctx.lineTo(17, 6);
    ctx.stroke();
  }
  outline(ctx, ink, 1.6);
  if (state === 'hurt' || state === 'dead') {
    ctx.beginPath();
    ctx.arc(15, 10, 4, 0.3, Math.PI - 0.3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(9, 9);
    ctx.quadraticCurveTo(15, state === 'attack' ? 12 : 13, 21, 9);
    ctx.stroke();
  }

  /* ---------- hair ---------- */
  ctx.fillStyle = '#8a5a33';
  ctx.beginPath();
  ctx.moveTo(-22, -6);
  ctx.quadraticCurveTo(-24, -30, -12, -33);
  ctx.lineTo(-7, -26);
  ctx.lineTo(-9, -38);
  ctx.lineTo(-2, -27);
  ctx.lineTo(0, -40);
  ctx.lineTo(5, -28);
  ctx.lineTo(8, -39);
  ctx.lineTo(13, -27);
  ctx.lineTo(16, -34);
  ctx.quadraticCurveTo(24, -26, 22, -4);
  ctx.quadraticCurveTo(21, -14, 0, -16);
  ctx.quadraticCurveTo(-21, -14, -22, -6);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, lw);
  ctx.stroke();
  ctx.fillStyle = '#a8723f';
  ctx.beginPath();
  ctx.moveTo(-12, -24);
  ctx.quadraticCurveTo(0, -30, 12, -24);
  ctx.quadraticCurveTo(6, -20, 0, -18);
  ctx.quadraticCurveTo(-6, -20, -12, -24);
  ctx.closePath();
  ctx.fill();
  if (!small) {
    ctx.fillStyle = '#a8723f';
    ctx.beginPath();
    ctx.moveTo(-16, -20);
    ctx.lineTo(-22, -16);
    ctx.lineTo(-15, -14);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  /* ---------- right arm + blade ---------- */
  const att = o.attackT !== undefined ? o.attackT : 0;
  const atkK = clamp(att / 0.18, 0, 1);
  let weaponA = 0.5;
  if (state === 'attack') weaponA = -2.1 + atkK * 3.4;
  else if (state === 'skill1') weaponA = 0.9;
  else if (state === 'skill2') weaponA = -2.4;
  else weaponA = 0.55 + Math.sin(t * 1.8) * 0.05;

  const shX = 14;
  const shY = -102 + bodyY;
  ctx.save();
  ctx.translate(shX, shY);
  ctx.rotate(weaponA);

  ctx.strokeStyle = '#f5ead2';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(24, 8);
  ctx.stroke();
  outline(ctx, ink, 1.6);
  ctx.stroke();
  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(22, -2, 10, 12);
  outline(ctx, ink, 1.2);
  ctx.strokeRect(22, -2, 10, 12);
  ell(ctx, 24, 4, 6, 5, '#ffd9b8', ink, 1.4);

  ctx.rotate(-weaponA + 0.35 + (state === 'attack' ? -1.1 + atkK * 1.6 : state === 'skill2' ? -0.6 : 0));
  const gx = 26;
  const gy = 10;
  ctx.fillStyle = '#6b4a2e';
  ctx.fillRect(gx - 4, gy, 8, 9);
  ctx.fillStyle = '#ffd76a';
  ell(ctx, gx, gy - 1, 4, 4, null, null, 0);
  ctx.fillStyle = '#d8dde6';
  ctx.beginPath();
  ctx.moveTo(gx - 3, gy + 9);
  ctx.lineTo(gx + 3, gy + 9);
  ctx.lineTo(gx + 2, gy + 42);
  ctx.lineTo(gx - 2, gy + 42);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, 1.6);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(gx - 1, gy + 11);
  ctx.lineTo(gx + 1, gy + 11);
  ctx.lineTo(gx + 1, gy + 38);
  ctx.lineTo(gx - 1, gy + 38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* ---------- hood on shoulders ---------- */
  ctx.fillStyle = '#3ec6a8';
  ctx.beginPath();
  ctx.moveTo(-20, -118 + bodyY);
  ctx.quadraticCurveTo(0, -108 + bodyY, 20, -118 + bodyY);
  ctx.quadraticCurveTo(14, -126 + bodyY, 0, -126 + bodyY);
  ctx.quadraticCurveTo(-14, -126 + bodyY, -20, -118 + bodyY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, 1.4);
  ctx.stroke();

  /* compass brooch */
  if (!small) {
    ell(ctx, 0, -121 + bodyY, 5, 5, '#ffd76a', '#8a6d2f', 1.4);
    ctx.strokeStyle = '#e8584a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -124 + bodyY);
    ctx.lineTo(1.4, -120 + bodyY);
    ctx.stroke();
    ctx.strokeStyle = '#4a3b28';
    ctx.beginPath();
    ctx.moveTo(0, -118 + bodyY);
    ctx.lineTo(-1.4, -121.5 + bodyY);
    ctx.stroke();
  }

  if (hurtF) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff5c5c';
    ctx.beginPath();
    ctx.arc(0, -90, 55, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/* ============================================================
   Liora — 星语者 · 远程星杖 · 深蓝星斗篷 + 金色饰品
   ============================================================ */
export function drawLiora(ctx, o) {
  const s = o.scale || 1;
  const t = o.time || 0;
  const state = o.state || 'idle';
  const small = s < 0.5;

  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.facing < 0 ? -1 : 1) * s, s);

  const ink = 'rgba(48,40,72,0.9)';
  const lw = small ? 2.6 : 2.2;

  const breathe = Math.sin(t * 2.4) * 0.016;
  const floatY = Math.sin(t * 1.4) * 2.5;
  const walk = o.walk || 0;
  const walkSin = Math.sin(walk);
  const walkCos = Math.cos(walk);
  const hurtF = o.hurtFlash ? 1 : 0;
  const blinkF = o.blink || 0;
  const deadK = state === 'dead' ? Math.min(1, o.deadT || 0.1) : 0;

  if (state === 'dead') {
    ctx.rotate(-1.35 * deadK);
  }

  let bodyY = floatY;
  if (state === 'walk') bodyY += Math.abs(walkSin) * -3;
  if (state === 'attack') bodyY += -4;

  shadow(ctx, 0, 4, 26);

  /* ---------- cloak (behind) ---------- */
  const cloakFlow = Math.sin(t * 1.5) * 4 + (state === 'dash' ? -24 : state === 'walk' ? -5 : 0);
  ctx.fillStyle = '#453a9c';
  ctx.beginPath();
  ctx.moveTo(-13, -120 + bodyY);
  ctx.quadraticCurveTo(-24, -70 + cloakFlow * 0.4, -32, -20 + cloakFlow);
  ctx.quadraticCurveTo(-20, -40 + cloakFlow * 0.6, -4, -52 + cloakFlow * 0.5);
  ctx.quadraticCurveTo(12, -42 + cloakFlow * 0.6, 26, -16 + cloakFlow);
  ctx.quadraticCurveTo(18, -70 + cloakFlow * 0.5, 13, -120 + bodyY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, lw * 0.8);
  ctx.stroke();
  ctx.fillStyle = '#5b4ad6';
  ctx.beginPath();
  ctx.moveTo(-13, -120 + bodyY);
  ctx.quadraticCurveTo(-4, -90, -26, -44 + cloakFlow * 0.5);
  ctx.lineTo(-12, -46 + cloakFlow * 0.5);
  ctx.quadraticCurveTo(2, -88, 9, -116 + bodyY);
  ctx.closePath();
  ctx.fill();
  if (!small) {
    ctx.fillStyle = '#ffd76a';
    const stars = [[-22, -30 + cloakFlow * 0.4], [-10, -66 + cloakFlow * 0.5], [-26, -74 + cloakFlow * 0.5], [20, -26 + cloakFlow], [14, -80 + cloakFlow * 0.5]];
    for (const [sx, sy] of stars) {
      thisStar(ctx, sx, sy, 2.6, '#ffd76a');
    }
  }

  /* ---------- legs ---------- */
  const legSwing = state === 'walk' ? walkSin : 0;
  for (const side of [-1, 1]) {
    const lx = side * 9;
    let fx = lx + side * 2 + (state === 'walk' ? legSwing * 11 * side : 0);
    let fy = -2;
    if (state === 'walk') fy = Math.max(0, -walkCos * side) * 3;
    if (state === 'dash') fx = lx + side * 6;
    ctx.strokeStyle = '#efeafc';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(lx, -54 + bodyY);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    outline(ctx, ink, 1.4);
    ctx.stroke();
    ctx.strokeStyle = '#3a3180';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + side * 4, 3);
    ctx.stroke();
    outline(ctx, ink, 1.4);
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.ellipse(fx + side * 5, 4, 8, 4.4, 0, 0, TAU);
    ctx.fill();
    outline(ctx, ink, 1.3);
    ctx.stroke();
  }

  /* ---------- torso / dress ---------- */
  const sq = 1 + breathe;
  ctx.save();
  ctx.translate(0, -92 + bodyY);
  ctx.scale(sq, 1 - breathe);
  ctx.fillStyle = '#f7f4ff';
  ctx.beginPath();
  ctx.moveTo(-15, -22);
  ctx.quadraticCurveTo(-20, 4, -14, 20);
  ctx.quadraticCurveTo(-22, 24, -20, 34);
  ctx.quadraticCurveTo(0, 40, 20, 34);
  ctx.quadraticCurveTo(22, 24, 14, 20);
  ctx.quadraticCurveTo(20, 4, 15, -22);
  ctx.quadraticCurveTo(0, -30, -15, -22);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, lw);
  ctx.stroke();
  ctx.fillStyle = '#5b4ad6';
  ctx.fillRect(-15, -25, 30, 7);
  outline(ctx, ink, 1.2);
  ctx.strokeRect(-15, -25, 30, 7);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(-20, 26);
  ctx.lineTo(20, 26);
  ctx.lineTo(17, 31);
  ctx.lineTo(-17, 31);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* ---------- sash + belt ---------- */
  ctx.fillStyle = '#7b5cd6';
  ctx.fillRect(-13, -74 + bodyY, 26, 6);
  outline(ctx, ink, 1.2);
  ctx.strokeRect(-13, -74 + bodyY, 26, 6);
  ctx.fillStyle = '#ffd76a';
  ell(ctx, 0, -71 + bodyY, 4, 4, null, null, 0);
  ctx.fill();
  outline(ctx, ink, 1.1);
  ctx.stroke();

  /* ---------- backpack + lantern ---------- */
  ell(ctx, -16, -86 + bodyY, 9, 10, '#8a5a3b', ink, 1.4);
  ell(ctx, -16, -86 + bodyY, 4, 5, '#6b4a2e', null, 0);
  const lanternY = -62 + bodyY + Math.sin(t * 2.6) * 1.5;
  ctx.strokeStyle = '#8a5a3b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-16, -78 + bodyY);
  ctx.lineTo(-24, lanternY);
  ctx.stroke();
  ell(ctx, -24, lanternY, 6, 7, '#ffd76a', ink, 1.4);
  ell(ctx, -24, lanternY, 3.4, 4.4, 'rgba(255,240,180,0.9)', null, 0);
  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(-27, lanternY - 10, 6, 3);

  /* ---------- left arm ---------- */
  const armSwing = state === 'walk' ? -walkSin * 0.5 : 0;
  ctx.strokeStyle = '#efeafc';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-13, -104 + bodyY);
  ctx.lineTo(-21, -74 + bodyY + armSwing * 8);
  ctx.stroke();
  outline(ctx, ink, 1.4);
  ctx.stroke();
  ell(ctx, -21, -72 + bodyY + armSwing * 8, 5.5, 4.6, '#ffe6d4', ink, 1.3);
  ctx.fillStyle = '#5b4ad6';
  ctx.fillRect(-26, -78 + bodyY + armSwing * 8, 8, 11);
  outline(ctx, ink, 1.1);
  ctx.strokeRect(-26, -78 + bodyY + armSwing * 8, 8, 11);

  /* ---------- head ---------- */
  const headY = -140 + bodyY + (state === 'walk' ? Math.abs(walkCos) * -2 : 0);
  const headTilt = state === 'attack' ? -0.05 : Math.sin(t * 1.6) * 0.03;
  ctx.save();
  ctx.translate(0, headY);
  ctx.rotate(headTilt);

  ell(ctx, 0, 0, 21, 24, '#ffe6d4', ink, lw);
  if (!small) {
    ell(ctx, -8, -7, 4.4, 3, 'rgba(255,160,140,0.35)', null, 0, -0.4);
  }

  ell(ctx, -19, -2, 4.2, 6, '#ffe6d4', ink, 1.3, -0.2);
  ell(ctx, 19, -2, 4.2, 6, '#ffe6d4', ink, 1.3, 0.2);
  if (!small) {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(-19, -10, 1.8, 0, TAU);
    ctx.fill();
  }

  const eyeY = -4;
  if (state === 'dead') {
    outline(ctx, ink, 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 11 - 4, eyeY - 4);
      ctx.lineTo(side * 11 + 4, eyeY + 4);
      ctx.moveTo(side * 11 + 4, eyeY - 4);
      ctx.lineTo(side * 11 - 4, eyeY + 4);
      ctx.stroke();
    }
  } else if (state === 'hurt') {
    outline(ctx, ink, 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 11, eyeY, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else if (blinkF > 0.05) {
    outline(ctx, ink, 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 11 - 4, eyeY);
      ctx.lineTo(side * 11 + 4, eyeY);
      ctx.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      ell(ctx, side * 11, eyeY, 5.4, 6.4, '#ffffff', ink, 1.3);
      ell(ctx, side * 11 + 0.6, eyeY + 1, 3.2, 4.4, '#7b5cd6', null, 0);
      ell(ctx, side * 11 + 0.6, eyeY + 1, 1.5, 2.2, '#2e2450', null, 0);
      ell(ctx, side * 11 + 2, eyeY - 1.4, 1.1, 1.1, 'rgba(255,255,255,0.95)', null, 0);
    }
  }

  outline(ctx, ink, 1.5);
  ctx.beginPath();
  ctx.moveTo(4, eyeY - 10);
  ctx.lineTo(17, eyeY - 8.4);
  ctx.moveTo(-4, eyeY - 10);
  ctx.lineTo(-17, eyeY - 8.4);
  ctx.stroke();

  if (!small) {
    outline(ctx, ink, 1.1);
    ctx.beginPath();
    ctx.moveTo(13, 3);
    ctx.lineTo(15.5, 5.5);
    ctx.stroke();
  }
  outline(ctx, ink, 1.6);
  if (state === 'hurt' || state === 'dead') {
    ctx.beginPath();
    ctx.arc(14, 10, 3.6, 0.3, Math.PI - 0.3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(9, 9);
    ctx.quadraticCurveTo(14, 13, 19, 9);
    ctx.stroke();
  }

  /* ---------- long hair ---------- */
  const hairFlow = Math.sin(t * 1.6) * 3 + (state === 'dash' ? 20 : 0);
  ctx.fillStyle = '#b9aee8';
  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.quadraticCurveTo(-22, -26, -10, -31);
  ctx.quadraticCurveTo(-4, -36, 6, -32);
  ctx.quadraticCurveTo(16, -30, 20, -14);
  ctx.quadraticCurveTo(22, -6, 20, -2);
  ctx.quadraticCurveTo(21, 20, 14, 46 + hairFlow);
  ctx.quadraticCurveTo(8, 60 + hairFlow, 2, 48 + hairFlow);
  ctx.quadraticCurveTo(4, 24, 4, -6);
  ctx.quadraticCurveTo(-4, -14, -14, -12);
  ctx.quadraticCurveTo(-19, -12, -20, -6);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, lw);
  ctx.stroke();
  ctx.fillStyle = '#cbc2f2';
  ctx.beginPath();
  ctx.moveTo(12, -12);
  ctx.quadraticCurveTo(20, 8, 13, 40 + hairFlow * 0.8);
  ctx.quadraticCurveTo(10, 20, 8, -8);
  ctx.closePath();
  ctx.fill();

  /* braid */
  const braidT = t * 2.4;
  ctx.strokeStyle = '#b9aee8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(16, -18);
  ctx.quadraticCurveTo(24, -6 + Math.sin(braidT) * 2, 20, 14 + Math.sin(braidT + 1) * 2);
  ctx.stroke();
  outline(ctx, ink, 1.2);
  ctx.stroke();
  if (!small) {
    ctx.fillStyle = '#ffd76a';
    ell(ctx, 20, 16 + Math.sin(braidT + 1) * 2, 3, 3, null, '#8a6d2f', 1);
  }

  /* star hairpin */
  thisStar(ctx, -14, -26, 4, '#ffd76a');
  outline(ctx, ink, 1);
  ctx.stroke();

  ctx.restore();

  /* ---------- right arm + star staff ---------- */
  const att = o.attackT !== undefined ? o.attackT : 0;
  const atkK = clamp(att / 0.16, 0, 1);
  let weaponA = 0.35;
  if (state === 'attack') weaponA = 0.2 + atkK * 0.6;
  else if (state === 'skill1') weaponA = -0.6;
  else if (state === 'skill2') weaponA = -1.5 + (o.spinT || 0) * 6;
  else weaponA = 0.35 + Math.sin(t * 1.8) * 0.05;

  const shX = 13;
  const shY = -103 + bodyY;
  ctx.save();
  ctx.translate(shX, shY);
  ctx.rotate(weaponA);

  ctx.strokeStyle = '#f7f4ff';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(26, 6);
  ctx.stroke();
  outline(ctx, ink, 1.4);
  ctx.stroke();
  ell(ctx, 27, 5, 5.6, 4.6, '#ffe6d4', ink, 1.3);
  ctx.fillStyle = '#5b4ad6';
  ctx.fillRect(25, -6, 7, 12);
  outline(ctx, ink, 1.1);
  ctx.strokeRect(25, -6, 7, 12);

  ctx.rotate(-weaponA + 0.12);
  const gx = 32;
  const gy = 8;
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + 2, gy + 74);
  ctx.stroke();
  outline(ctx, ink, 1);
  ctx.stroke();
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(gx - 0.5, gy + 6);
  ctx.lineTo(gx + 2.5, gy + 72);
  ctx.stroke();

  const orbPulse = 1 + Math.sin(t * 3.2) * 0.12;
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(gx + 1, gy - 8, 8 * orbPulse, 0, TAU);
  ctx.fill();
  outline(ctx, ink, 1.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,244,200,0.95)';
  ctx.beginPath();
  ctx.arc(gx - 1.6, gy - 10, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(gx + 1, gy - 8, 13.5, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gx + 1, gy - 8, 13.5, -Math.PI * 0.85 + Math.PI, -Math.PI * 0.15 + Math.PI);
  ctx.stroke();
  ctx.restore();

  /* ---------- hood ---------- */
  ctx.fillStyle = '#5b4ad6';
  ctx.beginPath();
  ctx.moveTo(-19, -118 + bodyY);
  ctx.quadraticCurveTo(0, -106 + bodyY, 19, -118 + bodyY);
  ctx.quadraticCurveTo(12, -125 + bodyY, 0, -125 + bodyY);
  ctx.quadraticCurveTo(-12, -125 + bodyY, -19, -118 + bodyY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, ink, 1.3);
  ctx.stroke();
  if (!small) {
    ell(ctx, 0, -120 + bodyY, 4, 4, '#ffd76a', '#8a6d2f', 1.3);
  }

  if (hurtF) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff5c5c';
    ctx.beginPath();
    ctx.arc(0, -90, 52, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function thisStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    const a2 = a + TAU / 10;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    const qx = x + Math.cos(a2) * r * 0.45;
    const qy = y + Math.sin(a2) * r * 0.45;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    ctx.lineTo(qx, qy);
  }
  ctx.closePath();
  ctx.fill();
}

export const CHARACTER_DRAW = {
  aster: drawAster,
  liora: drawLiora,
};
