// ---------------------------------------------------------------------------
// Stage art — a sunset temple veranda above a sea of cloud.
// ---------------------------------------------------------------------------

import { W, H, GROUND, WORLD_W, CHARACTERS, STAGE } from './data.js';

const TAU = Math.PI * 2;
const R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softEllipse(ctx, x, y, rx, ry, color, alpha = 1, rot = 0) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// parallax clouds / mountains / town
// ---------------------------------------------------------------------------
const CLOUDS = (() => {
  const rng = seeded(77);
  return Array.from({ length: 9 }, (_, i) => ({
    x: -180 + rng() * (W + 360),
    y: 90 + rng() * 260,
    rx: 90 + rng() * 210,
    ry: 12 + rng() * 30,
    a: 0.05 + rng() * 0.1,
    f: 0.04 + rng() * 0.08
  }));
})();

const BIRDS = (() => {
  const rng = seeded(19);
  return Array.from({ length: 8 }, () => ({
    x: 120 + rng() * 900,
    y: 120 + rng() * 140,
    s: 3 + rng() * 4,
    f: 0.1 + rng() * 0.1,
    p: rng() * TAU
  }));
})();

const distantTown = (() => {
  const rng = seeded(211);
  return Array.from({ length: 16 }, (_, i) => ({
    x: 60 + i * 78 + rng() * 28,
    w: 28 + rng() * 38,
    h: 18 + rng() * 36,
    roof: rng() > 0.55
  }));
})();

export function drawBackground(ctx, game) {
  const cam = game.cam.x;
  const t = game.time;

  // ----------------------------- sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0d0a1b');
  sky.addColorStop(0.22, '#24122e');
  sky.addColorStop(0.42, '#55243e');
  sky.addColorStop(0.58, '#a64549');
  sky.addColorStop(0.69, '#e88155');
  sky.addColorStop(0.755, '#f8b877');
  sky.addColorStop(0.8, '#7d3f42');
  sky.addColorStop(1, '#1a0e18');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // sun with soft halo
  const sunX = 936 - (cam - 800) * 0.1;
  const sunY = 246;
  const halo = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 300);
  halo.addColorStop(0, 'rgba(255, 224, 160, 0.48)');
  halo.addColorStop(0.35, 'rgba(255, 160, 95, 0.18)');
  halo.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 320, sunY - 320, 640, 640);

  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, 92, 0, TAU);
  ctx.clip();
  const disc = ctx.createLinearGradient(0, sunY - 92, 0, sunY + 92);
  disc.addColorStop(0, '#fff9dc');
  disc.addColorStop(0.45, '#ffe0a6');
  disc.addColorStop(0.72, '#ffb96e');
  disc.addColorStop(1, '#ec7f50');
  ctx.fillStyle = disc;
  ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  ctx.fillStyle = 'rgba(92, 42, 55, 0.26)';
  [0.18, 0.46, 0.64].forEach((p, i) => {
    ctx.fillRect(sunX - 110, sunY - 90 + p * 180, 220, 7 + i * 3);
  });
  ctx.restore();

  // cloud bands
  for (const c of CLOUDS) {
    const x = ((c.x - (cam - 800) * c.f) % (W + 500) + W + 500) % (W + 500) - 200;
    softEllipse(ctx, x, c.y, c.rx, c.ry, c.y < 280 ? '#f7b38d' : '#6b3553', c.a, 0);
  }

  // birds
  ctx.strokeStyle = 'rgba(38, 18, 34, 0.55)';
  ctx.lineWidth = 1.4;
  for (const b of BIRDS) {
    const x = ((b.x - (cam - 800) * b.f + t * 5) % (W + 200) + W + 200) % (W + 200) - 100;
    const y = b.y + Math.sin(t * 0.8 + b.p) * 4;
    ctx.beginPath();
    ctx.moveTo(x - b.s, y);
    ctx.quadraticCurveTo(x - b.s * 0.4, y - b.s * 0.7, x, y - b.s * 0.15);
    ctx.quadraticCurveTo(x + b.s * 0.4, y - b.s * 0.7, x + b.s, y);
    ctx.stroke();
  }

  // ----------------------------- far mountains
  drawRidge(ctx, cam, 0.1, 476, 46, '#6b3a52', 0.55, 31);
  drawFuji(ctx, cam);
  drawRidge(ctx, cam, 0.18, 502, 36, '#43243d', 0.8, 73);
  drawRidge(ctx, cam, 0.25, 528, 26, '#2a1731', 0.95, 127);

  // fog at the base of the mountains
  const fog = ctx.createLinearGradient(0, 455, 0, 560);
  fog.addColorStop(0, 'rgba(240, 138, 95, 0.0)');
  fog.addColorStop(0.45, 'rgba(240, 138, 105, 0.16)');
  fog.addColorStop(1, 'rgba(35, 18, 36, 0.7)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 455, W, 120);

  // ----------------------------- distant town + pagoda
  drawDistantTown(ctx, cam);
  drawPagoda(ctx, 196 - (cam - 800) * 0.24, 534);
  drawTorii(ctx, 1166 - (cam - 800) * 0.24, 526);

  // warm horizon glow under the town
  const under = ctx.createLinearGradient(0, 500, 0, 610);
  under.addColorStop(0, 'rgba(255, 161, 104, 0.12)');
  under.addColorStop(1, 'rgba(13, 7, 17, 0)');
  ctx.fillStyle = under;
  ctx.fillRect(0, 500, W, 110);
}

function drawRidge(ctx, cam, factor, base, amp, color, alpha, seed) {
  const shift = (cam - 800) * factor;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-200, H);
  for (let x = -200; x <= W + 200; x += 18) {
    const wx = x + shift;
    const y = base - amp * (0.45 + 0.35 * Math.sin(wx * 0.0041 + seed) + 0.2 * Math.sin(wx * 0.011 + seed * 2.4));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 200, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFuji(ctx, cam) {
  const cx = 1010 - (cam - 800) * 0.14;
  const baseY = 474;
  const apexY = 304;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 280, baseY);
  ctx.quadraticCurveTo(cx - 130, 450, cx - 62, apexY + 20);
  ctx.quadraticCurveTo(cx - 26, apexY - 8, cx, apexY);
  ctx.quadraticCurveTo(cx + 28, apexY - 8, cx + 64, apexY + 20);
  ctx.quadraticCurveTo(cx + 140, 448, cx + 300, baseY);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, apexY, 0, baseY);
  g.addColorStop(0, '#5d3550');
  g.addColorStop(0.45, '#47273e');
  g.addColorStop(1, '#2e1934');
  ctx.fillStyle = g;
  ctx.fill();

  // snow cap
  ctx.beginPath();
  ctx.moveTo(cx - 64, apexY + 22);
  ctx.quadraticCurveTo(cx - 24, apexY - 6, cx, apexY);
  ctx.quadraticCurveTo(cx + 28, apexY - 6, cx + 68, apexY + 22);
  ctx.lineTo(cx + 48, apexY + 30);
  ctx.lineTo(cx + 33, apexY + 20);
  ctx.lineTo(cx + 18, apexY + 42);
  ctx.lineTo(cx + 4, apexY + 25);
  ctx.lineTo(cx - 12, apexY + 46);
  ctx.lineTo(cx - 27, apexY + 26);
  ctx.lineTo(cx - 44, apexY + 36);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 226, 210, 0.58)';
  ctx.fill();

  // rim light
  ctx.strokeStyle = 'rgba(255, 170, 120, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 280, baseY);
  ctx.quadraticCurveTo(cx - 130, 450, cx - 62, apexY + 20);
  ctx.quadraticCurveTo(cx - 26, apexY - 8, cx, apexY);
  ctx.stroke();
  ctx.restore();
}

function drawDistantTown(ctx, cam) {
  const shift = (cam - 800) * 0.24;
  ctx.save();
  ctx.globalAlpha = 0.92;
  for (const h of distantTown) {
    const x = h.x - shift;
    if (x < -80 || x > W + 80) continue;
    ctx.fillStyle = '#1b1025';
    ctx.fillRect(x, 530 - h.h, h.w, h.h + 40);
    if (h.roof) {
      ctx.beginPath();
      ctx.moveTo(x - 7, 530 - h.h);
      ctx.lineTo(x + h.w / 2, 530 - h.h - 12);
      ctx.lineTo(x + h.w + 7, 530 - h.h);
      ctx.closePath();
      ctx.fill();
    }
    // tiny warm windows
    ctx.fillStyle = 'rgba(255, 170, 92, 0.5)';
    for (let i = 0; i < 2; i++) {
      if ((h.w * i + h.h) % 3 > 1.2) ctx.fillRect(x + 6 + i * 13, 530 - h.h + 10, 4, 6);
    }
  }
  ctx.restore();
}

function drawPagoda(ctx, x, baseY) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.fillStyle = '#1a0f24';
  ctx.strokeStyle = 'rgba(255, 152, 100, 0.11)';
  ctx.lineWidth = 1.5;
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const w = 92 - i * 15;
    const y = -i * 48;
    // body
    ctx.fillRect(-w * 0.34, y - 34, w * 0.68, 34);
    // eaves
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 12, y - 34);
    ctx.quadraticCurveTo(-w / 2, y - 44, -w / 2 + 6, y - 45);
    ctx.lineTo(w / 2 - 6, y - 45);
    ctx.quadraticCurveTo(w / 2, y - 44, w / 2 + 12, y - 34);
    ctx.quadraticCurveTo(w / 4, y - 28, 0, y - 27);
    ctx.quadraticCurveTo(-w / 4, y - 28, -w / 2 - 12, y - 34);
    ctx.closePath();
    ctx.fill();
    // tiny window light
    ctx.fillStyle = 'rgba(255, 173, 95, 0.42)';
    ctx.fillRect(-3, y - 20, 6, 8);
    ctx.fillStyle = '#1a0f24';
  }
  // spire
  ctx.fillRect(-2, -tiers * 48 - 22, 4, 42);
  ctx.beginPath();
  ctx.arc(0, -tiers * 48 - 25, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawTorii(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1c0f24';
  ctx.strokeStyle = 'rgba(255, 160, 110, 0.13)';
  ctx.lineWidth = 1;
  // posts
  ctx.fillRect(-62, -150, 11, 152);
  ctx.fillRect(52, -150, 11, 152);
  // crossbars
  ctx.beginPath();
  ctx.moveTo(-98, -158);
  ctx.quadraticCurveTo(0, -176, 98, -158);
  ctx.lineTo(94, -146);
  ctx.quadraticCurveTo(0, -162, -94, -146);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-78, -124, 156, 9);
  ctx.fillRect(-4, -142, 8, 20);
  // hanging lantern
  const sway = Math.sin(performance.now() * 0.0012) * 2;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(255, 179, 94, 0.35)';
  ctx.beginPath();
  ctx.arc(sway, -112, 14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffbd6d';
  roundRect(ctx, -7 + sway, -122, 14, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#1c0f24';
  ctx.fillRect(-5 + sway, -126, 10, 4);
  ctx.fillRect(-5 + sway, -106, 10, 3);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
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

// ---------------------------------------------------------------------------
// cherry trees (precomputed clusters)
// ---------------------------------------------------------------------------
const TREE = (() => {
  const rng = seeded(941);
  const blossoms = [];
  for (let i = 0; i < 78; i++) {
    const a = rng() * TAU;
    const rad = rng();
    let x;
    let y;
    if (rng() < 0.6) {
      x = 40 + rng() * 200;
      y = -230 - rng() * 150;
    } else {
      x = 10 + rng() * 90;
      y = -120 - rng() * 170;
    }
    blossoms.push({
      x, y, r: 8 + rng() * 16, tone: rng(), a: 0.35 + rng() * 0.5,
      phase: rng() * TAU
    });
  }
  return { blossoms };
})();

function drawCherryTree(ctx, game, x, mirror, time) {
  ctx.save();
  ctx.translate(x, GROUND + 14);
  ctx.scale(mirror, 1);

  // trunk
  const trunkGrad = ctx.createLinearGradient(0, 0, 90, -280);
  trunkGrad.addColorStop(0, '#1a0e16');
  trunkGrad.addColorStop(0.5, '#2e1a22');
  trunkGrad.addColorStop(1, '#3a2230');
  ctx.strokeStyle = 'rgba(8, 5, 10, 0.9)';
  ctx.lineWidth = 37;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(8, -60, 10, -120, 38, -180);
  ctx.bezierCurveTo(58, -226, 92, -250, 120, -294);
  ctx.stroke();
  ctx.strokeStyle = trunkGrad;
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(8, -60, 10, -120, 38, -180);
  ctx.bezierCurveTo(58, -226, 92, -250, 120, -294);
  ctx.stroke();

  // main branches
  const branches = [
    [[26, -152], [88, -190], [150, -214], 9],
    [[44, -190], [10, -236], [-28, -266], 7],
    [[72, -230], [130, -248], [190, -240], 8],
    [[96, -258], [80, -320], [52, -360], 6],
    [[118, -292], [168, -320], [216, -330], 5],
    [[60, -218], [58, -280], [96, -318], 5]
  ];
  for (const [a, b, c, w] of branches) {
    ctx.strokeStyle = 'rgba(8, 5, 10, 0.9)';
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
    ctx.stroke();
    ctx.strokeStyle = '#291821';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
    ctx.stroke();
  }

  // blossoms
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of TREE.blossoms) {
    const swayX = Math.sin(time * 0.7 + b.phase) * 2.2;
    const swayY = Math.cos(time * 0.55 + b.phase) * 1.4;
    const bx = b.x + swayX;
    const by = b.y + swayY;
    const alpha = b.a * 0.26;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.r * 1.6);
    g.addColorStop(0, `rgba(255, 190, 210, ${alpha})`);
    g.addColorStop(1, 'rgba(255, 120, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, b.r * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  for (const b of TREE.blossoms) {
    const swayX = Math.sin(time * 0.7 + b.phase) * 2.2;
    const swayY = Math.cos(time * 0.55 + b.phase) * 1.4;
    const bx = b.x + swayX;
    const by = b.y + swayY;
    const tone = b.tone;
    const col = tone < 0.35 ? '#ffd2dc' : tone < 0.7 ? '#f6a9bd' : '#e98ba8';
    ctx.fillStyle = col;
    ctx.globalAlpha = b.a;
    ctx.beginPath();
    ctx.ellipse(bx, by, b.r * 0.72, b.r * 0.5, b.phase, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = b.a * 0.7;
    ctx.beginPath();
    ctx.ellipse(bx + b.r * 0.28, by - b.r * 0.22, b.r * 0.32, b.r * 0.22, b.phase + 1, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // few glowing lanterns inside tree
  const lanterns = [[150, -210, 0.8], [212, -232, 0.55]];
  for (const [lx, ly, a] of lanterns) {
    const sway = Math.sin(time * 1.3 + lx) * 3;
    const g = ctx.createRadialGradient(lx + sway, ly + 16, 2, lx + sway, ly + 16, 36);
    g.addColorStop(0, `rgba(255, 191, 110, ${0.35 * a})`);
    g.addColorStop(1, 'rgba(255, 150, 70, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx + sway, ly + 16, 36, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f7b567';
    ctx.globalAlpha = 0.85;
    roundRect(ctx, lx - 5 + sway, ly + 10, 10, 13, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// veranda, railing, lanterns
// ---------------------------------------------------------------------------
export function drawStage(ctx, game) {
  const t = game.time;

  // trees behind railing
  drawCherryTree(ctx, game, 96, 1, t);
  drawCherryTree(ctx, game, WORLD_W - 96, -1, t);

  drawRailing(ctx, t);
  drawFloor(ctx, t);
  drawLanternStrings(ctx, t);
  drawStoneLantern(ctx, 338, GROUND + 2, 1, t);
  drawStoneLantern(ctx, WORLD_W - 338, GROUND + 2, -1, t);
}

function drawRailing(ctx, t) {
  const y = 520;
  // posts
  for (let x = 0; x <= WORLD_W; x += 158) {
    const g = ctx.createLinearGradient(x, y, x + 14, GROUND);
    g.addColorStop(0, '#5e3a2c');
    g.addColorStop(0.5, '#3e261f');
    g.addColorStop(1, '#251318');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 14, GROUND - y + 4);
    ctx.fillStyle = 'rgba(216,176,106,0.3)';
    ctx.fillRect(x, y, 14, 2.5);
    ctx.fillStyle = 'rgba(10,6,12,0.5)';
    ctx.fillRect(x + 11, y + 4, 2, GROUND - y);
  }
  // top and middle rails
  const rail = ctx.createLinearGradient(0, y - 4, 0, y + 14);
  rail.addColorStop(0, '#7a4c34');
  rail.addColorStop(0.5, '#4a2c23');
  rail.addColorStop(1, '#26141a');
  ctx.fillStyle = rail;
  ctx.fillRect(0, y - 4, WORLD_W, 13);
  ctx.fillStyle = 'rgba(255, 205, 130, 0.22)';
  ctx.fillRect(0, y - 4, WORLD_W, 2);
  ctx.fillStyle = 'rgba(10, 6, 12, 0.65)';
  ctx.fillRect(0, y + 9, WORLD_W, 2);
  ctx.fillStyle = '#3c241e';
  ctx.fillRect(0, y + 34, WORLD_W, 7);

  // small hanging lanterns on the rail
  for (let x = 82; x < WORLD_W; x += 236) {
    const sway = Math.sin(t * 1.2 + x * 0.01) * 2;
    glow(ctx, x + sway, y + 52, 34, 'rgba(255, 170, 90, 0.22)');
    ctx.fillStyle = '#f2a95f';
    ctx.strokeStyle = 'rgba(60,25,22,0.7)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - 6 + sway, y + 43, 12, 17, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26141a';
    ctx.fillRect(x - 4 + sway, y + 40, 8, 3);
    ctx.fillRect(x - 4 + sway, y + 60, 8, 2);
    ctx.strokeStyle = 'rgba(40, 22, 22, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + sway, y + 29);
    ctx.lineTo(x + sway, y + 40);
    ctx.stroke();
  }
}

function drawFloor(ctx, t) {
  const g = ctx.createLinearGradient(0, GROUND - 6, 0, 780);
  g.addColorStop(0, '#5d3829');
  g.addColorStop(0.18, '#43271f');
  g.addColorStop(0.65, '#26151a');
  g.addColorStop(1, '#120a12');
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND - 4, WORLD_W, 220);

  // perspective plank lines
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#0d070e';
  ctx.lineWidth = 1.4;
  for (let i = -10; i <= 10; i++) {
    const xTop = 800 + i * 92;
    const xBot = 800 + i * 210;
    ctx.beginPath();
    ctx.moveTo(xTop, GROUND);
    ctx.lineTo(xBot, 820);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#ffc98a';
  for (let i = -9; i <= 9; i += 2) {
    ctx.beginPath();
    ctx.moveTo(800 + i * 94 + 12, GROUND + 3);
    ctx.lineTo(800 + i * 214 + 16, 820);
    ctx.stroke();
  }
  ctx.restore();

  // horizontal seams
  ctx.strokeStyle = 'rgba(8, 5, 10, 0.55)';
  ctx.lineWidth = 2;
  [GROUND + 26, GROUND + 62, GROUND + 108].forEach((y, i) => {
    ctx.globalAlpha = 0.4 - i * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // front edge / gold rope line
  const edge = ctx.createLinearGradient(0, GROUND - 10, 0, GROUND + 8);
  edge.addColorStop(0, 'rgba(255, 218, 150, 0.7)');
  edge.addColorStop(1, 'rgba(120, 67, 40, 0.1)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, GROUND - 7, WORLD_W, 4);
  ctx.fillStyle = 'rgba(8, 5, 10, 0.55)';
  ctx.fillRect(0, GROUND - 2, WORLD_W, 2);

  // rope knots
  for (let x = 20; x < WORLD_W; x += 46) {
    ctx.fillStyle = 'rgba(230, 190, 120, 0.18)';
    ctx.beginPath();
    ctx.arc(x, GROUND - 5, 3.2, 0, TAU);
    ctx.fill();
  }

  // warm pools of light cast by the lanterns
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let x = 82; x < WORLD_W; x += 236) {
    const g2 = ctx.createRadialGradient(x, GROUND + 20, 4, x, GROUND + 20, 120);
    g2.addColorStop(0, 'rgba(255, 163, 80, 0.10)');
    g2.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.ellipse(x, GROUND + 20, 130, 46, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawLanternStrings(ctx, t) {
  const strings = [
    { x0: -120, x1: 1720, y: 268, sag: 52, start: 0 },
    { x0: 120, x1: 1480, y: 336, sag: 38, start: 1 }
  ];
  for (let s = 0; s < strings.length; s++) {
    const st = strings[s];
    ctx.strokeStyle = 'rgba(26, 14, 18, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = st.x0; x <= st.x1; x += 20) {
      const p = (x - st.x0) / (st.x1 - st.x0);
      const y = st.y + Math.sin(p * Math.PI) * st.sag;
      if (x === st.x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const gap = 184;
    for (let x = st.x0 + 80 + s * 40; x < st.x1; x += gap) {
      const p = (x - st.x0) / (st.x1 - st.x0);
      const y = st.y + Math.sin(p * Math.PI) * st.sag;
      const sway = Math.sin(t * 1.1 + x * 0.017) * 3;
      const ly = y + 22 + Math.cos(t * 0.9 + x) * 1.2;
      glow(ctx, x + sway, ly, 44, 'rgba(255, 170, 88, 0.24)');
      ctx.fillStyle = '#f6ad63';
      ctx.strokeStyle = 'rgba(74, 30, 22, 0.6)';
      ctx.lineWidth = 1.4;
      roundRect(ctx, x - 9 + sway, ly - 12, 18, 26, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#361b1a';
      ctx.fillRect(x - 7 + sway, ly - 15, 14, 4);
      ctx.fillRect(x - 7 + sway, ly + 13, 14, 3);
      ctx.strokeStyle = 'rgba(50, 24, 22, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + sway, y);
      ctx.lineTo(x + sway, ly - 15);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(74, 30, 22, 0.7)';
      ctx.beginPath();
      ctx.moveTo(x + sway, ly + 16);
      ctx.lineTo(x + sway, ly + 23);
      ctx.stroke();
    }
  }
}

function drawStoneLantern(ctx, x, y, dir, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const g = ctx.createLinearGradient(-24, -110, 24, 0);
  g.addColorStop(0, '#4c4650');
  g.addColorStop(0.5, '#2f2a35');
  g.addColorStop(1, '#19141e');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(8, 5, 10, 0.8)';
  ctx.lineWidth = 2;
  // base
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(19, -12); ctx.lineTo(-19, -12); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // stem
  ctx.fillRect(-7, -58, 14, 48);
  ctx.strokeRect(-7, -58, 14, 48);
  // light box
  roundRect(ctx, -18, -92, 36, 34, 4);
  ctx.fill(); ctx.stroke();
  // roof
  ctx.beginPath();
  ctx.moveTo(-27, -92); ctx.quadraticCurveTo(0, -108, 27, -92); ctx.lineTo(18, -86); ctx.lineTo(-18, -86); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // warm window
  glow(ctx, 0, -75, 38, 'rgba(255, 168, 84, 0.28)');
  ctx.fillStyle = '#f6b565';
  ctx.globalAlpha = 0.85;
  roundRect(ctx, -9, -84, 18, 18, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}
