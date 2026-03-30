/**
 * particles.js — Confetti on win, sparkle trail on ball
 */

const CONFETTI_COLORS = [
  '#f5c842', '#3ecf6e', '#4db8ff', '#e85454',
  '#c45dff', '#ff8c42', '#42fff3', '#ff6b8a',
];

// ── Confetti ──────────────────────────────────────────────────────────────────

export class Confetti {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.pieces  = [];
    this._raf    = null;
    this._active = false;
  }

  burst() {
    this._active = true;
    this.pieces  = [];
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < 120; i++) {
      this.pieces.push({
        x:  Math.random() * w,
        y:  -20 - Math.random() * h * 0.5,
        w:  8 + Math.random() * 12,
        h:  4 + Math.random() * 8,
        r:  Math.random() * Math.PI * 2,
        dr: (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        alpha: 1,
      });
    }

    if (this._raf) cancelAnimationFrame(this._raf);
    this._loop();
  }

  stop() {
    this._active = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _loop() {
    if (!this._active) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let alive = false;
    for (const p of this.pieces) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.r  += p.dr;
      p.vy += 0.12;  // gravity
      p.alpha = Math.max(0, p.alpha - 0.004);

      if (p.y < this.canvas.height + 40 && p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (alive) {
      this._raf = requestAnimationFrame(() => this._loop());
    } else {
      this.stop();
    }
  }
}

// ── Sparkle Trail ─────────────────────────────────────────────────────────────

const TRAIL_LENGTH = 12;

export class Trail {
  constructor() {
    this.points = [];
  }

  add(x, y) {
    this.points.push({ x, y });
    if (this.points.length > TRAIL_LENGTH) this.points.shift();
  }

  get() { return this.points; }

  clear() { this.points = []; }
}
