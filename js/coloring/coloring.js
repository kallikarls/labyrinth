/**
 * coloring.js — Kids coloring book controller
 *
 * Architecture:
 *  - colorCanvas (OffscreenCanvas): stores user's color fills (starts white)
 *  - outlineCanvas (OffscreenCanvas): stores the outline mask for flood-fill boundary
 *  - displayCanvas (visible <canvas>): composited on every render
 *
 * Render order: white bg → colorCanvas → outline on top
 */

import { DRAWINGS } from './drawings.js';

const PALETTE = [
  '#FF0000','#FF5500','#FF9900','#FFCC00','#FFFF00','#CCFF00',
  '#00CC00','#00DDAA','#00CCFF','#0055FF','#7700FF','#FF00CC',
  '#FF6688','#FF9977','#FFEE88','#AAFFAA','#88DDFF','#CC88FF',
  '#8B2500','#5C3317','#808080','#CCCCCC','#FFFFFF','#000000',
  '#FFD700','#C0C0C0','#FF69B4','#40E0D0','#7CFC00','#FF4500',
];

const TOOLS = {
  bucket: { label: 'Fill',   icon: '🪣' },
  brush:  { label: 'Brush',  icon: '🖌️' },
  pencil: { label: 'Pencil', icon: '✏️' },
  spray:  { label: 'Spray',  icon: '💨' },
  eraser: { label: 'Eraser', icon: '🧹' },
};

const SIZES = { small: 4, medium: 14, large: 28 };

export class Coloring {
  constructor() {
    this.currentDrawing = null;
    this.currentTool    = 'bucket';
    this.currentColor   = '#FF0000';
    this.currentSize    = 'medium';
    this.isDrawing      = false;
    this.lastPos        = null;

    // Canvases
    this.displayCanvas  = document.getElementById('coloringCanvas');
    this.displayCtx     = this.displayCanvas.getContext('2d');
    this.colorCanvas    = null;  // OffscreenCanvas
    this.outlineCanvas  = null;  // OffscreenCanvas
    this.W = 0; this.H = 0;

    this._buildGallery();
    this._buildPalette();
    this._buildToolButtons();
    this._buildSizeButtons();
    this._bindUIButtons();
    this._bindCanvasEvents();
  }

  // ── Gallery ─────────────────────────────────────────────────────────────────

  _buildGallery() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';
    DRAWINGS.forEach(d => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.setAttribute('data-id', d.id);
      // Thumbnail canvas
      const thumb = document.createElement('canvas');
      thumb.width = 120; thumb.height = 120;
      const tctx = thumb.getContext('2d');
      const img = this._svgToImage(d.svg, 120, 120, () => tctx.drawImage(img, 0, 0, 120, 120));
      card.appendChild(thumb);
      const label = document.createElement('div');
      label.className = 'gallery-label';
      label.textContent = `${d.emoji} ${d.name}`;
      card.appendChild(label);
      card.addEventListener('click', () => this.openDrawing(d.id));
      grid.appendChild(card);
    });
  }

  // ── Open a drawing ──────────────────────────────────────────────────────────

  openDrawing(id) {
    this.currentDrawing = DRAWINGS.find(d => d.id === id);
    if (!this.currentDrawing) return;

    document.getElementById('coloringTitle').textContent =
      `${this.currentDrawing.emoji} ${this.currentDrawing.name}`;

    // Show coloring screen
    document.getElementById('galleryScreen').classList.remove('active');
    document.getElementById('coloringScreen').classList.add('active');

    this._initCanvases();
  }

  _initCanvases() {
    const container = document.getElementById('coloringCanvasWrap');
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 700);

    this.W = Math.floor(size);
    this.H = Math.floor(size);
    this.displayCanvas.width  = this.W;
    this.displayCanvas.height = this.H;
    this.displayCanvas.style.width  = this.W + 'px';
    this.displayCanvas.style.height = this.H + 'px';

    // Colour layer (starts white)
    this.colorCanvas = new OffscreenCanvas(this.W, this.H);
    const cc = this.colorCanvas.getContext('2d');
    cc.fillStyle = '#FFFFFF';
    cc.fillRect(0, 0, this.W, this.H);

    // Outline layer
    this.outlineCanvas = new OffscreenCanvas(this.W, this.H);
    this._renderOutline(this.outlineCanvas, this.W, this.H, this.currentDrawing.svg, () => {
      this._render();
    });
  }

  // ── Canvas rendering ────────────────────────────────────────────────────────

  _render() {
    const ctx = this.displayCtx;
    ctx.clearRect(0, 0, this.W, this.H);
    // White background
    ctx.fillStyle = '#FAFAF2';
    ctx.fillRect(0, 0, this.W, this.H);
    // Color fills
    ctx.drawImage(this.colorCanvas, 0, 0);
    // Outline always on top
    ctx.drawImage(this.outlineCanvas, 0, 0);
  }

  // ── SVG helpers ─────────────────────────────────────────────────────────────

  _svgToImage(svgStr, w, h, onload) {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image(w, h);
    img.onload = () => { onload(img); URL.revokeObjectURL(url); };
    img.src = url;
    return img;
  }

  _renderOutline(targetCanvas, w, h, svgStr, cb) {
    const img = this._svgToImage(svgStr, w, h, (img) => {
      const ctx = targetCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      if (cb) cb();
    });
  }

  // ── Tools ───────────────────────────────────────────────────────────────────

  _getPos(e) {
    const r = this.displayCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: Math.round((src.clientX - r.left) * (this.W / r.width)),
      y: Math.round((src.clientY - r.top)  * (this.H / r.height)),
    };
  }

  _applyTool(pos, isStart) {
    const cc = this.colorCanvas.getContext('2d');
    const color = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
    const size  = SIZES[this.currentSize];

    switch (this.currentTool) {
      case 'bucket':
        if (isStart) this._floodFill(pos.x, pos.y, color);
        break;

      case 'brush':
      case 'eraser':
        cc.globalCompositeOperation = 'source-over';
        cc.strokeStyle = color;
        cc.lineWidth   = size * 2;
        cc.lineCap     = 'round';
        cc.lineJoin    = 'round';
        if (isStart || !this.lastPos) {
          cc.beginPath();
          cc.moveTo(pos.x, pos.y);
        } else {
          cc.lineTo(pos.x, pos.y);
          cc.stroke();
        }
        break;

      case 'pencil':
        cc.globalCompositeOperation = 'source-over';
        cc.strokeStyle = color;
        cc.lineWidth   = Math.max(2, size * 0.5);
        cc.lineCap     = 'round';
        cc.lineJoin    = 'round';
        if (isStart || !this.lastPos) {
          cc.beginPath();
          cc.moveTo(pos.x, pos.y);
        } else {
          cc.lineTo(pos.x, pos.y);
          cc.stroke();
        }
        break;

      case 'spray': {
        const r = size * 2.5;
        const density = Math.max(15, size * 3);
        cc.fillStyle = color;
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist  = Math.random() * r;
          const dx = pos.x + Math.cos(angle) * dist;
          const dy = pos.y + Math.sin(angle) * dist;
          cc.fillRect(Math.round(dx), Math.round(dy), 2, 2);
        }
        break;
      }
    }
  }

  // ── Flood Fill (scanline) ───────────────────────────────────────────────────

  _floodFill(startX, startY, hexColor) {
    const W = this.W, H = this.H;
    const colorCtx   = this.colorCanvas.getContext('2d');
    const outlineCtx = this.outlineCanvas.getContext('2d');

    const colorData   = colorCtx.getImageData(0, 0, W, H);
    const outlineData = outlineCtx.getImageData(0, 0, W, H);
    const cp = colorData.data;
    const op = outlineData.data;

    // Parse fill color
    const fr = parseInt(hexColor.slice(1,3), 16);
    const fg = parseInt(hexColor.slice(3,5), 16);
    const fb = parseInt(hexColor.slice(5,7), 16);

    const idx0 = (startY * W + startX) * 4;
    const tr = cp[idx0], tg = cp[idx0+1], tb = cp[idx0+2];

    // Don't fill if same color or on outline
    if (tr === fr && tg === fg && tb === fb) return;

    const isOutline = (x, y) => {
      if (x < 0 || x >= W || y < 0 || y >= H) return true;
      const i = (y * W + x) * 4;
      // Outline pixels are dark (alpha > 100, r < 100)
      return op[i+3] > 80 && op[i] < 120;
    };

    const TOL = 40;
    const match = (i) =>
      Math.abs(cp[i]   - tr) <= TOL &&
      Math.abs(cp[i+1] - tg) <= TOL &&
      Math.abs(cp[i+2] - tb) <= TOL;

    const fill = (i) => {
      cp[i] = fr; cp[i+1] = fg; cp[i+2] = fb; cp[i+3] = 255;
    };

    // Scanline flood fill
    const stack = [[startX, startY]];
    const visited = new Uint8Array(W * H);

    while (stack.length > 0) {
      let [x, y] = stack.pop();
      if (visited[y * W + x]) continue;

      // Scan left
      while (x > 0 && !isOutline(x-1, y) && match((y*W+x-1)*4)) x--;

      let spanU = false, spanD = false;
      while (x < W && !isOutline(x, y) && match((y*W+x)*4)) {
        const i = (y*W+x)*4;
        if (!visited[y*W+x]) { visited[y*W+x] = 1; fill(i); }

        if (!spanU && y > 0   && !isOutline(x, y-1) && match((( y-1)*W+x)*4)) { stack.push([x, y-1]); spanU = true; }
        else if (spanU && y > 0   && (isOutline(x, y-1) || !match(((y-1)*W+x)*4))) spanU = false;

        if (!spanD && y < H-1 && !isOutline(x, y+1) && match(((y+1)*W+x)*4)) { stack.push([x, y+1]); spanD = true; }
        else if (spanD && y < H-1 && (isOutline(x, y+1) || !match(((y+1)*W+x)*4))) spanD = false;

        x++;
      }
    }

    colorCtx.putImageData(colorData, 0, 0);
    this._render();
  }

  // ── Canvas event binding ────────────────────────────────────────────────────

  _bindCanvasEvents() {
    const el = this.displayCanvas;

    const onStart = (e) => {
      e.preventDefault();
      if (!this.currentDrawing) return;
      this.isDrawing = true;
      const pos = this._getPos(e);
      this.lastPos = pos;
      // For stroke tools, start a new path on colorCanvas
      if (['brush','pencil','eraser'].includes(this.currentTool)) {
        const cc = this.colorCanvas.getContext('2d');
        cc.beginPath();
        cc.moveTo(pos.x, pos.y);
      }
      this._applyTool(pos, true);
      this._render();
    };

    const onMove = (e) => {
      e.preventDefault();
      if (!this.isDrawing || !this.currentDrawing) return;
      const pos = this._getPos(e);
      this._applyTool(pos, false);
      this.lastPos = pos;
      this._render();
    };

    const onEnd = (e) => {
      e.preventDefault();
      this.isDrawing = false;
      this.lastPos = null;
    };

    el.addEventListener('pointerdown',   onStart, { passive: false });
    el.addEventListener('pointermove',   onMove,  { passive: false });
    el.addEventListener('pointerup',     onEnd,   { passive: false });
    el.addEventListener('pointercancel', onEnd,   { passive: false });
    el.style.touchAction = 'none';
  }

  // ── UI buttons ──────────────────────────────────────────────────────────────

  _buildPalette() {
    const grid = document.getElementById('paletteGrid');
    PALETTE.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch';
      btn.style.background = color;
      btn.style.boxShadow = color === '#FFFFFF' ? 'inset 0 0 0 2px #ccc' : 'none';
      btn.setAttribute('data-color', color);
      btn.setAttribute('aria-label', `Color ${i+1}`);
      if (i === 0) btn.classList.add('active');
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentColor = color;
      });
      grid.appendChild(btn);
    });
  }

  _buildToolButtons() {
    const row = document.getElementById('toolsRow');
    Object.entries(TOOLS).forEach(([key, t]) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (key === 'bucket' ? ' active' : '');
      btn.id = `tool_${key}`;
      btn.title = t.label;
      btn.textContent = t.icon;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = key;
      });
      row.appendChild(btn);
    });
  }

  _buildSizeButtons() {
    const row = document.getElementById('sizesRow');
    Object.entries(SIZES).forEach(([key, val]) => {
      const btn = document.createElement('button');
      btn.className = 'size-btn' + (key === 'medium' ? ' active' : '');
      btn.setAttribute('data-size', key);
      btn.title = key;
      const dot = document.createElement('span');
      dot.style.cssText = `display:inline-block;width:${val}px;height:${val}px;border-radius:50%;background:currentColor;`;
      btn.appendChild(dot);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSize = key;
      });
      row.appendChild(btn);
    });
  }

  _bindUIButtons() {
    document.getElementById('btnColoringBack').addEventListener('click', () => {
      document.getElementById('coloringScreen').classList.remove('active');
      document.getElementById('galleryScreen').classList.add('active');
    });

    document.getElementById('btnGalleryBack').addEventListener('click', () => {
      document.getElementById('galleryScreen').classList.remove('active');
      document.getElementById('homeScreen').classList.add('active');
    });

    document.getElementById('btnColorBook').addEventListener('click', () => {
      document.getElementById('homeScreen').classList.remove('active');
      document.getElementById('galleryScreen').classList.add('active');
    });

    document.getElementById('btnColoringClear').addEventListener('click', () => {
      if (!this.colorCanvas) return;
      const cc = this.colorCanvas.getContext('2d');
      cc.fillStyle = '#FFFFFF';
      cc.fillRect(0, 0, this.W, this.H);
      this._render();
    });

    document.getElementById('btnColoringSave').addEventListener('click', () => {
      if (!this.currentDrawing) return;
      this._render();
      const link = document.createElement('a');
      link.download = `labyrinth-coloring-${this.currentDrawing.id}.png`;
      link.href = this.displayCanvas.toDataURL('image/png');
      link.click();
    });
  }
}
