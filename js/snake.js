/**
 * snake.js — Classic Snake mini-game
 *
 * Controls: Arrow keys / WASD  |  Touch swipe  |  Space / Esc = pause
 */

const CELL    = 22;    // grid cell size in pixels
const TICK_MS = 130;   // ms per game step

// Polyfill-safe rounded rectangle helper
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

export class Snake {
  constructor() {
    this._canvas = document.getElementById('snakeCanvas');
    this._ctx    = this._canvas.getContext('2d');

    this._snake   = [];
    this._food    = { x: 0, y: 0 };
    this._dir     = { x: 1, y: 0 };
    this._nextDir = { x: 1, y: 0 };
    this._score   = 0;
    this._cols    = 0;
    this._rows    = 0;
    this._interval = null;
    this._raf      = null;
    this._paused   = false;

    this._best = parseInt(localStorage.getItem('snake_best') || '0', 10);

    this._ui = {
      screen:     document.getElementById('snakeScreen'),
      scoreEl:    document.getElementById('snakeScore'),
      bestEl:     document.getElementById('snakeBest'),
      overlay:    document.getElementById('snakeOverlay'),
      finalScore: document.getElementById('snakeFinalScore'),
      newBest:    document.getElementById('snakeNewBest'),
      btnHome:    document.getElementById('btnSnakeHome'),
      btnPause:   document.getElementById('btnSnakePause'),
      btnRestart: document.getElementById('btnSnakeRestart'),
      btnOverHome:document.getElementById('btnSnakeOverHome'),
    };

    this._ui.bestEl.textContent = `Best: ${this._best}`;
    this._bindUI();
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  open() {
    document.getElementById('startScreen').classList.remove('active');
    this._ui.screen.classList.add('active');
    this._newGame();
  }

  close() {
    this._stop();
    this._ui.screen.classList.remove('active');
    this._ui.overlay.classList.remove('active');
    document.getElementById('startScreen').classList.add('active');
  }

  // ── Game lifecycle ───────────────────────────────────────────────────────────

  _newGame() {
    this._resize();
    const midX = Math.floor(this._cols / 2);
    const midY = Math.floor(this._rows / 2);

    this._snake   = [
      { x: midX,     y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    this._dir     = { x: 1, y: 0 };
    this._nextDir = { x: 1, y: 0 };
    this._score   = 0;
    this._paused  = false;

    this._ui.scoreEl.textContent  = 'Score: 0';
    this._ui.btnPause.textContent = '⏸';
    this._ui.overlay.classList.remove('active');

    this._spawnFood();
    this._stop();
    this._interval = setInterval(() => this._tick(), TICK_MS);
    this._drawLoop();
  }

  _stop() {
    if (this._interval) { clearInterval(this._interval);       this._interval = null; }
    if (this._raf)      { cancelAnimationFrame(this._raf);     this._raf      = null; }
  }

  _resize() {
    const c    = this._canvas;
    c.width    = window.innerWidth;
    c.height   = window.innerHeight;
    this._cols = Math.floor(c.width  / CELL);
    this._rows = Math.floor(c.height / CELL);
  }

  // ── Gameplay ─────────────────────────────────────────────────────────────────

  _spawnFood() {
    const body = new Set(this._snake.map(s => `${s.x},${s.y}`));
    let x, y;
    do {
      x = Math.floor(Math.random() * this._cols);
      y = Math.floor(Math.random() * this._rows);
    } while (body.has(`${x},${y}`));
    this._food = { x, y };
  }

  _tick() {
    if (this._paused) return;

    this._dir = this._nextDir;
    const head = this._snake[0];
    const nx   = (head.x + this._dir.x + this._cols) % this._cols;
    const ny   = (head.y + this._dir.y + this._rows) % this._rows;

    // Self-collision (exclude last segment — it will have moved)
    for (let i = 0; i < this._snake.length - 1; i++) {
      if (this._snake[i].x === nx && this._snake[i].y === ny) {
        this._gameOver();
        return;
      }
    }

    this._snake.unshift({ x: nx, y: ny });

    if (nx === this._food.x && ny === this._food.y) {
      this._score++;
      this._ui.scoreEl.textContent = `Score: ${this._score}`;
      this._spawnFood();
    } else {
      this._snake.pop();
    }
  }

  _gameOver() {
    this._stop();

    let newBest = false;
    if (this._score > this._best) {
      this._best = this._score;
      localStorage.setItem('snake_best', String(this._best));
      this._ui.bestEl.textContent = `Best: ${this._best}`;
      newBest = true;
    }

    this._ui.finalScore.textContent   = `Score: ${this._score}`;
    this._ui.newBest.style.display    = newBest ? 'block' : 'none';
    this._ui.overlay.classList.add('active');
  }

  _togglePause() {
    if (this._ui.overlay.classList.contains('active')) return;
    this._paused = !this._paused;
    this._ui.btnPause.textContent = this._paused ? '▶️' : '⏸';
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  _drawLoop() {
    this._draw();
    this._raf = requestAnimationFrame(() => this._drawLoop());
  }

  _draw() {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const C   = CELL;

    // Background
    ctx.fillStyle = '#0a160a';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(62,207,110,0.07)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= W; x += C) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += C) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!this._snake.length) return;

    // Food — pulsing circle
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    const fr    = C / 2 - 2 + pulse * 1.5;
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(this._food.x * C + C / 2, this._food.y * C + C / 2, fr, 0, Math.PI * 2);
    ctx.fill();

    // Snake segments
    const len = this._snake.length;
    this._snake.forEach((seg, i) => {
      const t = 1 - i / len;
      const g = Math.round(110 + 97  * t);
      const r = Math.round(20  + 30  * t);
      const b = Math.round(20  + 20  * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = i === 0 ? 1 : 2;
      const rad = i === 0 ? 6 : 4;
      rrect(ctx, seg.x * C + pad, seg.y * C + pad, C - pad * 2, C - pad * 2, rad);
      ctx.fill();
    });

    // Eyes on head
    const head = this._snake[0];
    const d    = this._dir;
    const hx   = head.x * C + C / 2;
    const hy   = head.y * C + C / 2;
    const perp = { x: -d.y, y: d.x };

    const eye = (side) => ({
      x: hx + d.x * 5 + perp.x * side * 4,
      y: hy + d.y * 5 + perp.y * side * 4,
    });

    ctx.fillStyle = '#fff';
    [-1, 1].forEach(side => {
      const e = eye(side);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#000';
    [-1, 1].forEach(side => {
      const e = eye(side);
      ctx.beginPath();
      ctx.arc(e.x + d.x, e.y + d.y, 1, 0, Math.PI * 2);
      ctx.fill();
    });

    // Paused overlay
    if (this._paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font      = `bold ${Math.round(W * 0.08)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2);
      ctx.textAlign = 'left';
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  _bindUI() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this._ui.screen.classList.contains('active')) return;

      const dirs = {
        ArrowUp:    { x:  0, y: -1 }, w: { x:  0, y: -1 },
        ArrowDown:  { x:  0, y:  1 }, s: { x:  0, y:  1 },
        ArrowLeft:  { x: -1, y:  0 }, a: { x: -1, y:  0 },
        ArrowRight: { x:  1, y:  0 }, d: { x:  1, y:  0 },
      };

      const nd = dirs[e.key];
      if (nd) {
        // Prevent 180° reversal
        if (nd.x === -this._dir.x && nd.y === -this._dir.y) return;
        this._nextDir = nd;
        e.preventDefault();
      }
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        this._togglePause();
      }
    });

    // Touch swipe — fires on touchmove for snappy response,
    // falls back to touchend for quick flicks.
    const MIN_SWIPE = 20; // px
    let tx = 0, ty = 0, swipeRegistered = false;

    const applySwipe = (cx, cy) => {
      const dx = cx - tx;
      const dy = cy - ty;
      if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return false;

      const nd = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
        : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });

      // Prevent 180° reversal
      if (nd.x !== -this._dir.x || nd.y !== -this._dir.y) {
        this._nextDir = nd;
      }

      // Reset origin so chained turns work within one gesture
      tx = cx;
      ty = cy;
      return true;
    };

    this._canvas.addEventListener('touchstart', (e) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
      swipeRegistered = false;
    }, { passive: true });

    this._canvas.addEventListener('touchmove', (e) => {
      if (applySwipe(e.touches[0].clientX, e.touches[0].clientY)) {
        swipeRegistered = true;
      }
    }, { passive: true });

    // Catch quick flicks that end before touchmove fires
    this._canvas.addEventListener('touchend', (e) => {
      if (!swipeRegistered) {
        applySwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }, { passive: true });

    // Buttons
    this._ui.btnHome.addEventListener('click',    () => this.close());
    this._ui.btnPause.addEventListener('click',   () => this._togglePause());
    this._ui.btnRestart.addEventListener('click', () => this._newGame());
    this._ui.btnOverHome.addEventListener('click',() => this.close());
  }
}
