/**
 * main.js — App entry point. Creates the Game and starts it.
 */

import { Game } from './game.js';

// Wait for DOM, then boot
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();

  // Register service worker for PWA offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // SW registration is optional — game works without it
    });
  }
});
