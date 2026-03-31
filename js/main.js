/**
 * main.js — App entry point. Boots the maze game, coloring book, snake, and tetris.
 */

import { Game }     from './game.js';
import { Coloring } from './coloring/coloring.js';
import { Snake }    from './snake.js';
import { Tetris }   from './tetris.js';
import { applyAll, setLang } from './i18n.js';

window.addEventListener('DOMContentLoaded', () => {
  // Apply persisted language on load
  applyAll();

  const game     = new Game();
  const coloring = new Coloring();
  const snake    = new Snake();
  const tetris   = new Tetris();
  game.start();

  document.getElementById('btnSnake').addEventListener('click', () => snake.open());
  document.getElementById('btnTetris').addEventListener('click', () => tetris.open());
  document.getElementById('btnLangIS').addEventListener('click', () => {
    setLang('is');
    game._updateStarDisplay();
  });
  document.getElementById('btnLangEN').addEventListener('click', () => {
    setLang('en');
    game._updateStarDisplay();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
