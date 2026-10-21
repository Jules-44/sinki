import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld.js';

/**
 * World — Expansive Retro Low-Poly Island (PS1 / Late 90s aesthetic).
 * Features:
 * - 250m+ terrain with dramatic eastern sea cliffs (22m high)
 * - Northern rolling hills with dense conifer/pine forest
 * - Western sheltered sandy beach cove with sea-stack boulders
 * - Clifftop sunset overlook with wooden observation deck & benches
 * - Long pier extending into the ocean with gazebo
 * - Distant reef with rotating lighthouse beam
 * - Glowing retro vending machines & vintage streetlamps
 * - Low-poly animated ocean waves with foam sheen
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);
    this.time = 0;
    this.collisionWorld = new CollisionWorld();

    this._buildOcean();
    this._buildTerrain();
    this._buildCliffsAndRocks();
    this._buildPier();
    this._buildClifftopOverlook();
    this._buildForestAndVegetation();
    this._buildLighthouse();
    this._buildVendingMachines();
    this._buildStreetLamps();
    this._buildBeachHouse();
    this._buildTreasureCove();
    this._buildRadioTower();
    this._buildDistantShip();
    this._buildCampfireAndBuoys();
    this._buildBeachBarAndLoungers();
    this._buildDanceArea();
    this._buildJetSkis();
    this._buildWindingPath();
    this._buildShrubs();
    this._buildStuntRamps();
    this._buildBirds();
  }

  _buildOcean() {
    // Vast low-poly ocean plane
    const waterGeo = new THREE.PlaneGeometry(600, 600, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x16344f,
      roughness: 0.3,
      metalness: 0.15,
      flatShading: true,
      transparent: true,
      opacity: 0.92
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.y = -0.2;
    this.rootGroup.add(this.waterMesh);

    this.waterPosAttribute = waterGeo.attributes.position;
    this.waterBaseY = new Float32Array(this.waterPosAttribute.count);
    for (let i = 0; i < this.waterPosAttribute.count; i++) {
      this.waterBaseY[i] = this.waterPosAttribute.getY(i);
    }
  }

  getIslandElevation(x, z) {
    // Pier deck connection
    if (Math.abs(x) <= 2.4 && z >= -48 && z <= 3) {
      return 2.38;
    }
    if (Math.abs(x) <= 7.0 && z >= -49 && z <= -39) {
      return 2.38;
    }

    // Island bounds: center at (10, 65), span ~130m radius
    const dx = x - 10;
    const dz = z - 65;
    const dist = Math.hypot(dx * 0.9, dz * 0.7);

    if (dist > 95) return 0.0; // Deep water

    const t = 1 - (dist / 95);
    let h = Math.pow(t, 1.25) * 4.5;

    // 1. Eastern Rocky Sea Cliffs (x: 25 to 80, z: 20 to 110)
    // Towering 18-23m coastal cliffs dropping into sea
    if (x > 18 && z > 15 && z < 115) {
      const cliffT = Math.sin(((x - 18) / 62) * Math.PI) * Math.sin(((z - 15) / 100) * Math.PI);
      if (cliffT > 0) {
        h += Math.pow(cliffT, 0.75) * 19.5;
        // Low-poly craggy rock ridges
        h += Math.sin(x * 0.25) * Math.cos(z * 0.2) * 1.5;
      }
    }

    // 2. Northern Forest Hills & Ridge (z: 50 to 135, x: -50 to 30)
    if (z > 45 && z < 135) {
      const hillT = Math.sin(((z - 45) / 90) * Math.PI) * Math.cos(((x + 10) / 60) * (Math.PI / 2));
      if (hillT > 0) {
        h += Math.pow(hillT, 1.2) * 14.0;
        h += Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.6;
      }
    }

    // 3. Gentle pier ramp connection
    if (Math.abs(x) < 4.5 && z >= 0 && z <= 12) {
      const blend = z / 12;
      h = 2.38 * (1 - blend) + h * blend;
    }

    // 4. Carved winding mountain trail up to the lookout (smooth walkable grade)
    const trail = this._getTrailHeightAndDist(x, z);
    if (trail.dist < 3.2) {
      const trailBlend = Math.max(0, 1 - trail.dist / 3.2);
      const smoothFactor = trailBlend * trailBlend * (3 - 2 * trailBlend);
      h = h * (1 - smoothFactor * 0.88) + trail.height * (smoothFactor * 0.88);
    }

    return Math.max(0.0, h);
  }

  _buildTerrain() {
    // 240x240m detailed low-poly terrain grid
    const terrainGeo = new THREE.PlaneGeometry(240, 240, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = [];

    const deepWaterColor = new THREE.Color(0x111e33);
    const sandColor = new THREE.Color(0xc99c68);       // Warm twilight sand
    const coastalGrassColor = new THREE.Color(0x4a6948); // Lower dunes
    const mountainGrassColor = new THREE.Color(0x355436);// Deep forest grass
    const rockColor = new THREE.Color(0x524b5c);        // Slate grey/purple cliff rock
    const cliffEdgeColor = new THREE.Color(0x6b6378);   // Highlighted rock strata
    const trailColor = new THREE.Color(0x7a634e);       // Winding dirt trail

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getIslandElevation(x, z);
      pos.setY(i, y);

      const vertexColor = new THREE.Color();

      const isBeachSand = (z < 15 && y < 2.9) || (x < -20 && z < 38 && y < 2.9) || (y < 1.7);
      if (y < 0.2) {
        vertexColor.copy(deepWaterColor);
      } else if (isBeachSand) {
        // Warm golden beach sand extending across shoreline, bar front, and beach cove
        const t = Math.max(0, Math.min(1, (y - 0.2) / 2.7));
        vertexColor.lerpColors(sandColor, coastalGrassColor, t * 0.25);
      } else if (y > 14.0 || (x > 32 && y > 7.0)) {
        // High rocky cliffs & mountain ridges
        const rockT = Math.min(1.0, (y - 7.0) / 12.0);
        vertexColor.lerpColors(rockColor, cliffEdgeColor, (Math.sin(x * 0.5 + z * 0.5) + 1) * 0.5);
      } else {
        // Grassy hills & forest floor
        const hillT = Math.min(1.0, (y - 1.4) / 10.0);
        vertexColor.lerpColors(coastalGrassColor, mountainGrassColor, hillT);

        // Clifftop trail coloring (runs from pier z=10, x=0 winding up to cliff at x=45, z=60)
        const trailDist = this._distanceToTrail(x, z);
        if (trailDist < 2.2) {
          vertexColor.lerp(trailColor, 0.7);
        }
      }

      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.rootGroup.add(this.terrainMesh);
  }

  _getTrailHeightAndDist(x, z) {
    // Piecewise 3D points defining the scenic winding trail up to the clifftop overlook
    const waypoints = [
      [2, 12, 2.38],
      [6, 18, 3.5],
      [11, 26, 5.4],
      [16, 34, 7.8],
      [22, 42, 10.8],
      [28, 50, 14.2],
      [36, 57, 17.5],
      [42, 63, 20.2],
      [48, 68, 22.3]
    ];
    let minDist = 999;
    let targetH = 2.38;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const [x1, z1, h1] = waypoints[i];
      const [x2, z2, h2] = waypoints[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      let t = 0;
      if (lenSq > 0) {
        t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / lenSq));
      }
      const px = x1 + t * dx;
      const pz = z1 + t * dz;
      const dist = Math.hypot(x - px, z - pz);
      if (dist < minDist) {
        minDist = dist;
        targetH = h1 + t * (h2 - h1);
      }
    }
    return { dist: minDist, height: targetH };
  }

  _distanceToTrail(x, z) {
    return this._getTrailHeightAndDist(x, z).dist;
  }

  _buildCliffsAndRocks() {
    this.rockGroup = new THREE.Group();

    // Shared watertight manifold low-poly geometries (zero torn vertices or unconnected gaps)
    this.rockGeoDodec = new THREE.DodecahedronGeometry(1.0, 0);
    this.rockGeoIcos = new THREE.IcosahedronGeometry(1.0, 0);

    // 1. Towering sea stack / rock arch offshore on eastern coast
    const seaStackLocations = [
      [82, 0, 35, 14, 18, 12],
      [90, 0, 70, 16, 24, 15],
      [75, 0, 95, 12, 16, 10],
      [-55, 0, 20, 8, 9, 8],   // West cove sea stack
      [-65, 0, 40, 10, 12, 9]
    ];

    seaStackLocations.forEach(([x, y, z, sx, sy, sz]) => {
      this._createRockCluster(x, y + sy * 0.4, z, sx, sy, sz, 0x474254);
    });

    // 2. Coastal boulders along the sandy beach surf
    const beachBoulders = [
      [-18, 6], [-28, 14], [-38, 25],
      [22, 12], [28, 4], [35, 18],
      [5, 2], [-8, 1]
    ];

    beachBoulders.forEach(([x, z]) => {
      const gy = this.getGroundHeight(x, z);
      const scale = 1.2 + Math.random() * 1.8;
      this._createRockCluster(x, gy + scale * 0.3, z, scale * 1.4, scale, scale * 1.2, 0x5a5266);
    });

    // 3. Jagged cliff rocks crowning the eastern ridge
    for (let rz = 25; rz <= 105; rz += 12) {
      const rx = 46 + (Math.sin(rz * 0.3) * 6);
      const ry = this.getGroundHeight(rx, rz);
      this._createRockCluster(rx, ry + 1.5, rz, 4.5, 3.5, 4.0, 0x625a70);
    }

    this.rootGroup.add(this.rockGroup);
  }

  _createRockCluster(x, y, z, sx, sy, sz, colorHex) {
    const cluster = new THREE.Group();
    cluster.position.set(x, y, z);

    const mat = new THREE.MeshLambertMaterial({
      color: colorHex,
      flatShading: true
    });

    // Primary solid faceted boulder (watertight manifold polyhedron)
    const mainGeo = Math.random() > 0.45 ? this.rockGeoDodec : this.rockGeoIcos;
    const mainMesh = new THREE.Mesh(mainGeo, mat);
    mainMesh.scale.set(sx, sy, sz);
    mainMesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    cluster.add(mainMesh);

    // Flanking secondary rock for natural craggy silhouette on larger boulders
    if (sx > 2.2) {
      const subGeo = this.rockGeoIcos;
      const subMesh = new THREE.Mesh(subGeo, mat);
      const subScale = 0.52 + Math.random() * 0.28;
      subMesh.scale.set(sx * subScale, sy * subScale * 0.85, sz * subScale);
      subMesh.position.set(
        (Math.random() - 0.5) * sx * 0.55,
        -sy * 0.12,
        (Math.random() - 0.5) * sz * 0.55
      );
      subMesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      subMesh.castShadow = true;
      subMesh.receiveShadow = true;
      cluster.add(subMesh);
    }

    this.rockGroup.add(cluster);

    // Register solid boulder collider (jumpable and solid blocking)
    if (this.collisionWorld) {
      this.collisionWorld.addBoulder(x, z, y - sy * 0.35, sx * 0.9, sz * 0.9, sy * 1.15, true, 'boulder');
    }
  }

  _buildPier() {
    this.pierGroup = new THREE.Group();

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x734d2f, flatShading: true });
    const railingMat = new THREE.MeshLambertMaterial({ color: 0x47301c, flatShading: true });

    // Deck: stretches from z = -48 to z = 3
    const deckGeo = new THREE.BoxGeometry(4.6, 0.35, 52);
    const deck = new THREE.Mesh(deckGeo, woodMat);
    deck.position.set(0, 2.2, -23);
    deck.receiveShadow = true;
    deck.castShadow = true;
    this.pierGroup.add(deck);

    // Register pier walkway collider
    if (this.collisionWorld) {
      this.collisionWorld.addBox(-2.3, 2.3, -48, 3, 0, 2.38, true, 'pier_deck');
    }

    // Pilings into water
    const stiltGeo = new THREE.CylinderGeometry(0.2, 0.25, 4.5, 6);
    for (let z = -44; z <= 2; z += 5) {
      [-2.1, 2.1].forEach((x) => {
        const stilt = new THREE.Mesh(stiltGeo, woodMat);
        stilt.position.set(x, 0.5, z);
        stilt.castShadow = true;
        this.pierGroup.add(stilt);
      });
    }

    // Railings
    const railGeo = new THREE.BoxGeometry(0.12, 0.65, 52);
    [-2.2, 2.2].forEach((x) => {
      const rail = new THREE.Mesh(railGeo, railingMat);
      rail.position.set(x, 2.7, -23);
      rail.castShadow = true;
      this.pierGroup.add(rail);
    });

    // Solid jumpable pier railings
    if (this.collisionWorld) {
      this.collisionWorld.addBox(-2.32, -2.12, -48, 3, 2.2, 3.03, true, 'pier_rail_left');
      this.collisionWorld.addBox(2.12, 2.32, -48, 3, 2.2, 3.03, true, 'pier_rail_right');
    }

    // Gazebo T-platform at end
    const tPlatform = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 10), woodMat);
    tPlatform.position.set(0, 2.2, -44);
    tPlatform.receiveShadow = true;
    tPlatform.castShadow = true;
    this.pierGroup.add(tPlatform);

    if (this.collisionWorld) {
      this.collisionWorld.addBox(-7.0, 7.0, -49, -39, 0, 2.38, true, 'gazebo_platform');
    }

    // Gazebo roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x1f2e45, flatShading: true }));
    roof.position.set(0, 5.3, -44);
    roof.castShadow = true;
    this.pierGroup.add(roof);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.8, 6);
    [[-3, -42], [3, -42], [-3, -46], [3, -46]].forEach(([x, z]) => {
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(x, 3.6, z);
      p.castShadow = true;
      this.pierGroup.add(p);
      if (this.collisionWorld) {
        this.collisionWorld.addCylinder(x, z, 2.2, 5.2, 0.18, false, 'gazebo_pillar');
      }
    });

    this.rootGroup.add(this.pierGroup);
  }

  _buildClifftopOverlook() {
    // Scenic observation deck perched high on eastern cliff: (48, y, 68)
    const gy = this.getGroundHeight(48, 68);

    const deckGroup = new THREE.Group();
    deckGroup.position.set(48, gy, 68);

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6e4828, flatShading: true });
    const railingMat = new THREE.MeshLambertMaterial({ color: 0x3d2714, flatShading: true });

    // Wooden lookout platform
    const platformGeo = new THREE.BoxGeometry(8, 0.3, 8);
    const platform = new THREE.Mesh(platformGeo, woodMat);
    platform.position.y = 0.15;
    platform.castShadow = true;
    platform.receiveShadow = true;
    deckGroup.add(platform);

    if (this.collisionWorld) {
      this.collisionWorld.addBox(44, 52, 64, 72, gy, gy + 0.3, true, 'overlook_deck');
    }

    // Railings on 3 sides overlooking the drop
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, 0.1), railingMat);
    r1.position.set(0, 0.5, -4);
    deckGroup.add(r1);

    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 8), railingMat);
    r2.position.set(4, 0.5, 0);
    deckGroup.add(r2);

    const r3 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, 0.1), railingMat);
    r3.position.set(0, 0.5, 4);
    deckGroup.add(r3);

    if (this.collisionWorld) {
      this.collisionWorld.addBox(44, 52, 63.85, 64.15, gy, gy + 0.85, true, 'overlook_rail');
      this.collisionWorld.addBox(51.85, 52.15, 64, 72, gy, gy + 0.85, true, 'overlook_rail');
      this.collisionWorld.addBox(44, 52, 71.85, 72.15, gy, gy + 0.85, true, 'overlook_rail');
    }

    // Low-poly park bench facing the sunset/ocean
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a5a36, flatShading: true });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.6), benchMat);
    seat.position.set(1.5, 0.55, 0);
    seat.rotation.y = -Math.PI / 2;
    deckGroup.add(seat);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.1), benchMat);
    backrest.position.set(1.75, 0.9, 0);
    backrest.rotation.y = -Math.PI / 2;
    deckGroup.add(backrest);

    if (this.collisionWorld) {
      this.collisionWorld.addBox(49.2, 49.8, 66.8, 69.2, gy, gy + 0.65, true, 'overlook_bench');
    }

    // Scenic Overlook Warm Lantern
    const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), railingMat);
    lanternPole.position.set(-3.2, 1.6, -3.2);
    deckGroup.add(lanternPole);

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xffdf80 }));
    lantern.position.set(-3.2, 3.2, -3.2);
    deckGroup.add(lantern);

    const lookLight = new THREE.PointLight(0xffb855, 1.6, 16);
    lookLight.position.set(-3.2, 3.2, -3.2);
    deckGroup.add(lookLight);

    this.rootGroup.add(deckGroup);
  }

  _buildForestAndVegetation() {
    this.vegetationGroup = new THREE.Group();

    // 1. Inland Pine & Conifer Forest on hills (Northern sector)
    const forestCores = [
      [-15, 55], [-5, 65], [10, 75], [-20, 80],
      [0, 90], [18, 95], [-12, 105], [5, 115],
      [-25, 95], [-35, 75], [-10, 125], [12, 120]
    ];

    forestCores.forEach(([cx, cz]) => {
      // Cluster 4-6 pine trees per core
      const count = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        const px = cx + (Math.random() - 0.5) * 16;
        const pz = cz + (Math.random() - 0.5) * 16;
        const scale = 0.8 + Math.random() * 0.7;
        this._createPineTree(px, pz, scale);
      }
    });

    // 2. Coastal Palm Trees along the beach and pier entrance
    const palmPositions = [
      [-12, 12], [-22, 18], [-32, 28], [-42, 38],
      [14, 12], [22, 18], [18, 26],
      [-8, 6], [8, 6], [-16, 2], [16, 2],
      [-26, 8], [26, 8]
    ];

    palmPositions.forEach(([x, z]) => {
      this._createPalmTree(x, z);
    });

    this.rootGroup.add(this.vegetationGroup);
  }

  _createPineTree(x, z, scale = 1.0) {
    const gy = this.getGroundHeight(x, z);
    if (gy < 1.2) return; // Don't spawn underwater

    const tree = new THREE.Group();
    tree.position.set(x, gy, z);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3222, flatShading: true });
    // Varied conifer evergreen shades
    const foliageColor = (Math.random() > 0.5) ? 0x1f422b : 0x274e34;
    const leafMat = new THREE.MeshLambertMaterial({ color: foliageColor, flatShading: true });

    // Trunk
    const trunkH = 2.0 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, trunkH, 5), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // 3 tiered low-poly cones
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const radius = (1.8 - i * 0.4) * scale;
      const height = (2.2 - i * 0.3) * scale;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), leafMat);
      cone.position.y = trunkH + (i * 1.3 * scale);
      cone.castShadow = true;
      tree.add(cone);
    }

    this.vegetationGroup.add(tree);

    if (this.collisionWorld) {
      this.collisionWorld.addCylinder(x, z, gy, gy + trunkH, 0.28 * scale, false, 'pine_trunk');
    }
  }

  _createPalmTree(x, z) {
    const gy = this.getGroundHeight(x, z);
    if (gy < 0.2) return;

    const tree = new THREE.Group();
    tree.position.set(x, gy, z);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6e4e37, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e663a, flatShading: true });

    const segments = 5;
    let currY = 0;
    let currX = 0;
    const curve = (Math.random() - 0.5) * 0.45;

    for (let i = 0; i < segments; i++) {
      const segH = 1.4;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.02, 0.28 - i * 0.02, segH, 6), trunkMat);
      seg.position.set(currX, currY + segH / 2, 0);
      seg.rotation.z = curve * (i + 1);
      seg.castShadow = true;
      tree.add(seg);

      currY += segH;
      currX += Math.sin(curve * (i + 1)) * 0.35;
    }

    // Palm leaves
    const numLeaves = 7;
    for (let j = 0; j < numLeaves; j++) {
      const angle = (j / numLeaves) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.8, 4), leafMat);
      leaf.geometry.rotateX(Math.PI / 2.5);
      leaf.position.set(currX, currY, 0);
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      tree.add(leaf);
    }

    this.vegetationGroup.add(tree);

    if (this.collisionWorld) {
      this.collisionWorld.addCylinder(x, z, gy, gy + 4.2, 0.32, false, 'palm_trunk');
    }
  }

  _buildLighthouse() {
    this.lighthouseGroup = new THREE.Group();
    this.lighthouseGroup.position.set(120, 0, -85);

    // Rocky Islet
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(18, 0), new THREE.MeshLambertMaterial({ color: 0x484252, flatShading: true }));
    rock.scale.set(1.5, 0.6, 1.3);
    rock.position.y = 1.5;
    this.lighthouseGroup.add(rock);

    // Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.2, 26, 10), new THREE.MeshLambertMaterial({ color: 0xe6e6ea, flatShading: true }));
    tower.position.y = 15.5;
    tower.castShadow = true;
    this.lighthouseGroup.add(tower);

    // Red stripes
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 5.0, 10), new THREE.MeshLambertMaterial({ color: 0xd93838, flatShading: true }));
    stripe.position.y = 16.5;
    this.lighthouseGroup.add(stripe);

    // Lantern
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.2, 8), new THREE.MeshBasicMaterial({ color: 0xffef96 }));
    lantern.position.y = 29.5;
    this.lighthouseGroup.add(lantern);

    // Spotlight
    this.lighthouseSpot = new THREE.SpotLight(0xfffae0, 8.0, 240, Math.PI / 7, 0.4, 0.2);
    this.lighthouseSpot.position.set(0, 29.5, 0);
    this.lighthouseTarget = new THREE.Object3D();
    this.lighthouseTarget.position.set(60, 0, 60);
    this.lighthouseGroup.add(this.lighthouseTarget);
    this.lighthouseSpot.target = this.lighthouseTarget;
    this.lighthouseGroup.add(this.lighthouseSpot);

    this.rootGroup.add(this.lighthouseGroup);
  }

  _buildVendingMachines() {
    // Retro glowing Japanese-style drinks vending machine on the pier walkway
    const vmGroup = new THREE.Group();
    vmGroup.position.set(-3.2, 2.38, 2);
    vmGroup.rotation.y = Math.PI / 2;

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.85), new THREE.MeshLambertMaterial({ color: 0x1f2638, flatShading: true }));
    body.position.y = 1.05;
    body.castShadow = true;
    vmGroup.add(body);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.1), new THREE.MeshBasicMaterial({ color: 0x4deeea }));
    glass.position.set(0, 1.3, 0.43);
    vmGroup.add(glass);

    const drinksLight = new THREE.PointLight(0x4deeea, 1.8, 6.0);
    drinksLight.position.set(0, 1.3, 0.6);
    vmGroup.add(drinksLight);

    // Second vending machine (pink/red neon)
    const vm2 = vmGroup.clone();
    vm2.position.set(-3.2, 2.38, 3.6);
    vm2.children[1].material = new THREE.MeshBasicMaterial({ color: 0xff3b7b });
    const light2 = new THREE.PointLight(0xff3b7b, 1.8, 6.0);
    light2.position.set(0, 1.3, 0.6);
    vm2.children[2] = light2;

    this.rootGroup.add(vmGroup);
    this.rootGroup.add(vm2);

    // Solid jumpable vending machines on pier
    if (this.collisionWorld) {
      this.collisionWorld.addBox(-3.65, -2.75, 1.45, 2.55, 2.38, 4.48, true, 'vending_machine_1');
      this.collisionWorld.addBox(-3.65, -2.75, 3.05, 4.15, 2.38, 4.48, true, 'vending_machine_2');
    }
  }

  _buildStreetLamps() {
    const lampPositions = [
      [-2.4, -6], [2.4, -6],
      [-2.4, -20], [2.4, -20],
      [-2.4, -34], [2.4, -34],
      [-4.0, 4], [4.0, 4],
      [10, 22], [20, 32], [30, 42] // Along clifftop trail
    ];

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1e2433, flatShading: true });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });

    lampPositions.forEach(([x, z]) => {
      const lamp = new THREE.Group();
      const groundY = this.getGroundHeight(x, z);
      lamp.position.set(x, groundY, z);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 6), poleMat);
      pole.position.y = 1.8;
      pole.castShadow = true;
      lamp.add(pole);

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), bulbMat);
      lantern.position.y = 3.6;
      lamp.add(lantern);

      const light = new THREE.PointLight(0xffb86c, 1.2, 14, 1.5);
      light.position.y = 3.6;
      lamp.add(light);

      this.rootGroup.add(lamp);

      if (this.collisionWorld) {
        this.collisionWorld.addCylinder(x, z, groundY, groundY + 3.6, 0.16, false, 'streetlamp');
      }
    });
  }

  _buildBeachHouse() {
    this.beachHouseGroup = new THREE.Group();
    const bx = -34;
    const bz = 30;
    const by = this.getGroundHeight(bx, bz);
    this.beachHouseGroup.position.set(bx, by, bz);
    this.beachHouseGroup.rotation.y = 0.35; // Angled facing the sunset surf

    // 1. Stilt posts raising deck above sand
    const stiltMat = new THREE.MeshLambertMaterial({ color: 0x4a3625, flatShading: true });
    const stiltPositions = [
      [-3.2, -2.6], [0, -2.6], [3.2, -2.6],
      [-3.2, 2.6],  [0, 2.6],  [3.2, 2.6]
    ];
    stiltPositions.forEach(([sx, sz]) => {
      const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 6), stiltMat);
      stilt.position.set(sx, 0.9, sz);
      stilt.castShadow = true;
      this.beachHouseGroup.add(stilt);
    });

    // 2. Weathered Wood Deck
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x7a5b3e, flatShading: true });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.32, 6.4), deckMat);
    deck.position.set(0, 2.0, 0);
    deck.receiveShadow = true;
    this.beachHouseGroup.add(deck);

    // Front steps down to the sand
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.5), deckMat);
      step.position.set(0, 1.6 - i * 0.45, 3.4 + i * 0.45);
      step.receiveShadow = true;
      this.beachHouseGroup.add(step);
    }

    // 3. Cabin Body (Vintage Mint / Teal weathered coastal siding)
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x3d706e, flatShading: true });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 4.4), wallMat);
    cabin.position.set(-0.8, 3.75, -0.6);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    this.beachHouseGroup.add(cabin);

    // 4. Overhanging Slanted Coral / Terracotta Shingle Roof
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xba4a3c, flatShading: true });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.38, 5.4), roofMat);
    roof.position.set(-0.8, 5.5, -0.6);
    roof.rotation.x = -0.12; // Slanted pitch toward sea
    roof.castShadow = true;
    this.beachHouseGroup.add(roof);

    // 5. Porch Railings (front and sides of open deck)
    const railMat = new THREE.MeshLambertMaterial({ color: 0x543e2c, flatShading: true });
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 3.2), railMat);
    leftRail.position.set(3.7, 2.6, 1.2);
    this.beachHouseGroup.add(leftRail);

    const frontRailR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.12), railMat);
    frontRailR.position.set(2.4, 2.6, 3.0);
    this.beachHouseGroup.add(frontRailR);

    const frontRailL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.12), railMat);
    frontRailL.position.set(-2.4, 2.6, 3.0);
    this.beachHouseGroup.add(frontRailL);

    // 6. Glowing Windows with warm interior light
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffd175 });
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), windowMat);
    frontWindow.position.set(0.8, 3.8, 1.62);
    this.beachHouseGroup.add(frontWindow);

    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.4), windowMat);
    sideWindow.position.set(1.82, 3.8, -0.6);
    this.beachHouseGroup.add(sideWindow);

    // Warm ambient amber light spilling from cabin
    const interiorLight = new THREE.PointLight(0xffbe6b, 1.6, 14, 1.4);
    interiorLight.position.set(-0.5, 3.8, 0.5);
    this.beachHouseGroup.add(interiorLight);

    // 7. Chill details: Retro 90s dual-tone Surfboard leaning against porch rail
    const boardGroup = new THREE.Group();
    boardGroup.position.set(2.8, 2.1, 3.2);
    boardGroup.rotation.set(-0.25, 0.2, 0.15);

    const boardMat = new THREE.MeshLambertMaterial({ color: 0xff2a6d, flatShading: true });
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 2.4, 8), boardMat);
    board.scale.set(1.0, 1.0, 0.2); // Flatten into surfboard
    board.castShadow = true;
    boardGroup.add(board);

    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x05d9e8 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.08), stripeMat);
    stripe.position.y = 0.2;
    boardGroup.add(stripe);
    this.beachHouseGroup.add(boardGroup);

    // 8. Wooden Beach Lounger / Deckchair
    const chairMat = new THREE.MeshLambertMaterial({ color: 0xe6dfcf, flatShading: true });
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.4), chairMat);
    chairBack.position.set(2.2, 2.5, 1.0);
    chairBack.rotation.x = -0.55;
    this.beachHouseGroup.add(chairBack);

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.1), chairMat);
    chairSeat.position.set(2.2, 2.2, 1.8);
    this.beachHouseGroup.add(chairSeat);

    this.rootGroup.add(this.beachHouseGroup);

    // Register solid beach house colliders (deck, stairs, cabin, roof, lounger)
    if (this.collisionWorld) {
      // 1. Deck
      this.collisionWorld.addRotatedBox(bx, bz, by + 2.0, 3.9, 3.2, 0.2, 0.35, true, 'beachhouse_deck');

      // 2. Front steps down to the sand
      const cosA = Math.cos(0.35);
      const sinA = Math.sin(0.35);
      for (let i = 0; i < 4; i++) {
        const localZ = 3.4 + i * 0.45;
        const stepWorldX = bx + (-localZ * sinA);
        const stepWorldZ = bz + (localZ * cosA);
        const stepY = by + (1.6 - i * 0.45);
        this.collisionWorld.addRotatedBox(stepWorldX, stepWorldZ, stepY, 0.8, 0.28, 0.15, 0.35, true, 'beachhouse_step');
      }

      // 3. Cabin Body & Walls
      const cabinLocalX = -0.8;
      const cabinLocalZ = -0.6;
      const cabinWorldX = bx + (cabinLocalX * cosA - cabinLocalZ * sinA);
      const cabinWorldZ = bz + (cabinLocalX * sinA + cabinLocalZ * cosA);
      this.collisionWorld.addRotatedBox(cabinWorldX, cabinWorldZ, by + 3.75, 2.6, 2.2, 1.6, true, 'beachhouse_cabin');

      // 4. Overhanging Roof
      this.collisionWorld.addRotatedBox(cabinWorldX, cabinWorldZ, by + 5.5, 3.1, 2.7, 0.22, 0.35, true, 'beachhouse_roof');

      // 5. Deck Lounger
      const chairLocalX = 2.2;
      const chairLocalZ = 1.4;
      const chairWorldX = bx + (chairLocalX * cosA - chairLocalZ * sinA);
      const chairWorldZ = bz + (chairLocalX * sinA + chairLocalZ * cosA);
      this.collisionWorld.addRotatedBox(chairWorldX, chairWorldZ, by + 2.3, 0.5, 0.9, 0.18, 0.35, true, 'beachhouse_lounger');
    }
  }

  _buildTreasureCove() {
    this.treasureGroup = new THREE.Group();
    const tx = -48;
    const tz = 16;
    const ty = this.getGroundHeight(tx, tz);
    this.treasureGroup.position.set(tx, ty, tz);

    // 1. Natural sheltering sea rocks surrounding the nook
    this._createRockCluster(tx - 3.5, ty + 1.2, tz + 1.0, 3.8, 2.8, 3.2, 0x4f495c);
    this._createRockCluster(tx + 2.8, ty + 0.9, tz - 2.5, 3.2, 2.2, 3.0, 0x585166);

    // 2. The weathered driftwood "X" marking the spot
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x3d3329, flatShading: true });
    const plank1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.28), plankMat);
    plank1.rotation.y = Math.PI / 4;
    plank1.position.set(-0.8, 0.04, -0.6);
    this.treasureGroup.add(plank1);

    const plank2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.28), plankMat);
    plank2.rotation.y = -Math.PI / 4;
    plank2.position.set(-0.8, 0.05, -0.6);
    this.treasureGroup.add(plank2);

    // 3. Freshly excavated sand pit / mound
    const darkSandMat = new THREE.MeshLambertMaterial({ color: 0x826443, flatShading: true });
    const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), darkSandMat);
    mound.scale.set(1.4, 0.35, 1.3);
    mound.position.set(0.3, 0.15, 0.2);
    this.treasureGroup.add(mound);

    // 4. Shovel stuck in the sand mound
    const shovelGroup = new THREE.Group();
    shovelGroup.position.set(1.0, 0.2, 0.6);
    shovelGroup.rotation.set(0.3, 0.4, -0.25);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x444b54, metalness: 0.6, roughness: 0.5, flatShading: true });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.04), bladeMat);
    blade.position.y = 0.2;
    shovelGroup.add(blade);

    const handleMat = new THREE.MeshLambertMaterial({ color: 0x8a633f, flatShading: true });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 5), handleMat);
    handle.position.y = 0.85;
    shovelGroup.add(handle);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), handleMat);
    grip.position.y = 1.4;
    shovelGroup.add(grip);
    this.treasureGroup.add(shovelGroup);

    // 5. Open pirate/explorer treasure chest
    const chestGroup = new THREE.Group();
    chestGroup.position.set(0, 0.35, 0);
    chestGroup.rotation.y = -0.3;

    const chestWoodMat = new THREE.MeshLambertMaterial({ color: 0x543217, flatShading: true });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25, flatShading: true });

    // Chest Base
    const chestBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.75), chestWoodMat);
    chestBody.castShadow = true;
    chestGroup.add(chestBody);

    // Brass corner braces and lock clasp
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.08), brassMat);
    lock.position.set(0, 0.08, 0.38);
    chestGroup.add(lock);

    const brassBand1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.64, 0.77), brassMat);
    brassBand1.position.x = -0.38;
    chestGroup.add(brassBand1);

    const brassBand2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.64, 0.77), brassMat);
    brassBand2.position.x = 0.38;
    chestGroup.add(brassBand2);

    // Open Lid propped backward
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.31, -0.37);
    lidGroup.rotation.x = -1.1; // Propped wide open

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.15, 8, 1, false, 0, Math.PI), chestWoodMat);
    lid.rotation.z = Math.PI / 2;
    lid.rotation.y = Math.PI;
    lidGroup.add(lid);
    chestGroup.add(lidGroup);

    // 6. Overflowing glittering gold bullion, doubloons & gemstones!
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true
    });

    // Gold bars
    const barPositions = [
      [-0.2, 0.26, -0.05], [0.15, 0.26, -0.08], [0, 0.33, 0.05],
      [-0.15, 0.32, 0.1], [0.22, 0.32, 0.08]
    ];
    barPositions.forEach(([gx, gy, gz], idx) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.16), goldMat);
      bar.position.set(gx, gy, gz);
      bar.rotation.y = idx * 0.45;
      chestGroup.add(bar);
    });

    // Sparkling Ruby & Emerald gems
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.1, metalness: 0.4, flatShading: true });
    const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), rubyMat);
    ruby.position.set(-0.25, 0.36, 0.18);
    chestGroup.add(ruby);

    const cyanGemMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.1, metalness: 0.4, flatShading: true });
    const cyanGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), cyanGemMat);
    cyanGem.position.set(0.28, 0.36, 0.16);
    chestGroup.add(cyanGem);

    // Subtle gold shimmer light
    const treasureGlow = new THREE.PointLight(0xffc83b, 1.2, 7, 1.8);
    treasureGlow.position.set(0, 0.8, 0);
    chestGroup.add(treasureGlow);

    this.treasureGroup.add(chestGroup);
    this.rootGroup.add(this.treasureGroup);

    // Register solid treasure cove colliders (chest, excavated mound)
    if (this.collisionWorld) {
      this.collisionWorld.addBox(tx - 0.6, tx + 0.6, tz - 0.45, tz + 0.45, ty, ty + 0.68, true, 'treasure_chest');
      this.collisionWorld.addCylinder(tx + 0.3, tz + 0.2, ty, ty + 0.35, 1.2, true, 'treasure_mound');
    }
  }

  _buildRadioTower() {
    this.radioTowerGroup = new THREE.Group();
    const rx = -6;
    const rz = 110;
    const ry = this.getGroundHeight(rx, rz);
    this.radioTowerGroup.position.set(rx, ry, rz);

    // 1. Concrete Hexagonal Foundation Plinth
    const plinthMat = new THREE.MeshLambertMaterial({ color: 0x5a5c63, flatShading: true });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.0, 6), plinthMat);
    plinth.position.y = 0.5;
    plinth.receiveShadow = true;
    this.radioTowerGroup.add(plinth);

    // 2. Tall Tapered Lattice Steel Mast (24m high)
    const redMat = new THREE.MeshLambertMaterial({ color: 0xde3333, flatShading: true });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f5fa, flatShading: true });

    // Alternating red and white sections (8 tiers of 3m each)
    const numTiers = 8;
    const totalHeight = 24.0;
    const tierHeight = totalHeight / numTiers;

    for (let t = 0; t < numTiers; t++) {
      const isRed = t % 2 === 0;
      const mat = isRed ? redMat : whiteMat;
      const bottomW = 1.9 * (1 - (t / numTiers) * 0.7);
      const topW = 1.9 * (1 - ((t + 1) / numTiers) * 0.7);
      const tierY = 1.0 + t * tierHeight + tierHeight / 2;

      // 4 Corner structural legs
      const corners = [
        [-1, -1], [1, -1], [1, 1], [-1, 1]
      ];
      corners.forEach(([cx, cz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, tierHeight, 4), mat);
        leg.position.set(cx * ((bottomW + topW) / 4), tierY, cz * ((bottomW + topW) / 4));
        leg.castShadow = true;
        this.radioTowerGroup.add(leg);
      });

      // Horizontal cross brace ring at tier top
      const braceRing = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.08, topW), mat);
      braceRing.position.set(0, 1.0 + (t + 1) * tierHeight, 0);
      this.radioTowerGroup.add(braceRing);
    }

    // 3. Microwave Transceiver Dishes on the tower
    const dishMat = new THREE.MeshLambertMaterial({ color: 0xe8e8f0, flatShading: true });
    const dish1 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2.3), dishMat);
    dish1.position.set(0.6, 17.5, 0);
    dish1.rotation.z = -Math.PI / 2;
    dish1.rotation.y = 0.4;
    this.radioTowerGroup.add(dish1);

    const dish2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2.3), dishMat);
    dish2.position.set(-0.5, 12.0, 0);
    dish2.rotation.z = Math.PI / 2;
    this.radioTowerGroup.add(dish2);

    // 4. Whip Antenna Spire at pinnacle
    const spireMat = new THREE.MeshLambertMaterial({ color: 0xcccccc, flatShading: true });
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 3.5, 4), spireMat);
    spire.position.y = totalHeight + 1.0 + 1.75;
    this.radioTowerGroup.add(spire);

    // 5. Pulsing Aviation Warning Light at pinnacle tip
    const beaconY = totalHeight + 1.0 + 3.5;
    this.radioBeaconMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });
    const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), this.radioBeaconMat);
    beaconMesh.position.y = beaconY;
    this.radioTowerGroup.add(beaconMesh);

    this.radioBeaconLight = new THREE.PointLight(0xff2222, 3.2, 55, 1.2);
    this.radioBeaconLight.position.y = beaconY;
    this.radioTowerGroup.add(this.radioBeaconLight);

    this.rootGroup.add(this.radioTowerGroup);

    // Register solid radio tower plinth and base
    if (this.collisionWorld) {
      this.collisionWorld.addCylinder(rx, rz, ry, ry + 1.0, 2.6, true, 'radio_tower_plinth');
      this.collisionWorld.addCylinder(rx, rz, ry + 1.0, ry + 25.0, 1.1, false, 'radio_tower_mast');
    }
  }

  _buildDistantShip() {
    this.shipGroup = new THREE.Group();
    // Out on the western ocean horizon, visible against the sunset sky
    this.shipGroup.position.set(-175, 0, -105);
    this.shipGroup.rotation.y = 0.28; // Heading across horizon

    // 1. Lower Ship Hull (Deep Red waterline)
    const lowerHullMat = new THREE.MeshLambertMaterial({ color: 0x8a2323, flatShading: true });
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(42, 3.2, 9.5), lowerHullMat);
    lowerHull.position.y = 0.6;
    this.shipGroup.add(lowerHull);

    // 2. Upper Hull & Main Deck (Dark charcoal steel)
    const upperHullMat = new THREE.MeshLambertMaterial({ color: 0x22262c, flatShading: true });
    const upperHull = new THREE.Mesh(new THREE.BoxGeometry(43, 2.2, 10.0), upperHullMat);
    upperHull.position.y = 3.0;
    this.shipGroup.add(upperHull);

    // Angled Bow Wedge
    const bowMat = new THREE.MeshLambertMaterial({ color: 0x22262c, flatShading: true });
    const bow = new THREE.Mesh(new THREE.ConeGeometry(5.2, 9.0, 4), bowMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(24.0, 2.6, 0);
    this.shipGroup.add(bow);

    // 3. Multi-Colored Stacked Cargo Containers
    const containerColors = [0x26688a, 0xd49b28, 0xa63429, 0x247a5b, 0x5a4580];
    const containerCols = 5;
    for (let c = 0; c < containerCols; c++) {
      const cx = 8 - c * 5.8;
      const stackHeight = 2 + (c % 2);
      for (let h = 0; h < stackHeight; h++) {
        const color = containerColors[(c * 3 + h) % containerColors.length];
        const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
        const box = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 8.4), mat);
        box.position.set(cx, 4.8 + h * 2.3, 0);
        this.shipGroup.add(box);
      }
    }

    // 4. White Bridge Superstructure Tower at aft
    const bridgeMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee, flatShading: true });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(9.0, 7.5, 9.2), bridgeMat);
    bridge.position.set(-16.0, 7.0, 0);
    this.shipGroup.add(bridge);

    // Bridge Navigation Windows (dark band)
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x111622 });
    const windows = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.1, 9.4), windowMat);
    windows.position.set(-16.0, 9.2, 0);
    this.shipGroup.add(windows);

    // 5. Dual Smokestacks / Funnels
    const funnelMat = new THREE.MeshLambertMaterial({ color: 0xcc2a2a, flatShading: true });
    const capMat = new THREE.MeshLambertMaterial({ color: 0x151515, flatShading: true });

    const funnel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 4.2, 6), funnelMat);
    funnel1.position.set(-18.5, 12.0, -1.8);
    this.shipGroup.add(funnel1);
    const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.6, 6), capMat);
    cap1.position.set(-18.5, 14.1, -1.8);
    this.shipGroup.add(cap1);

    const funnel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 4.2, 6), funnelMat);
    funnel2.position.set(-18.5, 12.0, 1.8);
    this.shipGroup.add(funnel2);
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.6, 6), capMat);
    cap2.position.set(-18.5, 14.1, 1.8);
    this.shipGroup.add(cap2);

    // 6. Navigation Lights (starboard green, port red, white masthead)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.0, 4), bridgeMat);
    mast.position.set(-16.0, 13.5, 0);
    this.shipGroup.add(mast);

    const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mastLight.position.set(-16.0, 16.5, 0);
    this.shipGroup.add(mastLight);

    const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff2244 }));
    portLight.position.set(-16.0, 8.5, -4.8);
    this.shipGroup.add(portLight);

    const stbdLight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 4, 4), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
    stbdLight.position.set(-16.0, 8.5, 4.8);
    this.shipGroup.add(stbdLight);

    this.rootGroup.add(this.shipGroup);
  }

  _buildCampfireAndBuoys() {
    // 1. Beach Campfire with driftwood log seat
    this.campfireGroup = new THREE.Group();
    const cx = -22;
    const cz = 20;
    const cy = this.getGroundHeight(cx, cz);
    this.campfireGroup.position.set(cx, cy, cz);

    // Ring of 8 low-poly stones
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x504957, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
      stone.position.set(Math.cos(angle) * 0.75, 0.12, Math.sin(angle) * 0.75);
      this.campfireGroup.add(stone);
    }

    // Crossed logs
    const logMat = new THREE.MeshLambertMaterial({ color: 0x3d2719, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.2, 5), logMat);
      log.rotation.z = 0.35;
      log.rotation.y = (i * Math.PI) / 3;
      log.position.y = 0.15;
      this.campfireGroup.add(log);
    }

    // Stylized low-poly flame
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7b00 });
    this.campfireFlame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 5), flameMat);
    this.campfireFlame.position.y = 0.45;
    this.campfireGroup.add(this.campfireFlame);

    // Flickering warm firelight
    this.campfireLight = new THREE.PointLight(0xff6e1a, 1.5, 12, 1.8);
    this.campfireLight.position.y = 0.65;
    this.campfireGroup.add(this.campfireLight);

    // Driftwood log bench
    const benchLog = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 2.6, 6), logMat);
    benchLog.rotation.z = Math.PI / 2;
    benchLog.position.set(0, 0.22, 1.6);
    this.campfireGroup.add(benchLog);

    this.rootGroup.add(this.campfireGroup);

    // Register solid campfire colliders (stones, log bench)
    if (this.collisionWorld) {
      this.collisionWorld.addCylinder(cx, cz, cy, cy + 0.35, 1.0, true, 'campfire_stones');
      this.collisionWorld.addBox(cx - 1.3, cx + 1.3, cz + 1.35, cz + 1.85, cy, cy + 0.45, true, 'campfire_bench');
    }

    // 2. Channel Navigation Buoys bobbing in the harbor
    this.buoys = [];
    const buoyLocations = [
      [14, -32, 0x00e676], // Green starboard buoy
      [-14, -32, 0xff1744] // Red port buoy
    ];

    buoyLocations.forEach(([bx, bz, colorHex], idx) => {
      const buoy = new THREE.Group();
      buoy.position.set(bx, 0, bz);

      const buoyMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 1.8, 6), buoyMat);
      body.position.y = 0.5;
      buoy.add(body);

      // Flashing top light
      const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 4, 4), new THREE.MeshBasicMaterial({ color: colorHex }));
      lightMesh.position.y = 1.5;
      buoy.add(lightMesh);

      const ptLight = new THREE.PointLight(colorHex, 0.9, 10, 2);
      ptLight.position.y = 1.5;
      buoy.add(ptLight);

      this.rootGroup.add(buoy);
      this.buoys.push({ mesh: buoy, light: ptLight });
    });
  }

  _buildBeachBarAndLoungers() {
    this.beachBarGroup = new THREE.Group();
    // Moved back away from the rising eastern hill base onto the open flat sand terrace
    const bx = 11;
    const bz = 14;
    const by = this.getGroundHeight(bx, bz);
    this.beachBarGroup.position.set(bx, by, bz);
    this.beachBarGroup.rotation.y = -0.25; // Angled facing the sunset and ocean surf

    // Materials
    const woodFloorMat = new THREE.MeshLambertMaterial({ color: 0x735338, flatShading: true });
    const teakMat = new THREE.MeshLambertMaterial({ color: 0x543720, flatShading: true });
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0x9e8054, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xb59864, flatShading: true });
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x3d2817, flatShading: true });

    // 1. Weathered Timber Bar Deck Plinth
    const deckGeo = new THREE.BoxGeometry(5.4, 0.25, 4.2);
    const deck = new THREE.Mesh(deckGeo, woodFloorMat);
    deck.position.set(0, 0.12, 0);
    deck.receiveShadow = true;
    this.beachBarGroup.add(deck);

    // 2. Bamboo Bar Counter (L-Shape)
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.05, 0.8), bambooMat);
    counterBody.position.set(0, 0.65, 0.9);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    this.beachBarGroup.add(counterBody);

    // Polished Teak Counter Top
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.1, 1.05), teakMat);
    counterTop.position.set(0, 1.2, 0.9);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    this.beachBarGroup.add(counterTop);

    // L-return counter section
    const returnBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 1.6), bambooMat);
    returnBody.position.set(1.5, 0.65, -0.2);
    returnBody.castShadow = true;
    this.beachBarGroup.add(returnBody);

    const returnTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.8), teakMat);
    returnTop.position.set(1.5, 1.2, -0.2);
    returnTop.castShadow = true;
    this.beachBarGroup.add(returnTop);

    // 3. Back Bar Shelving & Tropical Bottles
    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 0.35), darkWoodMat);
    shelfBack.position.set(-0.2, 1.3, -1.6);
    shelfBack.castShadow = true;
    this.beachBarGroup.add(shelfBack);

    // Shelves with colorful retro tropical bottles
    const bottleColors = [0x00e5ff, 0xff3d71, 0xffaa00, 0x00e676, 0x9c27b0, 0xffea00];
    for (let row = 0; row < 2; row++) {
      const shelfY = 0.85 + row * 0.65;
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.3), teakMat);
      ledge.position.set(-0.2, shelfY, -1.45);
      this.beachBarGroup.add(ledge);

      for (let b = 0; b < 6; b++) {
        const bottleMat = new THREE.MeshStandardMaterial({
          color: bottleColors[(b + row * 2) % bottleColors.length],
          roughness: 0.2,
          metalness: 0.2,
          transparent: true,
          opacity: 0.85,
          flatShading: true
        });
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.28, 5), bottleMat);
        bottle.position.set(-1.2 + b * 0.4, shelfY + 0.17, -1.45);
        this.beachBarGroup.add(bottle);
      }
    }

    // Tiki mugs and coconut cups with paper straws on counter
    const mugMat = new THREE.MeshLambertMaterial({ color: 0x614126, flatShading: true });
    const strawMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    [-1.2, -0.3, 0.6].forEach((mx) => {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.2, 6), mugMat);
      mug.position.set(mx, 1.35, 0.9);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 4), strawMat);
      straw.position.set(mx + 0.02, 1.45, 0.9);
      straw.rotation.z = 0.25;
      this.beachBarGroup.add(mug);
      this.beachBarGroup.add(straw);
    });

    // 4. Low-Poly Barstools (4 stools in front of counter)
    const stoolMat = new THREE.MeshLambertMaterial({ color: 0x8a623c, flatShading: true });
    const stoolLegMat = new THREE.MeshLambertMaterial({ color: 0x4a321b, flatShading: true });
    const stoolPositions = [-1.4, -0.5, 0.4, 1.2];

    stoolPositions.forEach((sx) => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(sx, 0, 1.85);

      // Round seat
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.08, 8), stoolMat);
      seat.position.y = 0.74;
      seat.castShadow = true;
      seat.receiveShadow = true;
      stoolGroup.add(seat);

      // 3 splayed legs
      for (let l = 0; l < 3; l++) {
        const legAngle = (l / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.74, 4), stoolLegMat);
        leg.position.set(Math.cos(legAngle) * 0.16, 0.37, Math.sin(legAngle) * 0.16);
        leg.rotation.z = Math.sin(legAngle) * 0.12;
        leg.rotation.x = -Math.cos(legAngle) * 0.12;
        leg.castShadow = true;
        stoolGroup.add(leg);
      }

      this.beachBarGroup.add(stoolGroup);
    });

    // 5. Bamboo Corner Pillars and Pitched Thatched Canopy Roof
    const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 2.7, 6);
    const postCoords = [
      [-2.4, -1.8], [2.4, -1.8],
      [-2.4, 1.8],  [2.4, 1.8]
    ];
    postCoords.forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, bambooMat);
      post.position.set(px, 1.35, pz);
      post.castShadow = true;
      this.beachBarGroup.add(post);
    });

    // Thatched overhanging roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 4.4), thatchMat);
    roof.position.set(0, 2.85, 0);
    roof.rotation.x = 0.08; // Slanted forward
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.beachBarGroup.add(roof);

    // Decorative straw fringe / overhang ridge
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(3.2, 0.6, 4), thatchMat);
    ridge.position.set(0, 3.25, 0);
    ridge.scale.set(1.0, 0.6, 0.7);
    this.beachBarGroup.add(ridge);

    // Hanging sign: "SUNSET BAR // VIBES"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.06), darkWoodMat);
    signBoard.position.set(0, 2.45, 1.95);
    this.beachBarGroup.add(signBoard);

    const signText = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.08), new THREE.MeshBasicMaterial({ color: 0xffe082 }));
    signText.position.set(0, 2.45, 1.96);
    this.beachBarGroup.add(signText);

    // Leaning Surfboard by bar return
    const surfGroup = new THREE.Group();
    surfGroup.position.set(2.2, 0.1, 0.4);
    surfGroup.rotation.set(0.15, -0.4, 0.2);
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 2.2, 8), new THREE.MeshLambertMaterial({ color: 0x00e5ff, flatShading: true }));
    board.scale.set(1.0, 1.0, 0.18);
    board.castShadow = true;
    surfGroup.add(board);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2a7a }));
    stripe.position.y = 0.2;
    surfGroup.add(stripe);
    this.beachBarGroup.add(surfGroup);

    // 6. Festive String Lights Draped Across the Bar Eaves
    this.barStringLights = [];
    const bulbMatCyan = new THREE.MeshBasicMaterial({ color: 0x4deeea });
    const bulbMatPink = new THREE.MeshBasicMaterial({ color: 0xff3b7b });
    const bulbMatAmber = new THREE.MeshBasicMaterial({ color: 0xffb830 });
    const bulbMatLime = new THREE.MeshBasicMaterial({ color: 0x69f0ae });
    const bulbMats = [bulbMatCyan, bulbMatPink, bulbMatAmber, bulbMatLime];

    // Swag 1: Along the front eaves of the canopy (from x=-2.4 to x=2.4 at z=2.05)
    const numEaveBulbs = 10;
    for (let i = 0; i < numEaveBulbs; i++) {
      const t = i / (numEaveBulbs - 1);
      const bxCoord = -2.3 + t * 4.6;
      const sag = Math.sin(t * Math.PI) * 0.22;
      const byCoord = 2.65 - sag;
      const bzCoord = 2.05;

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), bulbMats[i % bulbMats.length]);
      bulb.position.set(bxCoord, byCoord, bzCoord);
      this.beachBarGroup.add(bulb);
      this.barStringLights.push(bulb);
    }

    // Swag 2: Side draped light string out to beach entrance post
    const sidePole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.8, 5), bambooMat);
    sidePole.position.set(-3.8, 1.4, 3.2);
    sidePole.castShadow = true;
    this.beachBarGroup.add(sidePole);

    const numSideBulbs = 6;
    for (let j = 0; j < numSideBulbs; j++) {
      const t = j / (numSideBulbs - 1);
      const px = -2.4 + t * (-1.4);
      const pz = 1.8 + t * 1.4;
      const sag = Math.sin(t * Math.PI) * 0.28;
      const py = 2.65 - sag;

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), bulbMats[(j + 2) % bulbMats.length]);
      bulb.position.set(px, py, pz);
      this.beachBarGroup.add(bulb);
      this.barStringLights.push(bulb);
    }

    // Warm Festive Bar Point Lights spilling over counter & sand
    const barGlow1 = new THREE.PointLight(0xffa834, 1.8, 14, 1.4);
    barGlow1.position.set(-0.8, 2.2, 1.1);
    this.beachBarGroup.add(barGlow1);

    const barGlow2 = new THREE.PointLight(0x4deeea, 1.4, 12, 1.5);
    barGlow2.position.set(1.0, 2.2, 1.1);
    this.beachBarGroup.add(barGlow2);

    this.rootGroup.add(this.beachBarGroup);

    // 7. Solid Collision Registration for Tiki Bar
    if (this.collisionWorld) {
      const rot = -0.25;
      const cosA = Math.cos(rot);
      const sinA = Math.sin(rot);

      // Main counter & top (solid obstacle and jumpable)
      const ctrLocalX = 0;
      const ctrLocalZ = 0.9;
      const ctrWorldX = bx + (ctrLocalX * cosA - ctrLocalZ * sinA);
      const ctrWorldZ = bz + (ctrLocalX * sinA + ctrLocalZ * cosA);
      this.collisionWorld.addRotatedBox(ctrWorldX, ctrWorldZ, by + 0.65, 2.05, 0.52, 0.6, rot, true, 'bar_counter');

      // Back bar shelf
      const shLocalX = -0.2;
      const shLocalZ = -1.6;
      const shWorldX = bx + (shLocalX * cosA - shLocalZ * sinA);
      const shWorldZ = bz + (shLocalX * sinA + shLocalZ * cosA);
      this.collisionWorld.addRotatedBox(shWorldX, shWorldZ, by + 1.2, 1.6, 0.25, 0.9, rot, true, 'bar_shelf');

      // 4 Barstools (solid jumping steps!)
      stoolPositions.forEach((sx) => {
        const stLocalX = sx;
        const stLocalZ = 1.85;
        const stWorldX = bx + (stLocalX * cosA - stLocalZ * sinA);
        const stWorldZ = bz + (stLocalX * sinA + stLocalZ * cosA);
        this.collisionWorld.addCylinder(stWorldX, stWorldZ, by, by + 0.78, 0.28, true, 'barstool');
      });

      // Canopy roof
      this.collisionWorld.addRotatedBox(bx, bz, by + 2.85, 2.8, 2.2, 0.2, rot, true, 'bar_roof');
    }

    // 8. Beach Loungers & Parasols facing Sunset surf
    this._buildBeachLoungers();
  }

  _buildBeachLoungers() {
    this.loungersGroup = new THREE.Group();

    // 3 beach loungers squarely on the warm sand facing the ocean and sunset
    const loungerConfigs = [
      { x: 18.0, z: 4.8, rot: 0.15, stripeColor: 0x00e5ff }, // Neon cyan stripes
      { x: 22.0, z: 4.2, rot: 0.05, stripeColor: 0xff5252 }, // Coral red stripes
      { x: 26.0, z: 4.8, rot: -0.15, stripeColor: 0xffb74d } // Golden amber stripes
    ];

    const frameWoodMat = new THREE.MeshLambertMaterial({ color: 0x6e4e32, flatShading: true });
    const whiteFabricMat = new THREE.MeshLambertMaterial({ color: 0xefede6, flatShading: true });
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0x9e8054, flatShading: true });

    loungerConfigs.forEach((cfg, idx) => {
      const ly = this.getGroundHeight(cfg.x, cfg.z);
      const lounger = new THREE.Group();
      lounger.position.set(cfg.x, ly, cfg.z);
      lounger.rotation.y = cfg.rot;

      const stripeMat = new THREE.MeshLambertMaterial({ color: cfg.stripeColor, flatShading: true });

      // 1. Wooden frame & legs
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 1.95), frameWoodMat);
      frame.position.set(0, 0.28, 0);
      frame.castShadow = true;
      frame.receiveShadow = true;
      lounger.add(frame);

      // 4 low timber legs
      [[-0.38, -0.85], [0.38, -0.85], [-0.38, 0.85], [0.38, 0.85]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 4), frameWoodMat);
        leg.position.set(lx, 0.14, lz);
        leg.castShadow = true;
        lounger.add(leg);
      });

      // 2. Striped canvas seat mattress
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 1.25), whiteFabricMat);
      seat.position.set(0, 0.38, -0.2);
      seat.castShadow = true;
      lounger.add(seat);

      // Striped accent bands
      for (let s = 0; s < 3; s++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.79, 0.105, 0.18), stripeMat);
        band.position.set(0, 0.38, -0.6 + s * 0.4);
        lounger.add(band);
      }

      // 3. Tilted canvas backrest
      const backGroup = new THREE.Group();
      backGroup.position.set(0, 0.38, 0.45);
      backGroup.rotation.x = 0.55; // Reclined ~30 degrees

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.75), whiteFabricMat);
      back.position.set(0, 0, 0.35);
      back.castShadow = true;
      backGroup.add(back);

      const backStripe = new THREE.Mesh(new THREE.BoxGeometry(0.79, 0.105, 0.25), stripeMat);
      backStripe.position.set(0, 0, 0.35);
      backGroup.add(backStripe);

      lounger.add(backGroup);

      // 4. Little timber crate drink table beside lounger
      const tableX = 0.75;
      const tableZ = 0.15;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.48), frameWoodMat);
      crate.position.set(tableX, 0.19, tableZ);
      crate.castShadow = true;
      crate.receiveShadow = true;
      lounger.add(crate);

      // Coconut with straw on table
      const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshLambertMaterial({ color: 0x4a301d, flatShading: true }));
      coconut.position.set(tableX, 0.45, tableZ);
      lounger.add(coconut);

      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 4), new THREE.MeshBasicMaterial({ color: cfg.stripeColor }));
      straw.position.set(tableX + 0.02, 0.53, tableZ);
      straw.rotation.z = 0.2;
      lounger.add(straw);

      // 5. Tilting low-poly striped beach umbrella / parasol
      const umbrellaGroup = new THREE.Group();
      umbrellaGroup.position.set(tableX + 0.35, 0, tableZ - 0.5);
      umbrellaGroup.rotation.z = 0.12; // Gentle tilt away from sea breeze
      umbrellaGroup.rotation.x = -0.08;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 5), bambooMat);
      pole.position.y = 1.2;
      pole.castShadow = true;
      umbrellaGroup.add(pole);

      // 8-segment faceted parasol canopy
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.55, 8), stripeMat);
      canopy.position.y = 2.4;
      canopy.castShadow = true;
      umbrellaGroup.add(canopy);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.37, 0.57, 8, 1, false, 0, Math.PI), whiteFabricMat);
      cap.position.y = 2.4;
      umbrellaGroup.add(cap);

      lounger.add(umbrellaGroup);

      this.loungersGroup.add(lounger);

      // 6. Solid Collision Registration for Lounger & Crate Table
      if (this.collisionWorld) {
        // Lounger surface (jumpable platform)
        this.collisionWorld.addRotatedBox(cfg.x, cfg.z, ly + 0.25, 0.5, 1.05, 0.2, cfg.rot, true, 'beach_lounger');
        // Parasol pole
        const pWorldX = cfg.x + (tableX + 0.35) * Math.cos(cfg.rot) - (tableZ - 0.5) * Math.sin(cfg.rot);
        const pWorldZ = cfg.z + (tableX + 0.35) * Math.sin(cfg.rot) + (tableZ - 0.5) * Math.cos(cfg.rot);
        this.collisionWorld.addCylinder(pWorldX, pWorldZ, ly, ly + 2.4, 0.1, false, 'umbrella_pole');
      }
    });

    this.rootGroup.add(this.loungersGroup);
  }

  _buildDanceArea() {
    this.danceGroup = new THREE.Group();
    const dx = 0;
    const dz = 22;
    const dy = this.getIslandElevation(dx, dz);
    this.danceGroup.position.set(dx, dy, dz);

    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x181a24, flatShading: true });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222633, metalness: 0.85, roughness: 0.3, flatShading: true });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8e5, metalness: 0.9, roughness: 0.1, flatShading: true });
    const vinylMat = new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 0.35, metalness: 0.35, flatShading: true });
    const speakerBodyMat = new THREE.MeshLambertMaterial({ color: 0x12141c, flatShading: true });
    const speakerGrillMat = new THREE.MeshLambertMaterial({ color: 0x202430, flatShading: true });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x8a92a6, metalness: 0.85, roughness: 0.35, flatShading: true });

    // 1. Tiled Dance Floor (8.4m x 8.4m with 8x8 tiled grid)
    const floorFrame = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.22, 8.8), darkWoodMat);
    floorFrame.position.y = 0.11;
    floorFrame.receiveShadow = true;
    this.danceGroup.add(floorFrame);

    this.danceTiles = [];
    const tileColors = [0x16192b, 0x00e5ff, 0x16192b, 0xff007f, 0x16192b, 0x7928ca, 0x16192b, 0xffaa00];
    const tileSize = 0.96;
    const halfGrid = 3.5;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isNeon = (row + col) % 2 === 1;
        const color = isNeon ? tileColors[(row * 3 + col) % tileColors.length] : 0x16192b;
        const tileMat = isNeon 
          ? new THREE.MeshBasicMaterial({ color })
          : new THREE.MeshLambertMaterial({ color, flatShading: true });

        const tile = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.05, tileSize), tileMat);
        const tx = (col - halfGrid) * 1.02;
        const tz = (row - halfGrid) * 1.02;
        tile.position.set(tx, 0.23, tz);
        tile.receiveShadow = true;
        this.danceGroup.add(tile);

        if (isNeon) {
          this.danceTiles.push({
            mesh: tile,
            baseColor: color,
            distFromCenter: Math.hypot(tx, tz),
            phase: (row + col) * 0.4
          });
        }
      }
    }

    // 2. DJ Booth / Riser
    const boothRiser = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.8), darkWoodMat);
    boothRiser.position.set(0, 0.25, 3.4);
    boothRiser.castShadow = true;
    boothRiser.receiveShadow = true;
    this.danceGroup.add(boothRiser);

    const boothTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.95, 0.85), metalMat);
    boothTable.position.set(0, 0.85, 3.4);
    boothTable.castShadow = true;
    this.danceGroup.add(boothTable);

    // Neon front banner: "164 BPM // DNB ARENA"
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.05), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    banner.position.set(0, 0.85, 2.95);
    this.danceGroup.add(banner);

    const bannerLogo = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.07), new THREE.MeshBasicMaterial({ color: 0xff007f }));
    bannerLogo.position.set(0, 0.85, 2.96);
    this.danceGroup.add(bannerLogo);

    // 2x Turntables (vinyl platters)
    [-0.7, 0.7].forEach((tx, i) => {
      // Turntable base
      const ttBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.48), darkWoodMat);
      ttBase.position.set(tx, 1.36, 3.4);
      this.danceGroup.add(ttBase);

      // Silver platter
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), chromeMat);
      platter.position.set(tx - 0.02, 1.4, 3.4);
      this.danceGroup.add(platter);

      // Vinyl record
      const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 12), vinylMat);
      vinyl.position.set(tx - 0.02, 1.415, 3.4);
      this.danceGroup.add(vinyl);

      // Vinyl label
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff007f : 0x00e5ff }));
      label.position.set(tx - 0.02, 1.42, 3.4);
      this.danceGroup.add(label);

      // Tone arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), chromeMat);
      arm.position.set(tx + 0.15, 1.43, 3.32);
      arm.rotation.z = Math.PI / 4;
      arm.rotation.y = 0.3;
      this.danceGroup.add(arm);
    });

    // Central Mixer console
    const mixer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.5), darkWoodMat);
    mixer.position.set(0, 1.37, 3.4);
    this.danceGroup.add(mixer);

    // Mixer LED level strips
    [-0.06, 0.06].forEach((mx) => {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.24), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
      led.position.set(mx, 1.42, 3.4);
      this.danceGroup.add(led);
    });

    // DJ Headphones resting on mixer
    const hp = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI), chromeMat);
    hp.position.set(0.15, 1.43, 3.55);
    hp.rotation.x = Math.PI / 2;
    this.danceGroup.add(hp);

    // 3. Towering PA Speaker Stacks (Left & Right)
    [-3.8, 3.8].forEach((sx) => {
      const speakerGroup = new THREE.Group();
      speakerGroup.position.set(sx, 0, 3.2);

      // Double 18" Subwoofer Base Cabinet
      const sub = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.95), speakerBodyMat);
      sub.position.y = 0.55;
      sub.castShadow = true;
      speakerGroup.add(sub);

      // Subwoofer grilles
      [-0.26, 0.26].forEach((sy) => {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.06, 8), speakerGrillMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, 0.55 + sy, -0.48);
        speakerGroup.add(cone);
      });

      // Mid-High Top Horn Cabinet
      const mid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.8), speakerBodyMat);
      mid.position.y = 1.65;
      mid.castShadow = true;
      speakerGroup.add(mid);

      // Mid horn cone & compression flare
      const midCone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 0.06, 8), speakerGrillMat);
      midCone.rotation.x = Math.PI / 2;
      midCone.position.set(0, 1.5, -0.41);
      speakerGroup.add(midCone);

      const flare = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.35, 4), speakerGrillMat);
      flare.rotation.x = -Math.PI / 2;
      flare.position.set(0, 1.9, -0.41);
      speakerGroup.add(flare);

      this.danceGroup.add(speakerGroup);
    });

    // 4. Aluminum Lighting Truss & Moving Stage Spotlights
    const trussPosts = [
      [-4.0, 3.6], [4.0, 3.6],
      [-4.0, -3.6], [4.0, -3.6]
    ];
    trussPosts.forEach(([tx, tz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 4), trussMat);
      col.position.set(tx, 2.1, tz);
      col.castShadow = true;
      this.danceGroup.add(col);
    });

    // Horizontal truss beams
    const beamFront = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.16, 0.16), trussMat);
    beamFront.position.set(0, 4.2, 3.6);
    this.danceGroup.add(beamFront);

    const beamBack = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.16, 0.16), trussMat);
    beamBack.position.set(0, 4.2, -3.6);
    this.danceGroup.add(beamBack);

    // 4x Stage Spotlights on front truss
    this.stageSpots = [];
    const spotColors = [0x00e5ff, 0xff007f, 0xffea00, 0x7928ca];
    [-2.8, -1.0, 1.0, 2.8].forEach((lx, idx) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.35, 6), darkWoodMat);
      can.position.set(lx, 4.05, 3.5);
      can.rotation.x = 0.6; // Angled down towards dancefloor
      can.rotation.y = (idx - 1.5) * 0.25;
      this.danceGroup.add(can);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), new THREE.MeshBasicMaterial({ color: spotColors[idx] }));
      lens.position.set(0, -0.18, 0);
      lens.rotation.x = Math.PI / 2;
      can.add(lens);

      const spotLight = new THREE.SpotLight(spotColors[idx], 3.0, 14, Math.PI / 6, 0.4, 1.2);
      spotLight.position.set(lx, 4.0, 3.5);
      const target = new THREE.Object3D();
      target.position.set(lx * 0.4, 0.2, 0);
      this.danceGroup.add(target);
      spotLight.target = target;
      this.danceGroup.add(spotLight);

      this.stageSpots.push({ can, spotLight, target, baseAngle: idx * 1.5 });
    });

    // Vibrant dance floor wash point lights
    const washLight1 = new THREE.PointLight(0x00e5ff, 1.8, 12, 1.6);
    washLight1.position.set(-2.0, 2.8, 0);
    this.danceGroup.add(washLight1);

    const washLight2 = new THREE.PointLight(0xff007f, 1.8, 12, 1.6);
    washLight2.position.set(2.0, 2.8, 0);
    this.danceGroup.add(washLight2);

    this.rootGroup.add(this.danceGroup);

    // 5. Solid Collision Registration for Dance Area
    if (this.collisionWorld) {
      // Dance floor surface (walkable/jumpable)
      this.collisionWorld.addBox(dx - 4.4, dx + 4.4, dz - 4.4, dz + 4.4, dy, dy + 0.25, true, 'dance_floor');

      // DJ Booth Table
      this.collisionWorld.addBox(dx - 1.35, dx + 1.35, dz + 2.9, dz + 3.85, dy, dy + 1.35, true, 'dj_booth');

      // Speaker Stacks (Jumpable club stacks!)
      this.collisionWorld.addBox(dx - 4.4, dx - 3.2, dz + 2.7, dz + 3.7, dy, dy + 2.4, true, 'speaker_left');
      this.collisionWorld.addBox(dx + 3.2, dx + 4.4, dz + 2.7, dz + 3.7, dy, dy + 2.4, true, 'speaker_right');

      // Truss Pillars
      trussPosts.forEach(([tx, tz]) => {
        this.collisionWorld.addCylinder(dx + tx, dz + tz, dy, dy + 4.2, 0.16, false, 'truss_pillar');
      });
    }
  }

  _buildJetSkis() {
    this.jetSkis = [];

    const jetSkiConfigs = [
      { x: 8.5, z: 1.5, rot: 0.35, hullColor: 0x00e5ff, stripeColor: 0xff2a7a, name: "WAVERUNNER 750 // TEAL" },
      { x: -8.5, z: 1.5, rot: -0.35, hullColor: 0xffea00, stripeColor: 0x9c27b0, name: "WAVERUNNER 750 // SOLAR" },
      { x: 18.5, z: 3.5, rot: 0.15, hullColor: 0x00e676, stripeColor: 0xff6d00, name: "WAVERUNNER 750 // LIME" }
    ];

    const seatMat = new THREE.MeshLambertMaterial({ color: 0x181a24, flatShading: true });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2, flatShading: true });
    const blackRubberMat = new THREE.MeshLambertMaterial({ color: 0x0a0c10, flatShading: true });

    jetSkiConfigs.forEach((cfg, idx) => {
      const jsGroup = new THREE.Group();
      jsGroup.position.set(cfg.x, 0.15, cfg.z);
      jsGroup.rotation.y = cfg.rot;

      const hullMat = new THREE.MeshLambertMaterial({ color: cfg.hullColor, flatShading: true });
      const stripeMat = new THREE.MeshLambertMaterial({ color: cfg.stripeColor, flatShading: true });

      // 1. Lower streamlined V-hull
      const hullGeo = new THREE.BoxGeometry(0.85, 0.32, 2.1);
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.position.y = 0.16;
      hull.castShadow = true;
      jsGroup.add(hull);

      // Angled wedge bow
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.75, 4), hullMat);
      bow.position.set(0, 0.22, -1.25);
      bow.rotation.x = -Math.PI / 2;
      bow.rotation.y = Math.PI / 4;
      bow.scale.set(0.9, 1.0, 0.45);
      bow.castShadow = true;
      jsGroup.add(bow);

      // 2. Upper deck & racing cowl
      const deckCowl = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 1.4), stripeMat);
      deckCowl.position.set(0, 0.38, -0.2);
      jsGroup.add(deckCowl);

      // 3. Ergonomic Sport Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 1.15), seatMat);
      seat.position.set(0, 0.52, 0.15);
      seat.castShadow = true;
      jsGroup.add(seat);

      // 4. Handlebars & Steering Column
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.38, 4), blackRubberMat);
      stem.position.set(0, 0.58, -0.58);
      stem.rotation.x = -0.35;
      jsGroup.add(stem);

      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 5), chromeMat);
      bar.position.set(0, 0.72, -0.65);
      bar.rotation.z = Math.PI / 2;
      jsGroup.add(bar);

      // Handlebar rubber grips
      [-0.24, 0.24].forEach((gx) => {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.14, 5), blackRubberMat);
        grip.position.set(gx, 0.72, -0.65);
        grip.rotation.z = Math.PI / 2;
        jsGroup.add(grip);
      });

      // Dashboard instrument screen
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.12), new THREE.MeshBasicMaterial({ color: 0x4deeea }));
      dash.position.set(0, 0.62, -0.52);
      dash.rotation.x = 0.5;
      jsGroup.add(dash);

      // 5. Jet pump nozzle at rear stern
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 6), blackRubberMat);
      nozzle.position.set(0, 0.12, 1.15);
      nozzle.rotation.x = Math.PI / 2;
      jsGroup.add(nozzle);

      // 6. Mooring rope to wooden beach stake
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 5), new THREE.MeshLambertMaterial({ color: 0x4a321c, flatShading: true }));
      stake.position.set(cfg.x + Math.sin(cfg.rot) * 1.5, this.getGroundHeight(cfg.x, cfg.z + 1.6) + 0.25, cfg.z + Math.cos(cfg.rot) * 1.5 + 0.6);
      stake.castShadow = true;
      this.rootGroup.add(stake);

      this.rootGroup.add(jsGroup);
      this.jetSkis.push({
        group: jsGroup,
        baseY: 0.15,
        baseRotY: cfg.rot,
        phase: idx * 1.8
      });

      // Solid collision: Walkable/jumpable top
      if (this.collisionWorld) {
        this.collisionWorld.addRotatedBox(cfg.x, cfg.z, 0.35, 0.5, 1.15, 0.3, cfg.rot, true, 'jet_ski');
      }
    });
  }

  _buildWindingPath() {
    this.trailGroup = new THREE.Group();

    // 1. Waypoints defining the winding cliffside path
    const waypoints = [
      [2, 12], [6, 18], [11, 26], [16, 34],
      [22, 42], [28, 50], [36, 57], [42, 63], [48, 68]
    ];

    const stepMat = new THREE.MeshLambertMaterial({ color: 0x5a3d24, flatShading: true });
    const stonePaverMat = new THREE.MeshLambertMaterial({ color: 0x6e6575, flatShading: true });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x47301c, flatShading: true });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });

    // 2. Generate sleeper steps along the winding trail
    for (let i = 0; i < waypoints.length - 1; i++) {
      const [x1, z1] = waypoints[i];
      const [x2, z2] = waypoints[i + 1];
      const segDist = Math.hypot(x2 - x1, z2 - z1);
      const stepsInSeg = Math.max(3, Math.round(segDist / 1.7));

      for (let s = 0; s < stepsInSeg; s++) {
        const t = s / stepsInSeg;
        const px = x1 + t * (x2 - x1);
        const pz = z1 + t * (z2 - z1);
        const py = this.getGroundHeight(px, pz);
        const rotY = Math.atan2(x2 - x1, z2 - z1);

        // Wooden sleeper step
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 0.38), stepMat);
        step.position.set(px, py + 0.07, pz);
        step.rotation.y = rotY;
        step.receiveShadow = true;
        step.castShadow = true;
        this.trailGroup.add(step);

        // Scattered flat stone paver
        if (s % 2 === 0) {
          const paver = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), stonePaverMat);
          paver.scale.set(1.4, 0.25, 1.2);
          paver.position.set(px + (Math.sin(s * 3) * 0.4), py + 0.05, pz + 0.6);
          paver.receiveShadow = true;
          this.trailGroup.add(paver);
        }

        // 3. Post-and-rope safety fence & trail lanterns along seaward cliff edge
        if (s === 0) {
          const nx = -(z2 - z1) / segDist;
          const nz = (x2 - x1) / segDist;
          const fenceX = px + nx * 1.1;
          const fenceZ = pz + nz * 1.1;
          const fenceY = this.getGroundHeight(fenceX, fenceZ);

          const fencePost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 5), postMat);
          fencePost.position.set(fenceX, fenceY + 0.55, fenceZ);
          fencePost.castShadow = true;
          this.trailGroup.add(fencePost);

          // Rustic trail lantern on switchback posts
          if (i % 2 === 0) {
            const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), lanternMat);
            lantern.position.set(fenceX, fenceY + 1.2, fenceZ);
            this.trailGroup.add(lantern);

            const ptLight = new THREE.PointLight(0xffb86c, 1.1, 10, 1.8);
            ptLight.position.set(fenceX, fenceY + 1.2, fenceZ);
            this.trailGroup.add(ptLight);
          }
        }
      }
    }

    // 4. Midway Scenic Rest Bench at switchback (25, 44) overlooking beach and ocean
    const benchX = 25;
    const benchZ = 44;
    const benchY = this.getGroundHeight(benchX, benchZ);

    const benchGroup = new THREE.Group();
    benchGroup.position.set(benchX, benchY, benchZ);
    benchGroup.rotation.y = -1.1; // Facing the open sunset and beach below

    const benchWood = new THREE.MeshLambertMaterial({ color: 0x734d2f, flatShading: true });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.55), benchWood);
    seat.position.y = 0.45;
    seat.castShadow = true;
    seat.receiveShadow = true;
    benchGroup.add(seat);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), benchWood);
    backrest.position.set(0, 0.8, -0.24);
    backrest.castShadow = true;
    benchGroup.add(backrest);

    // Bench legs
    [[-0.75, -0.18], [0.75, -0.18], [-0.75, 0.18], [0.75, 0.18]].forEach(([bx, bz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), postMat);
      leg.position.set(bx, 0.22, bz);
      leg.castShadow = true;
      benchGroup.add(leg);
    });

    this.trailGroup.add(benchGroup);
    this.rootGroup.add(this.trailGroup);

    // Register bench collision
    if (this.collisionWorld) {
      this.collisionWorld.addRotatedBox(benchX, benchZ, benchY + 0.45, 0.9, 0.35, 0.25, -1.1, true, 'trail_bench');
    }
  }

  _buildShrubs() {
    this.shrubsGroup = new THREE.Group();

    // Natural low-poly coastal shrub / bush foliage colors (soft sage, olive, sea-green, golden scrub)
    const shrubColors = [0x3c613f, 0x47633b, 0x365445, 0x566d3f, 0x415b49];
    const berryColors = [0xff6b81, 0xffd166, 0xc084fc, 0x38ef7d];

    // Candidate natural coordinates across open meadows, slopes, and forest buffers (avoiding dense structures)
    const candidateLocations = [
      // Western open meadows & gentle knolls (between campfire and beach house)
      [-16, 24], [-18, 28], [-14, 32], [-24, 34], [-28, 38], [-22, 42],
      // Foothills & hillside past the beach shack (towards quad bike and hills)
      [-30, 48], [-38, 54], [-32, 58], [-26, 52], [-42, 48], [-44, 40],
      // Northern gentle forest clearings & hillside slopes
      [-6, 44], [-2, 48], [8, 48], [4, 54], [12, 56], [-8, 60], [2, 68],
      // Eastern gentle slopes & scenic meadows below the high cliffs
      [14, 36], [18, 42], [24, 36], [28, 32], [22, 28], [28, 24],
      // Hillside meadow along switchback buffer
      [14, 20], [10, 32], [32, 46], [38, 50], [20, 58], [26, 62],
      // Inland open forest meadows
      [-18, 70], [-26, 66], [-14, 82], [14, 80], [8, 86], [-4, 78],
      // Clifftop meadow buffers (not blocking paths or edges)
      [36, 70], [40, 74], [44, 58], [42, 52]
    ];

    candidateLocations.forEach(([x, z]) => {
      const gy = this.getGroundHeight(x, z);
      if (gy < 1.4 || gy > 20) return; // Skip sea level and high crags

      // Strict exclusion zones to ensure shrubs are only in sparse, natural areas
      if (Math.abs(x) < 4.5 && z < 14) return; // Pier/boardwalk
      if (Math.hypot(x, z - 22) < 9.5) return; // Dance area
      if (Math.hypot(x - 11, z - 14) < 9.0) return; // Beach bar
      if (Math.hypot(x - 22, z - 5) < 8.5) return; // Sun loungers
      if (Math.hypot(x - (-34), z - 30) < 10) return; // Beach shack
      if (Math.hypot(x - (-36), z - 46) < 7) return; // Quad bike
      if (Math.hypot(x - (-22), z - 20) < 7) return; // Campfire
      if (Math.hypot(x - (-48), z - 16) < 9) return; // Treasure cove
      if (Math.hypot(x - (-6), z - 110) < 11) return; // Radio tower
      if (Math.hypot(x - 48, z - 68) < 10) return; // Clifftop lookout
      if (this._distanceToTrail(x, z) < 1.9) return; // Don't block trail

      // Multi-lobed low-poly bush cluster
      const cluster = new THREE.Group();
      cluster.position.set(x, gy, z);

      const numLobes = 2 + Math.floor(Math.random() * 2); // 2 to 3 lobes
      const baseMat = new THREE.MeshLambertMaterial({
        color: shrubColors[Math.floor(Math.random() * shrubColors.length)],
        flatShading: true
      });

      for (let l = 0; l < numLobes; l++) {
        const rad = 0.45 + Math.random() * 0.45;
        const lobeGeo = new THREE.DodecahedronGeometry(rad, 0);
        const lobe = new THREE.Mesh(lobeGeo, baseMat);

        const ox = (l === 0) ? 0 : (Math.random() - 0.5) * 0.7;
        const oz = (l === 0) ? 0 : (Math.random() - 0.5) * 0.7;
        const oy = rad * 0.65;

        lobe.position.set(ox, oy, oz);
        lobe.scale.set(1.15, 0.75, 1.15); // Flattened low-poly coastal shrub
        lobe.castShadow = true;
        lobe.receiveShadow = true;
        cluster.add(lobe);

        // Scattered wildflower / berry specks
        if (Math.random() > 0.4) {
          const berryColor = berryColors[Math.floor(Math.random() * berryColors.length)];
          const berryMat = new THREE.MeshBasicMaterial({ color: berryColor });
          for (let b = 0; b < 3; b++) {
            const berry = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), berryMat);
            berry.position.set(
              ox + (Math.random() - 0.5) * rad * 0.8,
              oy + rad * 0.6 + Math.random() * 0.1,
              oz + (Math.random() - 0.5) * rad * 0.8
            );
            cluster.add(berry);
          }
        }
      }

      this.shrubsGroup.add(cluster);
    });

    this.rootGroup.add(this.shrubsGroup);
  }

  _buildStuntRamps() {
    this.rampsGroup = new THREE.Group();

    const rampConfigs = [
      // 1. Foothills Launch Ramp near the quad bike heading north into the valley/hills
      { x: -28, z: 52, rotY: 0.25, width: 3.8, length: 6.2, height: 2.1, tag: 'foothill_stunt_ramp' },
      // 2. Coastal Dunes Shoreline Mega Kicker Ramp launching out toward the surf
      { x: -16, z: 14, rotY: -0.65, width: 4.0, length: 6.5, height: 2.3, tag: 'beach_stunt_ramp' }
    ];

    const rampPlankMat = new THREE.MeshLambertMaterial({ color: 0x6e4e32, flatShading: true });
    const rampFrameMat = new THREE.MeshLambertMaterial({ color: 0x3d2c1d, flatShading: true });
    const hazardYellowMat = new THREE.MeshBasicMaterial({ color: 0xffd200 });

    rampConfigs.forEach((cfg) => {
      const baseY = this.getGroundHeight(cfg.x, cfg.z);
      const rampObj = new THREE.Group();
      rampObj.position.set(cfg.x, baseY, cfg.z);
      rampObj.rotation.y = cfg.rotY;

      const halfW = cfg.width * 0.5;
      const angle = Math.atan2(cfg.height, cfg.length);
      const slopeHypot = Math.hypot(cfg.length, cfg.height);

      // Angled Timber Surface Planks
      const deckGeo = new THREE.BoxGeometry(cfg.width, 0.16, slopeHypot);
      const deck = new THREE.Mesh(deckGeo, rampPlankMat);
      deck.position.set(0, cfg.height * 0.5, cfg.length * 0.5);
      deck.rotation.x = angle;
      deck.castShadow = true;
      deck.receiveShadow = true;
      rampObj.add(deck);

      // Side Truss Warning Chevrons along the ramp lip
      [-halfW - 0.06, halfW + 0.06].forEach((sx) => {
        const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, slopeHypot), hazardYellowMat);
        chevron.position.set(sx, cfg.height * 0.5 + 0.12, cfg.length * 0.5);
        chevron.rotation.x = angle;
        rampObj.add(chevron);
      });

      // Heavy timber support posts under the high lip
      [-halfW * 0.75, halfW * 0.75].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, cfg.height, 5), rampFrameMat);
        post.position.set(px, cfg.height * 0.5, cfg.length - 0.15);
        post.castShadow = true;
        rampObj.add(post);
      });

      this.rampsGroup.add(rampObj);

      // Register with collision world for physics & launches
      if (this.collisionWorld) {
        this.collisionWorld.addRamp(cfg.x, cfg.z, baseY, halfW, cfg.length, cfg.height, cfg.rotY, cfg.tag);
      }
    });

    this.rootGroup.add(this.rampsGroup);
  }

  _createLowPolyBird(isPerched = false) {
    const bird = new THREE.Group();

    const featherMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true });
    const wingtipMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // Torso (tapered low-poly body)
    const bodyGeo = new THREE.BoxGeometry(0.24, 0.20, 0.54);
    const body = new THREE.Mesh(bodyGeo, featherMat);
    body.position.set(0, 0, 0);
    body.castShadow = true;
    bird.add(body);

    // Chest & neck
    const chestGeo = new THREE.BoxGeometry(0.22, 0.22, 0.28);
    const chest = new THREE.Mesh(chestGeo, featherMat);
    chest.position.set(0, 0.08, 0.20);
    chest.castShadow = true;
    bird.add(chest);

    // Head group (can turn / twitch independently for perched birds)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.16, 0.32);

    const headGeo = new THREE.BoxGeometry(0.18, 0.18, 0.22);
    const head = new THREE.Mesh(headGeo, featherMat);
    head.castShadow = true;
    headGroup.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.065, 0.22, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, -0.02, 0.18);
    beak.castShadow = true;
    headGroup.add(beak);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.095, 0.03, 0.04);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.095, 0.03, 0.04);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    bird.add(headGroup);

    // Tail feathers
    const tailGeo = new THREE.BoxGeometry(0.18, 0.04, 0.36);
    const tail = new THREE.Mesh(tailGeo, wingtipMat);
    tail.position.set(0, 0.02, -0.38);
    tail.rotation.x = -0.12;
    tail.castShadow = true;
    bird.add(tail);

    let leftWingGroup = null;
    let rightWingGroup = null;

    if (isPerched) {
      // Folded wings along the flanks
      const foldedWingGeo = new THREE.BoxGeometry(0.05, 0.18, 0.44);
      const leftFolded = new THREE.Mesh(foldedWingGeo, wingtipMat);
      leftFolded.position.set(0.13, 0.02, -0.06);
      leftFolded.rotation.x = -0.1;
      const rightFolded = new THREE.Mesh(foldedWingGeo, wingtipMat);
      rightFolded.position.set(-0.13, 0.02, -0.06);
      rightFolded.rotation.x = -0.1;
      bird.add(leftFolded);
      bird.add(rightFolded);

      // Standing legs
      const legMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
      const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 4);
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(0.07, -0.16, 0);
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(-0.07, -0.16, 0);
      bird.add(leftLeg);
      bird.add(rightLeg);
    } else {
      // Articulated wings for flight
      leftWingGroup = new THREE.Group();
      leftWingGroup.position.set(0.12, 0.05, 0.04);

      const leftInnerGeo = new THREE.BoxGeometry(0.55, 0.028, 0.24);
      const leftInner = new THREE.Mesh(leftInnerGeo, featherMat);
      leftInner.position.set(0.275, 0, 0);
      leftInner.castShadow = true;
      leftWingGroup.add(leftInner);

      const leftTipGeo = new THREE.BoxGeometry(0.42, 0.022, 0.18);
      const leftTip = new THREE.Mesh(leftTipGeo, wingtipMat);
      leftTip.position.set(0.72, 0, -0.04);
      leftTip.rotation.y = -0.14;
      leftTip.castShadow = true;
      leftWingGroup.add(leftTip);

      bird.add(leftWingGroup);

      rightWingGroup = new THREE.Group();
      rightWingGroup.position.set(-0.12, 0.05, 0.04);

      const rightInnerGeo = new THREE.BoxGeometry(0.55, 0.028, 0.24);
      const rightInner = new THREE.Mesh(rightInnerGeo, featherMat);
      rightInner.position.set(-0.275, 0, 0);
      rightInner.castShadow = true;
      rightWingGroup.add(rightInner);

      const rightTipGeo = new THREE.BoxGeometry(0.42, 0.022, 0.18);
      const rightTip = new THREE.Mesh(rightTipGeo, wingtipMat);
      rightTip.position.set(-0.72, 0, -0.04);
      rightTip.rotation.y = 0.14;
      rightTip.castShadow = true;
      rightWingGroup.add(rightTip);

      bird.add(rightWingGroup);
    }

    return {
      group: bird,
      headGroup,
      leftWing: leftWingGroup,
      rightWing: rightWingGroup
    };
  }

  _buildBirds() {
    this.birdsGroup = new THREE.Group();
    this.birds = [];

    // Flock 1: Pier & Coastal Bay Seagulls (6 birds circling pier and beach)
    const pierFlockConfigs = [
      { rX: 30, rZ: 38, alt: 11, speed: 0.32, phase: 0.0, flapFreq: 7.5 },
      { rX: 34, rZ: 44, alt: 14, speed: 0.28, phase: 1.2, flapFreq: 8.0 },
      { rX: 26, rZ: 32, alt: 9, speed: 0.36, phase: 2.5, flapFreq: 8.5 },
      { rX: 38, rZ: 48, alt: 16, speed: 0.26, phase: 3.8, flapFreq: 7.2 },
      { rX: 32, rZ: 36, alt: 12.5, speed: 0.34, phase: 4.6, flapFreq: 8.2 },
      { rX: 28, rZ: 42, alt: 10.5, speed: 0.30, phase: 5.7, flapFreq: 7.8 }
    ];

    pierFlockConfigs.forEach((cfg) => {
      const bObj = this._createLowPolyBird(false);
      this.birdsGroup.add(bObj.group);
      this.birds.push({
        mesh: bObj.group,
        headGroup: bObj.headGroup,
        leftWing: bObj.leftWing,
        rightWing: bObj.rightWing,
        isPerched: false,
        centerX: 0,
        centerZ: -20,
        radiusX: cfg.rX,
        radiusZ: cfg.rZ,
        altitude: cfg.alt,
        speed: cfg.speed,
        angle: cfg.phase,
        wobblePhase: Math.random() * 10,
        flapFreq: cfg.flapFreq,
        flapTimer: 0,
        isGliding: false,
        glideDuration: 3.5 + Math.random() * 2.0,
        flapDuration: 2.2 + Math.random() * 1.2
      });
    });

    // Flock 2: Clifftop & Lighthouse Soarers (6 birds riding 22m cliff updrafts)
    const cliffFlockConfigs = [
      { rX: 42, rZ: 50, alt: 28, speed: 0.24, phase: 0.3, flapFreq: 6.8 },
      { rX: 46, rZ: 55, alt: 32, speed: 0.22, phase: 1.5, flapFreq: 7.0 },
      { rX: 38, rZ: 44, alt: 26, speed: 0.27, phase: 2.8, flapFreq: 7.2 },
      { rX: 50, rZ: 60, alt: 35, speed: 0.20, phase: 3.9, flapFreq: 6.5 },
      { rX: 44, rZ: 48, alt: 30, speed: 0.25, phase: 4.8, flapFreq: 7.0 },
      { rX: 40, rZ: 52, alt: 27, speed: 0.26, phase: 5.9, flapFreq: 7.4 }
    ];

    cliffFlockConfigs.forEach((cfg) => {
      const bObj = this._createLowPolyBird(false);
      this.birdsGroup.add(bObj.group);
      this.birds.push({
        mesh: bObj.group,
        headGroup: bObj.headGroup,
        leftWing: bObj.leftWing,
        rightWing: bObj.rightWing,
        isPerched: false,
        centerX: 52,
        centerZ: 65,
        radiusX: cfg.rX,
        radiusZ: cfg.rZ,
        altitude: cfg.alt,
        speed: cfg.speed,
        angle: cfg.phase,
        wobblePhase: Math.random() * 10,
        flapFreq: cfg.flapFreq,
        flapTimer: 0,
        isGliding: true,
        glideDuration: 5.0 + Math.random() * 2.5,
        flapDuration: 1.8 + Math.random() * 0.8
      });
    });

    // Flock 3: Northern Forest & Secret Cove Gliders (5 birds)
    const forestFlockConfigs = [
      { rX: 36, rZ: 36, alt: 20, speed: 0.28, phase: 0.6, flapFreq: 7.5 },
      { rX: 40, rZ: 42, alt: 23, speed: 0.25, phase: 1.9, flapFreq: 7.2 },
      { rX: 32, rZ: 34, alt: 18, speed: 0.31, phase: 3.1, flapFreq: 8.0 },
      { rX: 44, rZ: 46, alt: 25, speed: 0.22, phase: 4.4, flapFreq: 7.0 },
      { rX: 35, rZ: 38, alt: 21, speed: 0.29, phase: 5.5, flapFreq: 7.6 }
    ];

    forestFlockConfigs.forEach((cfg) => {
      const bObj = this._createLowPolyBird(false);
      this.birdsGroup.add(bObj.group);
      this.birds.push({
        mesh: bObj.group,
        headGroup: bObj.headGroup,
        leftWing: bObj.leftWing,
        rightWing: bObj.rightWing,
        isPerched: false,
        centerX: -20,
        centerZ: 80,
        radiusX: cfg.rX,
        radiusZ: cfg.rZ,
        altitude: cfg.alt,
        speed: cfg.speed,
        angle: cfg.phase,
        wobblePhase: Math.random() * 10,
        flapFreq: cfg.flapFreq,
        flapTimer: 0,
        isGliding: false,
        glideDuration: 3.8 + Math.random() * 2.0,
        flapDuration: 2.4 + Math.random() * 1.0
      });
    });

    // Perched Seagulls
    const perchedConfigs = [
      { x: 2.15, y: 2.65, z: -43.0, rotY: 2.1 }, // Pier post
      { x: 0.0, y: 5.75, z: -48.2, rotY: -0.4 }, // Pier Gazebo roof
      { x: -26.5, y: 4.85, z: -8.0, rotY: 1.2 }, // Western beach rock stack
      { x: 31.8, y: 22.95, z: 52.0, rotY: -2.3 } // Clifftop lookout railing
    ];

    perchedConfigs.forEach((cfg) => {
      const bObj = this._createLowPolyBird(true);
      bObj.group.position.set(cfg.x, cfg.y, cfg.z);
      bObj.group.rotation.y = cfg.rotY;
      this.birdsGroup.add(bObj.group);
      this.birds.push({
        mesh: bObj.group,
        headGroup: bObj.headGroup,
        isPerched: true,
        baseRotY: cfg.rotY,
        baseY: cfg.y,
        lookTimer: 1.0 + Math.random() * 3.0,
        targetHeadY: 0,
        currentHeadY: 0
      });
    });

    this.rootGroup.add(this.birdsGroup);
  }

  _updateBirds(dt) {
    if (!this.birds || this.birds.length === 0) return;

    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];

      if (bird.isPerched) {
        // Idle head turning & gentle breathing bob
        bird.lookTimer -= dt;
        if (bird.lookTimer <= 0) {
          bird.lookTimer = 1.5 + Math.random() * 3.5;
          const angles = [0, -0.65, 0.65, -0.3, 0.4];
          bird.targetHeadY = angles[Math.floor(Math.random() * angles.length)];
        }
        bird.currentHeadY = THREE.MathUtils.lerp(bird.currentHeadY, bird.targetHeadY, dt * 8);
        bird.headGroup.rotation.y = bird.currentHeadY;

        // Subtle breathing bob
        bird.mesh.position.y = bird.baseY + Math.sin(this.time * 2.5 + i * 1.5) * 0.012;
      } else {
        // Flying bird
        bird.angle += bird.speed * dt;

        // Organic Lissajous wobble on path
        const ox = Math.sin(this.time * 0.4 + bird.wobblePhase) * 5.0;
        const oz = Math.cos(this.time * 0.45 + bird.wobblePhase) * 5.0;
        const currX = bird.centerX + Math.cos(bird.angle) * bird.radiusX + ox;
        const currZ = bird.centerZ + Math.sin(bird.angle) * bird.radiusZ + oz;

        // Next forward point along flight path to calculate direction vector
        const nextAngle = bird.angle + 0.06;
        const nox = Math.sin((this.time + 0.1) * 0.4 + bird.wobblePhase) * 5.0;
        const noz = Math.cos((this.time + 0.1) * 0.45 + bird.wobblePhase) * 5.0;
        const nextX = bird.centerX + Math.cos(nextAngle) * bird.radiusX + nox;
        const nextZ = bird.centerZ + Math.sin(nextAngle) * bird.radiusZ + noz;

        const dx = nextX - currX;
        const dz = nextZ - currZ;
        const heading = Math.atan2(dx, dz);

        // Gentle altitude undulation (riding thermals)
        const altWave = Math.sin(this.time * 0.5 + bird.wobblePhase) * 2.4;
        const currY = bird.altitude + altWave;

        bird.mesh.position.set(currX, currY, currZ);
        bird.mesh.rotation.y = heading;

        // Banking roll into curves
        const bank = Math.sin(bird.angle) * 0.28;
        bird.mesh.rotation.z = -bank;

        // Pitch slightly with climb/descent
        const pitch = Math.cos(this.time * 0.5 + bird.wobblePhase) * 0.08;
        bird.mesh.rotation.x = -pitch;

        // Gliding vs Flapping cycle
        bird.flapTimer += dt;
        const cycleThreshold = bird.isGliding ? bird.glideDuration : bird.flapDuration;
        if (bird.flapTimer >= cycleThreshold) {
          bird.isGliding = !bird.isGliding;
          bird.flapTimer = 0;
        }

        if (bird.isGliding) {
          // Outstretched wings with gentle wind flutter
          const flutter = Math.sin(this.time * 3.5 + bird.wobblePhase) * 0.05;
          bird.leftWing.rotation.z = THREE.MathUtils.lerp(bird.leftWing.rotation.z, flutter, dt * 6);
          bird.rightWing.rotation.z = THREE.MathUtils.lerp(bird.rightWing.rotation.z, -flutter, dt * 6);
          bird.leftWing.rotation.y = THREE.MathUtils.lerp(bird.leftWing.rotation.y, 0, dt * 6);
          bird.rightWing.rotation.y = THREE.MathUtils.lerp(bird.rightWing.rotation.y, 0, dt * 6);
        } else {
          // Flapping wings
          const flap = Math.sin(this.time * bird.flapFreq + bird.wobblePhase) * 0.58;
          bird.leftWing.rotation.z = flap;
          bird.rightWing.rotation.z = -flap;
          // Sweep wings slightly back during downstroke
          const sweep = Math.cos(this.time * bird.flapFreq + bird.wobblePhase) * 0.12;
          bird.leftWing.rotation.y = sweep;
          bird.rightWing.rotation.y = -sweep;

          // Slight body lift on downstroke
          bird.mesh.position.y += Math.max(0, flap) * 0.06;
        }
      }
    }
  }

  /**
   * Returns surface elevation beneath point (x, z).
   * If currentY is provided, checks for solid walkable object surfaces (e.g. platforms,
   * vending machines, boulders, stairs, decks) and returns the top surface if landed on.
   */
  getGroundHeight(x, z, currentY = null) {
    const baseElev = this.getIslandElevation(x, z);
    if (!this.collisionWorld) return baseElev;
    const testY = currentY !== null ? currentY : baseElev;
    return this.collisionWorld.getSurfaceHeight(x, z, testY, baseElev);
  }

  /**
   * Resolves horizontal character collisions with solid island obstacles.
   */
  resolveCollisions(pos, radius, currentY) {
    if (this.collisionWorld) {
      this.collisionWorld.resolveHorizontalCollisions(pos, radius, currentY);
    }
  }

  update(dt) {
    this.time += dt;

    // Ocean wave animation
    if (this.waterPosAttribute) {
      for (let i = 0; i < this.waterPosAttribute.count; i++) {
        const x = this.waterPosAttribute.getX(i);
        const z = this.waterPosAttribute.getZ(i);
        const wave = Math.sin(x * 0.05 + this.time * 1.6) * 0.25 +
                     Math.cos(z * 0.04 + this.time * 1.2) * 0.2;
        this.waterPosAttribute.setY(i, this.waterBaseY[i] + wave);
      }
      this.waterPosAttribute.needsUpdate = true;
    }

    // Rotating lighthouse
    if (this.lighthouseTarget) {
      const beamAngle = this.time * 0.7;
      const radius = 80;
      this.lighthouseTarget.position.x = Math.sin(beamAngle) * radius;
      this.lighthouseTarget.position.z = Math.cos(beamAngle) * radius;
    }

    // Radio tower beacon flashing (pulsing rhythmic aviation strobe)
    if (this.radioBeaconLight && this.radioBeaconMat) {
      const flash = Math.sin(this.time * 3.5) > 0.45;
      this.radioBeaconLight.intensity = flash ? 3.8 : 0.3;
      this.radioBeaconMat.color.setHex(flash ? 0xff2222 : 0x440808);
    }

    // Distant ship gentle ocean swell & slow cruising drift
    if (this.shipGroup) {
      this.shipGroup.position.y = Math.sin(this.time * 0.8) * 0.22;
      this.shipGroup.rotation.z = Math.sin(this.time * 0.5) * 0.015;
      this.shipGroup.rotation.x = Math.cos(this.time * 0.4) * 0.012;
      this.shipGroup.position.x += dt * 0.25;
      if (this.shipGroup.position.x > -100) {
        this.shipGroup.position.x = -240;
      }
    }

    // Campfire flame flickering
    if (this.campfireFlame && this.campfireLight) {
      const flick = 0.85 + Math.sin(this.time * 18) * 0.15 + Math.cos(this.time * 26) * 0.1;
      this.campfireFlame.scale.set(flick, 0.9 + Math.sin(this.time * 14) * 0.2, flick);
      this.campfireLight.intensity = 1.4 * flick;
    }

    // Festive beach bar string lights gentle twinkling
    if (this.barStringLights && this.barStringLights.length > 0) {
      for (let i = 0; i < this.barStringLights.length; i++) {
        const s = 0.9 + Math.sin(this.time * 3.2 + i * 0.75) * 0.14;
        this.barStringLights[i].scale.set(s, s, s);
      }
    }

    // Dance floor neon tiles rhythmic pulse (164 BPM tempo)
    if (this.danceTiles && this.danceTiles.length > 0) {
      const beat = this.time * 2.73 * Math.PI * 2; // ~164 BPM
      this.danceTiles.forEach((tile) => {
        const pulse = 0.5 + 0.5 * Math.sin(beat - tile.distFromCenter * 0.8 + tile.phase);
        tile.mesh.position.y = 0.23 + pulse * 0.025;
      });
    }

    // Moving stage spotlights sweeping over dance arena
    if (this.stageSpots && this.stageSpots.length > 0) {
      this.stageSpots.forEach((spot) => {
        const angle = this.time * 1.5 + spot.baseAngle;
        spot.target.position.x = Math.sin(angle) * 3.2;
        spot.target.position.z = Math.cos(angle * 0.8) * 3.0;
        spot.can.rotation.y = Math.sin(angle) * 0.45;
        spot.can.rotation.x = 0.55 + Math.cos(angle * 0.7) * 0.2;
      });
    }

    // Jet skis gentle ocean wave bobbing
    if (this.jetSkis && this.jetSkis.length > 0) {
      this.jetSkis.forEach((js) => {
        const wave = Math.sin(this.time * 2.2 + js.phase) * 0.07;
        const roll = Math.sin(this.time * 1.8 + js.phase) * 0.04;
        const pitch = Math.cos(this.time * 1.6 + js.phase) * 0.03;
        js.group.position.y = js.baseY + wave;
        js.group.rotation.z = roll;
        js.group.rotation.x = pitch;
      });
    }

    // Buoys bobbing in waves
    if (this.buoys && this.buoys.length > 0) {
      this.buoys.forEach((b, i) => {
        b.mesh.position.y = Math.sin(this.time * 1.6 + i * 1.8) * 0.18;
        b.mesh.rotation.z = Math.sin(this.time * 1.2 + i * 1.5) * 0.08;
      });
    }

    // Dynamic bird flocks flight, soaring, and perched behaviors
    this._updateBirds(dt);
  }

  destroy() {
    if (this.rootGroup) {
      this.scene.remove(this.rootGroup);
    }
    if (this.collisionWorld) {
      this.collisionWorld.colliders = [];
    }
  }
}
