/**
 * wordgame.js — Orðaleikurinn (Word Snack for Icelandic kids, ages 6–8)
 *
 * Show a large emoji clue.
 * Scrambled letter tiles appear at the bottom — tap to spell the word.
 * Tap a filled slot to return letters back to the pool.
 * When the last slot is filled the answer is checked automatically.
 *
 * Three hearts per word. Three attempts before the answer is revealed
 * and the game moves on — so a child is never truly stuck.
 * Difficulty 1 → 2 → 3 words in order; shuffle within each level.
 */

import { t, getLang } from './i18n.js';

// ── Category display ──────────────────────────────────────────────────────────
const CAT_ICONS = {
  nature:  '🌿',
  home:    '🏡',
  animals: '🐾',
  food:    '🍽️',
  colors:  '🎨',
  toys:    '🎲',
};

const CAT_LABELS = {
  is: {
    nature:  'Náttúra',
    home:    'Heimilið',
    animals: 'Dýr',
    food:    'Matur',
    colors:  'Litir',
    toys:    'Leikföng',
  },
  en: {
    nature:  'Nature',
    home:    'Home',
    animals: 'Animals',
    food:    'Food',
    colors:  'Colours',
    toys:    'Toys',
  },
};

// ── Word data (derived from CSV; emoji added manually) ────────────────────────
const WORDS = {
  is: [
    // ── Level 1 ────────────────────────────────────────────────────────────
    { word: 'sól',     emoji: '☀️',  difficulty: 1, category: 'nature'  },
    { word: 'tré',     emoji: '🌳',  difficulty: 1, category: 'nature'  },
    { word: 'ský',     emoji: '☁️',  difficulty: 1, category: 'nature'  },
    { word: 'vatn',    emoji: '💧',  difficulty: 1, category: 'nature'  },
    { word: 'blóm',    emoji: '🌸',  difficulty: 1, category: 'nature'  },
    { word: 'hús',     emoji: '🏠',  difficulty: 1, category: 'home'    },
    { word: 'rúm',     emoji: '🛏️', difficulty: 1, category: 'home'    },
    { word: 'bók',     emoji: '📚',  difficulty: 1, category: 'home'    },
    { word: 'borð',    emoji: '🍽️', difficulty: 1, category: 'home'    },
    { word: 'stóll',   emoji: '🪑',  difficulty: 1, category: 'home'    },
    { word: 'hurð',    emoji: '🚪',  difficulty: 1, category: 'home'    },
    { word: 'hundur',  emoji: '🐶',  difficulty: 1, category: 'animals' },
    { word: 'köttur',  emoji: '🐱',  difficulty: 1, category: 'animals' },
    { word: 'fugl',    emoji: '🐦',  difficulty: 1, category: 'animals' },
    { word: 'kýr',     emoji: '🐄',  difficulty: 1, category: 'animals' },
    { word: 'mús',     emoji: '🐭',  difficulty: 1, category: 'animals' },
    { word: 'kind',    emoji: '🐑',  difficulty: 1, category: 'animals' },
    { word: 'svín',    emoji: '🐷',  difficulty: 1, category: 'animals' },
    { word: 'epli',    emoji: '🍎',  difficulty: 1, category: 'food'    },
    { word: 'mjólk',   emoji: '🥛',  difficulty: 1, category: 'food'    },
    { word: 'egg',     emoji: '🥚',  difficulty: 1, category: 'food'    },
    { word: 'brauð',   emoji: '🍞',  difficulty: 1, category: 'food'    },
    { word: 'ostur',   emoji: '🧀',  difficulty: 1, category: 'food'    },
    { word: 'kaka',    emoji: '🎂',  difficulty: 1, category: 'food'    },
    { word: 'kjöt',    emoji: '🥩',  difficulty: 1, category: 'food'    },
    { word: 'ís',      emoji: '🍦',  difficulty: 1, category: 'food'    },
    { word: 'bolti',   emoji: '⚽',  difficulty: 1, category: 'toys'    },
    { word: 'dúkka',   emoji: '🪆',  difficulty: 1, category: 'toys'    },
    { word: 'bíll',    emoji: '🚗',  difficulty: 1, category: 'toys'    },
    // ── Level 2 ────────────────────────────────────────────────────────────
    { word: 'steinn',  emoji: '🪨',  difficulty: 2, category: 'nature'  },
    { word: 'tungl',   emoji: '🌙',  difficulty: 2, category: 'nature'  },
    { word: 'gluggi',  emoji: '🪟',  difficulty: 2, category: 'home'    },
    { word: 'lampi',   emoji: '💡',  difficulty: 2, category: 'home'    },
    { word: 'hestur',  emoji: '🐎',  difficulty: 2, category: 'animals' },
    { word: 'ljón',    emoji: '🦁',  difficulty: 2, category: 'animals' },
    { word: 'banani',  emoji: '🍌',  difficulty: 2, category: 'food'    },
    { word: 'rauður',  emoji: '🔴',  difficulty: 2, category: 'colors'  },
    { word: 'blár',    emoji: '🔵',  difficulty: 2, category: 'colors'  },
    { word: 'gulur',   emoji: '🟡',  difficulty: 2, category: 'colors'  },
    { word: 'grænn',   emoji: '🟢',  difficulty: 2, category: 'colors'  },
    { word: 'bleikur', emoji: '🩷',  difficulty: 2, category: 'colors'  },
    { word: 'brúnn',   emoji: '🟤',  difficulty: 2, category: 'colors'  },
    { word: 'svartur', emoji: '⚫',  difficulty: 2, category: 'colors'  },
    { word: 'hvítur',  emoji: '⚪',  difficulty: 2, category: 'colors'  },
    { word: 'bangsi',  emoji: '🧸',  difficulty: 2, category: 'toys'    },
    { word: 'kubbar',  emoji: '🧱',  difficulty: 2, category: 'toys'    },
    // ── Level 3 ────────────────────────────────────────────────────────────
    { word: 'stjarna',   emoji: '⭐', difficulty: 3, category: 'nature' },
    { word: 'flugdreki', emoji: '🪁', difficulty: 3, category: 'toys'   },
  ],
  en: [
    // ── Level 1 ────────────────────────────────────────────────────────────
    { word: 'sun',     emoji: '☀️',  difficulty: 1, category: 'nature'  },
    { word: 'tree',    emoji: '🌳',  difficulty: 1, category: 'nature'  },
    { word: 'cloud',   emoji: '☁️',  difficulty: 1, category: 'nature'  },
    { word: 'water',   emoji: '💧',  difficulty: 1, category: 'nature'  },
    { word: 'flower',  emoji: '🌸',  difficulty: 2, category: 'nature'  },
    { word: 'stone',   emoji: '🪨',  difficulty: 1, category: 'nature'  },
    { word: 'moon',    emoji: '🌙',  difficulty: 1, category: 'nature'  },
    { word: 'star',    emoji: '⭐',  difficulty: 1, category: 'nature'  },
    { word: 'house',   emoji: '🏠',  difficulty: 1, category: 'home'    },
    { word: 'bed',     emoji: '🛏️', difficulty: 1, category: 'home'    },
    { word: 'book',    emoji: '📚',  difficulty: 1, category: 'home'    },
    { word: 'table',   emoji: '🍽️', difficulty: 1, category: 'home'    },
    { word: 'chair',   emoji: '🪑',  difficulty: 1, category: 'home'    },
    { word: 'door',    emoji: '🚪',  difficulty: 1, category: 'home'    },
    { word: 'window',  emoji: '🪟',  difficulty: 2, category: 'home'    },
    { word: 'lamp',    emoji: '💡',  difficulty: 1, category: 'home'    },
    { word: 'dog',     emoji: '🐶',  difficulty: 1, category: 'animals' },
    { word: 'cat',     emoji: '🐱',  difficulty: 1, category: 'animals' },
    { word: 'bird',    emoji: '🐦',  difficulty: 1, category: 'animals' },
    { word: 'cow',     emoji: '🐄',  difficulty: 1, category: 'animals' },
    { word: 'mouse',   emoji: '🐭',  difficulty: 1, category: 'animals' },
    { word: 'sheep',   emoji: '🐑',  difficulty: 1, category: 'animals' },
    { word: 'pig',     emoji: '🐷',  difficulty: 1, category: 'animals' },
    { word: 'horse',   emoji: '🐎',  difficulty: 2, category: 'animals' },
    { word: 'lion',    emoji: '🦁',  difficulty: 2, category: 'animals' },
    { word: 'apple',   emoji: '🍎',  difficulty: 1, category: 'food'    },
    { word: 'milk',    emoji: '🥛',  difficulty: 1, category: 'food'    },
    { word: 'egg',     emoji: '🥚',  difficulty: 1, category: 'food'    },
    { word: 'bread',   emoji: '🍞',  difficulty: 1, category: 'food'    },
    { word: 'cheese',  emoji: '🧀',  difficulty: 1, category: 'food'    },
    { word: 'cake',    emoji: '🎂',  difficulty: 1, category: 'food'    },
    { word: 'meat',    emoji: '🥩',  difficulty: 1, category: 'food'    },
    { word: 'ice',     emoji: '🍦',  difficulty: 1, category: 'food'    },
    { word: 'banana',  emoji: '🍌',  difficulty: 2, category: 'food'    },
    { word: 'red',     emoji: '🔴',  difficulty: 1, category: 'colors'  },
    { word: 'blue',    emoji: '🔵',  difficulty: 1, category: 'colors'  },
    { word: 'yellow',  emoji: '🟡',  difficulty: 2, category: 'colors'  },
    { word: 'green',   emoji: '🟢',  difficulty: 2, category: 'colors'  },
    { word: 'pink',    emoji: '🩷',  difficulty: 1, category: 'colors'  },
    { word: 'brown',   emoji: '🟤',  difficulty: 2, category: 'colors'  },
    { word: 'black',   emoji: '⚫',  difficulty: 1, category: 'colors'  },
    { word: 'white',   emoji: '⚪',  difficulty: 1, category: 'colors'  },
    { word: 'ball',    emoji: '⚽',  difficulty: 1, category: 'toys'    },
    { word: 'doll',    emoji: '🪆',  difficulty: 1, category: 'toys'    },
    { word: 'car',     emoji: '🚗',  difficulty: 1, category: 'toys'    },
    { word: 'teddy',   emoji: '🧸',  difficulty: 2, category: 'toys'    },
    { word: 'blocks',  emoji: '🧱',  difficulty: 2, category: 'toys'    },
    { word: 'kite',    emoji: '🪁',  difficulty: 1, category: 'toys'    },
  ],
};

const MAX_TRIES = 3;
const BEST_KEY  = 'wordgame_best';

// ── Class ─────────────────────────────────────────────────────────────────────
export class WordGame {
  constructor() {
    this._ui = {
      screen:     document.getElementById('wgScreen'),
      overlay:    document.getElementById('wgOverlay'),
      overEmoji:  document.getElementById('wgOverEmoji'),
      overTitle:  document.getElementById('wgOverTitle'),
      overScore:  document.getElementById('wgOverScore'),
      btnStart:   document.getElementById('btnWGStart'),
      btnHome:    document.getElementById('btnWGHome'),
      btnOverHome:document.getElementById('btnWGOverHome'),
      emojiEl:    document.getElementById('wgEmoji'),
      categoryEl: document.getElementById('wgCategory'),
      progressEl: document.getElementById('wgProgress'),
      heartsEl:   document.getElementById('wgHearts'),
      scoreEl:    document.getElementById('wgScore'),
      answerEl:   document.getElementById('wgAnswer'),
      tilesEl:    document.getElementById('wgTiles'),
      feedbackEl: document.getElementById('wgFeedback'),
    };

    this._best    = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._score   = 0;
    this._wordIdx = 0;
    this._tries   = 0;
    this._queue   = [];
    this._tiles   = [];   // [{ letter, el, used }]
    this._state   = 'idle';

    this._bindUI();
  }

  // ── Public ────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._showOverlay('start');
  }

  close() {
    this._ui.screen.classList.remove('active');
    this._state = 'idle';
  }

  // ── Game flow ─────────────────────────────────────────────────────────────

  _startGame() {
    this._score   = 0;
    this._wordIdx = 0;
    this._state   = 'playing';

    const lang  = getLang();
    const raw   = (WORDS[lang] && WORDS[lang].length > 0) ? WORDS[lang] : WORDS.is;
    // Sort by difficulty: 1 → 2 → 3; shuffle within each level
    this._queue = [1, 2, 3].flatMap(d =>
      this._shuffle(raw.filter(w => w.difficulty === d))
    );

    this._ui.overlay.style.display = 'none';
    this._updateScore();
    this._loadWord(0);
  }

  _loadWord(idx) {
    if (idx >= this._queue.length) { this._endGame(); return; }
    this._wordIdx = idx;
    this._tries   = 0;
    this._tiles   = [];

    const entry = this._queue[idx];
    const lang  = getLang();
    const cats  = CAT_LABELS[lang] || CAT_LABELS.is;

    // Big emoji — bounce in
    this._ui.emojiEl.textContent = entry.emoji;
    this._ui.emojiEl.classList.remove('wg-emoji-bounce');
    void this._ui.emojiEl.offsetWidth; // force reflow to restart animation
    this._ui.emojiEl.classList.add('wg-emoji-bounce');

    this._ui.categoryEl.textContent =
      `${CAT_ICONS[entry.category] || ''} ${cats[entry.category] || entry.category}`;

    this._ui.progressEl.textContent = `${idx + 1} / ${this._queue.length}`;

    this._renderHearts();
    this._renderAnswer(entry.word);
    this._renderTiles(entry.word);
    this._hideFeedback();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _renderHearts() {
    const remaining = MAX_TRIES - this._tries;
    this._ui.heartsEl.innerHTML = '';
    for (let i = 0; i < MAX_TRIES; i++) {
      const h = document.createElement('span');
      h.textContent = i < remaining ? '❤️' : '🖤';
      this._ui.heartsEl.appendChild(h);
    }
  }

  _updateScore() {
    this._ui.scoreEl.textContent = this._score;
  }

  // ── Answer slots ──────────────────────────────────────────────────────────

  _renderAnswer(word) {
    const letters = [...word.toUpperCase()]; // spread handles multi-byte chars
    this._ui.answerEl.innerHTML = '';
    this._ui.answerEl.style.setProperty('--wg-word-len', letters.length);

    letters.forEach((_, i) => {
      const slot = document.createElement('div');
      slot.className    = 'wg-slot';
      slot.dataset.slot = i;
      slot.addEventListener('click',    () => this._untapSlot(i));
      slot.addEventListener('touchend', e  => { e.preventDefault(); this._untapSlot(i); });
      this._ui.answerEl.appendChild(slot);
    });
  }

  // ── Letter tiles ──────────────────────────────────────────────────────────

  _renderTiles(word) {
    const letters = this._shuffle([...word.toUpperCase()]);
    this._ui.tilesEl.innerHTML = '';
    this._ui.tilesEl.style.setProperty('--wg-word-len', letters.length);

    this._tiles = letters.map((letter, i) => {
      const el = document.createElement('button');
      el.className      = 'wg-tile';
      el.textContent    = letter;
      el.dataset.tile   = i;
      el.addEventListener('click',    () => this._tapTile(i));
      el.addEventListener('touchend', e  => { e.preventDefault(); this._tapTile(i); });
      this._ui.tilesEl.appendChild(el);
      return { letter, el, used: false };
    });
  }

  // ── Tap / untap ───────────────────────────────────────────────────────────

  _tapTile(tileIdx) {
    if (this._state !== 'playing') return;
    const tile = this._tiles[tileIdx];
    if (!tile || tile.used) return;

    const slots    = [...this._ui.answerEl.querySelectorAll('.wg-slot')];
    const nextFree = slots.findIndex(s => !s.dataset.filled);
    if (nextFree === -1) return;

    tile.used = true;
    tile.el.classList.add('wg-tile-used');

    const slot = slots[nextFree];
    slot.textContent    = tile.letter;
    slot.dataset.filled = tileIdx;
    slot.classList.add('wg-slot-filled');

    // Auto-check when last slot is filled
    if (nextFree === slots.length - 1) {
      this._state = 'checking';
      setTimeout(() => this._checkAnswer(), 110);
    }
  }

  // Tapping a filled slot returns it AND all slots after it
  _untapSlot(fromSlot) {
    if (this._state !== 'playing') return;
    const slots = [...this._ui.answerEl.querySelectorAll('.wg-slot')];
    for (let i = fromSlot; i < slots.length; i++) {
      const s = slots[i];
      if (!s.dataset.filled) continue;
      const ti = parseInt(s.dataset.filled, 10);
      if (!isNaN(ti) && this._tiles[ti]) {
        this._tiles[ti].used = false;
        this._tiles[ti].el.classList.remove('wg-tile-used');
      }
      s.textContent = '';
      delete s.dataset.filled;
      s.classList.remove('wg-slot-filled', 'wg-slot-correct', 'wg-slot-hint');
    }
  }

  // ── Check ─────────────────────────────────────────────────────────────────

  _checkAnswer() {
    const slots  = [...this._ui.answerEl.querySelectorAll('.wg-slot')];
    const typed  = slots.map(s => s.textContent).join('');
    const target = this._queue[this._wordIdx].word.toUpperCase();

    if (typed === target) {
      this._onCorrect();
    } else {
      this._onWrong();
    }
  }

  _onCorrect() {
    const entry  = this._queue[this._wordIdx];
    const mult   = this._tries === 0 ? 100 : this._tries === 1 ? 60 : 30;
    this._score += entry.difficulty * mult;
    this._updateScore();

    this._ui.answerEl.querySelectorAll('.wg-slot').forEach(s => {
      s.classList.add('wg-slot-correct');
    });
    this._ui.emojiEl.classList.add('wg-emoji-spin');
    this._showFeedback('✅', true);

    setTimeout(() => {
      this._ui.emojiEl.classList.remove('wg-emoji-spin');
      this._hideFeedback();
      this._state = 'playing';
      this._loadWord(this._wordIdx + 1);
    }, 900);
  }

  _onWrong() {
    this._tries++;
    this._renderHearts();
    this._ui.answerEl.classList.add('wg-shake');
    setTimeout(() => this._ui.answerEl.classList.remove('wg-shake'), 450);

    if (this._tries >= MAX_TRIES) {
      // Show correct answer, then move on
      const word  = this._queue[this._wordIdx].word.toUpperCase();
      const slots = [...this._ui.answerEl.querySelectorAll('.wg-slot')];
      [...word].forEach((ch, i) => {
        if (!slots[i]) return;
        slots[i].textContent    = ch;
        slots[i].dataset.filled = '?';
        slots[i].classList.add('wg-slot-hint');
      });
      this._showFeedback('💡', false);
      setTimeout(() => {
        this._hideFeedback();
        this._state = 'playing';
        this._loadWord(this._wordIdx + 1);
      }, 1800);
    } else {
      // Clear and let player try again
      this._clearAnswer();
      this._state = 'playing';
    }
  }

  _clearAnswer() {
    this._ui.answerEl.querySelectorAll('.wg-slot').forEach(s => {
      s.textContent = '';
      delete s.dataset.filled;
      s.classList.remove('wg-slot-filled', 'wg-slot-correct', 'wg-slot-hint');
    });
    this._tiles.forEach(tile => {
      tile.used = false;
      tile.el.classList.remove('wg-tile-used');
    });
  }

  // ── Feedback pop ──────────────────────────────────────────────────────────

  _showFeedback(text, good) {
    this._ui.feedbackEl.textContent = text;
    this._ui.feedbackEl.className = `wg-feedback wg-feedback-show${good ? '' : ' wg-feedback-bad'}`;
  }

  _hideFeedback() {
    this._ui.feedbackEl.className = 'wg-feedback';
  }

  // ── End of game ───────────────────────────────────────────────────────────

  _endGame() {
    this._state = 'over';
    const isNew = this._score > this._best;
    if (isNew) {
      this._best = this._score;
      localStorage.setItem(BEST_KEY, String(this._best));
    }
    this._ui.overEmoji.textContent = '🎉';
    this._ui.overTitle.textContent = t('wgWin');
    this._ui.overScore.textContent = `${this._score} ${t('wgPoints')}${isNew ? '  🏆' : ''}`;
    this._ui.btnStart.textContent  = t('wgPlayAgain');
    this._ui.overlay.style.display = 'flex';
  }

  _showOverlay(type) {
    this._ui.overEmoji.textContent = '🔤';
    this._ui.overTitle.textContent = t('wgName');
    this._ui.overScore.textContent = t('wgDesc');
    this._ui.btnStart.textContent  = t('wgStart');
    this._ui.overlay.style.display = 'flex';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
