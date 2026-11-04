// ---------------------------------------------------------------------------
// A tiny procedural audio engine — taiko, shamisen, and a lot of impacts.
// No samples, no downloads. Everything is synthesized on first interaction.
// ---------------------------------------------------------------------------

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.muted = false;
    this.ready = false;
    this.nextStep = 0;
    this.step = 0;
    this.stepDur = 0.192;
    this._timer = null;
    this._noise = null;
    this._drone = [];
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.62;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 4.5;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    const sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);
    this.sfx = sfx;

    const music = ctx.createGain();
    music.gain.value = 0.16;
    music.connect(master);
    this.music = music;

    // white noise source buffer
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;

    this.ready = true;
    this.startDrone();
    this.nextStep = ctx.currentTime + 0.25;
    this._timer = setInterval(() => this.scheduleMusic(), 120);
    if (ctx.state === 'suspended') ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.62, this.ctx.currentTime + 0.2);
    }
    try { localStorage.setItem('sb-muted', muted ? '1' : '0'); } catch {}
  }

  startDrone() {
    const ctx = this.ctx;
    const notes = [55, 82.41, 110];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * 5;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      filter.Q.value = 2.2;
      const gain = ctx.createGain();
      gain.gain.value = i === 2 ? 0.012 : 0.018;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.023;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 130;
      lfo.connect(lfoGain).connect(filter.frequency);
      osc.connect(filter).connect(gain).connect(this.music);
      osc.start();
      lfo.start();
      this._drone.push(osc, lfo);
    });
  }

  scheduleMusic() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const lookahead = ctx.currentTime + 0.35;
    while (this.nextStep < lookahead) {
      this.playStep(this.step, this.nextStep);
      this.step = (this.step + 1) % 32;
      this.nextStep += this.stepDur;
    }
  }

  playStep(step, when) {
    const ctx = this.ctx;
    // low taiko on the 1 and the and-of-3
    if ([0, 6, 12, 20, 26].includes(step)) this.taiko(when, step === 0 ? 1 : 0.6);
    // rim clicks
    if ([4, 10, 18, 22, 30].includes(step)) this.rim(when, 0.18);
    // shamisen arpeggio, sparse and mournful
    const melody = {
      0: 293.66, 3: 349.23, 7: 392.0, 10: 440.0, 14: 523.25,
      16: 392.0, 19: 349.23, 23: 293.66, 27: 261.63, 30: 220.0
    };
    if (melody[step]) this.pluck(melody[step], when, 0.09);
    // low pulse
    if (step === 8 || step === 24) this.bassNote(55, when, 1.1, 0.045);
  }

  taiko(when, vel = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(118 * (0.9 + vel * 0.1), when);
    osc.frequency.exponentialRampToValueAtTime(44, when + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.22 * vel, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
    osc.connect(g).connect(this.music);
    osc.start(when); osc.stop(when + 0.4);

    const n = ctx.createBufferSource();
    n.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.08 * vel, when);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
    n.connect(f).connect(ng).connect(this.music);
    n.start(when); n.stop(when + 0.16);
  }

  rim(when, vel) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    n.connect(f).connect(g).connect(this.music);
    n.start(when); n.stop(when + 0.06);
  }

  pluck(freq, when, vel) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 1.004;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, when);
    f.frequency.exponentialRampToValueAtTime(500, when + 0.8);
    osc.connect(f); osc2.connect(f); f.connect(g).connect(this.music);
    osc.start(when); osc2.start(when);
    osc.stop(when + 1); osc2.stop(when + 1);
  }

  bassNote(freq, when, dur, vel) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(f).connect(g).connect(this.music);
    osc.start(when); osc.stop(when + dur + 0.05);
  }

  // ------------------------------------------------------------- sfx
  tone(freq, dur, type, vol, slide, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  noise(dur, vol, freq, type = 'lowpass', delay = 0, q = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t); src.stop(t + dur + 0.02);
  }

  sweepNoise(dur, vol, f0, f1, type = 'bandpass', delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = 1.4;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t); src.stop(t + dur + 0.02);
  }

  punch() {
    this.tone(155, 0.13, 'sine', 0.5, 52);
    this.noise(0.08, 0.3, 1200, 'bandpass', 0, 2);
  }
  kick() {
    this.tone(118, 0.19, 'sine', 0.58, 40);
    this.noise(0.13, 0.34, 760, 'bandpass', 0, 1.4);
  }
  sweep() { this.sweepNoise(0.19, 0.22, 1400, 260, 'bandpass'); this.tone(90, 0.16, 'sine', 0.35, 42); }
  hit(power = 1) {
    const p = clamp(power, 0.6, 2);
    this.tone(92 * p, 0.14, 'sine', 0.55, 38);
    this.noise(0.11, 0.36 * p, 1000, 'bandpass', 0, 1.2);
    this.noise(0.05, 0.22, 3600, 'highpass');
  }
  block() {
    this.tone(1900, 0.07, 'square', 0.12, 900);
    this.noise(0.06, 0.2, 2600, 'bandpass', 0, 3);
  }
  whoosh() { this.sweepNoise(0.14, 0.12, 3400, 700, 'bandpass'); }
  fireball() {
    this.sweepNoise(0.4, 0.22, 500, 2400, 'bandpass');
    this.tone(190, 0.3, 'sawtooth', 0.16, 520);
    this.tone(95, 0.4, 'sine', 0.18, 60);
  }
  uppercut() {
    this.sweepNoise(0.28, 0.2, 500, 3800, 'bandpass');
    this.tone(140, 0.26, 'square', 0.16, 420);
  }
  spin() { this.sweepNoise(0.36, 0.22, 600, 2600, 'bandpass'); }
  super() {
    this.tone(48, 0.8, 'sine', 0.55, 28);
    this.sweepNoise(0.75, 0.3, 300, 5000, 'bandpass');
    this.tone(220, 0.6, 'sawtooth', 0.2, 880);
    this.tone(330, 0.7, 'square', 0.1, 1100, 0.08);
  }
  ko() {
    this.tone(55, 0.9, 'sine', 0.6, 24);
    this.noise(0.7, 0.4, 300, 'lowpass');
    this.tone(220, 1.1, 'triangle', 0.12, 110, 0.08);
    this.sweepNoise(0.5, 0.2, 2600, 200, 'bandpass', 0.02);
  }
  gong() {
    this.tone(196, 1.5, 'sine', 0.22, 190);
    this.tone(293.66, 1.3, 'sine', 0.12, 293);
    this.tone(392, 1.1, 'sine', 0.08, 391);
    this.noise(0.28, 0.14, 1800, 'bandpass');
  }
  roundStart() {
    this.gong();
    this.tone(98, 0.8, 'sine', 0.3, 48, 0.02);
  }
  fightCall() {
    this.taiko(this.ctx ? this.ctx.currentTime : 0, 1);
    this.tone(146.83, 0.5, 'sawtooth', 0.12, 293.66);
    this.sweepNoise(0.3, 0.16, 400, 2800, 'bandpass');
  }
  superReady() {
    this.tone(523.25, 0.3, 'triangle', 0.16, 784);
    this.tone(784, 0.5, 'sine', 0.1, 1046, 0.09);
  }
  ui() { this.tone(660, 0.05, 'triangle', 0.1, 880); }
  uiBack() { this.tone(440, 0.07, 'triangle', 0.09, 300); }
  jump() { this.sweepNoise(0.12, 0.1, 900, 2400, 'bandpass'); }
  land() { this.tone(80, 0.1, 'sine', 0.2, 40); this.noise(0.09, 0.14, 500); }
}

export const sound = new SoundEngine();
