/**
 * Tower of Obby 3D - Full Engine & Game Logic
 * Compatible with Playgama Bridge & Standalone WebGL
 */

(function () {
  'use strict';

  // --- 1. AUDIO SYNTHESIZER (Web Audio API) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.init();
    }

    init() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      } catch (e) {
        console.warn('Web Audio not supported', e);
      }
    }

    ensureContext() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    playJump() {
      if (this.muted || !this.ctx) return;
      this.ensureContext();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    playBounce() {
      if (this.muted || !this.ctx) return;
      this.ensureContext();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.25);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    playCoin() {
      if (this.muted || !this.ctx) return;
      this.ensureContext();
      const now = this.ctx.currentTime;
      [880, 1320].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.15);
      });
    }

    playCheckpoint() {
      if (this.muted || !this.ctx) return;
      this.ensureContext();
      const notes = [440, 554.37, 659.25, 880];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.22, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.25);
      });
    }

    playLava() {
      if (this.muted || !this.ctx) return;
      this.ensureContext();
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    }

    playWin() {
      if (this.muted || !this.ctx) return;
      this.ensureContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.3, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.6);
      });
    }
  }

  // --- 2. PLAYGAMA BRIDGE INTEGRATION ---
  class BridgeWrapper {
    constructor(game) {
      this.game = game;
      this.bridge = window.bridge || null;
      this.isReady = false;
      this.init();
    }

    async init() {
      if (window.bridge) {
        try {
          await window.bridge.initialize();
          this.isReady = true;
          window.bridge.platform.sendMessage('game_ready');
          console.log('[Playgama Bridge] Initialized successfully');
          this.loadProgress();
        } catch (e) {
          console.warn('[Playgama Bridge] Init failed, running in standalone mode', e);
        }
      } else {
        console.log('[Playgama Bridge] Standalone mode (no bridge detected)');
      }
    }

    showSkipAd(onSuccess) {
      if (this.isReady && window.bridge && window.bridge.advertisement) {
        window.bridge.advertisement.showRewarded({
          placement: 'skip_floor',
          onSuccess: () => {
            onSuccess();
          },
          onError: () => {
            // Fallback: still grant reward on error in dev/test
            onSuccess();
          }
        });
      } else {
        // Fallback for standalone/local test
        onSuccess();
      }
    }

    showWinAd() {
      if (this.isReady && window.bridge && window.bridge.advertisement) {
        window.bridge.advertisement.showInterstitial({ placement: 'game_win' });
      }
    }

    async saveProgress(bestTime, coins) {
      try {
        localStorage.setItem('tower_best_time', bestTime.toString());
        localStorage.setItem('tower_coins', coins.toString());
        if (this.isReady && window.bridge && window.bridge.storage) {
          await window.bridge.storage.set({
            tower_best_time: bestTime,
            tower_coins: coins
          });
        }
      } catch (e) {
        console.warn('Failed saving progress', e);
      }
    }

    loadProgress() {
      try {
        const localBest = localStorage.getItem('tower_best_time');
        const localCoins = localStorage.getItem('tower_coins');
        if (localBest) this.game.bestTime = parseFloat(localBest);
        if (localCoins) this.game.coins = parseInt(localCoins, 10);
      } catch (e) {}
    }
  }

  // --- 3. CHARACTER 3D MODEL & RIG ---
  class CharacterRig {
    constructor() {
      this.group = new THREE.Group();

      // Materials
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
      const shirtMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
      const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const shoeMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
      const hairMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.65, 0.75, 0.35);
      this.torso = new THREE.Mesh(torsoGeo, shirtMat);
      this.torso.position.y = 0.95;
      this.torso.castShadow = true;
      this.group.add(this.torso);

      // Head
      const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
      this.head = new THREE.Mesh(headGeo, skinMat);
      this.head.position.y = 0.65;
      this.torso.add(this.head);

      // Hair
      const hairGeo = new THREE.BoxGeometry(0.52, 0.2, 0.52);
      this.hair = new THREE.Mesh(hairGeo, hairMat);
      this.hair.position.y = 0.26;
      this.head.add(this.hair);

      // Visor / Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.04);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.13, 0.05, 0.24);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.13, 0.05, 0.24);
      this.head.add(leftEye, rightEye);

      // Limbs helper
      const createLimb = (w, h, d, mat, ox, oy, oz) => {
        const pivot = new THREE.Group();
        pivot.position.set(ox, oy, oz);
        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(0, -h / 2, 0);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        pivot.add(mesh);
        return pivot;
      };

      // Arms
      this.leftArm = createLimb(0.2, 0.65, 0.2, skinMat, -0.45, 0.32, 0);
      this.rightArm = createLimb(0.2, 0.65, 0.2, skinMat, 0.45, 0.32, 0);
      this.torso.add(this.leftArm, this.rightArm);

      // Legs
      this.leftLeg = createLimb(0.26, 0.65, 0.26, pantsMat, -0.18, -0.37, 0);
      this.rightLeg = createLimb(0.26, 0.65, 0.26, pantsMat, 0.18, -0.37, 0);
      this.torso.add(this.leftLeg, this.rightLeg);

      // Shoes
      const shoeGeo = new THREE.BoxGeometry(0.28, 0.16, 0.34);
      shoeGeo.translate(0, -0.08, 0.04);
      const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
      leftShoe.position.y = -0.65;
      this.leftLeg.children[0].add(leftShoe);
      const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
      rightShoe.position.y = -0.65;
      this.rightLeg.children[0].add(rightShoe);

      this.animTime = 0;
    }

    updateAnimation(speed, isGrounded, dt) {
      if (isGrounded && speed > 0.1) {
        this.animTime += dt * speed * 1.6;
        const swing = Math.sin(this.animTime) * 0.75;
        this.leftArm.rotation.x = swing;
        this.rightArm.rotation.x = -swing;
        this.leftLeg.rotation.x = -swing;
        this.rightLeg.rotation.x = swing;
        this.torso.position.y = 0.95 + Math.abs(Math.sin(this.animTime * 2)) * 0.07;
      } else if (!isGrounded) {
        // Jumping pose
        this.leftArm.rotation.x = -1.2;
        this.rightArm.rotation.x = -1.2;
        this.leftLeg.rotation.x = 0.4;
        this.rightLeg.rotation.x = -0.3;
        this.torso.position.y = 0.95;
      } else {
        // Idle
        this.leftArm.rotation.x *= 0.85;
        this.rightArm.rotation.x *= 0.85;
        this.leftLeg.rotation.x *= 0.85;
        this.rightLeg.rotation.x *= 0.85;
        this.torso.position.y = 0.95;
      }
    }
  }

  // --- 4. GAME ENGINE & STAGES BUILDER ---
  class TowerGame {
    constructor() {
      this.canvas = document.getElementById('canvas3d');
      this.sound = new SoundManager();
      this.bridge = new BridgeWrapper(this);

      // Game state
      this.currentFloor = 1;
      this.maxFloor = 20;
      this.startTime = Date.now();
      this.timerRunning = true;
      this.bestTime = null;
      this.coins = 0;
      this.deaths = 0;
      this.isWon = false;

      // Physics player state
      this.playerPos = new THREE.Vector3(0, 1.2, 8);
      this.playerVel = new THREE.Vector3(0, 0, 0);
      this.isGrounded = false;
      this.groundFriction = 0.82;
      this.currentGround = null;

      // Camera state
      this.cameraYaw = Math.PI;
      this.cameraPitch = 0.25;
      this.cameraDist = 5.2;

      // Controls state
      this.keys = {};
      this.joystick = { x: 0, y: 0, active: false };
      this.isMouseDown = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.manualExitedFullscreen = false;

      // World objects
      this.platforms = [];
      this.hazards = [];
      this.launchPads = [];
      this.vanishingBlocks = [];
      this.movingPlatforms = [];
      this.spinningBeams = [];
      this.laserFences = [];
      this.pulsingLasers = this.laserFences;
      this.coinsObjects = [];
      this.checkpoints = [];

      this.initThree();
      this.buildTower();
      this.initControls();
      this.initUI();
      this.respawn(1);

      this.lastFrameTime = performance.now();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    initThree() {
      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0d1322);
      this.scene.fog = new THREE.FogExp2(0x0d1322, 0.008);

      // Camera
      this.camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.1,
        350
      );

      // Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Lights
      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.7);
      this.scene.add(hemiLight);

      this.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
      this.dirLight.position.set(25, 60, 25);
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 160;
      this.dirLight.shadow.camera.left = -25;
      this.dirLight.shadow.camera.right = 25;
      this.dirLight.shadow.camera.top = 25;
      this.dirLight.shadow.camera.bottom = -25;
      this.scene.add(this.dirLight);

      // Character Rig
      this.character = new CharacterRig();
      this.scene.add(this.character.group);

      // Window resize & orientation change across all browser APIs
      try {
        const onResize = () => {
          this.triggerMultiPassResize();
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', () => {
          // Physical rotation of device: ensure orientation is unlocked so sensors read freely!
          this.unlockOrientation();
          this.triggerMultiPassResize();
        });
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') {
          window.screen.orientation.addEventListener('change', onResize);
        }
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', onResize);
        }
      } catch (err) {
        console.warn('Orientation listener setup notice:', err);
      }
    }

    // --- LEVEL GENERATION (20 FLOORS IN STRICT DIFFICULTY PROGRESSION) ---
    buildTower() {
      const FLOOR_HEIGHT = 9.2;
      const TOWER_RADIUS = 10.5;
      const OBSTACLES_PER_FLOOR = 7;
      const TOTAL_STEPS_PER_FLOOR = OBSTACLES_PER_FLOOR + 1; // 8 steps per floor
      const ANGLE_STEP = 0.38; // radians per step (~21.8 degrees)
      const HEIGHT_STEP = FLOOR_HEIGHT / TOTAL_STEPS_PER_FLOOR; // 1.15m per step

      // Tower Outer Frame (Stylized semi-transparent pillars for full 20 floors height)
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 220, 12);
      const pillarMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(Math.cos(angle) * (TOWER_RADIUS + 4.5), 105, Math.sin(angle) * (TOWER_RADIUS + 4.5));
        this.scene.add(p);
      }

      // Base bottom floor (Lava abyss at bottom)
      const abyssGeo = new THREE.CircleGeometry(TOWER_RADIUS + 14, 32);
      const abyssMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const abyss = new THREE.Mesh(abyssGeo, abyssMat);
      abyss.rotation.x = -Math.PI / 2;
      abyss.position.y = -2;
      this.scene.add(abyss);
      this.addHazard(new THREE.Vector3(0, -1, 0), new THREE.Vector3(60, 1.5, 60));

      // Floor themes definition (20 floors in strictly ascending difficulty)
      const floorThemes = [
        // --- Tier 1: Базовый паркур (Этажи 1–4) ---
        { name: 'Первые шаги', color: 0x22c55e, type: 'basic' },
        { name: 'Парящие диски', color: 0x059669, type: 'discs' },
        { name: 'Лавовые полосы', color: 0xeab308, type: 'lava' },
        { name: 'Лавовый крест', color: 0xf59e0b, type: 'lava_cross' },

        // --- Tier 2: Исчезновение и Скольжение (Этажи 5–8) ---
        { name: 'Хрупкий мост', color: 0xf97316, type: 'vanishing' },
        { name: 'Быстрый распад', color: 0xe11d48, type: 'fast_vanishing' },
        { name: 'Ледяные дорожки', color: 0x38bdf8, type: 'ice' },
        { name: 'Лед и лава', color: 0x0284c7, type: 'ice_lava' },

        // --- Tier 3: Прыжки и Движение (Этажи 9–12) ---
        { name: 'Прыжковые батуты', color: 0xa855f7, type: 'bouncers' },
        { name: 'Супер-батуты', color: 0x9333ea, type: 'high_bouncers' },
        { name: 'Живые платформы', color: 0x06b6d4, type: 'moving' },
        { name: 'Встречный дрифт', color: 0x0891b2, type: 'fast_moving' },

        // --- Tier 4: Точность и Лазеры (Этажи 13–16) ---
        { name: 'Узкие тропы', color: 0x6366f1, type: 'narrow_beam' },
        { name: 'Микро-столбики', color: 0x4f46e5, type: 'micro_columns' },
        { name: 'Лазерные барьеры', color: 0xec4899, type: 'lasers' },
        { name: 'Бегущие лазеры', color: 0xdb2777, type: 'fast_lasers' },

        // --- Tier 5: Экстремальный хардкор (Этажи 17–20) ---
        { name: 'Вращающийся луч', color: 0xef4444, type: 'spinner' },
        { name: 'Двойные спиннеры', color: 0xdc2626, type: 'fast_spinner' },
        { name: 'Хрупкие лучи', color: 0xb91c1c, type: 'vanishing_spinner' },
        { name: 'Корона Башни', color: 0xfacc15, type: 'summit_rush' }
      ];

      for (let floorIdx = 0; floorIdx < 20; floorIdx++) {
        const floorNum = floorIdx + 1;
        const theme = floorThemes[floorIdx];
        const globalStep = floorIdx * TOTAL_STEPS_PER_FLOOR;
        const cpAngle = globalStep * ANGLE_STEP;
        const cpY = globalStep * HEIGHT_STEP;
        const checkPos = new THREE.Vector3(
          Math.cos(cpAngle) * TOWER_RADIUS,
          cpY,
          Math.sin(cpAngle) * TOWER_RADIUS
        );

        this.checkpoints[floorIdx] = {
          floor: floorNum,
          name: theme.name,
          pos: checkPos.clone().add(new THREE.Vector3(0, 0.45, 0))
        };

        // Checkpoint Pad Mesh (Wide, comfortable landing zone: 4.8 x 0.8 x 4.8)
        this.addPlatform(
          checkPos,
          new THREE.Vector3(4.8, 0.8, 4.8),
          theme.color,
          false,
          `checkpoint_${floorNum}`
        );

        // Checkpoint Arch / Visual Gateway
        this.createCheckpointArch(checkPos, theme.color, floorNum, theme.name, cpAngle);

        // Add Coin on the Checkpoint platform
        this.createCoin(checkPos.clone().add(new THREE.Vector3(0, 1.6, 0)));

        // Generate Stage Obstacles leading directly to the next floor
        this.buildStageObstacles(
          floorIdx,
          globalStep,
          theme,
          TOWER_RADIUS,
          ANGLE_STEP,
          HEIGHT_STEP,
          OBSTACLES_PER_FLOOR
        );
      }

      // Summit on top of Floor 20 (at globalStep = 20 * 8 = 160)
      const summitStep = 20 * TOTAL_STEPS_PER_FLOOR;
      const summitAngle = summitStep * ANGLE_STEP;
      const summitY = summitStep * HEIGHT_STEP;
      const summitPos = new THREE.Vector3(
        Math.cos(summitAngle) * TOWER_RADIUS,
        summitY,
        Math.sin(summitAngle) * TOWER_RADIUS
      );
      this.createSummitTrophy(summitPos);
    }

    createCheckpointArch(pos, colorHex, floorNum, themeName, cpAngle) {
      const archGroup = new THREE.Group();
      archGroup.position.copy(pos);
      archGroup.rotation.y = -cpAngle;

      // Pillars
      const pillarGeo = new THREE.BoxGeometry(0.35, 3.8, 0.35);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-2.0, 1.9, 0);
      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(2.0, 1.9, 0);

      // Neon Top Beam
      const beamGeo = new THREE.BoxGeometry(4.4, 0.45, 0.45);
      const beamMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.6
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 3.8, 0);

      // Glowing Landing Disc on floor
      const ringGeo = new THREE.RingGeometry(1.2, 1.7, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.42, 0);

      // Directional arrow on the floor indicating path forward
      const arrowGeo = new THREE.ConeGeometry(0.3, 0.8, 3);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = Math.PI / 2;
      arrow.position.set(0, 0.42, 1.2);

      archGroup.add(leftPillar, rightPillar, beam, ring, arrow);
      this.scene.add(archGroup);
    }

    createCoin(pos) {
      const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.8,
        roughness: 0.2
      });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.rotation.x = Math.PI / 2;
      coin.position.copy(pos);
      coin.castShadow = true;
      this.scene.add(coin);
      this.coinsObjects.push({ mesh: coin, collected: false, startY: pos.y });
    }

    buildStageObstacles(
      floorIdx,
      globalStep,
      theme,
      radius,
      angleStep,
      heightStep,
      obstaclesCount
    ) {
      for (let i = 1; i <= obstaclesCount; i++) {
        const curStep = globalStep + i;
        const curAngle = curStep * angleStep;
        const y = curStep * heightStep;
        const px = Math.cos(curAngle) * radius;
        const pz = Math.sin(curAngle) * radius;
        const pos = new THREE.Vector3(px, y, pz);

        const nextStep = curStep + 1;
        const nextAngle = nextStep * angleStep;
        const nextPx = Math.cos(nextAngle) * radius;
        const nextPz = Math.sin(nextAngle) * radius;
        const forwardDir = new THREE.Vector3(nextPx - px, 0, nextPz - pz).normalize();

        if (i === 4) {
          // Extra coin on midway of the stage
          this.createCoin(pos.clone().add(new THREE.Vector3(0, 1.4, 0)));
        }

        switch (theme.type) {
          case 'basic': {
            // Gentle solid step platforms
            this.addPlatform(pos, new THREE.Vector3(2.8, 0.6, 2.8), 0x22c55e);
            break;
          }

          case 'discs': {
            // Floating round stepping discs in a dynamic zig-zag path
            const radOffset = (i % 2 === 1) ? 1.0 : -0.9;
            const discRad = radius + radOffset;
            const discPx = Math.cos(curAngle) * discRad;
            const discPz = Math.sin(curAngle) * discRad;
            const discHeightOffset = (i % 2 === 1) ? 0.25 : -0.15;
            const discPos = new THREE.Vector3(discPx, y + discHeightOffset, discPz);
            this.addCylinderPlatform(discPos, 1.35, 0.5, 0x059669);
            break;
          }

          case 'lava': {
            // Platform with red hot lava stripe in center on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.6, 2.4), 0x475569);
            const hazardPos = pos.clone().add(new THREE.Vector3(0, 0.35, 0));
            this.addHazard(hazardPos, new THREE.Vector3(0.65, 0.25, 2.3));
            break;
          }

          case 'lava_cross': {
            // Platform with a prominent glowing lava cross '+' on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(3.6, 0.6, 3.6), 0x1e293b);
            const crossCenter = pos.clone().add(new THREE.Vector3(0, 0.36, 0));
            // Arm 1 (along X)
            this.addHazard(crossCenter, new THREE.Vector3(3.5, 0.32, 0.75), 0xff1100);
            // Arm 2 (along Z)
            this.addHazard(crossCenter, new THREE.Vector3(0.75, 0.32, 3.5), 0xff1100);
            // Glowing fiery yellow core in intersection
            const coreGeo = new THREE.BoxGeometry(0.8, 0.35, 0.8);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
            const coreMesh = new THREE.Mesh(coreGeo, coreMat);
            coreMesh.position.copy(crossCenter);
            this.scene.add(coreMesh);
            break;
          }

          case 'vanishing': {
            // Disappearing orange platforms on EVERY platform
            this.addVanishingBlock(pos, new THREE.Vector3(2.5, 0.5, 2.5), 0xf97316, 0.8, 2200);
            break;
          }

          case 'fast_vanishing': {
            // Fast disappearing platforms on EVERY platform
            this.addVanishingBlock(pos, new THREE.Vector3(2.2, 0.5, 2.2), 0xe11d48, 0.55, 2400);
            break;
          }

          case 'ice': {
            // Low friction slippery ice blocks on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(2.7, 0.5, 2.7), 0x7dd3fc, true);
            break;
          }

          case 'ice_lava': {
            // Slippery ice with lethal lava hazard on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.5, 2.4), 0x0284c7, true);
            const hazardPos = pos.clone().add(new THREE.Vector3(0, 0.32, 0));
            this.addHazard(hazardPos, new THREE.Vector3(0.6, 0.25, 2.3));
            break;
          }

          case 'bouncers': {
            // Launch pads on EVERY platform - chained jumping
            this.addLaunchPad(pos, new THREE.Vector3(2.5, 0.6, 2.5), 21.0);
            break;
          }

          case 'high_bouncers': {
            // High spring launch pads on EVERY platform
            this.addLaunchPad(pos, new THREE.Vector3(2.2, 0.6, 2.2), 24.5);
            break;
          }

          case 'moving': {
            // Platforms gliding horizontally on EVERY platform
            this.addMovingPlatform(pos, new THREE.Vector3(2.5, 0.6, 2.5), 0x06b6d4, curAngle, 2.0, 1.4);
            break;
          }

          case 'fast_moving': {
            // Fast opposing moving platforms on EVERY platform
            const phase = curAngle + (i % 2) * Math.PI;
            this.addMovingPlatform(pos, new THREE.Vector3(2.3, 0.6, 2.3), 0x0891b2, phase, 2.6, 2.2);
            break;
          }

          case 'narrow_beam': {
            // Narrow balance beams on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(1.1, 0.5, 3.2), 0x6366f1);
            break;
          }

          case 'micro_columns': {
            // Small columns requiring exact landing on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(1.4, 0.6, 1.4), 0x4f46e5);
            break;
          }

          case 'lasers': {
            // Full-fledged laser fence hurdle across EVERY platform
            this.addPlatform(pos, new THREE.Vector3(3.0, 0.6, 3.0), 0x334155);
            this.addLaserFence(pos, 2.7, 0.85, forwardDir, 0, 0);
            break;
          }

          case 'fast_lasers': {
            // Fast rhythmic laser fence hurdles on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(2.8, 0.6, 2.8), 0x1e293b);
            this.addLaserFence(pos, 2.5, 0.92, forwardDir, 1.2, (i % 3) * 0.4);
            break;
          }

          case 'spinner': {
            // Rotating lethal beam on EVERY platform (shin height hurdle)
            this.addPlatform(pos, new THREE.Vector3(3.4, 0.6, 3.4), 0x334155);
            this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.52, 0)), 3.2, 1.6);
            break;
          }

          case 'fast_spinner': {
            // Fast rotating beam on EVERY platform
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.6, 3.2), 0x1e293b);
            this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.52, 0)), 3.0, 2.2);
            break;
          }

          case 'vanishing_spinner': {
            // Disappearing platform + rotating beam on EVERY platform
            this.addVanishingBlock(pos, new THREE.Vector3(3.2, 0.5, 3.2), 0xd97706, 0.9, 2400);
            this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.47, 0)), 3.0, 1.9);
            break;
          }

          case 'summit_rush': {
            // Grand finale gauntlet leading to the Golden Crown
            if (i === 1) this.addPlatform(pos, new THREE.Vector3(2.6, 0.6, 2.6), 0xfacc15);
            else if (i === 2) this.addVanishingBlock(pos, new THREE.Vector3(2.4, 0.5, 2.4), 0xfacc15, 0.7);
            else if (i === 3) this.addLaunchPad(pos, new THREE.Vector3(2.4, 0.6, 2.4), 21.0);
            else if (i === 4) this.addMovingPlatform(pos, new THREE.Vector3(2.5, 0.6, 2.5), 0xfacc15, curAngle, 2.4, 2.0);
            else if (i === 5) {
              this.addPlatform(pos, new THREE.Vector3(2.8, 0.6, 2.8), 0x334155);
              this.addLaserFence(pos, 2.5, 0.90, forwardDir, 1.3, 0);
            } else if (i === 6) {
              this.addPlatform(pos, new THREE.Vector3(3.2, 0.6, 3.2), 0x334155);
              this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.52, 0)), 3.0, 2.2);
            } else {
              // Super bounce catapulting onto Summit!
              this.addLaunchPad(pos, new THREE.Vector3(2.8, 0.6, 2.8), 24.0);
            }
            break;
          }
        }
      }
    }

    createSummitTrophy(summitPos) {
      // Huge Golden Summit Platform
      this.addPlatform(summitPos, new THREE.Vector3(7.5, 1.2, 7.5), 0xfacc15, false, 'summit_pad');

      // Giant Golden Trophy Mesh
      this.trophyGroup = new THREE.Group();
      this.trophyGroup.position.set(summitPos.x, summitPos.y + 1.2, summitPos.z);

      const baseGeo = new THREE.CylinderGeometry(0.8, 1.1, 0.5, 16);
      const cupGeo = new THREE.CylinderGeometry(1.2, 0.5, 1.6, 16);
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x854d0e,
        emissiveIntensity: 0.3
      });

      const base = new THREE.Mesh(baseGeo, goldMat);
      const cup = new THREE.Mesh(cupGeo, goldMat);
      cup.position.y = 1.0;
      this.trophyGroup.add(base, cup);
      this.scene.add(this.trophyGroup);

      // Confetti emitter container
      this.confettiParticles = [];
      const confGeo = new THREE.PlaneGeometry(0.2, 0.2);
      const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xfacc15, 0xec4899];
      for (let i = 0; i < 70; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          side: THREE.DoubleSide
        });
        const p = new THREE.Mesh(confGeo, mat);
        p.position.set(
          summitPos.x + (Math.random() - 0.5) * 6,
          summitPos.y + 2 + Math.random() * 5,
          summitPos.z + (Math.random() - 0.5) * 6
        );
        p.visible = false;
        p.userData = {
          vy: Math.random() * -0.05 - 0.02,
          rotSpeed: Math.random() * 0.1 - 0.05,
          baseY: summitPos.y
        };
        this.scene.add(p);
        this.confettiParticles.push(p);
      }
    }

    // --- PLATFORM & HAZARD HELPERS ---
    addPlatform(pos, size, colorHex, isIce = false, tag = '') {
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: isIce ? 0.05 : 0.6,
        metalness: isIce ? 0.4 : 0.1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);

      const plat = {
        mesh,
        pos,
        size,
        min: new THREE.Vector3(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2),
        max: new THREE.Vector3(pos.x + size.x / 2, pos.y + size.y / 2, pos.z + size.z / 2),
        isIce,
        tag
      };
      this.platforms.push(plat);
      return plat;
    }

    addCylinderPlatform(pos, radius, height, colorHex, tag = '') {
      const geo = new THREE.CylinderGeometry(radius, radius * 1.05, height, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.35,
        metalness: 0.25
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);

      // Decorative glowing neon mint rim
      const rimGeo = new THREE.RingGeometry(radius * 0.72, radius * 0.95, 24);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7, side: THREE.DoubleSide });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(pos.x, pos.y + height / 2 + 0.02, pos.z);
      this.scene.add(rim);

      // Central white beacon dot
      const dotGeo = new THREE.CircleGeometry(0.25, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(pos.x, pos.y + height / 2 + 0.03, pos.z);
      this.scene.add(dot);

      const size = new THREE.Vector3(radius * 2, height, radius * 2);
      const plat = {
        mesh,
        pos,
        size,
        min: new THREE.Vector3(pos.x - radius, pos.y - height / 2, pos.z - radius),
        max: new THREE.Vector3(pos.x + radius, pos.y + height / 2, pos.z + radius),
        isIce: false,
        tag
      };
      this.platforms.push(plat);
      return plat;
    }

    addHazard(pos, size, colorHex = 0xff0000) {
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      this.hazards.push({
        mesh,
        min: new THREE.Vector3(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2),
        max: new THREE.Vector3(pos.x + size.x / 2, pos.y + size.y / 2, pos.z + size.z / 2)
      });
    }

    addLaunchPad(pos, size, force = 24) {
      const plat = this.addPlatform(pos, size, 0xd946ef);
      // Glowing spring marker
      const markerGeo = new THREE.CylinderGeometry(size.x * 0.35, size.x * 0.35, 0.1, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xfdf4ff });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(pos.x, pos.y + size.y / 2 + 0.06, pos.z);
      this.scene.add(marker);

      this.launchPads.push({
        pos,
        size,
        force,
        min: plat.min,
        max: plat.max
      });
    }

    addVanishingBlock(pos, size, colorHex, vanishDelay = 0.75, reappearDelay = 2200) {
      const plat = this.addPlatform(pos, size, colorHex);
      plat.mesh.material.transparent = true;
      plat.mesh.material.opacity = 1;

      this.vanishingBlocks.push({
        plat,
        stepped: false,
        steppedTime: 0,
        active: true,
        reappearTime: 0,
        vanishDelay,
        reappearDelay
      });
    }

    addSpinningBeam(pos, length, speed = 1.8) {
      const group = new THREE.Group();
      group.position.copy(pos);
      this.scene.add(group);

      // Central Hub / Base
      const hubGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.45, 16);
      const hubMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25
      });
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.castShadow = true;
      group.add(hub);

      // Warning beacon light on hub
      const lightGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.y = 0.26;
      group.add(light);

      // Rotating Hazard Bar along local X axis!
      const barGeo = new THREE.BoxGeometry(length, 0.24, 0.24);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        metalness: 0.6,
        roughness: 0.2
      });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.castShadow = true;
      group.add(barMesh);

      // Glowing laser tip caps at ±length/2
      const capGeo = new THREE.BoxGeometry(0.15, 0.28, 0.28);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const cap1 = new THREE.Mesh(capGeo, capMat);
      cap1.position.set(-length / 2, 0, 0);
      group.add(cap1);
      const cap2 = new THREE.Mesh(capGeo, capMat);
      cap2.position.set(length / 2, 0, 0);
      group.add(cap2);

      const initialAngle = Math.random() * Math.PI * 2;
      group.rotation.y = initialAngle;

      const beamObj = {
        group,
        pos,
        length,
        speed,
        angle: initialAngle
      };
      this.spinningBeams.push(beamObj);
      return beamObj;
    }

    addMovingPlatform(pos, size, colorHex, angleOffset, amplitude = 2.2, speed = 1.6) {
      const plat = this.addPlatform(pos, size, colorHex);
      this.movingPlatforms.push({
        plat,
        origin: pos.clone(),
        amplitude,
        speed,
        phase: angleOffset,
        lastOffset: new THREE.Vector3()
      });
    }

    addLaserFence(pos, width, height = 0.9, forwardDir = null, interval = 0, initialOffset = 0) {
      const group = new THREE.Group();
      group.position.copy(pos);
      if (forwardDir && forwardDir.isVector3) {
        group.lookAt(pos.x + forwardDir.x, pos.y, pos.z + forwardDir.z);
      } else if (typeof forwardDir === 'number') {
        group.rotation.y = forwardDir;
      }
      group.updateMatrixWorld(true);
      this.scene.add(group);

      // Platform top is at local Y = +0.3 (since platform is 0.6 thick centered at pos.y)
      const floorY = 0.3;
      const halfW = width / 2;

      // 1. Sturdy Side Posts (Metallic emitter pillars)
      const postRadius = 0.09;
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius * 1.2, height, 16);
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25
      });

      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-halfW + postRadius, floorY + height / 2, 0);
      leftPost.castShadow = true;
      group.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(halfW - postRadius, floorY + height / 2, 0);
      rightPost.castShadow = true;
      group.add(rightPost);

      // Glowing beacon caps on top of posts
      const capGeo = new THREE.SphereGeometry(0.12, 14, 14);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
      const leftCap = new THREE.Mesh(capGeo, capMat);
      leftCap.position.set(-halfW + postRadius, floorY + height + 0.04, 0);
      group.add(leftCap);

      const rightCap = new THREE.Mesh(capGeo, capMat);
      rightCap.position.set(halfW - postRadius, floorY + height + 0.04, 0);
      group.add(rightCap);

      // 2. Horizontal Glowing Laser Rails (3 bars forming the fence barrier)
      const beamSpan = width - postRadius * 4;
      const railGeo = new THREE.BoxGeometry(beamSpan, 0.08, 0.08);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0xff0055,
        transparent: true,
        opacity: 0.95
      });

      const railMeshes = [];
      const railHeights = [0.22, 0.55, 0.88];
      for (let r = 0; r < railHeights.length; r++) {
        const rail = new THREE.Mesh(railGeo, laserMat.clone());
        rail.position.set(0, floorY + height * railHeights[r], 0);
        group.add(rail);
        railMeshes.push(rail);
      }

      // 3. Glowing Translucent Energy Grid Mesh between posts
      const gridGeo = new THREE.PlaneGeometry(beamSpan, height * 0.88);
      const gridMat = new THREE.MeshBasicMaterial({
        color: 0xff0077,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const gridMesh = new THREE.Mesh(gridGeo, gridMat);
      gridMesh.position.set(0, floorY + height * 0.55, 0);
      group.add(gridMesh);

      const fenceObj = {
        group,
        pos,
        width,
        height,
        angle,
        floorY: pos.y + floorY,
        topY: pos.y + floorY + height,
        interval,
        timer: initialOffset,
        state: 'on',
        railMeshes,
        gridMesh,
        capMat
      };
      this.laserFences.push(fenceObj);
      return fenceObj;
    }

    addPulsingLaser(pos, width, interval = 1.4, initialOffset = 0, angle = 0) {
      return this.addLaserFence(pos, width, 0.9, angle, interval, initialOffset);
    }

    // --- 5. INPUT & CONTROLS ---
    initControls() {
      // Keyboard
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
        if (e.code === 'KeyR') this.respawn(this.currentFloor);
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      // Pointer Orbit (Mouse)
      this.canvas.addEventListener('mousedown', (e) => {
        this.sound.ensureContext();
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      this.canvas.addEventListener('click', () => {
        this.sound.ensureContext();
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isMouseDown) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.cameraYaw -= dx * 0.005;
        this.cameraPitch = Math.max(-0.4, Math.min(1.2, this.cameraPitch + dy * 0.004));
      });

      window.addEventListener('mouseup', () => {
        this.isMouseDown = false;
      });

      // Mouse Wheel Zoom
      window.addEventListener('wheel', (e) => {
        this.cameraDist = Math.max(3.2, Math.min(9.0, this.cameraDist + e.deltaY * 0.004));
      });

      // Touch Orbit (Swipe screen to rotate camera/view)
      let touchCamId = null;
      let lastTouchX = 0;
      let lastTouchY = 0;

      const isInteractiveUI = (el) => {
        if (!el) return false;
        const node = el.nodeType === 3 ? el.parentElement : el;
        if (!node || typeof node.closest !== 'function') return false;
        return !!(
          node.closest('#joystick-zone') ||
          node.closest('.action-btn') ||
          node.closest('.hud-btn') ||
          node.closest('.modal-card') ||
          node.closest('.fs-prompt') ||
          node.closest('#fs-prompt')
        );
      };

      window.addEventListener(
        'touchstart',
        (e) => {
          this.sound.ensureContext();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (touchCamId === null && !isInteractiveUI(t.target)) {
              touchCamId = t.identifier;
              lastTouchX = t.clientX;
              lastTouchY = t.clientY;
            }
          }
        },
        { passive: false }
      );

      window.addEventListener(
        'touchmove',
        (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === touchCamId) {
              const dx = t.clientX - lastTouchX;
              const dy = t.clientY - lastTouchY;
              lastTouchX = t.clientX;
              lastTouchY = t.clientY;

              this.cameraYaw -= dx * 0.006;
              this.cameraPitch = Math.max(-0.4, Math.min(1.2, this.cameraPitch + dy * 0.005));

              if (e.cancelable) e.preventDefault();
            }
          }
        },
        { passive: false }
      );

      const endTouch = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchCamId) {
            touchCamId = null;
          }
        }
      };
      window.addEventListener('touchend', endTouch, { passive: true });
      window.addEventListener('touchcancel', endTouch, { passive: true });

      // Virtual Joystick (Mobile)
      const joyZone = document.getElementById('joystick-zone');
      const joyKnob = document.getElementById('joystick-knob');
      let joyTouchId = null;
      let joyCenter = { x: 0, y: 0 };

      joyZone.addEventListener(
        'touchstart',
        (e) => {
          if (this.dismissFsPrompt) this.dismissFsPrompt();
          this.sound.ensureContext();
          if (e.cancelable) e.preventDefault();
          const t = e.changedTouches[0];
          joyTouchId = t.identifier;
          const rect = joyZone.getBoundingClientRect();
          joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          this.updateJoystick(t.clientX, t.clientY, joyCenter, joyKnob);
        },
        { passive: false }
      );

      window.addEventListener(
        'touchmove',
        (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === joyTouchId) {
              if (e.cancelable) e.preventDefault();
              this.updateJoystick(t.clientX, t.clientY, joyCenter, joyKnob);
            }
          }
        },
        { passive: false }
      );

      const resetJoy = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            joyTouchId = null;
            this.joystick = { x: 0, y: 0, active: false };
            joyKnob.style.transform = 'translate(-50%, -50%)';
          }
        }
      };
      window.addEventListener('touchend', resetJoy, { passive: true });
      window.addEventListener('touchcancel', resetJoy, { passive: true });

      // Jump Button (Mobile)
      const jumpBtn = document.getElementById('m-jump-btn');
      jumpBtn.addEventListener('touchstart', (e) => {
        if (this.dismissFsPrompt) this.dismissFsPrompt();
        this.sound.ensureContext();
        if (e.cancelable) e.preventDefault();
        this.triggerJump();
      });

      // Respawn Button (Mobile)
      const respBtn = document.getElementById('m-respawn-btn');
      respBtn.addEventListener('touchstart', (e) => {
        if (this.dismissFsPrompt) this.dismissFsPrompt();
        this.sound.ensureContext();
        if (e.cancelable) e.preventDefault();
        this.respawn(this.currentFloor);
      });
    }

    updateJoystick(cx, cy, center, knobEl) {
      const maxDist = 48;
      let dx = cx - center.x;
      let dy = cy - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joystick = {
        x: dx / maxDist,
        y: dy / maxDist,
        active: true
      };
    }

    triggerJump() {
      if (this.isGrounded) {
        this.playerVel.y = 13.5;
        this.isGrounded = false;
        this.sound.playJump();
      }
    }

    // --- 6. UI & HUD ---
    initUI() {
      this.floorDisplay = document.getElementById('floor-display');
      this.timerDisplay = document.getElementById('timer-display');
      this.coinsDisplay = document.getElementById('coins-display');
      this.floorToast = document.getElementById('floor-toast');

      // Fullscreen prompt badge
      const fsPrompt = document.getElementById('fs-prompt');
      let fsPromptDismissed = false;
      const dismissFsPrompt = () => {
        if (!fsPrompt || fsPromptDismissed) return;
        fsPromptDismissed = true;
        fsPrompt.classList.add('hidden');
        setTimeout(() => {
          if (fsPrompt) fsPrompt.style.display = 'none';
        }, 300);
      };
      this.dismissFsPrompt = dismissFsPrompt;

      if (fsPrompt) {
        const handleFsPrompt = async (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          dismissFsPrompt();
          this.manualExitedFullscreen = false;
          this.sound.ensureContext();
          await this.enterFullscreenLandscape();
        };

        fsPrompt.addEventListener('click', handleFsPrompt);
        fsPrompt.addEventListener('touchend', handleFsPrompt);
        fsPrompt.addEventListener('pointerup', handleFsPrompt);

        // Auto-dismiss prompt after 8 seconds or on first movement
        setTimeout(() => dismissFsPrompt(), 8000);
      }

      // Fullscreen toggle button in top header
      const fsBtn = document.getElementById('fullscreen-btn');
      if (fsBtn) {
        const handleFsToggle = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          dismissFsPrompt();
          this.sound.ensureContext();
          this.toggleFullscreen();
        };
        fsBtn.addEventListener('click', handleFsToggle);
        fsBtn.addEventListener('touchend', handleFsToggle);
      }

      const updateFsUI = () => {
        const isFs = this.isFullscreen();
        const icon = document.getElementById('fullscreen-icon');
        const text = document.getElementById('fullscreen-text');
        if (icon) icon.textContent = isFs ? '🗗' : '⛶';
        if (text) text.textContent = isFs ? 'Окно' : 'Экран';

        if (fsPrompt && isFs) {
          dismissFsPrompt();
        }

        if (isFs) {
          this.lockLandscape();
        } else {
          this.unlockOrientation();
        }

        this.triggerMultiPassResize();
      };

      document.addEventListener('fullscreenchange', updateFsUI);
      document.addEventListener('webkitfullscreenchange', updateFsUI);
      document.addEventListener('mozfullscreenchange', updateFsUI);
      document.addEventListener('MSFullscreenChange', updateFsUI);

      // Top buttons
      document.getElementById('mute-btn').addEventListener('click', () => {
        const isMuted = this.sound.toggleMute();
        document.getElementById('mute-icon').textContent = isMuted ? '🔇' : '🔊';
      });

      document.getElementById('respawn-btn-top').addEventListener('click', () => {
        this.respawn(this.currentFloor);
      });

      // Skip Floor (Rewarded Ad integration)
      document.getElementById('skip-btn').addEventListener('click', () => {
        if (this.currentFloor < this.maxFloor) {
          this.bridge.showSkipAd(() => {
            this.advanceFloor(this.currentFloor + 1, true);
          });
        }
      });

      // Restart after victory
      document.getElementById('restart-game-btn').addEventListener('click', () => {
        document.getElementById('victory-modal').classList.remove('active');
        this.startTime = Date.now();
        this.timerRunning = true;
        this.isWon = false;
        this.deaths = 0;
        this.respawn(1);
      });
    }

    isFullscreen() {
      const doc = document;
      return !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
    }

    async enterFullscreenLandscape() {
      const doc = document;
      const el = document.documentElement;

      if (!this.isFullscreen()) {
        const req =
          el.requestFullscreen ||
          el.webkitRequestFullscreen ||
          el.mozRequestFullScreen ||
          el.msRequestFullscreen;
        if (req) {
          try {
            const p = req.call(el);
            if (p && typeof p.then === 'function') {
              await p.catch((err) => {
                console.warn('Fullscreen request rejected:', err);
              });
            }
          } catch (err) {
            console.warn('Fullscreen error:', err);
          }
        }
      }

      await this.lockLandscape();
      this.triggerMultiPassResize();
    }

    async lockLandscape() {
      try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          await screen.orientation.lock('landscape').catch(() => {
            return screen.orientation.lock('landscape-primary').catch(() => {});
          });
        } else if (screen.lockOrientation) {
          screen.lockOrientation('landscape');
        } else if (screen.mozLockOrientation) {
          screen.mozLockOrientation('landscape');
        } else if (screen.msLockOrientation) {
          screen.msLockOrientation('landscape');
        }
      } catch (err) {
        console.warn('Orientation lock notice:', err.message || err);
      }
    }

    async exitFullscreen() {
      const doc = document;
      const exit =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exit) {
        try {
          const p = exit.call(doc);
          if (p && typeof p.then === 'function') {
            await p.catch(() => {});
          }
        } catch (err) {
          console.warn('Exit fullscreen error:', err);
        }
      }

      this.unlockOrientation();
      this.triggerMultiPassResize();
    }

    unlockOrientation() {
      try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        } else if (screen.unlockOrientation) {
          screen.unlockOrientation();
        } else if (screen.mozUnlockOrientation) {
          screen.mozUnlockOrientation();
        } else if (screen.msUnlockOrientation) {
          screen.msUnlockOrientation();
        }
      } catch (err) {
        // Quiet ignore
      }
    }

    triggerMultiPassResize() {
      this.handleResize();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => this.handleResize());
      }
      setTimeout(() => this.handleResize(), 60);
      setTimeout(() => this.handleResize(), 160);
      setTimeout(() => this.handleResize(), 320);
      setTimeout(() => this.handleResize(), 600);
      setTimeout(() => this.handleResize(), 1000);
    }

    handleResize() {
      if (!this.camera || !this.renderer) return;

      const vv = window.visualViewport;
      let w = window.innerWidth;
      let h = window.innerHeight;

      if (vv && vv.width && vv.height) {
        w = Math.round(vv.width);
        h = Math.round(vv.height);
      } else if (document.documentElement && document.documentElement.clientWidth) {
        w = document.documentElement.clientWidth;
        h = document.documentElement.clientHeight;
      }

      if (w <= 0 || h <= 0) return;

      const aspect = w / h;
      this.camera.aspect = aspect;

      // Dynamic FOV: in portrait mode (aspect < 1.0), expand vertical FOV so platforms stay comfortably in view
      if (aspect < 1.0) {
        const desiredHFOV = 80 * (Math.PI / 180);
        const vFOV = 2 * Math.atan(Math.tan(desiredHFOV / 2) / aspect) * (180 / Math.PI);
        this.camera.fov = Math.max(65, Math.min(92, vFOV));
      } else {
        this.camera.fov = 65;
      }
      this.camera.updateProjectionMatrix();

      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(w, h, true);

      // Orientation advisory hint: show only in portrait on mobile devices
      const rotateHint = document.getElementById('rotate-device-hint');
      if (rotateHint) {
        const isPortrait = h > w;
        const isMobileScreen = Math.max(w, h) < 1200;
        rotateHint.style.display = (isPortrait && isMobileScreen) ? 'block' : 'none';
      }
    }

    toggleFullscreen() {
      if (!this.isFullscreen()) {
        this.manualExitedFullscreen = false;
        this.enterFullscreenLandscape();
      } else {
        this.manualExitedFullscreen = true;
        this.exitFullscreen();
      }
    }

    showToast(text) {
      this.floorToast.textContent = text;
      this.floorToast.classList.add('show');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.floorToast.classList.remove('show');
      }, 2600);
    }

    advanceFloor(targetFloor, teleport = true) {
      if (targetFloor > this.maxFloor) {
        this.triggerVictory();
        return;
      }
      this.currentFloor = targetFloor;
      this.floorDisplay.textContent = `ЭТАЖ ${this.currentFloor} / ${this.maxFloor}`;
      const cp = this.checkpoints[this.currentFloor - 1];
      if (cp) {
        this.showToast(`🎉 ЭТАЖ ${this.currentFloor}: ${cp.name.toUpperCase()}!`);
      }
      this.sound.playCheckpoint();
      this.bridge.saveProgress(this.bestTime || 0, this.coins);

      if (teleport) {
        this.respawn(this.currentFloor);
      }

      if (this.currentFloor >= this.maxFloor) {
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) skipBtn.style.display = 'none';
      }
    }

    respawn(floorNum = this.currentFloor) {
      const cp = this.checkpoints[floorNum - 1];
      if (cp) {
        this.playerPos.copy(cp.pos);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
        const cpAngle = (floorNum - 1) * 8 * 0.38;
        this.cameraYaw = cpAngle + Math.PI;
      }
    }

    onDeath() {
      this.deaths++;
      this.sound.playLava();
      this.respawn(this.currentFloor);
    }

    triggerVictory() {
      if (this.isWon) return;
      this.isWon = true;
      this.timerRunning = false;
      const elapsedSec = (Date.now() - this.startTime) / 1000;
      this.sound.playWin();

      // Show confetti
      this.confettiParticles.forEach((p) => (p.visible = true));

      // Check Best Time
      if (!this.bestTime || elapsedSec < this.bestTime) {
        this.bestTime = elapsedSec;
      }
      this.bridge.saveProgress(this.bestTime, this.coins);
      this.bridge.showWinAd();

      // Format time
      const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const remSec = (s % 60).toFixed(1);
        return `${m < 10 ? '0' : ''}${m}:${remSec < 10 ? '0' : ''}${remSec}`;
      };

      document.getElementById('final-time').textContent = formatTime(elapsedSec);
      document.getElementById('final-coins').textContent = `${this.coins} / 40`;
      document.getElementById('final-deaths').textContent = this.deaths;
      document.getElementById('best-time').textContent = formatTime(this.bestTime);
      document.getElementById('victory-modal').classList.add('active');
    }

    // --- 7. MAIN GAME LOOP & PHYSICS ---
    animate(now) {
      requestAnimationFrame(this.animate);
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      this.updatePhysics(dt);
      this.updateDynamicObjects(dt, now / 1000);
      this.updateCamera();
      this.updateUI();

      this.renderer.render(this.scene, this.camera);
    }

    updatePhysics(dt) {
      // 1. Gather directional input
      let moveX = 0;
      let moveZ = 0;

      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

      if (this.joystick.active) {
        moveX = this.joystick.x;
        moveZ = this.joystick.y;
      }

      if (this.keys['Space']) {
        this.triggerJump();
      }

      // 2. Transform input relative to camera yaw
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
      const maxSpeed = isSprinting ? 12.0 : 8.5;

      const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

      const wishDir = new THREE.Vector3();
      if (len > 0.05) {
        wishDir.addScaledVector(right, moveX / Math.max(1, len));
        wishDir.addScaledVector(forward, -moveZ / Math.max(1, len));
      }

      // 3. Horizontal acceleration & ice physics
      const isOnIce = !!(this.currentGround && this.currentGround.isIce);
      const targetVx = wishDir.x * maxSpeed;
      const targetVz = wishDir.z * maxSpeed;

      if (this.isGrounded) {
        if (isOnIce) {
          // --- ICE GROUND PHYSICS (SLIPPERY & GLIDING) ---
          if (len > 0.05) {
            // Slippery acceleration: takes longer to change direction or gain speed
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, 3.2 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, 3.2 * dt);
          } else {
            // Ultra-low deceleration: player glides and slides across the ice!
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, 0, 0.40 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, 0, 0.40 * dt);
          }
        } else {
          // --- NORMAL GROUND PHYSICS ---
          if (len > 0.05) {
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, 45.0 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, 45.0 * dt);
          } else {
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, 0, 24.0 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, 0, 24.0 * dt);
          }
        }
      } else {
        // --- IN-AIR PHYSICS (PRESERVES JUMP & SLIDE MOMENTUM!) ---
        if (len > 0.05) {
          // Subtle air steering without killing existing velocity
          this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, 5.0 * dt);
          this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, 5.0 * dt);
        } else {
          // Air resistance is near-zero: preserve full jump momentum across!
          this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, 0, 0.15 * dt);
          this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, 0, 0.15 * dt);
        }
      }

      // 4. Gravity
      this.playerVel.y -= 28.0 * dt;
      if (this.playerVel.y < -38.0) this.playerVel.y = -38.0;

      // 5. Apply velocity
      this.playerPos.x += this.playerVel.x * dt;
      this.playerPos.z += this.playerVel.z * dt;
      this.playerPos.y += this.playerVel.y * dt;

      // 6. Collision with Platforms
      const wasInAir = !this.isGrounded;
      const prevVelY = this.playerVel.y;
      this.isGrounded = false;
      this.currentGround = null;
      const pBox = {
        min: new THREE.Vector3(this.playerPos.x - 0.4, this.playerPos.y, this.playerPos.z - 0.4),
        max: new THREE.Vector3(this.playerPos.x + 0.4, this.playerPos.y + 1.8, this.playerPos.z + 0.4)
      };

      for (let i = 0; i < this.platforms.length; i++) {
        const plat = this.platforms[i];
        if (
          pBox.max.x > plat.min.x &&
          pBox.min.x < plat.max.x &&
          pBox.max.z > plat.min.z &&
          pBox.min.z < plat.max.z
        ) {
          // Landing on top
          if (
            this.playerVel.y <= 0 &&
            pBox.min.y >= plat.max.y - 0.6 &&
            pBox.min.y <= plat.max.y + 0.3
          ) {
            this.playerPos.y = plat.max.y;
            this.playerVel.y = 0;
            this.isGrounded = true;
            this.currentGround = plat;

            // --- SPECIAL ICE LANDING: Slide from jumps onto ice ---
            if (plat.isIce && wasInAir) {
              const horizSpeed = Math.sqrt(
                this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z
              );
              if (horizSpeed > 0.4) {
                // Landing from a jump onto ice carries forward sliding momentum!
                const impactFactor = Math.min(1.25, 1.05 + Math.abs(prevVelY) * 0.015);
                this.playerVel.x *= impactFactor;
                this.playerVel.z *= impactFactor;
              } else if (wishDir.lengthSq() > 0.001) {
                // Player was holding direction on landing: immediately launch into a fast slide!
                this.playerVel.x = wishDir.x * maxSpeed * 0.85;
                this.playerVel.z = wishDir.z * maxSpeed * 0.85;
              } else {
                // Landing vertically on ice: give a subtle forward slide in view direction
                const viewForward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
                this.playerVel.x += viewForward.x * 2.8;
                this.playerVel.z += viewForward.z * 2.8;
              }
            }

            // Check if checkpoint reached
            if (plat.tag && plat.tag.startsWith('checkpoint_')) {
              const floorNum = parseInt(plat.tag.split('_')[1], 10);
              if (floorNum > this.currentFloor) {
                this.advanceFloor(floorNum, false);
              }
            } else if (plat.tag === 'summit_pad') {
              this.triggerVictory();
            }
          }
        }
      }

      // 7. Check Launch Pads
      for (let i = 0; i < this.launchPads.length; i++) {
        const pad = this.launchPads[i];
        if (
          pBox.max.x > pad.min.x &&
          pBox.min.x < pad.max.x &&
          pBox.max.z > pad.min.z &&
          pBox.min.z < pad.max.z &&
          Math.abs(pBox.min.y - pad.max.y) < 0.4
        ) {
          this.playerVel.y = pad.force;
          this.isGrounded = false;
          this.sound.playBounce();
        }
      }

      // 8. Check Vanishing Blocks
      for (let i = 0; i < this.vanishingBlocks.length; i++) {
        const vb = this.vanishingBlocks[i];
        if (this.currentGround === vb.plat && vb.active && !vb.stepped) {
          vb.stepped = true;
          vb.steppedTime = performance.now();
        }
      }

      // 9. Check Static Hazards
      for (let i = 0; i < this.hazards.length; i++) {
        const h = this.hazards[i];
        if (
          pBox.max.x > h.min.x &&
          pBox.min.x < h.max.x &&
          pBox.max.y > h.min.y &&
          pBox.min.y < h.max.y &&
          pBox.max.z > h.min.z &&
          pBox.min.z < h.max.z
        ) {
          this.onDeath();
          return;
        }
      }

      // 10. Check Spinning Beams (Accurate Line Segment vs Player Cylinder via worldToLocal)
      for (let i = 0; i < this.spinningBeams.length; i++) {
        const sb = this.spinningBeams[i];

        // Transform player position directly into local space of the rotating beam group:
        const localPos = sb.group.worldToLocal(this.playerPos.clone());

        // Inside sb.group, the beam bar is at Y = 0 with thickness 0.24 (half-height 0.12)
        // Player feet are at localPos.y, head at localPos.y + 1.8
        // If jumping over beam (feet above beam top):
        if (localPos.y >= 0.14 - 0.04) {
          continue; // Clean jump over the beam!
        }
        // If player is entirely below beam:
        if (localPos.y + 1.8 <= -0.14) {
          continue;
        }

        // Inside sb.group, the bar lies along local X from -sb.length/2 to +sb.length/2:
        const halfL = sb.length / 2;
        const clampedX = Math.max(-halfL, Math.min(halfL, localPos.x));

        const distX = localPos.x - clampedX;
        const distZ = localPos.z;
        const distSq = distX * distX + distZ * distZ;

        // Hit radius: forgiving 0.38m
        if (distSq < 0.38 * 0.38) {
          this.onDeath();
          return;
        }
      }

      // 11. Check Laser Fences (Full-fledged Barrier Hurdles via worldToLocal)
      for (let i = 0; i < this.laserFences.length; i++) {
        const lf = this.laserFences[i];
        if (lf.state !== 'on') continue;

        // Transform player position directly into local space of the fence group:
        const localPos = lf.group.worldToLocal(this.playerPos.clone());

        // Inside lf.group:
        // Platform floor is at local Y = 0.3
        // Fence top is at local Y = 0.3 + lf.height
        // If feet are above fence top:
        if (localPos.y >= 0.3 + lf.height - 0.05) {
          continue; // Successfully leaped over the hurdle!
        }
        // If player is below platform floor:
        if (localPos.y + 1.8 <= 0.3) {
          continue;
        }

        const halfW = lf.width / 2;
        // Check if player is between the fence posts (along local X)
        if (Math.abs(localPos.x) <= halfW + 0.15) {
          // Check if player intersects the laser fence plane (along local Z)
          if (Math.abs(localPos.z) < 0.35) {
            this.onDeath();
            return;
          }
        }
      }

      // 12. Check Coins Pickup
      for (let i = 0; i < this.coinsObjects.length; i++) {
        const c = this.coinsObjects[i];
        if (!c.collected && this.playerPos.distanceTo(c.mesh.position) < 1.2) {
          c.collected = true;
          c.mesh.visible = false;
          this.coins++;
          this.sound.playCoin();
          this.coinsDisplay.textContent = this.coins;
        }
      }

      // 13. Pit Fall check
      if (this.playerPos.y < -1.5) {
        this.onDeath();
        return;
      }

      // Update Character Mesh
      this.character.group.position.copy(this.playerPos);
      if (len > 0.1) {
        const targetRot = Math.atan2(this.playerVel.x, this.playerVel.z);
        this.character.group.rotation.y = THREE.MathUtils.lerp(
          this.character.group.rotation.y,
          targetRot,
          12 * dt
        );
      }
      const horizontalSpeed = Math.sqrt(
        this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z
      );
      this.character.updateAnimation(horizontalSpeed, this.isGrounded, dt);
    }

    updateDynamicObjects(dt, timeSec) {
      // Spinning beams
      for (let i = 0; i < this.spinningBeams.length; i++) {
        const sb = this.spinningBeams[i];
        sb.angle += sb.speed * dt;
        sb.group.rotation.y = sb.angle;
        sb.group.updateMatrixWorld(true);
      }

      // Moving platforms
      for (let i = 0; i < this.movingPlatforms.length; i++) {
        const mp = this.movingPlatforms[i];
        const offset = Math.sin(timeSec * mp.speed + mp.phase) * mp.amplitude;
        const curOffset = new THREE.Vector3(
          Math.cos(mp.phase) * offset,
          0,
          Math.sin(mp.phase) * offset
        );
        const delta = curOffset.clone().sub(mp.lastOffset);
        mp.lastOffset.copy(curOffset);

        mp.plat.mesh.position.copy(mp.origin).add(curOffset);
        mp.plat.min.copy(mp.plat.mesh.position).sub(mp.plat.size.clone().multiplyScalar(0.5));
        mp.plat.max.copy(mp.plat.mesh.position).add(mp.plat.size.clone().multiplyScalar(0.5));

        // If player is standing on this platform, carry them!
        if (this.currentGround === mp.plat) {
          this.playerPos.add(delta);
        }
      }

      // Vanishing blocks
      const now = performance.now();
      for (let i = 0; i < this.vanishingBlocks.length; i++) {
        const vb = this.vanishingBlocks[i];
        if (vb.stepped && vb.active) {
          const elapsed = (now - vb.steppedTime) / 1000;
          const vanishDelay = vb.vanishDelay || 0.75;
          if (elapsed < vanishDelay) {
            // Flash
            vb.plat.mesh.material.opacity = Math.sin(elapsed * 25) > 0 ? 0.3 : 0.9;
          } else {
            // Vanish
            vb.active = false;
            vb.plat.mesh.visible = false;
            vb.reappearTime = now + (vb.reappearDelay || 2200);
            // Move bounding box away
            vb.plat.min.set(0, -999, 0);
            vb.plat.max.set(0, -999, 0);
          }
        } else if (!vb.active && now > vb.reappearTime) {
          // Reappear
          vb.active = true;
          vb.stepped = false;
          vb.plat.mesh.visible = true;
          vb.plat.mesh.material.opacity = 1;
          const pos = vb.plat.pos;
          const size = vb.plat.size;
          vb.plat.min.set(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2);
          vb.plat.max.set(pos.x + size.x / 2, pos.y + size.y / 2, pos.z + size.z / 2);
        }
      }

      // Laser fences update
      for (let i = 0; i < this.laserFences.length; i++) {
        const lf = this.laserFences[i];
        if (lf.interval > 0) {
          lf.timer += dt;
          if (lf.timer > lf.interval) {
            lf.timer = 0;
            lf.state = lf.state === 'on' ? 'off' : 'on';
            const isOn = lf.state === 'on';
            for (let r = 0; r < lf.railMeshes.length; r++) {
              lf.railMeshes[r].material.color.setHex(isOn ? 0xff0055 : 0x1e293b);
              lf.railMeshes[r].material.opacity = isOn ? 0.95 : 0.15;
            }
            lf.gridMesh.visible = isOn;
            lf.capMat.color.setHex(isOn ? 0xff007f : 0x475569);
          }
        } else {
          // Continuous energetic glow pulsation
          const glow = 0.82 + Math.sin(timeSec * 7 + i) * 0.18;
          for (let r = 0; r < lf.railMeshes.length; r++) {
            lf.railMeshes[r].material.opacity = glow;
          }
          lf.gridMesh.material.opacity = 0.25 + Math.sin(timeSec * 9 + i) * 0.12;
        }
      }

      // Coins rotation & bob
      for (let i = 0; i < this.coinsObjects.length; i++) {
        const c = this.coinsObjects[i];
        if (!c.collected) {
          c.mesh.rotation.z += 2.0 * dt;
          c.mesh.position.y = c.startY + Math.sin(timeSec * 3 + i) * 0.15;
        }
      }

      // Trophy Spin
      if (this.trophyGroup) {
        this.trophyGroup.rotation.y += 0.8 * dt;
      }

      // Confetti fall
      if (this.isWon) {
        for (let i = 0; i < this.confettiParticles.length; i++) {
          const p = this.confettiParticles[i];
          p.position.y += p.userData.vy;
          p.rotation.x += p.userData.rotSpeed;
          p.rotation.z += p.userData.rotSpeed;
          if (p.position.y < 95) p.position.y = 112;
        }
      }
    }

    updateCamera() {
      const target = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));
      const cx = target.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist;
      const cy = target.y + Math.sin(this.cameraPitch) * this.cameraDist;
      const cz = target.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(target);

      // Keep light following the player height
      this.dirLight.position.set(
        this.playerPos.x + 25,
        this.playerPos.y + 40,
        this.playerPos.z + 25
      );
      this.dirLight.target.position.copy(this.playerPos);
      this.dirLight.target.updateMatrixWorld();
    }

    updateUI() {
      if (this.timerRunning) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const m = Math.floor(elapsed / 60);
        const s = (elapsed % 60).toFixed(1);
        this.timerDisplay.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      }
    }
  }

  // Launch once DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new TowerGame();
  });
})();
