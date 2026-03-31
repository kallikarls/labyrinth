/**
 * racer.js — Endless 3D Road Racer (Three.js)
 *
 * Core mechanic: road segments advance TOWARD the camera each frame.
 * Car stays at world Z = 0. Camera sits behind and above it.
 * Segments recycle from back-of-pool to far-ahead when they pass the camera.
 *
 * Gyro  : tilt left/right = steer   |  tilt fwd/back = accel/brake
 * Keys  : ArrowLeft/Right or A/D    |  ArrowUp/Down or W/S  |  Esc/P = pause
 */

import { t } from './i18n.js';

let THREE = null;

// ── Tuning ────────────────────────────────────────────────────────────────────
const NUM_SEGS    = 28;
const SEG_LEN     = 18;      // world units per segment
const ROAD_HW     = 4.8;     // road half-width
const GRASS_HW    = 20;      // grass strip half-width (each side from centre)
const RECYCLE_Z   = 20;      // recycle segment when seg.z > this
const SPEED_INIT  = 18;      // m/s
const SPEED_MAX   = 78;
const SPEED_ACCEL = 9;
const SPEED_BRAKE = 22;
const SPEED_COAST = 3.5;
const GRASS_DRAG  = 16;
const STEER_K     = 3.2;
const CAR_LIMIT   = ROAD_HW - 1.0;  // crash if |carX| > this
const MAX_OBS     = 7;
const BEST_KEY    = 'racer_best';

const ROAD_COLS  = [0x2e2e3a, 0x383848];
const GRASS_COLS = [0x4a8c3f, 0x3d7434];

// ── Class ─────────────────────────────────────────────────────────────────────
export class Racer {
  constructor() {
    this._ui = {
      screen:     document.getElementById('racerScreen'),
      container:  document.getElementById('racerContainer'),
      scoreEl:    document.getElementById('racerScore'),
      bestEl:     document.getElementById('racerBest'),
      speedEl:    document.getElementById('racerSpeed'),
      overlay:    document.getElementById('racerOverlay'),
      overTitle:  document.getElementById('racerOverTitle'),
      overScore:  document.getElementById('racerFinalScore'),
      newBest:    document.getElementById('racerNewBest'),
      btnRestart: document.getElementById('btnRacerRestart'),
      btnHome:    document.getElementById('btnRacerHome'),
      btnOverHome:document.getElementById('btnRacerOverHome'),
      btnPause:   document.getElementById('btnRacerPause'),
    };

    this._best    = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._dist    = 0;
    this._speed   = SPEED_INIT;
    this._carX    = 0;
    this._carYaw  = 0;
    this._camX    = 0;
    this._paused  = false;
    this._state   = 'idle';

    this._beta    = 0;
    this._gamma   = 0;
    this._hasGyro = false;
    this._orientCb = e => this._onOrientation(e);
    this._keys    = new Set();

    // { mesh: Group, z: number } — z is world Z, updated each frame
    this._segs = [];
    // { mesh: Group, z: number, x: number, hw: number, active: bool }
    this._obs  = [];

    this._renderer = null;
    this._scene    = null;
    this._camera   = null;
    this._carGroup = null;
    this._raf      = null;
    this._lastTs   = 0;

    this._bindUI();
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  async open() {
    this._ui.screen.classList.add('active');
    if (!THREE) {
      try {
        THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
      } catch (e) { console.error('Three.js failed to load', e); return; }
    }
    // Wait for screen to be painted so clientWidth/Height are real
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (!this._renderer) this._initScene();
    else this._onResize();
    this._showOverlay('start');
  }

  close() {
    this._stopLoop();
    window.removeEventListener('deviceorientation', this._orientCb);
    this._ui.screen.classList.remove('active');
  }

  // ── Scene setup ───────────────────────────────────────────────────────────────

  _initScene() {
    const W = this._ui.container.clientWidth  || window.innerWidth;
    const H = this._ui.container.clientHeight || window.innerHeight;

    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(W, H);
    this._ui.container.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x7ab8e0);
    this._scene.fog = new THREE.Fog(0xd0e8f5, 90, 240);

    this._camera = new THREE.PerspectiveCamera(58, W / H, 0.2, 320);

    // Lights
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(20, 60, 10);
    this._scene.add(sun);

    // Sky horizon backdrop
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 110),
      new THREE.MeshBasicMaterial({ color: 0xd0e8f5 })
    );
    sky.position.set(0, 30, -200);
    this._scene.add(sky);

    // Mountain silhouettes
    for (let i = 0; i < 14; i++) {
      const h = 22 + Math.random() * 32;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(14 + Math.random() * 11, h, 7),
        new THREE.MeshLambertMaterial({ color: 0x5a6e7e })
      );
      m.position.set(-130 + i * 21 + Math.random() * 8, h / 2 - 5, -185);
      this._scene.add(m);
    }

    // Road segments
    this._buildRoad();

    // Obstacle pool
    this._buildObstaclePool();

    // Player car
    this._carGroup = this._makeCar();
    this._scene.add(this._carGroup);

    window.addEventListener('resize', () => {
      if (this._ui.screen.classList.contains('active')) this._onResize();
    });
    this._bindInputEvents();
  }

  _onResize() {
    if (!this._renderer) return;
    const W = this._ui.container.clientWidth  || window.innerWidth;
    const H = this._ui.container.clientHeight || window.innerHeight;
    this._camera.aspect = W / H;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(W, H);
  }

  // ── Road pool ─────────────────────────────────────────────────────────────────

  _buildRoad() {
    // Shared geometries (re-used across all segments for memory efficiency)
    const roadGeo  = new THREE.PlaneGeometry(ROAD_HW * 2, SEG_LEN);
    const grassGeo = new THREE.PlaneGeometry(GRASS_HW * 2, SEG_LEN);
    const dashGeo  = new THREE.PlaneGeometry(0.25, SEG_LEN * 0.44);
    const edgeGeo  = new THREE.PlaneGeometry(0.22, SEG_LEN);

    for (let i = 0; i < NUM_SEGS; i++) {
      const g = new THREE.Group();

      // Road surface
      const road = new THREE.Mesh(
        roadGeo,
        new THREE.MeshLambertMaterial({ color: ROAD_COLS[i % 2] })
      );
      road.rotation.x = -Math.PI / 2;
      g.add(road);

      // Grass — left and right
      for (const side of [-1, 1]) {
        const grass = new THREE.Mesh(
          grassGeo,
          new THREE.MeshLambertMaterial({ color: GRASS_COLS[i % 2] })
        );
        grass.rotation.x = -Math.PI / 2;
        grass.position.x = side * (ROAD_HW + GRASS_HW);
        g.add(grass);
      }

      // Centre dash line
      const dash = new THREE.Mesh(dashGeo, new THREE.MeshBasicMaterial({ color: 0xf0f0a0 }));
      dash.rotation.x = -Math.PI / 2;
      dash.position.y = 0.01;
      g.add(dash);

      // Edge lines
      for (const side of [-1, 1]) {
        const edge = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(side * (ROAD_HW - 0.15), 0.01, 0);
        g.add(edge);
      }

      // Roadside trees (random placement per segment)
      for (const side of [-1, 1]) {
        if (Math.random() < 0.72) {
          const tree = this._makeTree();
          tree.position.set(
            side * (ROAD_HW + 3.5 + Math.random() * 7),
            0,
            (Math.random() - 0.5) * SEG_LEN * 0.65
          );
          g.add(tree);
        }
      }

      // Initial Z position: stretch road from near to far ahead
      // Segments at z = 0, -SEG_LEN, -2*SEG_LEN, ...
      // Positive Z = behind camera, negative Z = ahead of car
      const z = -i * SEG_LEN;
      g.position.z = z;
      this._scene.add(g);
      this._segs.push({ mesh: g, z });
    }
  }

  // ── Obstacle pool ─────────────────────────────────────────────────────────────

  _buildObstaclePool() {
    const types = ['cone', 'barrier', 'truck', 'cone', 'barrier', 'cone', 'truck'];
    for (let i = 0; i < MAX_OBS; i++) {
      const type = types[i % types.length];
      let mesh, hw;
      if      (type === 'cone')    { mesh = this._makeCone();    hw = 0.55; }
      else if (type === 'barrier') { mesh = this._makeBarrier(); hw = 1.85; }
      else                         { mesh = this._makeTruck();   hw = 1.65; }

      // Park far ahead initially so they don't show until game starts
      const z = -(80 + i * SEG_LEN * 2);
      const x = (Math.random() - 0.5) * (ROAD_HW * 1.5);
      mesh.position.set(x, 0, z);
      this._scene.add(mesh);
      this._obs.push({ mesh, z, x, hw, type, active: false });
    }
  }

  // ── Game flow ─────────────────────────────────────────────────────────────────

  _startGame() {
    this._dist   = 0;
    this._speed  = SPEED_INIT;
    this._carX   = 0;
    this._carYaw = 0;
    this._camX   = 0;
    this._paused = false;
    this._state  = 'playing';
    this._lastTs = 0;

    // Reset road: spread segments evenly from just behind car to far ahead
    for (let i = 0; i < this._segs.length; i++) {
      this._segs[i].z = -i * SEG_LEN;
      this._segs[i].mesh.position.z = -i * SEG_LEN;
      this._segs[i].mesh.position.x = 0;
    }

    // Reset obstacles — spread ahead of the first few segments so player has a
    // clear run for the first couple of seconds before obstacles appear
    for (let i = 0; i < this._obs.length; i++) {
      const z = -(60 + i * SEG_LEN * 2.5 + Math.random() * SEG_LEN);
      const x = (Math.random() - 0.5) * (ROAD_HW * 1.5);
      this._obs[i].z = z;
      this._obs[i].x = x;
      this._obs[i].active = true;
      this._obs[i].mesh.position.set(x, 0, z);
    }

    this._ui.overlay.style.display = 'none';
    this._ui.btnPause.textContent  = '⏸';
    this._updateHUD();
    this._stopLoop();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  _stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _endGame() {
    this._state = 'over';
    this._stopLoop();
    if (this._renderer) this._renderer.render(this._scene, this._camera);

    const metres    = Math.floor(this._dist);
    const isNewBest = metres > this._best;
    if (isNewBest) {
      this._best = metres;
      localStorage.setItem(BEST_KEY, String(this._best));
    }

    this._ui.overTitle.textContent  = t('gameOver');
    this._ui.overScore.textContent  = `${metres} m`;
    this._ui.newBest.style.display  = isNewBest ? 'block' : 'none';
    this._ui.btnRestart.textContent = t('racerPlayAgain');
    this._ui.overlay.style.display  = 'flex';
    this._updateHUD();
  }

  _updateHUD() {
    this._ui.scoreEl.textContent = `${Math.floor(this._dist)} m`;
    this._ui.bestEl.textContent  = `${t('best')}: ${this._best} m`;
    this._ui.speedEl.textContent = `${Math.round(this._speed * 3.6)} km/h`;
  }

  _showOverlay(type) {
    this._ui.overTitle.textContent  = type === 'start' ? t('racerName') : t('gameOver');
    this._ui.overScore.textContent  = type === 'start' ? t('racerSubtitle') : `${Math.floor(this._dist)} m`;
    this._ui.newBest.style.display  = 'none';
    this._ui.btnRestart.textContent = t('racerStart');
    this._ui.overlay.style.display  = 'flex';
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  _loop(ts) {
    if (!this._ui.screen.classList.contains('active')) return;
    this._raf = requestAnimationFrame(t2 => this._loop(t2));
    const dt = this._lastTs ? Math.min((ts - this._lastTs) / 1000, 0.05) : 0.016;
    this._lastTs = ts;
    if (!this._paused && this._state === 'playing') this._update(dt);
    this._render();
  }

  _update(dt) {
    // ── Read input ────────────────────────────────────────────────────────────
    let steer = 0, accel = 0;
    if (this._hasGyro) {
      steer =  this._gamma / 28;        // ±28° → ±1
      accel = -(this._beta - 30) / 25;  // resting ~30°; tilt forward → accel
    } else {
      if (this._keys.has('ArrowLeft')  || this._keys.has('a') || this._keys.has('A'))  steer = -1;
      if (this._keys.has('ArrowRight') || this._keys.has('d') || this._keys.has('D'))  steer =  1;
      if (this._keys.has('ArrowUp')    || this._keys.has('w') || this._keys.has('W'))  accel =  1;
      if (this._keys.has('ArrowDown')  || this._keys.has('s') || this._keys.has('S'))  accel = -1;
    }
    steer = Math.max(-1, Math.min(1, steer));
    accel = Math.max(-1, Math.min(1, accel));

    // ── Speed ─────────────────────────────────────────────────────────────────
    const onRoad = Math.abs(this._carX) <= ROAD_HW;
    if      (accel >  0.12) this._speed += SPEED_ACCEL * accel * dt;
    else if (accel < -0.12) this._speed -= SPEED_BRAKE * Math.abs(accel) * dt;
    else                    this._speed -= SPEED_COAST * dt;
    if (!onRoad)            this._speed -= GRASS_DRAG * dt;
    this._speed = Math.max(0, Math.min(SPEED_MAX, this._speed));

    // ── Steer ─────────────────────────────────────────────────────────────────
    const sr = STEER_K * (0.35 + 0.65 * (this._speed / SPEED_MAX));
    this._carX += steer * sr * dt * (this._speed * 0.06 + 1.0);
    this._carX  = Math.max(-(ROAD_HW + 2), Math.min(ROAD_HW + 2, this._carX));

    // Visual yaw — smooth to target
    const yawTarget = steer * 0.18;
    this._carYaw += (yawTarget - this._carYaw) * 0.18;

    // ── Distance ──────────────────────────────────────────────────────────────
    this._dist += this._speed * dt;

    // ── Advance road segments toward camera ───────────────────────────────────
    // Advance all first, then find new minimum, then recycle any that passed
    for (const seg of this._segs) {
      seg.z += this._speed * dt;
      seg.mesh.position.z = seg.z;
    }
    let minSegZ = Infinity;
    for (const seg of this._segs) minSegZ = Math.min(minSegZ, seg.z);

    for (const seg of this._segs) {
      if (seg.z > RECYCLE_Z) {
        seg.z = minSegZ - SEG_LEN;
        seg.mesh.position.z = seg.z;
        minSegZ = seg.z; // cascading: next recycle uses updated min
      }
    }

    // ── Advance obstacles ─────────────────────────────────────────────────────
    for (const obs of this._obs) {
      if (!obs.active) continue;
      obs.z += this._speed * dt;
      obs.mesh.position.z = obs.z;
      if (obs.z > RECYCLE_Z + 4) {
        // Respawn ahead, behind the farthest road segment
        obs.z = minSegZ - (SEG_LEN * 1.5 + Math.random() * SEG_LEN * 3);
        obs.x = (Math.random() - 0.5) * (ROAD_HW * 1.5);
        obs.mesh.position.set(obs.x, 0, obs.z);
      }
    }

    // ── Crash: edge ───────────────────────────────────────────────────────────
    if (Math.abs(this._carX) > CAR_LIMIT + 1.4) {
      this._endGame(); return;
    }

    // ── Crash: obstacle ───────────────────────────────────────────────────────
    for (const obs of this._obs) {
      if (!obs.active) continue;
      if (obs.z > -3.5 && obs.z < 3.5) {
        if (Math.abs(obs.x - this._carX) < obs.hw + 0.85) {
          this._endGame(); return;
        }
      }
    }

    this._updateHUD();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  _render() {
    if (!this._renderer) return;

    // Car
    this._carGroup.position.set(this._carX, 0.26, 0);
    this._carGroup.rotation.y = this._carYaw;

    // Chase camera: lags slightly behind car X for natural feel
    this._camX += (this._carX * 0.4 - this._camX) * 0.10;
    this._camera.position.set(this._camX, 3.8, 9);
    this._camera.lookAt(this._carX * 0.6, 0.5, -40);

    this._renderer.render(this._scene, this._camera);
  }

  // ── Mesh builders ─────────────────────────────────────────────────────────────

  _box(w, h, d, x, y, z, color) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    m.position.set(x, y, z);
    return m;
  }

  _makeCar() {
    const g = new THREE.Group();
    g.add(this._box(1.6, 0.5,  3.2, 0,    0,     0,     0xe03030)); // body
    g.add(this._box(1.3, 0.4,  1.7, 0,    0.45, -0.2,   0xbb2020)); // roof
    // Windscreen
    const ws = this._box(1.25, 0.32, 0.05, 0, 0.53, 0.64, 0x88bbee);
    ws.material = new THREE.MeshLambertMaterial({ color: 0x88bbee, transparent: true, opacity: 0.7 });
    g.add(ws);
    // Rear window
    const rw = ws.clone();
    rw.position.z = -1.04;
    g.add(rw);
    // Wheels
    for (const [wx, wz] of [[-0.9, 1.1], [0.9, 1.1], [-0.9, -1.1], [0.9, -1.1]]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12),
        new THREE.MeshLambertMaterial({ color: 0x222222 })
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, -0.22, wz);
      g.add(w);
    }
    // Headlights
    g.add(this._box(0.28, 0.14, 0.05, -0.55, 0.05, 1.63, 0xffffaa));
    g.add(this._box(0.28, 0.14, 0.05,  0.55, 0.05, 1.63, 0xffffaa));
    return g;
  }

  _makeTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x6b4226 })
    );
    trunk.position.y = 0.7;
    g.add(trunk);
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(1.0 + Math.random() * 0.5, 2.6 + Math.random() * 0.8, 7),
      new THREE.MeshLambertMaterial({ color: 0x2d6e2d })
    );
    leaf.position.y = 2.7;
    g.add(leaf);
    return g;
  }

  _makeCone() {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 8),
      new THREE.MeshLambertMaterial({ color: 0xff6600 })
    );
    cone.position.y = 0.35;
    g.add(cone);
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.04, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stripe.position.y = 0.38;
    stripe.rotation.x = Math.PI / 2;
    g.add(stripe);
    return g;
  }

  _makeBarrier() {
    const g = new THREE.Group();
    g.add(this._box(2.2, 0.55, 0.4, 0, 0.28, 0, 0xdd2200));
    // White stripes
    for (let i = 0; i < 4; i++) {
      const s = this._box(0.32, 0.56, 0.42, -0.82 + i * 0.55, 0.28, 0.01, 0xffffff);
      s.material.transparent = true;
      s.material.opacity = 0.5;
      g.add(s);
    }
    return g;
  }

  _makeTruck() {
    const g = new THREE.Group();
    g.add(this._box(2.0, 1.6, 1.8,  0, 0.8,   1.5, 0x4455aa)); // cab
    g.add(this._box(2.0, 1.9, 5.0,  0, 0.95, -1.5, 0x556688)); // trailer
    for (const [wx, wz] of [[-1.1,1.5],[1.1,1.5],[-1.1,-1.5],[1.1,-1.5],[-1.1,-3.0],[1.1,-3.0]]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 0.28, 10),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.44, wz);
      g.add(w);
    }
    return g;
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  _onOrientation(e) {
    if (e.beta === null) return;
    this._hasGyro = true;
    this._beta    = e.beta;
    this._gamma   = e.gamma;
  }

  async _requestGyroAndStart() {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') window.addEventListener('deviceorientation', this._orientCb);
      } catch (_) {}
    } else {
      window.addEventListener('deviceorientation', this._orientCb);
    }
    this._startGame();
  }

  _bindInputEvents() {
    window.addEventListener('keydown', e => {
      if (!this._ui.screen.classList.contains('active')) return;
      this._keys.add(e.key);
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') this._togglePause();
    });
    window.addEventListener('keyup', e => this._keys.delete(e.key));
  }

  _togglePause() {
    if (this._state !== 'playing') return;
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
