// ---------------------------------------------------------------------------
// Shadow Blossom — app shell, input, menus, main loop
// ---------------------------------------------------------------------------

import { W, H, CHARACTERS } from './data.js';
import { Game } from './game.js';
import { renderGame } from './render.js';
import { renderPortrait } from './fighter-art.js';
import { sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

const P1_BINDINGS = {
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  KeyJ: 'punch', KeyK: 'kick',
  KeyU: 's1', KeyI: 's2', KeyO: 's3',
  Space: 'super'
};
const P2_BINDINGS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Numpad1: 'punch', Numpad2: 'kick',
  Numpad4: 's1', Numpad5: 's2', Numpad6: 's3',
  Numpad0: 'super', Numpad3: 'super',
  // Numpad-less laptop fallback for player 2
  Comma: 'punch', Period: 'kick',
  Semicolon: 's1', Quote: 's2', Slash: 's3',
  Backslash: 'super'
};

class Controller {
  constructor(bindings) {
    this.bindings = bindings;
    this.sources = new Map();
    this.pressed = new Set();
  }

  down(action, source) {
    if (!this.sources.has(action)) this.sources.set(action, new Set());
    const set = this.sources.get(action);
    if (set.has(source)) return;
    const wasEmpty = set.size === 0;
    set.add(source);
    if (wasEmpty) this.pressed.add(action);
  }

  up(action, source) {
    const set = this.sources.get(action);
    if (!set) return;
    set.delete(source);
  }

  clear() {
    this.sources.clear();
    this.pressed.clear();
  }

  held() {
    const out = {};
    for (const action of this.sources.keys()) {
      out[action] = this.sources.get(action).size > 0;
    }
    return out;
  }

  consume() {
    const pressed = this.pressed;
    this.pressed = new Set();
    return { held: this.held(), pressed };
  }
}

const controllers = [new Controller(P1_BINDINGS), new Controller(P2_BINDINGS)];
const actionByCode = [P1_BINDINGS, P2_BINDINGS];

// ---------------------------------------------------------------------------
// game setup
// ---------------------------------------------------------------------------
let view = 'title';
let mode = 'cpu';
let p1pick = null;
let p2pick = null;
let fightActive = false;
let hintTimer = 0;
let lastResult = null;
let startingMatch = false;

const game = new Game(canvas, {
  onMatchEnd: (result) => {
    lastResult = result;
    fightActive = false;
    $('pause-btn').classList.add('hidden');
    $('hint-bar').classList.remove('show');
    showResult(result);
  }
});

// ---------------------------------------------------------------------------
// canvas sizing
// ---------------------------------------------------------------------------
let dpr = 1;
function resizeCanvas() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
let audioTouched = false;
function touchAudio() {
  if (audioTouched) return;
  audioTouched = true;
  sound.init();
}

const gameCodes = new Set([
  ...Object.keys(P1_BINDINGS), ...Object.keys(P2_BINDINGS),
  'Escape', 'KeyP'
]);

window.addEventListener('keydown', (e) => {
  touchAudio();
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;

  if (view === 'title') {
    if (e.code === 'Enter') { e.preventDefault(); openSelect('cpu'); return; }
    if (e.code === 'Digit2') { e.preventDefault(); openSelect('local'); return; }
    if (e.code === 'Escape') return;
  }
  if (view === 'how' && e.code === 'Escape') { e.preventDefault(); closeHow(); return; }
  if (view === 'select') {
    if (e.code === 'Escape') { e.preventDefault(); backFromSelect(); return; }
    if (e.code === 'Digit1') { e.preventDefault(); chooseFighter('kaito'); return; }
    if (e.code === 'Digit2') { e.preventDefault(); chooseFighter('akane'); return; }
  }
  if (view === 'pause') {
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); resumeGame(); return; }
  }
  if (view === 'result') {
    if (e.code === 'Enter') { e.preventDefault(); rematch(); return; }
    if (e.code === 'Escape') { e.preventDefault(); goTitle(); return; }
  }

  if (view === 'game' && (e.code === 'Escape' || e.code === 'KeyP') && fightActive) {
    e.preventDefault();
    pauseGame();
    return;
  }

  for (let i = 0; i < 2; i++) {
    const action = actionByCode[i][e.code];
    if (!action) continue;
    e.preventDefault();
    if (e.repeat) return;
    if (view === 'game' && fightActive) controllers[i].down(action, 'kbd');
  }
}, { passive: false });

window.addEventListener('keyup', (e) => {
  for (let i = 0; i < 2; i++) {
    const action = actionByCode[i][e.code];
    if (action) controllers[i].up(action, 'kbd');
  }
});

window.addEventListener('blur', () => {
  if (view === 'game' && fightActive && !game.paused) pauseGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && view === 'game' && fightActive && !game.paused) pauseGame();
});

// touch buttons
const touchPointers = new Map();
document.querySelectorAll('.tbtn[data-action]').forEach((btn) => {
  const action = btn.dataset.action;
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touchAudio();
    if (view !== 'game' || !fightActive) return;
    const source = `t${e.pointerId}`;
    touchPointers.set(e.pointerId, { action, btn, source });
    controllers[0].down(action, source);
    btn.classList.add('active');
    try { btn.setPointerCapture(e.pointerId); } catch {}
  });
  const release = (e) => {
    const rec = touchPointers.get(e.pointerId);
    if (!rec) return;
    controllers[0].up(rec.action, rec.source);
    rec.btn.classList.remove('active');
    touchPointers.delete(e.pointerId);
  };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
});

// pause any held touch keys when leaving a match
function releaseAllTouch() {
  for (const rec of touchPointers.values()) {
    controllers[0].up(rec.action, rec.source);
    rec.btn.classList.remove('active');
  }
  touchPointers.clear();
}

// ---------------------------------------------------------------------------
// menus
// ---------------------------------------------------------------------------
const screenEls = {
  title: $('title-screen'),
  select: $('select-screen'),
  how: $('how-screen'),
  pause: $('pause-screen'),
  result: $('result-screen')
};

function hideScreens() {
  Object.values(screenEls).forEach((el) => el.classList.add('hidden'));
}
function showScreen(name) {
  hideScreens();
  if (screenEls[name]) screenEls[name].classList.remove('hidden');
  document.body.classList.remove('in-game');
  view = name;
}

function refreshMenuSound() {
  const btn = $('sound-btn');
  btn.classList.toggle('muted', sound.muted);
  btn.querySelector('.icon-sound').textContent = sound.muted ? '×' : '♪';
  btn.setAttribute('aria-label', sound.muted ? 'Enable sound' : 'Mute sound');
}

function initSoundState() {
  let muted = false;
  try { muted = localStorage.getItem('sb-muted') === '1'; } catch {}
  sound.muted = muted;
  refreshMenuSound();
}

initSoundState();
$('pause-btn').classList.add('hidden');

function openSelect(selectedMode) {
  mode = selectedMode;
  p1pick = null;
  p2pick = null;
  startingMatch = false;
  updateSelectUI();
  showScreen('select');
  sound.ui();
}

function updateSelectUI() {
  const cards = document.querySelectorAll('.fighter-card');
  cards.forEach((card) => {
    card.classList.remove('selected');
    card.querySelector('.card-tag-p1').classList.add('hidden');
    card.querySelector('.card-tag-p2').classList.add('hidden');
  });

  const eyebrow = $('select-eyebrow');
  const title = $('select-title');
  const sub = $('select-subtitle');

  if (mode === 'local') {
    if (!p1pick) {
      eyebrow.textContent = 'LOCAL DUEL · PLAYER 1';
      title.textContent = 'CHOOSE YOUR WARRIOR';
      sub.textContent = 'Player 1 — pick your fighter, then pass the keyboard.';
    } else {
      eyebrow.textContent = 'LOCAL DUEL · PLAYER 2';
      title.textContent = 'PLAYER 2 — CHOOSE';
      sub.textContent = `${CHARACTERS[p1pick].name} awaits. Pick a rival.`;
      const card = document.querySelector(`.fighter-card[data-char="${p1pick}"]`);
      if (card) {
        card.classList.add('selected');
        card.querySelector('.card-tag-p1').classList.remove('hidden');
      }
    }
  } else {
    eyebrow.textContent = 'ARCADE DUEL';
    title.textContent = 'CHOOSE YOUR WARRIOR';
    sub.textContent = 'Pick a fighter and step onto the veranda.';
    if (p1pick) {
      const card = document.querySelector(`.fighter-card[data-char="${p1pick}"]`);
      if (card) {
        card.classList.add('selected');
        card.querySelector('.card-tag-p1').classList.remove('hidden');
      }
    }
  }
}

function chooseFighter(charId) {
  if (startingMatch) return;
  sound.ui();
  if (mode === 'cpu') {
    p1pick = charId;
    p2pick = charId === 'kaito' ? 'akane' : 'kaito';
    updateSelectUI();
    startingMatch = true;
    window.setTimeout(beginMatch, 160);
    return;
  }

  if (!p1pick) {
    p1pick = charId;
    updateSelectUI();
    return;
  }
  p2pick = charId;
  const card = document.querySelector(`.fighter-card[data-char="${p2pick}"]`);
  if (card) card.querySelector('.card-tag-p2').classList.remove('hidden');
  startingMatch = true;
  window.setTimeout(beginMatch, 200);
}

function backFromSelect() {
  sound.uiBack();
  startingMatch = false;
  if (mode === 'local' && p1pick) {
    p1pick = null;
    updateSelectUI();
    return;
  }
  goTitle();
}

function beginMatch() {
  if (!p1pick || !p2pick) { startingMatch = false; return; }
  startingMatch = false;
  releaseAllTouch();
  controllers.forEach((c) => c.clear());
  hideScreens();
  view = 'game';
  document.body.classList.add('in-game');
  fightActive = true;
  game.setPaused(false);
  game.startMatch(p1pick, p2pick, mode);
  $('pause-btn').classList.remove('hidden');
  $('hint-bar').classList.add('show');
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => $('hint-bar').classList.remove('show'), 7200);
  updateTouchLabels(p1pick);
  lastResult = null;
}

function updateTouchLabels(charId) {
  const c = CHARACTERS[charId];
  $('sp1-name').textContent = c.specials[0].short;
  $('sp2-name').textContent = c.specials[1].short;
  $('sp3-name').textContent = c.specials[2].short;
  const buttons = document.querySelectorAll('.tbtn.sp');
  const colors = c.specials.map((s) => s.color);
  buttons.forEach((b, i) => {
    b.style.borderColor = hexA(colors[i], 0.5);
    b.style.boxShadow = `0 0 16px ${hexA(colors[i], 0.16)}`;
  });
  const superBtn = document.querySelector('.tbtn.super');
  if (superBtn) superBtn.style.borderColor = hexA(c.accent2, 0.6);
}

function hexA(hex, a) {
  if (typeof hex !== 'string') return `rgba(255,255,255,${a})`;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function goTitle() {
  releaseAllTouch();
  controllers.forEach((c) => c.clear());
  fightActive = false;
  lastResult = null;
  hideScreens();
  game.startAttract();
  game.setPaused(false);
  showScreen('title');
  $('pause-btn').classList.add('hidden');
  $('hint-bar').classList.remove('show');
  p1pick = null;
  p2pick = null;
  sound.uiBack();
}

// ---------------------------------------------------------------------------
// pause
// ---------------------------------------------------------------------------
function pauseGame() {
  if (!fightActive || game.paused) return;
  game.setPaused(true);
  releaseAllTouch();
  controllers.forEach((c) => c.clear());
  $('hint-bar').classList.remove('show');
  showScreen('pause');
  sound.ui();
}

function resumeGame() {
  game.setPaused(false);
  hideScreens();
  view = 'game';
  document.body.classList.add('in-game');
  controllers.forEach((c) => c.clear());
  releaseAllTouch();
  sound.uiBack();
}

function restartMatch() {
  if (!p1pick || !p2pick) return;
  game.setPaused(false);
  hideScreens();
  view = 'game';
  document.body.classList.add('in-game');
  fightActive = true;
  game.startMatch(p1pick, p2pick, mode);
  controllers.forEach((c) => c.clear());
  releaseAllTouch();
  $('pause-btn').classList.remove('hidden');
  $('hint-bar').classList.add('show');
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => $('hint-bar').classList.remove('show'), 7200);
  lastResult = null;
  sound.ui();
}

// ---------------------------------------------------------------------------
// results
// ---------------------------------------------------------------------------
function showResult(result) {
  releaseAllTouch();
  const winnerChar = CHARACTERS[result.chars[result.winner]];
  const loserIndex = 1 - result.winner;
  $('result-eyebrow').textContent = mode === 'local' ? 'LOCAL DUEL COMPLETE' : 'ARCADE DUEL COMPLETE';
  $('result-winner').textContent = winnerChar.name;
  let sub = 'VICTORY';
  if (mode === 'local') sub = `PLAYER ${result.winner + 1} WINS`;
  else if (result.winner === 1) sub = 'DEFEAT';
  $('result-sub').textContent = sub;
  $('result-score').textContent = `${result.wins[result.winner]} — ${result.wins[loserIndex]}`;
  $('result-quote').textContent = winnerChar.quote;
  showScreen('result');
  sound.gong();
}

function rematch() {
  if (!lastResult) { goTitle(); return; }
  hideScreens();
  view = 'game';
  document.body.classList.add('in-game');
  fightActive = true;
  game.setPaused(false);
  game.startMatch(lastResult.chars[0], lastResult.chars[1], mode);
  p1pick = lastResult.chars[0];
  p2pick = lastResult.chars[1];
  controllers.forEach((c) => c.clear());
  $('pause-btn').classList.remove('hidden');
  $('hint-bar').classList.add('show');
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => $('hint-bar').classList.remove('show'), 7200);
  updateTouchLabels(p1pick);
  sound.ui();
}

// ---------------------------------------------------------------------------
// how to play
// ---------------------------------------------------------------------------
function openHow() {
  showScreen('how');
  sound.ui();
}
function closeHow() {
  showScreen('title');
  sound.uiBack();
}

// ---------------------------------------------------------------------------
// menu wiring
// ---------------------------------------------------------------------------
$('btn-cpu').addEventListener('click', () => openSelect('cpu'));
$('btn-local').addEventListener('click', () => openSelect('local'));
$('btn-how').addEventListener('click', openHow);
$('how-close').addEventListener('click', closeHow);
$('select-back').addEventListener('click', backFromSelect);
document.querySelectorAll('.fighter-card').forEach((card) => {
  card.addEventListener('click', () => chooseFighter(card.dataset.char));
});
$('pause-btn').addEventListener('click', pauseGame);
$('btn-resume').addEventListener('click', resumeGame);
$('btn-restart').addEventListener('click', restartMatch);
$('btn-quit').addEventListener('click', () => {
  hideScreens();
  view = 'game';
  fightActive = true;
  resumeGame();
  goTitle();
});
$('btn-rematch').addEventListener('click', rematch);
$('btn-change').addEventListener('click', () => {
  hideScreens();
  game.startAttract();
  p1pick = null;
  p2pick = null;
  updateSelectUI();
  showScreen('select');
  sound.ui();
});
$('btn-title').addEventListener('click', goTitle);
$('sound-btn').addEventListener('click', () => {
  touchAudio();
  sound.setMuted(!sound.muted);
  refreshMenuSound();
});

// ---------------------------------------------------------------------------
// portraits
// ---------------------------------------------------------------------------
document.querySelectorAll('canvas[data-preview]').forEach((el) => {
  const id = el.dataset.preview;
  try { renderPortrait(el, id); } catch (err) { console.error('portrait failed', id, err); }
});

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------
let last = performance.now();
let acc = 0;
const STEP = 1000 / 60;
let superReady = [false, false];

function frame(now) {
  const dt = Math.min(90, now - last);
  last = now;

  if (!game.paused) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      let c0;
      let c1;
      if (view === 'game' && fightActive) {
        c0 = controllers[0].consume();
        c1 = controllers[1].consume();
      } else {
        c0 = { held: {}, pressed: new Set() };
        c1 = { held: {}, pressed: new Set() };
        controllers[0].consume();
        controllers[1].consume();
      }
      game.update([c0, c1]);
      acc -= STEP;
      steps++;
    }
    if (steps >= 5) acc = 0;
  } else {
    acc = 0;
  }

  // super-ready pulse on the touch control
  const p1 = game.fighters[0];
  const ready = Boolean(p1 && p1.spirit >= 100);
  if (ready !== superReady[0]) {
    superReady[0] = ready;
    const btn = document.querySelector('.tbtn.super');
    if (btn) btn.classList.toggle('ready', ready);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderGame(ctx, game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Useful for automated checks and tinkering.
window.__SB = {
  game,
  controllers,
  get view() { return view; },
  startMatch: (a, b, m = 'cpu') => {
    p1pick = a;
    p2pick = b;
    mode = m;
    beginMatch();
  },
  goTitle,
  // Deterministic stepping for automated visual checks (rAF is throttled
  // while the browser window is in the background).
  step: (frames = 1, held = {}, pressed = []) => {
    const buttons = Array.isArray(pressed) ? pressed : [...pressed];
    for (let i = 0; i < frames; i++) {
      const p = i === 0 ? new Set(buttons) : new Set();
      game.update([{ held, pressed: p }, { held: {}, pressed: new Set() }]);
    }
    renderGame(ctx, game);
  },
  tick: (frames = 1) => {
    for (let i = 0; i < frames; i++) {
      game.update([controllers[0].consume(), controllers[1].consume()]);
    }
    renderGame(ctx, game);
  },
  render: () => renderGame(ctx, game)
};
