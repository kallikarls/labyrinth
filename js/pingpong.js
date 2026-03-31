/**
 * pingpong.js — 3D Ping Pong / Racquet Juggle using Three.js (lazy CDN load)
 *
 * The phone IS the racquet. Hold it flat, look down at the screen.
 * Gyro sensor controls the tilt. Tap / click to launch the ball.
 * Every bounce on the racquet = 1 point. Don't let it fall!
 *
 * Controls:
 *   Phone/tablet  — Gyro: tilt device to move racquet; tap to launch
 *   Desktop/fallback — Mouse move to tilt, click to launch
 *   Space          — launch
 *   Esc / P        — pause
 */

import { t } from './i18n.js';

let THREE = null; // lazily loaded from CDN

const GRAVITY     = 7.5;         // world units / s²
const BALL_R      = 0.14;
const RACQUET_R   = 1.16;
const RESTITUTION = 0.74;
const TILT_SMOOTH = 0.20;        // low-pass weight (higher = snappier)
const TILT_SCALE  = 0.85;        // deg → rad multiplier
const MAX_TILT    = Math.PI / 5; // ~36° clamp
const TRAIL_LEN   = 10;
const BEST_KEY    = 'pingpong_best';

export class PingPong {
  constructor() {
    this._ui = {
      screen:     document.getElementById('ppScreen'),
      container:  document.getElementById('ppContainer'),
      scoreEl:    document.getElementById('ppScore'),
      bestEl:     document.getElementById('ppBest'),
      overlay:    document.getElementById('ppOverlay'),
      overTitle:  document.getElementById('ppOverTitle'),
      overScore:  document.getElementById('ppFinalScore'),
      newBest:    document.getElementById('ppNewBest'),
      btnRestart: document.getElementById('btnPPRestart'),
      btnHome:    document.getElementById('btnPPHome'),
      btnOverHome:document.getElementById('btnPPOverHome'),
      btnPause:   document.getElementById('btnPPPause'),
      hint:       document.getElementById('ppHint'),
    };

    this._best   = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._score  = 0;
    this._paused = false;
    this._state  = 'idle'; // 'idle' | 'playing' | 'over'

    // Orientation (raw sensor values)
    this._beta   = 0; this._gamma  = 0;
    // Smoothed values used for rendering / physics
    this._smoothBeta  = 0; this._smoothGamma = 0;
    // Previous smoothed values (for flick detection)
    this._prevSB  = 0; this._prevSG = 0;
    this._hasGyro = false;

    // Ball physics state
    this._ballPos  = { x: 0, y: BALL_R + 0.03, z: 0 };
    this._ballVel  = { x: 0, y: 0, z: 0 };
    this._trailHist = [];

    // Three.js handles
    this._renderer    = null;
    this._scene       = null;
    this._camera      = null;
    this._rGroup      = null;   // racquet group
    this._ballMesh    = null;
    this._shadowMesh  = null;
    this._trailMeshes = [];

    this._raf    = null;
    this._lastTs = 0;

    this._orientCb = (e) => this._onOrientation(e);
    this._bindUI();
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  async open() {
    this._ui.screen.classList.add('active');

    if (!THREE) {
      try {
        THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
      } catch (err) {
        console.error('Failed to load Three.js:', err);
        return;
      }
    }

    if (!this._renderer) {
      this._initScene();
    } else {
      this._onResize();
    }

    this._showOverlay('start');
  }

  close() {
    this._stopLoop();
    this._ui.screen.classList.remove('active');
    window.removeEventListener('deviceorientation', this._orientCb);
  }

  // ── Three.js scene ────────────────────────────────────────────────────────────

  _initScene() {
    const W = this._ui.container.clientWidth  || window.innerWidth;
    const H = this._ui.container.clientHeight || window.innerHeight;

    // Renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(W, H);
    this._ui.container.appendChild(this._renderer.domElement);

    // Scene
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0d0f14);
    this._scene.fog = new THREE.FogExp2(0x0d0f14, 0.045);

    // Camera — above and slightly toward viewer, looking at origin
    this._camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 80);
    this._camera.position.set(0, 5.5, 4.0);
    this._camera.lookAt(0, 0, 0);

    // Lights
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(3, 8, 4);
    this._scene.add(sun);
    const fill = new THREE.PointLight(0x4488ff, 0.45, 12);
    fill.position.set(-3, -1, 3);
    this._scene.add(fill);

    // ── Racquet ──────────────────────────────────────────────────────────────
    this._rGroup = new THREE.Group();
    this._scene.add(this._rGroup);

    // Paddle disc  — CylinderGeometry groups: 0=side, 1=top, 2=bottom
    const discGeo = new THREE.CylinderGeometry(RACQUET_R, RACQUET_R, 0.046, 52);
    const discMats = [
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }),  // side (thin edge)
      new THREE.MeshStandardMaterial({ color: 0x1e7a1e, roughness: 0.95 }), // top  = green felt
      new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.75 }), // bottom = red rubber
    ];
    this._rGroup.add(new THREE.Mesh(discGeo, discMats));

    // Rubber rim (torus)
    const rimGeo  = new THREE.TorusGeometry(RACQUET_R, 0.052, 8, 52);
    const rimMesh = new THREE.Mesh(rimGeo,
      new THREE.MeshStandardMaterial({ color: 0x1a0000, roughness: 0.9 })
    );
    rimMesh.rotation.x = Math.PI / 2;
    this._rGroup.add(rimMesh);

    // Handle — extends toward camera (positive Z = toward viewer = appears at bottom)
    const hGeo  = new THREE.BoxGeometry(0.22, 0.06, 0.9);
    const hMat  = new THREE.MeshStandardMaterial({ color: 0xaf6e28, roughness: 0.8 });
    const hMesh = new THREE.Mesh(hGeo, hMat);
    hMesh.position.set(0, 0.024, RACQUET_R + 0.42);
    this._rGroup.add(hMesh);

    // Handle grip lines (3 shallow ridges)
    const gGeo = new THREE.BoxGeometry(0.24, 0.04, 0.12);
    const gMat = new THREE.MeshStandardMaterial({ color: 0x8b5520, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Mesh(gGeo, gMat);
      g.position.set(0, 0.052, RACQUET_R + 0.17 + i * 0.24);
      this._rGroup.add(g);
    }

    // ── Ball ─────────────────────────────────────────────────────────────────
    const ballGeo = new THREE.SphereGeometry(BALL_R, 24, 16);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.2, metalness: 0.0,
      emissive: 0x1a1a1a,
    });
    this._ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this._scene.add(this._ballMesh);

    // ── Landing shadow ────────────────────────────────────────────────────────
    const shGeo = new THREE.CircleGeometry(0.22, 20);
    const shMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false,
    });
    this._shadowMesh = new THREE.Mesh(shGeo, shMat);
    this._shadowMesh.rotation.x = -Math.PI / 2;
    this._shadowMesh.position.y = 0.05; // just above disc top face
    this._scene.add(this._shadowMesh);

    // ── Motion trail ──────────────────────────────────────────────────────────
    const trGeo = new THREE.SphereGeometry(0.058, 8, 8);
    for (let i = 0; i < TRAIL_LEN; i++) {
      const tm = new THREE.Mesh(trGeo,
        new THREE.MeshBasicMaterial({
          color: 0x66aaff, transparent: true, opacity: 0, depthWrite: false,
        })
      );
      tm.visible = false;
      this._scene.add(tm);
      this._trailMeshes.push(tm);
    }

    // ── Input + resize ────────────────────────────────────────────────────────
    this._bindInput();
    window.addEventListener('resize', () => {
      if (this._ui.screen.classList.contains('active')) this._onResize();
    });
  }

  _onResize() {
    if (!this._renderer) return;
    const W = this._ui.container.clientWidth  || window.innerWidth;
    const H = this._ui.container.clientHeight || window.innerHeight;
    this._camera.aspect = W / H;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(W, H);
  }

  // ── Game flow ─────────────────────────────────────────────────────────────────

  _startGame() {
    this._score     = 0;
    this._paused    = false;
    this._state     = 'idle';
    this._trailHist = [];
    this._ballPos   = { x: 0, y: BALL_R + 0.03, z: 0 };
    this._ballVel   = { x: 0, y: 0, z: 0 };
    this._ui.overlay.style.display = 'none';
    this._ui.btnPause.textContent  = '⏸';
    if (this._ui.hint) {
      this._ui.hint.textContent   = t('ppTapLaunch');
      this._ui.hint.style.display = 'block';
    }
    this._updateHUD();
    this._lastTs = 0;
    this._stopLoop();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  _stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _launch() {
    if (this._state !== 'idle' || this._paused) return;
    this._state = 'playing';
    this._ballVel = {
      x: (Math.random() - 0.5) * 0.5,
      y: 5.0,
      z: (Math.random() - 0.5) * 0.5,
    };
    if (this._ui.hint) this._ui.hint.style.display = 'none';
  }

  _endGame() {
    this._state = 'over';
    this._stopLoop();
    if (this._renderer) this._renderer.render(this._scene, this._camera);

    const isNewBest = this._score > this._best;
    if (isNewBest) {
      this._best = this._score;
      localStorage.setItem(BEST_KEY, String(this._best));
    }

    this._ui.overTitle.textContent  = t('gameOver');
    this._ui.overScore.textContent  = this._score;
    this._ui.newBest.style.display  = isNewBest ? 'block' : 'none';
    this._ui.btnRestart.textContent = t('ppPlayAgain');
    this._ui.overlay.style.display  = 'flex';
    this._updateHUD();
  }

  _updateHUD() {
    this._ui.scoreEl.textContent = `${t('score')}: ${this._score}`;
    this._ui.bestEl.textContent  = `${t('best')}: ${this._best}`;
  }

  _showOverlay(type) {
    this._ui.overTitle.textContent  = type === 'start' ? t('ppName') : t('gameOver');
    this._ui.overScore.textContent  = type === 'start' ? '' : String(this._score);
    this._ui.newBest.style.display  = 'none';
    this._ui.btnRestart.textContent = t('ppStart');
    this._ui.overlay.style.display  = 'flex';
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  _loop(ts) {
    if (!this._ui.screen.classList.contains('active')) return;
    this._raf = requestAnimationFrame(t2 => this._loop(t2));

    const dt = this._lastTs ? Math.min((ts - this._lastTs) / 1000, 0.05) : 0.016;
    this._lastTs = ts;

    if (!this._paused && this._state !== 'over') {
      // Smooth orientation
      this._prevSB = this._smoothBeta;
      this._prevSG = this._smoothGamma;
      this._smoothBeta  += (this._beta  - this._smoothBeta)  * TILT_SMOOTH;
      this._smoothGamma += (this._gamma - this._smoothGamma) * TILT_SMOOTH;

      // Tilt racquet
      this._rGroup.rotation.x = Math.max(-MAX_TILT, Math.min(MAX_TILT,
        -this._smoothBeta  * TILT_SCALE * (Math.PI / 180)));
      this._rGroup.rotation.z = Math.max(-MAX_TILT, Math.min(MAX_TILT,
         this._smoothGamma * TILT_SCALE * (Math.PI / 180)));

      if (this._state === 'idle') {
        this._restBallOnRacquet();
      } else {
        this._stepBall(dt);
      }
    }

    this._syncVisuals();
    this._renderer.render(this._scene, this._camera);
  }

  // ── Physics ───────────────────────────────────────────────────────────────────

  _racquetNormal() {
    const n = new THREE.Vector3(0, 1, 0);
    n.applyQuaternion(this._rGroup.quaternion);
    return n;
  }

  _restBallOnRacquet() {
    // Ball sits centred on the racquet, just above the felt surface
    const n = this._racquetNormal();
    const h = BALL_R + 0.03;
    this._ballPos.x = n.x * h;
    this._ballPos.y = n.y * h;
    this._ballPos.z = n.z * h;
  }

  _stepBall(dt) {
    // Gravity
    this._ballVel.y -= GRAVITY * dt;

    // Move
    this._ballPos.x += this._ballVel.x * dt;
    this._ballPos.y += this._ballVel.y * dt;
    this._ballPos.z += this._ballVel.z * dt;

    // Soft ceiling bounce
    if (this._ballPos.y > 7.5) {
      this._ballVel.y = -Math.abs(this._ballVel.y) * 0.55;
      this._ballPos.y = 7.5;
    }

    // Trail history
    this._trailHist.unshift({ ...this._ballPos });
    if (this._trailHist.length > TRAIL_LEN) this._trailHist.pop();

    // Racquet collision
    this._checkBounce(dt);

    // Game-over: fell below or flew too far sideways
    if (this._ballPos.y < -4 || Math.hypot(this._ballPos.x, this._ballPos.z) > 9) {
      this._endGame();
    }
  }

  _checkBounce(dt) {
    const n   = this._racquetNormal();
    const bp  = new THREE.Vector3(this._ballPos.x, this._ballPos.y, this._ballPos.z);
    const bv  = new THREE.Vector3(this._ballVel.x, this._ballVel.y, this._ballVel.z);

    // Signed distance of ball centre from the racquet plane
    const dist = bp.dot(n);

    // Only handle if ball is near the plane and moving toward it
    if (dist > BALL_R * 3 || dist < -BALL_R * 2) return;
    if (bv.dot(n) >= 0) return; // moving away — skip

    // Radial distance from racquet centre (projected onto the plane)
    const proj     = bp.clone().sub(n.clone().multiplyScalar(dist));
    const radial   = proj.length();
    if (radial > RACQUET_R * 1.1) return; // missed the disc

    // ── Bounce ───────────────────────────────────────────────────────────────

    // "Flick" bonus: how fast the racquet normal changed this frame (deg/s → rad/s)
    const bDeltaRad = (this._smoothBeta  - this._prevSB)  / dt * (Math.PI / 180);
    const gDeltaRad = (this._smoothGamma - this._prevSG)  / dt * (Math.PI / 180);
    // Upward flick = rapid tilt toward viewer = negative beta direction
    const flick = Math.max(-1.5, Math.min(2.5, -bDeltaRad * 0.35));

    const vn  = bv.dot(n);
    const ref = bv.clone().sub(n.clone().multiplyScalar((1 + RESTITUTION) * vn));
    ref.y   += flick;
    ref.x   *= 0.90;
    ref.z   *= 0.90;
    if (ref.y < 1.8) ref.y = 1.8; // minimum upward exit speed

    this._ballVel.x = ref.x;
    this._ballVel.y = ref.y;
    this._ballVel.z = ref.z;

    // Push ball clear of the plane
    const push = BALL_R - dist + 0.006;
    this._ballPos.x += n.x * push;
    this._ballPos.y += n.y * push;
    this._ballPos.z += n.z * push;

    this._score++;
    this._updateHUD();
  }

  // ── Visuals ───────────────────────────────────────────────────────────────────

  _syncVisuals() {
    if (!this._ballMesh) return;

    // Ball
    this._ballMesh.position.set(this._ballPos.x, this._ballPos.y, this._ballPos.z);
    this._ballMesh.rotation.x += this._ballVel.z * 0.07;
    this._ballMesh.rotation.z -= this._ballVel.x * 0.07;

    // Shadow (world-space disc above racquet, fades and shrinks with height)
    const h = Math.max(0, this._ballPos.y - 0.05);
    this._shadowMesh.position.x = this._ballPos.x;
    this._shadowMesh.position.z = this._ballPos.z;
    this._shadowMesh.material.opacity = Math.max(0, 0.44 - h * 0.055);
    const s = Math.max(0.12, 1.0 - h * 0.085);
    this._shadowMesh.scale.setScalar(s);
    this._shadowMesh.visible = h < 7;

    // Trail
    for (let i = 0; i < TRAIL_LEN; i++) {
      const p = this._trailHist[i];
      if (p && this._state === 'playing' && i > 0) {
        this._trailMeshes[i].visible = true;
        this._trailMeshes[i].position.set(p.x, p.y, p.z);
        this._trailMeshes[i].material.opacity = ((TRAIL_LEN - i) / TRAIL_LEN) * 0.40;
      } else {
        this._trailMeshes[i].visible = false;
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  _onOrientation(e) {
    if (e.beta === null || e.gamma === null) return;
    this._hasGyro = true;
    this._beta    = e.beta;
    this._gamma   = e.gamma;
  }

  async _requestGyroAndStart() {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // iOS 13+ requires explicit user-gesture permission call
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') {
          window.addEventListener('deviceorientation', this._orientCb);
        }
      } catch (_) { /* denied or error — fall back to mouse/touch */ }
    } else {
      // Android / desktop — no permission needed
      window.addEventListener('deviceorientation', this._orientCb);
    }
    this._startGame();
  }

  _bindInput() {
    const canvas = this._renderer.domElement;

    // Touch ── drag to tilt (fallback), tap to launch
    let tStart = null;
    canvas.addEventListener('touchstart', e => {
      tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
      if (this._hasGyro) return;
      const r = canvas.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      this._gamma =  (e.touches[0].clientX - cx) / r.width  * 60;
      this._beta  = -(e.touches[0].clientY - cy) / r.height * 60;
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      const ch = e.changedTouches[0];
      if (tStart && Math.hypot(ch.clientX - tStart.x, ch.clientY - tStart.y) < 18)
        this._launch();
      tStart = null;
    }, { passive: true });

    // Mouse ── move to tilt, click to launch
    canvas.addEventListener('mousemove', e => {
      if (this._hasGyro) return;
      const r  = canvas.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      this._gamma =  (e.clientX - cx) / r.width  * 55;
      this._beta  = -(e.clientY - cy) / r.height * 55;
    });
    canvas.addEventListener('click', () => this._launch());

    // Keyboard
    window.addEventListener('keydown', e => {
      if (!this._ui.screen.classList.contains('active')) return;
      if (e.key === ' ') { e.preventDefault(); this._launch(); }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') this._togglePause();
    });
  }

  _togglePause() {
    if (this._state === 'idle' || this._state === 'over') return;
    this._paused = !this._paused;
    this._ui.btnPause.textContent = this._paused ? '▶️' : '⏸';
    if (!this._paused) {
      this._lastTs = 0;
      this._raf = requestAnimationFrame(ts => this._loop(ts));
    } else {
      this._stopLoop();
    }
  }

  _bindUI() {
    this._ui.btnHome.addEventListener('click',     () => this.close());
    this._ui.btnOverHome.addEventListener('click', () => this.close());
    this._ui.btnPause.addEventListener('click',    () => this._togglePause());
    this._ui.btnRestart.addEventListener('click',  () => this._requestGyroAndStart());
  }
}
