# Labyrinth — Tilt & Roll! 🎮

A fun labyrinth ball game for kids! Tilt your mobile or tablet to roll a ball through the maze and find the exit. 🌟

## Play It
**Live:** [▶ Play on GitHub Pages](https://kallikarls.github.io/labyrinth)

## Features
- 🎮 Gyroscope tilt control (mobile/tablet)
- 🎹 Keyboard fallback (arrow keys / WASD) for desktop
- 🐢🐇🦁 Three difficulty levels (Easy 6×6, Medium 8×8, Hard 10×10)
- 🌳 Classic wooden labyrinth board aesthetic
- 🔊 Procedural sound effects (no files needed)
- 🎉 Confetti celebration on win
- ⭐ Star earned for each level completed
- 📱 PWA — installable on mobile home screen (works offline)
- ♾️ Infinite random mazes — every game is different

## How to Play
1. Open on your mobile or tablet browser
2. Tap a difficulty level
3. **Allow motion access** when prompted (required on iPhone)
4. Tilt your device to roll the metallic ball
5. Guide it to the golden star at the bottom-right corner!

## Local Development

```bash
# Clone the repo
git clone https://github.com/kallikarls/labyrinth.git
cd labyrinth

# Serve locally (Python)
python -m http.server 8080
# Then open http://localhost:8080

# OR use Node.js
npx serve .
```

> **Note:** The gyroscope requires HTTPS on real devices. For local testing with a phone, use [ngrok](https://ngrok.com/) or deploy to GitHub Pages.

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your game is live at `https://kallikarls.github.io/labyrinth`

The gyroscope API requires HTTPS — GitHub Pages provides this for free. ✅

## Project Structure

```
Labirinth/
├── index.html          # Entry point, HTML structure
├── style.css           # Wooden board theme, UI styles
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── js/
│   ├── main.js         # App bootstrap
│   ├── game.js         # Game state machine & loop
│   ├── maze.js         # Maze generation (DFS)
│   ├── physics.js      # Ball physics & collision
│   ├── renderer.js     # Canvas drawing
│   ├── input.js        # Gyroscope, touch, keyboard
│   ├── audio.js        # Procedural sound effects
│   └── particles.js    # Confetti & sparkle trail
└── icons/              # PWA icons (add your own)
```

## Browser Support
| Browser | Gyroscope | Touch | Keyboard |
|---------|-----------|-------|----------|
| Chrome Android | ✅ | ✅ | ✅ |
| Safari iOS 13+ | ✅* | ✅ | ✅ |
| Chrome Desktop | ❌ | ➖ | ✅ |
| Firefox | ✅ | ✅ | ✅ |

*iOS requires tapping "Start" button to grant motion permission.

## Made With ❤️
Built as a gift for grandchildren. Pure HTML5 Canvas — no frameworks, no dependencies, plays instantly in the browser.
