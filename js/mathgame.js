/**
 * mathgame.js — Elementary Maths Game
 *
 * Four operations: + − × ÷
 * Three levels of difficulty — shown as stars ⭐
 *   Level 1 (⭐)     : + and −   ,  numbers 1–10
 *   Level 2 (⭐⭐)   : + − × ÷   ,  numbers 1–10
 *   Level 3 (⭐⭐⭐) : + − × ÷   ,  numbers 1–20
 *
 * 10 questions per round.
 * 4 multiple-choice buttons — one correct, three plausible wrong answers.
 * Timer per question (10 s). Bonus points for speed.
 * Wrong answer shows the correct one briefly before moving on.
 * Score + best score persisted in localStorage.
 */

import { t } from './i18n.js';

const BEST_KEY    = 'mathgame_best';
const Q_PER_GAME  = 10;
const Q_TIME_MS   = 10_000;

export class MathGame {
  constructor() {
    this._ui = {
      screen:      document.getElementById('mgScreen'),
      overlay:     document.getElementById('mgOverlay'),
      overEmoji:   document.getElementById('mgOverEmoji'),
      overTitle:   document.getElementById('mgOverTitle'),
      overScore:   document.getElementById('mgOverScore'),
      overBest:    document.getElementById('mgOverBest'),
      btnStart:    document.getElementById('btnMGStart'),
      btnHome:     document.getElementById('btnMGHome'),
      btnOverHome: document.getElementById('btnMGOverHome'),
      catBtns:     document.querySelectorAll('.mg-cat-btn'),
      progressBar: document.getElementById('mgProgressBar'),
      progressTxt: document.getElementById('mgProgressTxt'),
      timerBar:    document.getElementById('mgTimerBar'),
      questionEl:  document.getElementById('mgQuestion'),
      choicesEl:   document.getElementById('mgChoices'),
      streakEl:    document.getElementById('mgStreak'),
      scoreEl:     document.getElementById('mgScore'),
    };

    this._best     = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._category = 'mixed'; // 'add' | 'sub' | 'mul' | 'div' | 'mixed'
    this._score    = 0;
    this._qIdx    = 0;
    this._streak  = 0;
    this._state   = 'idle';
    this._timer   = null;
    this._timerStart = 0;
    this._rafTimer   = null;

    this._bindUI();
  }

  // ── Public ────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._showOverlay();
  }

  close() {
    this._stopTimer();
    this._ui.screen.classList.remove('active');
    this._state = 'idle';
  }

  // ── Overlay ───────────────────────────────────────────────────────────────

  _showOverlay() {
    this._ui.overEmoji.textContent = '🔢';
    this._ui.overTitle.textContent = t('mgName');
    this._ui.overScore.textContent = t('mgDesc');
    const best = this._best > 0 ? `${t('best')}: ${this._best} ${t('mgPts')}` : '';
    this._ui.overBest.textContent  = best;
    this._ui.btnStart.textContent  = t('mgStart');
    this._ui.overlay.style.display = 'flex';
    // Update category button labels for current language
    const _catKeys = { add: 'mgCatAdd', sub: 'mgCatSub', mul: 'mgCatMul', div: 'mgCatDiv', mixed: 'mgCatMixed' };
    this._ui.catBtns.forEach(b => { b.textContent = t(_catKeys[b.dataset.cat] || b.dataset.cat); });
    this._setActiveCategory(this._category);
  }

  _showEndOverlay() {
    const isNew = this._score > this._best;
    if (isNew) {
      this._best = this._score;
      localStorage.setItem(BEST_KEY, String(this._best));
    }
    this._ui.overEmoji.textContent = this._score >= Q_PER_GAME * 80 ? '🏆' : '🎉';
    this._ui.overTitle.textContent = t('mgDone');
    this._ui.overScore.textContent = `${this._score} ${t('mgPts')}${isNew ? '  🏆' : ''}`;
    this._ui.overBest.textContent  = `${t('best')}: ${this._best} ${t('mgPts')}`;
    this._ui.btnStart.textContent  = t('mgPlayAgain');
    this._ui.overlay.style.display = 'flex';
  }

  // ── Category selection ─────────────────────────────────────────────────────

  _setActiveCategory(cat) {
    this._category = cat;
    this._ui.catBtns.forEach(b => {
      b.classList.toggle('mg-cat-active', b.dataset.cat === cat);
    });
  }

  // ── Game flow ─────────────────────────────────────────────────────────────

  _startGame() {
    this._score   = 0;
    this._qIdx    = 0;
    this._streak  = 0;
    this._state   = 'playing';
    this._ui.overlay.style.display = 'none';
    this._updateHUD();
    this._nextQuestion();
  }

  _nextQuestion() {
    if (this._qIdx >= Q_PER_GAME) { this._endGame(); return; }

    const q = this._generateQuestion();
    this._currentQ = q;

    // Progress
    this._ui.progressTxt.textContent = `${this._qIdx + 1} / ${Q_PER_GAME}`;
    this._ui.progressBar.style.width = `${(this._qIdx / Q_PER_GAME) * 100}%`;

    // Question
    this._ui.questionEl.textContent = q.text;
    this._ui.questionEl.classList.remove('mg-q-pop');
    void this._ui.questionEl.offsetWidth;
    this._ui.questionEl.classList.add('mg-q-pop');

    // Choices
    this._renderChoices(q);

    // Timer
    this._startTimer();
  }

  _endGame() {
    this._stopTimer();
    this._state = 'over';
    this._showEndOverlay();
  }

  // ── Question generator ────────────────────────────────────────────────────

  _generateQuestion() {
    const lvl = this._level;

    // Available operations by level
    const ops = lvl === 1 ? ['+', '−'] : ['+', '−', '×', '÷'];
    const op  = ops[Math.floor(Math.random() * ops.length)];
    const max = lvl <= 2 ? 10 : 20;

    let a, b, answer;

    if (op === '+') {
      a = this._rand(1, max);
      b = this._rand(1, max);
      answer = a + b;
    } else if (op === '−') {
      a = this._rand(1, max);
      b = this._rand(1, a);       // ensure b ≤ a so answer ≥ 0
      answer = a - b;
    } else if (op === '×') {
      a = this._rand(2, Math.min(max, 10));
      b = this._rand(2, Math.min(max, 10));
      answer = a * b;
    } else { // ÷
      b      = this._rand(2, Math.min(max, 10));
      answer = this._rand(1, Math.min(max, 10));
      a      = b * answer; // guarantee clean division
    }

    const text = `${a}  ${op}  ${b}  =  ?`;
    const choices = this._makeChoices(answer, op, max);
    return { text, answer, choices };
  }

  _makeChoices(correct, op, max) {
    const set  = new Set([correct]);
    const near = (n) => Math.max(0, n + this._randOffset());

    // Generate plausible wrong answers
    const candidates = [];
    for (let tries = 0; candidates.length < 8 && tries < 40; tries++) {
      const c = near(correct);
      if (!set.has(c) && c >= 0 && c <= max * max) { candidates.push(c); set.add(c); }
    }

    const wrong = candidates.slice(0, 3);
    // Pad if not enough candidates
    let pad = 0;
    while (wrong.length < 3) { const v = correct + (++pad); if (!set.has(v)) { wrong.push(v); set.add(v); } }

    const all = this._shuffle([correct, ...wrong]);
    return all.map(v => ({ value: v, correct: v === correct }));
  }

  _randOffset() {
    const offsets = [-3, -2, -1, 1, 2, 3, -5, 5, 10, -10];
    return offsets[Math.floor(Math.random() * offsets.length)];
  }

  // ── Render choices ────────────────────────────────────────────────────────

  _renderChoices(q) {
    this._ui.choicesEl.innerHTML = '';
    this._state = 'playing';

    q.choices.forEach(ch => {
      const btn = document.createElement('button');
      btn.className   = 'mg-choice';
      btn.textContent = ch.value;
      btn.addEventListener('click',    () => this._choose(btn, ch));
      btn.addEventListener('touchend', e  => { e.preventDefault(); this._choose(btn, ch); });
      this._ui.choicesEl.appendChild(btn);
    });
  }

  _choose(btn, ch) {
    if (this._state !== 'playing') return;
    this._state = 'feedback';
    this._stopTimer();

    const elapsed = Math.max(0, Q_TIME_MS - (performance.now() - this._timerStart));
    const speedBonus = Math.round((elapsed / Q_TIME_MS) * 50);

    if (ch.correct) {
      btn.classList.add('mg-correct');
      this._streak++;
      const streakBonus = this._streak >= 3 ? 20 : 0;
      this._score += 100 + speedBonus + streakBonus;
      this._updateHUD();
      setTimeout(() => { this._qIdx++; this._nextQuestion(); }, 650);
    } else {
      btn.classList.add('mg-wrong');
      this._streak = 0;
      this._updateHUD();
      // Highlight the correct button
      [...this._ui.choicesEl.querySelectorAll('.mg-choice')].forEach(b => {
        if (parseInt(b.textContent) === this._currentQ.answer) b.classList.add('mg-correct-reveal');
      });
      setTimeout(() => { this._qIdx++; this._nextQuestion(); }, 1200);
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  _startTimer() {
    this._stopTimer();
    this._timerStart = performance.now();
    this._ui.timerBar.style.transition = 'none';
    this._ui.timerBar.style.width      = '100%';
    this._ui.timerBar.style.background = '#2ecc71';

    // Animate via rAF
    const tick = () => {
      const elapsed  = performance.now() - this._timerStart;
      const pct      = Math.max(0, 1 - elapsed / Q_TIME_MS);
      this._ui.timerBar.style.width = `${pct * 100}%`;
      this._ui.timerBar.style.background = pct > 0.5 ? '#2ecc71'
        : pct > 0.25 ? '#f39c12' : '#e74c3c';
      if (pct > 0 && this._state === 'playing') {
        this._rafTimer = requestAnimationFrame(tick);
      } else if (pct <= 0 && this._state === 'playing') {
        this._onTimeUp();
      }
    };
    this._rafTimer = requestAnimationFrame(tick);
  }

  _stopTimer() {
    if (this._rafTimer) { cancelAnimationFrame(this._rafTimer); this._rafTimer = null; }
  }

  _onTimeUp() {
    if (this._state !== 'playing') return;
    this._state  = 'feedback';
    this._streak = 0;
    this._updateHUD();
    // Show correct answer
    [...this._ui.choicesEl.querySelectorAll('.mg-choice')].forEach(b => {
      if (parseInt(b.textContent) === this._currentQ.answer) b.classList.add('mg-correct-reveal');
    });
    setTimeout(() => { this._qIdx++; this._nextQuestion(); }, 1200);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    this._ui.scoreEl.textContent  = this._score;
    this._ui.streakEl.textContent = this._streak >= 3
      ? `🔥 ${this._streak}` : this._streak > 0 ? `⚡ ${this._streak}` : '';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _bindUI() {
    this._ui.btnHome.addEventListener('click',     () => this.close());
    this._ui.btnOverHome.addEventListener('click', () => this.close());
    this._ui.btnStart.addEventListener('click',    () => this._startGame());
    this._ui.catBtns.forEach(b => {
      b.addEventListener('click', () => this._setActiveCategory(b.dataset.cat));
    });
  }
}
