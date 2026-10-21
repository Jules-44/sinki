import * as THREE from 'three';

/**
 * Player — Authentic Late 90s / PS1 Faceted Low-Poly Adventurer.
 * Features:
 * - Faceted tapered polygonal anatomy (no Roblox toy boxes)
 * - Tapered athletic windbreaker with collar & retro block patterns
 * - Faceted snapback cap & neck headphones
 * - Segmented tapered polygonal limbs with elbow and knee contours
 * - Low-res pixel-art canvas textures with NearestFilter
 * - Procedural running and jumping animation
 */
export class Player {
  constructor(scene) {
    this.scene = scene;

    this.position = new THREE.Vector3(0, 2.38, -10);
    this.velocity = new THREE.Vector3();
    this.rotation = Math.PI; // Face down pier

    this.walkSpeed = 7.0;
    this.runSpeed = 13.5;
    this.zoomSpeed = 24.0;
    this.moveState = 'WALK'; // 'WALK' | 'RUN' | 'ZOOM' | 'IDLE'
    this.isDrivingQuad = false;

    this.jumpForce = 10.5;
    this.gravity = 25.0;
    this.isGrounded = true;

    // Bouncy Jump & Combo Tracker
    this.bounceCombo = 0; // 0: grounded idle, 1: 1st bounce, 2: 2nd bounce, 3: 3rd super bounce
    this.lastLandTime = 0;
    this.bounceWindow = 0.38; // 380ms window after landing to chain next bounce
    this.airTime = 0;
    this.squashStretch = new THREE.Vector3(1, 1, 1);

    // Knockback physics
    this.knockbackTimer = 0;

    this.animTime = 0;
    this.isMoving = false;

    // Hang Glider flight properties
    this.isGliding = false;
    this.gliderDeployProgress = 0;
    this.gliderBank = 0;
    this.gliderPitch = 0;

    // Low-poly dust particle pool for Zoom speed
    this.dustParticles = [];
    const dustGeo = new THREE.DodecahedronGeometry(0.12, 0);
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: 0xc4b294, transparent: true, opacity: 0.6 }));
      p.visible = false;
      this.scene.add(p);
      this.dustParticles.push({ mesh: p, life: 0, maxLife: 0.35 });
    }
    this.dustTimer = 0;

    this.mesh = new THREE.Group();
    this._buildFacetedPS1Model();
    this._buildHangGlider();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;
    this.scene.add(this.mesh);

    this.radius = 0.5;
    this.height = 1.8;
  }

  _createPixelTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (type === 'jacket') {
      // 90s Cyber-Coral Windbreaker with teal accent stripes and zip
      ctx.fillStyle = '#eb3467';
      ctx.fillRect(0, 0, 64, 64);

      // Geometric diagonal teal/cyan stripe
      ctx.fillStyle = '#2de2e6';
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(64, 40);
      ctx.lineTo(64, 48);
      ctx.lineTo(0, 24);
      ctx.fill();

      // Deep navy bottom hem
      ctx.fillStyle = '#16192b';
      ctx.fillRect(0, 54, 64, 10);

      // Center silver zipper
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(30, 0, 4, 54);
      ctx.fillStyle = '#888888';
      ctx.fillRect(31, 0, 2, 54);
    } else if (type === 'pants') {
      // Navy baggy cargo pants with seam shading and pocket lines
      ctx.fillStyle = '#1b2238';
      ctx.fillRect(0, 0, 64, 64);

      // Subtle pixel dither / seams
      ctx.fillStyle = '#121726';
      ctx.fillRect(0, 0, 4, 64);
      ctx.fillRect(60, 0, 4, 64);
      ctx.fillRect(16, 24, 32, 16); // cargo pocket
      ctx.fillStyle = '#263152';
      ctx.fillRect(18, 26, 28, 12);
    } else if (type === 'sneaker') {
      // Chunky white 90s runner sneaker with neon pink heel accent
      ctx.fillStyle = '#e8ecf2';
      ctx.fillRect(0, 0, 64, 64);
      // Dark rubber sole
      ctx.fillStyle = '#222633';
      ctx.fillRect(0, 50, 64, 14);
      // Neon accent swoosh/block
      ctx.fillStyle = '#ff2a7a';
      ctx.fillRect(8, 24, 48, 8);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; // Authentic sharp pixel filter
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  _buildFacetedPS1Model() {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0ad82, flatShading: true });
    const jacketTex = this._createPixelTexture('jacket');
    const jacketMat = new THREE.MeshLambertMaterial({ map: jacketTex, flatShading: true });
    const pantsTex = this._createPixelTexture('pants');
    const pantsMat = new THREE.MeshLambertMaterial({ map: pantsTex, flatShading: true });
    const shoeTex = this._createPixelTexture('sneaker');
    const shoeMat = new THREE.MeshLambertMaterial({ map: shoeTex, flatShading: true });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x161a29, flatShading: true });
    const cyanVisorMat = new THREE.MeshBasicMaterial({ color: 0x2de2e6 });

    // 1. Tapered Polygonal Torso (athletic inverted frustum)
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.72, 6);
    this.torso = new THREE.Mesh(torsoGeo, jacketMat);
    this.torso.position.y = 1.15;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Collar detail
    const collarGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.14, 6);
    const collar = new THREE.Mesh(collarGeo, darkMat);
    collar.position.y = 0.4;
    this.torso.add(collar);

    // 2. Head & Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 5), skinMat);
    neck.position.y = 1.55;
    this.mesh.add(neck);

    // 8-sided faceted head
    const headGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.32, 7);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.74;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // Backward snapback cap
    const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 7);
    const cap = new THREE.Mesh(capGeo, darkMat);
    cap.position.y = 0.12;
    this.head.add(cap);

    // Cap brim angled backwards
    const brimGeo = new THREE.BoxGeometry(0.26, 0.04, 0.18);
    const brim = new THREE.Mesh(brimGeo, darkMat);
    brim.position.set(0, 0.08, -0.18);
    brim.rotation.x = 0.2;
    this.head.add(brim);

    // Glowing cyan retro visor glasses
    const visorGeo = new THREE.BoxGeometry(0.28, 0.08, 0.06);
    const visor = new THREE.Mesh(visorGeo, cyanVisorMat);
    visor.position.set(0, 0.04, 0.17);
    this.head.add(visor);

    // DJ Headphones resting around neck
    const phoneGeo = new THREE.TorusGeometry(0.22, 0.04, 5, 10, Math.PI);
    const headphones = new THREE.Mesh(phoneGeo, darkMat);
    headphones.rotation.x = Math.PI / 2;
    headphones.position.set(0, 1.54, 0);
    this.mesh.add(headphones);

    // 3. Faceted Segmented Limbs
    // Left Arm
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.36, 1.42, 0);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.35, 5), jacketMat);
    upperArm.position.y = -0.17;
    upperArm.castShadow = true;
    this.leftArmPivot.add(upperArm);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.35, 5), skinMat);
    forearm.position.y = -0.48;
    forearm.castShadow = true;
    this.leftArmPivot.add(forearm);
    this.mesh.add(this.leftArmPivot);

    // Right Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.36, 1.42, 0);

    const rightUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.35, 5), jacketMat);
    rightUpper.position.y = -0.17;
    rightUpper.castShadow = true;
    this.rightArmPivot.add(rightUpper);

    const rightFore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.35, 5), skinMat);
    rightFore.position.y = -0.48;
    rightFore.castShadow = true;
    this.rightArmPivot.add(rightFore);
    this.mesh.add(this.rightArmPivot);

    // 4. Faceted Segmented Legs
    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.82, 0);

    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.42, 6), pantsMat);
    leftThigh.position.y = -0.21;
    leftThigh.castShadow = true;
    this.leftLegPivot.add(leftThigh);

    const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.42, 6), pantsMat);
    leftCalf.position.y = -0.58;
    leftCalf.castShadow = true;
    this.leftLegPivot.add(leftCalf);

    // Wedge low-poly runner shoe
    const leftShoeGeo = new THREE.BoxGeometry(0.18, 0.14, 0.36);
    const leftShoe = new THREE.Mesh(leftShoeGeo, shoeMat);
    leftShoe.position.set(0, -0.76, 0.06);
    leftShoe.castShadow = true;
    this.leftLegPivot.add(leftShoe);
    this.mesh.add(this.leftLegPivot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.82, 0);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.42, 6), pantsMat);
    rightThigh.position.y = -0.21;
    rightThigh.castShadow = true;
    this.rightLegPivot.add(rightThigh);

    const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.42, 6), pantsMat);
    rightCalf.position.y = -0.58;
    rightCalf.castShadow = true;
    this.rightLegPivot.add(rightCalf);

    const rightShoe = new THREE.Mesh(leftShoeGeo, shoeMat);
    rightShoe.position.set(0, -0.76, 0.06);
    rightShoe.castShadow = true;
    this.rightLegPivot.add(rightShoe);
    this.mesh.add(this.rightLegPivot);

    // Low-poly round ground shadow (added directly to scene so it stays on terrain when jumping)
    const shadowGeo = new THREE.CircleGeometry(0.52, 14);
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050711,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -4.0
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.035;
    this.scene.add(this.shadowMesh);
  }

  _buildHangGlider() {
    this.gliderGroup = new THREE.Group();
    this.gliderGroup.position.set(0, 1.82, 0.05);
    this.gliderGroup.visible = false;

    // Vibrant 90s aerodynamic sailcloth materials
    const sailYellowMat = new THREE.MeshLambertMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const sailPinkMat = new THREE.MeshLambertMaterial({
      color: 0xec4899,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const sailTealMat = new THREE.MeshLambertMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const frameMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b,
      flatShading: true
    });
    const barMat = new THREE.MeshLambertMaterial({
      color: 0x94a3b8,
      flatShading: true
    });

    // 1. Aerodynamic Delta Wing Sail Panels (Wingspan: ~4.4m, Sweep: ~48 deg)
    // Left Wing Main (Yellow)
    const leftSailGeo = new THREE.BufferGeometry();
    const leftVertices = new Float32Array([
      // Inner triangle: Nose -> Left Mid -> Keel Trailing Edge
      0.0, 0.0, 1.15,
      -1.2, -0.10, -0.9,
      0.0, 0.06, -0.8,

      // Outer triangle: Nose -> Left Wingtip -> Left Mid
      0.0, 0.0, 1.15,
      -2.2, -0.22, -1.05,
      -1.2, -0.10, -0.9
    ]);
    leftSailGeo.setAttribute('position', new THREE.BufferAttribute(leftVertices, 3));
    leftSailGeo.computeVertexNormals();
    const leftSail = new THREE.Mesh(leftSailGeo, sailYellowMat);
    this.gliderGroup.add(leftSail);

    // Right Wing Main (Yellow)
    const rightSailGeo = new THREE.BufferGeometry();
    const rightVertices = new Float32Array([
      // Inner triangle: Nose -> Keel Trailing Edge -> Right Mid
      0.0, 0.0, 1.15,
      0.0, 0.06, -0.8,
      1.2, -0.10, -0.9,

      // Outer triangle: Nose -> Right Mid -> Right Wingtip
      0.0, 0.0, 1.15,
      1.2, -0.10, -0.9,
      2.2, -0.22, -1.05
    ]);
    rightSailGeo.setAttribute('position', new THREE.BufferAttribute(rightVertices, 3));
    rightSailGeo.computeVertexNormals();
    const rightSail = new THREE.Mesh(rightSailGeo, sailYellowMat);
    this.gliderGroup.add(rightSail);

    // 2. Bold Magenta Chevron Racing Panels
    const leftChevronGeo = new THREE.BufferGeometry();
    const leftChevVerts = new Float32Array([
      -0.45, -0.04, 0.35,
      -1.75, -0.16, -1.0,
      -1.30, -0.11, -0.95,

      -0.45, -0.04, 0.35,
      -1.30, -0.11, -0.95,
      -0.25, -0.02, 0.55
    ]);
    leftChevronGeo.setAttribute('position', new THREE.BufferAttribute(leftChevVerts, 3));
    leftChevronGeo.computeVertexNormals();
    const leftChevron = new THREE.Mesh(leftChevronGeo, sailPinkMat);
    leftChevron.position.y += 0.005;
    this.gliderGroup.add(leftChevron);

    const rightChevronGeo = new THREE.BufferGeometry();
    const rightChevVerts = new Float32Array([
      0.45, -0.04, 0.35,
      1.30, -0.11, -0.95,
      1.75, -0.16, -1.0,

      0.45, -0.04, 0.35,
      0.25, -0.02, 0.55,
      1.30, -0.11, -0.95
    ]);
    rightChevronGeo.setAttribute('position', new THREE.BufferAttribute(rightChevVerts, 3));
    rightChevronGeo.computeVertexNormals();
    const rightChevron = new THREE.Mesh(rightChevronGeo, sailPinkMat);
    rightChevron.position.y += 0.005;
    this.gliderGroup.add(rightChevron);

    // 3. Electric Cyan Wingtips
    const leftTipGeo = new THREE.BufferGeometry();
    const leftTipVerts = new Float32Array([
      -1.75, -0.16, -0.65,
      -2.2, -0.22, -1.05,
      -1.85, -0.17, -1.02
    ]);
    leftTipGeo.setAttribute('position', new THREE.BufferAttribute(leftTipVerts, 3));
    leftTipGeo.computeVertexNormals();
    const leftTip = new THREE.Mesh(leftTipGeo, sailTealMat);
    leftTip.position.y += 0.006;
    this.gliderGroup.add(leftTip);

    const rightTipGeo = new THREE.BufferGeometry();
    const rightTipVerts = new Float32Array([
      1.75, -0.16, -0.65,
      1.85, -0.17, -1.02,
      2.2, -0.22, -1.05
    ]);
    rightTipGeo.setAttribute('position', new THREE.BufferAttribute(rightTipVerts, 3));
    rightTipGeo.computeVertexNormals();
    const rightTip = new THREE.Mesh(rightTipGeo, sailTealMat);
    rightTip.position.y += 0.006;
    this.gliderGroup.add(rightTip);

    // 4. Matte Aluminum Tubular Frame
    // Central Keel
    const keelGeo = new THREE.CylinderGeometry(0.028, 0.028, 2.05, 5);
    keelGeo.rotateX(Math.PI / 2);
    const keel = new THREE.Mesh(keelGeo, frameMat);
    keel.position.set(0, 0.02, 0.12);
    this.gliderGroup.add(keel);

    // Left Leading Edge Tube
    const leftEdgeGeo = new THREE.CylinderGeometry(0.028, 0.028, 2.7, 5);
    const leftEdge = new THREE.Mesh(leftEdgeGeo, frameMat);
    leftEdge.position.set(-1.08, -0.10, 0.02);
    leftEdge.rotation.y = -0.58;
    leftEdge.rotation.z = 0.09;
    leftEdge.rotation.x = Math.PI / 2;
    this.gliderGroup.add(leftEdge);

    // Right Leading Edge Tube
    const rightEdgeGeo = new THREE.CylinderGeometry(0.028, 0.028, 2.7, 5);
    const rightEdge = new THREE.Mesh(rightEdgeGeo, frameMat);
    rightEdge.position.set(1.08, -0.10, 0.02);
    rightEdge.rotation.y = 0.58;
    rightEdge.rotation.z = -0.09;
    rightEdge.rotation.x = Math.PI / 2;
    this.gliderGroup.add(rightEdge);

    // Crossbar
    const crossbarGeo = new THREE.CylinderGeometry(0.024, 0.024, 2.15, 5);
    crossbarGeo.rotateZ(Math.PI / 2);
    const crossbar = new THREE.Mesh(crossbarGeo, frameMat);
    crossbar.position.set(0, -0.07, -0.2);
    this.gliderGroup.add(crossbar);

    // Kingpost vertical mast
    const kingpostGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4);
    const kingpost = new THREE.Mesh(kingpostGeo, frameMat);
    kingpost.position.set(0, 0.24, 0.0);
    this.gliderGroup.add(kingpost);

    // 5. Control Bar (A-Frame) where player holds
    const aFrameGroup = new THREE.Group();
    // Left Down-tube
    const leftDownGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.60, 4);
    const leftDown = new THREE.Mesh(leftDownGeo, frameMat);
    leftDown.position.set(-0.16, -0.28, 0.05);
    leftDown.rotation.z = 0.32;
    aFrameGroup.add(leftDown);

    // Right Down-tube
    const rightDownGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.60, 4);
    const rightDown = new THREE.Mesh(rightDownGeo, frameMat);
    rightDown.position.set(0.16, -0.28, 0.05);
    rightDown.rotation.z = -0.32;
    aFrameGroup.add(rightDown);

    // Horizontal Base Control Bar (the grip bar!)
    const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.68, 5);
    gripGeo.rotateZ(Math.PI / 2);
    const gripBar = new THREE.Mesh(gripGeo, barMat);
    gripBar.position.set(0, -0.55, 0.06);
    aFrameGroup.add(gripBar);

    this.gliderGroup.add(aFrameGroup);

    // 6. Dynamic Wingtip Ribbon Streamers
    const ribbonGeo = new THREE.BoxGeometry(0.04, 0.01, 0.45);
    const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

    this.leftStreamer = new THREE.Mesh(ribbonGeo, ribbonMat);
    this.leftStreamer.position.set(-2.2, -0.22, -1.25);
    this.gliderGroup.add(this.leftStreamer);

    this.rightStreamer = new THREE.Mesh(ribbonGeo, ribbonMat);
    this.rightStreamer.position.set(2.2, -0.22, -1.25);
    this.gliderGroup.add(this.rightStreamer);

    this.mesh.add(this.gliderGroup);
  }

  update(dt, input, cameraYaw, world) {
    if (this.isDrivingQuad) {
      // While driving Quad Bike, transforms & seated posture are driven by QuadBike
      this.isGliding = false;
      if (this.gliderGroup) this.gliderGroup.visible = false;
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.rotation;
      if (this.shadowMesh) {
        this.shadowMesh.visible = false;
      }
      return;
    }

    // Surface elevation query to calculate height above ground
    const currentGroundY = world ? world.getGroundHeight(this.position.x, this.position.z, this.position.y) : 0;
    const heightAboveGround = this.position.y - currentGroundY;

    // Track airborne time vs grounded state
    if (!this.isGrounded) {
      this.airTime += dt;
    } else {
      this.airTime = 0;
      // Reset combo if grounded without bouncing for longer than bounce window
      if ((performance.now() - this.lastLandTime) / 1000 > this.bounceWindow) {
        this.bounceCombo = 0;
      }
    }

    // Check hang glider auto-deployment condition:
    // Glider should ONLY kick in if falling from a height drop greater than the biggest jump!
    // The 3rd super bounce apex is ~5.1m above takeoff.
    // Setting threshold to heightAboveGround > 6.8m ensures that all ground bounces (even the super jump)
    // NEVER deploy the hang glider. Glider ONLY deploys when leaping off high cliffs or towers!
    if (!this.isGrounded && !this.isDrivingQuad && this.knockbackTimer <= 0) {
      if (heightAboveGround > 6.8 && this.airTime > 0.45 && (this.velocity.y < -1.5 || input.isJump())) {
        this.isGliding = true;
      }
    }

    // ==========================================
    // 1. HANG GLIDER FLIGHT MODE
    // ==========================================
    if (this.isGliding) {
      this.moveState = 'GLIDE';
      this.gliderDeployProgress = Math.min(1.0, this.gliderDeployProgress + dt * 6.0);
      this.gliderGroup.visible = true;
      this.gliderGroup.scale.set(this.gliderDeployProgress, this.gliderDeployProgress, this.gliderDeployProgress);

      // Steering with A / D or Arrow Keys
      let turnRate = 0;
      if (input.isLeft()) turnRate -= 1.8;
      if (input.isRight()) turnRate += 1.8;
      this.rotation += turnRate * dt;

      // Banking roll into curves
      const targetBank = input.isLeft() ? -0.42 : (input.isRight() ? 0.42 : 0);
      this.gliderBank += (targetBank - this.gliderBank) * Math.min(1.0, dt * 5.0);

      // Pitch & Glide Speed:
      // Forward dives down faster for extra speed; Backward flares up to slow down
      let targetPitch = 0;
      let glideSpeed = 12.5; // m/s
      let targetDescent = -2.0; // gentle slow descent m/s

      if (input.isForward()) {
        targetPitch = 0.22;
        glideSpeed = 16.5;
        targetDescent = -2.8;
      } else if (input.isBackward()) {
        targetPitch = -0.16;
        glideSpeed = 7.5;
        targetDescent = -1.2;
      }

      // Coastal Ridge Lift / Thermal updrafts along Eastern Sea Cliffs (x: 18 to 85, z: 15 to 115)
      if (this.position.x > 18 && this.position.x < 85 && this.position.z > 15 && this.position.z < 115 && this.position.y > 8) {
        // Marine sea breeze thermal updraft pushes glider upward
        targetDescent += 1.7; // Net descent -0.3 to +0.5 m/s (thermal soaring!)
      }

      this.gliderPitch += (targetPitch - this.gliderPitch) * Math.min(1.0, dt * 4.5);

      // Forward flight velocity vector
      this.velocity.x = Math.sin(this.rotation) * glideSpeed;
      this.velocity.z = Math.cos(this.rotation) * glideSpeed;

      // Smooth vertical descent
      this.velocity.y += (targetDescent - this.velocity.y) * Math.min(1.0, dt * 5.0);

      // Apply displacement
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.position.y += this.velocity.y * dt;

      // Resolve obstacle collisions in flight
      if (world && world.resolveCollisions) {
        world.resolveCollisions(this.position, this.radius, this.position.y);
      }

      // Check touchdown landing
      const landingHeight = world ? world.getGroundHeight(this.position.x, this.position.z, this.position.y) : 0;
      if (this.position.y <= landingHeight) {
        // Touchdown landing!
        this.position.y = landingHeight;
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.isGliding = false;
        this.gliderDeployProgress = 0;
        this.gliderGroup.visible = false;
        this.gliderBank = 0;
        this.gliderPitch = 0;

        // Reset upright posture
        this.mesh.rotation.z = 0;
        this.mesh.rotation.x = 0;
        this.torso.rotation.x = 0;
        this.head.rotation.x = 0;
        this.leftArmPivot.position.set(-0.36, 1.42, 0);
        this.rightArmPivot.position.set(0.36, 1.42, 0);
        this.leftArmPivot.rotation.set(0, 0, 0);
        this.rightArmPivot.rotation.set(0, 0, 0);
        this.leftLegPivot.rotation.set(0, 0, 0);
        this.rightLegPivot.rotation.set(0, 0, 0);
      } else {
        // Prone hang-gliding flight harness posture
        this.isGrounded = false;
        this.torso.rotation.x = -1.1 * this.gliderDeployProgress;
        this.head.rotation.x = 0.65 * this.gliderDeployProgress;
        this.leftArmPivot.position.set(-0.30, 1.48, 0.08);
        this.leftArmPivot.rotation.x = -1.25 * this.gliderDeployProgress;
        this.rightArmPivot.position.set(0.30, 1.48, 0.08);
        this.rightArmPivot.rotation.x = -1.25 * this.gliderDeployProgress;
        this.leftLegPivot.rotation.x = 0.22 * this.gliderDeployProgress;
        this.rightLegPivot.rotation.x = 0.22 * this.gliderDeployProgress;

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
        this.mesh.rotation.z = -this.gliderBank;
        this.mesh.rotation.x = this.gliderPitch;

        // Animate wingtip streamers in the air current
        this.animTime += dt;
        if (this.leftStreamer && this.rightStreamer) {
          const flutter = Math.sin(this.animTime * 22) * 0.12;
          this.leftStreamer.rotation.x = flutter;
          this.rightStreamer.rotation.x = -flutter;
        }
      }

      // Update ground shadow during flight
      if (this.shadowMesh) {
        const height = Math.max(0, this.position.y - landingHeight);
        this.shadowMesh.position.set(this.position.x, landingHeight + 0.035, this.position.z);
        const scale = Math.max(0.25, 1.2 - height * 0.04);
        this.shadowMesh.scale.set(scale, scale, scale);
        if (this.shadowMat) {
          this.shadowMat.opacity = Math.max(0.08, 0.45 - height * 0.02);
        }
      }

      return; // Gliding update complete
    }

    // ==========================================
    // 2. STANDARD GROUND / JUMPING MODE
    // ==========================================
    this.gliderGroup.visible = false;
    this.mesh.rotation.z = 0;
    this.mesh.rotation.x = 0;
    this.torso.rotation.x = 0;
    this.head.rotation.x = 0;
    this.leftArmPivot.position.set(-0.36, 1.42, 0);
    this.rightArmPivot.position.set(0.36, 1.42, 0);

    const moveDir = new THREE.Vector3();

    if (input.isForward()) moveDir.z -= 1;
    if (input.isBackward()) moveDir.z += 1;
    if (input.isLeft()) moveDir.x -= 1;
    if (input.isRight()) moveDir.x += 1;

    this.isMoving = moveDir.lengthSq() > 0.001;

    if (this.isMoving) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetRotation - this.rotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotation += diff * Math.min(1.0, dt * 14);

      // Determine movement speed and state
      let speed = this.walkSpeed;
      if (input.isZoom()) {
        speed = this.zoomSpeed;
        this.moveState = 'ZOOM';
      } else if (input.isSprint()) {
        speed = this.runSpeed;
        this.moveState = 'RUN';
      } else {
        speed = this.walkSpeed;
        this.moveState = 'WALK';
      }

      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
    } else {
      this.velocity.x *= Math.max(0, 1 - dt * 12);
      this.velocity.z *= Math.max(0, 1 - dt * 12);
      this.moveState = 'IDLE';
    }

    // 1. Horizontal movement delta
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // 2. Resolve horizontal collisions against solid obstacle walls & boulders
    if (world && world.resolveCollisions) {
      world.resolveCollisions(this.position, this.radius, this.position.y);
    }

    // 3. Jump trigger & Continuous Bouncing
    if (this.isGrounded && input.isJump() && this.knockbackTimer <= 0) {
      this._performBounce();
    }

    // 4. Gravity acceleration when airborne
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    // 5. Vertical movement
    this.position.y += this.velocity.y * dt;

    // 6. Surface collision query (terrain + tops of solid objects)
    const groundHeight = world ? world.getGroundHeight(this.position.x, this.position.z, this.position.y) : 0;
    const wasGrounded = this.isGrounded;
    if (this.position.y <= groundHeight) {
      this.position.y = groundHeight;
      this.velocity.y = 0;
      this.isGrounded = true;

      if (!wasGrounded) {
        this._onLanded(input);
      }
    } else if (wasGrounded && (this.position.y - groundHeight) < 0.4 && this.velocity.y <= 0) {
      // Smoothly stick to downward slopes without jittering into airborne state
      this.position.y = groundHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      // Airborne (falling off edge or jumping)
      this.isGrounded = false;
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // Apply squash and stretch scale & knockback tumbling
    this.squashStretch.x += (1.0 - this.squashStretch.x) * Math.min(1.0, dt * 14.0);
    this.squashStretch.y += (1.0 - this.squashStretch.y) * Math.min(1.0, dt * 14.0);
    this.squashStretch.z += (1.0 - this.squashStretch.z) * Math.min(1.0, dt * 14.0);
    this.mesh.scale.copy(this.squashStretch);

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
      this.mesh.rotation.x += dt * 8.0;
      this.mesh.rotation.z += dt * 6.0;
    }

    // Update ground shadow (stays on terrain surface even during high jumps)
    if (this.shadowMesh) {
      const heightAboveGround = Math.max(0, this.position.y - groundHeight);
      this.shadowMesh.position.set(this.position.x, groundHeight + 0.035, this.position.z);
      const scale = Math.max(0.35, 1.0 - heightAboveGround * 0.12);
      this.shadowMesh.scale.set(scale, scale, scale);
      if (this.shadowMat) {
        this.shadowMat.opacity = Math.max(0.12, 0.45 - heightAboveGround * 0.07);
      }
    }

    // Running / Walking animation
    if (this.isMoving && this.isGrounded) {
      const animSpeed = this.moveState === 'ZOOM' ? 25 : (this.moveState === 'RUN' ? 17 : 11);
      this.animTime += dt * animSpeed;

      const legAngle = Math.sin(this.animTime) * (this.moveState === 'ZOOM' ? 0.95 : 0.8);
      const armAngle = -Math.sin(this.animTime) * (this.moveState === 'ZOOM' ? 0.85 : 0.7);

      this.leftLegPivot.rotation.x = legAngle;
      this.rightLegPivot.rotation.x = -legAngle;
      this.leftArmPivot.rotation.x = armAngle;
      this.rightArmPivot.rotation.x = -armAngle;

      this.torso.position.y = 1.15 + Math.abs(Math.sin(this.animTime * 2)) * 0.06;
      this.head.position.y = 1.74 + Math.abs(Math.sin(this.animTime * 2)) * 0.06;
    } else {
      this.leftLegPivot.rotation.x *= 0.8;
      this.rightLegPivot.rotation.x *= 0.8;
      this.leftArmPivot.rotation.x *= 0.8;
      this.rightArmPivot.rotation.x *= 0.8;
      this.torso.position.y = 1.15;
      this.head.position.y = 1.74;
    }

    // Emit dust puffs when in ZOOM mode on ground
    if (this.moveState === 'ZOOM' && this.isMoving && this.isGrounded) {
      this.dustTimer += dt;
      if (this.dustTimer > 0.07) {
        this.dustTimer = 0;
        const p = this.dustParticles.find(dp => dp.life <= 0);
        if (p) {
          p.mesh.position.set(
            this.position.x + (Math.random() - 0.5) * 0.4,
            groundHeight + 0.08,
            this.position.z + (Math.random() - 0.5) * 0.4
          );
          p.life = p.maxLife;
          p.mesh.visible = true;
          p.mesh.scale.set(1, 1, 1);
          p.mesh.material.opacity = 0.55;
        }
      }
    }

    // Update existing dust particles
    this.dustParticles.forEach(dp => {
      if (dp.life > 0) {
        dp.life -= dt;
        const progress = 1 - (dp.life / dp.maxLife);
        dp.mesh.position.y += dt * 0.4;
        const s = 1.0 + progress * 1.5;
        dp.mesh.scale.set(s, s, s);
        dp.mesh.material.opacity = Math.max(0, 0.55 * (1 - progress));
        if (dp.life <= 0) dp.mesh.visible = false;
      }
    });
  }

  applyKnockback(forceX, forceY, forceZ) {
    if (this.isDrivingQuad) return;
    this.velocity.x = forceX;
    this.velocity.z = forceZ;
    this.velocity.y = Math.max(this.velocity.y, forceY || 8.5);
    this.isGrounded = false;
    this.isGliding = false;
    if (this.gliderGroup) this.gliderGroup.visible = false;
    this.gliderDeployProgress = 0;
    this.knockbackTimer = 0.65;
    this.squashStretch.set(0.8, 1.35, 0.8);
  }

  _performBounce() {
    this.isGrounded = false;
    this.airTime = 0;
    const now = performance.now();
    const timeSinceLand = (now - this.lastLandTime) / 1000;

    // Advance bounce combo (1 -> 2 -> 3 -> 1...)
    if (timeSinceLand < this.bounceWindow && this.bounceCombo > 0) {
      this.bounceCombo = (this.bounceCombo % 3) + 1;
    } else {
      this.bounceCombo = 1;
    }

    let jumpSpeed = this.jumpForce; // Base 10.5 m/s (~2.2m apex)
    if (this.bounceCombo === 2) {
      jumpSpeed = 12.2; // 2nd bounce: springy (~3.0m apex)
      this.squashStretch.set(0.84, 1.25, 0.84);
    } else if (this.bounceCombo === 3) {
      jumpSpeed = 16.0; // 3rd bounce: SUPER BOUNCE! (~5.1m apex)
      this.squashStretch.set(0.74, 1.42, 0.74);
      this._spawnSuperBounceShockwave();
    } else {
      // 1st bounce
      jumpSpeed = 10.5;
      this.squashStretch.set(0.88, 1.18, 0.88);
    }

    this.velocity.y = jumpSpeed;
  }

  _spawnSuperBounceShockwave() {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const p = this.dustParticles[i % this.dustParticles.length];
      if (p) {
        p.mesh.position.set(
          this.position.x + Math.cos(angle) * 0.45,
          this.position.y + 0.1,
          this.position.z + Math.sin(angle) * 0.45
        );
        p.life = p.maxLife * 1.5;
        p.mesh.visible = true;
        p.mesh.scale.set(1.6, 1.6, 1.6);
        p.mesh.material.opacity = 0.85;
      }
    }
  }

  _onLanded(input) {
    this.lastLandTime = performance.now();
    this.knockbackTimer = 0;
    // Landing squish
    this.squashStretch.set(1.22, 0.78, 1.22);

    // If holding down Jump (Space) on landing, immediately bounce into next combo!
    if (input && input.isJump() && this.knockbackTimer <= 0) {
      this._performBounce();
    }
  }

  setVisible(visible) {
    this.mesh.visible = visible;
    if (this.shadowMesh) this.shadowMesh.visible = visible;
  }

  getEyePosition() {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + 1.65,
      this.position.z
    );
  }
}
