// ---------------------------------------------------------------------------
// Frame orchestration
// ---------------------------------------------------------------------------

import { W, H } from './data.js';
import { drawBackground, drawStage } from './stage-art.js';
import { drawAmbient, drawFighterShadow, drawProjectile, drawFx } from './effects-art.js';
import { drawFighter, drawFighterSnapshot } from './fighter-art.js';
import { drawHUD, drawCallout, drawBanner, drawScreenFX } from './hud.js';

export function renderGame(ctx, game) {
  ctx.clearRect(0, 0, W, H);

  drawBackground(ctx, game);

  const cam = game.cam;
  const zoom = Math.max(0.9, cam.zoom + cam.punch);
  const shake = Math.min(18, game.shake);
  const sx = (Math.random() * 2 - 1) * shake * 0.55;
  const sy = (Math.random() * 2 - 1) * shake * 0.42;
  const tilt = (Math.random() * 2 - 1) * shake * 0.00022;

  ctx.save();
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.rotate(tilt);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x, -360);

  drawStage(ctx, game);
  drawAmbient(ctx, game, 'back');

  // ghosted movement trails
  for (const snap of game.afterimages) drawFighterSnapshot(ctx, snap, game.time);

  // shadows ground the fighters
  for (const f of game.fighters) drawFighterShadow(ctx, f);

  // fighters
  const order = [...game.fighters];
  order.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 24) return b.y - a.y;
    return a.index - b.index;
  });
  for (const f of order) drawFighter(ctx, f, game.time);

  // projectiles in front
  for (const p of game.projectiles) drawProjectile(ctx, p, game.time);

  // impact particles
  drawFx(ctx, game);

  // foreground petals
  drawAmbient(ctx, game, 'front');

  ctx.restore();

  // reading layer
  drawScreenFX(ctx, game);
  drawHUD(ctx, game);
  drawCallout(ctx, game);
  drawBanner(ctx, game);
}
