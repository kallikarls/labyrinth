/**
 * physics.js — Ball physics, tilt-to-acceleration, collision detection
 */

import { WALL } from './maze.js';

const FRICTION      = 0.88;   // velocity damping per frame
const MAX_SPEED     = 12;     // maximum ball speed (px/frame)
const TILT_FACTOR   = 0.045;  // how strongly tilt affects acceleration
const WALL_RESTITUTION = 0.25; // slight bounce on wall hit (0 = no bounce)

export class Physics {
  constructor() {
    this.x   = 0;    // ball centre x (canvas px)
    this.y   = 0;    // ball centre y (canvas px)
    this.vx  = 0;
    this.vy  = 0;
    this.radius = 10; // updated by renderer when layout changes

    // Tilt values (set by input module)
    this.tiltX = 0;   // gamma: left/right
    this.tiltY = 0;   // beta:  front/back

    // Keyboard fallback
    this.keysX = 0;
    this.keysY = 0;

    // Maze reference (set before update)
    this.maze      = null;
    this.cols      = 0;
    this.rows      = 0;
    this.cellW     = 0;
    this.cellH     = 0;
    this.wallThick = 0;

    // Cached offsets so both axes can reference them
    this._ox = 0;
    this._oy = 0;

    // Set to > 0 when a wall bump occurs this frame (for audio)
    this._lastBump = 0;
  }

  /** Set maze geometry so physics can compute cell boundaries */
  setLayout(maze, cols, rows, cellW, cellH, wallThick, radius) {
    this.maze      = maze;
    this.cols      = cols;
    this.rows      = rows;
    this.cellW     = cellW;
    this.cellH     = cellH;
    this.wallThick = wallThick;
    this.radius    = radius;
  }

  /** Store offsets so both resolve methods can use them */
  setOffsets(ox, oy) {
    this._ox = ox;
    this._oy = oy;
  }

  /** Place ball at start (top-left cell centre) */
  placeAtStart(offsetX, offsetY) {
    this.x   = offsetX + this.cellW * 0.5;
    this.y   = offsetY + this.cellH * 0.5;
    this.vx  = 0;
    this.vy  = 0;
  }

  /** Apply one frame of physics */
  update(offsetX, offsetY) {
    if (!this.maze) return;
    this._lastBump = 0;

    // Combine tilt + keyboard input
    const ax = (this.tiltX + this.keysX) * TILT_FACTOR * this.cellW;
    const ay = (this.tiltY + this.keysY) * TILT_FACTOR * this.cellH;

    this.vx += ax;
    this.vy += ay;

    // Cap speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }

    // Apply friction
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    // Store offsets
    this._ox = offsetX;
    this._oy = offsetY;

    // Resolve horizontal movement
    this.x += this.vx;
    this._resolveX(offsetX, offsetY);

    // Resolve vertical movement
    this.y += this.vy;
    this._resolveY(offsetX, offsetY);
  }

  /** Which maze cell is the ball centre currently in? */
  _cellAt(x, y) {
    const col = Math.floor((x - this._ox) / this.cellW);
    const row = Math.floor((y - this._oy) / this.cellH);
    return {
      col: Math.max(0, Math.min(this.cols - 1, col)),
      row: Math.max(0, Math.min(this.rows - 1, row)),
    };
  }

  /**
   * Resolve horizontal wall collisions.
   * We check the East/West walls of the cell the ball is in,
   * as well as the neighbouring cells the ball's radius might overlap.
   */
  _resolveX(offsetX, offsetY) {
    const half = this.wallThick / 2;
    const r    = this.radius;
    const { col, row } = this._cellAt(this.x, this.y);
    const cell = this.maze[row][col];

    const cellLeft  = offsetX + col * this.cellW;
    const cellRight = cellLeft + this.cellW;

    // Moving left — check West wall
    if (this.vx < 0) {
      const wallX = cellLeft + half;
      if (!(cell & WALL.W) && this.x - r < wallX) {
        this.x = wallX + r;
        const prev = this.vx;
        this.vx = Math.abs(this.vx) * WALL_RESTITUTION;
        this._lastBump = Math.min(1, Math.abs(prev) / 8);
      }
    }
    // Moving right — check East wall
    if (this.vx > 0) {
      const wallX = cellRight - half;
      if (!(cell & WALL.E) && this.x + r > wallX) {
        this.x = wallX - r;
        const prev = this.vx;
        this.vx = -Math.abs(this.vx) * WALL_RESTITUTION;
        this._lastBump = Math.min(1, Math.abs(prev) / 8);
      }
    }

    // Hard clamp to maze outer bounds
    const mazeLeft  = offsetX + half + r;
    const mazeRight = offsetX + this.cols * this.cellW - half - r;
    if (this.x < mazeLeft)  { this.x = mazeLeft;  this.vx =  Math.abs(this.vx) * WALL_RESTITUTION; this._lastBump = 0.3; }
    if (this.x > mazeRight) { this.x = mazeRight; this.vx = -Math.abs(this.vx) * WALL_RESTITUTION; this._lastBump = 0.3; }
  }

  _resolveY(offsetX, offsetY) {
    const half = this.wallThick / 2;
    const r    = this.radius;
    const { col, row } = this._cellAt(this.x, this.y);
    const cell = this.maze[row][col];

    const cellTop    = offsetY + row * this.cellH;
    const cellBottom = cellTop + this.cellH;

    if (this.vy < 0) {
      const wallY = cellTop + half;
      if (!(cell & WALL.N) && this.y - r < wallY) {
        this.y = wallY + r;
        const prev = this.vy;
        this.vy = Math.abs(this.vy) * WALL_RESTITUTION;
        this._lastBump = Math.max(this._lastBump, Math.min(1, Math.abs(prev) / 8));
      }
    }
    if (this.vy > 0) {
      const wallY = cellBottom - half;
      if (!(cell & WALL.S) && this.y + r > wallY) {
        this.y = wallY - r;
        const prev = this.vy;
        this.vy = -Math.abs(this.vy) * WALL_RESTITUTION;
        this._lastBump = Math.max(this._lastBump, Math.min(1, Math.abs(prev) / 8));
      }
    }

    const mazeTop    = offsetY + half + r;
    const mazeBottom = offsetY + this.rows * this.cellH - half - r;
    if (this.y < mazeTop)    { this.y = mazeTop;    this.vy =  Math.abs(this.vy) * WALL_RESTITUTION; this._lastBump = Math.max(this._lastBump, 0.3); }
    if (this.y > mazeBottom) { this.y = mazeBottom; this.vy = -Math.abs(this.vy) * WALL_RESTITUTION; this._lastBump = Math.max(this._lastBump, 0.3); }
  }

  /** True if ball has reached the exit cell (bottom-right) */
  isAtExit(offsetX, offsetY) {
    this._ox = offsetX;
    this._oy = offsetY;
    const { col, row } = this._cellAt(this.x, this.y);
    return col === this.cols - 1 && row === this.rows - 1;
  }

  /** Current speed 0..1 (normalised) */
  get normalizedSpeed() {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    return Math.min(speed / MAX_SPEED, 1);
  }
}
