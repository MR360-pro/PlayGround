// ---------------------------------------------------------------------------
// Shadow Blossom — game simulation
// ---------------------------------------------------------------------------

import {
  W, H, GROUND, WORLD_W, ROUND_FRAMES, GRAVITY, WALK_SPEED, BACK_SPEED,
  JUMP_VX, JUMP_VY, MAX_HEALTH, MAX_SPIRIT, PUSH_DISTANCE, CHARACTERS,
  MOVES, moveTotal, POSES, BASE_POSE
} from './data.js';
import { sound } from './audio.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sign = (v) => (v < 0 ? -1 : 1);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const rand = (a, b) => a + Math.random() * (b - a);

export function clonePose(pose) {
  return {
    hipY: pose.hipY, lean: pose.lean, head: pose.head,
    armF: [pose.armF[0], pose.armF[1]],
    armB: [pose.armB[0], pose.armB[1]],
    legF: [pose.legF[0], pose.legF[1]],
    legB: [pose.legB[0], pose.legB[1]]
  };
}

export function lerpPose(a, b, t) {
  return {
    hipY: lerp(a.hipY, b.hipY, t),
    lean: lerp(a.lean, b.lean, t),
    head: lerp(a.head, b.head, t),
    armF: [lerp(a.armF[0], b.armF[0], t), lerp(a.armF[1], b.armF[1], t)],
    armB: [lerp(a.armB[0], b.armB[0], t), lerp(a.armB[1], b.armB[1], t)],
    legF: [lerp(a.legF[0], b.legF[0], t), lerp(a.legF[1], b.legF[1], t)],
    legB: [lerp(a.legB[0], b.legB[0], t), lerp(a.legB[1], b.legB[1], t)]
  };
}

function within(box, other) {
  return box.x < other.x + other.w && box.x + box.w > other.x &&
    box.y < other.y + other.h && box.y + box.h > other.y;
}

function makeBox(x, y, w, h) { return { x, y, w, h }; }

// ===========================================================================
// Fighter
// ===========================================================================
export class Fighter {
  constructor(game, charId, index) {
    this.game = game;
    this.charId = charId;
    this.char = CHARACTERS[charId];
    this.index = index;
    this.startX = index === 0 ? 540 : 1060;
    this.x = this.startX;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = index === 0 ? 1 : -1;
    this.health = MAX_HEALTH;
    this.spirit = 0;
    this.state = 'idle';
    this.stateTimer = 0;
    this.move = null;
    this.attackFrame = 0;
    this.hitTargets = new Set();
    this.hitCount = 0;
    this.hitNext = 0;
    this.cooldowns = { s1: 0, s2: 0, s3: 0 };
    this.crouching = false;
    this.blocking = false;
    this.grounded = true;
    this.invuln = 0;
    this.flash = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.animTime = Math.random() * 4;
    this.walkPhase = 0;
    this.spinAngle = 0;
    this.pose = clonePose(POSES.idle);
    this.dirHistory = [];
    this.afterimageClock = 0;
    this.lastLand = true;
    this.readyPulse = 0;
    this.hitFlashColor = '#fff';
  }

  resetForRound() {
    this.x = this.startX;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.index === 0 ? 1 : -1;
    this.health = MAX_HEALTH;
    this.state = 'idle';
    this.stateTimer = 0;
    this.move = null;
    this.attackFrame = 0;
    this.hitTargets.clear();
    this.hitCount = 0;
    this.hitNext = 0;
    this.cooldowns.s1 = 0;
    this.cooldowns.s2 = 0;
    this.cooldowns.s3 = 0;
    this.crouching = false;
    this.blocking = false;
    this.grounded = true;
    this.invuln = 0;
    this.flash = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.spinAngle = 0;
    this.pose = clonePose(POSES.idle);
    this.dirHistory.length = 0;
  }

  get opponent() { return this.game.fighters[1 - this.index]; }

  get isFree() {
    return ['idle', 'walk', 'crouch'].includes(this.state);
  }

  addSpirit(amount) {
    const prev = this.spirit;
    this.spirit = clamp(this.spirit + amount, 0, MAX_SPIRIT);
    if (prev < MAX_SPIRIT && this.spirit >= MAX_SPIRIT) {
      this.readyPulse = 1;
      this.game.onSpiritFull(this);
    }
  }

  recordDirection(held) {
    const fwd = (held.right && this.facing > 0) || (held.left && this.facing < 0);
    const back = (held.left && this.facing > 0) || (held.right && this.facing < 0);
    let token = '';
    if (held.down && fwd) token = 'df';
    else if (held.down && back) token = 'db';
    else if (held.down) token = 'd';
    else if (fwd) token = 'f';
    else if (back) token = 'b';
    else if (held.up) token = 'u';
    this.dirHistory.push(token);
    if (this.dirHistory.length > 28) this.dirHistory.shift();
  }

  detectMotion() {
    const hist = this.dirHistory.slice(-22);
    const fwd = [];
    const down = [];
    const back = [];
    hist.forEach((token, i) => {
      if (token === 'f' || token === 'df') fwd.push(i);
      if (token === 'd' || token === 'df' || token === 'db') down.push(i);
      if (token === 'b' || token === 'db') back.push(i);
    });
    const lastF = fwd.length ? fwd[fwd.length - 1] : -1;
    const lastB = back.length ? back[back.length - 1] : -1;
    const lastD = down.length ? down[down.length - 1] : -1;

    // Dragon punch: forward, down, forward
    if (lastF >= 0) {
      const dBefore = down.filter((i) => i < lastF && i > lastF - 16);
      if (dBefore.length) {
        const earliestD = dBefore[0];
        const fBefore = fwd.some((i) => i < earliestD && i > earliestD - 16);
        if (fBefore) return 'dp';
      }
      const dBefore2 = down.filter((i) => i < lastF && i > lastF - 18);
      if (dBefore2.length) return 'qcf';
    }
    // Quarter-circle back for the spin
    if (lastB >= 0) {
      const dBefore = down.filter((i) => i < lastB && i > lastB - 18);
      if (dBefore.length) return 'qcb';
    }
    return '';
  }

  update(held = {}, pressed = new Set()) {
    this.animTime += 1 / 60;
    for (const k of ['s1', 's2', 's3']) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - 1);
    this.flash = Math.max(0, this.flash - 0.055);
    this.readyPulse = Math.max(0, this.readyPulse - 0.02);
    if (this.invuln > 0 && this.state !== 'knockdown') this.invuln--;

    this.recordDirection(held);

    if (this.state === 'attack') {
      this.updateAttack(held, pressed);
    } else if (this.state === 'hit' || this.state === 'blockstun') {
      this.updateStun();
    } else if (this.state === 'knockdown') {
      this.updateKnockdown();
    } else if (this.state === 'victory') {
      // hold the pose
    } else {
      this.updateFree(held, pressed);
    }

    this.updatePhysics();
    if (this.game.phase === 'fight' || this.game.phase === 'intro' || this.game.phase === 'attract') this.updateFacing();
    this.updatePose();
  }

  updateFree(held, pressed) {
    if (this.game.phase !== 'fight') {
      this.blocking = false;
      if (this.grounded) {
        this.state = 'idle';
        this.vx *= 0.7;
      }
      return;
    }

    // Motion inputs layered over the dedicated special keys
    if (pressed.has('punch') || pressed.has('kick')) {
      const motion = this.detectMotion();
      if (pressed.has('punch') && motion === 'dp') {
        pressed = new Set(pressed); pressed.add('s2');
      } else if (pressed.has('punch') && motion === 'qcf') {
        pressed = new Set(pressed); pressed.add('s1');
      } else if (pressed.has('kick') && motion === 'qcb') {
        pressed = new Set(pressed); pressed.add('s3');
      }
    }

    if (!this.grounded) {
      this.state = 'jump';
      if (pressed.has('kick')) this.startAttack('jumpKick');
      return;
    }

    if (pressed.has('super') && this.spirit >= MAX_SPIRIT) {
      if (this.startAttack('super')) this.spirit = 0;
      return;
    }
    for (const id of ['s1', 's2', 's3']) {
      if (pressed.has(id) && this.cooldowns[id] <= 0) {
        this.startAttack(id);
        return;
      }
    }
    if (pressed.has('up')) {
      this.jump((held.right ? 1 : 0) - (held.left ? 1 : 0));
      return;
    }
    if (pressed.has('kick')) {
      this.startAttack(held.down ? 'sweep' : 'kick');
      return;
    }
    if (pressed.has('punch')) {
      this.startAttack('punch');
      return;
    }

    const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const away = dir !== 0 && dir !== this.facing;
    this.blocking = away && this.grounded;
    this.crouching = Boolean(held.down);
    if (this.crouching) {
      this.state = 'crouch';
      this.vx *= 0.6;
      if (dir) this.x += dir * 0.55;
    } else if (dir) {
      this.state = 'walk';
      this.vx = dir * (dir === this.facing ? WALK_SPEED : BACK_SPEED);
      this.walkPhase += (dir === this.facing ? 1 : -0.8) * 0.17;
    } else {
      this.state = 'idle';
      this.vx *= 0.68;
    }
  }

  jump(dir) {
    this.grounded = false;
    this.state = 'jump';
    this.vy = JUMP_VY;
    this.vx = dir * JUMP_VX;
    this.crouching = false;
    this.blocking = false;
    this.lastLand = false;
    sound.jump();
    this.game.dust(this.x, GROUND, dir || this.facing, 4);
  }

  startAttack(id) {
    const move = MOVES[id];
    if (!move) return false;
    if (this.spirit < MAX_SPIRIT && id === 'super') return false;
    if ((id === 's1' || id === 's2' || id === 's3') && this.cooldowns[id] > 0) return false;

    this.state = 'attack';
    this.move = move;
    this.attackFrame = 0;
    this.hitTargets.clear();
    this.hitCount = 0;
    this.hitNext = 0;
    this.blocking = false;
    this.crouching = id === 'sweep';
    this.spinAngle = 0;
    this.afterimageClock = 0;
    if (id === 's1') this.cooldowns.s1 = 52;
    if (id === 's2') this.cooldowns.s2 = 70;
    if (id === 's3') this.cooldowns.s3 = 64;
    if (id === 's2') {
      this.grounded = false;
      this.y -= 1;
      this.vy = -11.4;
      this.vx = this.facing * 2.4;
      this.invuln = Math.max(this.invuln, move.invuln || 10);
    }
    if (id === 'super') {
      this.game.onSuperStart(this);
    } else if (id === 's1' || id === 's2' || id === 's3') {
      const special = this.char.specials[Number(id[1]) - 1];
      this.game.showCallout(special.name, id === 's1' ? 'SPECIAL I' : id === 's2' ? 'SPECIAL II' : 'SPECIAL III', special.color, this.index);
    }
    sound.whoosh();
    return true;
  }

  updateAttack(held, pressed) {
    this.attackFrame++;
    const m = this.move;
    if (!m) { this.endAttack(); return; }

    if (m.projectile && this.attackFrame === m.spawnAt) {
      this.game.spawnProjectile(this, m);
    }

    if (m.id === 's3') {
      this.spinAngle += 0.56;
      this.vx = this.facing * (this.attackFrame < m.startup ? 1.1 : m.advance);
      if (this.attackFrame > m.startup && this.attackFrame % 2 === 0) {
        this.game.addAfterimage(this, 0.55);
      }
    } else if (m.id === 's2') {
      if (this.attackFrame % 2 === 0) this.game.addAfterimage(this, 0.5);
    } else if (m.id === 'super') {
      if (this.attackFrame === m.startup) {
        this.game.cameraPunch(1.12, 26);
      }
      if (this.attackFrame > m.startup && this.attackFrame % 3 === 0) {
        this.game.addAfterimage(this, 0.35);
      }
    } else if (m.id === 'kick' || m.id === 'sweep') {
      this.vx *= 0.95;
    }

    if (this.attackFrame >= moveTotal(m)) {
      this.endAttack();
    }
  }

  endAttack() {
    this.state = this.crouching ? 'crouch' : 'idle';
    this.move = null;
    this.attackFrame = 0;
    this.spinAngle = 0;
    this.hitTargets.clear();
    this.hitCount = 0;
    this.crouching = false;
    this.vx *= 0.35;
  }

  updateStun() {
    this.stateTimer--;
    this.vx *= 0.9;
    if (this.stateTimer <= 0) {
      this.state = 'idle';
      this.stateTimer = 0;
    }
  }

  updateKnockdown() {
    this.vx *= 0.94;
    if (this.health <= 0) {
      this.stateTimer = 999;
      return;
    }
    if (this.grounded) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.invuln = 34;
        this.game.dust(this.x, GROUND, this.facing, 5);
      }
    }
  }

  updatePhysics() {
    if (!this.grounded) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND) {
        this.y = GROUND;
        const wasAir = !this.grounded;
        this.vy = 0;
        this.grounded = true;
        if (wasAir) {
          this.lastLand = true;
          this.game.dust(this.x, GROUND, this.facing, 6);
          if (this.state === 'jump') {
            this.state = 'idle';
            sound.land();
          } else if (this.state === 'attack' && this.move && this.move.air) {
            this.endAttack();
            this.state = 'idle';
            sound.land();
          } else if (this.state === 'knockdown') {
            this.stateTimer = Math.max(this.stateTimer, 52);
            this.game.shake = Math.max(this.game.shake, 7);
            sound.land();
            this.game.dust(this.x, GROUND, this.facing, 9);
          }
        }
      }
    }

    this.x += this.vx;
    if (this.grounded && (this.state === 'hit' || this.state === 'blockstun' || this.state === 'knockdown')) {
      this.vx *= 0.87;
    }
    if (this.grounded && (this.state === 'idle' || this.state === 'crouch')) this.vx *= 0.72;

    this.x = clamp(this.x, 225, WORLD_W - 225);
    if (this.y > GROUND) this.y = GROUND;
  }

  updateFacing() {
    if (!this.isFree || !this.grounded) return;
    const dx = this.opponent.x - this.x;
    if (Math.abs(dx) > 4) this.facing = sign(dx);
  }

  updatePose() {
    let target = clonePose(POSES.idle);
    const t = this.animTime;
    const phase = this.game.phase;

    if (phase === 'attract') {
      target = clonePose(POSES.idle);
      target.hipY += Math.sin(t * 2.2 + this.index) * 1.4;
      target.lean += Math.sin(t * 2.2 + this.index + 0.5) * 1.2;
      this.pose = lerpPose(this.pose, target, 0.16);
      return;
    }

    if (this.state === 'victory') {
      target = clonePose(POSES.victory);
      target.hipY += Math.sin(t * 2.4) * 1.2;
      this.pose = lerpPose(this.pose, target, 0.2);
      return;
    }

    if (phase === 'intro') {
      const introT = clamp((this.game.phaseTimer - 45) / 40, 0, 1);
      target = lerpPose(POSES.intro, POSES.idle, introT);
      target.hipY += Math.sin(t * 2.6) * 1.1;
      this.pose = lerpPose(this.pose, target, 0.2);
      return;
    }

    if (this.state === 'knockdown') {
      target = clonePose(POSES.knock);
      if (this.grounded) target.lean -= 18;
      this.pose = lerpPose(this.pose, target, 0.24);
      return;
    }

    if (this.state === 'hit') {
      target = clonePose(this.crouching ? POSES.hitCrouch : POSES.hit);
      target.lean += Math.sin(this.animTime * 26) * 1.5;
      this.pose = lerpPose(this.pose, target, 0.45);
      return;
    }

    if (this.state === 'blockstun') {
      target = clonePose(POSES.block);
      target.lean -= 3;
      this.pose = lerpPose(this.pose, target, 0.4);
      return;
    }

    if (this.state === 'attack') {
      target = this.attackPose();
      this.pose = lerpPose(this.pose, target, 0.42);
      return;
    }

    if (!this.grounded || this.state === 'jump') {
      target = clonePose(POSES.jump);
      target.legF[0] += Math.sin(t * 7) * 3;
      this.pose = lerpPose(this.pose, target, 0.28);
      return;
    }

    if (this.blocking) {
      target = clonePose(this.crouching ? POSES.crouch : POSES.block);
      if (this.crouching) {
        target.armF = [58, 142];
        target.armB = [44, 132];
      }
      target.hipY += Math.sin(t * 3.1) * 0.8;
      this.pose = lerpPose(this.pose, target, 0.3);
      return;
    }

    if (this.crouching || this.state === 'crouch') {
      target = clonePose(POSES.crouch);
      target.hipY += Math.sin(t * 3.4) * 0.7;
      this.pose = lerpPose(this.pose, target, 0.3);
      return;
    }

    if (this.state === 'walk') {
      const w = Math.sin(this.walkPhase);
      target = clonePose(POSES.idle);
      target.hipY = Math.abs(w) * 1.6 - 0.6;
      target.lean = 4 + w * 1.5;
      target.legF = [12 + w * 23, 2 + w * 9];
      target.legB = [-14 - w * 23, -6 + w * 8];
      target.armF = [38 - w * 5, 168 + w * 3];
      target.armB = [22 + w * 4, 156 - w * 3];
      this.pose = lerpPose(this.pose, target, 0.3);
      return;
    }

    target.hipY = Math.sin(t * 2.8 + this.index) * 1.5;
    target.lean = 4 + Math.sin(t * 2.8 + this.index + 0.7) * 1.4;
    target.head = Math.sin(t * 1.4) * 1.4;
    target.armF[0] += Math.sin(t * 2.8) * 1.6;
    target.armB[0] += Math.sin(t * 2.8 + 1) * 1.4;
    this.pose = lerpPose(this.pose, target, 0.18);
  }

  attackPose() {
    const m = this.move;
    const f = this.attackFrame;
    const s = m.startup;
    const a = m.active;
    const r = m.recovery;
    const after = f - s - a;

    if (m.id === 'punch') {
      if (f < s) return lerpPose(POSES.idle, POSES.punchWind, easeOut(f / s));
      if (f < s + a) return POSES.punch;
      return lerpPose(POSES.punch, POSES.idle, easeOut(after / r));
    }
    if (m.id === 'kick') {
      if (f < s) return lerpPose(POSES.kickWind, POSES.kick, easeOut(f / s));
      if (f < s + a) return POSES.kick;
      return lerpPose(POSES.kick, POSES.idle, easeOut(after / r));
    }
    if (m.id === 'sweep') {
      if (f < s) return lerpPose(POSES.crouch, POSES.sweep, easeOut(f / s));
      if (f < s + a) return POSES.sweep;
      return lerpPose(POSES.sweep, POSES.crouch, easeOut(after / r));
    }
    if (m.id === 'jumpKick') return POSES.jumpKick;
    if (m.id === 's1') {
      if (f < s) return lerpPose(POSES.s1Wind, POSES.s1Fire, easeOut(f / s));
      if (f < s + a + 3) return POSES.s1Fire;
      return lerpPose(POSES.s1Fire, POSES.idle, easeOut(Math.max(0, after) / r));
    }
    if (m.id === 's2') {
      if (f < s) return lerpPose(POSES.s2Wind, POSES.s2Rise, easeOut(f / s));
      if (f < s + a) return POSES.s2Rise;
      return lerpPose(POSES.s2Rise, POSES.idle, easeOut(after / r));
    }
    if (m.id === 's3') return POSES.s3;
    if (m.id === 'super') {
      if (f < s) return lerpPose(POSES.superCharge, POSES.superFire, easeOut(f / s));
      if (f < s + a + 10) return POSES.superFire;
      return lerpPose(POSES.superFire, POSES.idle, easeOut(Math.max(0, after) / r));
    }
    return POSES.idle;
  }

  get height() {
    if (this.state === 'knockdown') return 44;
    if (this.crouching || this.state === 'crouch' || (this.state === 'attack' && this.move?.id === 'sweep')) return 116;
    return 186;
  }

  getHurtbox() {
    if (this.state === 'knockdown') {
      return makeBox(this.x - 58, this.y - 46, 116, 46);
    }
    const h = this.height;
    const w = 54;
    return makeBox(this.x - w / 2, this.y - h, w, h);
  }

  getHitbox() {
    if (this.state !== 'attack' || !this.move) return null;
    const m = this.move;
    if (m.projectile) return null;
    const f = this.attackFrame;
    if (f < m.startup) return null;
    if (!m.air && f >= m.startup + m.active) return null;
    if (m.air && this.grounded) return null;
    const b = m.box;
    if (!b) return null;
    const x = this.facing > 0 ? this.x + b.x0 : this.x - b.x1;
    return makeBox(x, this.y + b.y0, b.x1 - b.x0, b.y1 - b.y0);
  }

  getHeadY() {
    return this.y - 168;
  }
}

// ===========================================================================
// AI
// ===========================================================================
class AIController {
  constructor(game, fighter) {
    this.game = game;
    this.fighter = fighter;
    this.timer = 20;
    this.held = { left: false, right: false, down: false };
    this.pressed = new Set();
    this.guard = 0;
    this.guardLow = false;
    this.aggression = 1;
    this.think = 0;
  }

  reset() {
    this.timer = 18;
    this.guard = 0;
    this.held = { left: false, right: false, down: false };
    this.pressed = new Set();
  }

  control() {
    const f = this.fighter;
    const o = f.opponent;
    const game = this.game;
    const dist = Math.abs(o.x - f.x);
    const pressed = new Set();
    let held = { left: false, right: false, down: false };

    if (!f.isFree || game.phase !== 'fight') {
      this.held = held;
      return { held, pressed };
    }

    const away = f.facing > 0 ? 'left' : 'right';
    const toward = f.facing > 0 ? 'right' : 'left';
    const incoming = game.projectiles.find((p) => p.owner !== f.index && Math.sign(p.vx) === Math.sign(f.x - p.x));
    const oppAttacking = o.state === 'attack' && o.attackFrame < (o.move?.startup ?? 0) + (o.move?.active ?? 0) + 4;
    const oppClose = dist < 205;

    // Emergency defence: a projectile is about to arrive.
    if (incoming && Math.abs(incoming.x - f.x) < 300) {
      if (Math.random() < 0.22 && f.grounded) pressed.add('up');
      else {
        this.guard = Math.max(this.guard, 10);
        this.guardLow = false;
      }
    }

    if (oppAttacking && oppClose) {
      if (Math.random() < 0.14 && dist < 170) pressed.add('s2');
      else if (Math.random() < 0.55) {
        this.guard = Math.max(this.guard, 9);
        this.guardLow = o.move?.low || false;
      }
    }

    if (o.grounded === false && dist < 230 && Math.random() < 0.3) {
      if (f.cooldowns.s2 <= 0) pressed.add('s2');
    }

    this.timer--;
    if (this.timer <= 0) {
      this.timer = Math.floor(rand(7, 16));
      if (this.guard <= 0) {
        this.held = { left: false, right: false, down: false };
        if (f.spirit >= MAX_SPIRIT && dist < 520 && Math.random() < 0.4) {
          pressed.add('super');
        } else if (dist > 430) {
          const r = Math.random();
          if (r < 0.38 && f.cooldowns.s1 <= 0) pressed.add('s1');
          else if (r < 0.62) this.held = { left: toward === 'left', right: toward === 'right', down: false };
          else if (r < 0.78) pressed.add('up');
          else this.held = { left: away === 'left', right: away === 'right', down: false };
        } else if (dist > 215) {
          const r = Math.random();
          if (r < 0.26 && f.cooldowns.s3 <= 0) pressed.add('s3');
          else if (r < 0.42 && f.cooldowns.s1 <= 0) pressed.add('s1');
          else if (r < 0.48) pressed.add('up');
          else if (r < 0.82) this.held = { left: toward === 'left', right: toward === 'right', down: false };
          else this.held = { left: away === 'left', right: away === 'right', down: false };
        } else {
          const r = Math.random();
          if (r < 0.30) pressed.add('kick');
          else if (r < 0.53) pressed.add('punch');
          else if (r < 0.66) { this.held = { left: false, right: false, down: true }; pressed.add('kick'); }
          else if (r < 0.76 && f.cooldowns.s2 <= 0) pressed.add('s2');
          else if (r < 0.86) this.held = { left: away === 'left', right: away === 'right', down: false };
          else this.held = { left: toward === 'left', right: toward === 'right', down: false };
        }
      }
    }

    if (this.guard > 0) {
      this.guard--;
      held = { left: false, right: false, down: this.guardLow };
      held[away] = true;
    } else if (this.held) {
      held = { left: Boolean(this.held.left), right: Boolean(this.held.right), down: Boolean(this.held.down) };
    }

    // Turn to face and close distance if the player crosses up.
    if (this.held && (this.held.left || this.held.right)) {
      const dir = this.held.right ? 1 : -1;
      if (Math.abs(o.x - f.x) < 130 && dir === Math.sign(o.x - f.x)) {
        this.held = { left: away === 'left', right: away === 'right', down: false };
      }
    }

    this.pressed = pressed;
    return { held, pressed };
  }
}

// ===========================================================================
// Game
// ===========================================================================
export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.tick = 0;
    this.time = 0;
    this.phase = 'attract';
    this.phaseTimer = 0;
    this.mode = 'attract';
    this.round = 1;
    this.wins = [0, 0];
    this.timer = ROUND_FRAMES;
    this.hitstop = 0;
    this.flash = 0;
    this.flashColor = '#fff';
    this.shake = 0;
    this.slow = 0;
    this.paused = false;
    this.pausedPhase = null;
    this.fighters = [];
    this.projectiles = [];
    this.fx = [];
    this.afterimages = [];
    this.ambient = [];
    this.combo = { side: 0, count: 0, timer: 0 };
    this.callout = null;
    this.cam = { x: 800, y: 360, zoom: 1, punch: 0, punchTarget: 1, ox: 0, oy: 0 };
    this.roundWinner = -1;
    this.matchWinner = -1;
    this.roundReason = '';
    this.matchOver = false;
    this.superCine = 0;
    this.ai = null;
    this.charIds = ['kaito', 'akane'];
    this.attractTime = 0;
    this.lastSpiritReady = [false, false];
    this.makeAmbient();
    this.startAttract();
  }

  makeAmbient() {
    const randRange = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 60; i++) {
      this.ambient.push({
        x: randRange(-80, WORLD_W + 80),
        y: randRange(-100, GROUND),
        z: randRange(0.35, 1.2),
        speed: randRange(0.35, 1.15),
        sway: randRange(0.4, 1.6),
        phase: randRange(0, Math.PI * 2),
        spin: randRange(-0.03, 0.03),
        angle: randRange(0, Math.PI * 2),
        kind: i < 8 ? 'ember' : 'petal'
      });
    }
  }

  startAttract() {
    this.mode = 'attract';
    this.phase = 'attract';
    this.phaseTimer = 0;
    this.paused = false;
    this.round = 1;
    this.wins = [0, 0];
    this.timer = ROUND_FRAMES;
    this.projectiles.length = 0;
    this.fx.length = 0;
    this.afterimages.length = 0;
    this.combo = { side: 0, count: 0, timer: 0 };
    this.callout = null;
    this.ai = null;
    this.superCine = 0;
    this.fighters = [
      new Fighter(this, 'kaito', 0),
      new Fighter(this, 'akane', 1)
    ];
    this.fighters[0].x = 800;
    this.fighters[1].x = 1070;
    this.fighters[0].facing = 1;
    this.fighters[1].facing = -1;
    this.cam.x = 800;
    this.cam.zoom = 1;
    this.matchOver = false;
    this.roundWinner = -1;
    this.matchWinner = -1;
  }

  startMatch(charA, charB, mode = 'cpu') {
    this.mode = mode;
    this.charIds = [charA, charB];
    this.phase = 'intro';
    this.phaseTimer = 0;
    this.round = 1;
    this.wins = [0, 0];
    this.matchOver = false;
    this.matchWinner = -1;
    this.roundWinner = -1;
    this.roundReason = '';
    this.paused = false;
    this.hitstop = 0;
    this.flash = 0;
    this.shake = 0;
    this.projectiles.length = 0;
    this.fx.length = 0;
    this.afterimages.length = 0;
    this.combo = { side: 0, count: 0, timer: 0 };
    this.callout = null;
    this.superCine = 0;
    this.fighters = [
      new Fighter(this, charA, 0),
      new Fighter(this, charB, 1)
    ];
    this.ai = mode === 'cpu' ? new AIController(this, this.fighters[1]) : null;
    this.startRound(true);
  }

  startRound(first = false) {
    this.phase = 'intro';
    this.phaseTimer = 0;
    this.timer = ROUND_FRAMES;
    this.hitstop = 0;
    this.projectiles.length = 0;
    this.fx.length = 0;
    this.afterimages.length = 0;
    this.combo = { side: 0, count: 0, timer: 0 };
    this.callout = null;
    this.roundWinner = -1;
    this.roundReason = '';
    this.flash = 0;
    this.shake = 0;
    this.superCine = 0;
    this.cam.punch = 0;
    for (const f of this.fighters) f.resetForRound();
    if (this.ai) this.ai.reset();
    sound.roundStart();
  }

  // ---------------------------------------------------------------- updates
  update(controls = null) {
    if (this.paused) return;
    this.tick++;
    this.time = this.tick / 60;
    this.updateAmbient();
    this.updateFx();
    this.updateCamera();
    this.flash = Math.max(0, this.flash - 0.055);
    this.shake *= 0.86;
    this.superCine = Math.max(0, this.superCine - 1);
    if (this.callout) {
      this.callout.timer--;
      if (this.callout.timer <= 0) this.callout = null;
    }

    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    if (this.phase === 'attract') {
      this.phaseTimer++;
      this.attractTime += 1 / 60;
      for (const f of this.fighters) f.update({}, new Set());
      return;
    }

    if (this.phase === 'intro') {
      this.phaseTimer++;
      for (const f of this.fighters) f.update({}, new Set());
      if (this.phaseTimer === 70) sound.gong();
      if (this.phaseTimer >= 118) {
        this.phase = 'fight';
        this.phaseTimer = 0;
        sound.fightCall?.();
      }
      return;
    }

    if (this.phase === 'fight') {
      this.updateFight(controls);
      return;
    }

    if (this.phase === 'ko') {
      this.phaseTimer++;
      for (const f of this.fighters) f.update({}, new Set());
      this.limitFighters();
      if (this.phaseTimer === 44 && this.roundWinner >= 0) {
        const winner = this.fighters[this.roundWinner];
        winner.state = 'victory';
        winner.vx = 0;
      }
      if (this.phaseTimer === 1) {
        // impact freeze already applied by the hit that ended the round
      }
      if (this.phaseTimer >= 150) {
        if (this.matchOver) {
          this.phase = 'matchEnd';
          this.phaseTimer = 0;
          this.hooks.onMatchEnd?.({
            winner: this.matchWinner,
            wins: [...this.wins],
            chars: [...this.charIds],
            mode: this.mode,
            round: this.round,
            reason: this.roundReason
          });
        } else {
          if (this.roundWinner >= 0) this.round++;
          this.startRound();
        }
      }
      return;
    }

    if (this.phase === 'matchEnd') {
      this.phaseTimer++;
      for (const f of this.fighters) f.update({}, new Set());
      return;
    }
  }

  updateFight(controls) {
    const empty = { held: {}, pressed: new Set() };
    let c0 = controls?.[0] || empty;
    let c1 = this.mode === 'cpu' && this.ai ? this.ai.control() : controls?.[1] || empty;

    const [a, b] = this.fighters;
    a.update(c0.held || {}, c0.pressed || new Set());
    b.update(c1.held || {}, c1.pressed || new Set());
    this.limitFighters();
    this.updateProjectiles();
    this.resolveMeleeHits();
    this.checkProjectileHits();

    if (this.combo.timer > 0) {
      this.combo.timer--;
      if (this.combo.timer === 0) this.combo.count = 0;
    }

    if (this.phase !== 'fight') return;

    if (this.timer > 0) {
      this.timer--;
      if (this.timer === 0) this.timeOver();
    }
  }

  limitFighters() {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dist = Math.abs(dx);
    const bothGrounded = Math.abs(a.y - b.y) < 120;
    const canPush = bothGrounded && a.state !== 'knockdown' && b.state !== 'knockdown';
    if (canPush && dist < PUSH_DISTANCE) {
      const push = (PUSH_DISTANCE - dist) / 2;
      const dir = dx >= 0 ? 1 : -1;
      a.x -= push * dir;
      b.x += push * dir;
      a.x = clamp(a.x, 225, WORLD_W - 225);
      b.x = clamp(b.x, 225, WORLD_W - 225);
    }
  }

  updateCamera() {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const mid = (a.x + b.x) / 2;
    const dist = Math.abs(a.x - b.x);
    let targetZoom = clamp(1.16 - Math.max(0, dist - 130) / 1200 * 0.16, 1.0, 1.16);
    if (this.superCine > 0) targetZoom += 0.05;
    if (this.phase === 'ko') targetZoom += 0.04;
    if (this.phase === 'attract') {
      this.attractTime += 1 / 60;
      const target = 800 + Math.sin(this.attractTime * 0.16) * 55;
      this.cam.x += (target - this.cam.x) * 0.02;
      this.cam.zoom += (1.02 - this.cam.zoom) * 0.03;
    } else {
      const half = W / 2 / targetZoom;
      const tx = clamp(mid, Math.min(half, WORLD_W / 2), Math.max(WORLD_W - half, WORLD_W / 2));
      this.cam.x += (tx - this.cam.x) * 0.08;
      this.cam.zoom += (targetZoom - this.cam.zoom) * 0.06;
    }
    if (this.cam.punch > 0) this.cam.punch *= 0.9;
    else this.cam.punch = 0;
  }

  updateAmbient() {
    for (const p of this.ambient) {
      p.y += p.speed * (p.kind === 'ember' ? -0.38 : 1);
      p.x += Math.sin(this.time * p.sway + p.phase) * 0.55 - (p.kind === 'petal' ? 0.28 : 0.05);
      p.angle += p.spin;
      if (p.kind === 'petal' && p.y > GROUND + 90) {
        p.y = -80;
        p.x = Math.random() * WORLD_W;
      }
      if (p.kind === 'ember' && p.y < -60) {
        p.y = GROUND - 20;
        p.x = 100 + Math.random() * (WORLD_W - 200);
      }
      if (p.x < -120) p.x = WORLD_W + 80;
      if (p.x > WORLD_W + 120) p.x = -80;
    }
  }

  updateFx() {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const e = this.fx[i];
      e.life--;
      e.x += e.vx || 0;
      e.y += e.vy || 0;
      if (e.grav) e.vy += e.grav;
      e.rot = (e.rot || 0) + (e.spin || 0);
      if (e.life <= 0) this.fx.splice(i, 1);
    }
    if (this.fx.length > 520) this.fx.splice(0, this.fx.length - 520);
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life--;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.tick++;
      p.x += p.vx;
      p.life--;
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > (p.super ? 18 : 10)) p.trail.pop();
      if (p.life <= 0 || p.x < -260 || p.x > WORLD_W + 260) this.projectiles.splice(i, 1);
    }
  }

  updateProjectiles() {
    // collision between opposing projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      const a = this.projectiles[i];
      if (!a || a.dead) continue;
      for (let j = i + 1; j < this.projectiles.length; j++) {
        const b = this.projectiles[j];
        if (!b || b.dead || a.owner === b.owner) continue;
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
          if (a.super && !b.super) { b.dead = true; this.spark(b.x, b.y, b.color, 1.4); continue; }
          if (b.super && !a.super) { a.dead = true; this.spark(a.x, a.y, a.color, 1.4); continue; }
          a.dead = true; b.dead = true;
          this.spark((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffe6ad', 2.2);
          this.ring((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffdda0', 1.4);
          this.shake = Math.max(this.shake, 9);
          sound.block();
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  resolveMeleeHits() {
    if (this.phase !== 'fight') return;
    for (const attacker of this.fighters) {
      const defender = attacker.opponent;
      if (attacker.state !== 'attack' || !attacker.move) continue;
      const move = attacker.move;
      if (move.projectile) continue;
      if (defender.invuln > 0 || defender.state === 'knockdown') continue;
      const box = attacker.getHitbox();
      if (!box) continue;
      if (move.multi) {
        if (attacker.hitCount >= move.maxHits) continue;
        if (this.tick < attacker.hitNext) continue;
      } else if (attacker.hitTargets.has(defender.index)) continue;

      const hurt = defender.getHurtbox();
      if (!within(box, hurt)) continue;

      const cx = box.x + box.w / 2;
      const cy = hurt.y + hurt.h * 0.38;
      const contactX = attacker.facing > 0 ? box.x + box.w * 0.7 : box.x + box.w * 0.3;
      this.applyHit(attacker, defender, move, contactX, cy, attacker.facing);
      if (move.multi) {
        attacker.hitNext = this.tick + move.multi;
        attacker.hitCount++;
        if (attacker.hitCount >= move.maxHits) attacker.hitTargets.add(defender.index);
      } else {
        attacker.hitTargets.add(defender.index);
      }
    }
  }

  checkProjectileHits() {
    if (this.phase !== 'fight') return;
    for (const p of this.projectiles) {
      if (p.dead) continue;
      const defender = this.fighters[1 - p.owner];
      if (defender.invuln > 0 || defender.state === 'knockdown') continue;
      const hurt = defender.getHurtbox();
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      if (!within(box, hurt)) continue;
      const attacker = this.fighters[p.owner];
      this.applyHit(attacker, defender, p.move, clamp(p.x, hurt.x, hurt.x + hurt.w), p.y, Math.sign(p.vx) || p.dir);
      p.dead = true;
      if (p.super) this.screenFlash('#fff3d4', 0.9);
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  applyHit(attacker, defender, move, x, y, dir) {
    if (!attacker || !defender) return;
    if (defender.state === 'knockdown' || defender.invuln > 0) return;

    const canBlock = defender.blocking && defender.grounded &&
      ['idle', 'walk', 'crouch', 'blockstun'].includes(defender.state) &&
      !(move.low && !defender.crouching) && defender.state !== 'hit';

    if (canBlock) {
      const chip = move.chip || 0;
      defender.health = Math.max(0, defender.health - chip);
      defender.state = 'blockstun';
      defender.stateTimer = move.blockstun;
      defender.vx = dir * (move.knockback * 0.55 + 1);
      defender.blocking = true;
      defender.crouching = move.low ? true : defender.crouching;
      defender.flash = Math.max(defender.flash, 0.4);
      attacker.addSpirit(move.meter * 0.42);
      defender.addSpirit(move.meter * 0.5);
      this.hitstop = Math.max(this.hitstop, Math.min(6, move.hitstop));
      this.spark(x, y, '#bde9ff', 0.8, true);
      this.ring(x, y, '#9fd8ff', 0.7);
      this.shake = Math.max(this.shake, 3);
      sound.block();
      if (defender.health <= 0) this.triggerKO(attacker.index);
      return;
    }

    const wasStunned = defender.state === 'hit' || defender.state === 'knockdown';
    const sameSide = this.combo.timer > 0 && this.combo.side === attacker.index;
    const comboCount = wasStunned && sameSide ? this.combo.count + 1 : 1;
    const comboScale = Math.max(0.52, 1 - Math.max(0, comboCount - 1) * 0.075);
    const damage = move.damage * comboScale;
    defender.health = Math.max(0, defender.health - damage);
    defender.state = move.knockdown ? 'knockdown' : 'hit';
    defender.stateTimer = move.hitstun;
    defender.crouching = defender.crouching && move.low;
    defender.blocking = false;
    defender.move = null;
    defender.attackFrame = 0;
    defender.spinAngle = 0;
    defender.flash = 1;
    defender.vx = dir * move.knockback;
    if (move.knockdown) {
      defender.grounded = false;
      defender.y -= 1;
      defender.vy = move.id === 'super' ? -9.5 : move.id === 's2' ? -7.8 : -3.4;
    }
    defender.hitFlashColor = move.superBeam ? '#ffd9a0' : '#ffffff';

    attacker.combo = comboCount;
    this.combo = { side: attacker.index, count: comboCount, timer: 88 };

    attacker.addSpirit(move.meter);
    defender.addSpirit(move.meter * 0.65);

    this.hitstop = Math.max(this.hitstop, move.hitstop);
    this.shake = Math.max(this.shake, move.shake);
    this.spark(x, y, move.id === 'super' ? '#ffdf9b' : this.fighters[attacker.index].char.colors.aura2, 1 + move.damage / 12);
    this.ring(x, y, move.id === 'super' ? '#ffdd9a' : '#fff3c8', 0.8 + move.damage / 18);
    this.cameraPunch(1 + Math.min(0.07, move.damage / 240), 10);
    if (move.damage >= 12) this.screenFlash('#fff1d0', 0.24);
    sound.hit(Math.min(2, 0.8 + move.damage / 14));

    if (defender.health <= 0) {
      this.triggerKO(attacker.index);
    }
  }

  spawnProjectile(owner, move) {
    const superBeam = Boolean(move.superBeam);
    const p = {
      owner: owner.index,
      charId: owner.charId,
      x: owner.x + owner.facing * (superBeam ? 120 : 82),
      y: owner.y - (superBeam ? 116 : 108),
      vx: owner.facing * (superBeam ? 15.5 : 10.8),
      dir: owner.facing,
      w: superBeam ? 180 : 46,
      h: superBeam ? 128 : 46,
      radius: superBeam ? 58 : 17,
      damage: move.damage,
      move,
      super: superBeam,
      color: owner.char.colors.projectile,
      color2: owner.char.colors.projectile2,
      life: superBeam ? 145 : 190,
      tick: 0,
      trail: [],
      dead: false
    };
    this.projectiles.push(p);
    if (superBeam) {
      sound.super();
      this.screenFlash(owner.char.colors.aura2, 0.65);
      this.shake = Math.max(this.shake, 14);
    } else {
      sound.fireball();
      this.spark(p.x, p.y, p.color2, 1.1);
      this.shake = Math.max(this.shake, 3);
    }
  }

  timeOver() {
    if (this.phase !== 'fight') return;
    const [a, b] = this.fighters;
    let winner = -1;
    if (a.health > b.health + 0.5) winner = 0;
    else if (b.health > a.health + 0.5) winner = 1;
    this.phase = 'ko';
    this.phaseTimer = 0;
    this.roundReason = 'TIME';
    this.roundWinner = winner;
    this.matchOver = false;
    if (winner >= 0) {
      this.wins[winner]++;
      this.matchOver = this.wins[winner] >= 2;
      this.matchWinner = this.matchOver ? winner : -1;
      this.fighters[winner].state = 'victory';
    }
    this.shake = 10;
    this.screenFlash('#ffdda0', 0.3);
    sound.gong();
  }

  triggerKO(winner) {
    if (this.phase !== 'fight') return;
    if (winner < 0) return;
    this.phase = 'ko';
    this.phaseTimer = 0;
    this.roundReason = 'KO';
    this.roundWinner = winner;
    this.wins[winner]++;
    this.matchOver = this.wins[winner] >= 2;
    this.matchWinner = this.matchOver ? winner : -1;
    const loser = this.fighters[1 - winner];
    loser.health = 0;
    loser.state = 'knockdown';
    loser.stateTimer = 999;
    loser.grounded = false;
    loser.vy = -8.5;
    loser.vx = (loser.x - this.fighters[winner].x > 0 ? 1 : -1) * 9;
    this.hitstop = 16;
    this.flash = 1;
    this.flashColor = '#ffffff';
    this.shake = 24;
    this.cam.punch = 0.12;
    this.superCine = 30;
    this.spark(loser.x, loser.y - 110, '#fff6d8', 3.2);
    this.ring(loser.x, loser.y - 100, '#ffd48a', 2.8);
    this.ring(loser.x, loser.y - 100, '#ff6a5f', 1.9);
    this.fighters[winner].combo = this.combo.count;
    sound.ko();
  }

  onSpiritFull(fighter) {
    sound.superReady();
    fighter.readyPulse = 1;
    this.fx.push({
      type: 'auraRing', x: fighter.x, y: fighter.y - 92, vx: 0, vy: 0,
      life: 40, maxLife: 40, color: fighter.char.colors.aura2, size: 120, rot: 0, spin: 0
    });
  }

  onSuperStart(fighter) {
    this.superCine = 60;
    this.screenFlash(fighter.char.colors.aura, 0.55);
    this.shake = Math.max(this.shake, 12);
    sound.super();
    this.showCallout(fighter.char.superName, 'SUPER ART', fighter.char.colors.accent2, fighter.index, true);
    fighter.spirit = 0;
    this.cam.punch = 0.1;
  }

  showCallout(text, sub, color, side = 0, big = false) {
    this.callout = { text, sub, color, side, timer: big ? 110 : 74, max: big ? 110 : 74, big };
  }

  cameraPunch(zoom, frames) {
    this.cam.punch = Math.max(this.cam.punch, zoom - 1);
    this.cam.punchTimer = frames;
  }

  screenFlash(color, amount = 0.5) {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  }

  dust(x, y, dir = 1, count = 5) {
    for (let i = 0; i < count; i++) {
      this.fx.push({
        type: 'dust', x: x + rand(-14, 14), y: y - rand(0, 8),
        vx: -dir * rand(1.2, 4.5) + rand(-0.5, 0.5), vy: rand(-1.6, -0.2),
        life: Math.floor(rand(18, 30)), maxLife: 30, size: rand(8, 18),
        color: '#c9b08b', rot: rand(0, 6), spin: rand(-0.05, 0.05)
      });
    }
  }

  spark(x, y, color, power = 1, block = false) {
    const n = Math.floor(8 + power * 7);
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, Math.PI);
      const sp = rand(2, 6 + power * 4);
      this.fx.push({
        type: block ? 'shard' : 'spark',
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: Math.floor(rand(12, 26)), maxLife: 26, size: rand(2, 5) * (1 + power * 0.3),
        color, rot: a, spin: rand(-0.2, 0.2), grav: 0.16
      });
    }
    this.fx.push({
      type: 'flash', x, y, vx: 0, vy: 0,
      life: 7, maxLife: 7, size: (block ? 22 : 34) * power, color, rot: rand(0, 6), spin: 0
    });
  }

  ring(x, y, color, power = 1) {
    this.fx.push({
      type: 'ring', x, y, vx: 0, vy: 0,
      life: 18, maxLife: 18, size: 18 * power, color, rot: 0, spin: 0
    });
    this.fx.push({
      type: 'star', x, y, vx: 0, vy: 0,
      life: 13, maxLife: 13, size: 34 * power, color, rot: rand(0, 2), spin: 0.04
    });
  }

  addAfterimage(fighter, alpha = 0.45) {
    // Add every other frame at most.
    if (this.afterimages.length > 26) this.afterimages.shift();
    this.afterimages.push({
      x: fighter.x, y: fighter.y, facing: fighter.facing,
      charId: fighter.charId, pose: clonePose(fighter.pose),
      spinAngle: fighter.spinAngle, life: 12, maxLife: 12,
      alpha, color: fighter.char.colors.aura,
      crouching: fighter.crouching, state: fighter.state
    });
  }

  setPaused(paused) {
    if (paused && !this.paused) {
      this.paused = true;
      this.pausedPhase = this.phase;
    } else if (!paused && this.paused) {
      this.paused = false;
      this.pausedPhase = null;
    }
  }

  // ---------------------------------------------------------------- helpers
  get activeFighters() { return this.fighters; }
  get timerSeconds() { return Math.ceil(this.timer / 60); }
}

export { AIController };
