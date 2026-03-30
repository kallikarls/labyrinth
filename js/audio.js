/**
 * audio.js — Procedural sound effects using the Web Audio API.
 * No external files needed — all sounds are synthesised in real time.
 */

export class Audio {
  constructor() {
    this._ctx    = null;
    this._muted  = false;
    this._rolling = null;
    this._rollGain = null;
    this._ready  = false;
  }

  /** Must be called on first user gesture to unlock Web Audio */
  init() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._buildRollingSound();
      this._ready = true;
    } catch (e) {
      console.warn('WebAudio not available', e);
    }
  }

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    if (this._rollGain) {
      this._rollGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.1);
    }
    return this._muted;
  }

  // ── Wall bump ───────────────────────────────────────────────────────────────

  playBump(intensity = 0.5) {
    if (!this._ready || this._muted) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 40) * intensity;
    }

    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  // ── Rolling sound (continuous) ───────────────────────────────────────────────

  _buildRollingSound() {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    osc.type      = 'sawtooth';
    osc.frequency.value = 100;

    const filter = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value         = 3;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    this._rollGain    = gain;
    this._rollFilter  = filter;
    this._rollOsc     = osc;
  }

  /** Called every frame with normalised ball speed 0..1 */
  updateRolling(speed) {
    if (!this._ready || this._muted) return;
    const ctx    = this._ctx;
    const now    = ctx.currentTime;
    const volume = Math.min(0.08, speed * 0.08);

    this._rollGain.gain.setTargetAtTime(volume, now, 0.05);
    this._rollOsc.frequency.setTargetAtTime(80 + speed * 160, now, 0.05);
    this._rollFilter.frequency.setTargetAtTime(200 + speed * 600, now, 0.05);
  }

  stopRolling() {
    if (!this._rollGain) return;
    const now = this._ctx.currentTime;
    this._rollGain.gain.setTargetAtTime(0, now, 0.1);
  }

  // ── Victory fanfare ──────────────────────────────────────────────────────────

  playVictory() {
    if (!this._ready || this._muted) return;
    const ctx  = this._ctx;
    const now  = ctx.currentTime;

    // Ascending major arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];  // C4–E5
    notes.forEach((freq, i) => {
      const t   = now + i * 0.15;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type      = 'triangle';
      osc.frequency.value = freq;

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.25, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  // ── UI Click ─────────────────────────────────────────────────────────────────

  playClick() {
    if (!this._ready || this._muted) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type      = 'sine';
    osc.frequency.value = 650;

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}
