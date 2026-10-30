/**
 * Tower of Obby 3D - Core Game Engine
 * Features:
 * - Substepped physics with Swept AABB & platform landing detection (no tunneling)
 * - Coyote time (0.15s) and Jump buffer (0.15s)
 * - Zero allocations in physics/camera loops (reusable scratch vectors)
 * - Pause/Resume time accumulation (accurate timer across ads and tab switches)
 * - Full Playgama Bridge v2.4.0 integration (rewarded, interstitial, cloud storage)
 * - Complete resetGame() implementation for flawless replay
 * - Dynamic floating analog joystick on left half of screen
 */
(function() {
  'use strict';

  class TowerGame {
    constructor() {
      const cfg = window.TOWER_CONFIG;
      this.canvas = document.getElementById('canvas3d');

      // Subsystems
      this.sound = new window.SoundManager();
      this.bridge = new window.BridgeWrapper(this);

      // Core Game State
      this.currentFloor = 1;
      this.maxFloor = cfg.TOTAL_FLOORS;
      this.isWon = false;
      this.isPaused = false;
      this.manualExitedFullscreen = false;

      // Timer & Run Stats
      this.accumulatedTime = 0;
      this.activeTimerStart = null;
      this.timerRunning = false;
      this.bestTime = null;
      this.coins = 0;
      this.savedTotalCoins = 0;
      this.deaths = 0;

      // Player Movement & Physics State
      this.playerPos = new THREE.Vector3(cfg.RADIUS, 0.45, 0);
      this.playerVel = new THREE.Vector3(0, 0, 0);
      this.isGrounded = true;
      this.currentGround = null;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.hasJumpedThisAir = false;

      // Camera Orbit
      this.cameraYaw = Math.PI;
      this.cameraPitch = 0.28;
      this.cameraDist = 6.8;

      // Input
      this.keys = {};
      this.joystick = { x: 0, y: 0, active: false };
      this.isMouseDown = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;

      // Scratch Vectors for Zero-Allocation Hot Loops
      this._vWishDir = new THREE.Vector3();
      this._vForward = new THREE.Vector3();
      this._vRight = new THREE.Vector3();
      this._vLocalPlayer = new THREE.Vector3();
      this._camTarget = new THREE.Vector3();

      // Setup Three.js scene & load level
      this.initThree();

      this.towerBuilder = new window.TowerBuilder(this.scene);
      const level = this.towerBuilder.build();
      this.platforms = level.platforms;
      this.hazards = level.hazards;
      this.launchPads = level.launchPads;
      this.vanishingBlocks = level.vanishingBlocks;
      this.movingPlatforms = level.movingPlatforms;
      this.spinningBeams = level.spinningBeams;
      this.laserFences = level.laserFences;
      this.coinsObjects = level.coinsObjects;
      this.checkpoints = level.checkpoints;
      this.trophyGroup = level.trophyGroup;
      this.confettiParticles = level.confettiParticles;

      // Controls & UI
      this.initControls();
      this.initUI();

      // Teleport player to initial floor checkpoint
      this.respawn(1);

      // Start timer & animation loop
      this.startTimer();
      this.lastFrameTime = performance.now();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    // --- THREE.JS INITIALIZATION ---
    initThree() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0f172a);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);

      this.camera = new THREE.PerspectiveCamera(
        62,
        window.innerWidth / window.innerHeight,
        0.1,
        350
      );

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // Cap pixelRatio to 1.5 on mobile to avoid GPU thermal throttling and fillrate bottlenecks
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;

      // Lighting
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
      this.character = new window.CharacterRig();
      this.scene.add(this.character.group);

      // Window resize listener
      try {
        const onResize = () => this.triggerMultiPassResize();
        window.addEventListener('resize', onResize);
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', onResize);
        }
      } catch (err) {
        console.warn('Resize listener setup warning:', err);
      }
    }

    // --- TIME ACCUMULATION & PAUSE/RESUME ---
    startTimer() {
      this.accumulatedTime = 0;
      this.activeTimerStart = performance.now();
      this.timerRunning = true;
    }

    getElapsedTime() {
      let total = this.accumulatedTime;
      if (this.timerRunning && !this.isPaused && this.activeTimerStart !== null) {
        total += (performance.now() - this.activeTimerStart) / 1000;
      }
      return total;
    }

    pauseTimer() {
      if (this.timerRunning && !this.isPaused && this.activeTimerStart !== null) {
        this.accumulatedTime += (performance.now() - this.activeTimerStart) / 1000;
        this.activeTimerStart = null;
      }
    }

    resumeTimer() {
      if (this.timerRunning && this.activeTimerStart === null) {
        this.activeTimerStart = performance.now();
      }
    }

    pauseGame() {
      if (this.isPaused) return;
      this.isPaused = true;
      this.pauseTimer();
      this.sound.setAdMuted(true);
    }

    resumeGame() {
      if (!this.isPaused) return;
      this.isPaused = false;
      this.resumeTimer();
      this.sound.setAdMuted(false);
      this.lastFrameTime = performance.now();
    }

    pauseForAd() {
      this.pauseGame();
    }

    resumeAfterAd() {
      this.resumeGame();
    }

    // --- FULL RESET GAME (Fixes Victory Restart Bug) ---
    resetGame() {
      this.isWon = false;
      this.isPaused = false;
      this.currentFloor = 1;
      this.deaths = 0;
      this.coins = 0;

      // Reset timer
      this.accumulatedTime = 0;
      this.activeTimerStart = performance.now();
      this.timerRunning = true;

      // Reset HUD
      if (this.floorDisplay) this.floorDisplay.textContent = `ЭТАЖ 1 / ${this.maxFloor}`;
      if (this.coinsDisplay) this.coinsDisplay.textContent = '0';
      if (this.timerDisplay) this.timerDisplay.textContent = '00:00.0';

      // Restore Skip Floor button
      const skipBtn = document.getElementById('skip-btn');
      if (skipBtn) skipBtn.style.display = 'inline-flex';

      // Hide victory modal & restore double coins button
      const victoryModal = document.getElementById('victory-modal');
      if (victoryModal) victoryModal.classList.remove('active');

      const doubleBtn = document.getElementById('double-coins-btn');
      if (doubleBtn) {
        doubleBtn.disabled = false;
        doubleBtn.textContent = '🎁 Удвоить Монеты (x2) (+📺)';
      }

      // Reset world coins
      for (let i = 0; i < this.coinsObjects.length; i++) {
        this.coinsObjects[i].collected = false;
        this.coinsObjects[i].mesh.visible = true;
      }

      // Hide victory confetti
      for (let i = 0; i < this.confettiParticles.length; i++) {
        this.confettiParticles[i].visible = false;
      }

      // Teleport player to Floor 1
      this.respawn(1);
    }

    // --- PROGRESSION & CHECKPOINTS ---
    advanceFloor(floorNum, isSkipped = false) {
      this.currentFloor = floorNum;
      this.floorDisplay.textContent = `ЭТАЖ ${floorNum} / ${this.maxFloor}`;

      // Toast notification
      this.floorToast.textContent = `ЭТАЖ ${floorNum}`;
      this.floorToast.classList.add('show');
      setTimeout(() => this.floorToast.classList.remove('show'), 2200);

      if (!isSkipped) {
        this.sound.playCheckpoint();
      }

      if (isSkipped) {
        this.respawn(floorNum);
      }

      if (this.currentFloor >= this.maxFloor) {
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) skipBtn.style.display = 'none';
      }

      // Interstitial Ad between floors (e.g. floors 4, 8, 12, 16 with cooldown)
      if (
        !isSkipped &&
        floorNum > 1 &&
        (floorNum - 1) % window.TOWER_CONFIG.ADS.INTERSTITIAL_FLOOR_INTERVAL === 0
      ) {
        this.bridge.showFloorCompletedAd(floorNum);
      }
    }

    respawn(floorNum = this.currentFloor) {
      const cp = this.checkpoints[floorNum - 1];
      if (cp) {
        this.playerPos.copy(cp.pos);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.hasJumpedThisAir = false;

        // Centralized calculation replaces magic numbers
        const cpAngle = window.TOWER_CONFIG.getFloorBaseAngle(floorNum);
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
      const elapsedSec = this.getElapsedTime();
      this.pauseTimer();
      this.sound.playWin();

      // Show confetti
      for (let i = 0; i < this.confettiParticles.length; i++) {
        this.confettiParticles[i].visible = true;
      }

      // Check Best Time
      if (!this.bestTime || elapsedSec < this.bestTime) {
        this.bestTime = elapsedSec;
      }
      this.bridge.saveProgress(this.bestTime, this.coins);
      this.bridge.showWinAd();

      // Format time
      const m = Math.floor(elapsedSec / 60);
      const s = (elapsedSec % 60).toFixed(1);
      const timeStr = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

      const bm = Math.floor(this.bestTime / 60);
      const bs = (this.bestTime % 60).toFixed(1);
      const bestStr = `${bm < 10 ? '0' : ''}${bm}:${bs < 10 ? '0' : ''}${bs}`;

      // Populate victory modal stats
      document.getElementById('final-time').textContent = timeStr;
      document.getElementById('final-coins').textContent = `${this.coins} / ${this.coinsObjects.length}`;
      document.getElementById('final-deaths').textContent = this.deaths;
      document.getElementById('best-time').textContent = bestStr;

      // Show Victory Modal
      document.getElementById('victory-modal').classList.add('active');
    }

    // --- CONTROLS & INPUT ---
    initControls() {
      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
        if (e.code === 'KeyR') {
          this.respawn(this.currentFloor);
        }
        if (e.code === 'Space') {
          this.triggerJump();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      // Mouse Orbit
      this.canvas.addEventListener('mousedown', (e) => {
        this.sound.ensureContext();
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

      // Touch Controls (Dynamic Floating Joystick on Left Half, Camera Orbit on Right Half)
      let touchCamId = null;
      let lastTouchX = 0;
      let lastTouchY = 0;

      const joyZone = document.getElementById('joystick-zone');
      const joyKnob = document.getElementById('joystick-knob');
      let joyTouchId = null;
      let joyCenter = { x: 0, y: 0 };

      const isTopOrActionUI = (el) => {
        if (!el) return false;
        const node = el.nodeType === 3 ? el.parentElement : el;
        if (!node || typeof node.closest !== 'function') return false;
        return !!(
          node.closest('.top-header') ||
          node.closest('.modal-card') ||
          node.closest('.action-btn')
        );
      };

      window.addEventListener(
        'touchstart',
        (e) => {
          this.sound.ensureContext();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (isTopOrActionUI(t.target)) continue;

            const isLeftHalf = t.clientX < window.innerWidth * 0.5;

            if (isLeftHalf) {
              if (joyTouchId === null && joyZone && joyKnob) {
                joyTouchId = t.identifier;
                joyCenter = { x: t.clientX, y: t.clientY };
                const halfW = (joyZone.offsetWidth || 130) / 2;
                joyZone.style.bottom = 'auto';
                joyZone.style.left = (t.clientX - halfW) + 'px';
                joyZone.style.top = (t.clientY - halfW) + 'px';
                joyZone.classList.add('active');
                this.updateJoystick(t.clientX, t.clientY, joyCenter, joyKnob, joyZone);
              }
            } else {
              if (touchCamId === null) {
                touchCamId = t.identifier;
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
              }
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
            if (t.identifier === joyTouchId) {
              if (e.cancelable) e.preventDefault();
              this.updateJoystick(t.clientX, t.clientY, joyCenter, joyKnob, joyZone);
            } else if (t.identifier === touchCamId) {
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

      const handleTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joyTouchId) {
            joyTouchId = null;
            this.joystick = { x: 0, y: 0, active: false };
            if (joyKnob) joyKnob.style.transform = 'translate(-50%, -50%)';
            if (joyZone) {
              joyZone.classList.remove('active');
              joyZone.style.bottom = '';
              joyZone.style.left = '';
              joyZone.style.top = '';
            }
          }
          if (t.identifier === touchCamId) {
            touchCamId = null;
          }
        }
      };
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      // Jump Button (Mobile)
      const jumpBtn = document.getElementById('m-jump-btn');
      if (jumpBtn) {
        jumpBtn.addEventListener('touchstart', (e) => {
          this.sound.ensureContext();
          if (e.cancelable) e.preventDefault();
          this.triggerJump();
        });
      }

      // Respawn Button (Mobile)
      const respBtn = document.getElementById('m-respawn-btn');
      if (respBtn) {
        respBtn.addEventListener('touchstart', (e) => {
          this.sound.ensureContext();
          if (e.cancelable) e.preventDefault();
          this.respawn(this.currentFloor);
        });
      }
    }

    updateJoystick(cx, cy, center, knobEl, zoneEl) {
      const maxDist = 48;
      let dx = cx - center.x;
      let dy = cy - center.y;
      const dist = Math.hypot(dx, dy);

      // Smooth follow if thumb drifts
      if (dist > maxDist * 1.35) {
        const pull = dist - maxDist * 1.35;
        center.x += (dx / dist) * pull;
        center.y += (dy / dist) * pull;
        if (zoneEl) {
          const halfW = (zoneEl.offsetWidth || 130) / 2;
          zoneEl.style.bottom = 'auto';
          zoneEl.style.left = (center.x - halfW) + 'px';
          zoneEl.style.top = (center.y - halfW) + 'px';
        }
        dx = cx - center.x;
        dy = cy - center.y;
      }

      let clampedDx = dx;
      let clampedDy = dy;
      if (dist > maxDist) {
        clampedDx = (dx / dist) * maxDist;
        clampedDy = (dy / dist) * maxDist;
      }

      if (knobEl) {
        knobEl.style.transform = `translate(calc(-50% + ${clampedDx}px), calc(-50% + ${clampedDy}px))`;
      }
      this.joystick = {
        x: clampedDx / maxDist,
        y: clampedDy / maxDist,
        active: true
      };
    }

    triggerJump() {
      // Jump buffer: store request for 0.15s
      this.jumpBufferTimer = window.TOWER_CONFIG.PLAYER.JUMP_BUFFER;

      // Immediate jump if grounded or inside coyote time
      if (this.isGrounded || (this.coyoteTimer > 0 && !this.hasJumpedThisAir)) {
        this.executeJump();
      }
    }

    executeJump() {
      this.playerVel.y = window.TOWER_CONFIG.PLAYER.JUMP_FORCE;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.hasJumpedThisAir = true;
      this.sound.playJump();
    }

    // --- UI & MODALS ---
    initUI() {
      this.floorDisplay = document.getElementById('floor-display');
      this.timerDisplay = document.getElementById('timer-display');
      this.coinsDisplay = document.getElementById('coins-display');
      this.floorToast = document.getElementById('floor-toast');

      // Fullscreen toggle button
      const fsBtn = document.getElementById('fullscreen-btn');
      if (fsBtn) {
        const handleFsToggle = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          this.sound.ensureContext();
          this.toggleFullscreen();
        };
        fsBtn.addEventListener('click', handleFsToggle);
        fsBtn.addEventListener('touchend', handleFsToggle);
      }

      const updateFsBtnState = () => {
        const isFs = this.isFullscreen();
        const icon = document.querySelector('#fullscreen-btn .btn-icon');
        const text = document.querySelector('#fullscreen-btn .btn-label');
        if (icon) icon.textContent = isFs ? '🗗' : '⛶';
        if (text) text.textContent = isFs ? 'Окно' : 'Экран';

        if (isFs) {
          this.lockLandscape();
        } else {
          this.unlockOrientation();
        }
      };

      document.addEventListener('fullscreenchange', updateFsBtnState);
      document.addEventListener('webkitfullscreenchange', updateFsBtnState);
      document.addEventListener('mozfullscreenchange', updateFsBtnState);
      document.addEventListener('MSFullscreenChange', updateFsBtnState);

      // Skip Floor (Rewarded Ad integration)
      const skipBtn = document.getElementById('skip-btn');
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          if (this.currentFloor < this.maxFloor) {
            this.bridge.showRewarded('skip_floor', () => {
              this.advanceFloor(this.currentFloor + 1, true);
            });
          }
        });
      }

      // Double Coins (Rewarded Ad in Victory Modal)
      const doubleBtn = document.getElementById('double-coins-btn');
      if (doubleBtn) {
        doubleBtn.addEventListener('click', () => {
          this.bridge.showRewarded('unlock_skin', () => {
            this.coins *= 2;
            this.sound.playCoin();
            if (this.coinsDisplay) this.coinsDisplay.textContent = this.coins;
            const finalCoinsEl = document.getElementById('final-coins');
            if (finalCoinsEl) finalCoinsEl.textContent = `${this.coins} (x2!)`;
            doubleBtn.disabled = true;
            doubleBtn.textContent = '✅ Монеты удвоены!';
            this.bridge.saveProgress(this.bestTime, this.coins);
          });
        });
      }

      // Restart Game button in Victory Modal
      const restartBtn = document.getElementById('restart-game-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          this.sound.ensureContext();
          this.resetGame();
        });
      }
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
            await req.call(el);
          } catch (err) {
            console.warn('Fullscreen request rejected by browser:', err);
          }
        }
      }

      await this.lockLandscape();
      this.triggerMultiPassResize();
    }

    async lockLandscape() {
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (err) {
        console.warn('Screen orientation lock notice:', err);
      }
    }

    unlockOrientation() {
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) {}
    }

    toggleFullscreen() {
      if (this.isFullscreen()) {
        this.manualExitedFullscreen = true;
        const doc = document;
        const exit =
          doc.exitFullscreen ||
          doc.webkitExitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.msExitFullscreen;
        if (exit) {
          try {
            exit.call(doc);
          } catch (e) {}
        }
        this.unlockOrientation();
      } else {
        this.manualExitedFullscreen = false;
        this.enterFullscreenLandscape();
      }
      this.triggerMultiPassResize();
    }

    triggerMultiPassResize() {
      const doResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (this.camera && this.renderer) {
          this.camera.aspect = w / h;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(w, h);
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        }
      };

      doResize();
      setTimeout(doResize, 100);
      setTimeout(doResize, 350);
      setTimeout(doResize, 800);
    }

    // --- PHYSICS ENGINE & SUBSTEPPING (No Tunneling) ---
    updatePhysics(dt) {
      if (this.isPaused) return;

      // Substep physics loop to prevent tunneling through platforms at high speeds (up to 38 m/s)
      const maxSubDt = 0.016; // ~60fps step
      const numSteps = Math.min(4, Math.max(1, Math.ceil(dt / maxSubDt)));
      const subDt = dt / numSteps;

      for (let s = 0; s < numSteps; s++) {
        this.substepPhysics(subDt);
      }
    }

    substepPhysics(dt) {
      const cfg = window.TOWER_CONFIG;

      // 1. Process Buffered Jump & Coyote Time
      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer -= dt;
      }

      if (this.isGrounded) {
        this.coyoteTimer = cfg.PLAYER.COYOTE_TIME;
        this.hasJumpedThisAir = false;
      } else {
        this.coyoteTimer -= dt;
      }

      if (this.jumpBufferTimer > 0 && (this.isGrounded || (this.coyoteTimer > 0 && !this.hasJumpedThisAir))) {
        this.executeJump();
      }

      // 2. Read Inputs
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

      // 3. Transform input relative to camera yaw (using scratch vectors, 0 allocations)
      const len = Math.hypot(moveX, moveZ);
      const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
      const maxSpeed = isSprinting ? cfg.PLAYER.SPRINT_SPEED : cfg.PLAYER.WALK_SPEED;

      this._vForward.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      this._vRight.set(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

      this._vWishDir.set(0, 0, 0);
      if (len > 0.05) {
        const norm = Math.max(1, len);
        this._vWishDir.addScaledVector(this._vRight, moveX / norm);
        this._vWishDir.addScaledVector(this._vForward, -moveZ / norm);
      }

      // 4. Horizontal acceleration & ice physics
      const isOnIce = !!(this.currentGround && this.currentGround.isIce);
      const targetVx = this._vWishDir.x * maxSpeed;
      const targetVz = this._vWishDir.z * maxSpeed;

      if (this.isGrounded) {
        if (isOnIce) {
          if (len > 0.05) {
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, 3.2 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, 3.2 * dt);
          } else {
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, 0, 0.40 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, 0, 0.40 * dt);
          }
        } else {
          if (len > 0.05) {
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, 45.0 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, 45.0 * dt);
          } else {
            this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, 0, 24.0 * dt);
            this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, 0, 24.0 * dt);
          }
        }
      } else {
        // Airborne preservation of jump/slide momentum
        if (len > 0.05) {
          this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, 5.0 * dt);
          this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, 5.0 * dt);
        } else {
          this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, 0, 0.15 * dt);
          this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, 0, 0.15 * dt);
        }
      }

      // 5. Gravity & Vertical Velocity
      const oldY = this.playerPos.y;
      this.playerVel.y -= cfg.PLAYER.GRAVITY * dt;
      if (this.playerVel.y < -cfg.PLAYER.MAX_FALL_SPEED) {
        this.playerVel.y = -cfg.PLAYER.MAX_FALL_SPEED;
      }

      // Apply horizontal position
      this.playerPos.x += this.playerVel.x * dt;
      this.playerPos.z += this.playerVel.z * dt;

      // Predict new vertical position
      const newY = oldY + this.playerVel.y * dt;
      this.playerPos.y = newY;

      // 6. Swept Vertical Collision with Platforms
      const wasInAir = !this.isGrounded;
      const prevVelY = this.playerVel.y;
      this.isGrounded = false;
      this.currentGround = null;

      const px = this.playerPos.x;
      const pz = this.playerPos.z;

      for (let i = 0; i < this.platforms.length; i++) {
        const plat = this.platforms[i];

        // Horizontal AABB check
        if (
          px + cfg.PLAYER.RADIUS > plat.min.x &&
          px - cfg.PLAYER.RADIUS < plat.max.x &&
          pz + cfg.PLAYER.RADIUS > plat.min.z &&
          pz - cfg.PLAYER.RADIUS < plat.max.z
        ) {
          // Swept landing check: was player feet at or above plat.max.y and now at or below plat.max.y?
          if (
            this.playerVel.y <= 0 &&
            oldY >= plat.max.y - 0.25 &&
            newY <= plat.max.y + 0.35
          ) {
            this.playerPos.y = plat.max.y;
            this.playerVel.y = 0;
            this.isGrounded = true;
            this.currentGround = plat;

            // Ice Landing Momentum
            if (plat.isIce && wasInAir) {
              const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
              if (horizSpeed > 0.4) {
                const impactFactor = Math.min(1.25, 1.05 + Math.abs(prevVelY) * 0.015);
                this.playerVel.x *= impactFactor;
                this.playerVel.z *= impactFactor;
              } else if (this._vWishDir.lengthSq() > 0.001) {
                this.playerVel.x = this._vWishDir.x * maxSpeed * 0.85;
                this.playerVel.z = this._vWishDir.z * maxSpeed * 0.85;
              } else {
                this.playerVel.x += this._vForward.x * 2.8;
                this.playerVel.z += this._vForward.z * 2.8;
              }
            }

            // Checkpoints & Summit
            if (plat.tag && plat.tag.startsWith('checkpoint_')) {
              const floorNum = parseInt(plat.tag.split('_')[1], 10);
              if (floorNum > this.currentFloor) {
                this.advanceFloor(floorNum, false);
              }
            } else if (plat.tag === 'summit_pad') {
              this.triggerVictory();
            }
            break;
          }
        }
      }

      // 7. Launch Pads
      for (let i = 0; i < this.launchPads.length; i++) {
        const pad = this.launchPads[i];
        if (
          px + cfg.PLAYER.RADIUS > pad.min.x &&
          px - cfg.PLAYER.RADIUS < pad.max.x &&
          pz + cfg.PLAYER.RADIUS > pad.min.z &&
          pz - cfg.PLAYER.RADIUS < pad.max.z &&
          Math.abs(this.playerPos.y - pad.max.y) < 0.45
        ) {
          this.playerVel.y = pad.force;
          this.isGrounded = false;
          this.sound.playBounce();
        }
      }

      // 8. Vanishing Blocks
      for (let i = 0; i < this.vanishingBlocks.length; i++) {
        const vb = this.vanishingBlocks[i];
        if (this.currentGround === vb.plat && vb.active && !vb.stepped) {
          vb.stepped = true;
          vb.steppedTime = performance.now();
        }
      }

      // 9. Static Hazards
      const pyMin = this.playerPos.y;
      const pyMax = this.playerPos.y + cfg.PLAYER.HEIGHT;
      for (let i = 0; i < this.hazards.length; i++) {
        const h = this.hazards[i];
        if (
          px + cfg.PLAYER.RADIUS > h.min.x &&
          px - cfg.PLAYER.RADIUS < h.max.x &&
          pyMax > h.min.y &&
          pyMin < h.max.y &&
          pz + cfg.PLAYER.RADIUS > h.min.z &&
          pz - cfg.PLAYER.RADIUS < h.max.z
        ) {
          this.onDeath();
          return;
        }
      }

      // 10. Spinning Beams (Zero allocations via _vLocalPlayer)
      for (let i = 0; i < this.spinningBeams.length; i++) {
        const sb = this.spinningBeams[i];
        this._vLocalPlayer.copy(this.playerPos);
        sb.group.worldToLocal(this._vLocalPlayer);

        if (this._vLocalPlayer.y >= 0.10 || this._vLocalPlayer.y + cfg.PLAYER.HEIGHT <= -0.14) {
          continue;
        }

        const halfL = sb.length / 2;
        const clampedX = Math.max(-halfL, Math.min(halfL, this._vLocalPlayer.x));
        const distX = this._vLocalPlayer.x - clampedX;
        const distZ = this._vLocalPlayer.z;
        if (distX * distX + distZ * distZ < 0.38 * 0.38) {
          this.onDeath();
          return;
        }
      }

      // 11. Laser Fences (Zero allocations via _vLocalPlayer)
      for (let i = 0; i < this.laserFences.length; i++) {
        const lf = this.laserFences[i];
        if (lf.state !== 'on') continue;

        this._vLocalPlayer.copy(this.playerPos);
        lf.group.worldToLocal(this._vLocalPlayer);

        // Jumped over hurdle
        if (this._vLocalPlayer.y >= 0.3 + lf.height - 0.05) continue;
        if (this._vLocalPlayer.y + cfg.PLAYER.HEIGHT <= 0.3) continue;

        const halfW = lf.width / 2;
        if (Math.abs(this._vLocalPlayer.x) <= halfW + 0.15) {
          if (Math.abs(this._vLocalPlayer.z) < 0.35) {
            this.onDeath();
            return;
          }
        }
      }

      // 12. Coin Pickups (Zero allocations, squared distance)
      for (let i = 0; i < this.coinsObjects.length; i++) {
        const c = this.coinsObjects[i];
        if (!c.collected && this.playerPos.distanceToSquared(c.mesh.position) < 1.44) {
          c.collected = true;
          c.mesh.visible = false;
          this.coins++;
          this.sound.playCoin();
          if (this.coinsDisplay) this.coinsDisplay.textContent = this.coins;
        }
      }

      // 13. Fall Abyss Recovery (below -8m)
      if (this.playerPos.y < -8.0) {
        this.onDeath();
      }
    }

    // --- GAME LOOP & UPDATES ---
    animate() {
      requestAnimationFrame(this.animate);

      const now = performance.now();
      let dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      if (dt > 0.08) dt = 0.08; // Cap delta time against browser hangs

      if (!this.isPaused) {
        this.updatePhysics(dt);
        this.updateObstacles(dt);
        this.updateCharacter(dt);
        this.updateCamera();
        this.updateUI();
      }

      this.renderer.render(this.scene, this.camera);
    }

    updateCharacter(dt) {
      this.character.group.position.copy(this.playerPos);

      // Look direction
      if (Math.hypot(this.playerVel.x, this.playerVel.z) > 0.2) {
        const targetAngle = Math.atan2(this.playerVel.x, this.playerVel.z);
        let diff = targetAngle - this.character.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.character.group.rotation.y += diff * 12.0 * dt;
      }

      const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      this.character.updateAnimation(horizSpeed, this.isGrounded, dt);
    }

    updateObstacles(dt) {
      const now = performance.now();

      // Spinning Beams
      for (let i = 0; i < this.spinningBeams.length; i++) {
        const sb = this.spinningBeams[i];
        sb.angle += sb.speed * dt;
        sb.group.rotation.y = sb.angle;
      }

      // Moving Platforms
      for (let i = 0; i < this.movingPlatforms.length; i++) {
        const mp = this.movingPlatforms[i];
        const offset = Math.sin(now * 0.001 * mp.speed + mp.phase) * mp.amplitude;

        const dx = -Math.sin(mp.plat.pos.x) * offset;
        const dz = Math.cos(mp.plat.pos.z) * offset;

        mp.plat.mesh.position.x = mp.origin.x + dx;
        mp.plat.mesh.position.z = mp.origin.z + dz;

        mp.plat.min.x = mp.plat.mesh.position.x - mp.plat.size.x / 2;
        mp.plat.max.x = mp.plat.mesh.position.x + mp.plat.size.x / 2;
        mp.plat.min.z = mp.plat.mesh.position.z - mp.plat.size.z / 2;
        mp.plat.max.z = mp.plat.mesh.position.z + mp.plat.size.z / 2;

        if (this.currentGround === mp.plat) {
          this.playerPos.x += dx - mp.lastOffset.x;
          this.playerPos.z += dz - mp.lastOffset.z;
        }
        mp.lastOffset.set(dx, 0, dz);
      }

      // Vanishing Blocks
      for (let i = 0; i < this.vanishingBlocks.length; i++) {
        const vb = this.vanishingBlocks[i];
        if (vb.stepped && vb.active) {
          const elapsed = (now - vb.steppedTime) / 1000;
          if (elapsed >= vb.vanishDelay) {
            vb.active = false;
            vb.stepped = false;
            vb.reappearTime = now + vb.reappearDelay;
            vb.plat.mesh.visible = false;
            vb.plat.min.set(-9999, -9999, -9999);
            vb.plat.max.set(-9999, -9999, -9999);
            if (this.currentGround === vb.plat) {
              this.isGrounded = false;
              this.currentGround = null;
            }
          } else {
            vb.plat.mesh.material.opacity = Math.max(0.1, 1 - (elapsed / vb.vanishDelay) * 0.9);
          }
        } else if (!vb.active && now >= vb.reappearTime) {
          vb.active = true;
          vb.plat.mesh.visible = true;
          vb.plat.mesh.material.opacity = 1;
          const pos = vb.plat.pos;
          const sz = vb.plat.size;
          vb.plat.min.set(pos.x - sz.x / 2, pos.y - sz.y / 2, pos.z - sz.z / 2);
          vb.plat.max.set(pos.x + sz.x / 2, pos.y + sz.y / 2, pos.z + sz.z / 2);
        }
      }

      // Laser Fences
      for (let i = 0; i < this.laserFences.length; i++) {
        const lf = this.laserFences[i];
        if (lf.interval > 0) {
          lf.timer += dt;
          if (lf.timer >= lf.interval) {
            lf.timer = 0;
            lf.state = lf.state === 'on' ? 'off' : 'on';
            const isOn = lf.state === 'on';
            for (let r = 0; r < lf.railMeshes.length; r++) {
              lf.railMeshes[r].visible = isOn;
            }
            if (lf.gridMesh) lf.gridMesh.visible = isOn;
            if (lf.capMat) lf.capMat.color.setHex(isOn ? 0xff007f : 0x475569);
          }
        }
      }

      // Rotating Coins
      for (let i = 0; i < this.coinsObjects.length; i++) {
        const c = this.coinsObjects[i];
        if (!c.collected) {
          c.mesh.rotation.z += 2.5 * dt;
          c.mesh.position.y = c.startY + Math.sin(now * 0.003 + i) * 0.12;
        }
      }

      // Summit Trophy Spin
      if (this.trophyGroup) {
        this.trophyGroup.rotation.y += 0.8 * dt;
      }

      // Victory Confetti
      if (this.isWon) {
        for (let i = 0; i < this.confettiParticles.length; i++) {
          const p = this.confettiParticles[i];
          p.position.y += p.userData.vy;
          p.rotation.x += p.userData.rotSpeed;
          p.rotation.z += p.userData.rotSpeed;
          if (p.position.y < p.userData.baseY) {
            p.position.y = p.userData.baseY + 12;
          }
        }
      }
    }

    updateCamera() {
      // Zero allocations: write directly to _camTarget
      this._camTarget.set(this.playerPos.x, this.playerPos.y + 1.4, this.playerPos.z);

      const cx = this._camTarget.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist;
      const cy = this._camTarget.y + Math.sin(this.cameraPitch) * this.cameraDist;
      const cz = this._camTarget.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(this._camTarget);

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
      if (this.timerRunning && !this.isPaused) {
        const elapsed = this.getElapsedTime();
        const m = Math.floor(elapsed / 60);
        const s = (elapsed % 60).toFixed(1);
        if (this.timerDisplay) {
          this.timerDisplay.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        }
      }
    }
  }

  // Launch game reliably
  const launch = () => {
    if (!window.game) {
      window.game = new TowerGame();
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', launch);
    window.addEventListener('load', launch);
  } else {
    launch();
  }
})();
