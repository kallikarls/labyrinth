/**
 * input.js — Device orientation (gyroscope), touch joystick, keyboard fallback
 *
 * AXIS MAPPING STRATEGY
 * ─────────────────────
 * The DeviceOrientationEvent axes are defined relative to the DEVICE's physical
 * frame, NOT the screen. This means:
 *
 *   Portrait-native devices (phones, angle=0 = portrait):
 *     gamma → left/right tilt on screen  (rotation around device Y-axis)
 *     beta  → forward/back tilt on screen (rotation around device X-axis)
 *
 *   Landscape-native devices (tablets like Galaxy Tab, angle=0 = landscape):
 *     beta  → left/right tilt on screen  (the long axis IS the X-axis)
 *     gamma → forward/back tilt on screen
 *
 * We detect the current screen orientation from window dimensions, then handle
 * flipped orientations (180°/270°) via screen.orientation.angle.
 *
 * AUTO-CALIBRATION
 * ─────────────────
 * We sample the first ~20 readings (~0.5s) to record the device's resting/
 * neutral position and subtract it as an offset. This compensates for the
 * natural viewing angle when holding a tablet or phone.
 */

const CAL_SAMPLES = 20;   // number of samples before calibration is set
const CLAMP_DEG   = 45;   // tilt degrees that map to full ±1 speed

export class Input {
  constructor() {
    this.tiltX = 0;
    this.tiltY = 0;
    this.keysX = 0;
    this.keysY = 0;

    this._hasGyro    = false;
    this._permDenied = false;

    // Touch joystick
    this._touch       = null;
    this._touchStartX = 0;
    this._touchStartY = 0;

    // Calibration (reset per game start via recalibrate())
    this._calSamples = { x: [], y: [] };
    this._calOffset  = { x: 0,  y: 0  };
    this._calibrated = false;

    this._bindKeys();
    this._detectGyro();
  }

  // ── Gyroscope ───────────────────────────────────────────────────────────────

  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const resp = await DeviceOrientationEvent.requestPermission();
        if (resp === 'granted') {
          this._listenOrientation();
          return 'granted';
        }
        this._permDenied = true;
        return 'denied';
      } catch {
        this._permDenied = true;
        return 'error';
      }
    }
    // Android / non-Safari — no explicit permission needed
    this._listenOrientation();
    return 'granted';
  }

  _detectGyro() {
    // Android Chrome grants access implicitly — start listening immediately
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission !== 'function') {
      this._listenOrientation();
    }
  }

  _listenOrientation() {
    window.addEventListener('deviceorientation', (e) => {
      const beta  = e.beta  ?? 0;
      const gamma = e.gamma ?? 0;

      // ── Map axes to screen orientation ────────────────────────────────────
      const isLandscape = window.innerWidth > window.innerHeight;
      const angle       = screen.orientation?.angle ?? window.orientation ?? 0;
      // "flipped" = 180° or 270° rotation (upside-down portrait or flipped landscape)
      const flipped     = angle === 180 || angle === 270;

      let rawX, rawY;
      if (isLandscape) {
        // Tablet native landscape (angle=0) OR phone rotated to landscape (angle=90/270)
        // → beta  is the left/right axis for what the USER sees
        // → gamma is the forward/back axis for what the USER sees
        rawX = flipped ? -beta  :  beta;
        rawY = flipped ? -gamma :  gamma;
      } else {
        // Phone native portrait (angle=0) OR tablet rotated to portrait (angle=90/270)
        // → gamma is the left/right axis
        // → beta  is the forward/back axis
        rawX = flipped ? -gamma :  gamma;
        rawY = flipped ? -beta  :  beta;
      }

      // ── Auto-calibrate resting position ───────────────────────────────────
      // Collect initial samples; once enough are gathered, compute the offset
      // that represents the device's natural "flat / at rest" position.
      if (!this._calibrated) {
        this._calSamples.x.push(rawX);
        this._calSamples.y.push(rawY);
        if (this._calSamples.x.length >= CAL_SAMPLES) {
          const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
          // Limit how much we correct — don't mask intentional tilts
          this._calOffset.x = Math.max(-30, Math.min(30, avg(this._calSamples.x)));
          this._calOffset.y = Math.max(-30, Math.min(30, avg(this._calSamples.y)));
          this._calibrated  = true;
          this._calSamples  = { x: [], y: [] }; // free memory
        }
        return; // Don't produce input until calibrated
      }

      // ── Apply offset, clamp, normalise ────────────────────────────────────
      let gx = rawX - this._calOffset.x;
      let gy = rawY - this._calOffset.y;

      gx = Math.max(-CLAMP_DEG, Math.min(CLAMP_DEG, gx)) / CLAMP_DEG;
      gy = Math.max(-CLAMP_DEG, Math.min(CLAMP_DEG, gy)) / CLAMP_DEG;

      this.tiltX    = gx;
      this.tiltY    = gy;
      this._hasGyro = true;
    }, { passive: true });

    // Re-calibrate automatically when device orientation changes
    // (user rotates tablet mid-game — axes swap, so offset needs reset)
    screen.orientation?.addEventListener('change', () => this.recalibrate());
    window.addEventListener('orientationchange', () => this.recalibrate());
  }

  /**
   * Reset calibration — call at the start of each game, or if user changes
   * how they're holding the device. The next ~0.5s of readings become the
   * new "neutral" position.
   */
  recalibrate() {
    this._calSamples = { x: [], y: [] };
    this._calOffset  = { x: 0,  y: 0  };
    this._calibrated = false;
    this.tiltX = 0;
    this.tiltY = 0;
  }

  // ── Touch joystick fallback ─────────────────────────────────────────────────

  bindTouch(canvas) {
    canvas.addEventListener('touchstart', (e) => {
      if (this._hasGyro) return;
      const t = e.changedTouches[0];
      this._touch       = t.identifier;
      this._touchStartX = t.clientX;
      this._touchStartY = t.clientY;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (this._hasGyro) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this._touch) {
          const dx  = t.clientX - this._touchStartX;
          const dy  = t.clientY - this._touchStartY;
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

    window.addEventListener('keydown', (e) => { held.add(e.code);    update(); });
    window.addEventListener('keyup',   (e) => { held.delete(e.code); update(); });
  }

  get hasGyro() { return this._hasGyro; }
}
