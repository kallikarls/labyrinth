/**
 * timegame.js — Tell the Time Game
 *
 * Shows an analogue clock face and asks the player to identify the time.
 * Four multiple-choice buttons show candidate times including morning/afternoon.
 * IS: 24-hour format with ☀️/🌙 icons.
 * EN: 12-hour AM/PM format with ☀️/🌙 icons.
 *
 * 10 questions per round, no time pressure.
 */

import { t, getLang } from './i18n.js';

const BEST_KEY   = 'timegame_best';
const Q_PER_GAME = 10;

export class TimeGame {
  constructor() {
    this._ui = {
      screen:      document.getElementById('tgScreen'),
      overlay:     document.getElementById('tgOverlay'),
      overEmoji:   document.getElementById('tgOverEmoji'),
      overTitle:   document.getElementById('tgOverTitle'),
      overScore:   document.getElementById('tgOverScore'),
      overBest:    document.getElementById('tgOverBest'),
      btnStart:    document.getElementById('btnTGStart'),
      btnHome:     document.getElementById('btnTGHome'),
      btnOverHome: document.getElementById('btnTGOverHome'),
      canvas:      document.getElementById('tgClock'),
      choicesEl:   document.getElementById('tgChoices'),
      streakEl:    document.getElementById('tgStreak'),
      scoreEl:     document.getElementById('tgScore'),
      progressBar: document.getElementById('tgProgressBar'),
      progressTxt: document.getElementById('tgProgressTxt'),
    };
    this._ctx      = this._ui.canvas.getContext('2d');
    this._best     = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._score    = 0;
    this._qIdx     = 0;
    this._streak   = 0;
    this._state    = 'idle';
    this._currentQ = null;
    this._clockSize = 260;
    this._bindUI();
  }

  // ── Public ────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._resizeClock();
    this._showOverlay();
  }

  close() {
    this._ui.screen.classList.remove('active');
    this._state = 'idle';
  }

  // ── Clock drawing ─────────────────────────────────────────────────────────

  _resizeClock() {
    const canvas = this._ui.canvas;
    const wrap   = canvas.parentElement;
    const size   = Math.min(248, wrap.clientWidth - 40);
    const dpr    = window.devicePixelRatio || 1;
    canvas.width        = Math.round(size * dpr);
    canvas.height       = Math.round(size * dpr);
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    this._ctx.scale(dpr, dpr);
    this._clockSize = size;
  }

  _drawClock(hour12, minute) {
    const ctx = this._ctx;
    const S   = this._clockSize;
    const cx  = S / 2;
    const cy  = S / 2;
    const R   = S / 2 - 4;

    ctx.clearRect(0, 0, S, S);

    // Face
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#16213e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,152,219,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const a     = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isH   = i % 5 === 0;
      const outer = R - 1;
      const inner = isH ? R * 0.86 : R * 0.93;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.strokeStyle = isH ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = isH ? 2.5 : 1.2;
      ctx.stroke();
    }

    // Minute numbers — outer ring at each 5-minute mark
    const minFontSize = Math.round(S * 0.062);
    ctx.font         = `bold ${minFontSize}px sans-serif`;
    ctx.fillStyle    = 'rgba(100,210,235,0.88)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const a     = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const label = (i * 5).toString().padStart(2, '0');
      ctx.fillText(label, cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78);
    }

    // Hour numbers — inner ring
    const fontSize = Math.round(S * 0.092);
    ctx.font         = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(i.toString(), cx + Math.cos(a) * R * 0.59, cy + Math.sin(a) * R * 0.59);
    }

    // Hour hand
    const hFrac  = ((hour12 % 12) + minute / 60) / 12;
    this._drawHand(ctx, cx, cy, hFrac * Math.PI * 2, R * 0.44, S * 0.040, '#ffffff');

    // Minute hand
    const mFrac = minute / 60;
    this._drawHand(ctx, cx, cy, mFrac * Math.PI * 2, R * 0.67, S * 0.026, '#e74c3c');

    // Center cap
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // angle = 0 means pointing at 12-o'clock, increases clockwise
  _drawHand(ctx, cx, cy, angle, len, width, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, len * 0.16);   // short stub behind centre
    ctx.lineTo(0, -len);
    ctx.strokeStyle = color;
    ctx.lineWidth   = Math.max(2, width);
    ctx.stroke();
    ctx.restore();
  }

  // ── Question generator ────────────────────────────────────────────────────

  _generateQuestion() {
    const isMorning = Math.random() < 0.5;
    // Morning: 1–12  (hour24 = 1–12, noon included)
    // Afternoon: 1–11 (hour24 = 13–23, avoids midnight 0:xx)
    const hour12 = isMorning ? this._rand(1, 12) : this._rand(1, 11);
    const minute = this._rand(0, 11) * 5;
    const hour24 = isMorning ? hour12 : hour12 + 12;

    const choices = this._buildChoices(hour12, minute, isMorning, hour24);
    return { hour12, minute, isMorning, hour24, choices };
  }

  _buildChoices(hour12, minute, isMorning, correctH24) {
    const used   = new Set([`${correctH24}:${minute}`]);
    const wrongs = [];

    // 1. Opposite period, same clock reading
    const flipH24 = isMorning ? hour12 + 12 : hour12;
    const flipKey = `${flipH24}:${minute}`;
    if (!used.has(flipKey)) { used.add(flipKey); wrongs.push({ hour24: flipH24, minute }); }

    // 2. Different minute (±15, ±30), same hour24
    for (const dm of [15, -15, 30, -30, 45, -45]) {
      if (wrongs.length >= 3) break;
      const nm  = ((minute + dm) % 60 + 60) % 60;
      const key = `${correctH24}:${nm}`;
      if (!used.has(key)) { used.add(key); wrongs.push({ hour24: correctH24, minute: nm }); }
    }

    // 3. Different hour (±1), same period
    for (const dh of [1, -1, 2, -2]) {
      if (wrongs.length >= 3) break;
      const nh12 = ((hour12 - 1 + dh + 12) % 12) + 1;
      if (!isMorning && nh12 > 11) continue; // avoid 12 in afternoon (would be midnight)
      const nh24 = isMorning ? nh12 : nh12 + 12;
      const key  = `${nh24}:${minute}`;
      if (!used.has(key)) { used.add(key); wrongs.push({ hour24: nh24, minute }); }
    }

    const correct = { hour24: correctH24, minute, correct: true };
    const all     = this._shuffle([
      correct,
      ...wrongs.slice(0, 3).map(w => ({ ...w, correct: false })),
    ]);
    return all.map(c => ({
      label:   this._formatTime(c.hour24, c.minute),
      hour24:  c.hour24,
      minute:  c.minute,
      correct: c.correct,
    }));
  }

  _formatTime(hour24, minute) {
    const mm   = minute.toString().padStart(2, '0');
    const icon = hour24 <= 12 ? '☀️' : '🌙';
    if (getLang() === 'en') {
      const h12   = hour24 % 12 || 12;
      const period = hour24 < 12 ? 'AM' : 'PM';
      return `${icon} ${h12}:${mm} ${period}`;
    }
    // IS: 24-hour with icon
    const hh = hour24.toString().padStart(2, '0');
    return `${icon} ${hh}:${mm}`;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _renderChoices(q) {
    this._ui.choicesEl.innerHTML = '';
    this._state = 'playing';
    q.choices.forEach(ch => {
      const btn = document.createElement('button');
      btn.className   = 'tg-choice';
      btn.textContent = ch.label;
      btn.addEventListener('click',    () => this._choose(btn, ch));
      btn.addEventListener('touchend', e  => { e.preventDefault(); this._choose(btn, ch); });
      this._ui.choicesEl.appendChild(btn);
    });
  }

  _choose(btn, ch) {
    if (this._state !== 'playing') return;
    this._state = 'feedback';

    if (ch.correct) {
      btn.classList.add('tg-correct');
      this._streak++;
      this._score += 100 + (this._streak >= 3 ? 20 : 0);
      this._updateHUD();
      setTimeout(() => { this._qIdx++; this._nextQuestion(); }, 900);
    } else {
      btn.classList.add('tg-wrong');
      this._streak = 0;
      this._updateHUD();
      this._revealCorrect();
      setTimeout(() => { this._qIdx++; this._nextQuestion(); }, 1400);
    }
  }

  _revealCorrect() {
    [...this._ui.choicesEl.querySelectorAll('.tg-choice')].forEach(b => {
      const match = this._currentQ.choices.find(c => c.label === b.textContent);
      if (match?.correct) b.classList.add('tg-correct-reveal');
    });
  }



  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    this._ui.scoreEl.textContent  = this._score;
    this._ui.streakEl.textContent = this._streak >= 3
      ? `🔥 ${this._streak}` : this._streak > 0 ? `⚡ ${this._streak}` : '';
  }

  // ── Overlays ──────────────────────────────────────────────────────────────

  _showOverlay() {
    this._ui.overEmoji.textContent = '🕐';
    this._ui.overTitle.textContent = t('tgName');
    this._ui.overScore.textContent = t('tgDesc');
    const best = this._best > 0 ? `${t('best')}: ${this._best} ${t('tgPts')}` : '';
    this._ui.overBest.textContent  = best;
    this._ui.btnStart.textContent  = t('tgStart');
    this._ui.overlay.style.display = 'flex';
  }

  _showEndOverlay() {
    const isNew = this._score > this._best;
    if (isNew) { this._best = this._score; localStorage.setItem(BEST_KEY, String(this._best)); }
    this._ui.overEmoji.textContent = this._score >= Q_PER_GAME * 80 ? '🏆' : '🎉';
    this._ui.overTitle.textContent = t('tgDone');
    this._ui.overScore.textContent = `${this._score} ${t('tgPts')}${isNew ? '  🏆' : ''}`;
    this._ui.overBest.textContent  = `${t('best')}: ${this._best} ${t('tgPts')}`;
    this._ui.btnStart.textContent  = t('tgPlayAgain');
    this._ui.overlay.style.display = 'flex';
  }

  // ── Game flow ─────────────────────────────────────────────────────────────

  _startGame() {
    this._score  = 0;
    this._qIdx   = 0;
    this._streak = 0;
    this._state  = 'playing';
    this._ui.overlay.style.display = 'none';
    this._updateHUD();
    this._nextQuestion();
  }

  _nextQuestion() {
    if (this._qIdx >= Q_PER_GAME) { this._endGame(); return; }
    const q = this._generateQuestion();
    this._currentQ = q;
    this._ui.progressTxt.textContent = `${this._qIdx + 1} / ${Q_PER_GAME}`;
    this._ui.progressBar.style.width = `${(this._qIdx / Q_PER_GAME) * 100}%`;
    this._drawClock(q.hour12, q.minute);
    this._renderChoices(q);
  }

  _endGame() {
    this._state = 'over';
    this._showEndOverlay();
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
  }
}
