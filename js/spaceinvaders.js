/**
 * spaceinvaders.js — Classic Space Invaders
 *
 * Controls: Mouse move / Arrow keys / Touch drag — aim
 *           Click / Space / Tap — fire
 *           Esc / P — pause
 */

import { t } from './i18n.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const COLS             = 11;
const ROWS             = 5;
const ALIEN_W_BASE     = 38;   // scaled down on small screens
const ALIEN_H_BASE     = 26;
const PLAYER_W_PCT     = 0.065;
const PLAYER_SPEED_PCT = 0.014; // per dt unit
const BULLET_W         = 3;
const BULLET_H         = 14;
const BULLET_SPEED     = 10;
const ABUL_W           = 3;
const ABUL_H           = 14;
const ABUL_SPEED       = 3.5;
const MAX_PLAYER_BULLETS = 2;
const MAX_ALIEN_BULLETS  = 3;
const SHIELD_COLS      = 10;
const SHIELD_ROWS      = 6;
const SHIELD_CELL      = 5;
const NUM_SHIELDS      = 4;
const UFO_SPEED        = 2.2;
const UFO_INTERVAL_MIN = 20_000;
const UFO_INTERVAL_MAX = 40_000;
const BEST_KEY         = 'spaceinvaders_best';
const UFO_PTS_OPTIONS  = [50, 100, 150, 200, 300];

// Row 0 = top (hardest), row 4 = bottom
const ROW_TYPE = [0, 1, 1, 2, 2];   // 0=squid, 1=crab, 2=octopus
const ROW_PTS  = [30, 20, 20, 10, 10];
const TYPE_COLOR = ['#00ffee', '#55ff88', '#ffcc33'];

// ── Class ──────────────────────────────────────────────────────────────────────
export class SpaceInvaders {
  constructor() {
    this._canvas = document.getElementById('siCanvas');
    this._ctx    = this._canvas.getContext('2d');

    this._W = 0; this._H = 0;
    this._aliens      = [];
    this._player      = { x: 0 };
    this._bullets     = [];
    this._alienBullets= [];
    this._shields     = [];
    this._ufo         = { active: false, x: 0, y: 0, dir: 1, pts: 0 };
    this._score       = 0;
    this._lives       = 3;
    this._level       = 1;
    this._best        = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._paused      = false;
    this._over        = false;
    this._won         = false;
    this._raf         = null;
    this._animFrame   = 0;
    this._alienDx     = 1;
    this._nextAlienTick   = 0;
    this._nextUfoTime     = 0;
    this._alienFireTimer  = 0;
    this._playerInvincible = 0;  // invincibility frames after hit
    this._explosion   = null;    // { x, y, timer }
    this._stars       = null;    // generated once per wave
    this._keysHeld    = new Set();
    this._lastTs      = 0;

    this._ui = {
      screen:     document.getElementById('siScreen'),
      scoreEl:    document.getElementById('siScore'),
      bestEl:     document.getElementById('siBest'),
      livesEl:    document.getElementById('siLives'),
      levelEl:    document.getElementById('siLevel'),
      overlay:    document.getElementById('siOverlay'),
      overTitle:  document.getElementById('siOverTitle'),
      overScore:  document.getElementById('siFinalScore'),
      newBest:    document.getElementById('siNewBest'),
      btnHome:    document.getElementById('btnSIHome'),
      btnPause:   document.getElementById('btnSIPause'),
      btnRestart: document.getElementById('btnSIRestart'),
      btnOverHome:document.getElementById('btnSIOverHome'),
    };

    this._bindUI();
    this._bindInput();
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._resize();
    this._startWave(1);
  }

  close() {
    this._ui.screen.classList.remove('active');
    this._stopLoop();
  }

  // ── Setup ─────────────────────────────────────────────────────────────────────

  _resize() {
    this._W = this._canvas.clientWidth;
    this._H = this._canvas.clientHeight;
    this._canvas.width  = this._W;
    this._canvas.height = this._H;
  }

  _startWave(level) {
    this._stopLoop();
    this._level   = level;
    this._over    = false;
    this._won     = false;
    this._paused  = false;
    this._ui.overlay.style.display = 'none';
    this._ui.btnPause.textContent  = '⏸';
    this._animFrame      = 0;
    this._alienDx        = 1;
    this._alienFireTimer = 0;
    this._playerInvincible = 0;
    this._explosion      = null;
    this._stars          = null;
    this._ufo = { active: false, x: 0, y: 0, dir: 1, pts: 0 };
    this._nextUfoTime = performance.now() + UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);

    this._buildAliens();
    this._buildShields();
    this._resetPlayer();
    this._bullets      = [];
    this._alienBullets = [];
    this._updateHUD();
    this._raf = requestAnimationFrame((ts) => this._loop(ts));
  }

  _stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _alienTickInterval() {
    const alive = this._aliens.filter(a => a.alive).length;
    const total = COLS * ROWS;
    // Base slows per wave; speeds up as aliens die down to ~15% of base
    const base  = Math.max(120, 800 - (this._level - 1) * 80);
    return base * (0.15 + 0.85 * (alive / total));
  }

  _buildAliens() {
    this._aliens = [];
    const aw    = Math.min(ALIEN_W_BASE, (this._W - 24) / (COLS * 1.55));
    const ah    = aw * (ALIEN_H_BASE / ALIEN_W_BASE);
    const padX  = aw * 0.38;
    const padY  = ah * 0.5;
    const gridW = COLS * (aw + padX) - padX;
    const startX = (this._W - gridW) / 2;
    const startY = this._H * 0.09;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this._aliens.push({
          row: r, col: c,
          type: ROW_TYPE[r],
          pts:  ROW_PTS[r],
          alive: true,
          x: startX + c * (aw + padX),
          y: startY + r * (ah + padY),
          w: aw, h: ah,
        });
      }
    }
    this._nextAlienTick = performance.now() + this._alienTickInterval();
  }

  _buildShields() {
    this._shields = [];
    const sw      = SHIELD_COLS * SHIELD_CELL;
    const spacing = this._W / (NUM_SHIELDS + 1);
    const sy      = this._H * 0.72;

    for (let s = 0; s < NUM_SHIELDS; s++) {
      const sx   = spacing * (s + 1) - sw / 2;
      const grid = [];
      for (let r = 0; r < SHIELD_ROWS; r++) {
        grid.push([]);
        for (let c = 0; c < SHIELD_COLS; c++) {
          // Arch shape: cut top corners and bottom centre
          let alive = true;
          if (r === 0 && (c < 2 || c >= SHIELD_COLS - 2)) alive = false;
          if (r >= 4 && c >= 3 && c <= 6) alive = false;
          grid[r].push(alive);
        }
      }
      this._shields.push({ x: sx, y: sy, grid });
    }
  }

  _resetPlayer() {
    const pw = this._W * PLAYER_W_PCT;
    this._player = { x: (this._W - pw) / 2 };
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  _loop(ts) {
    if (!this._ui.screen.classList.contains('active')) return;
    this._raf = requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min((ts - this._lastTs) / 16.67, 3);
    this._lastTs = ts;

    if (!this._paused && !this._over) this._update(ts, dt);
    this._draw();
  }

  _update(ts, dt) {
    this._movePlayer(dt);
    this._moveBullets(dt);
    this._moveAlienBullets(dt);
    this._tickAliens(ts);
    this._tickAlienFire(dt);
    this._tickUfo(ts);
    this._moveUfo(dt);
    this._checkCollisions();
    if (this._playerInvincible > 0) this._playerInvincible -= dt;
    if (this._explosion) {
      this._explosion.timer -= dt;
      if (this._explosion.timer <= 0) this._explosion = null;
    }
  }

  // ── Alien movement (tick-based) ───────────────────────────────────────────────

  _tickAliens(ts) {
    if (ts < this._nextAlienTick) return;
    this._nextAlienTick = ts + this._alienTickInterval();
    this._animFrame ^= 1;

    const alive = this._aliens.filter(a => a.alive);
    if (alive.length === 0) return;

    const aw   = alive[0].w;
    const step = aw * 0.27;

    const xs   = alive.map(a => a.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...alive.map(a => a.x + a.w));

    if (
      (this._alienDx > 0 && maxX + step > this._W - 2) ||
      (this._alienDx < 0 && minX - step < 2)
    ) {
      // Drop and reverse
      const dropDist = alive[0].h * 0.55;
      for (const a of alive) a.y += dropDist;
      this._alienDx *= -1;

      // Aliens reached player zone?
      const playerY = this._H * 0.84;
      if (alive.some(a => a.y + a.h >= playerY)) {
        this._endGame(false);
        return;
      }
    } else {
      for (const a of alive) a.x += step * this._alienDx;
    }
  }

  // ── Alien firing ──────────────────────────────────────────────────────────────

  _tickAlienFire(dt) {
    this._alienFireTimer += dt;
    const interval = Math.max(25, 95 - this._level * 8);
    if (this._alienFireTimer < interval) return;
    this._alienFireTimer = 0;
    if (this._alienBullets.length >= MAX_ALIEN_BULLETS) return;

    // Bottom-most alive alien per column
    const colMap = new Map();
    for (const a of this._aliens) {
      if (!a.alive) continue;
      if (!colMap.has(a.col) || a.row > colMap.get(a.col).row) colMap.set(a.col, a);
    }
    const shooters = Array.from(colMap.values());
    if (shooters.length === 0) return;
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    this._alienBullets.push({ x: shooter.x + shooter.w / 2 - ABUL_W / 2, y: shooter.y + shooter.h, active: true });
  }

  // ── Player + projectile movement ──────────────────────────────────────────────

  _movePlayer(dt) {
    const pw  = this._W * PLAYER_W_PCT;
    const spd = this._W * PLAYER_SPEED_PCT;
    if (this._keysHeld.has('ArrowLeft')  || this._keysHeld.has('a') || this._keysHeld.has('A'))
      this._player.x = Math.max(0, this._player.x - spd * dt);
    if (this._keysHeld.has('ArrowRight') || this._keysHeld.has('d') || this._keysHeld.has('D'))
      this._player.x = Math.min(this._W - pw, this._player.x + spd * dt);
  }

  _moveBullets(dt) {
    for (const b of this._bullets) b.y -= BULLET_SPEED * dt;
    this._bullets = this._bullets.filter(b => b.y + BULLET_H >= 0);
  }

  _moveAlienBullets(dt) {
    for (const b of this._alienBullets) b.y += ABUL_SPEED * dt;
    this._alienBullets = this._alienBullets.filter(b => b.y <= this._H);
  }

  // ── UFO ───────────────────────────────────────────────────────────────────────

  _tickUfo(ts) {
    if (!this._ufo.active && ts >= this._nextUfoTime) {
      this._ufo.dir = Math.random() > 0.5 ? 1 : -1;
      this._ufo.x   = this._ufo.dir > 0 ? -52 : this._W + 52;
      this._ufo.y   = this._H * 0.045;
      this._ufo.pts = UFO_PTS_OPTIONS[Math.floor(Math.random() * UFO_PTS_OPTIONS.length)];
      this._ufo.active = true;
    }
  }

  _moveUfo(dt) {
    if (!this._ufo.active) return;
    this._ufo.x += UFO_SPEED * this._ufo.dir * dt;
    if (
      (this._ufo.dir > 0 && this._ufo.x > this._W + 52) ||
      (this._ufo.dir < 0 && this._ufo.x < -52)
    ) {
      this._ufo.active  = false;
      this._nextUfoTime = performance.now() + UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
    }
  }

  // ── Fire ──────────────────────────────────────────────────────────────────────

  _fire() {
    if (this._paused || this._over) return;
    if (this._bullets.length >= MAX_PLAYER_BULLETS) return;
    const pw = this._W * PLAYER_W_PCT;
    this._bullets.push({ x: this._player.x + pw / 2 - BULLET_W / 2, y: this._H * 0.83 });
  }

  // ── Collisions ────────────────────────────────────────────────────────────────

  _checkCollisions() {
    // Player bullets vs aliens
    for (const b of this._bullets) {
      for (const a of this._aliens) {
        if (!a.alive) continue;
        if (this._rectsOverlap(b.x, b.y, BULLET_W, BULLET_H, a.x, a.y, a.w, a.h)) {
          a.alive = false;
          b.y = -9999; // deactivate
          this._score += a.pts * this._level;
          this._explosion = { x: a.x + a.w / 2, y: a.y + a.h / 2, timer: 18 };
          this._updateHUD();
          if (this._aliens.every(al => !al.alive)) { this._endGame(true); return; }
          break;
        }
      }
    }

    // Player bullets vs UFO
    if (this._ufo.active) {
      for (const b of this._bullets) {
        if (this._rectsOverlap(b.x, b.y, BULLET_W, BULLET_H, this._ufo.x - 26, this._ufo.y - 12, 52, 24)) {
          b.y = -9999;
          this._score += this._ufo.pts;
          this._ufo.active  = false;
          this._nextUfoTime = performance.now() + UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
          this._updateHUD();
          break;
        }
      }
    }

    // Player bullets vs shields
    for (const b of this._bullets) {
      if (b.y < -100) continue;
      if (this._hitShield(b.x, b.y, BULLET_W, BULLET_H)) b.y = -9999;
    }

    // Alien bullets vs player
    if (this._playerInvincible <= 0) {
      const pw = this._W * PLAYER_W_PCT;
      const py = this._H * 0.84;
      for (const b of this._alienBullets) {
        if (b.y > this._H) continue;
        if (this._rectsOverlap(b.x, b.y, ABUL_W, ABUL_H, this._player.x, py, pw, 20)) {
          b.y = this._H + 100;
          this._lives--;
          this._playerInvincible = 90;
          this._updateHUD();
          if (this._lives <= 0) { this._endGame(false); return; }
          break;
        }
      }
    }

    // Alien bullets vs shields
    for (const b of this._alienBullets) {
      if (b.y > this._H) continue;
      if (this._hitShield(b.x, b.y, ABUL_W, ABUL_H)) b.y = this._H + 100;
    }

    // Clean up spent projectiles
    this._bullets      = this._bullets.filter(b => b.y > -100);
    this._alienBullets = this._alienBullets.filter(b => b.y <= this._H);
  }

  _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  _hitShield(bx, by, bw, bh) {
    for (const shield of this._shields) {
      if (!this._rectsOverlap(bx, by, bw, bh, shield.x, shield.y, SHIELD_COLS * SHIELD_CELL, SHIELD_ROWS * SHIELD_CELL)) continue;
      for (let r = 0; r < SHIELD_ROWS; r++) {
        for (let c = 0; c < SHIELD_COLS; c++) {
          if (!shield.grid[r][c]) continue;
          const cx = shield.x + c * SHIELD_CELL;
          const cy = shield.y + r * SHIELD_CELL;
          if (this._rectsOverlap(bx, by, bw, bh, cx, cy, SHIELD_CELL, SHIELD_CELL)) {
            shield.grid[r][c] = false;
            return true;
          }
        }
      }
    }
    return false;
  }

  // ── End game ──────────────────────────────────────────────────────────────────

  _endGame(won) {
    this._over = true;
    this._won  = won;
    this._stopLoop();

    const isNewBest = this._score > this._best;
    if (isNewBest) {
      this._best = this._score;
      localStorage.setItem(BEST_KEY, String(this._best));
    }

    this._ui.overTitle.textContent  = won ? t('siWave') : t('gameOver');
    this._ui.overScore.textContent  = this._score;
    this._ui.newBest.style.display  = isNewBest ? 'block' : 'none';
    this._ui.btnRestart.textContent = won ? t('siNextWave') : t('siPlayAgain');
    this._ui.overlay.style.display  = 'flex';
    this._updateHUD();
  }

  _updateHUD() {
    this._ui.scoreEl.textContent = `${t('score')}: ${this._score}`;
    this._ui.bestEl.textContent  = `${t('best')}: ${this._best}`;
    this._ui.levelEl.textContent = `${t('siWaveLabel')}: ${this._level}`;
    this._ui.livesEl.textContent = '🚀'.repeat(Math.max(0, this._lives));
  }

  // ── Drawing ───────────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this._ctx;
    const W = this._W, H = this._H;

    // Background
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, W, H);

    this._drawStars(ctx, W, H);

    // Shields
    ctx.fillStyle = '#44ee88';
    for (const shield of this._shields) {
      for (let r = 0; r < SHIELD_ROWS; r++) {
        for (let c = 0; c < SHIELD_COLS; c++) {
          if (shield.grid[r][c]) {
            ctx.fillRect(shield.x + c * SHIELD_CELL, shield.y + r * SHIELD_CELL, SHIELD_CELL - 1, SHIELD_CELL - 1);
          }
        }
      }
    }

    // Aliens
    for (const a of this._aliens) {
      if (!a.alive) continue;
      this._drawAlien(ctx, a.x, a.y, a.w, a.h, a.type, this._animFrame);
    }

    // UFO
    if (this._ufo.active) this._drawUfo(ctx);

    // Explosion flash
    if (this._explosion && this._explosion.timer > 0) {
      const alpha = this._explosion.timer / 18;
      ctx.fillStyle = `rgba(255,200,50,${alpha})`;
      ctx.beginPath();
      ctx.arc(this._explosion.x, this._explosion.y, 16 + (18 - this._explosion.timer), 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (flicker when invincible)
    const playerY = H * 0.84;
    const pw      = W * PLAYER_W_PCT;
    const showPlayer = this._playerInvincible <= 0 || Math.floor(this._playerInvincible / 6) % 2 === 0;
    if (showPlayer) this._drawPlayer(ctx, this._player.x, playerY, pw);

    // Player bullets
    ctx.fillStyle = '#ffff55';
    for (const b of this._bullets) {
      ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
    }

    // Alien bullets (zigzag visual)
    ctx.fillStyle = '#ff4466';
    for (const b of this._alienBullets) {
      ctx.fillRect(b.x, b.y, ABUL_W, ABUL_H);
    }

    // Ground line
    ctx.strokeStyle = 'rgba(68,238,136,0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.91);
    ctx.lineTo(W, H * 0.91);
    ctx.stroke();

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

  _drawStars(ctx, W, H) {
    if (!this._stars) {
      this._stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.55 + 0.2,
      }));
    }
    for (const s of this._stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawAlien(ctx, x, y, w, h, type, frame) {
    const col = TYPE_COLOR[type];
    ctx.fillStyle = col;

    // Body
    ctx.beginPath();
    ctx.roundRect(x + w * 0.12, y + h * 0.22, w * 0.76, h * 0.58, 3);
    ctx.fill();

    // Dark eyes
    ctx.fillStyle = '#0d0f14';
    ctx.beginPath(); ctx.arc(x + w * 0.33, y + h * 0.44, w * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.67, y + h * 0.44, w * 0.1, 0, Math.PI * 2); ctx.fill();

    // Animated legs
    ctx.strokeStyle  = col;
    ctx.lineWidth    = Math.max(1.5, w * 0.045);
    const legBase    = y + h * 0.8;
    const legTip     = y + h * (frame === 0 ? 0.97 : 1.02);
    const spread     = (frame === 0 ? 0.14 : -0.09) * w;

    for (const offset of [-0.28, 0, 0.28]) {
      const lx = x + w * (0.5 + offset);
      ctx.beginPath(); ctx.moveTo(lx, legBase); ctx.lineTo(lx + spread, legTip); ctx.stroke();
    }

    // Type-specific features
    ctx.fillStyle = col;
    if (type === 0) {
      // Squid — top spikes
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.22);
      ctx.lineTo(x + w * 0.16, y + h * 0.03);
      ctx.lineTo(x + w * 0.33, y + h * 0.18);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.75, y + h * 0.22);
      ctx.lineTo(x + w * 0.84, y + h * 0.03);
      ctx.lineTo(x + w * 0.67, y + h * 0.18);
      ctx.closePath(); ctx.fill();
    } else if (type === 1) {
      // Crab — side arm nubs
      ctx.fillRect(x,            y + h * 0.28, w * 0.12, h * 0.22);
      ctx.fillRect(x + w * 0.88, y + h * 0.28, w * 0.12, h * 0.22);
    }
    // type 2 (octopus) uses only body + legs
  }

  _drawPlayer(ctx, x, y, w) {
    const h = 22;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#88ffcc');
    grad.addColorStop(1, '#006644');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w,     y + h);
    ctx.lineTo(x,         y + h);
    ctx.closePath();
    ctx.fill();
    // Cannon tip
    ctx.fillStyle = '#aaffdd';
    ctx.fillRect(x + w * 0.44, y - 5, w * 0.12, 7);
  }

  _drawUfo(ctx) {
    const x = this._ufo.x, y = this._ufo.y;
    ctx.fillStyle = '#ff4499';
    ctx.beginPath(); ctx.ellipse(x, y, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,100,180,0.55)';
    ctx.beginPath(); ctx.ellipse(x, y - 7, 15, 9, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ffeecc';
    for (const ox of [-9, 0, 9]) {
      ctx.beginPath(); ctx.arc(x + ox, y - 2, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  _bindInput() {
    let touchStartX = null;
    let touchOriginX = null;

    // Touch move → slide player
    this._canvas.addEventListener('touchstart', (e) => {
      touchStartX  = e.touches[0].clientX;
      touchOriginX = e.touches[0].clientX;
    }, { passive: true });

    this._canvas.addEventListener('touchmove', (e) => {
      if (touchStartX === null) return;
      const dx = e.touches[0].clientX - touchStartX;
      touchStartX = e.touches[0].clientX;
      const pw = this._W * PLAYER_W_PCT;
      this._player.x = Math.max(0, Math.min(this._W - pw, this._player.x + dx));
    }, { passive: true });

    this._canvas.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      if (touchOriginX !== null && Math.abs(endX - touchOriginX) < 20) this._fire();
      touchStartX  = null;
      touchOriginX = null;
    }, { passive: true });

    // Mouse move → position player
    this._canvas.addEventListener('mousemove', (e) => {
      const rect = this._canvas.getBoundingClientRect();
      const pw   = this._W * PLAYER_W_PCT;
      this._player.x = Math.max(0, Math.min(this._W - pw, e.clientX - rect.left - pw / 2));
    });
    this._canvas.addEventListener('click', () => this._fire());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this._ui.screen.classList.contains('active')) return;
      this._keysHeld.add(e.key);
      if (e.key === ' ') { e.preventDefault(); this._fire(); }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this._togglePause();
    });
    window.addEventListener('keyup', (e) => this._keysHeld.delete(e.key));

    window.addEventListener('resize', () => {
      if (!this._ui.screen.classList.contains('active')) return;
      this._resize();
      this._startWave(this._level);
    });
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
      if (this._won) {
        this._startWave(this._level + 1);
      } else {
        this._score = 0; this._lives = 3;
        this._startWave(1);
      }
    });
    this._ui.btnOverHome.addEventListener('click', () => this.close());
  }
}
