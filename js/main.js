/**
 * main.js — App entry point. Boots the maze game, coloring book, and snake.
 */

import { Game }     from './game.js';
import { Coloring } from './coloring/coloring.js';
import { Snake }    from './snake.js';

window.addEventListener('DOMContentLoaded', () => {
  const game     = new Game();
  const coloring = new Coloring();
  const snake    = new Snake();
  game.start();

  document.getElementById('btnSnake').addEventListener('click', () => snake.open());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
