// ---------------------------------------------------------------------------
// Effects & atmosphere — shadows, petals, fireballs, sparks.
// ---------------------------------------------------------------------------

import { W, H, GROUND, WORLD_W, CHARACTERS } from './data.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function drawFighterShadow(ctx, fighter) {
  const height = Math.max(0, GROUND - fighter.y);
  const squash = clamp(1 - height / 520, 0.32, 1);
  const rx = (fighter.state === 'knockdown' ? 74 : 48) * squash;
  const ry = 12 * squash;
  const alpha = 0.38 * squash;
  const g = ctx.createRadialGradient(fighter.x, GROUND + 2, 1, fighter.x, GROUND + 2, rx * 1.3);
  g.addColorStop(0, `rgba(5, 3, 8, ${alpha})`);
  g.addColorStop(1, 'rgba(5, 3, 8, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(fighter.x, GROUND + 2, rx * 1.3, ry * 1.8, 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// ambient petals and embers
// ---------------------------------------------------------------------------
export function drawAmbient(ctx, game, layer) {
  const isFront = layer === 'front';
  for (const p of game.ambient) {
    const front = p.z >= 0.8;
    if (front !== isFront) continue;
    if (p.kind === 'ember') {
      const a = 0.25 + 0.35 * p.z;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 5 + p.z * 4);
      g.addColorStop(0, `rgba(255, 205, 120, ${a})`);
      g.addColorStop(0.4, `rgba(255, 125, 45, ${a * 0.7})`);
      g.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 + p.z * 5, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const s = 0.65 + p.z * 0.9;
      ctx.scale(s, s);
      ctx.globalAlpha = 0.45 + p.z * 0.32;
      ctx.fillStyle = p.z > 0.9 ? '#ffd0dd' : '#f5a9be';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.bezierCurveTo(5, -4, 5, 3, 0, 7);
      ctx.bezierCurveTo(-4, 4, -5, -3, 0, -6);
      ctx.fill();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = '#ff91ad';
      ctx.beginPath();
      ctx.ellipse(1.6, 0, 1.6, 3.2, 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// projectiles
// ---------------------------------------------------------------------------
export function drawProjectile(ctx, p, time) {
  const dir = Math.sign(p.vx) || 1;

  // trail
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = p.trail.length - 1; i >= 0; i--) {
    const t = 1 - i / p.trail.length;
    const pt = p.trail[i];
    const r = (p.super ? 54 : 16) * t * (0.7 + Math.sin(time * 30 + i) * 0.06);
    if (r <= 0.5) continue;
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
    g.addColorStop(0, hexA(p.color2, 0.22 * t));
    g.addColorStop(0.5, hexA(p.color, 0.14 * t));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  if (p.super) {
    drawSuperBeam(ctx, p, time);
    return;
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  const wobble = Math.sin(time * 28 + p.tick) * 0.08;
  ctx.rotate(wobble);

  // glow field
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 68);
  glow.addColorStop(0, hexA(p.color2, 0.55));
  glow.addColorStop(0.3, hexA(p.color, 0.35));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 68, 0, TAU);
  ctx.fill();

  if (p.charId === 'kaito') {
    // flame petals licking off the core
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + time * 7;
      const r = 18 + Math.sin(time * 20 + i * 1.7) * 8;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(r, 0);
      const fg = ctx.createLinearGradient(0, 0, -32, 0);
      fg.addColorStop(0, hexA('#fff3c4', 0.95));
      fg.addColorStop(0.4, hexA(p.color2, 0.85));
      fg.addColorStop(1, 'rgba(255, 60, 10, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.quadraticCurveTo(-14, -10, -30 - Math.sin(time * 18 + i) * 5, 0);
      ctx.quadraticCurveTo(-14, 10, 4, 0);
      ctx.fill();
      ctx.restore();
    }
  } else {
    // icy crystal shards
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU - time * 3;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(30 + Math.sin(time * 12 + i) * 4, 0);
      ctx.fillStyle = hexA(p.color2, 0.8);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-4, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // core
  const core = ctx.createRadialGradient(-4, -5, 1, 0, 0, 25);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.3, p.color2);
  core.addColorStop(0.75, p.color);
  core.addColorStop(1, hexA(p.color, 0.1));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 23 + Math.sin(time * 26) * 1.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA('#ffffff', 0.65);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 27, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // little orbiting sparks
  for (let i = 0; i < 4; i++) {
    const a = time * 6 + i * TAU / 4;
    const r = 30 + Math.sin(time * 10 + i) * 6;
    ctx.fillStyle = hexA(p.color2, 0.8);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSuperBeam(ctx, p, time) {
  const dir = Math.sign(p.vx) || 1;
  const char = CHARACTERS[p.charId];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(dir, 1);

  // massive trailing wake
  const wake = ctx.createLinearGradient(-320, 0, 90, 0);
  wake.addColorStop(0, 'rgba(0,0,0,0)');
  wake.addColorStop(0.4, hexA(p.color, 0.12));
  wake.addColorStop(0.75, hexA(p.color2, 0.3));
  wake.addColorStop(1, hexA('#ffffff', 0.55));
  ctx.fillStyle = wake;
  ctx.beginPath();
  ctx.moveTo(-330, 0);
  ctx.quadraticCurveTo(-80, -8, 60, -58);
  ctx.quadraticCurveTo(96, 0, 60, 58);
  ctx.quadraticCurveTo(-80, 8, -330, 0);
  ctx.fill();

  // outer body
  const outer = ctx.createRadialGradient(0, 0, 4, 0, 0, 120);
  outer.addColorStop(0, hexA(p.color2, 0.95));
  outer.addColorStop(0.4, hexA(p.color, 0.7));
  outer.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.ellipse(0, 0, 118, 78 + Math.sin(time * 12) * 4, 0, 0, TAU);
  ctx.fill();

  // streaming ribbons
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = hexA(k === 1 ? '#ffffff' : p.color2, 0.4 + k * 0.12);
    ctx.lineWidth = 4 - k;
    ctx.beginPath();
    for (let x = -190; x <= 70; x += 8) {
      const ph = x * 0.035 + time * 7 + k * 2.1;
      const y = Math.sin(ph) * (22 + k * 9);
      if (x === -190) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // core
  const core = ctx.createLinearGradient(-110, 0, 90, 0);
  core.addColorStop(0, hexA(p.color2, 0.1));
  core.addColorStop(0.55, hexA('#ffffff', 0.9));
  core.addColorStop(1, '#ffffff');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(8, 0, 88, 34 + Math.sin(time * 20) * 2, 0, 0, TAU);
  ctx.fill();

  // kanji seal
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 58px "IPAGothic","WenQuanYi Zen Hei",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.kanji, -8, 2);
  ctx.globalAlpha = 1;

  // orbit shards / embers
  for (let i = 0; i < 10; i++) {
    const a = time * 4 + i * TAU / 10;
    const rx = 70 + Math.sin(time * 8 + i) * 20;
    const ry = 42 + Math.cos(time * 9 + i) * 16;
    ctx.fillStyle = hexA(i % 2 ? p.color2 : '#ffffff', 0.6);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, 2.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // leading edge flare
  ctx.strokeStyle = hexA('#ffffff', 0.8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(70, 0, 66, -1.2, 1.2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// particles
// ---------------------------------------------------------------------------
export function drawFx(ctx, game) {
  for (const e of game.fx) {
    const life = e.life / e.maxLife;
    if (e.type === 'dust') {
      const r = e.size * (0.7 + (1 - life) * 1.8);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, `rgba(206, 180, 143, ${life * 0.3})`);
      g.addColorStop(1, 'rgba(180, 150, 110, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.fill();
      continue;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (e.type === 'spark') {
      const len = 2 + Math.hypot(e.vx || 0, e.vy || 0) * 1.8;
      ctx.strokeStyle = hexA(e.color, life);
      ctx.lineWidth = Math.max(0.6, e.size * life);
      ctx.lineCap = 'round';
      const mag = Math.hypot(e.vx || 0, e.vy || 0) || 1;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x - (e.vx / mag) * len, e.y - (e.vy / mag) * len);
      ctx.stroke();
      ctx.fillStyle = hexA('#ffffff', life * 0.9);
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(0.5, e.size * 0.55 * life), 0, TAU);
      ctx.fill();
    } else if (e.type === 'shard') {
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot || 0);
      ctx.fillStyle = hexA(e.color, life);
      ctx.beginPath();
      ctx.moveTo(-e.size, -e.size * 0.5);
      ctx.lineTo(e.size, 0);
      ctx.lineTo(-e.size * 0.2, e.size * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'flash') {
      const r = e.size * (1.6 - life * 0.6);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, `rgba(255,255,245,${life})`);
      g.addColorStop(0.3, hexA(e.color, life * 0.85));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.fill();
    } else if (e.type === 'ring') {
      const prog = 1 - life;
      const r = e.size + prog * e.size * 3.2;
      ctx.strokeStyle = hexA(e.color, life * 0.9);
      ctx.lineWidth = Math.max(1, 6 * life);
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = hexA('#ffffff', life * 0.5);
      ctx.lineWidth = Math.max(0.6, 2 * life);
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 0.82, 0, TAU);
      ctx.stroke();
    } else if (e.type === 'star') {
      const prog = 1 - life;
      const r = e.size * (0.7 + prog * 1.5);
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot || 0);
      ctx.fillStyle = hexA(e.color, life * 0.8);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        const rr = i % 2 === 0 ? r : r * 0.24;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'auraRing') {
      const prog = 1 - life;
      ctx.strokeStyle = hexA(e.color, life * 0.75);
      ctx.lineWidth = 3 * life + 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 30 + prog * 150, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = hexA('#ffffff', life * 0.4);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 18 + prog * 110, 0, TAU);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function hexA(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  if (hex.startsWith('rgba')) return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}
