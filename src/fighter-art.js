// ---------------------------------------------------------------------------
// Procedural fighter art — skeletal, hand-inked, fully vector.
// ---------------------------------------------------------------------------

import { CHARACTERS, POSES } from './data.js';

const R = Math.PI / 180;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function bone(ctx, a, b, width, color, outline = 3.5) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (outline > 0) {
    ctx.strokeStyle = 'rgba(12, 8, 16, 0.92)';
    ctx.lineWidth = width + outline;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function boneCurve(ctx, a, b, c, width, color, outline = 3.5) {
  ctx.lineCap = 'round';
  if (outline > 0) {
    ctx.strokeStyle = 'rgba(12, 8, 16, 0.92)';
    ctx.lineWidth = width + outline;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
  ctx.stroke();
}

function joint(root, angle, len) {
  const a = angle * R;
  return { x: root.x + Math.sin(a) * len, y: root.y + Math.cos(a) * len };
}

function chain(root, a1, l1, a2, l2) {
  const mid = joint(root, a1, l1);
  const end = joint(mid, a2, l2);
  return { mid, end };
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function fist(ctx, p, r, color, dark, angle = 0) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(10, 7, 14, 0.95)';
  ellipse(ctx, 0, 0, r + 2.5, r + 2.5);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r + 1);
  g.addColorStop(0, color);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ellipse(ctx, 0, 0, r, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 40, 30, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, -0.6, 1.8);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// arms & legs
// ---------------------------------------------------------------------------
function paintArm(ctx, char, shoulder, angles, back, time, state) {
  const c = char.colors;
  const { mid, end } = chain(shoulder, angles[0], 42, angles[1], 37);
  const shade = back;
  const sleeve = shade ? c.giShade : c.gi;
  const skin = shade ? c.skinShade : c.skin;
  const skinLight = shade ? c.skin : c.skinLight;
  const akane = char.id === 'akane';

  if (akane) {
    // bare arm with a fitted armguard
    bone(ctx, shoulder, mid, 12.5, shade ? c.giDark : c.giShade, 3.5);
    bone(ctx, shoulder, mid, 8, skin, 0);
    const guard = joint(shoulder, angles[0], 38);
    bone(ctx, guard, mid, 11, shade ? c.accentDark : c.accent, 3);
    bone(ctx, mid, end, 9.5, skin, 3.5);
  } else {
    // rolled gi sleeve + bare forearm
    bone(ctx, shoulder, mid, 17, sleeve, 3.8);
    bone(ctx, { x: shoulder.x, y: shoulder.y - 1 }, { x: mid.x, y: mid.y - 1 }, 11, shade ? c.giShade : '#fbf7ec', 0);
    bone(ctx, mid, end, 10, skin, 3.4);
  }

  // wrist wraps
  const wrist = { x: end.x + (mid.x - end.x) * 0.18, y: end.y + (mid.y - end.y) * 0.18 };
  bone(ctx, { x: wrist.x + (mid.x - end.x) * -0.03, y: wrist.y - 2 }, wrist, 10.5, c.wrap, 2.4);
  ctx.strokeStyle = c.trim;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.8;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(wrist.x - 4, wrist.y + i * 2.4);
    ctx.lineTo(wrist.x + 4, wrist.y + i * 2.4 + 1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const angle = (angles[1] - 90) * R;
  fist(ctx, end, akane ? 6.6 : 7.6, skinLight, skin, angle);

  // shoulder cap
  ctx.fillStyle = shade ? c.giShade : c.gi;
  ctx.strokeStyle = 'rgba(12, 8, 16, 0.9)';
  ctx.lineWidth = 3;
  ellipse(ctx, shoulder.x, shoulder.y, akane ? 8 : 10, akane ? 8 : 10);
  ctx.fill();
  ctx.stroke();
  if (!akane) {
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shoulder.x, shoulder.y, 7, -1.2, 1.2);
    ctx.stroke();
  }
}

function paintLeg(ctx, char, hipRoot, angles, back, time) {
  const c = char.colors;
  const { mid, end } = chain(hipRoot, angles[0], 47, angles[1], 46);
  const akane = char.id === 'akane';
  const pants = back ? c.pantsShade : c.pants;
  const skin = back ? c.skinShade : c.skin;

  // thigh / trousers
  bone(ctx, hipRoot, mid, 23, pants, 4.5);
  // loose cuff
  bone(ctx, { x: mid.x + (hipRoot.x - mid.x) * 0.16, y: mid.y + (hipRoot.y - mid.y) * 0.16 }, mid, 18, back ? c.pants : c.pantsShade, 0);

  // shin
  if (akane) {
    bone(ctx, mid, end, 12, skin, 3.8);
    bone(ctx, { x: mid.x + (end.x - mid.x) * 0.15, y: mid.y + (end.y - mid.y) * 0.15 }, { x: mid.x + (end.x - mid.x) * 0.8, y: mid.y + (end.y - mid.y) * 0.8 }, 12.5, c.pantsShade, 2);
  } else {
    bone(ctx, mid, end, 13, skin, 3.6);
  }

  // ankle wrap
  const ankle = { x: end.x + (mid.x - end.x) * 0.12, y: end.y + (mid.y - end.y) * 0.12 };
  bone(ctx, { x: ankle.x - 4, y: ankle.y - 4 }, ankle, 12, c.wrap, 2.5);
  ctx.strokeStyle = c.trim;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(ankle.x - 5, ankle.y - 3 + i * 2.2);
    ctx.lineTo(ankle.x + 5, ankle.y - 2 + i * 2.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // foot
  const footAngle = (angles[1] - 90) * R;
  ctx.save();
  ctx.translate(end.x, end.y + 4);
  ctx.rotate(footAngle);
  ctx.fillStyle = 'rgba(12, 8, 16, 0.95)';
  ellipse(ctx, 2.5, 0, 14, 7.5);
  ctx.fill();
  ctx.fillStyle = akane ? c.giDark : '#201820';
  ellipse(ctx, 2, 0, 12, 5.6);
  ctx.fill();
  ctx.fillStyle = akane ? c.accent : c.trim;
  ctx.globalAlpha = 0.7;
  ellipse(ctx, 6, -0.5, 4, 2.2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// torso, head
// ---------------------------------------------------------------------------
function paintTorso(ctx, char, hip, lean, time, state, crouching) {
  const c = char.colors;
  const akane = char.id === 'akane';
  ctx.save();
  ctx.translate(hip.x, hip.y);
  ctx.rotate(lean * R);

  // gi skirt / flaps
  const sway = Math.sin(time * 3.4) * 2.2;
  const flap = crouching ? 5 : 1;
  ctx.fillStyle = akane ? c.giDark : c.giShade;
  ctx.strokeStyle = 'rgba(12, 8, 16, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.quadraticCurveTo(-26 - sway, 12 + flap, -20 - sway, 26 + flap);
  ctx.lineTo(-7, 18);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(16, -2);
  ctx.quadraticCurveTo(26 + sway, 12 + flap, 20 + sway, 27 + flap);
  ctx.lineTo(7, 18);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!akane) {
    ctx.strokeStyle = c.giShade;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-15, 4);
    ctx.quadraticCurveTo(-22, 13, -18, 22);
    ctx.stroke();
  }

  // main torso shape
  const g = ctx.createLinearGradient(-25, -58, 24, 4);
  if (akane) {
    g.addColorStop(0, '#333a60');
    g.addColorStop(0.45, c.gi);
    g.addColorStop(1, c.giDark);
  } else {
    g.addColorStop(0, '#fffbf1');
    g.addColorStop(0.5, c.gi);
    g.addColorStop(1, c.giShade);
  }
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(12, 8, 16, 0.95)';
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(-17, 6);
  ctx.bezierCurveTo(-21, -14, -25, -36, -25, -51);
  ctx.quadraticCurveTo(-24, -60, -15, -61);
  ctx.lineTo(14, -61);
  ctx.quadraticCurveTo(24, -60, 25, -51);
  ctx.bezierCurveTo(25, -36, 21, -14, 17, 6);
  ctx.quadraticCurveTo(0, 12, -17, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // chest opening / collar
  if (akane) {
    ctx.fillStyle = c.skinShade;
    ctx.beginPath();
    ctx.moveTo(-9, -60);
    ctx.lineTo(0, -32);
    ctx.lineTo(9, -60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -59);
    ctx.lineTo(0, -31);
    ctx.lineTo(10, -59);
    ctx.stroke();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-24, -49);
    ctx.quadraticCurveTo(-6, -36, 0, -31);
    ctx.quadraticCurveTo(7, -37, 25, -49);
    ctx.stroke();
  } else {
    // crossed lapels
    ctx.fillStyle = '#2a1b1c';
    ctx.beginPath();
    ctx.moveTo(-9, -61);
    ctx.lineTo(0, -34);
    ctx.lineTo(9, -61);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = c.giShade;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-11, -60);
    ctx.lineTo(2, -28);
    ctx.lineTo(16, -55);
    ctx.lineTo(19, -47);
    ctx.lineTo(2, -21);
    ctx.lineTo(-16, -54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-17, -54);
    ctx.quadraticCurveTo(-7, -31, 1, -22);
    ctx.stroke();
  }

  // fabric folds
  ctx.strokeStyle = akane ? 'rgba(0,0,0,0.3)' : 'rgba(120,100,80,0.35)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-16, -46);
  ctx.quadraticCurveTo(-10, -28, -11, -12);
  ctx.moveTo(15, -42);
  ctx.quadraticCurveTo(12, -24, 13, -10);
  ctx.stroke();

  // belt / sash
  const belt = akane ? c.accent : c.accent;
  ctx.fillStyle = belt;
  ctx.strokeStyle = 'rgba(12, 8, 16, 0.85)';
  ctx.lineWidth = 2.4;
  roundRectLocal(ctx, -18, -10, 36, 8, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = akane ? '#ff8db8' : '#ef6a64';
  ctx.globalAlpha = 0.55;
  ctx.fillRect(-17, -9.5, 34, 1.6);
  ctx.globalAlpha = 1;

  // knot and trailing ribbons
  ctx.fillStyle = belt;
  ctx.strokeStyle = 'rgba(12, 8, 16, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(4, -8);
  ctx.lineTo(6, -2);
  ctx.lineTo(-3, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const wave = Math.sin(time * 4.2) * 3.2;
  ctx.fillStyle = belt;
  ctx.strokeStyle = 'rgba(12, 8, 16, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.quadraticCurveTo(-27, -2 + wave, -38, 8 + wave);
  ctx.lineTo(-37, 14 + wave);
  ctx.quadraticCurveTo(-23, 4 + wave, -8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.quadraticCurveTo(-20, -16 + wave, -34, -12 + wave);
  ctx.lineTo(-36, -5 + wave);
  ctx.quadraticCurveTo(-21, -8 + wave, -7, -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // trim on the leading edge
  ctx.strokeStyle = akane ? c.accent : c.trim;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(-24, -47);
  ctx.quadraticCurveTo(-19, -18, -15, 4);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function roundRectLocal(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function paintHead(ctx, char, head, lean, headTilt, time, state) {
  const c = char.colors;
  const akane = char.id === 'akane';
  const ang = (headTilt * 0.6 + lean * 0.18) * R;

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(ang);

  // hair mass behind head / ponytail
  ctx.fillStyle = c.hair;
  ctx.strokeStyle = 'rgba(10, 7, 14, 0.9)';
  ctx.lineWidth = 2.4;
  if (akane) {
    const sw = Math.sin(time * 3.2) * 4;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.bezierCurveTo(-35, -20, -62, 4 + sw, -49, 38 + sw);
    ctx.bezierCurveTo(-44, 52 + sw, -30, 58 + sw, -22, 46 + sw);
    ctx.bezierCurveTo(-32, 30 + sw, -23, 10 + sw, -5, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ponytail highlight
    ctx.strokeStyle = c.hairLight;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-28, -5);
    ctx.quadraticCurveTo(-47, 16 + sw, -39, 43 + sw);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // ribbon tails
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = 'rgba(10, 7, 14, 0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-13, -8);
    ctx.quadraticCurveTo(-34, -4 + sw * 0.5, -42, 9 + sw);
    ctx.lineTo(-36, 13 + sw);
    ctx.quadraticCurveTo(-25, 2 + sw * 0.4, -12, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.quadraticCurveTo(-31, -15 + sw * 0.5, -43, -6 + sw);
    ctx.lineTo(-38, 0 + sw);
    ctx.quadraticCurveTo(-25, -8 + sw * 0.4, -11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ellipse(ctx, -2, -2, 18, 19);
    ctx.fill();
    ctx.stroke();
    // spiky back hair
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.lineTo(-27, -11);
    ctx.lineTo(-22, 2);
    ctx.lineTo(-28, 9);
    ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // headband tails
    const wave = Math.sin(time * 4.4) * 3.8;
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = 'rgba(10, 7, 14, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-13, -7);
    ctx.quadraticCurveTo(-32, -4 + wave, -46, 5 + wave);
    ctx.lineTo(-44, 9 + wave);
    ctx.quadraticCurveTo(-28, 1 + wave, -13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-13, -9);
    ctx.quadraticCurveTo(-30, -15 + wave, -43, -12 + wave);
    ctx.lineTo(-45, -7 + wave);
    ctx.quadraticCurveTo(-28, -8 + wave, -13, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // neck
  ctx.strokeStyle = 'rgba(10, 7, 14, 0.9)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-1, 12);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.strokeStyle = c.skinShade;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-1, 12);
  ctx.lineTo(0, 21);
  ctx.stroke();

  // face
  const fg = ctx.createLinearGradient(-13, -14, 14, 16);
  fg.addColorStop(0, c.skinLight);
  fg.addColorStop(0.55, c.skin);
  fg.addColorStop(1, c.skinShade);
  ctx.fillStyle = fg;
  ctx.strokeStyle = 'rgba(10, 7, 14, 0.95)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-13, -10);
  ctx.quadraticCurveTo(-15, 4, -9, 12);
  ctx.quadraticCurveTo(-2, 19, 8, 15);
  ctx.quadraticCurveTo(15, 10, 15, 1);
  ctx.quadraticCurveTo(15, -11, 8, -15);
  ctx.quadraticCurveTo(-5, -19, -13, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ear
  ctx.fillStyle = c.skinShade;
  ctx.beginPath();
  ctx.ellipse(-11, 1, 3.4, 5, -0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // hair front / fringe
  ctx.fillStyle = c.hair;
  ctx.strokeStyle = 'rgba(10, 7, 14, 0.9)';
  ctx.lineWidth = 2;
  if (akane) {
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(-10, -21, 4, -19);
    ctx.quadraticCurveTo(16, -17, 17, -8);
    ctx.quadraticCurveTo(6, -13, -3, -10);
    ctx.quadraticCurveTo(-8, -8, -12, 2);
    ctx.lineTo(-15, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.hairLight;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.quadraticCurveTo(2, -12, 10, -14);
    ctx.stroke();
    // ribbon knot
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = 'rgba(10, 7, 14, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-13, -9, 4.5, 3.2, 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-14, -9);
    ctx.quadraticCurveTo(-9, -22, 4, -19);
    ctx.quadraticCurveTo(15, -18, 18, -9);
    ctx.quadraticCurveTo(10, -14, 3, -11);
    ctx.lineTo(-1, -16);
    ctx.lineTo(-4, -9);
    ctx.lineTo(-8, -13);
    ctx.lineTo(-11, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // headband
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.quadraticCurveTo(0, -10, 13, -6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(10, 7, 14, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, -8.6);
    ctx.quadraticCurveTo(0, -11.7, 13, -7.6);
    ctx.stroke();
  }

  // brows, eyes, mouth
  ctx.strokeStyle = c.eye;
  ctx.fillStyle = c.eye;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-4, -3.5);
  ctx.quadraticCurveTo(0, -5.5, 4, -3.5);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(5, -3);
  ctx.quadraticCurveTo(10, -5.5, 14, -2);
  ctx.stroke();

  // eye
  ctx.fillStyle = '#fbf5ec';
  ctx.beginPath();
  ctx.ellipse(8.5, 0.8, 3.6, 2.4, -0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c.eye;
  ctx.beginPath();
  ctx.arc(8.2, 0.7, 1.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(7.7, 0.1, 0.55, 0, TAU);
  ctx.fill();

  // far eye hint
  ctx.fillStyle = c.eye;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(0.5, 0.6, 1.9, 1.1, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // nose + mouth
  ctx.strokeStyle = c.skinShade;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(13.5, 3);
  ctx.lineTo(11.5, 5.2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70, 30, 30, 0.85)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(5.5, 10.5);
  ctx.quadraticCurveTo(8.5, 11.5, 11, 10);
  ctx.stroke();

  // cheek / jaw shading
  ctx.fillStyle = 'rgba(120, 50, 40, 0.12)';
  ctx.beginPath();
  ctx.moveTo(9, 6);
  ctx.quadraticCurveTo(4, 13, -2, 12);
  ctx.quadraticCurveTo(5, 8, 9, 6);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// full character paint (local space, feet at 0,0)
// ---------------------------------------------------------------------------
export function paintFighter(ctx, char, pose, opts = {}) {
  const time = opts.time ?? 0;
  const crouching = Boolean(opts.crouching);
  const state = opts.state || 'idle';

  const hip = { x: 0, y: -92 + pose.hipY };
  const leanRad = pose.lean * R;
  const neck = {
    x: hip.x + Math.sin(leanRad) * 56,
    y: hip.y - Math.cos(leanRad) * 56
  };
  const headAng = leanRad + pose.head * R;
  const head = {
    x: neck.x + Math.sin(headAng) * 29,
    y: neck.y - Math.cos(headAng) * 29
  };
  const shF = { x: neck.x + 3, y: neck.y + 5 };
  const shB = { x: neck.x - 5, y: neck.y + 6 };
  const hipF = { x: hip.x + 7, y: hip.y + 2 };
  const hipB = { x: hip.x - 7, y: hip.y + 2 };

  const legB = chain(hipB, pose.legB[0], 47, pose.legB[1], 46);
  const legF = chain(hipF, pose.legF[0], 47, pose.legF[1], 46);
  const armB = chain(shB, pose.armB[0], 42, pose.armB[1], 37);
  const armF = chain(shF, pose.armF[0], 42, pose.armF[1], 37);

  // aura bloom behind the body
  if (opts.aura) {
    const g = ctx.createRadialGradient(hip.x, hip.y - 40, 4, hip.x, hip.y - 40, 92);
    g.addColorStop(0, opts.aura);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = opts.auraAlpha ?? 0.22;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(hip.x, hip.y - 40, 60, 96, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  paintArm(ctx, char, shB, pose.armB, true, time, state);
  paintLeg(ctx, char, hipB, pose.legB, true, time);
  paintTorso(ctx, char, hip, pose.lean, time, state, crouching);
  paintLeg(ctx, char, hipF, pose.legF, false, time);
  paintHead(ctx, char, head, pose.lean, pose.head, time, state);
  paintArm(ctx, char, shF, pose.armF, false, time, state);
}

// ---------------------------------------------------------------------------
// world-space fighter draw
// ---------------------------------------------------------------------------
export function drawFighter(ctx, fighter, time, options = {}) {
  const char = CHARACTERS[fighter.charId];
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  if (fighter.state === 'knockdown' && fighter.grounded) {
    ctx.translate(0, -14);
    ctx.rotate(-1.18);
    ctx.translate(0, 14);
  }
  if (fighter.spinAngle) {
    ctx.translate(0, -92);
    ctx.rotate(fighter.spinAngle);
    ctx.translate(0, 92);
  }
  ctx.scale(fighter.facing, 1);

  if (fighter.flash > 0.12) {
    const f = 1 + fighter.flash * 1.4;
    ctx.filter = `brightness(${f.toFixed(2)}) saturate(${(1 - fighter.flash * 0.55).toFixed(2)})`;
  }

  paintFighter(ctx, char, fighter.pose, {
    time,
    state: fighter.state,
    crouching: fighter.crouching,
    aura: fighter.char.colors.aura,
    auraAlpha: 0.06 + (fighter.spirit / MAX_SPIRIT_SAFE) * 0.16
  });

  ctx.filter = 'none';
  ctx.restore();
}

const MAX_SPIRIT_SAFE = 100;

// snapshot afterimage
export function drawFighterSnapshot(ctx, snap, time) {
  const char = CHARACTERS[snap.charId];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, snap.life / snap.maxLife) * snap.alpha;
  ctx.translate(snap.x, snap.y);
  if (snap.state === 'knockdown' && snap.grounded) ctx.rotate(-1.18);
  if (snap.spinAngle) {
    ctx.translate(0, -92);
    ctx.rotate(snap.spinAngle);
    ctx.translate(0, 92);
  }
  ctx.scale(snap.facing, 1);
  ctx.filter = 'blur(0.4px)';
  paintFighter(ctx, char, snap.pose, {
    time,
    state: 'attack',
    crouching: snap.crouching,
    aura: snap.color,
    auraAlpha: 0.25
  });
  ctx.filter = 'none';
  ctx.restore();
}

// ---------------------------------------------------------------------------
// character portraits used by the selection cards
// ---------------------------------------------------------------------------
export function renderPortrait(canvas, charId) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const CW = 280;
  const CH = 330;
  if (canvas.width !== CW * dpr) {
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CW, CH);

  const char = CHARACTERS[charId];
  const c = char.colors;

  // atmosphere
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, charId === 'kaito' ? '#25101b' : '#0d1830');
  bg.addColorStop(0.55, '#0b0911');
  bg.addColorStop(1, '#07060b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  const halo = ctx.createRadialGradient(CW / 2, 150, 10, CW / 2, 150, 155);
  halo.addColorStop(0, charId === 'kaito' ? 'rgba(230, 80, 60, 0.38)' : 'rgba(80, 190, 255, 0.28)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, CW, CH);

  // giant kanji watermark
  ctx.save();
  ctx.font = `180px ${'"IPAGothic","WenQuanYi Zen Hei",serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = charId === 'kaito' ? 'rgba(214,60,74,0.13)' : 'rgba(100,216,255,0.1)';
  ctx.fillText(char.kanji, CW / 2, 158);
  ctx.restore();

  // rising sun / moon band
  ctx.save();
  ctx.globalAlpha = 0.28;
  const sun = ctx.createRadialGradient(CW / 2, 145, 0, CW / 2, 145, 88);
  sun.addColorStop(0, charId === 'kaito' ? '#f7b45c' : '#8fe5ff');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 40, CW, 220);
  ctx.restore();

  // ground shadow
  const sh = ctx.createRadialGradient(CW / 2, 306, 8, CW / 2, 306, 84);
  sh.addColorStop(0, 'rgba(0,0,0,0.7)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(CW / 2, 306, 82, 17, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(CW / 2 - 2, 306);
  ctx.scale(1.44, 1.44);
  paintFighter(ctx, char, POSES.idle, {
    time: 0.4,
    state: 'idle',
    aura: c.aura,
    auraAlpha: 0.12
  });
  ctx.restore();

  // petals
  for (let i = 0; i < 7; i++) {
    const x = (i * 47 + 30) % CW;
    const y = (i * 71 + 24) % 240;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(i + 0.4);
    ctx.globalAlpha = 0.25 + (i % 3) * 0.12;
    ctx.fillStyle = charId === 'kaito' ? '#ffb7a3' : '#b6eaff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.2, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // vignette
  const vig = ctx.createRadialGradient(CW / 2, CH / 2, 90, CW / 2, CH / 2, 220);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CW, CH);
}
