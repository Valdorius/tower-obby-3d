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
      this.maxFloor = 10;
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
      this.cameraYaw = 0;
      this.cameraPitch = 0.25;
      this.cameraDist = 5.2;

      // Controls state
      this.keys = {};
      this.joystick = { x: 0, y: 0, active: false };
      this.isMouseDown = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;

      // World objects
      this.platforms = [];
      this.hazards = [];
      this.launchPads = [];
      this.vanishingBlocks = [];
      this.movingPlatforms = [];
      this.spinningBeams = [];
      this.pulsingLasers = [];
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

      // Window resize
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    // --- LEVEL GENERATION (10 FLOORS) ---
    buildTower() {
      const FLOOR_HEIGHT = 10.5;
      const TOWER_RADIUS = 13.5;

      // Tower Outer Frame (Stylized semi-transparent pillars)
      const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 115, 12);
      const pillarMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(Math.cos(angle) * TOWER_RADIUS, 55, Math.sin(angle) * TOWER_RADIUS);
        this.scene.add(p);
      }

      // Base bottom floor (Lava abyss at bottom)
      const abyssGeo = new THREE.CircleGeometry(TOWER_RADIUS + 4, 32);
      const abyssMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const abyss = new THREE.Mesh(abyssGeo, abyssMat);
      abyss.rotation.x = -Math.PI / 2;
      abyss.position.y = -2;
      this.scene.add(abyss);
      this.addHazard(new THREE.Vector3(0, -1, 0), new THREE.Vector3(35, 1.5, 35));

      // Floor themes definition
      const floorThemes = [
        { name: 'Первые шаги', color: 0x22c55e, type: 'basic' },
        { name: 'Лавовые полосы', color: 0xeab308, type: 'lava' },
        { name: 'Хрупкий мост', color: 0xf97316, type: 'vanishing' },
        { name: 'Вращающийся луч', color: 0xef4444, type: 'spinner' },
        { name: 'Прыжковые батуты', color: 0xa855f7, type: 'bouncers' },
        { name: 'Ледяные дорожки', color: 0x3b82f6, type: 'ice' },
        { name: 'Живые платформы', color: 0x06b6d4, type: 'moving' },
        { name: 'Лазерная решетка', color: 0xec4899, type: 'lasers' },
        { name: 'Узкие тропы', color: 0x8b5cf6, type: 'narrow' },
        { name: 'Финальный подъем', color: 0xfacc15, type: 'summit' }
      ];

      for (let floorIdx = 0; floorIdx < 10; floorIdx++) {
        const floorNum = floorIdx + 1;
        const floorY = floorIdx * FLOOR_HEIGHT;
        const theme = floorThemes[floorIdx];
        const floorAngleStart = (floorIdx * 0.7) % (Math.PI * 2);

        // Checkpoint Landing Platform
        const cpX = Math.cos(floorAngleStart) * (TOWER_RADIUS - 4);
        const cpZ = Math.sin(floorAngleStart) * (TOWER_RADIUS - 4);
        const checkPos = new THREE.Vector3(cpX, floorY, cpZ);

        this.checkpoints[floorIdx] = {
          floor: floorNum,
          name: theme.name,
          pos: checkPos.clone().add(new THREE.Vector3(0, 1.2, 0))
        };

        // Checkpoint Pad Mesh
        this.addPlatform(
          checkPos,
          new THREE.Vector3(4.2, 0.8, 4.2),
          theme.color,
          false,
          `checkpoint_${floorNum}`
        );

        // Checkpoint Flag/Glow Marker
        this.createCheckpointMarker(checkPos, theme.color, floorNum);

        // Add 2 Coins per floor along the path
        this.createCoin(checkPos.clone().add(new THREE.Vector3(0, 1.5, 0)));

        // Generate Stage Obstacles based on type
        this.buildStageObstacles(floorIdx, floorY, floorAngleStart, theme, TOWER_RADIUS);
      }

      // Summit Trophy on Floor 10
      this.createSummitTrophy(10 * FLOOR_HEIGHT);
    }

    createCheckpointMarker(pos, colorHex, floorNum) {
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pos.x, pos.y + 1.4, pos.z);
      this.scene.add(pole);

      const flagGeo = new THREE.BoxGeometry(0.8, 0.5, 0.04);
      const flagMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(pos.x + 0.4, pos.y + 2.3, pos.z);
      this.scene.add(flag);

      // Light ring
      const ringGeo = new THREE.RingGeometry(1.2, 1.4, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, pos.y + 0.42, pos.z);
      this.scene.add(ring);
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

    buildStageObstacles(floorIdx, floorY, angleStart, theme, radius) {
      const count = 6;
      const angleStep = 0.52;
      const nextFloorY = floorY + 10.5;

      for (let i = 1; i <= count; i++) {
        const curAngle = angleStart + i * angleStep;
        const t = i / (count + 1);
        const y = floorY + t * 9.5;
        const rad = radius - 4.2 + Math.sin(i * 1.5) * 1.2;
        const px = Math.cos(curAngle) * rad;
        const pz = Math.sin(curAngle) * rad;
        const pos = new THREE.Vector3(px, y, pz);

        if (i === 3) {
          // Extra coin on midway
          this.createCoin(pos.clone().add(new THREE.Vector3(0, 1.4, 0)));
        }

        switch (theme.type) {
          case 'basic': {
            // Gentle solid step platforms
            this.addPlatform(pos, new THREE.Vector3(2.5, 0.6, 2.5), 0x22c55e);
            break;
          }

          case 'lava': {
            // Platform with red hot lava stripe in center
            this.addPlatform(pos, new THREE.Vector3(3.4, 0.6, 2.2), 0x475569);
            const hazardPos = pos.clone().add(new THREE.Vector3(0, 0.35, 0));
            this.addHazard(hazardPos, new THREE.Vector3(0.7, 0.3, 2.1));
            break;
          }

          case 'vanishing': {
            // Disappearing orange platforms
            this.addVanishingBlock(pos, new THREE.Vector3(2.4, 0.5, 2.4), 0xf97316);
            break;
          }

          case 'spinner': {
            // Circular platform + Rotating lethal beam
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.6, 3.2), 0x334155);
            if (i % 2 === 0) {
              this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.7, 0)), 3.8);
            }
            break;
          }

          case 'bouncers': {
            // Launch pads that spring the player upward
            if (i % 2 === 1) {
              this.addLaunchPad(pos, new THREE.Vector3(2.2, 0.6, 2.2), 24);
            } else {
              this.addPlatform(pos, new THREE.Vector3(2.0, 0.6, 2.0), 0xa855f7);
            }
            break;
          }

          case 'ice': {
            // Low friction slippery ice blocks
            this.addPlatform(pos, new THREE.Vector3(2.8, 0.5, 2.8), 0x93c5fd, true);
            break;
          }

          case 'moving': {
            // Platforms gliding horizontally
            this.addMovingPlatform(pos, new THREE.Vector3(2.4, 0.6, 2.4), 0x06b6d4, curAngle);
            break;
          }

          case 'lasers': {
            // Platforms with pulsating on/off lasers
            this.addPlatform(pos, new THREE.Vector3(2.8, 0.6, 2.8), 0x475569);
            if (i % 2 === 1) {
              this.addPulsingLaser(pos.clone().add(new THREE.Vector3(0, 0.8, 0)), 2.6);
            }
            break;
          }

          case 'narrow': {
            // Narrow balance beams & small cylinders
            const isBeam = i % 2 === 0;
            const size = isBeam ? new THREE.Vector3(0.9, 0.5, 3.2) : new THREE.Vector3(1.2, 0.5, 1.2);
            this.addPlatform(pos, size, 0x8b5cf6);
            break;
          }

          case 'summit': {
            // Combination gauntlet
            if (i === 1) this.addLaunchPad(pos, new THREE.Vector3(2.0, 0.6, 2.0), 22);
            else if (i === 3) this.addVanishingBlock(pos, new THREE.Vector3(2.0, 0.5, 2.0), 0xfacc15);
            else if (i === 5) {
              this.addPlatform(pos, new THREE.Vector3(3.0, 0.6, 3.0), 0x334155);
              this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.7, 0)), 3.5);
            } else {
              this.addPlatform(pos, new THREE.Vector3(2.2, 0.6, 2.2), 0xfacc15);
            }
            break;
          }
        }
      }
    }

    createSummitTrophy(y) {
      const summitPos = new THREE.Vector3(0, y + 2, 0);

      // Huge Golden Summit Platform
      this.addPlatform(summitPos, new THREE.Vector3(7.5, 1.2, 7.5), 0xfacc15, false, 'summit_pad');

      // Giant Golden Trophy Mesh
      this.trophyGroup = new THREE.Group();
      this.trophyGroup.position.set(0, y + 3.2, 0);

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
      const confGeo = new THREE.PlaneGeometry(0.18, 0.18);
      const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xfacc15, 0xec4899];
      for (let i = 0; i < 70; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          side: THREE.DoubleSide
        });
        const p = new THREE.Mesh(confGeo, mat);
        p.position.set(
          (Math.random() - 0.5) * 6,
          y + 3 + Math.random() * 5,
          (Math.random() - 0.5) * 6
        );
        p.visible = false;
        p.userData = {
          vy: Math.random() * -0.05 - 0.02,
          rotSpeed: Math.random() * 0.1 - 0.05
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

    addHazard(pos, size) {
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
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

    addVanishingBlock(pos, size, colorHex) {
      const plat = this.addPlatform(pos, size, colorHex);
      plat.mesh.material.transparent = true;
      plat.mesh.material.opacity = 1;

      this.vanishingBlocks.push({
        plat,
        stepped: false,
        steppedTime: 0,
        active: true,
        reappearTime: 0
      });
    }

    addSpinningBeam(pos, length) {
      const geo = new THREE.CylinderGeometry(0.18, 0.18, length, 12);
      const mat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.copy(pos);
      this.scene.add(mesh);

      this.spinningBeams.push({
        mesh,
        pos,
        length,
        speed: 1.8 + Math.random() * 0.8,
        angle: Math.random() * Math.PI
      });
    }

    addMovingPlatform(pos, size, colorHex, angleOffset) {
      const plat = this.addPlatform(pos, size, colorHex);
      this.movingPlatforms.push({
        plat,
        origin: pos.clone(),
        amplitude: 2.2,
        speed: 1.6,
        phase: angleOffset,
        lastOffset: new THREE.Vector3()
      });
    }

    addPulsingLaser(pos, width) {
      const geo = new THREE.BoxGeometry(width, 0.2, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      this.pulsingLasers.push({
        mesh,
        pos,
        width,
        state: 'on',
        timer: Math.random() * 2
      });
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
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
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

      // Touch Orbit on Canvas (Swipe right area)
      let touchCamId = null;
      let lastTouchX = 0;
      let lastTouchY = 0;

      this.canvas.addEventListener(
        'touchstart',
        (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.clientX > window.innerWidth * 0.35 && touchCamId === null) {
              touchCamId = t.identifier;
              lastTouchX = t.clientX;
              lastTouchY = t.clientY;
            }
          }
        },
        { passive: false }
      );

      this.canvas.addEventListener(
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
      this.canvas.addEventListener('touchend', endTouch);
      this.canvas.addEventListener('touchcancel', endTouch);

      // Virtual Joystick (Mobile)
      const joyZone = document.getElementById('joystick-zone');
      const joyKnob = document.getElementById('joystick-knob');
      let joyTouchId = null;
      let joyCenter = { x: 0, y: 0 };

      joyZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          const t = e.changedTouches[0];
          joyTouchId = t.identifier;
          const rect = joyZone.getBoundingClientRect();
          joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          this.updateJoystick(t.clientX, t.clientY, joyCenter, joyKnob);
        },
        { passive: false }
      );

      joyZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === joyTouchId) {
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
      joyZone.addEventListener('touchend', resetJoy);
      joyZone.addEventListener('touchcancel', resetJoy);

      // Jump Button (Mobile)
      const jumpBtn = document.getElementById('m-jump-btn');
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerJump();
      });

      // Respawn Button (Mobile)
      const respBtn = document.getElementById('m-respawn-btn');
      respBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
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
            this.advanceFloor(this.currentFloor + 1);
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

    showToast(text) {
      this.floorToast.textContent = text;
      this.floorToast.classList.add('show');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.floorToast.classList.remove('show');
      }, 2600);
    }

    advanceFloor(targetFloor) {
      this.currentFloor = targetFloor;
      this.floorDisplay.textContent = `ЭТАЖ ${this.currentFloor} / ${this.maxFloor}`;
      const cp = this.checkpoints[this.currentFloor - 1];
      this.showToast(`ЭТАЖ ${this.currentFloor}: ${cp.name.toUpperCase()}`);
      this.sound.playCheckpoint();
      this.respawn(this.currentFloor);

      if (this.currentFloor === this.maxFloor) {
        document.getElementById('skip-btn').style.display = 'none';
      }
    }

    respawn(floorNum = this.currentFloor) {
      const cp = this.checkpoints[floorNum - 1];
      if (cp) {
        this.playerPos.copy(cp.pos);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
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
      document.getElementById('final-coins').textContent = `${this.coins} / 20`;
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

      // 3. Horizontal acceleration
      const accel = this.isGrounded ? 45.0 : 25.0;
      const targetVx = wishDir.x * maxSpeed;
      const targetVz = wishDir.z * maxSpeed;

      const friction = this.currentGround && this.currentGround.isIce ? 0.03 : this.groundFriction;
      this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, accel * dt * friction);
      this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, accel * dt * friction);

      // 4. Gravity
      this.playerVel.y -= 28.0 * dt;
      if (this.playerVel.y < -38.0) this.playerVel.y = -38.0;

      // 5. Apply velocity
      this.playerPos.x += this.playerVel.x * dt;
      this.playerPos.z += this.playerVel.z * dt;
      this.playerPos.y += this.playerVel.y * dt;

      // 6. Collision with Platforms
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

            // Check if checkpoint reached
            if (plat.tag && plat.tag.startsWith('checkpoint_')) {
              const floorNum = parseInt(plat.tag.split('_')[1], 10);
              if (floorNum > this.currentFloor) {
                this.advanceFloor(floorNum);
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

      // 10. Check Spinning Beams
      for (let i = 0; i < this.spinningBeams.length; i++) {
        const sb = this.spinningBeams[i];
        const beamHalf = sb.length / 2;
        const dx = this.playerPos.x - sb.pos.x;
        const dz = this.playerPos.z - sb.pos.z;
        const distToCenter = Math.sqrt(dx * dx + dz * dz);
        if (distToCenter < beamHalf + 0.4 && Math.abs(this.playerPos.y + 0.9 - sb.pos.y) < 0.6) {
          // Angle check
          const beamAngle = sb.mesh.rotation.y;
          const beamDirX = Math.cos(beamAngle);
          const beamDirZ = Math.sin(beamAngle);
          // Distance from point to line segment
          const proj = dx * beamDirX + dz * beamDirZ;
          const perpX = dx - proj * beamDirX;
          const perpZ = dz - proj * beamDirZ;
          const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
          if (perpDist < 0.35 && Math.abs(proj) < beamHalf) {
            this.onDeath();
            return;
          }
        }
      }

      // 11. Check Pulsing Lasers
      for (let i = 0; i < this.pulsingLasers.length; i++) {
        const laser = this.pulsingLasers[i];
        if (laser.state === 'on') {
          const dx = Math.abs(this.playerPos.x - laser.pos.x);
          const dy = Math.abs(this.playerPos.y + 0.9 - laser.pos.y);
          const dz = Math.abs(this.playerPos.z - laser.pos.z);
          if (dx < laser.width / 2 && dy < 0.4 && dz < 0.35) {
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
        sb.mesh.rotation.y = sb.angle;
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
          if (elapsed < 0.6) {
            // Flash
            vb.plat.mesh.material.opacity = Math.sin(elapsed * 25) > 0 ? 0.3 : 0.9;
          } else {
            // Vanish
            vb.active = false;
            vb.plat.mesh.visible = false;
            vb.reappearTime = now + 2400;
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

      // Pulsing Lasers
      for (let i = 0; i < this.pulsingLasers.length; i++) {
        const laser = this.pulsingLasers[i];
        laser.timer += dt;
        if (laser.timer > 1.4) {
          laser.timer = 0;
          laser.state = laser.state === 'on' ? 'off' : 'on';
          laser.mesh.material.color.setHex(laser.state === 'on' ? 0xff0055 : 0x1e293b);
          laser.mesh.material.opacity = laser.state === 'on' ? 0.9 : 0.2;
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
