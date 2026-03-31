/**
 * main.js — App entry point. Boots the maze game, coloring book, and snake.
 */

import { Game }     from './game.js';
import { Coloring } from './coloring/coloring.js';
import { Snake }    from './snake.js';
import { applyAll, toggleLang } from './i18n.js';

window.addEventListener('DOMContentLoaded', () => {
  // Apply persisted language on load
  applyAll();

  const game     = new Game();
  const coloring = new Coloring();
  const snake    = new Snake();
  game.start();

  document.getElementById('btnSnake').addEventListener('click', () => snake.open());
  document.getElementById('btnLang').addEventListener('click', () => {
    toggleLang();
    // Refresh dynamic strings in game modules
    game._updateStarDisplay();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
