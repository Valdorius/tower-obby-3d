/**
 * Tower of Obby 3D - 3D Character Model & Skeletal Rig
 */
(function() {
  'use strict';

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

      // Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.04);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.13, 0.05, 0.24);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.13, 0.05, 0.24);
      this.head.add(leftEye, rightEye);

      // Limbs creation helper
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
        // Jumping / Airborne pose
        this.leftArm.rotation.x = -1.2;
        this.rightArm.rotation.x = -1.2;
        this.leftLeg.rotation.x = 0.4;
        this.rightLeg.rotation.x = -0.3;
        this.torso.position.y = 0.95;
      } else {
        // Idle pose with smooth decay
        this.leftArm.rotation.x *= 0.85;
        this.rightArm.rotation.x *= 0.85;
        this.leftLeg.rotation.x *= 0.85;
        this.rightLeg.rotation.x *= 0.85;
        this.torso.position.y = 0.95;
      }
    }
  }

  window.CharacterRig = CharacterRig;
})();
