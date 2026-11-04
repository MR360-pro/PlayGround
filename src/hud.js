// ---------------------------------------------------------------------------
// HUD, banners, and screen treatment
// ---------------------------------------------------------------------------

import { W, H, CHARACTERS, MAX_HEALTH, MAX_SPIRIT, STAGE } from './data.js';

const TAU = Math.PI * 2;
const R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FONT = '"Lato", "DejaVu Sans", system-ui, sans-serif';
const SERIF = '"DejaVu Serif", Georgia, serif';
const JP = '"IPAGothic", "WenQuanYi Zen Hei", "DejaVu Sans", serif';

const hudState = {
  key: '',
  trail: [MAX_HEALTH, MAX_HEALTH],
  ready: [0, 0],
  flash: [0, 0]
};

function hexA(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(alpha, 0, 1)})`;
}

function poly(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

function diamond(ctx, x, y, r, color, stroke) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.78, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.78, y);
  ctx.closePath();
  if (color) { ctx.fillStyle = color; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
}

// ---------------------------------------------------------------------------
// main HUD
// ---------------------------------------------------------------------------
export function drawHUD(ctx, game) {
  if (game.phase === 'attract') return;
  const [p1, p2] = game.fighters;
  if (!p1 || !p2) return;

  const key = `${game.mode}-${game.round}-${game.charIds.join('-')}`;
  if (hudState.key !== key) {
    hudState.key = key;
    hudState.trail = [p1.health, p2.health];
  }

  for (let i = 0; i < 2; i++) {
    const f = game.fighters[i];
    if (f.health > hudState.trail[i]) hudState.trail[i] = f.health;
    else hudState.trail[i] += (f.health - hudState.trail[i]) * 0.09;
    hudState.ready[i] += ((f.spirit >= MAX_SPIRIT ? 1 : 0) - hudState.ready[i]) * 0.12;
    hudState.flash[i] = f.flash;
  }

  // top ornamental haze
  const topShade = ctx.createLinearGradient(0, 0, 0, 120);
  topShade.addColorStop(0, 'rgba(4, 3, 8, 0.82)');
  topShade.addColorStop(0.7, 'rgba(4, 3, 8, 0.35)');
  topShade.addColorStop(1, 'rgba(4, 3, 8, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, W, 124);
  const botShade = ctx.createLinearGradient(0, H - 80, 0, H);
  botShade.addColorStop(0, 'rgba(4, 3, 8, 0)');
  botShade.addColorStop(1, 'rgba(4, 3, 8, 0.76)');
  ctx.fillStyle = botShade;
  ctx.fillRect(0, H - 80, W, 80);

  drawHealthSide(ctx, game, 0, p1, hudState.trail[0]);
  drawHealthSide(ctx, game, 1, p2, hudState.trail[1]);

  drawTimer(ctx, game);
  drawSpirit(ctx, game, 0, p1);
  drawSpirit(ctx, game, 1, p2);
  drawCombo(ctx, game);

  // small reminder arc around P1 portrait during the first seconds
  if (game.round === 1 && game.phase === 'fight' && game.timer > 52 * 60) {
    // intentionally quiet
  }
}

function drawHealthSide(ctx, game, side, fighter, trail) {
  const char = CHARACTERS[fighter.charId];
  const c = char.colors;
  const mirror = side === 1;
  const x = mirror ? W - 100 - 466 : 100;
  const y = 46;
  const w = 466;
  const h = 27;
  const ratio = clamp(fighter.health / MAX_HEALTH, 0, 1);
  const trailRatio = clamp(trail / MAX_HEALTH, 0, 1);

  ctx.save();
  if (mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }

  const bx = 100;
  const by = y;

  // shadow / glow
  ctx.save();
  ctx.shadowColor = hexA(c.accent, 0.5);
  ctx.shadowBlur = 18 + hudState.ready[side] * 15;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(bx, by, w, h);
  ctx.restore();

  // frame
  const framePts = [
    [bx, by + 7], [bx + 9, by], [bx + w - 5, by], [bx + w, by + 6],
    [bx + w, by + h - 6], [bx + w - 8, by + h], [bx + 5, by + h], [bx, by + h - 5]
  ];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(8, 6, 13, 0.9)';
  poly(ctx, framePts);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(216, 176, 106, 0.72)';
  ctx.lineWidth = 1.6;
  poly(ctx, framePts);
  ctx.stroke();
  ctx.strokeStyle = hexA(c.accent, 0.35);
  ctx.lineWidth = 1;
  poly(ctx, [[bx + 5, by + 4], [bx + w - 8, by + 4]]);
  ctx.stroke();

  // inner damage trail
  const innerX = bx + 4;
  const innerY = by + 4;
  const innerW = w - 8;
  const innerH = h - 8;
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 12, 20, 0.9)';
  ctx.fillRect(innerX, innerY, innerW, innerH);
  // trail
  ctx.fillStyle = 'rgba(255, 214, 132, 0.6)';
  ctx.fillRect(innerX, innerY, innerW * trailRatio, innerH);
  // health
  const hg = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
  hg.addColorStop(0, lighten(c.accent, 0.35));
  hg.addColorStop(0.42, c.accent);
  hg.addColorStop(1, darken(c.accent, 0.35));
  ctx.fillStyle = hg;
  ctx.fillRect(innerX, innerY, innerW * ratio, innerH);
  // top gloss
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.fillRect(innerX, innerY, innerW * ratio, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(innerX, innerY + innerH - 3, innerW * ratio, 3);
  // segment ticks
  ctx.strokeStyle = 'rgba(5, 3, 8, 0.45)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const sx = innerX + innerW * i / 4;
    ctx.beginPath();
    ctx.moveTo(sx, innerY);
    ctx.lineTo(sx - 4, innerY + innerH);
    ctx.stroke();
  }
  // hot edge
  if (ratio > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(innerX + innerW * ratio - 2, innerY, 2, innerH);
  }
  ctx.restore();

  // ready glow
  if (hudState.ready[side] > 0.02) {
    ctx.save();
    ctx.globalAlpha = hudState.ready[side] * 0.5;
    ctx.strokeStyle = c.accent2;
    ctx.lineWidth = 2;
    ctx.shadowColor = c.accent2;
    ctx.shadowBlur = 20;
    poly(ctx, framePts);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // portrait medallion (not mirrored)
  const px = mirror ? W - 58 : 58;
  drawPortrait(ctx, px, 58, fighter, mirror);

  // names / tags
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = mirror ? 'right' : 'left';
  const nameX = mirror ? W - 100 : 100;
  ctx.font = `900 17px ${FONT}`;
  ctx.fillStyle = '#f5ead2';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText(spaced(char.name), nameX, 28);
  ctx.font = `700 8px ${FONT}`;
  ctx.fillStyle = hexA(c.accent2, 0.85);
  ctx.shadowBlur = 0;
  const tag = game.mode === 'local'
    ? (side === 0 ? 'PLAYER 1' : 'PLAYER 2')
    : (side === 0 ? 'PLAYER' : 'RIVAL');
  ctx.fillText(tag, nameX, 12);
  ctx.restore();

  // round pips
  for (let i = 0; i < 2; i++) {
    const got = game.wins[side] > i;
    const dx = mirror ? W - 112 - i * 20 : 112 + i * 20;
    diamond(ctx, dx, 90, 6.5, got ? c.accent2 : 'rgba(10,7,14,0.7)', got ? hexA('#fff3d0', 0.9) : 'rgba(216,176,106,0.55)');
    if (got) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = c.accent2;
      ctx.shadowBlur = 10;
      diamond(ctx, dx, 90, 6.5, c.accent2, null);
      ctx.restore();
    }
  }
}

function drawPortrait(ctx, x, y, fighter, mirror) {
  const c = fighter.char.colors;
  ctx.save();
  ctx.translate(x, y);
  // glow
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
  g.addColorStop(0, hexA(c.accent, 0.44));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(10, 7, 14, 0.95)';
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, TAU);
  ctx.fill();
  const ig = ctx.createLinearGradient(-18, -22, 18, 22);
  ig.addColorStop(0, darken(c.accent, 0.2));
  ig.addColorStop(1, '#0a0710');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(0, 0, 27, 0, TAU);
  ctx.fill();

  // kanji sigil
  ctx.font = `700 25px ${JP}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hexA(c.accent2, fighter.spirit >= 100 ? 1 : 0.85);
  if (fighter.spirit >= 100) {
    ctx.shadowColor = c.accent2;
    ctx.shadowBlur = 16;
  }
  ctx.fillText(CHARACTERS[fighter.charId].kanji, 1, 1);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(216, 176, 106, 0.8)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 30.5, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = hexA(c.accent, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 24, -0.8, 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 24, Math.PI - 0.8, Math.PI + 0.8);
  ctx.stroke();
  if (fighter.flash > 0.1) {
    ctx.globalAlpha = fighter.flash * 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawTimer(ctx, game) {
  const sec = Math.max(0, Math.ceil(game.timer / 60));
  const low = sec <= 10 && game.phase === 'fight';
  const pulse = low ? 0.5 + 0.5 * Math.sin(game.time * 9) : 0;
  const cx = W / 2;
  const y = 28;

  ctx.save();
  // frame
  ctx.translate(cx, y);
  const pts = [[-50, 0], [-38, -8], [38, -8], [50, 0], [44, 62], [0, 72], [-44, 62]];
  ctx.fillStyle = 'rgba(7, 5, 12, 0.9)';
  poly(ctx, pts);
  ctx.fill();
  ctx.strokeStyle = low ? `rgba(255, 100, 90, ${0.7 + pulse * 0.3})` : 'rgba(216,176,106,0.75)';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = low ? '#ea4d4d' : 'rgba(216,176,106,0.6)';
  ctx.shadowBlur = low ? 18 : 8;
  poly(ctx, pts);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 43px ${FONT}`;
  const tg = ctx.createLinearGradient(0, 8, 0, 52);
  tg.addColorStop(0, '#fff6dd');
  tg.addColorStop(0.55, low ? '#ffb0a0' : '#f6dfac');
  tg.addColorStop(1, low ? '#ff514c' : '#c89a51');
  ctx.fillStyle = tg;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillText(String(sec).padStart(2, '0'), 0, 28);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.font = `700 7px ${FONT}`;
  ctx.fillStyle = 'rgba(216,176,106,0.7)';
  ctx.fillText('TIME', 0, 57);

  // round tag under timer
  ctx.font = `800 8px ${FONT}`;
  ctx.fillStyle = 'rgba(240, 227, 202, 0.72)';
  ctx.fillText(`ROUND ${game.round}`, 0, 89);
  ctx.restore();
}

function drawSpirit(ctx, game, side, fighter) {
  const c = fighter.char.colors;
  const mirror = side === 1;
  const x = mirror ? W - 100 - 268 : 100;
  const y = 678;
  const w = 268;
  const h = 12;
  const ratio = clamp(fighter.spirit / MAX_SPIRIT, 0, 1);
  const ready = hudState.ready[side];

  ctx.save();
  // frame
  ctx.fillStyle = 'rgba(8, 6, 13, 0.78)';
  poly(ctx, [[x, y], [x + w, y], [x + w - 5, y + h], [x + 5, y + h]]);
  ctx.fill();
  ctx.strokeStyle = ready > 0.5 ? hexA(c.accent2, 0.9) : 'rgba(216,176,106,0.4)';
  ctx.lineWidth = 1.2;
  poly(ctx, [[x, y], [x + w, y], [x + w - 5, y + h], [x + 5, y + h]]);
  ctx.stroke();

  // fill
  const fw = (w - 8) * ratio;
  if (fw > 0) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, c.accent);
    g.addColorStop(0.65, c.accent2);
    g.addColorStop(1, '#fff6d6');
    ctx.fillStyle = g;
    ctx.fillRect(x + 4, y + 3, fw, h - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 4, y + 3, fw, 2);
  }
  // segments
  ctx.strokeStyle = 'rgba(6,4,9,0.45)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const sx = x + 4 + (w - 8) * i / 5;
    ctx.beginPath();
    ctx.moveTo(sx, y + 2);
    ctx.lineTo(sx - 2, y + h - 2);
    ctx.stroke();
  }

  if (ready > 0.5) {
    ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(game.time * 3));
    ctx.shadowColor = c.accent2;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = c.accent2;
    ctx.lineWidth = 2;
    poly(ctx, [[x, y], [x + w, y], [x + w - 5, y + h], [x + 5, y + h]]);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // labels
  ctx.font = `800 8px ${FONT}`;
  ctx.textAlign = mirror ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ready > 0.5 ? c.accent2 : 'rgba(216,176,106,0.65)';
  const lx = mirror ? x + w : x;
  ctx.fillText('SPIRIT', lx, y - 9);
  if (ready > 0.5) {
    ctx.textAlign = mirror ? 'left' : 'right';
    ctx.fillStyle = hexA(c.accent2, 0.7 + 0.3 * Math.sin(game.time * 5));
    ctx.fillText('SUPER READY', mirror ? x : x + w, y - 9);
  }
  ctx.restore();
}

function drawCombo(ctx, game) {
  if (game.combo.timer <= 0 || game.combo.count < 2) return;
  const side = game.combo.side;
  const f = game.fighters[side];
  const c = f.char.colors;
  const life = game.combo.timer / 88;
  const x = side === 0 ? 250 : W - 250;
  const y = 190;
  const pop = 1 + Math.max(0, (game.combo.timer - 72) / 20) * 0.28;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = clamp(life * 1.4, 0, 1);
  ctx.font = `italic 900 64px ${SERIF}`;
  ctx.fillStyle = '#fff4d8';
  ctx.strokeStyle = hexA(c.accent, 0.9);
  ctx.lineWidth = 2;
  ctx.shadowColor = hexA(c.accent, 0.8);
  ctx.shadowBlur = 18;
  ctx.strokeText(String(game.combo.count), 0, 0);
  ctx.fillText(String(game.combo.count), 0, 0);
  ctx.shadowBlur = 0;
  ctx.font = `900 15px ${FONT}`;
  ctx.fillStyle = c.accent2;
  ctx.fillText('HIT COMBO', 0, 42);
  // side slashes
  ctx.strokeStyle = hexA(c.accent, 0.55 * life);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-62, -20);
  ctx.lineTo(-18, 20);
  ctx.moveTo(62, -20);
  ctx.lineTo(18, 20);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// callouts and round banners
// ---------------------------------------------------------------------------
export function drawCallout(ctx, game) {
  const c = game.callout;
  if (!c) return;
  const p = 1 - c.timer / c.max;
  const fadeIn = clamp(p / 0.12, 0, 1);
  const fadeOut = clamp(c.timer / 16, 0, 1);
  const alpha = fadeIn * fadeOut;
  const side = c.side;
  const dir = side === 0 ? 1 : -1;
  const y = c.big ? 378 : 492;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (c.big) {
    // cinematic letterbox
    const top = ctx.createLinearGradient(0, 230, 0, 320);
    top.addColorStop(0, 'rgba(3,2,7,0)');
    top.addColorStop(1, 'rgba(3,2,7,0.88)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 230, W, 92);
    const bottom = ctx.createLinearGradient(0, 460, 0, 550);
    bottom.addColorStop(0, 'rgba(3,2,7,0.88)');
    bottom.addColorStop(1, 'rgba(3,2,7,0)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 460, W, 92);

    // radial ink burst
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU + game.time * 0.2;
      const len = 220 + Math.sin(i * 2.4) * 90;
      ctx.fillStyle = hexA(i % 2 ? c.color : '#ffffff', 0.04);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.02) * len, Math.sin(a - 0.02) * len);
      ctx.lineTo(Math.cos(a + 0.02) * len, Math.sin(a + 0.02) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // giant kanji watermark
    const char = game.fighters[side]?.char ?? CHARACTERS.kaito;
    ctx.save();
    ctx.globalAlpha = alpha * 0.1;
    ctx.fillStyle = c.color;
    ctx.font = `700 210px ${JP}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char.kanji, W / 2, y + 8);
    ctx.restore();
  }

  // accent lines
  ctx.strokeStyle = hexA(c.color, 0.8);
  ctx.lineWidth = 1.6;
  const lineW = c.big ? 300 : 150;
  ctx.beginPath();
  ctx.moveTo(W / 2 - lineW, y + 14);
  ctx.lineTo(W / 2 - 80, y + 14);
  ctx.moveTo(W / 2 + 80, y + 14);
  ctx.lineTo(W / 2 + lineW, y + 14);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `800 ${c.big ? 13 : 10}px ${FONT}`;
  ctx.fillStyle = hexHue(c.color, 0.9);
  ctx.fillText(c.sub, W / 2, y - (c.big ? 38 : 30));

  const size = c.big ? 58 : 40;
  ctx.font = `900 ${size}px ${FONT}`;
  const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  g.addColorStop(0, '#fff9e8');
  g.addColorStop(0.5, c.color);
  g.addColorStop(1, darken(c.color, 0.4));
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(5, 3, 8, 0.9)';
  ctx.lineWidth = 5;
  ctx.shadowColor = c.color;
  ctx.shadowBlur = 22;
  ctx.strokeText(c.text, W / 2, y + 12);
  ctx.fillText(c.text, W / 2, y + 12);
  ctx.shadowBlur = 0;

  // sliding sheen
  const sheen = ((game.time * 0.5) % 1) * 420 - 210;
  ctx.save();
  ctx.beginPath();
  ctx.rect(W / 2 - 200, y - 20, 400, 60);
  ctx.clip();
  ctx.globalAlpha = alpha * 0.28;
  ctx.translate(W / 2 + sheen, y + 12);
  ctx.rotate(-0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-8, -50, 16, 100);
  ctx.restore();

  ctx.restore();
}

export function drawBanner(ctx, game) {
  if (game.phase === 'intro') {
    const t = game.phaseTimer;
    if (t < 70) {
      const a = clamp(t / 8, 0, 1) * clamp((70 - t) / 12, 0, 1);
      drawRoundBanner(ctx, `ROUND ${game.round}`, `第 ${game.round} 番`, a, 1 + (1 - clamp(t / 70, 0, 1)) * 0.05);
    } else {
      const p = clamp((t - 70) / 48, 0, 1);
      const a = clamp((t - 70) / 7, 0, 1) * clamp((118 - t) / 8, 0, 1);
      drawFightBanner(ctx, a, p);
    }
    return;
  }

  if (game.phase === 'ko') {
    const t = game.phaseTimer;
    if (t < 108) {
      const a = clamp(t / 6, 0, 1) * clamp((108 - t) / 15, 0, 1);
      if (game.roundReason === 'TIME') {
        drawKOBanner(ctx, 'TIME OVER', '時間切れ', a, '#ffd489', game);
      } else if (game.roundWinner < 0) {
        drawKOBanner(ctx, 'DRAW', '引き分け', a, '#d8d0c0', game);
      } else {
        drawKOBanner(ctx, 'K.O.', '決着', a, '#ff7064', game);
        const w = game.fighters[game.roundWinner];
        if (w && w.health >= MAX_HEALTH - 0.1) {
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          ctx.font = `900 16px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffe3a3';
          ctx.shadowColor = '#ffb04e';
          ctx.shadowBlur = 16;
          ctx.fillText('PERFECT', W / 2, 240);
          ctx.restore();
        }
      }
    }
  }
}

function drawRoundBanner(ctx, text, jp, alpha, scale) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, 330);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `700 16px ${JP}`;
  ctx.fillStyle = 'rgba(255, 227, 163, 0.75)';
  ctx.fillText(jp, 0, -62);

  // ink slash behind
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = 'rgba(9, 6, 14, 0.55)';
  ctx.beginPath();
  ctx.moveTo(-280, 4);
  ctx.lineTo(250, -22);
  ctx.lineTo(290, 6);
  ctx.lineTo(-250, 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const g = ctx.createLinearGradient(0, -50, 0, 54);
  g.addColorStop(0, '#fff8e4');
  g.addColorStop(0.45, '#efd39a');
  g.addColorStop(1, '#b47732');
  ctx.font = `900 76px ${SERIF}`;
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(7, 5, 11, 0.92)';
  ctx.lineWidth = 7;
  ctx.shadowColor = 'rgba(214, 60, 74, 0.55)';
  ctx.shadowBlur = 30;
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(216,176,106,0.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-240, 44);
  ctx.lineTo(-70, 44);
  ctx.moveTo(70, 44);
  ctx.lineTo(240, 44);
  ctx.stroke();
  ctx.restore();
}

function drawFightBanner(ctx, alpha, progress) {
  const scale = 0.72 + Math.min(1, progress * 4) * 0.36;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, 332);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // speed slashes
  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255, 220, 150, 0.11)' : 'rgba(214, 60, 74, 0.14)';
    ctx.beginPath();
    ctx.moveTo(-420 + i * 30, -70 + i * 8);
    ctx.lineTo(380 + i * 30, -90 + i * 8);
    ctx.lineTo(400 + i * 30, -74 + i * 8);
    ctx.lineTo(-400 + i * 30, -54 + i * 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const g = ctx.createLinearGradient(0, -60, 0, 62);
  g.addColorStop(0, '#fff5d1');
  g.addColorStop(0.4, '#ffb44f');
  g.addColorStop(0.72, '#e0443f');
  g.addColorStop(1, '#791522');
  ctx.font = `900 118px ${FONT}`;
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(6, 4, 9, 0.95)';
  ctx.lineWidth = 9;
  ctx.shadowColor = 'rgba(255, 100, 50, 0.7)';
  ctx.shadowBlur = 38;
  ctx.strokeText('FIGHT!', 0, 0);
  ctx.fillText('FIGHT!', 0, 0);
  ctx.shadowBlur = 0;

  ctx.font = `700 15px ${JP}`;
  ctx.fillStyle = 'rgba(255, 235, 197, 0.7)';
  ctx.fillText('始 め', 0, 78);
  ctx.restore();
}

function drawKOBanner(ctx, text, jp, alpha, color, game) {
  const t = game.phaseTimer;
  const scale = 1.5 - clamp(t / 8, 0, 1) * 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, 330);
  ctx.scale(scale, scale);

  // brush strokes behind
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? 'rgba(150, 22, 34, 0.35)' : 'rgba(14, 8, 16, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-330 + i * 40, -40 + i * 23);
    ctx.lineTo(280 + i * 25, -66 + i * 23);
    ctx.lineTo(340 + i * 20, -42 + i * 23);
    ctx.lineTo(-290 + i * 40, -8 + i * 23);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = text.length > 5 ? 96 : 132;
  const g = ctx.createLinearGradient(0, -60, 0, 66);
  g.addColorStop(0, '#fff8e8');
  g.addColorStop(0.35, color);
  g.addColorStop(1, darken(color, 0.45));
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(6, 4, 9, 0.95)';
  ctx.lineWidth = 10;
  ctx.shadowColor = hexA(color, 0.8);
  ctx.shadowBlur = 40;
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;

  ctx.font = `700 16px ${JP}`;
  ctx.fillStyle = 'rgba(255, 235, 197, 0.65)';
  ctx.fillText(jp, 0, 84);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// screen treatment
// ---------------------------------------------------------------------------
export function drawScreenFX(ctx, game) {
  // low-health edges
  for (let i = 0; i < 2; i++) {
    const f = game.fighters[i];
    if (!f || f.health > 30 || game.phase === 'attract') continue;
    const intensity = (1 - f.health / 30) * (0.5 + 0.5 * Math.sin(game.time * 5));
    const x0 = i === 0 ? 0 : W;
    const x1 = i === 0 ? 260 : W - 260;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(150, 14, 24, ${0.24 * intensity})`);
    g.addColorStop(1, 'rgba(150, 14, 24, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(i === 0 ? 0 : W - 260, 120, 260, H - 200);
  }

  // speed lines during KOs and supers
  const speed = game.phase === 'ko' ? clamp((60 - game.phaseTimer) / 60, 0, 1) : game.superCine > 0 ? game.superCine / 60 * 0.4 : 0;
  if (speed > 0) {
    ctx.save();
    ctx.globalAlpha = speed * 0.5;
    ctx.strokeStyle = '#ffe0ad';
    ctx.translate(W / 2, H / 2);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU + (i % 3) * 0.03;
      const r0 = 240 + (i % 5) * 20;
      const r1 = r0 + 180 + (i % 4) * 90;
      ctx.lineWidth = 1 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.45, W * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.75, 'rgba(0,0,0,0.16)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // color flash
  if (game.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp(game.flash, 0, 0.85);
    ctx.fillStyle = game.flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function spaced(text) {
  return text.split('').join('\u200a');
}

function lighten(hex, amount) {
  return shade(hex, amount);
}
function darken(hex, amount) {
  return shade(hex, -amount);
}
function hexHue(hex, alpha) {
  return hexA(hex, alpha);
}
function shade(hex, amount) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount > 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
