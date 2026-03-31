/**
 * main.js — App entry point. Boots the maze game, coloring book, snake, and tetris.
 */

import { Game }     from './game.js';
import { Coloring } from './coloring/coloring.js';
import { Snake }    from './snake.js';
import { Tetris }   from './tetris.js';
import { Breakout }       from './breakout.js';
import { SpaceInvaders }  from './spaceinvaders.js';
import { PingPong }       from './pingpong.js';
import { applyAll, setLang } from './i18n.js';

window.addEventListener('DOMContentLoaded', () => {
  // Apply persisted language on load
  applyAll();

  const game     = new Game();
  const coloring = new Coloring();
  const snake    = new Snake();
  const tetris   = new Tetris();
  const breakout       = new Breakout();
  const spaceInvaders  = new SpaceInvaders();
  const pingPong       = new PingPong();
  game.start();

  document.getElementById('btnSnake').addEventListener('click', () => snake.open());
  document.getElementById('btnTetris').addEventListener('click', () => tetris.open());
  document.getElementById('btnBreakout').addEventListener('click', () => breakout.open());
  document.getElementById('btnSpaceInvaders').addEventListener('click', () => spaceInvaders.open());
  document.getElementById('btnPingPong').addEventListener('click', () => pingPong.open());
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
