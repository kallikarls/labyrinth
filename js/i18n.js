/**
 * i18n.js — Icelandic / English translations
 * Default: Icelandic ('is')
 */

const LANG_KEY = 'game_lang';

export const STRINGS = {
  is: {
    // Home
    homeTitle:        '🎮 Leikjamiðstöð',
    homeSub:          'Veldu leik!',
    labyrinthDesc:    'Halltu til að rúlla boltanum í gegnum völundarhúsið',
    snakeDesc:        'Klassískt Snake — borðaðu, vaxtu, hrapaðu ekki',
    colorBookDesc:    'Teiknaðu og litu skemmtilegar myndir',
    // Labyrinth level select
    allGames:         '← Allir leikir',
    logoSub:          'Hallaðu til að rúlla! 🎉',
    chooseLevel:      'Veldu erfiðleikastig:',
    easy:             'Auðvelt',
    medium:           'Miðlungs',
    hard:             'Erfitt',
    hintTilt:         'Halltu tækinu til að rúlla boltanum!',
    hintKeys:         'Notaðu örvalykla eða WASD til að rúlla boltanum!',
    // HUD
    newMaze:          '🔀 Nýr völundarhús',
    // Win screen
    amazing:          'Frábært!',
    foundExit:        'Þú fannst útganginn!',
    playAgain:        '🔀 Nýr völundarhús',
    // Snake
    score:            'Stig',
    best:             'Best',
    gameOver:         'Leik lokið!',
    newBest:          '🎉 Nýtt met!',
    snakePlayAgain:   '🔄 Spila aftur',
    paused:           'HLÉ',
    // Color Book
    colorBook:        '🎨 Litabók',
    coloringBack:     '← Til baka',
    galleryBack:      '🏠 Heim',
    // Language toggle
    langLabel:        'EN',
  },
  en: {
    // Home
    homeTitle:        '🎮 Game Hub',
    homeSub:          'Pick a game!',
    labyrinthDesc:    'Tilt to roll the ball through the maze',
    snakeDesc:        'Classic snake — eat, grow, don\'t crash',
    colorBookDesc:    'Draw and color fun pictures',
    // Labyrinth level select
    allGames:         '← All Games',
    logoSub:          'Tilt to Roll! 🎉',
    chooseLevel:      'Choose your level:',
    easy:             'Easy',
    medium:           'Medium',
    hard:             'Hard',
    hintTilt:         'Tilt your device to roll the ball!',
    hintKeys:         'Use arrow keys or tilt your device to roll the ball!',
    // HUD
    newMaze:          '🔀 New Maze',
    // Win screen
    amazing:          'Amazing!',
    foundExit:        'You found the exit!',
    playAgain:        '🔀 New Maze',
    // Snake
    score:            'Score',
    best:             'Best',
    gameOver:         'Game Over!',
    newBest:          '🎉 New Best!',
    snakePlayAgain:   '🔄 Play Again',
    paused:           'PAUSED',
    // Color Book
    colorBook:        '🎨 Color Book',
    coloringBack:     '← Back',
    galleryBack:      '🏠 Home',
    // Language toggle
    langLabel:        'IS',
  },
};

let _current = localStorage.getItem(LANG_KEY) || 'is';

export function getLang()   { return _current; }
export function t(key)      { return STRINGS[_current][key] ?? STRINGS.en[key] ?? key; }

export function setLang(lang) {
  _current = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyAll();
}

export function toggleLang() {
  setLang(_current === 'is' ? 'en' : 'is');
}

/** Apply all translations to the DOM */
export function applyAll() {
  const lang = _current;
  document.documentElement.lang = lang;

  // Toggle button label (shows what you'd switch TO)
  const btn = document.getElementById('btnLang');
  if (btn) btn.textContent = t('langLabel');

  // Home
  _setText('homeTitle',      t('homeTitle'));
  _setText('homeSub',        t('homeSub'));
  _setText('labyrinthDesc',  t('labyrinthDesc'));
  _setText('snakeDesc',      t('snakeDesc'));
  _setText('colorBookDesc',  t('colorBookDesc'));

  // Labyrinth level select
  _setText('btnAllGames',    t('allGames'));
  _setText('logoSub',        t('logoSub'));
  _setText('levelLabel',     t('chooseLevel'));
  _setText('easyName',       t('easy'));
  _setText('mediumName',     t('medium'));
  _setText('hardName',       t('hard'));
  _setText('hintText',       t('hintTilt'));

  // HUD
  _setText('btnNewMaze',  t('newMaze'));

  // Win screen
  _setText('winTitle',    t('amazing'));
  _setText('winSub',      t('foundExit'));
  _setText('btnPlayAgain',  t('playAgain'));
  _setText('btnGoHome',     '🏠 ' + (lang === 'is' ? 'Heim' : 'Home'));

  // Snake HUD
  const scoreEl = document.getElementById('snakeScore');
  if (scoreEl) {
    const n = scoreEl.dataset.value || '0';
    scoreEl.textContent = `${t('score')}: ${n}`;
  }
  const bestEl = document.getElementById('snakeBest');
  if (bestEl) {
    const n = bestEl.dataset.value || '0';
    bestEl.textContent = `${t('best')}: ${n}`;
  }

  // Snake overlay
  _setText('snakeOverTitle', t('gameOver'));
  _setText('snakeNewBest',   t('newBest'));
  _setText('btnSnakeRestart', t('snakePlayAgain'));
  _setText('btnSnakeOverHome', '🏠 ' + (lang === 'is' ? 'Heim' : 'Home'));

  // Color Book
  _setText('galleryTitle',     t('colorBook'));
  _setText('btnGalleryBack',   t('galleryBack'));
  _setText('btnColoringBack',  t('coloringBack'));
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
