/**
 * breakout.js — Classic Breakout / Arkanoid game
 *
 * Controls: Mouse move / Arrow keys / Touch drag  |  Space / tap = launch
 *           Esc / P = pause
 */

import { t } from './i18n.js';

const PADDLE_H     = 14;
const PADDLE_W_PCT = 0.18;   // paddle width as fraction of board width
const BALL_R       = 8;
const BRICK_ROWS   = 6;
const BRICK_COLS   = 10;
const BRICK_GAP    = 4;
const BRICK_TOP    = 0.12;   // top margin as fraction of board height
const SPEED_START  = 5.5;
const SPEED_MAX    = 14;
const BEST_KEY     = 'breakout_best';

// Row colours top→bottom
const ROW_COLORS = [
  '#e85454', // red    — 3 pts
  '#e85454',
  '#f5a623', // orange — 2 pts
  '#f5a623',
  '#3ecf6e', // green  — 1 pt
  '#3ecf6e',
];
const ROW_PTS = [3, 3, 2, 2, 1, 1];

export class Breakout {
  constructor() {
    this._canvas = document.getElementById('breakoutCanvas');
    this._ctx    = this._canvas.getContext('2d');

    this._W = 0; this._H = 0;
    this._paddleX = 0;
    this._ball    = { x: 0, y: 0, vx: 0, vy: 0, launched: false };
    this._bricks  = [];
    this._score   = 0;
    this._lives   = 3;
    this._level   = 1;
    this._best    = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._paused  = false;
    this._over    = false;
    this._won     = false;
    this._raf     = null;

    this._ui = {
      screen:     document.getElementById('breakoutScreen'),
      scoreEl:    document.getElementById('breakoutScore'),
      bestEl:     document.getElementById('breakoutBest'),
      livesEl:    document.getElementById('breakoutLives'),
      levelEl:    document.getElementById('breakoutLevel'),
      overlay:    document.getElementById('breakoutOverlay'),
      overTitle:  document.getElementById('breakoutOverTitle'),
      overScore:  document.getElementById('breakoutFinalScore'),
      newBest:    document.getElementById('breakoutNewBest'),
      btnHome:    document.getElementById('btnBreakoutHome'),
      btnPause:   document.getElementById('btnBreakoutPause'),
      btnRestart: document.getElementById('btnBreakoutRestart'),
      btnOverHome:document.getElementById('btnBreakoutOverHome'),
    };

    this._bindUI();
    this._bindInput();
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._resize();
    this._startLevel(1);
  }

  close() {
    this._ui.screen.classList.remove('active');
    this._stopLoop();
  }

  // ── Setup ────────────────────────────────────────────────────────────────────

  _resize() {
    this._W = this._canvas.clientWidth;
    this._H = this._canvas.clientHeight;
    this._canvas.width  = this._W;
    this._canvas.height = this._H;
  }

  _startLevel(level) {
    this._stopLoop();
    this._level   = level;
    this._over    = false;
    this._won     = false;
    this._paused  = false;
    this._ui.overlay.style.display = 'none';
    this._ui.btnPause.textContent  = '⏸';
    this._buildBricks();
    this._resetBall();
    this._updateHUD();
    this._raf = requestAnimationFrame((ts) => this._loop(ts));
  }

  _stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _buildBricks() {
    this._bricks = [];
    const bw  = (this._W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS;
    const bh  = Math.min(28, (this._H * 0.38) / BRICK_ROWS);
    const top = this._H * BRICK_TOP;

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        this._bricks.push({
          x:     BRICK_GAP + c * (bw + BRICK_GAP),
          y:     top + r * (bh + BRICK_GAP),
          w:     bw,
          h:     bh,
          color: ROW_COLORS[r],
          pts:   ROW_PTS[r],
          alive: true,
        });
      }
    }
  }

  _resetBall() {
    const pw = this._W * PADDLE_W_PCT;
    this._paddleX = (this._W - pw) / 2;
    this._ball = {
      x:        this._W / 2,
      y:        this._H - PADDLE_H - 28 - BALL_R,
      vx:       0,
      vy:       0,
      launched: false,
    };
  }

  _launch() {
    if (this._ball.launched || this._paused || this._over) return;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const spd   = SPEED_START + (this._level - 1) * 0.6;
    this._ball.vx = spd * Math.cos(angle);
    this._ball.vy = spd * Math.sin(angle);
    this._ball.launched = true;
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  _lastTs = 0;

  _loop(ts) {
    if (!this._ui.screen.classList.contains('active')) return;
    this._raf = requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min((ts - this._lastTs) / 16.67, 3); // cap at 3 frames
    this._lastTs = ts;

    if (!this._paused && !this._over) this._update(dt);
    this._draw();
  }

  _update(dt) {
    const W = this._W, H = this._H;
    const pw = W * PADDLE_W_PCT;
    const b  = this._ball;

    // Keep ball on paddle before launch
    if (!b.launched) {
      b.x = this._paddleX + pw / 2;
      return;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Wall bounces
    if (b.x - BALL_R < 0)  { b.x = BALL_R;      b.vx = Math.abs(b.vx); }
    if (b.x + BALL_R > W)  { b.x = W - BALL_R;  b.vx = -Math.abs(b.vx); }
    if (b.y - BALL_R < 0)  { b.y = BALL_R;      b.vy = Math.abs(b.vy); }

    // Paddle collision
    const py = H - PADDLE_H - 20;
    if (
      b.vy > 0 &&
      b.y + BALL_R >= py &&
      b.y + BALL_R <= py + PADDLE_H + BALL_R &&
      b.x >= this._paddleX - BALL_R &&
      b.x <= this._paddleX + pw + BALL_R
    ) {
      // Angle depends on where ball hits paddle
      const hit   = (b.x - (this._paddleX + pw / 2)) / (pw / 2); // -1..1
      const angle = hit * (Math.PI / 3);  // max 60° from vertical
      const spd   = Math.min(Math.hypot(b.vx, b.vy) + 0.08, SPEED_MAX);
      b.vx = spd * Math.sin(angle);
      b.vy = -spd * Math.cos(angle);
      b.y  = py - BALL_R;
    }

    // Ball lost
    if (b.y - BALL_R > H) {
      this._lives--;
      this._updateHUD();
      if (this._lives <= 0) {
        this._endGame(false);
      } else {
        this._resetBall();
      }
      return;
    }

    // Brick collisions
    let hit = false;
    for (const brick of this._bricks) {
      if (!brick.alive) continue;
      if (
        b.x + BALL_R > brick.x &&
        b.x - BALL_R < brick.x + brick.w &&
        b.y + BALL_R > brick.y &&
        b.y - BALL_R < brick.y + brick.h
      ) {
        brick.alive = false;
        this._score += brick.pts;
        this._updateHUD();

        // Determine bounce axis
        const overlapL = (b.x + BALL_R) - brick.x;
        const overlapR = (brick.x + brick.w) - (b.x - BALL_R);
        const overlapT = (b.y + BALL_R) - brick.y;
        const overlapB = (brick.y + brick.h) - (b.y - BALL_R);
        const minH = Math.min(overlapL, overlapR);
        const minV = Math.min(overlapT, overlapB);
        if (minH < minV) b.vx = -b.vx;
        else             b.vy = -b.vy;

        hit = true;
        break; // one brick per frame to avoid tunnelling
      }
    }

    // All bricks cleared — next level
    if (this._bricks.every(br => !br.alive)) {
      this._endGame(true);
    }
  }

  _endGame(won) {
    this._over = true;
    this._won  = won;
    this._stopLoop();

    const isNewBest = this._score > this._best;
    if (isNewBest) {
      this._best = this._score;
      localStorage.setItem(BEST_KEY, String(this._best));
    }

    this._ui.overTitle.textContent  = won ? t('breakoutWin') : t('gameOver');
    this._ui.overScore.textContent  = this._score;
    this._ui.newBest.style.display  = isNewBest ? 'block' : 'none';
    this._ui.btnRestart.textContent = t('breakoutPlayAgain');
    this._ui.overlay.style.display  = 'flex';
    this._updateHUD();
  }

  _updateHUD() {
    this._ui.scoreEl.textContent = `${t('score')}: ${this._score}`;
    this._ui.bestEl.textContent  = `${t('best')}: ${this._best}`;
    this._ui.levelEl.textContent = `${t('breakoutLevel')}: ${this._level}`;
    this._ui.livesEl.textContent = '❤️'.repeat(Math.max(0, this._lives));
  }

  // ── Drawing ───────────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this._ctx;
    const W = this._W, H = this._H;
    const pw = W * PADDLE_W_PCT;
    const py = H - PADDLE_H - 20;

    // Background
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, W, H);

    // Bricks
    for (const br of this._bricks) {
      if (!br.alive) continue;
      ctx.fillStyle = br.color;
      ctx.beginPath();
      ctx.roundRect(br.x, br.y, br.w, br.h, 4);
      ctx.fill();
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(br.x + 3, br.y + 3, br.w - 6, 4);
    }

    // Paddle
    const grad = ctx.createLinearGradient(this._paddleX, py, this._paddleX, py + PADDLE_H);
    grad.addColorStop(0, '#4db8ff');
    grad.addColorStop(1, '#0077bb');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(this._paddleX, py, pw, PADDLE_H, PADDLE_H / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(this._paddleX + 6, py + 3, pw - 12, 3);

    // Ball
    const bx = this._ball.x, by = this._ball.y;
    const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, BALL_R);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.4, '#88ccff');
    ballGrad.addColorStop(1, '#0055aa');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // "Tap to launch" hint
    if (!this._ball.launched && !this._over) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font      = `bold ${Math.max(14, W * 0.035)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t('breakoutLaunch'), W / 2, H / 2);
    }

    // Paused overlay
    if (this._paused && !this._over) {
      ctx.fillStyle = 'rgba(13,15,20,0.72)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font      = `bold ${Math.max(20, W * 0.06)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t('paused'), W / 2, H / 2);
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  _bindInput() {
    let touchX = null;

    // Mouse
    this._canvas.addEventListener('mousemove', (e) => {
      this._movePaddle(e.clientX);
    });
    this._canvas.addEventListener('click', () => this._launch());

    // Touch
    this._canvas.addEventListener('touchstart', (e) => {
      touchX = e.touches[0].clientX;
      this._launch();
    }, { passive: true });

    this._canvas.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - touchX;
      touchX = e.touches[0].clientX;
      const pw = this._W * PADDLE_W_PCT;
      this._paddleX = Math.max(0, Math.min(this._W - pw, this._paddleX + dx));
    }, { passive: true });

    // Keyboard
    const keys = new Set();
    window.addEventListener('keydown', (e) => {
      if (!this._ui.screen.classList.contains('active')) return;
      keys.add(e.key);
      if (e.key === ' ') { e.preventDefault(); this._launch(); }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this._togglePause();
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key));

    // Keyboard paddle movement via RAF
    const moveKeys = () => {
      if (!this._ui.screen.classList.contains('active')) { requestAnimationFrame(moveKeys); return; }
      const pw    = this._W * PADDLE_W_PCT;
      const spd   = this._W * 0.018;
      if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A'))
        this._paddleX = Math.max(0, this._paddleX - spd);
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D'))
        this._paddleX = Math.min(this._W - pw, this._paddleX + spd);
      requestAnimationFrame(moveKeys);
    };
    requestAnimationFrame(moveKeys);

    window.addEventListener('resize', () => {
      if (!this._ui.screen.classList.contains('active')) return;
      this._resize();
      this._startLevel(this._level);
    });
  }

  _movePaddle(clientX) {
    const rect = this._canvas.getBoundingClientRect();
    const pw   = this._W * PADDLE_W_PCT;
    this._paddleX = Math.max(0, Math.min(this._W - pw, clientX - rect.left - pw / 2));
  }

  _togglePause() {
    if (this._over) return;
    this._paused = !this._paused;
    this._ui.btnPause.textContent = this._paused ? '▶️' : '⏸';
  }

  _bindUI() {
    this._ui.btnHome.addEventListener('click',    () => this.close());
    this._ui.btnPause.addEventListener('click',   () => this._togglePause());
    this._ui.btnRestart.addEventListener('click', () => {
      this._score = 0; this._lives = 3;
      this._startLevel(1);
    });
    this._ui.btnOverHome.addEventListener('click', () => this.close());
  }
}
