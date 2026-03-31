/**
 * tetris.js — Classic Tetris mini-game
 *
 * Controls: Arrow keys / swipe  |  Up / tap = rotate  |  Space = hard drop
 *           Esc / P = pause
 */

import { t } from './i18n.js';

const COLS       = 10;
const ROWS       = 20;
const TICK_START = 800;   // ms per drop at level 1
const TICK_MIN   = 80;
const LEVEL_STEP = 10;    // lines per level
const BEST_KEY   = 'tetris_best';

// Tetrominoes: shape arrays (4×4 bitmask rows) + colour
const PIECES = [
  { // I
    cells: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    color: '#00cfcf',
  },
  { // O
    cells: [[1,1],[1,1]],
    color: '#f5c842',
  },
  { // T
    cells: [[0,1,0],[1,1,1],[0,0,0]],
    color: '#aa44ff',
  },
  { // S
    cells: [[0,1,1],[1,1,0],[0,0,0]],
    color: '#3ecf6e',
  },
  { // Z
    cells: [[1,1,0],[0,1,1],[0,0,0]],
    color: '#e85454',
  },
  { // J
    cells: [[1,0,0],[1,1,1],[0,0,0]],
    color: '#4db8ff',
  },
  { // L
    cells: [[0,0,1],[1,1,1],[0,0,0]],
    color: '#f5a623',
  },
];

function rotateCW(cells) {
  const n = cells.length;
  const m = cells[0].length;
  const out = Array.from({ length: m }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++)
    for (let c = 0; c < m; c++)
      out[c][n - 1 - r] = cells[r][c];
  return out;
}

function rotateCCW(cells) {
  return rotateCW(rotateCW(rotateCW(cells)));
}

export class Tetris {
  constructor() {
    this._canvas = document.getElementById('tetrisCanvas');
    this._ctx    = this._canvas.getContext('2d');

    this._board  = [];
    this._piece  = null;
    this._next   = null;
    this._score  = 0;
    this._lines  = 0;
    this._level  = 1;
    this._best   = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._paused = false;
    this._over   = false;
    this._interval = null;
    this._raf      = null;
    this._cellW    = 0;
    this._cellH    = 0;
    this._ox       = 0;   // board x offset on canvas
    this._oy       = 0;   // board y offset on canvas

    this._ui = {
      screen:     document.getElementById('tetrisScreen'),
      scoreEl:    document.getElementById('tetrisScore'),
      bestEl:     document.getElementById('tetrisBest'),
      levelEl:    document.getElementById('tetrisLevel'),
      linesEl:    document.getElementById('tetrisLines'),
      overlay:    document.getElementById('tetrisOverlay'),
      overScore:  document.getElementById('tetrisFinalScore'),
      newBest:    document.getElementById('tetrisNewBest'),
      nextCanvas: document.getElementById('tetrisNextCanvas'),
      btnHome:    document.getElementById('btnTetrisHome'),
      btnPause:   document.getElementById('btnTetrisPause'),
      btnRestart: document.getElementById('btnTetrisRestart'),
      btnOverHome:document.getElementById('btnTetrisOverHome'),
    };

    this._bindUI();
    this._bindKeys();
    this._bindTouch();
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._start();
  }

  close() {
    this._ui.screen.classList.remove('active');
    this._stop();
  }

  // ── Game init ────────────────────────────────────────────────────────────────

  _start() {
    this._stop();
    this._board  = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this._score  = 0;
    this._lines  = 0;
    this._level  = 1;
    this._over   = false;
    this._paused = false;
    this._ui.overlay.style.display = 'none';
    this._ui.btnPause.textContent = '⏸';
    this._resize();
    this._next  = this._randomPiece();
    this._spawnPiece();
    this._updateHUD();
    this._scheduleInterval();
    this._raf = requestAnimationFrame(() => this._draw());
  }

  _stop() {
    clearInterval(this._interval);
    this._interval = null;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _scheduleInterval() {
    clearInterval(this._interval);
    const ms = Math.max(TICK_MIN, TICK_START - (this._level - 1) * 70);
    this._interval = setInterval(() => this._tick(), ms);
  }

  _randomPiece() {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    return { cells: p.cells.map(r => [...r]), color: p.color };
  }

  _spawnPiece() {
    this._piece = {
      ...this._next,
      cells: this._next.cells.map(r => [...r]),
      x: Math.floor((COLS - this._next.cells[0].length) / 2),
      y: 0,
    };
    this._next = this._randomPiece();
    this._drawNext();
    if (!this._valid(this._piece, 0, 0)) this._gameOver();
  }

  // ── Core logic ───────────────────────────────────────────────────────────────

  _tick() {
    if (this._paused || this._over) return;
    if (!this._move(0, 1)) this._lock();
  }

  _move(dx, dy) {
    if (this._valid(this._piece, dx, dy)) {
      this._piece.x += dx;
      this._piece.y += dy;
      return true;
    }
    return false;
  }

  _rotate(dir = 1) {
    const orig = this._piece.cells;
    const rotated = dir === 1 ? rotateCW(orig) : rotateCCW(orig);
    const kicks = [0, 1, -1, 2, -2];
    for (const kick of kicks) {
      this._piece.cells = rotated;
      if (this._valid(this._piece, kick, 0)) {
        this._piece.x += kick;
        return;
      }
    }
    this._piece.cells = orig; // wall-kick failed, revert
  }

  _hardDrop() {
    let dropped = 0;
    while (this._move(0, 1)) dropped++;
    this._score += dropped * 2;
    this._lock();
  }

  _valid(piece, dx, dy) {
    for (let r = 0; r < piece.cells.length; r++) {
      for (let c = 0; c < piece.cells[r].length; c++) {
        if (!piece.cells[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && this._board[ny][nx]) return false;
      }
    }
    return true;
  }

  _lock() {
    for (let r = 0; r < this._piece.cells.length; r++) {
      for (let c = 0; c < this._piece.cells[r].length; c++) {
        if (!this._piece.cells[r][c]) continue;
        const ny = this._piece.y + r;
        if (ny < 0) { this._gameOver(); return; }
        this._board[ny][this._piece.x + c] = this._piece.color;
      }
    }
    this._clearLines();
    this._spawnPiece();
  }

  _clearLines() {
    const full = this._board.reduce((acc, row, i) => {
      if (row.every(c => c !== null)) acc.push(i);
      return acc;
    }, []);
    if (!full.length) return;

    // Remove full rows and add blanks at top
    full.forEach(i => this._board.splice(i, 1));
    for (let i = 0; i < full.length; i++) {
      this._board.unshift(Array(COLS).fill(null));
    }

    const pts = [0, 100, 300, 500, 800][Math.min(full.length, 4)] * this._level;
    this._score += pts;
    this._lines += full.length;
    this._level = Math.floor(this._lines / LEVEL_STEP) + 1;
    this._scheduleInterval();
    this._updateHUD();
  }

  _gameOver() {
    this._over = true;
    clearInterval(this._interval);
    this._interval = null;

    const isNewBest = this._score > this._best;
    if (isNewBest) {
      this._best = this._score;
      localStorage.setItem(BEST_KEY, String(this._best));
    }

    this._ui.overScore.textContent  = this._score;
    this._ui.newBest.style.display  = isNewBest ? 'block' : 'none';
    this._ui.btnRestart.textContent = t('tetrisPlayAgain');
    this._ui.overlay.querySelector('.tetris-over-title').textContent = t('gameOver');
    this._ui.overlay.style.display  = 'flex';
    this._updateHUD();
  }

  _updateHUD() {
    this._ui.scoreEl.textContent = `${t('score')}: ${this._score}`;
    this._ui.levelEl.textContent = `${t('tetrisLevel')}: ${this._level}`;
    this._ui.linesEl.textContent = `${t('tetrisLines')}: ${this._lines}`;
    this._ui.bestEl.textContent  = `${t('best')}: ${this._best}`;
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  _resize() {
    const W = this._canvas.clientWidth;
    const H = this._canvas.clientHeight;
    this._canvas.width  = W;
    this._canvas.height = H;

    const cw = Math.floor(W / (COLS + 6));  // 6 extra cols for sidebar
    const ch = Math.floor(H / ROWS);
    this._cellW = this._cellH = Math.min(cw, ch);
    this._ox = Math.floor((W - this._cellW * (COLS + 6)) / 2);
    this._oy = Math.floor((H - this._cellH * ROWS) / 2);
  }

  _draw() {
    if (!this._ui.screen.classList.contains('active')) return;
    this._raf = requestAnimationFrame(() => this._draw());

    const ctx   = this._ctx;
    const C     = this._cellW;
    const ox    = this._ox;
    const oy    = this._oy;
    const bw    = C * COLS;
    const bh    = C * ROWS;

    // Background
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    // Board background
    ctx.fillStyle = '#13161e';
    ctx.fillRect(ox, oy, bw, bh);

    // Grid lines
    ctx.strokeStyle = 'rgba(100,120,180,0.12)';
    ctx.lineWidth   = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * C, oy);
      ctx.lineTo(ox + c * C, oy + bh);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * C);
      ctx.lineTo(ox + bw, oy + r * C);
      ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this._board[r][c]) {
          this._drawCell(ctx, ox + c * C, oy + r * C, C, this._board[r][c]);
        }
      }
    }

    // Ghost piece
    if (this._piece && !this._over) {
      let ghostY = this._piece.y;
      const ghost = { ...this._piece };
      while (this._valid({ ...ghost, y: ghostY + 1 }, 0, 0)) ghostY++;
      ghost.y = ghostY;
      for (let r = 0; r < ghost.cells.length; r++) {
        for (let c = 0; c < ghost.cells[r].length; c++) {
          if (!ghost.cells[r][c]) continue;
          const x = ox + (ghost.x + c) * C;
          const y = oy + (ghost.y + r) * C;
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.fillRect(x + 1, y + 1, C - 2, C - 2);
          ctx.strokeRect(x + 1.5, y + 1.5, C - 3, C - 3);
        }
      }
    }

    // Active piece
    if (this._piece && !this._over) {
      for (let r = 0; r < this._piece.cells.length; r++) {
        for (let c = 0; c < this._piece.cells[r].length; c++) {
          if (!this._piece.cells[r][c]) continue;
          const x = ox + (this._piece.x + c) * C;
          const y = oy + (this._piece.y + r) * C;
          this._drawCell(ctx, x, y, C, this._piece.color);
        }
      }
    }

    // Board border
    ctx.strokeStyle = 'rgba(100,120,180,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(ox + 0.75, oy + 0.75, bw - 1.5, bh - 1.5);

    // Paused overlay
    if (this._paused && !this._over) {
      ctx.fillStyle = 'rgba(13,15,20,0.75)';
      ctx.fillRect(ox, oy, bw, bh);
      ctx.fillStyle = '#fff';
      ctx.font      = `bold ${C * 1.4}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t('paused'), ox + bw / 2, oy + bh / 2);
    }
  }

  _drawCell(ctx, x, y, C, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, C - 2, C - 2);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 2, y + 2, C - 4, 3);
    ctx.fillRect(x + 2, y + 2, 3, C - 4);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + C - 4, C - 4, 3);
    ctx.fillRect(x + C - 4, y + 2, 3, C - 4);
  }

  _drawNext() {
    const nc  = this._ui.nextCanvas;
    const ctx = nc.getContext('2d');
    const C   = 22;
    nc.width  = C * 4 + 4;
    nc.height = C * 4 + 4;

    ctx.fillStyle = '#13161e';
    ctx.fillRect(0, 0, nc.width, nc.height);

    if (!this._next) return;
    const cells  = this._next.cells;
    const cols   = cells[0].length;
    const rows   = cells.length;
    const startX = Math.floor((4 - cols) / 2) * C + 2;
    const startY = Math.floor((4 - rows) / 2) * C + 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cells[r][c]) {
          this._drawCell(ctx, startX + c * C, startY + r * C, C, this._next.color);
        }
      }
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this._ui.screen.classList.contains('active')) return;
      if (this._over) return;

      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); this._move(-1, 0); break;
        case 'ArrowRight': e.preventDefault(); this._move(1, 0);  break;
        case 'ArrowDown':  e.preventDefault(); if (this._move(0, 1)) this._score++; break;
        case 'ArrowUp':    e.preventDefault(); this._rotate(1);   break;
        case 'z': case 'Z': this._rotate(-1); break;
        case ' ':          e.preventDefault(); this._hardDrop();  break;
        case 'Escape': case 'p': case 'P': this._togglePause(); break;
      }
    });
  }

  _bindTouch() {
    let sx = 0, sy = 0, st = 0;
    const MIN_SWIPE = 25;

    this._canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now();
    }, { passive: true });

    this._canvas.addEventListener('touchend', (e) => {
      if (this._over || this._paused) return;
      const t  = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = Date.now() - st;
      const adx = Math.abs(dx), ady = Math.abs(dy);

      if (adx < 12 && ady < 12 && dt < 250) {
        // tap = rotate
        this._rotate(1);
      } else if (adx > ady && adx > MIN_SWIPE) {
        this._move(dx > 0 ? 1 : -1, 0);
      } else if (ady > adx && ady > MIN_SWIPE) {
        if (dy > 0) this._hardDrop();
        else        this._rotate(1);
      }
    }, { passive: true });
  }

  _togglePause() {
    if (this._over) return;
    this._paused = !this._paused;
    this._ui.btnPause.textContent = this._paused ? '▶️' : '⏸';
  }

  _bindUI() {
    this._ui.btnHome.addEventListener('click', () => this.close());
    this._ui.btnPause.addEventListener('click', () => this._togglePause());
    this._ui.btnRestart.addEventListener('click', () => this._start());
    this._ui.btnOverHome.addEventListener('click', () => this.close());

    window.addEventListener('resize', () => {
      if (!this._ui.screen.classList.contains('active')) return;
      this._resize();
    });
  }
}
