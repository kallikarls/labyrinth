/**
 * i18n.js — Icelandic / English translations
 * Default: Icelandic ('is')
 */

const LANG_KEY = 'game_lang';

export const STRINGS = {
  is: {
    // Home
    homeTitle:        '🎮 Leikjaland',
    pageTitle:         'Leikjaland',
    homeSub:          'Veldu leik!',
    labyrinthName:    'Völundarhús',
    labyrinthDesc:    'Stýrðu boltanum í gegnum völundarhús',
    snakeDesc:        'Klassískt Snake — borðaðu og stækkaðu',
    colorBookName:    'Litabók',
    colorBookDesc:    'Teiknaðu og litaðu skemmtilegar myndir',
    // Labyrinth level select
    allGames:         '← Allir leikir',
    logoSub:          'Hallaðu tækinu til að rúlla! 🎉',
    chooseLevel:      'Veldu erfiðleikastig:',
    easy:             'Auðvelt',
    medium:           'Miðlungs',
    hard:             'Erfitt',
    hintTilt:         'Hallaðu tækinu til að rúlla boltanum!',
    hintKeys:         'Notaðu örvalyklana eða WASD til að rúlla boltanum!',
    // HUD
    newMaze:          '🔀 Nýtt völundarhús',
    // Win screen
    amazing:          'Frábært!',
    foundExit:        'Þú komst alla leið!',
    playAgain:        '🔀 Nýtt völundarhús',
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
    goHome:           '🏠 Heim',
    // Drawing names
    drawing_blank:    'Tómt blað',
    drawing_mandala:  'Mandala',
    drawing_sun:      'Sól',
    drawing_castle:   'Kastali',
    drawing_space:    'Geimskip',
    drawing_balloon:  'Loftbelgur',
    drawing_racecar:  'Kappaksturssbíll',
    drawing_plane:    'Flugvél',
    drawing_robot:    'Vélmenni',
    drawing_astro:    'Geimfari',
    drawing_owl:      'Ugla',
    drawing_dog:      'Hundur',    // Tools
    tool_bucket:      'Fylla',
    tool_brush:       'Bursti',
    tool_pencil:      'Blýantur',
    tool_spray:       'Spreybrúsi',
    tool_eraser:      'Strokleður',
    // Sizes
    size_small:       'Lítið',
    size_medium:      'Miðlungs',
    size_large:       'Stórt',
    // Coloring actions
    clearCanvas:      'Hætta við',
    saveImage:        'Vista mynd',
    // Tetris
    tetrisName:       'Tetris',
    tetrisDesc:       'Staflaðu saman kubbum',
    tetrisLevel:      'Stig',
    tetrisLines:      'Línur',
    tetrisNext:       'Næst',
    tetrisPlayAgain:  '🔄 Spila aftur',
    // Breakout
    breakoutName:     'Breakout',
    breakoutDesc:     'Brjóttu múrinn með bolta',
    breakoutLevel:    'Stig',
    breakoutWin:      'Frábært! 🎉',
    breakoutLaunch:   'Strjúktu eða smelltu til að skjóta!',
    breakoutPlayAgain:'  🔄 Spila aftur',
    // Space Invaders
    siName:           'Geimárás',
    siDesc:           'Skjóttu geimverur áður en þær ná til þín',
    siWaveLabel:      'Orusta',
    siWave:           'Orusta búin! 🎉',
    siNextWave:       'Næsta orusta 🚀',
    siPlayAgain:      '🔄 Spila aftur',
    // Language toggle
    langLabel:        'EN',
  },
  en: {
    // Home
    homeTitle:        '🎮 Game Hub',
    pageTitle:         'Game Hub',
    homeSub:          'Pick a game!',
    labyrinthName:    'Labyrinth',
    labyrinthDesc:    'Tilt to roll the ball through the maze',
    snakeDesc:        "Classic snake — eat, grow, don't crash",
    colorBookName:    'Color Book',
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
    goHome:           '🏠 Home',
    // Drawing names
    drawing_blank:    'Blank Page',
    drawing_mandala:  'Mandala',
    drawing_sun:      'Sun Art',
    drawing_castle:   'Castle',
    drawing_space:    'Space',
    drawing_balloon:  'Balloon',
    drawing_racecar:  'Race Car',
    drawing_plane:    'Airplane',
    drawing_robot:    'Robot',
    drawing_astro:    'Astronaut',
    drawing_owl:      'Owl',
    drawing_dog:      'Dog',
    // Tools
    tool_bucket:      'Fill',
    tool_brush:       'Brush',
    tool_pencil:      'Pencil',
    tool_spray:       'Spray',
    tool_eraser:      'Eraser',
    // Sizes
    size_small:       'Small',
    size_medium:      'Medium',
    size_large:       'Large',
    // Coloring actions
    clearCanvas:      'Clear',
    saveImage:        'Save image',
    // Tetris
    tetrisName:       'Tetris',
    tetrisDesc:       'Stack the blocks without filling up',
    tetrisLevel:      'Level',
    tetrisLines:      'Lines',
    tetrisNext:       'Next',
    tetrisPlayAgain:  '🔄 Play Again',
    // Breakout
    breakoutName:     'Breakout',
    breakoutDesc:     'Smash the bricks with the ball',
    // Space Invaders
    siName:           'Space Invaders',
    siDesc:           'Shoot the aliens before they reach you',
    siWaveLabel:      'Wave',
    siWave:           'Wave Clear! 🎉',
    siNextWave:       'Next Wave 🚀',
    siPlayAgain:      '🔄 Play Again',
    breakoutLevel:    'Level',
    breakoutWin:      'Amazing! 🎉',
    breakoutLaunch:   'Tap or press Space to launch!',
    breakoutPlayAgain:'🔄 Play Again',
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
  document.title = t('pageTitle');

  // Flag buttons — highlight active
  const btnIS = document.getElementById('btnLangIS');
  const btnEN = document.getElementById('btnLangEN');
  if (btnIS) btnIS.classList.toggle('active', lang === 'is');
  if (btnEN) btnEN.classList.toggle('active', lang === 'en');

  // Home
  _setText('homeTitle',      t('homeTitle'));
  _setText('homeSub',        t('homeSub'));
  _setText('labyrinthName',  t('labyrinthName'));
  _setText('labyrinthDesc',  t('labyrinthDesc'));
  _setText('snakeDesc',      t('snakeDesc'));
  _setText('colorBookName',  t('colorBookName'));
  _setText('colorBookDesc',  t('colorBookDesc'));

  // Labyrinth level select
  _setText('logoSub',        t('logoSub'));
  _setText('levelLabel',     t('chooseLevel'));
  _setText('easyName',       t('easy'));
  _setText('mediumName',     t('medium'));
  _setText('hardName',       t('hard'));
  _setText('hintText',       t('hintTilt'));

  // HUD
  _setText('btnNewMaze',  t('newMaze'));

  // Win screen
  _setText('winTitle',      t('amazing'));
  _setText('winSub',        t('foundExit'));
  _setText('btnPlayAgain',  t('playAgain'));

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
  _setText('snakeOverTitle',   t('gameOver'));
  _setText('snakeNewBest',     t('newBest'));
  _setText('btnSnakeRestart',  t('snakePlayAgain'));

  // Tetris home card
  _setText('tetrisName',       t('tetrisName'));
  _setText('tetrisDesc',       t('tetrisDesc'));
  _setText('tetrisNextLabel',  t('tetrisNext'));

  // Breakout home card
  _setText('breakoutName',     t('breakoutName'));
  _setText('breakoutDesc',     t('breakoutDesc'));

  // Space Invaders home card
  _setText('siName',           t('siName'));
  _setText('siDesc',           t('siDesc'));

  // Color Book
  _setText('galleryTitle',     t('colorBook'));
  _setText('btnColoringBack',  t('coloringBack'));

  // data-i18n-title: update title attribute for any element that has it
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
