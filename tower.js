/**
 * Tower of Obby 3D - Tower Generation & Level Builder Module
 */
(function() {
  'use strict';

  class TowerBuilder {
    constructor(scene) {
      this.scene = scene;
      this.platforms = [];
      this.hazards = [];
      this.launchPads = [];
      this.vanishingBlocks = [];
      this.movingPlatforms = [];
      this.spinningBeams = [];
      this.laserFences = [];
      this.coinsObjects = [];
      this.checkpoints = [];
      this.trophyGroup = null;
      this.confettiParticles = [];
    }

    build() {
      const cfg = window.TOWER_CONFIG;
      const FLOOR_HEIGHT = cfg.FLOOR_HEIGHT;
      const TOWER_RADIUS = cfg.RADIUS;
      const TOTAL_STEPS_PER_FLOOR = cfg.STEPS_PER_FLOOR;
      const OBSTACLES_PER_FLOOR = TOTAL_STEPS_PER_FLOOR - 1;
      const ANGLE_STEP = cfg.ANGLE_STEP;
      const HEIGHT_STEP = cfg.HEIGHT_STEP;

      // Outer aesthetic guide frame (pillars)
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 220, 12);
      const pillarMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(Math.cos(angle) * (TOWER_RADIUS + 4.5), 105, Math.sin(angle) * (TOWER_RADIUS + 4.5));
        this.scene.add(p);
      }

      // Lava abyss at ground zero
      const abyssGeo = new THREE.CircleGeometry(TOWER_RADIUS + 14, 32);
      const abyssMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const abyss = new THREE.Mesh(abyssGeo, abyssMat);
      abyss.rotation.x = -Math.PI / 2;
      abyss.position.y = -2;
      this.scene.add(abyss);
      this.addHazard(new THREE.Vector3(0, -1, 0), new THREE.Vector3(60, 1.5, 60));

      // 20 Floor Theme Definitions
      const floorThemes = [
        // Tier 1: Fundamentals (Floors 1-4)
        { name: 'Первые шаги', color: 0x22c55e, type: 'basic' },
        { name: 'Парящие диски', color: 0x059669, type: 'discs' },
        { name: 'Лавовые полосы', color: 0xeab308, type: 'lava' },
        { name: 'Лавовый крест', color: 0xf59e0b, type: 'lava_cross' },

        // Tier 2: Precision & Ice (Floors 5-8)
        { name: 'Хрупкий мост', color: 0xf97316, type: 'vanishing' },
        { name: 'Быстрый распад', color: 0xe11d48, type: 'fast_vanishing' },
        { name: 'Ледяные дорожки', color: 0x38bdf8, type: 'ice' },
        { name: 'Лед и лава', color: 0x0284c7, type: 'ice_lava' },

        // Tier 3: Springs & Movement (Floors 9-12)
        { name: 'Прыжковые батуты', color: 0xa855f7, type: 'bouncers' },
        { name: 'Супер-батуты', color: 0x9333ea, type: 'high_bouncers' },
        { name: 'Живые платформы', color: 0x06b6d4, type: 'moving' },
        { name: 'Встречный дрифт', color: 0x0891b2, type: 'fast_moving' },

        // Tier 4: Balance & Lasers (Floors 13-16)
        { name: 'Узкие тропы', color: 0x6366f1, type: 'narrow_beam' },
        { name: 'Микро-столбики', color: 0x4f46e5, type: 'micro_columns' },
        { name: 'Лазерные барьеры', color: 0xec4899, type: 'lasers' },
        { name: 'Бегущие лазеры', color: 0xdb2777, type: 'fast_lasers' },

        // Tier 5: The Master Run (Floors 17-20)
        { name: 'Вращающийся луч', color: 0xef4444, type: 'spinner' },
        { name: 'Двойные спиннеры', color: 0xdc2626, type: 'fast_spinner' },
        { name: 'Хрупкие лучи', color: 0xb91c1c, type: 'vanishing_spinner' },
        { name: 'Корона Башни', color: 0xfacc15, type: 'summit_rush' }
      ];

      for (let floorIdx = 0; floorIdx < cfg.TOTAL_FLOORS; floorIdx++) {
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

        // Checkpoint platform
        this.addPlatform(
          checkPos,
          new THREE.Vector3(4.8, 0.8, 4.8),
          theme.color,
          false,
          `checkpoint_${floorNum}`
        );

        // Archway
        this.createCheckpointArch(checkPos, theme.color, floorNum, theme.name, cpAngle);

        // Checkpoint Coin
        this.createCoin(checkPos.clone().add(new THREE.Vector3(0, 1.6, 0)));

        // Obstacles for current floor
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

      // Summit platform and trophy
      const summitStep = cfg.TOTAL_FLOORS * TOTAL_STEPS_PER_FLOOR;
      const summitAngle = summitStep * ANGLE_STEP;
      const summitY = summitStep * HEIGHT_STEP;
      const summitPos = new THREE.Vector3(
        Math.cos(summitAngle) * TOWER_RADIUS,
        summitY,
        Math.sin(summitAngle) * TOWER_RADIUS
      );
      this.createSummitTrophy(summitPos);

      return {
        platforms: this.platforms,
        hazards: this.hazards,
        launchPads: this.launchPads,
        vanishingBlocks: this.vanishingBlocks,
        movingPlatforms: this.movingPlatforms,
        spinningBeams: this.spinningBeams,
        laserFences: this.laserFences,
        coinsObjects: this.coinsObjects,
        checkpoints: this.checkpoints,
        trophyGroup: this.trophyGroup,
        confettiParticles: this.confettiParticles
      };
    }

    createCheckpointArch(pos, colorHex, floorNum, themeName, cpAngle) {
      const archGroup = new THREE.Group();
      archGroup.position.copy(pos);
      archGroup.rotation.y = -cpAngle;

      const pillarGeo = new THREE.BoxGeometry(0.35, 3.8, 0.35);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-2.0, 1.9, 0);
      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(2.0, 1.9, 0);

      const beamGeo = new THREE.BoxGeometry(4.4, 0.45, 0.45);
      const beamMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.6
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 3.8, 0);

      const ringGeo = new THREE.RingGeometry(1.2, 1.7, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.42, 0);

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

    buildStageObstacles(floorIdx, globalStep, theme, radius, angleStep, heightStep, obstaclesCount) {
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
          this.createCoin(pos.clone().add(new THREE.Vector3(0, 1.4, 0)));
        }

        switch (theme.type) {
          case 'basic': {
            this.addPlatform(pos, new THREE.Vector3(2.8, 0.6, 2.8), 0x22c55e);
            break;
          }
          case 'discs': {
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
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.6, 2.4), 0x475569);
            const hazardPos = pos.clone().add(new THREE.Vector3(0, 0.35, 0));
            this.addHazard(hazardPos, new THREE.Vector3(0.65, 0.25, 2.3));
            break;
          }
          case 'lava_cross': {
            this.addPlatform(pos, new THREE.Vector3(3.6, 0.6, 3.6), 0x1e293b);
            const crossCenter = pos.clone().add(new THREE.Vector3(0, 0.36, 0));
            this.addHazard(crossCenter, new THREE.Vector3(3.5, 0.32, 0.75), 0xff1100);
            this.addHazard(crossCenter, new THREE.Vector3(0.75, 0.32, 3.5), 0xff1100);
            const coreGeo = new THREE.BoxGeometry(0.8, 0.35, 0.8);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
            const coreMesh = new THREE.Mesh(coreGeo, coreMat);
            coreMesh.position.copy(crossCenter);
            this.scene.add(coreMesh);
            break;
          }
          case 'vanishing': {
            this.addVanishingBlock(pos, new THREE.Vector3(2.5, 0.5, 2.5), 0xf97316, 0.8, 2200);
            break;
          }
          case 'fast_vanishing': {
            this.addVanishingBlock(pos, new THREE.Vector3(2.2, 0.5, 2.2), 0xe11d48, 0.55, 2400);
            break;
          }
          case 'ice': {
            this.addPlatform(pos, new THREE.Vector3(2.7, 0.5, 2.7), 0x7dd3fc, true);
            break;
          }
          case 'ice_lava': {
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.5, 2.4), 0x0284c7, true);
            const hazardPos = pos.clone().add(new THREE.Vector3(0, 0.32, 0));
            this.addHazard(hazardPos, new THREE.Vector3(0.6, 0.25, 2.3));
            break;
          }
          case 'bouncers': {
            this.addLaunchPad(pos, new THREE.Vector3(2.5, 0.6, 2.5), 21.0);
            break;
          }
          case 'high_bouncers': {
            this.addLaunchPad(pos, new THREE.Vector3(2.2, 0.6, 2.2), 24.5);
            break;
          }
          case 'moving': {
            this.addMovingPlatform(pos, new THREE.Vector3(2.5, 0.6, 2.5), 0x06b6d4, curAngle, 2.0, 1.4);
            break;
          }
          case 'fast_moving': {
            const phase = curAngle + (i % 2) * Math.PI;
            this.addMovingPlatform(pos, new THREE.Vector3(2.3, 0.6, 2.3), 0x0891b2, phase, 2.6, 2.2);
            break;
          }
          case 'narrow_beam': {
            this.addPlatform(pos, new THREE.Vector3(1.1, 0.5, 3.2), 0x6366f1);
            break;
          }
          case 'micro_columns': {
            this.addPlatform(pos, new THREE.Vector3(1.4, 0.6, 1.4), 0x4f46e5);
            break;
          }
          case 'lasers': {
            this.addPlatform(pos, new THREE.Vector3(3.0, 0.6, 3.0), 0x334155);
            this.addLaserFence(pos, 2.7, 0.85, forwardDir, 0, 0);
            break;
          }
          case 'fast_lasers': {
            this.addPlatform(pos, new THREE.Vector3(2.8, 0.6, 2.8), 0x1e293b);
            this.addLaserFence(pos, 2.5, 0.92, forwardDir, 1.2, (i % 3) * 0.4);
            break;
          }
          case 'spinner': {
            this.addPlatform(pos, new THREE.Vector3(3.4, 0.6, 3.4), 0x334155);
            this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.52, 0)), 3.2, 1.6);
            break;
          }
          case 'fast_spinner': {
            this.addPlatform(pos, new THREE.Vector3(3.2, 0.6, 3.2), 0x1e293b);
            this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.52, 0)), 3.0, 2.2);
            break;
          }
          case 'vanishing_spinner': {
            this.addVanishingBlock(pos, new THREE.Vector3(3.2, 0.5, 3.2), 0xd97706, 0.9, 2400);
            this.addSpinningBeam(pos.clone().add(new THREE.Vector3(0, 0.47, 0)), 3.0, 1.9);
            break;
          }
          case 'summit_rush': {
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
              this.addLaunchPad(pos, new THREE.Vector3(2.8, 0.6, 2.8), 24.0);
            }
            break;
          }
        }
      }
    }

    createSummitTrophy(summitPos) {
      this.addPlatform(summitPos, new THREE.Vector3(7.5, 1.2, 7.5), 0xfacc15, false, 'summit_pad');

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

      const rimGeo = new THREE.RingGeometry(radius * 0.72, radius * 0.95, 24);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7, side: THREE.DoubleSide });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(pos.x, pos.y + height / 2 + 0.02, pos.z);
      this.scene.add(rim);

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

      const hubGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.45, 16);
      const hubMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25
      });
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.castShadow = true;
      group.add(hub);

      const lightGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.y = 0.26;
      group.add(light);

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

      const floorY = 0.3;
      const halfW = width / 2;

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

      const capGeo = new THREE.SphereGeometry(0.12, 14, 14);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
      const leftCap = new THREE.Mesh(capGeo, capMat);
      leftCap.position.set(-halfW + postRadius, floorY + height + 0.04, 0);
      group.add(leftCap);

      const rightCap = new THREE.Mesh(capGeo, capMat);
      rightCap.position.set(halfW - postRadius, floorY + height + 0.04, 0);
      group.add(rightCap);

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
        angle: typeof forwardDir === 'number' ? forwardDir : 0,
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
  }

  window.TowerBuilder = TowerBuilder;
})();
