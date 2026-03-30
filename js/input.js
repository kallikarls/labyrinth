/**
 * input.js — Device orientation (gyroscope), touch joystick, keyboard fallback
 */

export class Input {
  constructor() {
    this.tiltX = 0;   // gamma / left-right
    this.tiltY = 0;   // beta  / front-back
    this.keysX = 0;
    this.keysY = 0;

    this._hasGyro    = false;
    this._permDenied = false;
    this._touch      = null;  // active touch for joystick
    this._touchStartX = 0;
    this._touchStartY = 0;

    this._bindKeys();
    this._detectGyro();
  }

  // ── Gyroscope ───────────────────────────────────────────────────────────────

  /** Call on user gesture (e.g. button press) to request iOS permission */
  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const resp = await DeviceOrientationEvent.requestPermission();
        if (resp === 'granted') {
          this._listenOrientation();
          return 'granted';
        } else {
          this._permDenied = true;
          return 'denied';
        }
      } catch (e) {
        this._permDenied = true;
        return 'error';
      }
    } else {
      // Android / non-Safari — no permission needed, just listen
      this._listenOrientation();
      return 'granted';
    }
  }

  _detectGyro() {
    // On Android Chrome permission isn't needed – try listening straight away
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission !== 'function') {
      this._listenOrientation();
    }
  }

  _listenOrientation() {
    const handler = (e) => {
      // gamma: left/right tilt (−90..90), beta: front/back (−180..180)
      let gx = (e.gamma || 0);
      let gy = (e.beta  || 0) - 20; // subtract 20° so resting flat = neutral

      // Clamp to ±45°, then normalise to ±1
      gx = Math.max(-45, Math.min(45, gx)) / 45;
      gy = Math.max(-45, Math.min(45, gy)) / 45;

      this.tiltX = gx;
      this.tiltY = gy;
      this._hasGyro = true;
    };

    window.addEventListener('deviceorientation', handler, { passive: true });
  }

  // ── Touch joystick fallback ─────────────────────────────────────────────────

  bindTouch(canvas) {
    canvas.addEventListener('touchstart', (e) => {
      if (this._hasGyro) return; // gyro takes priority
      const t = e.changedTouches[0];
      this._touch = t.identifier;
      this._touchStartX = t.clientX;
      this._touchStartY = t.clientY;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (this._hasGyro) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this._touch) {
          const dx = t.clientX - this._touchStartX;
          const dy = t.clientY - this._touchStartY;
          const MAX = Math.min(window.innerWidth, window.innerHeight) * 0.15;
          this.tiltX = Math.max(-1, Math.min(1, dx / MAX));
          this.tiltY = Math.max(-1, Math.min(1, dy / MAX));
          break;
        }
      }
    }, { passive: true });

    const endTouch = (e) => {
      if (this._hasGyro) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this._touch) {
          this._touch = null;
          this.tiltX  = 0;
          this.tiltY  = 0;
          break;
        }
      }
    };
    canvas.addEventListener('touchend',    endTouch, { passive: true });
    canvas.addEventListener('touchcancel', endTouch, { passive: true });
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  _bindKeys() {
    const SPEED = 1.2;
    const held  = new Set();

    const update = () => {
      this.keysX = (held.has('ArrowRight') || held.has('KeyD') ?  SPEED : 0)
                 + (held.has('ArrowLeft')  || held.has('KeyA') ? -SPEED : 0);
      this.keysY = (held.has('ArrowDown')  || held.has('KeyS') ?  SPEED : 0)
                 + (held.has('ArrowUp')    || held.has('KeyW') ? -SPEED : 0);
    };

    window.addEventListener('keydown', (e) => {
      held.add(e.code);
      update();
    });
    window.addEventListener('keyup', (e) => {
      held.delete(e.code);
      update();
    });
  }

  get hasGyro() { return this._hasGyro; }
}
