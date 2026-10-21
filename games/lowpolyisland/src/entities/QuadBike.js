import * as THREE from 'three';

/**
 * QuadBike — Authentic Late-90s PS1 Low-Poly 4x4 Off-Road All-Terrain Vehicle (ATV).
 * Features:
 * - Rugged tubular steel chassis frame & heavy-duty front bullbar bumper
 * - Vibrant 90s Cyber-Yellow racing cowl with cyan & black sport graphics
 * - 4x chunky knobby all-terrain tires with deep treads on silver alloy rims
 * - Steerable front wheel knuckles (wheels visibly pivot left/right with steering)
 * - Rotating wheels proportional to drive speed
 * - Chrome handlebars with black rubber grips, instrument LCD, and twin headlights
 * - Realistic terrain alignment (pitches up/down slopes and banks into turns)
 * - High-speed off-road physics (cruising 20 m/s, Shift Turbo up to 30 m/s!)
 * - Rear-wheel dirt & dust particles when tearing across the island
 * - Interactive mounting and dismounting via [E]
 */
export class QuadBike {
  constructor(scene, startX = -36, startZ = 46) {
    this.scene = scene;
    this.position = new THREE.Vector3(startX, 0, startZ);
    this.heading = 0.35; // Angled facing the northern foothills
    this.speed = 0;
    this.steerAngle = 0;
    this.pitch = 0;
    this.roll = 0;

    this.isRidden = false;
    this.wheelRadius = 0.42;
    this.wheelRot = 0;

    // Off-road driving physics parameters
    this.maxSpeed = 24.0;
    this.turboSpeed = 46.0; // Blistering nitro boost (faster than runner 24 m/s zoom!)
    this.reverseSpeed = -8.5;
    this.accel = 28.0;
    this.turboAccel = 72.0; // Rocket-like instant torque!
    this.brakeRate = 36.0;
    this.friction = 4.8;
    this.turnSpeed = 2.8;

    // Ballistic Jump & Airborne physics
    this.velocityY = 0;
    this.isGrounded = true;
    this.gravity = 25.0;
    this.jumpForce = 13.5; // On-demand jump impulse or high-velocity launch
    this.prevGroundY = 0;
    this.airTime = 0;
    this.isTurbo = false;

    // Dust particle pool for rear tires & jump landings
    this.dustParticles = [];
    this.dustTimer = 0;
    this._initDustParticles();

    // 3D Model
    this.mesh = new THREE.Group();
    this._buildLowPolyModel();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.scene.add(this.mesh);
  }

  _initDustParticles() {
    const geo = new THREE.DodecahedronGeometry(0.22, 0);
    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xc4af8b, transparent: true, opacity: 0.65 }));
      p.visible = false;
      this.scene.add(p);
      this.dustParticles.push({ mesh: p, life: 0, maxLife: 0.45 });
    }
  }

  _spawnBurstDust(count = 6) {
    for (let i = 0; i < count; i++) {
      const p = this.dustParticles.find((dp) => dp.life <= 0);
      if (p) {
        p.mesh.position.set(
          this.position.x + (Math.random() - 0.5) * 1.4,
          this.position.y + 0.12,
          this.position.z + (Math.random() - 0.5) * 1.4
        );
        p.life = p.maxLife * (0.8 + Math.random() * 0.4);
        p.mesh.visible = true;
        p.mesh.scale.set(1.2, 1.2, 1.2);
        p.mesh.material.opacity = 0.75;
      }
    }
  }

  _buildLowPolyModel() {
    // Materials
    const chassisMat = new THREE.MeshLambertMaterial({ color: 0x1f232b, flatShading: true });
    const yellowBodyMat = new THREE.MeshLambertMaterial({ color: 0xf5d020, flatShading: true });
    const cyanDecalMat = new THREE.MeshLambertMaterial({ color: 0x00e5ff, flatShading: true });
    const blackTrimMat = new THREE.MeshLambertMaterial({ color: 0x111317, flatShading: true });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.75, roughness: 0.25, flatShading: true });
    const tireRubberMat = new THREE.MeshLambertMaterial({ color: 0x181a1f, flatShading: true });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x999da8, flatShading: true });
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x16181d, flatShading: true });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xdd2c00, flatShading: true });

    // 1. Steel Tubular Chassis Frame
    const mainFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.35, 1.95), chassisMat);
    mainFrame.position.y = 0.45;
    mainFrame.castShadow = true;
    this.mesh.add(mainFrame);

    // Front Bumper / Bullbar
    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.12), chassisMat);
    bullbar.position.set(0, 0.55, -1.05);
    bullbar.castShadow = true;
    this.mesh.add(bullbar);

    const bullbarWingL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.28), chassisMat);
    bullbarWingL.position.set(-0.42, 0.55, -0.95);
    this.mesh.add(bullbarWingL);

    const bullbarWingR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.28), chassisMat);
    bullbarWingR.position.set(0.42, 0.55, -0.95);
    this.mesh.add(bullbarWingR);

    // 2. High-Clearance Suspension Axles
    [-0.72, 0.72].forEach((az) => {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.25, 6), chassisMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, 0.4, az);
      this.mesh.add(axle);

      // Red sport shock absorber coils
      [-0.45, 0.45].forEach((sx) => {
        const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 5), redMat);
        shock.position.set(sx, 0.55, az);
        shock.rotation.z = sx > 0 ? 0.25 : -0.25;
        this.mesh.add(shock);
      });
    });

    // 3. Four Chunky All-Terrain Knobby Tires
    this.wheels = [];
    this.steerKnuckles = [];

    const wheelConfigs = [
      { id: 'FL', x: -0.62, z: -0.72, isFront: true },
      { id: 'FR', x: 0.62, z: -0.72, isFront: true },
      { id: 'RL', x: -0.62, z: 0.72, isFront: false },
      { id: 'RR', x: 0.62, z: 0.72, isFront: false }
    ];

    wheelConfigs.forEach((cfg) => {
      // Steer knuckle group (front wheels rotate left/right)
      const knuckle = new THREE.Group();
      knuckle.position.set(cfg.x, 0.4, cfg.z);
      this.mesh.add(knuckle);

      if (cfg.isFront) {
        this.steerKnuckles.push(knuckle);
      }

      // Wheel spin group (rotates around axle X-axis)
      const wheelGroup = new THREE.Group();
      knuckle.add(wheelGroup);
      this.wheels.push(wheelGroup);

      // Outer Rubber Tire (8-sided faceted low-poly cylinder)
      const tireGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.28, 8);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireRubberMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Deep Mud Lug Treads (4 tread blocks along circumference)
      for (let t = 0; t < 6; t++) {
        const angle = (t / 6) * Math.PI * 2;
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.06, 0.12), blackTrimMat);
        lug.position.set(0, Math.sin(angle) * this.wheelRadius, Math.cos(angle) * this.wheelRadius);
        lug.rotation.x = -angle;
        wheelGroup.add(lug);
      }

      // Wheel Rim Disc & Silver Spokes
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.29, 6), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 6), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);
    });

    // 4. Sport Body Fairings & Mudguards (Cyber-Yellow)
    // Front hood & nose cowl
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.65), yellowBodyMat);
    nose.position.set(0, 0.75, -0.65);
    nose.castShadow = true;
    this.mesh.add(nose);

    // Angled front fender wings
    [-0.52, 0.52].forEach((fx) => {
      const fender = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.72), yellowBodyMat);
      fender.position.set(fx, 0.82, -0.72);
      fender.rotation.z = fx > 0 ? 0.15 : -0.15;
      fender.castShadow = true;
      this.mesh.add(fender);

      const rearFender = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.72), yellowBodyMat);
      rearFender.position.set(fx, 0.82, 0.72);
      rearFender.rotation.z = fx > 0 ? 0.15 : -0.15;
      rearFender.castShadow = true;
      this.mesh.add(rearFender);
    });

    // Fuel Tank Hump
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), yellowBodyMat);
    tank.position.set(0, 0.88, -0.2);
    tank.castShadow = true;
    this.mesh.add(tank);

    // Cyan Racing Stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 1.1), cyanDecalMat);
    stripe.position.set(0, 0.89, -0.35);
    this.mesh.add(stripe);

    // Fuel Cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 6), blackTrimMat);
    cap.position.set(0, 1.08, -0.2);
    this.mesh.add(cap);

    // 5. Ergonomic Ribbed Vinyl Sport Saddle
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.95), seatMat);
    seat.position.set(0, 0.82, 0.32);
    seat.castShadow = true;
    this.mesh.add(seat);

    // 6. Handlebars & Controls
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 5), chassisMat);
    stem.position.set(0, 1.05, -0.45);
    stem.rotation.x = -0.35;
    this.mesh.add(stem);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 5), chromeMat);
    bar.position.set(0, 1.25, -0.52);
    bar.rotation.z = Math.PI / 2;
    this.mesh.add(bar);

    // Rubber Handgrips & Handguards
    [-0.34, 0.34].forEach((gx) => {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 5), blackTrimMat);
      grip.position.set(gx, 1.25, -0.52);
      grip.rotation.z = Math.PI / 2;
      this.mesh.add(grip);

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.12), yellowBodyMat);
      guard.position.set(gx, 1.26, -0.58);
      this.mesh.add(guard);
    });

    // Instrument LCD Dash
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.12), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
    dash.position.set(0, 1.18, -0.45);
    dash.rotation.x = 0.5;
    this.mesh.add(dash);

    // 7. Twin Headlights with Forward Light Beam
    [-0.18, 0.18].forEach((lx) => {
      const lightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 6), blackTrimMat);
      lightHousing.rotation.x = Math.PI / 2;
      lightHousing.position.set(lx, 0.82, -0.98);
      this.mesh.add(lightHousing);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 6), new THREE.MeshBasicMaterial({ color: 0xfff6a8 }));
      lens.position.set(lx, 0.82, -1.045);
      this.mesh.add(lens);
    });

    // Actual forward headlight beam
    this.headlight = new THREE.SpotLight(0xfffae0, 2.5, 28, Math.PI / 5, 0.4, 1.5);
    this.headlight.position.set(0, 0.85, -1.0);
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0.2, -12);
    this.mesh.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;
    this.mesh.add(this.headlight);

    // 8. Rear Utility Rack & Jerry Can
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.52), chassisMat);
    rack.position.set(0, 0.88, 0.95);
    this.mesh.add(rack);

    const jerryCan = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.18), redMat);
    jerryCan.position.set(-0.16, 1.05, 0.95);
    jerryCan.castShadow = true;
    this.mesh.add(jerryCan);

    // Rear Dual Red Brake / Taillights
    [-0.24, 0.24].forEach((rx) => {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xff1e1e }));
      tail.position.set(rx, 0.86, 1.18);
      this.mesh.add(tail);
    });

    // 9. Dual Chrome Exhaust Manifold & Muffler
    [-0.22, 0.22].forEach((ex) => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 6), chromeMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(ex, 0.65, 1.05);
      this.mesh.add(exhaust);
    });

    // 10. Twin Nitro Exhaust Afterburner Flames
    this.nitroFlames = [];
    [-0.22, 0.22].forEach((ex) => {
      const flameGroup = new THREE.Group();
      flameGroup.position.set(ex, 0.65, 1.35);

      const outerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.55, 5),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 })
      );
      outerFlame.rotation.x = Math.PI / 2;
      outerFlame.position.z = 0.26;
      flameGroup.add(outerFlame);

      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.35, 5),
        new THREE.MeshBasicMaterial({ color: 0xffeedd })
      );
      innerFlame.rotation.x = Math.PI / 2;
      innerFlame.position.z = 0.16;
      flameGroup.add(innerFlame);

      flameGroup.visible = false;
      this.mesh.add(flameGroup);
      this.nitroFlames.push(flameGroup);
    });
  }

  mount(player) {
    this.isRidden = true;
    player.isDrivingQuad = true;
    player.velocity.set(0, 0, 0);
  }

  dismount(player, world) {
    this.isRidden = false;
    this.speed = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    player.isDrivingQuad = false;
    player.quadTurbo = false;
    player.quadSpeed = 0;

    // Immediately hide nitro flames when dismounting
    if (this.nitroFlames) {
      this.nitroFlames.forEach((f) => (f.visible = false));
    }

    // Place player safely to the left of the quad bike
    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    const dropX = this.position.x - cosH * 1.6;
    const dropZ = this.position.z + sinH * 1.6;
    const dropY = world ? world.getGroundHeight(dropX, dropZ) : this.position.y;

    player.position.set(dropX, dropY, dropZ);
    player.rotation = this.heading;
  }

  update(dt, input, world, player) {
    // 1. When ridden by player
    if (this.isRidden) {
      const isShift = !!(input.keys['ShiftLeft'] || input.keys['ShiftRight']);
      const isFwd = !!(input.keys['KeyW'] || input.keys['ArrowUp']);
      const isBwd = !!(input.keys['KeyS'] || input.keys['ArrowDown']);
      const isLeft = !!(input.keys['KeyA'] || input.keys['ArrowLeft']);
      const isRight = !!(input.keys['KeyD'] || input.keys['ArrowRight']);
      const isHandbrake = !!input.keys['Space'];

      // Boosting is only active when player holds Shift + forward throttle and speed exceeds cruising threshold
      const isBoosting = isShift && isFwd && this.speed > 14.0;
      this.isTurbo = isBoosting;
      if (player) {
        player.quadTurbo = isBoosting;
        player.quadSpeed = Math.abs(this.speed);
      }

      const topSpeed = isShift ? this.turboSpeed : this.maxSpeed;
      const currentAccel = isShift ? this.turboAccel : this.accel;

      // Forward & reverse acceleration
      if (isFwd) {
        this.speed += currentAccel * dt;
        if (this.speed > topSpeed) this.speed = topSpeed;
      } else if (isBwd) {
        if (this.speed > 0.5) {
          this.speed -= this.brakeRate * dt;
        } else {
          this.speed -= (this.accel * 0.6) * dt;
          if (this.speed < this.reverseSpeed) this.speed = this.reverseSpeed;
        }
      } else {
        // Natural coasting friction
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - this.friction * dt);
        } else if (this.speed < 0) {
          this.speed = Math.min(0, this.speed + this.friction * dt);
        }
      }

      // Steering: High authority lock & quick handlebar response
      let targetSteer = 0;
      if (isLeft) targetSteer += 0.70;
      if (isRight) targetSteer -= 0.70;

      this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, dt * 14);

      // Turn heading: responsive at low speeds, stable at high speeds
      const absSpeed = Math.abs(this.speed);
      if (absSpeed > 0.08 || ((isFwd || isBwd) && (isLeft || isRight))) {
        const dirSign = this.speed >= 0 ? (isBwd && absSpeed < 0.4 ? -1 : 1) : -1;
        // Dynamic steering responsiveness curve:
        // High turning authority at low speed (1.45x) for tight street corners and parking maneuvers
        // Controlled drift authority at high speed (0.65x) to maintain stable tracking on avenues/highways
        const speedRatio = Math.min(1.0, absSpeed / this.maxSpeed);
        const steerAuthority = 1.45 - speedRatio * 0.75;
        // Direct responsiveness even when starting from a stop or crawling
        const motionEngagement = Math.min(1.0, Math.max(0.72, absSpeed / 2.0));
        
        this.heading += this.steerAngle * this.turnSpeed * steerAuthority * motionEngagement * dirSign * dt;
      }

      // 2. Horizontal position updates
      const moveDist = this.speed * dt;
      this.position.x -= Math.sin(this.heading) * moveDist;
      this.position.z -= Math.cos(this.heading) * moveDist;

      // Prevent driving into deep ocean (stay above water level y=0.35 on island)
      if (world && world.id !== 'cybercity' && world.hasOcean !== false) {
        const elev = world.getIslandElevation(this.position.x, this.position.z);
        if (elev < 0.35) {
          this.speed *= 0.5;
          const toCenterX = 10 - this.position.x;
          const toCenterZ = 65 - this.position.z;
          const len = Math.hypot(toCenterX, toCenterZ);
          if (len > 0) {
            this.position.x += (toCenterX / len) * 0.4;
            this.position.z += (toCenterZ / len) * 0.4;
          }
        }
      }

      // 3. Resolve obstacle collisions
      if (world && world.resolveCollisions) {
        world.resolveCollisions(this.position, 1.05, this.position.y);
      }

      // 4. Ballistic Jumps & Vertical Elevation Physics
      if (world) {
        const frontX = this.position.x - Math.sin(this.heading) * 0.85;
        const frontZ = this.position.z - Math.cos(this.heading) * 0.85;
        const rearX = this.position.x + Math.sin(this.heading) * 0.85;
        const rearZ = this.position.z + Math.cos(this.heading) * 0.85;

        const frontY = world.getGroundHeight(frontX, frontZ, this.position.y);
        const rearY = world.getGroundHeight(rearX, rearZ, this.position.y);
        const targetGroundY = (frontY + rearY) * 0.5;

        // Rate of change of terrain under moving wheels (launch ramp impulse)
        const groundVy = dt > 0.0001 ? (targetGroundY - this.prevGroundY) / dt : 0;
        this.prevGroundY = targetGroundY;

        // A. If Grounded:
        if (this.isGrounded) {
          // Manual launch jump with SPACE (bunny hop / stunt jump)
          if (isHandbrake) {
            this.isGrounded = false;
            this.velocityY = Math.max(this.jumpForce, groundVy + 10.0);
            this._spawnBurstDust(4);
          } else if (targetGroundY < this.position.y - 0.28) {
            // Ground dropped away beneath wheels (flew off a cliff, ledge, or ramp lip!)
            this.isGrounded = false;
            // Carry upward momentum from the ramp or slope!
            this.velocityY = Math.max(0, groundVy * 0.95);
            this.airTime = 0.01;
          } else {
            // Smoothly track ground
            this.position.y = targetGroundY;
            this.velocityY = 0;
            this.pitch = Math.atan2(frontY - rearY, 1.7);
            this.roll = -this.steerAngle * (this.speed / this.maxSpeed) * 0.18;
          }
        }

        // B. If Airborne:
        if (!this.isGrounded) {
          this.airTime += dt;
          this.velocityY -= this.gravity * dt;
          this.position.y += this.velocityY * dt;

          // Ballistic trajectory pitch aligns smoothly with parabolic flight curve
          const flightPitch = -Math.atan2(this.velocityY, Math.max(7.0, Math.abs(this.speed)));
          this.pitch += (flightPitch - this.pitch) * Math.min(1.0, dt * 5.5);
          this.roll *= 0.92; // Level out roll in mid-air

          // Landing check against current ground
          const surfaceY = world.getGroundHeight(this.position.x, this.position.z, this.position.y);
          if (this.position.y <= surfaceY) {
            // Touchdown!
            this.position.y = surfaceY;
            if (this.velocityY < -6.5) {
              this._spawnBurstDust(8); // High-impact touchdown dust cloud!
            }
            this.velocityY = 0;
            this.isGrounded = true;
            this.airTime = 0;
          }
        }
      }

      // 5. Update front wheel steering visual
      this.steerKnuckles.forEach((k) => {
        k.rotation.y = this.steerAngle;
      });

      // 6. Update wheel spin rotation
      this.wheelRot += moveDist / this.wheelRadius;
      this.wheels.forEach((w) => {
        w.rotation.x = this.wheelRot;
      });

      // 7. Emit dust particles from rear tires when on ground
      if (this.isGrounded && Math.abs(this.speed) > 4.0 && world) {
        this.dustTimer += dt;
        const dustInterval = isShift ? 0.025 : 0.05;
        if (this.dustTimer > dustInterval) {
          this.dustTimer = 0;
          const rearOffsetZ = this.position.z + Math.cos(this.heading) * 0.85;
          const rearOffsetX = this.position.x + Math.sin(this.heading) * 0.85;
          const sideOffset = (Math.random() > 0.5 ? 0.45 : -0.45);

          const p = this.dustParticles.find((dp) => dp.life <= 0);
          if (p) {
            p.mesh.position.set(
              rearOffsetX + Math.cos(this.heading) * sideOffset,
              this.position.y + 0.15,
              rearOffsetZ - Math.sin(this.heading) * sideOffset
            );
            p.life = isShift ? p.maxLife * 1.3 : p.maxLife;
            p.mesh.visible = true;
            p.mesh.scale.set(isShift ? 1.5 : 1.0, isShift ? 1.5 : 1.0, isShift ? 1.5 : 1.0);
            p.mesh.material.opacity = isShift ? 0.85 : 0.6;
          }
        }
      }

      // 8. Animate Nitro Exhaust Flames - strictly visible ONLY when actively boosting!
      if (this.nitroFlames && this.nitroFlames.length > 0) {
        const showFlames = isBoosting && this.isRidden;
        this.nitroFlames.forEach((flame) => {
          flame.visible = showFlames;
          if (showFlames) {
            const flicker = 0.85 + Math.random() * 0.4;
            const stretch = 1.0 + (this.speed / this.turboSpeed) * 0.7 + Math.random() * 0.35;
            flame.scale.set(flicker, flicker, stretch);
          }
        });
      }

      // 9. Sync player position & seated riding stance (facing forward toward handlebars)
      if (player) {
        const sinH = Math.sin(this.heading);
        const cosH = Math.cos(this.heading);
        // Seat offset in local coordinates: z = +0.18 (towards rear saddle)
        const seatX = this.position.x + sinH * 0.18;
        const seatZ = this.position.z + cosH * 0.18;
        player.position.set(seatX, this.position.y + 0.32, seatZ);
        player.rotation = this.heading + Math.PI; // Face forward toward front handlebars!
        player.velocity.set(0, 0, 0);
        player.isGrounded = this.isGrounded;

        // Seated driving pose (arms reaching forward to handlebars, legs forward on footrests)
        if (player.leftLegPivot && player.rightLegPivot) {
          player.leftLegPivot.rotation.x = 1.1;
          player.rightLegPivot.rotation.x = 1.1;
        }
        if (player.leftArmPivot && player.rightArmPivot) {
          player.leftArmPivot.rotation.x = 0.8;
          player.rightArmPivot.rotation.x = 0.8;
        }
      }
    } else {
      // Parked idle
      if (world) {
        const gy = world.getGroundHeight(this.position.x, this.position.z);
        this.position.y = gy;
      }
      if (this.nitroFlames) {
        this.nitroFlames.forEach((f) => (f.visible = false));
      }
    }

    // Update 3D mesh transform
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(this.pitch, this.heading, this.roll, 'YXZ');

    // Update existing dust particles
    this.dustParticles.forEach((dp) => {
      if (dp.life > 0) {
        dp.life -= dt;
        const progress = 1 - dp.life / dp.maxLife;
        dp.mesh.position.y += dt * 0.6;
        const s = 1.0 + progress * 2.5;
        dp.mesh.scale.set(s, s, s);
        dp.mesh.material.opacity = Math.max(0, 0.7 * (1 - progress));
        if (dp.life <= 0) dp.mesh.visible = false;
      }
    });
  }
}
