/**
 * racer.js — Endless 3D Road Racer (Three.js, gyro-controlled)
 *
 * Controls (phone):
 *   Tilt left/right  (gamma)  → steer
 *   Tilt forward     (beta↓)  → accelerate
 *   Tilt backward    (beta↑)  → brake
 *
 * Controls (desktop):
 *   ArrowLeft / A    → steer left
 *   ArrowRight / D   → steer right
 *   ArrowUp / W      → accelerate
 *   ArrowDown / S    → brake
 *   Esc / P          → pause
 */

import { t } from './i18n.js';

let THREE = null; // lazy CDN load

// ── Tuning constants ──────────────────────────────────────────────────────────
const ROAD_W          = 8;        // half-width each side from centre line = 8 units total
const SEG_LEN         = 20;       // length of one road segment
const NUM_SEGS        = 30;       // segments in the pool (= visible road ahead)
const VISIBLE_SEGS    = 22;       // how many to actually render
const MAX_CURVE       = 0.045;    // maximum curvature per segment (radians)
const CURVE_CHANGE    = 0.008;    // how quickly curve changes per segment
const SPEED_INIT      = 18;       // starting speed (units/s)
const SPEED_MAX       = 80;
const SPEED_ACCEL     = 8;        // units/s² when tilting forward
const SPEED_BRAKE     = 18;
const SPEED_COAST     = 3;        // natural deceleration
const STEER_RATE      = 2.8;      // steering sensitivity
const CAR_MAX_OFFSET  = ROAD_W - 1.2;  // max lateral offset before crash
const GRASS_FRICTION  = 14;       // extra decel on grass
const OBSTACLE_STRIDE = 6;        // one obstacle per N segments (gets lower with score)
const BEST_KEY        = 'racer_best';

// ── Colour palette ────────────────────────────────────────────────────────────
const COL = {
  sky:       0x87ceeb,
  skyHorizon:0xd4eaf7,
  roadDark:  0x333340,
  roadLight: 0x3a3a48,
  line:      0xf0f0a0,
  grass1:    0x4a8c3f,
  grass2:    0x3d7434,
  mountain:  0x5a6e7e,
  carBody:   0xe03030,
  carRoof:   0xbb2020,
  carGlass:  0x88bbee,
  carWheel:  0x222222,
  carLight:  0xffffaa,
  treeLeaf:  0x2d6e2d,
  treeTrunk: 0x6b4226,
  barrier:   0xdd4400,
  cone:      0xff6600,
  truck:     0x4455aa,
};

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

    this._best     = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    this._score    = 0;      // metres driven * 10
    this._speed    = SPEED_INIT;
    this._carX     = 0;      // lateral offset from road centre
    this._carAngle = 0;      // visual yaw of car
    this._paused   = false;
    this._state    = 'idle'; // idle | playing | over

    // Gyro
    this._beta     = 0;
    this._gamma    = 0;
    this._hasGyro  = false;
    this._orientCb = (e) => this._onOrientation(e);

    // Keyboard
    this._keys = new Set();

    // Road state
    this._segs      = [];    // { curve, x (accumulated lateral shift), z (world Z start) }
    this._segPool   = [];    // Three.js Groups reused
    this._obstacles = [];    // { mesh, segIdx, laneX }

    // Car world Z position (we move the world toward camera, car stays near-ish origin)
    this._carZ      = 0;
    this._totalDist = 0;

    // Three.js
    this._renderer   = null;
    this._scene      = null;
    this._camera     = null;
    this._carGroup   = null;
    this._worldGroup = null;
    this._raf        = null;
    this._lastTs     = 0;

    this._bindUI();
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  async open() {
    this._ui.screen.classList.add('active');
    if (!THREE) {
      try {
        THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
      } catch (e) { console.error('Three.js load failed', e); return; }
    }
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
    this._renderer.shadowMap.enabled = false;
    this._ui.container.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(COL.sky);
    this._scene.fog = new THREE.Fog(COL.skyHorizon, 60, 180);

    this._camera = new THREE.PerspectiveCamera(60, W / H, 0.2, 300);

    // Lights
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(30, 60, -20);
    this._scene.add(sun);

    // Sky gradient plane (far background)
    const skyGeo = new THREE.PlaneGeometry(600, 120);
    const skyMat = new THREE.MeshBasicMaterial({ color: COL.skyHorizon, side: THREE.FrontSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(0, 30, -200);
    this._scene.add(skyMesh);

    // Mountain silhouettes
    this._scene.add(this._makeMountains());

    // World group — road, trees, obstacles move through this
    this._worldGroup = new THREE.Group();
    this._scene.add(this._worldGroup);

    // Car
    this._carGroup = this._makeCar();
    this._scene.add(this._carGroup);

    // Build initial road
    this._buildRoadSegments();

    // Input
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

  // ── Road generation ───────────────────────────────────────────────────────────

  _buildRoadSegments() {
    // Geometry types shared
    const roadGeo   = new THREE.PlaneGeometry(ROAD_W * 2, SEG_LEN);
    const grassGeo  = new THREE.PlaneGeometry(40, SEG_LEN);
    const lineGeo   = new THREE.PlaneGeometry(0.22, SEG_LEN * 0.42);

    const roadMats  = [
      new THREE.MeshLambertMaterial({ color: COL.roadDark }),
      new THREE.MeshLambertMaterial({ color: COL.roadLight }),
    ];
    const grassMats = [
      new THREE.MeshLambertMaterial({ color: COL.grass1 }),
      new THREE.MeshLambertMaterial({ color: COL.grass2 }),
    ];
    const lineMat   = new THREE.MeshBasicMaterial({ color: COL.line });

    let accCurve = 0;
    let accX     = 0;
    let accAngle = 0;
    let curCurve = 0;

    for (let i = 0; i < NUM_SEGS; i++) {
      const g = new THREE.Group();

      // Alternate dark/light road strips
      const road = new THREE.Mesh(roadGeo, roadMats[i % 2]);
      road.rotation.x = -Math.PI / 2;
      g.add(road);

      // Grass L/R
      for (const side of [-1, 1]) {
        const grass = new THREE.Mesh(grassGeo, grassMats[i % 2]);
        grass.rotation.x = -Math.PI / 2;
        grass.position.x = side * (ROAD_W + 20);
        g.add(grass);
      }

      // Centre dashes
      const dash = new THREE.Mesh(lineGeo, lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.y = 0.01;
      g.add(dash);

      // Edge lines
      for (const side of [-1, 1]) {
        const edgeLine = new THREE.Mesh(
          new THREE.PlaneGeometry(0.18, SEG_LEN),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        edgeLine.rotation.x = -Math.PI / 2;
        edgeLine.position.set(side * (ROAD_W - 0.2), 0.01, 0);
        g.add(edgeLine);
      }

      // Trees (L and R)
      for (const side of [-1, 1]) {
        const tree = this._makeTree();
        tree.position.set(side * (ROAD_W + 5 + Math.random() * 8), 0, (Math.random() - 0.5) * SEG_LEN * 0.7);
        g.add(tree);
      }

      this._worldGroup.add(g);
      this._segPool.push(g);

      this._segs.push({
        x:     accX,
        z:     -i * SEG_LEN,
        angle: accAngle,
        curve: curCurve,
      });

      // Advance curve
      curCurve += (Math.random() - 0.5) * CURVE_CHANGE * 2;
      curCurve  = Math.max(-MAX_CURVE, Math.min(MAX_CURVE, curCurve));
      accCurve += curCurve;
      accX     += Math.sin(accAngle) * SEG_LEN;
      accAngle += curCurve * SEG_LEN;
    }

    this._positionAllSegments();
  }

  _positionAllSegments() {
    for (let i = 0; i < NUM_SEGS; i++) {
      const seg  = this._segs[i];
      const mesh = this._segPool[i];
      mesh.position.set(seg.x, 0, seg.z);
      mesh.rotation.y = seg.angle;
      mesh.visible = i < VISIBLE_SEGS;
    }
  }

  _recycleOldestSegment() {
    // Pop front, push to back with new curve
    const front = this._segs[this._segs.length - 1];
    const last  = this._segs[0];
    const mesh  = this._segPool[0];

    const prevCurve = last.curve;
    const newCurve  = Math.max(-MAX_CURVE, Math.min(MAX_CURVE,
      prevCurve + (Math.random() - 0.5) * CURVE_CHANGE * 2));
    const newAngle  = last.angle + newCurve * SEG_LEN;
    const newX      = last.x + Math.sin(last.angle) * SEG_LEN;
    const newZ      = last.z - SEG_LEN;

    this._segs.shift();
    this._segPool.shift();

    const newSeg = { x: newX, z: newZ, angle: newAngle, curve: newCurve };
    this._segs.push(newSeg);
    this._segPool.push(mesh);

    mesh.position.set(newX, 0, newZ);
    mesh.rotation.y = newAngle;
    mesh.visible = true;

    // Maybe add obstacle
    const stride = Math.max(2, OBSTACLE_STRIDE - Math.floor(this._totalDist / 500));
    if (Math.random() < 1 / stride) {
      this._spawnObstacle(newSeg, mesh);
    }
  }

  // ── Obstacles ─────────────────────────────────────────────────────────────────

  _spawnObstacle(seg, parentMesh) {
    const types   = ['cone', 'barrier', 'truck'];
    const type    = types[Math.floor(Math.random() * types.length)];
    const laneX   = (Math.random() - 0.5) * (ROAD_W * 1.4);
    let mesh;

    if (type === 'cone') {
      mesh = this._makeCone();
    } else if (type === 'barrier') {
      mesh = this._makeBarrier();
    } else {
      mesh = this._makeTruck();
    }

    mesh.position.set(laneX, 0, 0);
    parentMesh.add(mesh);
    this._obstacles.push({ mesh, segGroup: parentMesh, type, laneX });
  }

  _clearObstaclesInMesh(parentMesh) {
    this._obstacles = this._obstacles.filter(o => {
      if (o.segGroup === parentMesh) {
        parentMesh.remove(o.mesh);
        return false;
      }
      return true;
    });
  }

  // ── Geometry helpers ──────────────────────────────────────────────────────────

  _makeCar() {
    const g = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.5, 3.2);
    g.add(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: COL.carBody })));

    // Roof / cab
    const roofGeo = new THREE.BoxGeometry(1.3, 0.4, 1.7);
    const roof    = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: COL.carRoof }));
    roof.position.set(0, 0.45, -0.2);
    g.add(roof);

    // Windscreen
    const wsGeo  = new THREE.BoxGeometry(1.25, 0.35, 0.05);
    const ws     = new THREE.Mesh(wsGeo, new THREE.MeshLambertMaterial({ color: COL.carGlass, transparent: true, opacity: 0.7 }));
    ws.position.set(0, 0.53, 0.64);
    g.add(ws);

    // Rear window
    const rw = ws.clone();
    rw.position.set(0, 0.53, -1.05);
    g.add(rw);

    // Wheels (4)
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14);
    const wMat = new THREE.MeshLambertMaterial({ color: COL.carWheel });
    const wheelPos = [
      [-0.9, -0.22,  1.1],
      [ 0.9, -0.22,  1.1],
      [-0.9, -0.22, -1.1],
      [ 0.9, -0.22, -1.1],
    ];
    for (const [x, y, z] of wheelPos) {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      g.add(w);
    }

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.3, 0.15, 0.05);
    const hlMat = new THREE.MeshBasicMaterial({ color: COL.carLight });
    for (const x of [-0.55, 0.55]) {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(x, 0.05, 1.63);
      g.add(hl);
    }

    return g;
  }

  _makeTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: COL.treeTrunk })
    );
    trunk.position.y = 0.7;
    g.add(trunk);
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + Math.random() * 0.5, 2.8 + Math.random(), 7),
      new THREE.MeshLambertMaterial({ color: COL.treeLeaf })
    );
    leaf.position.y = 2.8;
    g.add(leaf);
    return g;
  }

  _makeMountains() {
    const g = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const h = 20 + Math.random() * 30;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(15 + Math.random() * 10, h, 6),
        new THREE.MeshLambertMaterial({ color: COL.mountain })
      );
      m.position.set(-120 + i * 22 + Math.random() * 12, h / 2 - 4, -150);
      g.add(m);
    }
    return g;
  }

  _makeCone() {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 8),
      new THREE.MeshLambertMaterial({ color: COL.cone })
    );
    cone.position.y = 0.35;
    g.add(cone);
    // White stripe
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
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.55, 0.4),
      new THREE.MeshLambertMaterial({ color: COL.barrier })
    );
    b.position.y = 0.28;
    g.add(b);
    // Stripes
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.56, 0.42),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
      );
      s.position.set(-0.83 + i * 0.55, 0.28, 0);
      g.add(s);
    }
    return g;
  }

  _makeTruck() {
    const g = new THREE.Group();
    // Cab
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.6, 1.8),
      new THREE.MeshLambertMaterial({ color: COL.truck })
    );
    cab.position.set(0, 0.8, 1.5);
    g.add(cab);
    // Trailer
    const trailer = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.9, 5.0),
      new THREE.MeshLambertMaterial({ color: 0x556688 })
    );
    trailer.position.set(0, 0.95, -1.5);
    g.add(trailer);
    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.28, 10);
    const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const x of [-1.1, 1.1]) {
      for (const z of [1.5, 0.0, -1.5, -3.0]) {
        const w = new THREE.Mesh(wGeo, wMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.44, z);
        g.add(w);
      }
    }
    return g;
  }

  // ── Game flow ─────────────────────────────────────────────────────────────────

  _startGame() {
    this._score     = 0;
    this._totalDist = 0;
    this._speed     = SPEED_INIT;
    this._carX      = 0;
    this._carAngle  = 0;
    this._paused    = false;
    this._state     = 'playing';
    this._lastTs    = 0;

    // Clear all obstacles
    for (const o of this._obstacles) o.segGroup.remove(o.mesh);
    this._obstacles = [];

    // Reset road
    this._worldGroup.position.set(0, 0, 0);

    // Rebuild segments fresh with no curve at start
    for (const s of this._segs) { s.angle = 0; s.curve = 0; s.x = 0; }
    for (let i = 0; i < NUM_SEGS; i++) {
      this._segs[i].z    = -i * SEG_LEN;
      this._segs[i].x    = 0;
      this._segs[i].angle = 0;
      this._segs[i].curve = 0;
      this._segPool[i].position.set(0, 0, -i * SEG_LEN);
      this._segPool[i].rotation.y = 0;
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

    const metres    = Math.floor(this._totalDist);
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
    const metres = Math.floor(this._totalDist);
    this._ui.scoreEl.textContent = `${metres} m`;
    this._ui.bestEl.textContent  = `${t('best')}: ${this._best} m`;
    this._ui.speedEl.textContent = `${Math.round(this._speed * 3.6)} km/h`;
  }

  _showOverlay(type) {
    this._ui.overTitle.textContent  = type === 'start' ? t('racerName') : t('gameOver');
    this._ui.overScore.textContent  = type === 'start' ? t('racerSubtitle') : `${Math.floor(this._totalDist)} m`;
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

    if (!this._paused && this._state === 'playing') {
      this._update(dt);
    }
    this._renderFrame();
  }

  _update(dt) {
    // ── Read input ────────────────────────────────────────────────────────────
    let steerInput = 0;
    let accelInput = 0;

    if (this._hasGyro) {
      // gamma: negative = tilt left, positive = tilt right
      steerInput =  this._gamma / 30;   // ±30° = full steer
      // beta relative: holding at ~30° flat; tilt forward lowers beta
      accelInput = -(this._beta - 30) / 25; // ±25° from rest
    } else {
      if (this._keys.has('ArrowLeft')  || this._keys.has('a') || this._keys.has('A'))  steerInput = -1;
      if (this._keys.has('ArrowRight') || this._keys.has('d') || this._keys.has('D'))  steerInput =  1;
      if (this._keys.has('ArrowUp')    || this._keys.has('w') || this._keys.has('W'))  accelInput =  1;
      if (this._keys.has('ArrowDown')  || this._keys.has('s') || this._keys.has('S'))  accelInput = -1;
    }

    steerInput = Math.max(-1, Math.min(1, steerInput));
    accelInput = Math.max(-1, Math.min(1, accelInput));

    // ── Speed ─────────────────────────────────────────────────────────────────
    if (accelInput > 0.1) {
      this._speed += SPEED_ACCEL * accelInput * dt;
    } else if (accelInput < -0.1) {
      this._speed -= SPEED_BRAKE * Math.abs(accelInput) * dt;
    } else {
      this._speed -= SPEED_COAST * dt;
    }

    // Off-road friction
    const onRoad = Math.abs(this._carX) < ROAD_W - 0.5;
    if (!onRoad) this._speed -= GRASS_FRICTION * dt;

    this._speed = Math.max(0, Math.min(SPEED_MAX, this._speed));
    if (this._speed < 0.5 && accelInput <= 0) this._speed = 0;

    // ── Steering ──────────────────────────────────────────────────────────────
    // Steer rate proportional to speed (slow turns at low speed, fast at high)
    const sr = STEER_RATE * (0.3 + 0.7 * this._speed / SPEED_MAX);
    this._carX     += steerInput * sr * dt * (this._speed / 15 + 0.5);
    this._carAngle  = steerInput * 0.18; // visual yaw

    // Road follows curve — shift car world X with road curvature
    const seg     = this._currentSeg();
    if (seg) this._carX -= Math.sin(seg.curve * this._speed * dt) * this._speed * dt * 0.9;

    // ── Distance / score ──────────────────────────────────────────────────────
    this._totalDist += this._speed * dt;

    // ── Crash detection ───────────────────────────────────────────────────────
    if (Math.abs(this._carX) > CAR_MAX_OFFSET + 1.5) {
      this._endGame(); return;
    }

    // Obstacle collision  
    if (this._checkObstacleHit()) {
      this._endGame(); return;
    }

    // ── Scroll world ──────────────────────────────────────────────────────────
    const worldZ = (this._totalDist % SEG_LEN);
    this._worldGroup.position.z = worldZ;

    // Recycle oldest segment when we've driven one segment length
    const prevIdx = Math.floor((this._totalDist - this._speed * dt) / SEG_LEN);
    const curIdx  = Math.floor(this._totalDist / SEG_LEN);
    if (curIdx > prevIdx) {
      this._clearObstaclesInMesh(this._segPool[0]);
      this._recycleOldestSegment();
    }

    this._updateHUD();
  }

  _currentSeg() {
    return this._segs.length > 2 ? this._segs[1] : null;
  }

  _checkObstacleHit() {
    // Car is always at world position (carX, 0, -SEG_LEN) relative to world group
    // Obstacles live in their segment group. Approx collision: check first 3 segs
    for (const o of this._obstacles) {
      // Find which segment the obstacle is in
      const segIdx = this._segPool.indexOf(o.segGroup);
      if (segIdx < 0 || segIdx > 3) continue;

      // World X of obstacle  ≈  seg.x + o.laneX
      const seg = this._segs[segIdx];
      if (!seg) continue;
      const obsWorldX = seg.x + Math.cos(seg.angle) * o.laneX;
      const dx = Math.abs(this._carX - obsWorldX);

      // Z overlap: obstacle is in segment covering z [seg.z, seg.z+SEG_LEN]
      // Car is at z ≈ -SEG_LEN in world group coords offset by worldGroup.position.z
      if (segIdx === 1 && dx < (o.type === 'truck' ? 1.8 : 1.0)) return true;
    }
    return false;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  _renderFrame() {
    if (!this._renderer) return;

    // Car group position
    const carZ = -SEG_LEN * 1.05;
    this._carGroup.position.set(
      this._carX + (this._segs[1]?.x || 0),
      0.26,
      carZ + this._worldGroup.position.z - SEG_LEN
    );
    this._carGroup.rotation.y = this._carAngle + (this._segs[1]?.angle || 0);

    // Chase camera
    const cx  = this._carGroup.position.x;
    const cz  = this._carGroup.position.z;
    const ang = this._carGroup.rotation.y;
    const camDist   = 7.5;
    const camHeight = 3.8;
    this._camera.position.set(
      cx - Math.sin(ang) * camDist,
      camHeight,
      cz + Math.cos(ang) * camDist
    );
    this._camera.lookAt(cx + Math.sin(ang) * 6, 0.8, cz - Math.cos(ang) * 6);

    this._renderer.render(this._scene, this._camera);
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

  _bindInput() {
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
