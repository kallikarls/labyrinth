/**
 * solitaire.js — Klondike Solitaire
 *
 * Layout:
 *   Top row : [Stock] [Waste]  ··  [F♠] [F♥] [F♦] [F♣]
 *   Bottom  : 7 tableau columns
 *
 * Controls:
 *   Drag & drop  — mouse and touch
 *   Double-click/tap a card  — auto-send to foundation if valid
 *   Click stock  — draw 1 card to waste
 *   Click empty waste + empty stock  — reset stock from waste
 */

import { t } from './i18n.js';

const SUITS  = ['♠', '♥', '♦', '♣'];
const RANKS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED    = new Set(['♥', '♦']);
const BEST_KEY = 'solitaire_best';

export class Solitaire {
  constructor() {
    this._ui = {
      screen:    document.getElementById('solScreen'),
      overlay:   document.getElementById('solOverlay'),
      overTitle: document.getElementById('solOverTitle'),
      overSub:   document.getElementById('solOverSub'),
      newBest:   document.getElementById('solNewBest'),
      btnStart:  document.getElementById('btnSolStart'),
      btnHome:   document.getElementById('btnSolHome'),
      btnOverHome: document.getElementById('btnSolOverHome'),
      btnUndo:   document.getElementById('btnSolUndo'),
      timerEl:   document.getElementById('solTimer'),
      movesEl:   document.getElementById('solMoves'),
      bestEl:    document.getElementById('solBest'),
      board:     document.getElementById('solBoard'),
    };

    this._best    = parseInt(localStorage.getItem(BEST_KEY) || '999999', 10);
    this._moves   = 0;
    this._elapsed = 0;
    this._timerInterval = null;
    this._history = [];   // for undo: array of serialised states
    this._state   = 'idle';

    // Game piles
    this._stock  = [];   // array of card objects
    this._waste  = [];
    this._found  = [[], [], [], []];          // 4 foundations
    this._tab    = [[], [], [], [], [], [], []]; // 7 tableau columns

    // Drag state
    this._drag = null;   // { cards, fromPile, fromIdx, ghost, startX, startY }

    this._bindUI();
    this._buildBoard();
  }

  // ── Public ────────────────────────────────────────────────────────────────

  open() {
    this._ui.screen.classList.add('active');
    this._showOverlay('start');
    this._updateHUD();
  }

  close() {
    this._stopTimer();
    this._ui.screen.classList.remove('active');
  }

  // ── Board DOM build ───────────────────────────────────────────────────────

  _buildBoard() {
    const board = this._ui.board;
    board.innerHTML = '';

    // Top row: stock, waste, spacer, 4 foundations
    const topRow = document.createElement('div');
    topRow.className = 'sol-top-row';

    this._stockEl = this._makePileEl('sol-stock', '🂠', 'stock');
    this._wasteEl = this._makePileEl('sol-waste', '', 'waste');
    this._foundEls = SUITS.map((s, i) => this._makePileEl('sol-foundation', s, `found-${i}`));

    topRow.appendChild(this._stockEl);
    topRow.appendChild(this._wasteEl);
    const spacer = document.createElement('div');
    spacer.className = 'sol-spacer';
    topRow.appendChild(spacer);
    this._foundEls.forEach(el => topRow.appendChild(el));
    board.appendChild(topRow);

    // Tableau row
    const tabRow = document.createElement('div');
    tabRow.className = 'sol-tab-row';
    this._tabEls = Array.from({ length: 7 }, (_, i) => {
      const el = this._makePileEl('sol-tab', '', `tab-${i}`);
      tabRow.appendChild(el);
      return el;
    });
    board.appendChild(tabRow);

    // Stock click
    this._stockEl.addEventListener('click',     () => this._clickStock());
    this._stockEl.addEventListener('touchend',  (e) => { e.preventDefault(); this._clickStock(); });
  }

  _makePileEl(cls, label, key) {
    const el = document.createElement('div');
    el.className = `sol-pile ${cls}`;
    el.dataset.pile = key;
    if (label) {
      const lbl = document.createElement('span');
      lbl.className = 'sol-pile-label';
      lbl.textContent = label;
      el.appendChild(lbl);
    }
    return el;
  }

  // ── Game init ─────────────────────────────────────────────────────────────

  _newGame() {
    this._stopTimer();
    this._moves   = 0;
    this._elapsed = 0;
    this._history = [];
    this._state   = 'playing';

    // Build deck
    const deck = [];
    for (const suit of SUITS) {
      for (let r = 0; r < RANKS.length; r++) {
        deck.push({ suit, rank: r, rankStr: RANKS[r], faceUp: false });
      }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal to tableau
    this._tab  = Array.from({ length: 7 }, () => []);
    let di = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[di++];
        card.faceUp = (row === col);
        this._tab[col].push(card);
      }
    }

    // Remaining to stock (face down)
    this._stock = deck.slice(di);
    this._waste = [];
    this._found = [[], [], [], []];

    this._render();
    this._startTimer();
    this._updateHUD();
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  _startTimer() {
    this._timerInterval = setInterval(() => {
      this._elapsed++;
      this._updateHUD();
    }, 1000);
  }

  _stopTimer() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  _fmtTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    this._ui.timerEl.textContent = this._fmtTime(this._elapsed);
    this._ui.movesEl.textContent = `${this._moves} ${t('solMoves')}`;
    const bestStr = this._best < 999999 ? this._fmtTime(this._best) : '--:--';
    this._ui.bestEl.textContent  = `${t('best')}: ${bestStr}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    this._renderStock();
    this._renderWaste();
    this._renderFoundations();
    this._renderTableau();
  }

  _renderStock() {
    this._stockEl.innerHTML = '';
    if (this._stock.length > 0) {
      this._stockEl.appendChild(this._makeCardEl({ faceUp: false }, false, 'stock', 0));
    } else {
      // Show recycle indicator
      const lbl = document.createElement('span');
      lbl.className = 'sol-pile-label';
      lbl.textContent = '↺';
      lbl.style.fontSize = '2em';
      this._stockEl.appendChild(lbl);
    }
  }

  _renderWaste() {
    this._wasteEl.innerHTML = '';
    if (this._waste.length > 0) {
      const card = this._waste[this._waste.length - 1];
      const el   = this._makeCardEl(card, true, 'waste', this._waste.length - 1);
      this._wasteEl.appendChild(el);
    }
  }

  _renderFoundations() {
    this._foundEls.forEach((el, i) => {
      el.innerHTML = '';
      const pile = this._found[i];
      if (pile.length === 0) {
        const lbl = document.createElement('span');
        lbl.className = 'sol-pile-label';
        lbl.textContent = SUITS[i];
        el.appendChild(lbl);
      } else {
        const card = pile[pile.length - 1];
        el.appendChild(this._makeCardEl(card, true, `found-${i}`, pile.length - 1));
      }
      // Drop target listener
      el.dataset.pile = `found-${i}`;
    });
  }

  _renderTableau() {
    this._tabEls.forEach((colEl, ci) => {
      colEl.innerHTML = '';
      colEl.dataset.pile = `tab-${ci}`;
      const col = this._tab[ci];
      if (col.length === 0) return;

      // Stagger face-down cards tightly, face-up cards with more offset
      let yOff = 0;
      col.forEach((card, idx) => {
        const el = this._makeCardEl(card, card.faceUp, `tab-${ci}`, idx);
        el.style.position = 'absolute';
        el.style.top      = `${yOff}px`;
        el.style.left     = '0';
        // Double-click / double-tap to auto-move to foundation
        if (card.faceUp) {
          el.addEventListener('dblclick', () => this._autoToFoundation(`tab-${ci}`, idx));
          el.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (el._lastTap && now - el._lastTap < 300) {
              e.preventDefault();
              this._autoToFoundation(`tab-${ci}`, idx);
            }
            el._lastTap = now;
          });
        }
        colEl.appendChild(el);
        yOff += card.faceUp ? this._faceUpOffset() : this._faceDownOffset();
      });
      // Set column height so container scrolls if needed
      colEl.style.minHeight = `${yOff + this._cardH()}px`;
    });
  }

  // Card offset helpers — use actual column width for accurate pixel offsets
  _colW()          { return this._tabEls[0]?.clientWidth || ((this._ui.board.clientWidth - 36) / 7); }
  _cardH()         { return this._colW() * 1.4; }   // aspect ratio 5:7
  _faceUpOffset()  { return this._cardH() * 0.45; } // exposed click strip per face-up card
  _faceDownOffset(){ return this._cardH() * 0.22; } // tight strip for face-down

  // ── Card element factory ──────────────────────────────────────────────────

  _makeCardEl(card, draggable, pileKey, idx) {
    const el = document.createElement('div');
    el.className = 'sol-card' + (card.faceUp ? '' : ' sol-card-back');
    if (card.faceUp) {
      const isRed = RED.has(card.suit);
      el.classList.add(isRed ? 'sol-red' : 'sol-black');
      const top  = document.createElement('span');
      top.className = 'sol-card-rank-top';
      top.textContent = card.rankStr + card.suit;
      const mid  = document.createElement('span');
      mid.className = 'sol-card-suit-mid';
      mid.textContent = card.suit;
      const bot  = document.createElement('span');
      bot.className = 'sol-card-rank-bot';
      bot.textContent = card.rankStr + card.suit;
      el.appendChild(top);
      el.appendChild(mid);
      el.appendChild(bot);
    }
    el.dataset.pile = pileKey;
    el.dataset.idx  = idx;

    if (draggable && card.faceUp) {
      el.addEventListener('mousedown',  e => this._dragStart(e, pileKey, idx));
      el.addEventListener('touchstart', e => this._dragStart(e, pileKey, idx), { passive: false });
    }
    return el;
  }

  // ── Stock click ───────────────────────────────────────────────────────────

  _clickStock() {
    if (this._state !== 'playing') return;
    this._saveHistory();
    if (this._stock.length > 0) {
      const card = this._stock.pop();
      card.faceUp = true;
      this._waste.push(card);
    } else {
      // Recycle waste back to stock (face down)
      this._waste.reverse().forEach(c => { c.faceUp = false; });
      this._stock = this._waste;
      this._waste = [];
    }
    this._moves++;
    this._render();
    this._updateHUD();
  }

  // ── Auto-move to foundation ───────────────────────────────────────────────

  _autoToFoundation(pileKey, cardIdx) {
    if (this._state !== 'playing') return;
    const pile = this._getPile(pileKey);
    if (!pile || cardIdx !== pile.length - 1) return; // only top card
    const card  = pile[cardIdx];
    const fi    = this._validFoundationIdx(card);
    if (fi === -1) return;
    this._saveHistory();
    pile.pop();
    this._found[fi].push(card);
    // Flip new top tableau card
    if (pileKey.startsWith('tab-')) {
      const ci = parseInt(pileKey.split('-')[1]);
      const col = this._tab[ci];
      if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
    }
    this._moves++;
    this._render();
    this._updateHUD();
    this._checkWin();
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────

  _dragStart(e, pileKey, idx) {
    if (this._state !== 'playing') return;
    e.preventDefault();

    const pile  = this._getPile(pileKey);
    if (!pile) return;
    const card  = pile[idx];
    if (!card || !card.faceUp) return;

    // Cards being dragged = from idx to end of pile
    const cards = pile.slice(idx);

    // Build ghost element — sized to match an actual column card
    const ghost = document.createElement('div');
    ghost.className = 'sol-drag-ghost';
    const CH  = this._cardH();
    const colW = this._colW();
    const off = this._faceUpOffset();
    ghost.style.width  = `${colW}px`;
    ghost.style.height = `${CH + off * (cards.length - 1)}px`;

    cards.forEach((c, i) => {
      const cel = this._makeCardEl(c, true, '', 0);
      cel.style.position = 'absolute';
      cel.style.top      = `${i * off}px`;
      cel.style.left     = '0';
      ghost.appendChild(cel);
    });

    const pt = this._eventPoint(e);
    ghost.style.left = `${pt.x - colW / 2}px`;
    ghost.style.top  = `${pt.y - CH * 0.15}px`;
    document.body.appendChild(ghost);

    this._drag = { cards, pileKey, fromIdx: idx, ghost, startX: pt.x, startY: pt.y };

    const onMove  = ev => this._dragMove(ev);
    const onEnd   = ev => this._dragEnd(ev);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onEnd);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('touchend',   onEnd);
    this._drag._onMove = onMove;
    this._drag._onEnd  = onEnd;
  }

  _dragMove(e) {
    if (!this._drag) return;
    e.preventDefault();
    const pt   = this._eventPoint(e);
    const colW = this._colW();
    const CH   = this._cardH();
    this._drag.ghost.style.left = `${pt.x - colW / 2}px`;
    this._drag.ghost.style.top  = `${pt.y - CH * 0.15}px`;
  }

  _dragEnd(e) {
    if (!this._drag) return;
    e.preventDefault();
    window.removeEventListener('mousemove',  this._drag._onMove);
    window.removeEventListener('mouseup',    this._drag._onEnd);
    window.removeEventListener('touchmove',  this._drag._onMove);
    window.removeEventListener('touchend',   this._drag._onEnd);

    const pt   = this._eventPoint(e);
    const ghost = this._drag.ghost;
    ghost.style.display = 'none'; // hide so elementFromPoint works
    const el   = document.elementFromPoint(pt.x, pt.y);
    ghost.remove();

    const target = el ? (el.closest('[data-pile]') || el) : null;
    const destKey = target ? target.dataset.pile : null;

    if (destKey && destKey !== this._drag.pileKey) {
      this._tryDrop(this._drag.pileKey, this._drag.fromIdx, destKey);
    }

    this._drag = null;
    this._render();
  }

  _eventPoint(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  // ── Move logic ────────────────────────────────────────────────────────────

  _tryDrop(fromKey, fromIdx, toKey) {
    const fromPile = this._getPile(fromKey);
    if (!fromPile) return;
    const cards    = fromPile.slice(fromIdx);
    if (cards.length === 0) return;
    const topCard  = cards[0];

    if (toKey.startsWith('found-')) {
      // Only single card to foundation
      if (cards.length !== 1) return;
      const fi = parseInt(toKey.split('-')[1]);
      if (!this._canPlaceFoundation(topCard, fi)) return;
      this._saveHistory();
      fromPile.splice(fromIdx, cards.length);
      this._found[fi].push(topCard);
      this._flipTopTab(fromKey);
      this._moves++;
      this._checkWin();
    } else if (toKey.startsWith('tab-')) {
      const ci    = parseInt(toKey.split('-')[1]);
      const col   = this._tab[ci];
      if (!this._canPlaceTableau(topCard, col)) return;
      this._saveHistory();
      fromPile.splice(fromIdx, cards.length);
      col.push(...cards);
      this._flipTopTab(fromKey);
      this._moves++;
    } else if (toKey === 'waste' || toKey === 'stock') {
      return; // can't drop onto waste/stock
    }

    this._updateHUD();
  }

  _flipTopTab(pileKey) {
    if (!pileKey.startsWith('tab-')) return;
    const ci  = parseInt(pileKey.split('-')[1]);
    const col = this._tab[ci];
    if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
  }

  _canPlaceFoundation(card, fi) {
    const pile = this._found[fi];
    const suitIdx = SUITS.indexOf(card.suit);
    if (suitIdx !== fi) return false;               // wrong suit slot
    if (pile.length === 0) return card.rank === 0;  // must be Ace
    return card.rank === pile[pile.length - 1].rank + 1;
  }

  _canPlaceTableau(card, col) {
    if (col.length === 0) return card.rank === 12;  // only King on empty
    const top = col[col.length - 1];
    if (!top.faceUp) return false;
    const diffColor = RED.has(card.suit) !== RED.has(top.suit);
    return diffColor && card.rank === top.rank - 1;
  }

  _validFoundationIdx(card) {
    const fi = SUITS.indexOf(card.suit);
    if (fi === -1) return -1;
    if (this._canPlaceFoundation(card, fi)) return fi;
    return -1;
  }

  _getPile(key) {
    if (key === 'stock') return this._stock;
    if (key === 'waste') return this._waste;
    if (key.startsWith('found-')) return this._found[parseInt(key.split('-')[1])];
    if (key.startsWith('tab-'))   return this._tab[parseInt(key.split('-')[1])];
    return null;
  }

  // ── Win check ─────────────────────────────────────────────────────────────

  _checkWin() {
    const won = this._found.every(f => f.length === 13);
    if (!won) return;
    this._stopTimer();
    this._state = 'over';

    const isNewBest = this._elapsed < this._best;
    if (isNewBest) {
      this._best = this._elapsed;
      localStorage.setItem(BEST_KEY, String(this._best));
    }
    this._ui.newBest.style.display = isNewBest ? 'block' : 'none';
    this._showOverlay('win');
  }

  // ── Undo ──────────────────────────────────────────────────────────────────

  _saveHistory() {
    // Deep copy game state (keep last 20)
    const snap = {
      stock: this._stock.map(c => ({ ...c })),
      waste: this._waste.map(c => ({ ...c })),
      found: this._found.map(f => f.map(c => ({ ...c }))),
      tab:   this._tab.map(col => col.map(c => ({ ...c }))),
      moves: this._moves,
    };
    this._history.push(snap);
    if (this._history.length > 20) this._history.shift();
  }

  _undo() {
    if (this._history.length === 0 || this._state !== 'playing') return;
    const snap       = this._history.pop();
    this._stock      = snap.stock;
    this._waste      = snap.waste;
    this._found      = snap.found;
    this._tab        = snap.tab;
    this._moves      = snap.moves;
    this._render();
    this._updateHUD();
  }

  // ── Overlay ───────────────────────────────────────────────────────────────

  _showOverlay(type) {
    if (type === 'start') {
      this._ui.overTitle.textContent = t('solName');
      this._ui.overSub.textContent   = t('solDesc');
      this._ui.btnStart.textContent  = t('solStart');
      this._ui.newBest.style.display = 'none';
    } else {
      this._ui.overTitle.textContent = t('solWin');
      this._ui.overSub.textContent   = `${this._moves} ${t('solMoves')} · ${this._fmtTime(this._elapsed)}`;
      this._ui.btnStart.textContent  = t('solPlayAgain');
    }
    this._ui.overlay.style.display = 'flex';
  }

  // ── UI binding ────────────────────────────────────────────────────────────

  _bindUI() {
    this._ui.btnHome.addEventListener('click',     () => this.close());
    this._ui.btnOverHome.addEventListener('click', () => this.close());
    this._ui.btnStart.addEventListener('click',    () => {
      this._ui.overlay.style.display = 'none';
      this._newGame();
    });
    this._ui.btnUndo.addEventListener('click', () => this._undo());
  }
}
