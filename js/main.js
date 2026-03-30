/**
 * main.js — App entry point. Boots both the maze game and the coloring book.
 */

import { Game }     from './game.js';
import { Coloring } from './coloring/coloring.js';

window.addEventListener('DOMContentLoaded', () => {
  const game     = new Game();
  const coloring = new Coloring();
  game.start();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
