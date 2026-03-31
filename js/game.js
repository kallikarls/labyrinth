/**
 * game.js — Game state machine: MENU → PLAYING → WIN → MENU
 *
 * Orchestrates all modules: maze, physics, renderer, input, audio, particles.
 */

import { generateMaze, LEVELS } from './maze.js';
import { Physics }              from './physics.js';
import { Renderer }             from './renderer.js';
import { Input }                from './input.js';
import { Audio }                from './audio.js';
import { Confetti, Trail }      from './particles.js';
import { t }                    from './i18n.js';

const SAVE_KEY = 'labyrinth_stars';

// Game states
const STATE = { HOME: 'home', MENU: 'menu', PLAYING: 'playing', WIN: 'win' };

export class Game {
  constructor() {
    // Canvas
    this.canvas      = document.getElementById('gameCanvas');
    this.confCanvas  = document.getElementById('confettiCanvas');

    // Modules
    this.renderer  = new Renderer(this.canvas);
    this.physics   = new Physics();
    this.input     = new Input();
    this.audio     = new Audio();
    this.confetti  = new Confetti(this.confCanvas);
    this.trail     = new Trail();

    // State
    this.state       = STATE.MENU;
    this.level       = null;   // 'easy' | 'medium' | 'hard'
    this.maze        = null;
    this.mazeCols    = 0;
    this.mazeRows    = 0;
    this.offsetX     = 0;
    this.offsetY     = 0;

    // Stars saved per level  { easy: '⭐', medium: '', hard: '' }
    this.stars       = this._loadStars();

    // Loop
    this._raf        = null;
    this._lastTime   = 0;
    this._winCooldown = 0;

    // UI elements
    this._ui = {
      homeScreen:  document.getElementById('homeScreen'),
      startScreen: document.getElementById('startScreen'),
      hud:         document.getElementById('hud'),
      winScreen:   document.getElementById('winScreen'),
      hudLevel:    document.getElementById('hudLevelName'),
      winEmoji:    document.getElementById('winEmoji'),
      winSub:      document.getElementById('winSub'),
      winStars:    document.getElementById('winStars'),
      btnLabyrinth:document.getElementById('btnLabyrinth'),
      btnAllGames: document.getElementById('btnAllGames'),
      btnEasy:     document.getElementById('btnEasy'),
      btnMedium:   document.getElementById('btnMedium'),
      btnHard:     document.getElementById('btnHard'),
      btnHome:     document.getElementById('btnHome'),
      btnMute:     document.getElementById('btnMute'),
      btnNewMaze:  document.getElementById('btnNewMaze'),
      btnPlayAgain:document.getElementById('btnPlayAgain'),
      btnGoHome:   document.getElementById('btnGoHome'),
      starsEasy:   document.getElementById('starsEasy'),
      starsMedium: document.getElementById('starsMedium'),
      starsHard:   document.getElementById('starsHard'),
      keyHint:     document.getElementById('keyboardHint'),
      hintText:    document.getElementById('hintText'),
    };

    this._bindUI();
    this._updateStarDisplay();
    this._showScreen(STATE.HOME);
  }

  // ── Initialise ───────────────────────────────────────────────────────────────

  start() {
    this.renderer.resize();
    this.input.bindTouch(this.canvas);
    this._showKeyboardHint();

    window.addEventListener('resize', () => {
      this.renderer.resize();
      if (this.state === STATE.PLAYING) this._rebuildLayout();
    });

    this._loop(0);
  }

  // ── Level start ─────────────────────────────────────────────────────────────

  async _startLevel(levelKey) {
    this.audio.init();       // unlock audio on user gesture
    this.audio.playClick();

    // Request gyro permission (iOS)
    await this.input.requestGyroPermission();

    this.level = levelKey;
    const cfg  = LEVELS[levelKey];
    this.mazeCols = cfg.cols;
    this.mazeRows = cfg.rows;

    this._buildMaze();
    this._showScreen(STATE.PLAYING);
    this._ui.hudLevel.textContent = cfg.name;
    this._ui.hudLevel.style.color = cfg.color;
    this.state = STATE.PLAYING;
    this._winCooldown = 120; // frames to wait before win detection (prevent instant win)
  }

  _buildMaze() {
    this.maze = generateMaze(this.mazeCols, this.mazeRows);
    this._rebuildLayout();
    this.trail.clear();
    // Re-calibrate gyroscope neutral position for each new maze
    // (handles orientation changes between levels or new maze generations)
    if (this.input.recalibrate) this.input.recalibrate();
  }

  _rebuildLayout() {
    const layout = this.renderer.computeLayout(this.mazeCols, this.mazeRows);
    this.offsetX = layout.offsetX;
    this.offsetY = layout.offsetY;

    this.physics.setLayout(
      this.maze, this.mazeCols, this.mazeRows,
      layout.cellW, layout.cellH, layout.wallThick, layout.ballRadius
    );
    this.physics.setOffsets(this.offsetX, this.offsetY);
    this.physics.placeAtStart(this.offsetX, this.offsetY);
  }

  // ── Win ──────────────────────────────────────────────────────────────────────

  _handleWin() {
    this.state = STATE.WIN;
    this.audio.stopRolling();
    this.audio.playVictory();

    // Award star
    if (!this.stars[this.level]) {
      this.stars[this.level] = '⭐';
      this._saveStars();
      this._updateStarDisplay();
    }

    // Confetti
    this.confetti.burst();

    // Update win screen text
    const emojis = ['🎉', '🌟', '🏆', '🥳', '✨'];
    this._ui.winEmoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    this._ui.winSub.textContent   = t('foundExit');
    this._ui.winStars.textContent = this.stars[this.level] || '';

    this._showScreen(STATE.WIN);

    // Resize confetti canvas to match window
    this.confCanvas.width  = window.innerWidth;
    this.confCanvas.height = window.innerHeight;
    this.confetti.burst();
  }

  // ── Game Loop ────────────────────────────────────────────────────────────────

  _loop(timestamp) {
    this._raf = requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this.state !== STATE.PLAYING) return;

    // Feed tilt input to physics
    this.physics.tiltX = this.input.tiltX;
    this.physics.tiltY = this.input.tiltY;
    this.physics.keysX = this.input.keysX;
    this.physics.keysY = this.input.keysY;

    // Track previous position for wall-bump detection
    const px = this.physics.x;
    const py = this.physics.y;

    this.physics.update(this.offsetX, this.offsetY);

    // Detect wall bump (velocity reversal = hit)
    if (this.physics._lastBump > 0) {
      this.audio.playBump(0.3 + this.physics._lastBump * 0.7);
    }

    // Update rolling audio
    this.audio.updateRolling(this.physics.normalizedSpeed);

    // Trail
    this.trail.add(this.physics.x, this.physics.y);

    const ball = {
      x: this.physics.x,
      y: this.physics.y,
      vx: this.physics.vx,
      vy: this.physics.vy,
      _trail: this.trail.get(),
    };

    this.renderer.drawFrame(this.maze, this.mazeCols, this.mazeRows, ball, dt);

    // Win detection (with cooldown so ball needs to travel to exit)
    if (this._winCooldown > 0) {
      this._winCooldown--;
    } else if (this.physics.isAtExit(this.offsetX, this.offsetY)) {
      this._handleWin();
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────────

  _bindUI() {
    const ui = this._ui;

    ui.btnLabyrinth.addEventListener('click', () => this._showScreen(STATE.MENU));
    ui.btnAllGames.addEventListener('click',  () => this._showScreen(STATE.HOME));

    const startLevel = (key) => this._startLevel(key);
    ui.btnEasy.addEventListener('click',   () => startLevel('easy'));
    ui.btnMedium.addEventListener('click', () => startLevel('medium'));
    ui.btnHard.addEventListener('click',   () => startLevel('hard'));

    ui.btnHome.addEventListener('click', () => {
      this.audio.stopRolling();
      this.audio.playClick();
      this.state = STATE.MENU;
      this._showScreen(STATE.MENU);
    });

    ui.btnMute.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      ui.btnMute.textContent = muted ? '🔇' : '🔊';
    });

    ui.btnNewMaze.addEventListener('click', () => {
      this.audio.playClick();
      this._buildMaze();
      this._winCooldown = 120;
    });

    ui.btnPlayAgain.addEventListener('click', () => {
      this.confetti.stop();
      this.audio.playClick();
      this._buildMaze();
      this.state = STATE.PLAYING;
      this._winCooldown = 120;
      this._showScreen(STATE.PLAYING);
    });

    ui.btnGoHome.addEventListener('click', () => {
      this.confetti.stop();
      this.audio.playClick();
      this.state = STATE.MENU;
      this._showScreen(STATE.MENU);
    });
  }

  _showScreen(state) {
    const ui = this._ui;

    // Deactivate all
    ui.homeScreen.classList.remove('active');
    ui.startScreen.classList.remove('active');
    ui.hud.classList.remove('active');
    ui.winScreen.classList.remove('active');

    if (state === STATE.HOME) {
      ui.homeScreen.classList.add('active');
    } else if (state === STATE.MENU) {
      ui.startScreen.classList.add('active');
    } else if (state === STATE.PLAYING) {
      // HUD is visible but its pointer-events are controlled per-element
      ui.hud.classList.add('active');
    } else if (state === STATE.WIN) {
      ui.winScreen.classList.add('active');
    }
  }

  _showKeyboardHint() {
    // Only show on non-touch devices
    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
      this._ui.keyHint.classList.add('visible');
      this._ui.hintText.textContent = t('hintKeys');
      // Hide after 5s
      setTimeout(() => this._ui.keyHint.classList.remove('visible'), 5000);
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  _loadStars() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    } catch { return {}; }
  }

  _saveStars() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.stars));
    } catch {}
  }

  _updateStarDisplay() {
    this._ui.starsEasy.textContent   = this.stars.easy   || '';
    this._ui.starsMedium.textContent = this.stars.medium || '';
    this._ui.starsHard.textContent   = this.stars.hard   || '';
  }
}
