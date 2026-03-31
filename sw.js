/**
 * sw.js — Service Worker for offline PWA caching
 */

const CACHE_NAME = 'labyrinth-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/game.js',
  './js/maze.js',
  './js/physics.js',
  './js/renderer.js',
  './js/input.js',
  './js/audio.js',
  './js/particles.js',
  './js/snake.js',
  './js/tetris.js',
  './js/i18n.js',
  './manifest.json',
  './icons/icon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
