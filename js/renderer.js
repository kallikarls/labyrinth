/**
 * renderer.js — Canvas drawing: wooden maze, metallic ball, start/exit zones
 */

import { WALL } from './maze.js';

// ── Wood colour ramps ─────────────────────────────────────────────────────────
const BOARD_BG_1   = '#5c3010';
const BOARD_BG_2   = '#3d2005';
const WALL_TOP     = '#d4a76a';  // highlight
const WALL_MID     = '#8b5a2b';  // main
const WALL_SHADOW  = '#3d1e07';  // deep shadow
const WALL_EDGE    = '#c8895a';  // warm edge

export class Renderer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.dpr     = window.devicePixelRatio || 1;

    // Layout (computed by computeLayout)
    this.offsetX  = 0;
    this.offsetY  = 0;
    this.cellW    = 0;
    this.cellH    = 0;
    this.wallThick = 0;
    this.ballRadius = 0;

    // Animation state
    this._exitPulse  = 0;
    this._ballAngle  = 0;
    this._grain = null; // cached wood grain texture
  }

  /** Resize canvas to fill screen, return true if size changed */
  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cw = Math.round(w * this.dpr);
    const ch = Math.round(h * this.dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width  = cw;
      this.canvas.height = ch;
      this.canvas.style.width  = w + 'px';
      this.canvas.style.height = h + 'px';
      this._grain = null; // invalidate texture cache
      return true;
    }
    return false;
  }

  /**
   * Compute maze layout (cell size, wall thickness, offset to centre maze).
   * Returns { offsetX, offsetY, cellW, cellH, wallThick, ballRadius }.
   */
  computeLayout(cols, rows) {
    const w = this.canvas.width  / this.dpr;
    const h = this.canvas.height / this.dpr;

    const PADDING = Math.min(w, h) * 0.05; // 5% padding around maze

    const availW = w - PADDING * 2;
    const availH = h - PADDING * 2;

    // Uniform cell size; prefer fitting the smaller dimension
    const cellW = Math.floor(availW / cols);
    const cellH = Math.floor(availH / rows);
    const cell  = Math.min(cellW, cellH);

    const mazeW = cell * cols;
    const mazeH = cell * rows;

    const offsetX = Math.floor((w - mazeW) / 2);
    const offsetY = Math.floor((h - mazeH) / 2);

    const wallThick  = Math.max(4, Math.round(cell * 0.18));
    const ballRadius = Math.round(cell * 0.28);

    this.offsetX    = offsetX;
    this.offsetY    = offsetY;
    this.cellW      = cell;
    this.cellH      = cell;
    this.wallThick  = wallThick;
    this.ballRadius = ballRadius;

    return { offsetX, offsetY, cellW: cell, cellH: cell, wallThick, ballRadius };
  }

  // ── Main draw call ──────────────────────────────────────────────────────────

  drawFrame(maze, cols, rows, ball, dt) {
    const ctx  = this.ctx;
    const dpr  = this.dpr;
    const W    = this.canvas.width;
    const H    = this.canvas.height;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, W / dpr, H / dpr);

    // Draw board background
    this._drawBoard(W / dpr, H / dpr);

    // Animate exit star pulse
    this._exitPulse = (this._exitPulse + dt * 2.5) % (Math.PI * 2);

    // Draw maze walls
    this._drawMaze(maze, cols, rows);

    // Draw start zone
    this._drawStart();

    // Draw exit zone
    this._drawExit(cols, rows);

    // Update ball angle (rotation based on velocity)
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    this._ballAngle += speed * 0.04;

    // Draw ball shadow
    this._drawBallShadow(ball.x, ball.y);

    // Draw sparkle trail
    if (ball._trail) this._drawTrail(ball._trail);

    // Draw ball
    this._drawBall(ball.x, ball.y);

    ctx.restore();
  }

  // ── Board ───────────────────────────────────────────────────────────────────

  _drawBoard(w, h) {
    const ctx = this.ctx;

    // Wood background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0,   '#6b3a1f');
    bg.addColorStop(0.5, '#4a2510');
    bg.addColorStop(1,   '#2e1506');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Wood grain overlay (cached texture)
    if (!this._grain) this._buildGrainTexture(w, h);
    if (this._grain) {
      ctx.globalAlpha = 0.08;
      ctx.drawImage(this._grain, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Board raised area (maze region with shadow/bevel)
    const pad  = Math.min(w, h) * 0.03;
    const mx   = this.offsetX - pad;
    const my   = this.offsetY - pad;
    const mw   = this.cellW * (this.cellW > 0 ? this.cols : 1) + pad * 2;
    const mh   = this.cellH * (this.cellH > 0 ? this.rows : 1) + pad * 2;

    // Shadow under board
    ctx.shadowColor   = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur    = 20;
    ctx.shadowOffsetY = 6;

    const boardGrad = ctx.createLinearGradient(mx, my, mx, my + mh);
    boardGrad.addColorStop(0,   '#7a4420');
    boardGrad.addColorStop(0.5, '#5c3010');
    boardGrad.addColorStop(1,   '#3d2005');
    ctx.fillStyle = boardGrad;
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 12);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.shadowOffsetY = 0;

    // Inner bevel
    ctx.strokeStyle = 'rgba(200,137,90,0.22)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(mx + 2, my + 2, mw - 4, mh - 4, 10);
    ctx.stroke();
  }

  _buildGrainTexture(w, h) {
    try {
      const off = new OffscreenCanvas(w, h);
      const c   = off.getContext('2d');
      c.strokeStyle = '#c8895a';
      c.lineWidth   = 1;
      for (let i = 0; i < 60; i++) {
        const y0 = Math.random() * h;
        c.globalAlpha = Math.random() * 0.5 + 0.1;
        c.beginPath();
        c.moveTo(0, y0);
        c.bezierCurveTo(w * 0.25, y0 + (Math.random() - 0.5) * 40,
                        w * 0.75, y0 + (Math.random() - 0.5) * 40,
                        w, y0 + (Math.random() - 0.5) * 20);
        c.stroke();
      }
      this._grain = off;
    } catch(e) { this._grain = null; }
  }

  // ── Maze walls ──────────────────────────────────────────────────────────────

  _drawMaze(maze, cols, rows) {
    const ctx  = this.ctx;
    const { offsetX: ox, offsetY: oy, cellW, cellH, wallThick: wt } = this;
    const hw   = wt / 2;

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = wt;

    // Draw all walls as coloured strokes with depth layering
    // Pass 1 — deep shadow
    ctx.strokeStyle = WALL_SHADOW;
    ctx.lineWidth = wt + 4;
    this._strokeWalls(ctx, maze, cols, rows, ox, oy, cellW, cellH, hw);

    // Pass 2 — main wood wall
    ctx.strokeStyle = WALL_MID;
    ctx.lineWidth = wt;
    this._strokeWalls(ctx, maze, cols, rows, ox, oy, cellW, cellH, hw);

    // Pass 3 — top highlight
    ctx.strokeStyle = WALL_TOP;
    ctx.lineWidth = Math.max(1, wt * 0.3);
    ctx.globalAlpha = 0.55;
    this._strokeWalls(ctx, maze, cols, rows, ox, oy, cellW, cellH, hw);
    ctx.globalAlpha = 1;

    // Outer border
    ctx.strokeStyle = WALL_MID;
    ctx.lineWidth = wt;
    ctx.strokeRect(ox + hw, oy + hw,
      cols * cellW - wt,
      rows * cellH - wt);
  }

  _strokeWalls(ctx, maze, cols, rows, ox, oy, cw, ch, hw) {
    ctx.beginPath();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = maze[row][col];
        const x = ox + col * cw;
        const y = oy + row * ch;

        // Draw South wall only if no passage south
        if (!(cell & WALL.S) && row < rows - 1) {
          ctx.moveTo(x,      y + ch);
          ctx.lineTo(x + cw, y + ch);
        }
        // Draw East wall only if no passage east
        if (!(cell & WALL.E) && col < cols - 1) {
          ctx.moveTo(x + cw, y);
          ctx.lineTo(x + cw, y + ch);
        }
      }
    }
    ctx.stroke();
  }

  // ── Start zone ──────────────────────────────────────────────────────────────

  _drawStart() {
    const ctx = this.ctx;
    const cx = this.offsetX + this.cellW * 0.5;
    const cy = this.offsetY + this.cellH * 0.5;
    const r  = this.ballRadius * 1.6;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   'rgba(62,207,110,0.35)');
    grad.addColorStop(1,   'rgba(62,207,110,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Exit zone ───────────────────────────────────────────────────────────────

  _drawExit(cols, rows) {
    const ctx  = this.ctx;
    const cx   = this.offsetX + (cols - 0.5) * this.cellW;
    const cy   = this.offsetY + (rows - 0.5) * this.cellH;
    const pulse= Math.sin(this._exitPulse);
    const r    = this.ballRadius * (1.7 + pulse * 0.25);

    // Glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
    glow.addColorStop(0,   `rgba(245,200,66,${0.45 + pulse * 0.15})`);
    glow.addColorStop(0.5, `rgba(245,200,66,0.15)`);
    glow.addColorStop(1,   'rgba(245,200,66,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Star
    const starR = r * 0.85;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this._exitPulse * 0.4);
    ctx.fillStyle = `rgb(245,${180 + pulse * 20},55)`;
    ctx.shadowColor  = 'rgba(255,200,50,0.8)';
    ctx.shadowBlur   = 12;
    drawStar(ctx, 0, 0, 5, starR, starR * 0.4);
    ctx.fill();
    ctx.shadowBlur   = 0;
    ctx.restore();
  }

  // ── Ball ────────────────────────────────────────────────────────────────────

  _drawBallShadow(x, y) {
    const ctx = this.ctx;
    const r   = this.ballRadius;
    const grad = ctx.createRadialGradient(x + r * 0.2, y + r * 0.3, 0,
                                          x,             y,           r * 1.5);
    grad.addColorStop(0,   'rgba(0,0,0,0.35)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y + r * 0.25, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBall(x, y) {
    const ctx = this.ctx;
    const r   = this.ballRadius;

    // Main metallic sphere gradient
    const grad = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.35, r * 0.05,
      x,           y,             r
    );
    grad.addColorStop(0,    '#f5f5f5');
    grad.addColorStop(0.25, '#d0d0d0');
    grad.addColorStop(0.65, '#9a9a9a');
    grad.addColorStop(1,    '#484848');

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular highlight
    const shine = ctx.createRadialGradient(
      x - r * 0.28, y - r * 0.32, 0,
      x - r * 0.28, y - r * 0.32, r * 0.42
    );
    shine.addColorStop(0,   'rgba(255,255,255,0.85)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    shine.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle outline
    ctx.strokeStyle = 'rgba(60,60,60,0.4)';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();
  }

  _drawTrail(trail) {
    const ctx = this.ctx;
    for (let i = 0; i < trail.length; i++) {
      const p   = trail[i];
      const age = i / trail.length;
      ctx.globalAlpha = age * 0.25;
      ctx.fillStyle = '#f5c842';
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.ballRadius * age * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Getters used by game ────────────────────────────────────────────────────
  get cols() { return Math.round((this.canvas.width  / this.dpr - this.offsetX * 2) / this.cellW) || 0; }
  get rows() { return Math.round((this.canvas.height / this.dpr - this.offsetY * 2) / this.cellH) || 0; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawStar(ctx, cx, cy, points, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r   = i % 2 === 0 ? outerR : innerR;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
    else        ctx.lineTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
  }
  ctx.closePath();
}
