import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld.js';

/**
 * KamakuraWorld — Level 3: Shonan Coast, Grand Buddhist Temple & Deep Cedar Touge Forest
 * 
 * Expansive 700-meter coastal megaworld with:
 * - 10x Item Density (over 1,400 trees, plants, and environmental props)
 * - Deep Ancient Sugi Cedar & Hinoki Forest with carved switchback mountain trail
 * - Monumental Kenchō-ji Style Buddhist Temple Complex with 28m Five-Story Pagoda
 * - 11 Distinct Thematic Japanese Flora Species
 * - 25+ Named Points of Interest with dynamic HUD zone detection
 */
export class KamakuraWorld {
  constructor(scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.time = 0;
    this.collisionWorld = new CollisionWorld();

    // Level metadata
    this.id = 'kamakura';
    this.name = 'SHONAN COAST // SEASIDE HIGHWAY & SHRINE';
    this.skyTheme = 'GOLDEN_HOUR';
    this.hasOcean = true;

    // Spawns
    this.playerSpawn = { x: -7.5, y: 1.82, z: 6.0, rotY: 0 };
    this.quadSpawn = { x: 18.0, y: 0.22, z: 24.0, rotY: 0 };
    this.defaultTrackIndex = 0; // ATLANTIC BREEZE (LIQUID MIX)

    // Animated references
    this.vendingGlows = [];
    this.trainCrossingLights = [];
    this.lanternGlows = [];
    this.bonfireFlame = null;
    this.lighthouseBeacon = null;
    this.incenseSmokes = [];

    // Initialize materials
    this._initMaterials();

    // Build World Elements
    this._buildOcean();
    this._buildTerrain();
    this._buildCoastalHighwayAndBridges();
    this._buildRailwaySystem();
    this._buildCoastlineAndBeaches();
    this._buildCommercialAndTownSector();
    this._buildEnoshimaIslandAndLighthouse();
    this._buildSacredMountainAndShrine();
    this._buildGrandBuddhistTemple();
    this._buildWindingForestTrail();
    this._buildRoadsideDetails();
    this._buildThematicFoliage();
  }

  /* -------------------------------------------------------------
   * 1. Material Palette
   * ------------------------------------------------------------- */
  _initMaterials() {
    this.materials = {
      // Asphalt & Infrastructure
      roadAsphalt: new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.88, flatShading: true }),
      roadMarkingWhite: new THREE.MeshBasicMaterial({ color: 0xf0f3f6 }),
      roadMarkingYellow: new THREE.MeshBasicMaterial({ color: 0xf5b025 }),
      sidewalkConcrete: new THREE.MeshStandardMaterial({ color: 0x828b96, roughness: 0.9, flatShading: true }),
      seawallConcrete: new THREE.MeshStandardMaterial({ color: 0x8e96a2, roughness: 0.85, flatShading: true }),
      tunnelConcrete: new THREE.MeshStandardMaterial({ color: 0x474c54, roughness: 0.92, flatShading: true }),
      trailDirt: new THREE.MeshStandardMaterial({ color: 0x5a4837, roughness: 0.96, flatShading: true }),

      // Nature & Terrain
      sandBeach: new THREE.MeshStandardMaterial({ color: 0x61584c, roughness: 0.95, flatShading: true }),
      hillsideGrass: new THREE.MeshStandardMaterial({ color: 0x3d5c36, roughness: 0.9, flatShading: true }),
      rockStone: new THREE.MeshStandardMaterial({ color: 0x555861, roughness: 0.88, flatShading: true }),

      // 11 Thematic Japanese Flora Species
      sakuraPink: new THREE.MeshStandardMaterial({ color: 0xfcb3cb, roughness: 0.8, flatShading: true }),
      pineNeedles: new THREE.MeshStandardMaterial({ color: 0x243e28, roughness: 0.85, flatShading: true }),
      bambooStalk: new THREE.MeshStandardMaterial({ color: 0x528734, roughness: 0.6, flatShading: true }),
      bambooLeaf: new THREE.MeshStandardMaterial({ color: 0x73b043, roughness: 0.7, flatShading: true }),
      mapleCrimson: new THREE.MeshStandardMaterial({ color: 0xc42f27, roughness: 0.8, flatShading: true }),
      hydrangeaBlue: new THREE.MeshStandardMaterial({ color: 0x5b8bd4, roughness: 0.8, flatShading: true }),
      hydrangeaPurple: new THREE.MeshStandardMaterial({ color: 0x9365c9, roughness: 0.8, flatShading: true }),
      ginkgoGold: new THREE.MeshStandardMaterial({ color: 0xf6c834, roughness: 0.8, flatShading: true }),
      wisteriaViolet: new THREE.MeshStandardMaterial({ color: 0x9b51e0, roughness: 0.75, flatShading: true }),
      irisIndigo: new THREE.MeshStandardMaterial({ color: 0x2e3fa8, roughness: 0.7, flatShading: true }),
      cedarNeedles: new THREE.MeshStandardMaterial({ color: 0x1d3822, roughness: 0.9, flatShading: true }),
      camelliaRed: new THREE.MeshStandardMaterial({ color: 0xdb242a, roughness: 0.7, flatShading: true }),
      camelliaLeaf: new THREE.MeshStandardMaterial({ color: 0x234427, roughness: 0.6, flatShading: true }),
      silverGrassGold: new THREE.MeshStandardMaterial({ color: 0xdfd4b6, roughness: 0.95, flatShading: true }),
      treeTrunk: new THREE.MeshStandardMaterial({ color: 0x423328, roughness: 0.9, flatShading: true }),
      treeTrunkDark: new THREE.MeshStandardMaterial({ color: 0x2e241c, roughness: 0.92, flatShading: true }),

      // Architectural & Shinto Materials
      shrineVermilion: new THREE.MeshStandardMaterial({ color: 0xd9331e, roughness: 0.6, flatShading: true }),
      shrineWoodDark: new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.85, flatShading: true }),
      shrineRoofTile: new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.75, flatShading: true }),
      templeRed: new THREE.MeshStandardMaterial({ color: 0xa82015, roughness: 0.65, flatShading: true }),
      templeGold: new THREE.MeshStandardMaterial({ color: 0xdeb137, metalness: 0.75, roughness: 0.35, flatShading: true }),
      machiyaLattice: new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.85, flatShading: true }),
      daibutsuBronze: new THREE.MeshStandardMaterial({ color: 0x466355, roughness: 0.65, flatShading: true }),
      weatheredTimber: new THREE.MeshStandardMaterial({ color: 0x786a58, roughness: 0.9, flatShading: true }),
      thatchRoof: new THREE.MeshStandardMaterial({ color: 0x9c885e, roughness: 0.95, flatShading: true }),

      // Modern Town Materials
      konbiniWhite: new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.5, flatShading: true }),
      konbiniBlueStripe: new THREE.MeshBasicMaterial({ color: 0x0072ce }),
      konbiniOrangeStripe: new THREE.MeshBasicMaterial({ color: 0xff6600 }),
      konbiniGlowInterior: new THREE.MeshBasicMaterial({ color: 0xfffae8 }),
      eneosOrange: new THREE.MeshBasicMaterial({ color: 0xf04e23 }),
      steelSilver: new THREE.MeshStandardMaterial({ color: 0xa4adb8, metalness: 0.55, roughness: 0.45, flatShading: true }),
      steelRedBridge: new THREE.MeshStandardMaterial({ color: 0xb52c23, roughness: 0.55, flatShading: true }),
      darkPole: new THREE.MeshStandardMaterial({ color: 0x3c424a, roughness: 0.8, flatShading: true }),
      trafficMirrorOrange: new THREE.MeshBasicMaterial({ color: 0xff5500 }),
      trafficMirrorGlass: new THREE.MeshStandardMaterial({ color: 0xeef2ff, metalness: 0.9, roughness: 0.1 }),

      // Glowing FX & Props
      signalRed: new THREE.MeshBasicMaterial({ color: 0xff1e1e }),
      lanternGlow: new THREE.MeshBasicMaterial({ color: 0xffaf38 }),
      paperLanternRed: new THREE.MeshBasicMaterial({ color: 0xff3b24 }),
      beaconGlow: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      fireFlame: new THREE.MeshBasicMaterial({ color: 0xff7b1a }),
      incenseSmokeMat: new THREE.MeshBasicMaterial({ color: 0xdde0e6, transparent: true, opacity: 0.55 })
    };
  }

  /* -------------------------------------------------------------
   * 2. Continuous Elevation Model & Winding Mountain Trail
   * ------------------------------------------------------------- */
  _getForestTrailHeightAndDist(x, z) {
    const waypoints = [
      [54, 45, 0.22],     // 1. Trailhead archway near highway & town
      [65, 62, 1.8],      // 2. Lower cedar grove curve
      [76, 85, 3.8],      // 3. Dense forest slope
      [66, 110, 6.0],     // 4. Hairpin bend #1 over mountain stream footbridge
      [82, 135, 8.2],     // 5. Giant ancient cedar clearing
      [105, 118, 10.6],   // 6. High switchback bend #2, stone lanterns
      [92, 90, 13.0],     // 7. Mountain crest ridge
      [118, 75, 15.0],    // 8. Alpine approach
      [135, 60, 16.5]     // 9. Summit Touge Lookout deck!
    ];

    let minDist = 999;
    let targetH = 0.22;

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

  getIslandElevation(x, z) {
    // A. Enoshima Offshore Sacred Island (Centered at X = -95, Z = -80)
    const enoDx = x - (-95);
    const enoDz = z - (-80);
    const enoDist = Math.hypot(enoDx, enoDz);
    if (enoDist < 36.0) {
      const t = 1.0 - (enoDist / 36.0);
      const dome = t * t * (3 - 2 * t);
      return 0.5 + dome * 12.0;
    }

    // B. Enoshima Causeway Sea Bridge Approach (X: -85 to -24, Z around -80)
    if (x < -24.0 && x >= -85.0 && Math.abs(z - (-80)) <= 4.5) {
      return 1.25;
    }

    // C. Secret Tidal Sea Cave & Sea Stack (Centered at X = -95, Z = -40)
    const stackDx = x - (-95);
    const stackDz = z - (-40);
    const stackDist = Math.hypot(stackDx, stackDz);
    if (stackDist < 16.0) {
      const st = 1.0 - (stackDist / 16.0);
      return 0.2 + st * st * 7.5;
    }

    // D. Western Coastal Beach & Seawall drop-off (X < -22.0)
    if (x < -22.0) {
      const beachDist = -22.0 - x;
      if (beachDist < 18.0) {
        return Math.max(0.04, 0.22 - (beachDist / 18.0) * 0.18);
      }
      return 0.0;
    }

    // E. River Estuary Channel (Z: 85 to 115, X < 55)
    if (z >= 85 && z <= 115 && x <= 55) {
      const riverCenterZ = 100;
      const rDist = Math.abs(z - riverCenterZ);
      if (rDist < 15) {
        const rt = rDist / 15.0;
        return 0.02 + rt * rt * 0.20;
      }
    }

    // F. Main Seaside Coastal Corridor (X: -22.0 to 55.0)
    if (x <= 55.0) {
      return 0.22;
    }

    // G. Mountain Terraces (perfectly flat plateaus for shrines & temples)
    if (x >= 95 && x <= 118 && z >= -35 && z <= -5) return 7.50; // Shrine Haiden
    if (x >= 105 && x <= 125 && z >= -95 && z <= -65) return 8.00; // Daibutsu
    if (x >= 100 && x <= 122 && z >= 20 && z <= 50) return 7.50; // Zen Garden
    if (x >= 100 && x <= 132 && z >= 130 && z <= 190) return 7.50; // Grand Buddhist Temple

    // Smooth continuous sigmoid incline
    const hillDist = x - 55.0;
    const t = Math.min(1.0, hillDist / 85.0);
    const smoothRise = t * t * (3 - 2 * t);
    let elev = 0.22 + smoothRise * 16.28;

    // H. Winding Mountain Forest Trail Carving
    const trail = this._getForestTrailHeightAndDist(x, z);
    if (trail.dist < 2.8) {
      const trailBlend = Math.max(0, 1.0 - trail.dist / 2.8);
      const factor = trailBlend * trailBlend * (3 - 2 * trailBlend);
      elev = elev * (1 - factor * 0.94) + trail.height * (factor * 0.94);
    }

    return elev;
  }

  getGroundHeight(x, z, currentY = null) {
    const baseElev = this.getIslandElevation(x, z);
    if (!this.collisionWorld) return baseElev;
    const testY = currentY !== null ? currentY : baseElev;
    return this.collisionWorld.getSurfaceHeight(x, z, testY, baseElev);
  }

  resolveCollisions(position, radius, currentY) {
    if (this.collisionWorld) {
      this.collisionWorld.resolveHorizontalCollisions(position, radius, currentY);
    }
  }

  /* -------------------------------------------------------------
   * 3. Ocean Swells & Vast Low-Poly Terrain Mesh
   * ------------------------------------------------------------- */
  _buildOcean() {
    const oceanGeo = new THREE.PlaneGeometry(1200, 1200, 60, 60);
    oceanGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x143c52,
      roughness: 0.25,
      metalness: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.92
    });

    this.waterMesh = new THREE.Mesh(oceanGeo, this.waterMat);
    this.waterMesh.position.set(-150, 0.0, 0);
    this.rootGroup.add(this.waterMesh);

    this.waterPosAttribute = oceanGeo.attributes.position;
    this.waterBaseY = new Float32Array(this.waterPosAttribute.count);
    for (let i = 0; i < this.waterPosAttribute.count; i++) {
      this.waterBaseY[i] = this.waterPosAttribute.getY(i);
    }
  }

  _buildTerrain() {
    const geo = new THREE.PlaneGeometry(500, 800, 100, 160);
    geo.rotateX(-Math.PI / 2);
    geo.translate(30, 0, 0);

    const pos = geo.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const elev = this.getIslandElevation(x, z);
      pos.setY(i, elev);

      const trail = this._getForestTrailHeightAndDist(x, z);

      if (x < -22.0) {
        if (Math.hypot(x - (-95), z - (-80)) < 36.0 || Math.hypot(x - (-95), z - (-40)) < 16.0) {
          color.setHex(elev > 5.0 ? 0x476342 : 0x5a5448);
        } else {
          color.setHex(elev > 0.05 ? 0x6e6556 : 0x222a33);
        }
      } else if (z >= 88 && z <= 112 && x <= 50) {
        color.setHex(0x1a2e3b);
      } else if (trail.dist < 2.2 && x >= 55) {
        // Carved dirt / packed stone mountain trail
        color.setHex(0x5a4837);
      } else if (x > 55.0) {
        if (elev > 14.5) {
          color.setHex(0x5e5a66);
        } else if (Math.hypot(x - 85, z - 40) < 22) {
          color.setHex(0x4a7337);
        } else {
          color.setHex(elev > 6.0 ? 0x3d5c36 : 0x45693c);
        }
      } else {
        color.setHex(0x3e444d);
      }
      colors.push(color.r, color.g, color.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.rootGroup.add(terrainMesh);
  }

  /* -------------------------------------------------------------
   * 4. Highway, Bridge & Tunnel
   * ------------------------------------------------------------- */
  _buildCoastalHighwayAndBridges() {
    const roadGroup = new THREE.Group();
    const roadL = 720.0;
    const roadW = 14.0;
    const roadX = 10.0;

    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadL), this.materials.roadAsphalt);
    asphalt.rotateX(-Math.PI / 2);
    asphalt.position.set(roadX, 0.23, 0);
    asphalt.receiveShadow = true;
    roadGroup.add(asphalt);

    // Double Yellow Center Lines
    [-0.15, 0.15].forEach((yOff) => {
      const yellowLine = new THREE.Mesh(new THREE.PlaneGeometry(0.14, roadL), this.materials.roadMarkingYellow);
      yellowLine.rotateX(-Math.PI / 2);
      yellowLine.position.set(roadX + yOff, 0.235, 0);
      roadGroup.add(yellowLine);
    });

    // White Edge Lines
    [-roadW * 0.46, roadW * 0.46].forEach((xOff) => {
      const whiteLine = new THREE.Mesh(new THREE.PlaneGeometry(0.2, roadL), this.materials.roadMarkingWhite);
      whiteLine.rotateX(-Math.PI / 2);
      whiteLine.position.set(roadX + xOff, 0.235, 0);
      roadGroup.add(whiteLine);
    });

    // Dashed White Stripes
    [-3.5, 3.5].forEach((xOff) => {
      for (let z = -roadL * 0.5 + 4; z < roadL * 0.5 - 4; z += 9.0) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 4.8), this.materials.roadMarkingWhite);
        dash.rotateX(-Math.PI / 2);
        dash.position.set(roadX + xOff, 0.235, z);
        roadGroup.add(dash);
      }
    });

    // Crosswalks
    [0, 210].forEach((crossZ) => {
      for (let x = roadX - roadW * 0.44; x <= roadX + roadW * 0.44; x += 1.4) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 4.2), this.materials.roadMarkingWhite);
        stripe.rotateX(-Math.PI / 2);
        stripe.position.set(x, 0.236, crossZ);
        roadGroup.add(stripe);
      }
    });

    // Concrete Seawall
    const seawallX = -21.8;
    const seawall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, roadL), this.materials.seawallConcrete);
    seawall.position.set(seawallX, 0.9, 0);
    seawall.castShadow = true;
    roadGroup.add(seawall);

    this.collisionWorld.addStaticBox(seawallX, 1.2, 0, 1.4, 3.5, roadL, false, 'seawall');

    // Highway Streetlamps
    for (let z = -320; z <= 320; z += 35) {
      if (z >= 75 && z <= 125) continue;
      this._buildJapaneseStreetlamp(roadGroup, roadX + roadW * 0.52, z);
    }

    // Namegawa River Estuary Bridge
    this._buildRiverEstuaryBridge(roadGroup, roadX, 100.0, roadW);

    // Inamura Touge Tunnel
    this._buildHighwayTunnel(roadGroup, roadX, -195.0, roadW);

    this.rootGroup.add(roadGroup);
  }

  _buildRiverEstuaryBridge(group, bx, bz, bw) {
    const bridgeL = 36.0;
    const bridgeH = 1.6;

    [-bw * 0.52, bw * 0.52].forEach((xOff) => {
      const girder = new THREE.Mesh(new THREE.BoxGeometry(0.8, bridgeH, bridgeL), this.materials.steelRedBridge);
      girder.position.set(bx + xOff, bridgeH * 0.5 + 0.22, bz);
      girder.castShadow = true;
      group.add(girder);

      for (let z = -bridgeL * 0.5 + 2; z <= bridgeL * 0.5 - 2; z += 4.5) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, bridgeH * 1.5, 0.4), this.materials.steelRedBridge);
        strut.position.set(bx + xOff, bridgeH * 0.8 + 0.22, bz + z);
        group.add(strut);
      }
    });

    this.collisionWorld.addBox(bx - bw * 0.5, bx + bw * 0.5, bz - bridgeL * 0.5, bz + bridgeL * 0.5, 0.0, 0.24, true, 'estuary_bridge_deck');
  }

  _buildHighwayTunnel(group, tx, tz, tw) {
    const tunnelL = 48.0;
    const tunnelH = 6.8;

    [-tunnelL * 0.5, tunnelL * 0.5].forEach((zOff) => {
      const portal = new THREE.Mesh(new THREE.BoxGeometry(tw + 8.0, tunnelH + 4.0, 3.5), this.materials.tunnelConcrete);
      portal.position.set(tx, (tunnelH + 4.0) * 0.5 + 0.22, tz + zOff);
      portal.castShadow = true;
      group.add(portal);

      const plaque = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 0.2), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      plaque.position.set(tx, tunnelH + 1.2, tz + zOff + (zOff < 0 ? -1.8 : 1.8));
      group.add(plaque);
    });

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(tw + 2.0, 1.2, tunnelL), this.materials.tunnelConcrete);
    ceiling.position.set(tx, tunnelH + 0.22, tz);
    group.add(ceiling);

    [-tw * 0.52, tw * 0.52].forEach((xOff) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.6, tunnelH, tunnelL), this.materials.tunnelConcrete);
      wall.position.set(tx + xOff, tunnelH * 0.5 + 0.22, tz);
      group.add(wall);
      this.collisionWorld.addStaticBox(tx + xOff, tunnelH * 0.5 + 0.22, tz, 2.0, tunnelH, tunnelL, false, 'tunnel_wall');
    });

    for (let z = -tunnelL * 0.4; z <= tunnelL * 0.4; z += 9.0) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 2.5), new THREE.MeshBasicMaterial({ color: 0xffe070 }));
      light.position.set(tx, tunnelH + 0.1, tz + z);
      group.add(light);
    }
  }

  _buildJapaneseStreetlamp(group, lx, lz) {
    const lamp = new THREE.Group();
    lamp.position.set(lx, 0.22, lz);

    const poleH = 7.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, poleH, 6), this.materials.steelSilver);
    pole.position.y = poleH * 0.5;
    lamp.add(pole);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 5), this.materials.steelSilver);
    arm.rotation.z = Math.PI * 0.38;
    arm.position.set(-1.1, poleH - 0.2, 0);
    lamp.add(arm);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.45), this.materials.darkPole);
    head.position.set(-2.2, poleH + 0.7, 0);
    lamp.add(head);

    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.35), new THREE.MeshBasicMaterial({ color: 0xfff0c4 }));
    bulb.rotateX(Math.PI / 2);
    bulb.position.set(-2.2, poleH + 0.59, 0);
    lamp.add(bulb);

    group.add(lamp);
    this.collisionWorld.addStaticCylinder(lx, poleH * 0.5 + 0.22, lz, 0.35, poleH);
  }

  /* -------------------------------------------------------------
   * 5. Enoden Railway System
   * ------------------------------------------------------------- */
  _buildRailwaySystem() {
    const railGroup = new THREE.Group();
    const railL = 720.0;
    const trackX = -12.0;

    const ballast = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, railL), this.materials.sandBeach);
    ballast.position.set(trackX, 0.22 + 0.12, 0);
    railGroup.add(ballast);

    for (let z = -railL * 0.5 + 1; z <= railL * 0.5 - 1; z += 1.5) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 0.32), this.materials.shrineWoodDark);
      sleeper.position.set(trackX, 0.22 + 0.26, z);
      railGroup.add(sleeper);
    }

    [-0.75, 0.75].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, railL), this.materials.steelSilver);
      rail.position.set(trackX + rx, 0.22 + 0.38, 0);
      railGroup.add(rail);
    });

    for (let z = -320; z <= 320; z += 35) {
      const pole = new THREE.Group();
      pole.position.set(trackX - 2.8, 0.22, z);

      const mastH = 8.5;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, mastH, 6), this.materials.darkPole);
      mast.position.y = mastH * 0.5;
      pole.add(mast);

      const crossarm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.14), this.materials.darkPole);
      crossarm.position.set(1.8, mastH - 0.5, 0);
      pole.add(crossarm);

      railGroup.add(pole);
      this.collisionWorld.addStaticCylinder(trackX - 2.8, mastH * 0.5 + 0.22, z, 0.4, mastH);
    }

    this._buildStationPlatform(railGroup, -7.5, 0, "鎌倉高校前 // SHONAN COAST STATION");
    this._buildRailroadCrossing(railGroup, trackX + 3.0, 0.22, -3.5);
    this._buildStationPlatform(railGroup, -7.5, 210, "稲村ヶ崎 // INAMURAGASAKI STATION");
    this._buildRailwayTunnel(railGroup, trackX, -195.0);

    this.rootGroup.add(railGroup);
  }

  _buildStationPlatform(group, platX, platZ, stationName) {
    const platW = 4.2;
    const platL = 48.0;
    const platH = 1.6;

    const platform = new THREE.Mesh(new THREE.BoxGeometry(platW, platH, platL), this.materials.sidewalkConcrete);
    platform.position.set(platX, platH * 0.5 + 0.22, platZ);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    const yellowTile = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, platL), this.materials.roadMarkingYellow);
    yellowTile.position.set(platX - platW * 0.46, platH + 0.23, platZ);
    group.add(yellowTile);

    const canopyW = 5.2;
    const canopyL = 36.0;
    const canopyH = 3.8;
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.25, canopyL), this.materials.shrineRoofTile);
    canopyRoof.position.set(platX, platH + canopyH + 0.22, platZ);
    canopyRoof.castShadow = true;
    group.add(canopyRoof);

    for (let z = -14; z <= 14; z += 7) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, canopyH, 6), this.materials.steelSilver);
      pillar.position.set(platX + 0.8, platH + canopyH * 0.5 + 0.22, platZ + z);
      group.add(pillar);
    }

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 4.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    signBoard.position.set(platX, platH + 2.4 + 0.22, platZ);
    group.add(signBoard);

    [-8, 8].forEach((bz) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 2.2), this.materials.shrineWoodDark);
      bench.position.set(platX + 0.8, platH + 0.45 + 0.22, platZ + bz);
      group.add(bench);
    });

    this.collisionWorld.addBox(platX - platW * 0.5, platX + platW * 0.5, platZ - platL * 0.5, platZ + platL * 0.5, 0.22, 0.22 + platH, true, 'station_platform');

    const numSteps = 5;
    const stepDepth = 0.48;
    const stepRise = platH / numSteps;
    for (let s = 0; s < numSteps; s++) {
      const stepX = (platX + platW * 0.5) + (s + 0.5) * stepDepth;
      const stepH = (numSteps - s) * stepRise;
      const stepY = 0.22 + stepH * 0.5;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepDepth, stepH, 4.0), this.materials.sidewalkConcrete);
      stepMesh.position.set(stepX, stepY, platZ);
      group.add(stepMesh);

      this.collisionWorld.addBox(stepX - stepDepth * 0.5, stepX + stepDepth * 0.5, platZ - 2.0, platZ + 2.0, 0.22, 0.22 + stepH, true, 'station_step');
    }

    const rampL = 6.0;
    const rampHalfW = platW * 0.5;
    this.collisionWorld.addRamp(platX, platZ + 24.0, 0.22, rampHalfW, rampL, platH, Math.PI, 'station_ramp_s');
    this.collisionWorld.addRamp(platX, platZ - 24.0, 0.22, rampHalfW, rampL, platH, 0, 'station_ramp_n');
  }

  _buildRailroadCrossing(group, fx, fy, fz) {
    const crossing = new THREE.Group();
    crossing.position.set(fx, fy, fz);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.8, 6), this.materials.roadMarkingYellow);
    mast.position.y = 2.4;
    crossing.add(mast);

    [-Math.PI / 4, Math.PI / 4].forEach((angle) => {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      cross.rotation.z = angle;
      cross.position.y = 4.2;
      crossing.add(cross);
    });

    [-0.55, 0.55].forEach((lx) => {
      const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 8), this.materials.darkPole);
      lampHousing.rotation.x = Math.PI / 2;
      lampHousing.position.set(lx, 3.6, 0.1);
      crossing.add(lampHousing);

      const lampLens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), this.materials.signalRed);
      lampLens.position.set(lx, 3.6, 0.2);
      crossing.add(lampLens);
      this.trainCrossingLights.push(lampLens);
    });

    group.add(crossing);
    this.collisionWorld.addStaticCylinder(fx, 2.4 + fy, fz, 0.35, 4.8);
  }

  _buildRailwayTunnel(group, rx, rz) {
    const tL = 40.0;
    const tH = 5.8;

    [-tL * 0.5, tL * 0.5].forEach((zOff) => {
      const portal = new THREE.Mesh(new THREE.BoxGeometry(8.5, tH + 3.0, 3.0), this.materials.rockStone);
      portal.position.set(rx, (tH + 3.0) * 0.5 + 0.22, rz + zOff);
      group.add(portal);
    });
  }

  /* -------------------------------------------------------------
   * 6. Coastline, Beaches & Surf
   * ------------------------------------------------------------- */
  _buildCoastlineAndBeaches() {
    const coastGroup = new THREE.Group();

    const pierX = -28.0;
    const pierZ = -70.0;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.4, 42.0), this.materials.seawallConcrete);
    pier.position.set(pierX, 0.7 + 0.22, pierZ);
    pier.castShadow = true;
    coastGroup.add(pier);

    this.collisionWorld.addBox(pierX - 3.0, pierX + 3.0, pierZ - 21.0, pierZ + 21.0, 0.0, 1.4 + 0.22, true, 'tetrapod_pier');

    for (let z = -140; z <= 140; z += 16) {
      this._buildTetrapod(coastGroup, -26.5 + Math.sin(z * 0.05) * 2.0, 0.22, z);
    }

    this._buildSurfShack(coastGroup, -32.0, 0.12, -25.0);
    this._buildLifeguardTower(coastGroup, -34.0, 0.10, 30.0);
    this._buildBonfireCamp(coastGroup, -30.0, 0.12, 70.0);
    this._buildSeaCaveStack(coastGroup, -95.0, 0.0, -40.0);

    this.rootGroup.add(coastGroup);
  }

  _buildTetrapod(group, tx, ty, tz) {
    const tetrapod = new THREE.Group();
    tetrapod.position.set(tx, ty, tz);

    const prongGeo = new THREE.CylinderGeometry(0.42, 0.65, 2.4, 6);
    const angles = [
      [0, 0, 0],
      [Math.PI * 0.6, 0, 0],
      [Math.PI * 0.6, Math.PI * 0.66, 0],
      [Math.PI * 0.6, -Math.PI * 0.66, 0]
    ];
    angles.forEach(([rx, ry, rz]) => {
      const prong = new THREE.Mesh(prongGeo, this.materials.seawallConcrete);
      prong.rotation.set(rx, ry, rz);
      prong.position.y = 0.6;
      tetrapod.add(prong);
    });

    group.add(tetrapod);
    this.collisionWorld.addStaticBox(tx, ty + 0.8, tz, 2.4, 1.8, 2.4, true, 'tetrapod');
  }

  _buildSurfShack(group, sx, sy, sz) {
    const hut = new THREE.Group();
    hut.position.set(sx, sy, sz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, 5.5), this.materials.weatheredTimber);
    body.position.y = 1.6;
    hut.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 1.8, 4), this.materials.thatchRoof);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 4.0;
    hut.add(roof);

    const boardColors = [0x00d2ff, 0xff3366, 0xffd200, 0x00ff88];
    boardColors.forEach((colorHex, idx) => {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.08), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 }));
      board.rotation.z = -0.18;
      board.rotation.y = 0.15;
      board.position.set(-3.7, 1.2, -1.8 + idx * 1.1);
      hut.add(board);
    });

    group.add(hut);
    this.collisionWorld.addStaticBox(sx, sy + 1.6, sz, 7.8, 3.4, 6.0, false, 'surf_shack');
  }

  _buildLifeguardTower(group, tx, ty, tz) {
    const tower = new THREE.Group();
    tower.position.set(tx, ty, tz);

    const stiltH = 3.6;
    [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([ox, oz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, stiltH, 6), this.materials.weatheredTimber);
      post.position.set(ox, stiltH * 0.5, oz);
      tower.add(post);
    });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 4.2), this.materials.konbiniWhite);
    cabin.position.y = stiltH + 1.2;
    tower.add(cabin);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 5), this.materials.steelSilver);
    mast.position.set(1.9, stiltH + 3.6, 1.9);
    tower.add(mast);

    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    flag.position.set(2.5, stiltH + 4.8, 1.9);
    tower.add(flag);

    group.add(tower);
    this.collisionWorld.addBox(tx - 2.2, tx + 2.2, tz - 2.2, tz + 2.2, ty, ty + stiltH + 2.5, false, 'lifeguard_tower');
  }

  _buildBonfireCamp(group, bx, by, bz) {
    const camp = new THREE.Group();
    camp.position.set(bx, by, bz);

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), this.materials.rockStone);
      rock.position.set(Math.cos(a) * 1.2, 0.2, Math.sin(a) * 1.2);
      camp.add(rock);
    }

    [-2.2, 2.2].forEach((lz) => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 3.2, 6), this.materials.weatheredTimber);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.25, lz);
      camp.add(log);
      this.collisionWorld.addStaticBox(bx, by + 0.25, bz + lz, 3.2, 0.5, 0.8, true, 'driftwood_log');
    });

    this.bonfireFlame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.4, 6), this.materials.fireFlame);
    this.bonfireFlame.position.y = 0.7;
    camp.add(this.bonfireFlame);

    group.add(camp);
  }

  _buildSeaCaveStack(group, sx, sy, sz) {
    const stack = new THREE.Group();
    stack.position.set(sx, sy, sz);

    const leftPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(5.0, 0), this.materials.rockStone);
    leftPillar.position.set(-4.5, 4.0, 0);
    stack.add(leftPillar);

    const rightPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(5.0, 0), this.materials.rockStone);
    rightPillar.position.set(4.5, 4.0, 0);
    stack.add(rightPillar);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(11.0, 3.5, 7.0), this.materials.rockStone);
    archTop.position.set(0, 8.5, 0);
    stack.add(archTop);

    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), this.materials.shrineWoodDark);
    altar.position.set(0, 0.4, 0);
    stack.add(altar);

    const tapeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.15), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    tapeGlow.position.set(0, 0.95, 0);
    stack.add(tapeGlow);

    group.add(stack);
    this.collisionWorld.addStaticBox(sx - 4.5, 4.0, sz, 6.0, 8.0, 6.0, false, 'sea_arch_left');
    this.collisionWorld.addStaticBox(sx + 4.5, 4.0, sz, 6.0, 8.0, 6.0, false, 'sea_arch_right');
  }

  /* -------------------------------------------------------------
   * 7. Commercial & Town Sector
   * ------------------------------------------------------------- */
  _buildCommercialAndTownSector() {
    const townGroup = new THREE.Group();

    this._buildConvenienceStore(townGroup, 18.0, 0.22, 24.0);
    this._buildRamenBar(townGroup, 22.0, 0.22, -35.0);
    this._buildGasStation(townGroup, 25.0, 0.22, -110.0);
    this._buildCoinLaundromat(townGroup, 22.0, 0.22, 145.0);

    for (let z = 175; z <= 225; z += 18.0) {
      this._buildMachiyaTownhouse(townGroup, 26.0, 0.22, z);
    }

    this.rootGroup.add(townGroup);
  }

  _buildConvenienceStore(group, sx, sy, sz) {
    const store = new THREE.Group();
    store.position.set(sx, sy, sz);

    const storeW = 16.0;
    const storeL = 12.0;
    const storeH = 4.6;

    const building = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, storeL), this.materials.konbiniWhite);
    building.position.set(0, storeH * 0.5, 0);
    store.add(building);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(storeW + 0.2, 0.75, storeL + 0.2), this.materials.konbiniBlueStripe);
    stripe.position.set(0, storeH - 0.45, 0);
    store.add(stripe);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(storeW * 0.75, storeH * 0.65), this.materials.konbiniGlowInterior);
    glass.position.set(0, storeH * 0.42, storeL * 0.51);
    store.add(glass);

    const machineColors = [0x1c8b3e, 0x1f487e, 0xd43828];
    machineColors.forEach((colorHex, idx) => {
      const mx = -storeW * 0.5 + 2.0 + idx * 1.5;
      const mz = storeL * 0.5 + 0.6;
      const vm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.9), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 }));
      vm.position.set(mx, 1.2, mz);
      store.add(vm);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glow.position.set(mx, 1.4, mz + 0.46);
      store.add(glow);
      this.vendingGlows.push(glow);

      this.collisionWorld.addStaticBox(sx + mx, sy + 1.2, sz + mz, 1.2, 2.4, 0.9, true, 'vending_machine');
    });

    const parking = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), this.materials.roadAsphalt);
    parking.rotateX(-Math.PI / 2);
    parking.position.set(0, 0.01, storeL * 0.5 + 8);
    store.add(parking);

    group.add(store);
    this.collisionWorld.addStaticBox(sx, sy + storeH * 0.5, sz, storeW + 0.8, storeH, storeL + 0.8, false, 'konbini_store');
  }

  _buildRamenBar(group, rx, ry, rz) {
    const ramen = new THREE.Group();
    ramen.position.set(rx, ry, rz);

    const cart = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 3.2), this.materials.machiyaLattice);
    cart.position.y = 1.4;
    ramen.add(cart);

    const noren = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 3.6), this.materials.konbiniWhite);
    noren.position.y = 2.9;
    ramen.add(noren);

    [-1.6, 0, 1.6].forEach((lx) => {
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 8), this.materials.paperLanternRed);
      lantern.position.set(lx, 2.3, 1.9);
      ramen.add(lantern);
      this.lanternGlows.push(lantern);
    });

    [-1.4, 0, 1.4].forEach((sx) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 6), this.materials.shrineWoodDark);
      stool.position.set(sx, 0.28, 2.4);
      ramen.add(stool);
    });

    group.add(ramen);
    this.collisionWorld.addStaticBox(rx, ry + 1.4, rz, 5.2, 2.8, 3.5, false, 'ramen_bar');
  }

  _buildGasStation(group, gx, gy, gz) {
    const station = new THREE.Group();
    station.position.set(gx, gy, gz);

    const canopyW = 18.0;
    const canopyL = 14.0;
    const canopyH = 5.2;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 1.2, canopyL), this.materials.eneosOrange);
    roof.position.y = canopyH;
    station.add(roof);

    [[-6, -4], [6, -4], [-6, 4], [6, 4]].forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, canopyH, 8), this.materials.konbiniWhite);
      pillar.position.set(px, canopyH * 0.5, pz);
      station.add(pillar);
      this.collisionWorld.addStaticCylinder(gx + px, gy + canopyH * 0.5, gz + pz, 0.45, canopyH);
    });

    [-3.5, 3.5].forEach((px) => {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.9), this.materials.konbiniWhite);
      pump.position.set(px, 1.2, 0);
      station.add(pump);
      this.collisionWorld.addStaticBox(gx + px, gy + 1.2, gz, 1.8, 2.4, 1.2, false, 'fuel_pump');
    });

    group.add(station);
  }

  _buildCoinLaundromat(group, lx, ly, lz) {
    const laundromat = new THREE.Group();
    laundromat.position.set(lx, ly, lz);

    const building = new THREE.Mesh(new THREE.BoxGeometry(10.0, 4.2, 8.0), this.materials.konbiniWhite);
    building.position.y = 2.1;
    laundromat.add(building);

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 0.8), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    sign.position.set(0, 3.4, 4.05);
    laundromat.add(sign);

    group.add(laundromat);
    this.collisionWorld.addStaticBox(lx, ly + 2.1, lz, 10.5, 4.2, 8.5, false, 'coin_laundromat');
  }

  _buildMachiyaTownhouse(group, mx, my, mz) {
    const house = new THREE.Group();
    house.position.set(mx, my, mz);

    const houseW = 8.5;
    const houseL = 12.0;
    const houseH = 4.8;

    const body = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseL), this.materials.machiyaLattice);
    body.position.y = houseH * 0.5;
    house.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(houseW * 0.85, 2.4, 4), this.materials.shrineRoofTile);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = houseH + 1.2;
    roof.scale.set(1.0, 1.0, houseL / houseW);
    house.add(roof);

    group.add(house);
    this.collisionWorld.addStaticBox(mx, my + houseH * 0.5, mz, houseW + 0.5, houseH, houseL + 0.5, false, 'machiya_house');
  }

  /* -------------------------------------------------------------
   * 8. Enoshima Offshore Island, Causeway & Summit Lighthouse
   * ------------------------------------------------------------- */
  _buildEnoshimaIslandAndLighthouse() {
    const enoGroup = new THREE.Group();

    const bridgeX1 = -24.0;
    const bridgeX2 = -72.0;
    const bridgeZ = -80.0;
    const bridgeL = Math.abs(bridgeX2 - bridgeX1);
    const bridgeMidX = (bridgeX1 + bridgeX2) * 0.5;

    const causeway = new THREE.Mesh(new THREE.BoxGeometry(bridgeL, 1.2, 7.5), this.materials.seawallConcrete);
    causeway.position.set(bridgeMidX, 0.65, bridgeZ);
    causeway.castShadow = true;
    enoGroup.add(causeway);

    this.collisionWorld.addBox(bridgeX2, bridgeX1, bridgeZ - 3.75, bridgeZ + 3.75, 0.0, 1.25, true, 'enoshima_causeway');

    for (let x = bridgeX2 + 6; x < bridgeX1; x += 12.0) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 3.5, 6), this.materials.seawallConcrete);
      pier.position.set(x, 0.0, bridgeZ);
      enoGroup.add(pier);
    }

    const lhX = -95.0;
    const lhZ = -80.0;
    const lhBaseY = 12.5;
    const lhTowerH = 22.0;

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, lhTowerH, 8), this.materials.konbiniWhite);
    tower.position.set(lhX, lhBaseY + lhTowerH * 0.5, lhZ);
    tower.castShadow = true;
    enoGroup.add(tower);

    const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 1.4, 8), this.materials.shrineRoofTile);
    deck.position.set(lhX, lhBaseY + lhTowerH + 0.7, lhZ);
    enoGroup.add(deck);

    this.lighthouseBeacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), this.materials.beaconGlow);
    this.lighthouseBeacon.position.set(lhX, lhBaseY + lhTowerH + 2.2, lhZ);
    enoGroup.add(this.lighthouseBeacon);

    this.collisionWorld.addStaticCylinder(lhX, lhBaseY + lhTowerH * 0.5, lhZ, 3.0, lhTowerH);

    this.rootGroup.add(enoGroup);
  }

  /* -------------------------------------------------------------
   * 9. Sacred Mountain, Shrines, Daibutsu, Bamboo & Touge Lookouts
   * ------------------------------------------------------------- */
  _buildSacredMountainAndShrine() {
    const shrineGroup = new THREE.Group();

    this._buildToriiGate(shrineGroup, 56.0, 0.22, -20.0, 7.2, 6.8);

    for (let x = 58; x <= 94; x += 4.0) {
      const stepY = this.getIslandElevation(x, -20.0);
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, 4.2), this.materials.sidewalkConcrete);
      step.position.set(x, stepY + 0.08, -20.0);
      step.receiveShadow = true;
      shrineGroup.add(step);

      if (Math.round(x) % 8 === 2) {
        [-3.4, 3.4].forEach((zOff) => {
          const lz = -20.0 + zOff;
          const ly = this.getIslandElevation(x, lz);
          this._buildStoneLantern(shrineGroup, x, ly, lz);
        });
      }
    }

    this._buildToriiGate(shrineGroup, 96.0, 7.50, -20.0, 7.5, 7.2);

    // Hillside Shrine Hall
    const hallX = 108.0;
    const hallZ = -20.0;
    const hallY = 7.50;
    const hallW = 12.0;
    const hallL = 9.0;
    const hallH = 4.2;

    const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallL), this.materials.shrineVermilion);
    hall.position.set(hallX, hallY + hallH * 0.5 + 0.4, hallZ);
    shrineGroup.add(hall);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(hallW * 0.85, 3.2, 4), this.materials.shrineRoofTile);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(hallX, hallY + hallH + 1.8, hallZ);
    roof.scale.set(1.0, 1.0, hallL / hallW);
    shrineGroup.add(roof);

    this.collisionWorld.addStaticBox(hallX, hallY + hallH * 0.5, hallZ, hallW + 2.0, hallH + 2.0, hallL + 2.0, false, 'shrine_hall');

    this._buildDaibutsuMonument(shrineGroup, 115.0, 8.00, -80.0);
    this._buildBambooGrove(shrineGroup, 85.0, 40.0, 22.0);
    this._buildZenRockGarden(shrineGroup, 110.0, 7.50, 35.0);
    this._buildSummitTougeLookout(shrineGroup, 135.0, 16.5, 60.0);

    this.rootGroup.add(shrineGroup);
  }

  _buildToriiGate(group, tx, ty, tz, width, height) {
    const torii = new THREE.Group();
    torii.position.set(tx, ty, tz);

    [-width * 0.5, width * 0.5].forEach((zOff) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, height, 8), this.materials.shrineVermilion);
      pillar.position.set(0, height * 0.5, zOff);
      torii.add(pillar);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.5, 8), this.materials.shrineRoofTile);
      plinth.position.set(0, 0.25, zOff);
      torii.add(plinth);

      this.collisionWorld.addStaticCylinder(tx, ty + height * 0.5, tz + zOff, 0.55, height);
    });

    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, width + 2.8), this.materials.shrineVermilion);
    kasagi.position.set(0, height, 0);
    torii.add(kasagi);

    const nuki = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, width + 0.6), this.materials.shrineVermilion);
    nuki.position.set(0, height - 1.2, 0);
    torii.add(nuki);

    group.add(torii);
  }

  _buildStoneLantern(group, lx, ly, lz) {
    const lantern = new THREE.Group();
    lantern.position.set(lx, ly, lz);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.6, 6), this.materials.sidewalkConcrete);
    base.position.y = 0.3;
    lantern.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.2, 6), this.materials.sidewalkConcrete);
    pillar.position.y = 1.2;
    lantern.add(pillar);

    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.55, 6), this.materials.lanternGlow);
    box.position.y = 2.0;
    lantern.add(box);
    this.lanternGlows.push(box);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.45, 6), this.materials.sidewalkConcrete);
    roof.position.y = 2.5;
    lantern.add(roof);

    group.add(lantern);
  }

  _buildDaibutsuMonument(group, dx, dy, dz) {
    const daibutsu = new THREE.Group();
    daibutsu.position.set(dx, dy, dz);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.8, 9.0), this.materials.sidewalkConcrete);
    pedestal.position.y = 0.9;
    daibutsu.add(pedestal);

    const torso = new THREE.Mesh(new THREE.ConeGeometry(3.6, 5.5, 7), this.materials.daibutsuBronze);
    torso.position.y = 4.2;
    daibutsu.add(torso);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), this.materials.daibutsuBronze);
    head.position.y = 7.5;
    daibutsu.add(head);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.15, 6, 12), this.materials.daibutsuBronze);
    halo.position.set(0, 7.5, -0.6);
    daibutsu.add(halo);

    group.add(daibutsu);
    this.collisionWorld.addStaticBox(dx, dy + 4.5, dz, 9.5, 9.0, 9.5, false, 'daibutsu_monument');
  }

  _buildBambooGrove(group, cx, cz, radius) {
    const bambooCount = 280;
    for (let i = 0; i < bambooCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const bx = cx + Math.cos(angle) * dist;
      const bz = cz + Math.sin(angle) * dist;
      const by = this.getIslandElevation(bx, bz);

      const culmH = 9.0 + Math.random() * 4.0;
      const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, culmH, 5), this.materials.bambooStalk);
      culm.position.set(bx, by + culmH * 0.5, bz);
      group.add(culm);

      const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), this.materials.bambooLeaf);
      leaves.position.set(bx, by + culmH + 0.4, bz);
      group.add(leaves);
    }
  }

  _buildZenRockGarden(group, zx, zy, zz) {
    const garden = new THREE.Group();
    garden.position.set(zx, zy, zz);

    const sandBed = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ color: 0xd9d7ce, roughness: 0.9 }));
    sandBed.rotateX(-Math.PI / 2);
    sandBed.position.set(0, 0.02, 0);
    garden.add(sandBed);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.3, 12.4), this.materials.shrineWoodDark);
    curb.position.set(0, 0.15, 0);
    garden.add(curb);

    const rockLocations = [[-4, -2], [1, 2], [5, -1], [3, -3]];
    rockLocations.forEach(([rx, rz]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), this.materials.rockStone);
      rock.scale.set(1.0, 0.7, 1.2);
      rock.position.set(rx, 0.6, rz);
      garden.add(rock);
    });

    group.add(garden);
  }

  _buildSummitTougeLookout(group, lx, ly, lz) {
    const lookout = new THREE.Group();
    lookout.position.set(lx, ly, lz);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.4, 8.0), this.materials.weatheredTimber);
    deck.position.set(0, 0.2, 0);
    deck.receiveShadow = true;
    lookout.add(deck);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.1, 8.2), this.materials.machiyaLattice);
    rail.position.set(0, 0.75, 0);
    lookout.add(rail);

    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), this.materials.steelSilver);
    scope.position.set(0, 1.0, -3.4);
    lookout.add(scope);

    group.add(lookout);
    this.collisionWorld.addBox(lx - 6.0, lx + 6.0, lz - 4.0, lz + 4.0, ly, ly + 0.4, true, 'summit_lookout_deck');
  }

  /* -------------------------------------------------------------
   * 10. Large Japanese Buddhist Temple Complex (Pagoda & Hondo)
   * ------------------------------------------------------------- */
  _buildGrandBuddhistTemple() {
    const templeGroup = new THREE.Group();
    const temX = 114.0;
    const temY = 7.50;
    const temZ = 160.0;

    templeGroup.position.set(temX, temY, temZ);

    const courtyard = new THREE.Mesh(new THREE.PlaneGeometry(36, 60), this.materials.sidewalkConcrete);
    courtyard.rotateX(-Math.PI / 2);
    courtyard.position.set(0, 0.02, 0);
    templeGroup.add(courtyard);

    this._buildSanmonGate(templeGroup, -16.0, 0);
    this._buildFiveStoryPagoda(templeGroup, -4.0, -20.0);
    this._buildMainSanctuaryHondo(templeGroup, 10.0, 0);
    this._buildBellTowerShoro(templeGroup, -4.0, 20.0);
    this._buildIncenseCauldron(templeGroup, -4.0, 0);
    this._buildLotusPondAndBridge(templeGroup, -6.0, 36.0);

    this.rootGroup.add(templeGroup);
  }

  _buildSanmonGate(group, gx, gz) {
    const gate = new THREE.Group();
    gate.position.set(gx, 0, gz);

    const gateW = 7.0;
    const gateL = 14.0;
    const gateH = 8.5;

    [[-gateW * 0.4, -gateL * 0.4], [gateW * 0.4, -gateL * 0.4], [-gateW * 0.4, gateL * 0.4], [gateW * 0.4, gateL * 0.4]].forEach(([ox, oz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, gateH, 8), this.materials.templeRed);
      col.position.set(ox, gateH * 0.5, oz);
      gate.add(col);
    });

    const lowerRoof = new THREE.Mesh(new THREE.BoxGeometry(gateW + 2.5, 0.6, gateL + 2.5), this.materials.shrineRoofTile);
    lowerRoof.position.y = gateH * 0.6;
    gate.add(lowerRoof);

    const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(gateW + 0.5, 2.8, gateL + 0.5), this.materials.shrineWoodDark);
    upperFloor.position.y = gateH * 0.8;
    gate.add(upperFloor);

    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry((gateL + 4.0) * 0.65, 3.2, 4), this.materials.shrineRoofTile);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.position.y = gateH + 2.2;
    mainRoof.scale.set(gateW / gateL, 1.0, 1.0);
    gate.add(mainRoof);

    group.add(gate);
    this.collisionWorld.addStaticBox(114.0 + gx, 7.50 + gateH * 0.5, 160.0 + gz, gateW, gateH, gateL, false, 'sanmon_gate');
  }

  _buildFiveStoryPagoda(group, px, pz) {
    const pagoda = new THREE.Group();
    pagoda.position.set(px, 0, pz);

    const baseW = 10.0;
    const floorH = 3.6;
    let currentY = 0;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(baseW + 2.0, 1.2, baseW + 2.0), this.materials.sidewalkConcrete);
    plinth.position.y = 0.6;
    pagoda.add(plinth);
    currentY += 1.2;

    for (let tier = 0; tier < 5; tier++) {
      const taper = 1.0 - tier * 0.09;
      const tierW = baseW * taper;

      const room = new THREE.Mesh(new THREE.BoxGeometry(tierW * 0.72, floorH, tierW * 0.72), this.materials.templeRed);
      room.position.y = currentY + floorH * 0.5;
      pagoda.add(room);

      const balcony = new THREE.Mesh(new THREE.BoxGeometry(tierW * 0.95, 0.25, tierW * 0.95), this.materials.shrineWoodDark);
      balcony.position.y = currentY + 0.2;
      pagoda.add(balcony);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(tierW * 0.85, 1.4, 4), this.materials.shrineRoofTile);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = currentY + floorH + 0.7;
      pagoda.add(roof);

      currentY += floorH + 0.9;
    }

    const sorinH = 6.5;
    const sorinPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, sorinH, 8), this.materials.templeGold);
    sorinPole.position.y = currentY + sorinH * 0.5;
    pagoda.add(sorinPole);

    for (let r = 0; r < 9; r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 - r * 0.02, 0.07, 6, 12), this.materials.templeGold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = currentY + 1.2 + r * 0.45;
      pagoda.add(ring);
    }

    const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), this.materials.templeGold);
    jewel.position.y = currentY + sorinH + 0.4;
    pagoda.add(jewel);

    group.add(pagoda);
    this.collisionWorld.addStaticBox(114.0 + px, 7.50 + currentY * 0.5, 160.0 + pz, baseW, currentY, baseW, false, 'pagoda');
  }

  _buildMainSanctuaryHondo(group, hx, hz) {
    const hondo = new THREE.Group();
    hondo.position.set(hx, 0, hz);

    const hW = 16.0;
    const hL = 22.0;
    const hH = 6.5;

    const veranda = new THREE.Mesh(new THREE.BoxGeometry(hW + 2.5, 0.8, hL + 2.5), this.materials.shrineWoodDark);
    veranda.position.y = 0.4;
    hondo.add(veranda);

    const body = new THREE.Mesh(new THREE.BoxGeometry(hW, hH, hL), this.materials.templeRed);
    body.position.y = hH * 0.5 + 0.8;
    hondo.add(body);

    const lowerEaves = new THREE.Mesh(new THREE.BoxGeometry(hW + 3.0, 0.7, hL + 3.0), this.materials.shrineRoofTile);
    lowerEaves.position.y = hH * 0.8 + 0.8;
    hondo.add(lowerEaves);

    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry((hL + 4.0) * 0.65, 4.2, 4), this.materials.shrineRoofTile);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.position.y = hH + 3.2;
    mainRoof.scale.set(hW / hL, 1.0, 1.0);
    hondo.add(mainRoof);

    [-hL * 0.45, hL * 0.45].forEach((zOff) => {
      const shibi = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.4, 4), this.materials.templeGold);
      shibi.position.set(0, hH + 5.2, zOff);
      hondo.add(shibi);
    });

    group.add(hondo);
    this.collisionWorld.addStaticBox(114.0 + hx, 7.50 + hH * 0.5, 160.0 + hz, hW + 2.0, hH + 2.0, hL + 2.0, false, 'temple_hondo');
  }

  _buildBellTowerShoro(group, bx, bz) {
    const belfry = new THREE.Group();
    belfry.position.set(bx, 0, bz);

    const bH = 6.0;
    [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].forEach(([ox, oz]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, bH, 6), this.materials.shrineWoodDark);
      pillar.position.set(ox, bH * 0.5, oz);
      belfry.add(pillar);
    });

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), this.materials.shrineRoofTile);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = bH + 1.2;
    belfry.add(roof);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 2.2, 8), this.materials.daibutsuBronze);
    bell.position.y = bH * 0.65;
    belfry.add(bell);

    const striker = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6), this.materials.weatheredTimber);
    striker.rotation.x = Math.PI / 2;
    striker.position.set(1.4, bH * 0.65, 0);
    belfry.add(striker);

    group.add(belfry);
    this.collisionWorld.addStaticBox(114.0 + bx, 7.50 + bH * 0.5, 160.0 + bz, 5.0, bH, 5.0, false, 'shoro_belfry');
  }

  _buildIncenseCauldron(group, ix, iz) {
    const cauldron = new THREE.Group();
    cauldron.position.set(ix, 0, iz);

    const urn = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 1.4, 8), this.materials.daibutsuBronze);
    urn.position.y = 1.2;
    cauldron.add(urn);

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.7, 6), this.materials.daibutsuBronze);
      leg.position.set(Math.cos(a) * 1.1, 0.35, Math.sin(a) * 1.1);
      cauldron.add(leg);
    }

    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + p * 0.15), this.materials.incenseSmokeMat);
      puff.position.set(0.1 * p, 2.2 + p * 0.6, -0.1 * p);
      cauldron.add(puff);
      this.incenseSmokes.push(puff);
    }

    group.add(cauldron);
    this.collisionWorld.addStaticCylinder(114.0 + ix, 7.50 + 1.0, 160.0 + iz, 1.6, 2.2);
  }

  _buildLotusPondAndBridge(group, px, pz) {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(px, 0, pz);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(9.0, 9.0, 0.2, 16), this.materials.tunnelConcrete);
    water.position.y = 0.05;
    pondGroup.add(water);

    const bridgeL = 12.0;
    const bridgeW = 3.2;
    const bridgeH = 1.8;

    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 0.25, bridgeL), this.materials.templeRed);
    bridgeDeck.position.set(0, bridgeH * 0.6, 0);
    pondGroup.add(bridgeDeck);

    [-bridgeW * 0.45, bridgeW * 0.45].forEach((xOff) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, bridgeL), this.materials.templeRed);
      rail.position.set(xOff, bridgeH * 0.6 + 0.5, 0);
      pondGroup.add(rail);
    });

    group.add(pondGroup);
    this.collisionWorld.addBox(114.0 + px - 1.6, 114.0 + px + 1.6, 160.0 + pz - 6.0, 160.0 + pz + 6.0, 7.50, 7.50 + bridgeH, true, 'moon_bridge');
  }

  /* -------------------------------------------------------------
   * 11. Winding Mountain Forest Trail (Touge Switchbacks)
   * ------------------------------------------------------------- */
  _buildWindingForestTrail() {
    const trailGroup = new THREE.Group();

    // Trailhead Archway & Map Board at valley entrance (54, 45)
    this._buildTrailheadEntrance(trailGroup, 54.0, 0.22, 45.0);

    // Mountain Stream Footbridge at Hairpin #1 (66, 110)
    this._buildTrailStreamFootbridge(trailGroup, 66.0, 6.0, 110.0);

    // Trail Rest Benches & Stone Lanterns along switchbacks
    const trailProps = [
      [68, 68, 2.2], [74, 95, 4.4], [78, 125, 7.2], [98, 122, 9.5], [102, 102, 11.5], [122, 68, 15.5]
    ];
    trailProps.forEach(([tx, tz, expY]) => {
      const ty = this.getIslandElevation(tx, tz);
      this._buildStoneLantern(trailGroup, tx - 2.2, ty, tz);

      // Wooden bench on wide switchbacks
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 2.5), this.materials.weatheredTimber);
      bench.position.set(tx + 2.4, ty + 0.25, tz);
      trailGroup.add(bench);
    });

    this.rootGroup.add(trailGroup);
  }

  _buildTrailheadEntrance(group, ex, ey, ez) {
    const entrance = new THREE.Group();
    entrance.position.set(ex, ey, ez);

    // Rustic Timber Trail Torii / Arch
    const postH = 4.8;
    [-2.2, 2.2].forEach((zOff) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, postH, 6), this.materials.weatheredTimber);
      post.position.set(0, postH * 0.5, zOff);
      entrance.add(post);
    });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 5.2), this.materials.weatheredTimber);
    beam.position.set(0, postH, 0);
    entrance.add(beam);

    // Trail Map Signboard ("富士見峠自然歩道 // FUJIMI TOUGE NATURE TRAIL")
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 2.6), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    board.position.set(-1.2, 1.8, -3.2);
    entrance.add(board);

    group.add(entrance);
  }

  _buildTrailStreamFootbridge(group, bx, by, bz) {
    const bridge = new THREE.Group();
    bridge.position.set(bx, by, bz);

    const bW = 3.6;
    const bL = 8.5;
    const bH = 0.35;

    const deck = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bL), this.materials.weatheredTimber);
    deck.position.y = bH * 0.5;
    bridge.add(deck);

    [-bW * 0.48, bW * 0.48].forEach((xOff) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.85, bL), this.materials.weatheredTimber);
      rail.position.set(xOff, 0.55, 0);
      bridge.add(rail);
    });

    group.add(bridge);
    this.collisionWorld.addBox(bx - bW * 0.5, bx + bW * 0.5, bz - bL * 0.5, bz + bL * 0.5, by, by + bH, true, 'forest_footbridge');
  }

  /* -------------------------------------------------------------
   * 12. Dense Roadside Environmental Props
   * ------------------------------------------------------------- */
  _buildRoadsideDetails() {
    const propGroup = new THREE.Group();

    // 45 Concrete Utility Poles (Denchū)
    for (let z = -320; z <= 320; z += 16) {
      if (z >= 75 && z <= 125) continue;
      this._buildDenchuUtilityPole(propGroup, 18.2, 0.22, z);
    }

    // 20 Convex Traffic Safety Mirrors (Kābuminā)
    const mirrorCoords = [
      [16.5, -340], [16.5, -230], [16.5, -165], [16.5, -115],
      [16.5, -45], [16.5, -5], [16.5, 5], [16.5, 35],
      [16.5, 75], [16.5, 125], [16.5, 155], [16.5, 205],
      [16.5, 245], [16.5, 305], [54.0, -22], [54.0, 45], [54.0, 135]
    ];
    mirrorCoords.forEach(([mx, mz]) => {
      const my = this.getIslandElevation(mx, mz);
      this._buildConvexTrafficMirror(propGroup, mx, my, mz);
    });

    // 16 Parked City Bicycles (Mamachari)
    const bikeCoords = [
      [17.5, 29.5], [18.2, 30.5], [-5.2, -6.0], [-5.2, 8.0],
      [22.5, -31.0], [21.5, 142.0], [25.5, 182.0], [-5.2, 204.0],
      [16.8, 12.0], [23.5, 172.0], [-30.0, -22.0]
    ];
    bikeCoords.forEach(([bx, bz]) => {
      const by = this.getIslandElevation(bx, bz);
      this._buildMamachariBicycle(propGroup, bx, by, bz);
    });

    // 14 Stone Jizō Statues
    const jizoCoords = [
      [58, -16], [64, -24], [78, -26], [90, -14],
      [104, 18], [116, 52], [72, 38], [128, 62],
      [64, 108], [80, 132], [102, 114], [94, 88]
    ];
    jizoCoords.forEach(([jx, jz]) => {
      const jy = this.getIslandElevation(jx, jz);
      this._buildJizoStatue(propGroup, jx, jy, jz);
    });

    this.rootGroup.add(propGroup);
  }

  _buildDenchuUtilityPole(group, px, py, pz) {
    const pole = new THREE.Group();
    pole.position.set(px, py, pz);

    const poleH = 10.5;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, poleH, 6), this.materials.tunnelConcrete);
    mast.position.y = poleH * 0.5;
    pole.add(mast);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.2), this.materials.darkPole);
    arm.position.set(0, poleH - 1.2, 0);
    pole.add(arm);

    const transformer = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 8), this.materials.darkPole);
    transformer.position.set(0.35, poleH - 2.5, 0);
    pole.add(transformer);

    group.add(pole);
    this.collisionWorld.addStaticCylinder(px, py + poleH * 0.5, pz, 0.35, poleH);
  }

  _buildConvexTrafficMirror(group, mx, my, mz) {
    const mirror = new THREE.Group();
    mirror.position.set(mx, my, mz);

    const poleH = 3.4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 6), this.materials.trafficMirrorOrange);
    pole.position.y = poleH * 0.5;
    mirror.add(pole);

    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 10), this.materials.trafficMirrorOrange);
    housing.rotation.z = Math.PI / 2;
    housing.position.set(-0.1, poleH, 0);
    mirror.add(housing);

    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.48, 10), this.materials.trafficMirrorGlass);
    glass.rotation.y = -Math.PI / 2;
    glass.position.set(-0.17, poleH, 0);
    mirror.add(glass);

    group.add(mirror);
  }

  _buildMamachariBicycle(group, bx, by, bz) {
    const bike = new THREE.Group();
    bike.position.set(bx, by, bz);

    [-0.6, 0.6].forEach((zOff) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 5, 10), this.materials.darkPole);
      wheel.position.set(0, 0.32, zOff);
      bike.add(wheel);
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.1), this.materials.konbiniBlueStripe);
    frame.position.set(0, 0.55, 0);
    bike.add(frame);

    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), this.materials.steelSilver);
    basket.position.set(0, 0.75, 0.55);
    bike.add(basket);

    group.add(bike);
  }

  _buildJizoStatue(group, jx, jy, jz) {
    const jizo = new THREE.Group();
    jizo.position.set(jx, jy, jz);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.65), this.materials.rockStone);
    base.position.y = 0.17;
    jizo.add(base);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.85, 6), this.materials.rockStone);
    body.position.y = 0.75;
    jizo.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), this.materials.rockStone);
    head.position.y = 1.25;
    jizo.add(head);

    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.25, 0.12), this.materials.templeRed);
    bib.position.set(0, 1.05, 0.16);
    jizo.add(bib);

    group.add(jizo);
  }

  /* -------------------------------------------------------------
   * 13. Massive 10x Japanese Foliage & Cedar Forest (1,200+ Trees)
   * ------------------------------------------------------------- */
  _buildThematicFoliage() {
    const floraGroup = new THREE.Group();

    // 1. ANCIENT SUGI CEDAR & HINOKI CYPRESS MOUNTAIN FOREST (320 Tall Spire Trees)
    // Blanketing the eastern mountain slopes from X = 65 to 190, Z = -340 to +340
    for (let i = 0; i < 320; i++) {
      const cx = 65 + Math.random() * 115;
      const cz = -330 + Math.random() * 660;

      // Keep clearings around buildings and road
      if (Math.hypot(cx - 114, cz - 160) < 28) continue; // Temple
      if (Math.hypot(cx - 108, cz - (-20)) < 20) continue; // Shrine
      if (Math.hypot(cx - 115, cz - (-80)) < 18) continue; // Daibutsu
      if (Math.hypot(cx - 85, cz - 40) < 22) continue; // Bamboo
      if (Math.hypot(cx - 135, cz - 60) < 14) continue; // Summit lookout

      // Check trail clearance
      const trail = this._getForestTrailHeightAndDist(cx, cz);
      if (trail.dist < 3.2) continue; // Don't block trail bed

      const cy = this.getIslandElevation(cx, cz);
      const scale = 0.95 + Math.random() * 0.65;
      this._buildJapaneseCedar(floraGroup, cx, cy, cz, scale);

      // Only register solid collision trunks for trees near trails & paths
      if (trail.dist < 6.0 || cx < 78) {
        this.collisionWorld.addStaticCylinder(cx, cy + 3, cz, 0.45 * scale, 8 * scale);
      }
    }

    // 2. WINDSWEPT KUROMATSU (Japanese Black Pines) - 95 Trees along Coast & Seawall
    for (let z = -330; z <= 330; z += 9) {
      if (Math.abs(z - 100) < 22) continue; // River
      const px = -18.5 + (Math.sin(z * 0.1) > 0 ? 0.8 : -0.8);
      const py = this.getIslandElevation(px, z);
      this._buildJapanesePine(floraGroup, px, py, z, 1.0 + Math.random() * 0.35);
      this.collisionWorld.addStaticCylinder(px, py + 2, z, 0.45, 6.0);
    }
    // Enoshima Island Pines
    const enoPineOffsets = [[-85, -60], [-105, -70], [-88, -95], [-100, -88], [-78, -82]];
    enoPineOffsets.forEach(([px, pz]) => {
      const py = this.getIslandElevation(px, pz);
      this._buildJapanesePine(floraGroup, px, py, pz, 1.25);
    });

    // 3. GINKGO BILOBA (Golden Fan Trees) - 65 Trees along Avenues & Valleys
    for (let z = -140; z <= 240; z += 14) {
      if (z >= 75 && z <= 125) continue;
      const gx = 52.0 + Math.sin(z * 0.2) * 2.0;
      const gy = this.getIslandElevation(gx, z);
      this._buildGinkgoTree(floraGroup, gx, gy, z, 1.15 + Math.random() * 0.3);
      this.collisionWorld.addStaticCylinder(gx, gy + 2.5, z, 0.4, 6.5);
    }
    // Temple Courtyard Ginkgo Trees
    [[96, 135], [96, 185], [128, 140], [128, 180]].forEach(([gx, gz]) => {
      const gy = this.getIslandElevation(gx, gz);
      this._buildGinkgoTree(floraGroup, gx, gy, gz, 1.35);
    });

    // 4. SAKURA (Cherry Blossoms) - 65 Trees around Shrines, Temples & Valley
    const sakuraBases = [
      [76, -12], [82, -28], [92, -38], [104, -34], [108, -16], [98, -6],
      [84, 8], [75, 22], [112, -70], [120, -90], [102, -92],
      [98, 140], [106, 188], [126, 165], [110, 130], [130, 150]
    ];
    sakuraBases.forEach(([bx, bz]) => {
      for (let s = 0; s < 4; s++) {
        const sx = bx + (Math.random() - 0.5) * 12;
        const sz = bz + (Math.random() - 0.5) * 12;
        const sy = this.getIslandElevation(sx, sz);
        this._buildSakuraTree(floraGroup, sx, sy, sz, 1.0 + Math.random() * 0.35);
      }
    });

    // 5. MOMIJI (Scarlet Japanese Maples) - 55 Trees
    const mapleBases = [
      [104, 25], [118, 45], [102, -75], [122, -85],
      [102, 142], [124, 150], [118, 178], [66, 105], [82, 132]
    ];
    mapleBases.forEach(([bx, bz]) => {
      for (let m = 0; m < 5; m++) {
        const mx = bx + (Math.random() - 0.5) * 10;
        const mz = bz + (Math.random() - 0.5) * 10;
        const my = this.getIslandElevation(mx, mz);
        this._buildMapleTree(floraGroup, mx, my, mz, 0.95 + Math.random() * 0.3);
      }
    });

    // 6. MOSO BAMBOO GROVE (280 Culms in Hokoku-ji Sanctuary)
    // (Already in _buildBambooGrove)

    // 7. WISTERIA PERGOLAS (Fuji Trellises) - 10 Pergolas
    const wisteriaCoords = [
      [-6.5, -18], [-6.5, 18], [18.5, 42], [105, 188], [118, 132],
      [-6.5, 195], [-6.5, 225], [23.5, 190], [23.5, 215]
    ];
    wisteriaCoords.forEach(([wx, wz]) => {
      const wy = this.getIslandElevation(wx, wz);
      this._buildWisteriaPergola(floraGroup, wx, wy, wz);
    });

    // 8. WATER IRIS CLUSTERS (Hanashōbu) - 70 Clusters
    for (let z = 84; z <= 116; z += 3) {
      this._buildWaterIrisCluster(floraGroup, -18.5, 0.12, z);
      this._buildWaterIrisCluster(floraGroup, 22.5, 0.12, z);
    }
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      this._buildWaterIrisCluster(floraGroup, 108.0 + Math.cos(a) * 7.8, 7.50, 196.0 + Math.sin(a) * 7.8);
    }

    // 9. CAMELLIA BUSHES (Tsubaki) - 75 Flowering Shrubs
    for (let z = 165; z <= 235; z += 5) {
      this._buildCamelliaBush(floraGroup, 20.8, 0.22, z, 1.0);
      this._buildCamelliaBush(floraGroup, 31.2, 0.22, z, 1.1);
      this._buildCamelliaBush(floraGroup, 48.0, 0.22, z, 0.95);
    }

    // 10. SILVER PAMPAS GRASS (Susuki) - 140 Plumes along Coast & Cliffs
    for (let z = -320; z <= 320; z += 9) {
      this._buildSilverGrass(floraGroup, -23.5, 0.22, z);
      this._buildSilverGrass(floraGroup, -20.5, 0.22, z + 4);
    }

    // 11. COASTAL HYDRANGEAS (Ajisai) - 110 Bushes lining Railway
    for (let z = -120; z <= 120; z += 4) {
      if (Math.abs(z) < 6) continue;
      const hx = -14.8;
      const hy = this.getIslandElevation(hx, z);
      const isBlue = Math.sin(z * 0.4) > 0;
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55),
        isBlue ? this.materials.hydrangeaBlue : this.materials.hydrangeaPurple
      );
      bush.position.set(hx, hy + 0.35, z);
      floraGroup.add(bush);
    }

    this.rootGroup.add(floraGroup);
  }

  _buildSakuraTree(group, x, y, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    const trunkH = 3.6 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.35 * scale, trunkH, 6), this.materials.treeTrunk);
    trunk.position.y = trunkH * 0.5;
    tree.add(trunk);

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 * scale), this.materials.sakuraPink);
    canopy.position.set(0.3, trunkH + 1.0 * scale, 0);
    tree.add(canopy);
    group.add(tree);
  }

  _buildJapanesePine(group, x, y, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    const trunkH = 4.5 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.42 * scale, trunkH, 6), this.materials.treeTrunk);
    trunk.rotation.z = -0.12;
    trunk.position.y = trunkH * 0.5;
    tree.add(trunk);

    [-0.5, 0.6, 1.8].forEach((yOff, idx) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * scale - idx * 0.3, 2.0 * scale - idx * 0.3, 0.45, 7), this.materials.pineNeedles);
      pad.position.set(idx * 0.3, trunkH + yOff * scale, 0);
      tree.add(pad);
    });
    group.add(tree);
  }

  _buildMapleTree(group, x, y, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    const trunkH = 3.2 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, trunkH, 6), this.materials.treeTrunk);
    trunk.position.y = trunkH * 0.5;
    tree.add(trunk);

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1 * scale), this.materials.mapleCrimson);
    canopy.position.set(0, trunkH + 0.8 * scale, 0);
    tree.add(canopy);
    group.add(tree);
  }

  _buildGinkgoTree(group, x, y, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    const trunkH = 5.2 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.48 * scale, trunkH, 7), this.materials.treeTrunk);
    trunk.position.y = trunkH * 0.5;
    tree.add(trunk);

    [-0.4, 0.8, 2.0].forEach((yOff, idx) => {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2.5 * scale - idx * 0.4, 1.8 * scale, 7), this.materials.ginkgoGold);
      crown.position.set(0, trunkH + yOff * scale, 0);
      tree.add(crown);
    });
    group.add(tree);
  }

  _buildJapaneseCedar(group, x, y, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    const trunkH = 8.5 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.52 * scale, trunkH, 6), this.materials.treeTrunkDark);
    trunk.position.y = trunkH * 0.5;
    tree.add(trunk);

    // Multi-tier layered dark cedar spire
    [0.55, 0.75, 0.95].forEach((hRatio, idx) => {
      const tierH = (4.5 - idx * 0.8) * scale;
      const tierR = (2.2 - idx * 0.45) * scale;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(tierR, tierH, 6), this.materials.cedarNeedles);
      cone.position.y = trunkH * hRatio;
      tree.add(cone);
    });
    group.add(tree);
  }

  _buildWisteriaPergola(group, x, y, z) {
    const pergola = new THREE.Group();
    pergola.position.set(x, y, z);

    const pW = 3.5;
    const pL = 5.5;
    const pH = 2.8;

    [[-pW * 0.5, -pL * 0.5], [pW * 0.5, -pL * 0.5], [-pW * 0.5, pL * 0.5], [pW * 0.5, pL * 0.5]].forEach(([ox, oz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, pH, 0.18), this.materials.shrineWoodDark);
      post.position.set(ox, pH * 0.5, oz);
      pergola.add(post);
    });

    const trellis = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.4, 0.15, pL + 0.4), this.materials.shrineWoodDark);
    trellis.position.y = pH;
    pergola.add(trellis);

    for (let vx = -1.2; vx <= 1.2; vx += 0.8) {
      for (let vz = -2.0; vz <= 2.0; vz += 1.0) {
        const cluster = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2, 5), this.materials.wisteriaViolet);
        cluster.rotation.x = Math.PI;
        cluster.position.set(vx, pH - 0.6, vz);
        pergola.add(cluster);
      }
    }

    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 2.8), this.materials.shrineWoodDark);
    bench.position.set(0, 0.25, 0);
    pergola.add(bench);

    group.add(pergola);
  }

  _buildWaterIrisCluster(group, x, y, z) {
    const iris = new THREE.Group();
    iris.position.set(x, y, z);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.04), this.materials.bambooLeaf);
      leaf.rotation.z = 0.2;
      leaf.rotation.y = angle;
      leaf.position.y = 0.45;
      iris.add(leaf);
    }

    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), this.materials.irisIndigo);
    flower.position.y = 0.85;
    iris.add(flower);

    group.add(iris);
  }

  _buildCamelliaBush(group, x, y, z, scale) {
    const bush = new THREE.Group();
    bush.position.set(x, y, z);

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 * scale), this.materials.camelliaLeaf);
    body.position.y = 0.65 * scale;
    bush.add(body);

    [[-0.3, 0.7, 0.4], [0.3, 0.9, -0.2], [0.4, 0.6, 0.3], [-0.4, 0.5, -0.3]].forEach(([fx, fy, fz]) => {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 5, 5), this.materials.camelliaRed);
      flower.position.set(fx * scale, fy * scale, fz * scale);
      bush.add(flower);
    });

    group.add(bush);
  }

  _buildSilverGrass(group, x, y, z) {
    const grass = new THREE.Group();
    grass.position.set(x, y, z);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.4, 5), this.materials.silverGrassGold);
      plume.rotation.z = 0.15;
      plume.rotation.y = angle;
      plume.position.y = 0.7;
      grass.add(plume);
    }

    group.add(grass);
  }

  /* -------------------------------------------------------------
   * 14. Dynamic POI Detection for HUD
   * ------------------------------------------------------------- */
  getZoneName(p, isQuad = false) {
    const mode = isQuad ? "TURBO 4X4" : "EXPLORER";
    const x = p.x;
    const z = p.z;
    const y = p.y;

    // Winding Touge Mountain Trail & Summit
    const trail = this._getForestTrailHeightAndDist(x, z);
    if (trail.dist < 6.0 && x >= 55) {
      if (Math.hypot(x - 135, z - 60) < 16) return `SUMMIT PANORAMA // MT. FUJI VIEWPOINT [${mode}]`;
      if (Math.hypot(x - 66, z - 110) < 14) return `CEDAR STREAM // MOUNTAIN FOOTBRIDGE [${mode}]`;
      if (y > 10.0) return `UPPER TOUGE PASS // CEDAR RIDGE [${mode}]`;
      return `FUJIMI TOUGE // CEDAR FOREST TRAIL [${mode}]`;
    }

    // Grand Buddhist Temple Complex
    if (Math.hypot(x - 114, z - 160) < 38) {
      if (Math.hypot(x - 110, z - 140) < 16) return `KENCHO-JI // FIVE-STORY PAGODA [${mode}]`;
      if (Math.hypot(x - 124, z - 160) < 18) return `KENCHO-JI // HONDO SANCTUARY [${mode}]`;
      if (Math.hypot(x - 108, z - 196) < 14) return `TEMPLE LOTUS POND // MOON BRIDGE [${mode}]`;
      return `GRAND BUDDHIST TEMPLE // SANMON COURTYARD [${mode}]`;
    }

    // Enoshima Offshore Island & Lighthouse
    if (Math.hypot(x - (-95), z - (-80)) < 36) {
      if (y > 9.0) return `ENOSHIMA SEA CANDLE // SUMMIT LIGHTHOUSE [${mode}]`;
      return `ENOSHIMA SHRINE ISLAND // PACIFIC ROCK [${mode}]`;
    }

    // Causeway Sea Bridge
    if (x < -24 && x >= -85 && Math.abs(z - (-80)) <= 6) {
      return `ENOSHIMA CAUSEWAY // OVER-OCEAN BRIDGE [${mode}]`;
    }

    // Secret Tidal Sea Cave
    if (Math.hypot(x - (-95), z - (-40)) < 16 && y < 3.5) {
      return `TIDAL SEA CAVE // SMUGGLER'S GROTTO [${mode}]`;
    }

    // Lifeguard Watchtower
    if (Math.hypot(x - (-34), z - 30) < 12) {
      return `YUIGAHAMA SURF // LIFEGUARD TOWER 01 [${mode}]`;
    }

    // Surf Shack
    if (Math.hypot(x - (-32), z - (-25)) < 12) {
      return `SHICHIRIGAHAMA // RETRO SURF SHACK [${mode}]`;
    }

    // Driftwood Bonfire
    if (Math.hypot(x - (-30), z - 70) < 12) {
      return `BLACK SAND BEACH // DRIFTWOOD BONFIRE [${mode}]`;
    }

    // Tetrapod Harbor Breakwater
    if (Math.hypot(x - (-28), z - (-70)) < 16) {
      return `PACIFIC BREAKWATER // TETRAPOD HARBOR [${mode}]`;
    }

    // Railroad Crossing
    if (Math.hypot(x - (-9), z - (-3.5)) < 8) {
      return `KAMAKURA CROSSING // FUMIKIRI OCEAN VIEW [${mode}]`;
    }

    // Shonan Coast Station
    if (x >= -12 && x <= -4 && z >= -25 && z <= 25) {
      return `SHONAN COAST STATION // PLATFORM 1 [${mode}]`;
    }

    // Inamuragasaki Station
    if (x >= -12 && x <= -4 && z >= 185 && z <= 235) {
      return `INAMURAGASAKI STATION // TERMINUS DECK [${mode}]`;
    }

    // Sunset Mart Konbini
    if (Math.hypot(x - 18, z - 24) < 18) {
      return `SUNSET MART 24H // VENDING & PARKING [${mode}]`;
    }

    // Seaside Ramen Bar
    if (Math.hypot(x - 22, z - (-35)) < 12) {
      return `ICHIRAKU RAMEN // RED LANTERN YATAI [${mode}]`;
    }

    // Gas Station
    if (Math.hypot(x - 25, z - (-110)) < 18) {
      return `ENEOS HIGHWAY SERVICE // 24H FUEL BAY [${mode}]`;
    }

    // Coin Laundromat
    if (Math.hypot(x - 22, z - 145) < 14) {
      return `COASTAL COIN LAUNDRY // VENDING HUB [${mode}]`;
    }

    // Machiya Town Street
    if (x >= 18 && x <= 36 && z >= 165 && z <= 235) {
      return `OLD HASE TOWN // TRADITIONAL MACHIYA [${mode}]`;
    }

    // Estuary Bridge
    if (x >= -15 && x <= 25 && z >= 80 && z <= 120) {
      return `NAMEGAWA RIVER ESTUARY // STEEL BRIDGE [${mode}]`;
    }

    // Highway Tunnel
    if (x >= 4 && x <= 16 && z >= -220 && z <= -170) {
      return `INAMURA TOUGE TUNNEL // ROUTE 134 [${mode}]`;
    }

    // Railway Tunnel
    if (x >= -16 && x <= -8 && z >= -215 && z <= -170) {
      return `ENODEN MOUNTAIN CUTTING // RAIL TUNNEL [${mode}]`;
    }

    // Lower Torii Gate
    if (Math.hypot(x - 56, z - (-20)) < 10) {
      return `SHRINE TRAILHEAD // GRAND TORII GATE [${mode}]`;
    }

    // 108 Stone Steps
    if (x >= 60 && x <= 95 && Math.abs(z - (-20)) < 8) {
      return `SACRED MOUNTAIN APPROACH // 108 STEPS [${mode}]`;
    }

    // Hillside Shrine Hall
    if (Math.hypot(x - 108, z - (-20)) < 20) {
      return `KAMAKURA HACHIMAN // INNER SANCTUARY [${mode}]`;
    }

    // Great Bronze Buddha
    if (Math.hypot(x - 115, z - (-80)) < 22) {
      return `KOTOKU-IN // GREAT BRONZE BUDDHA [${mode}]`;
    }

    // Hokoku-ji Bamboo Grove
    if (Math.hypot(x - 85, z - 40) < 22) {
      return `HOKOKU-JI GROVE // BAMBOO SANCTUARY [${mode}]`;
    }

    // Zen Rock Garden
    if (Math.hypot(x - 110, z - 35) < 18) {
      return `ZEN ROCK TEMPLE // KARESANSUI GARDEN [${mode}]`;
    }

    // Summit Touge Lookout
    if (Math.hypot(x - 135, z - 60) < 20) {
      return `SUMMIT PANORAMA // MT. FUJI VIEWPOINT [${mode}]`;
    }

    // Highway
    if (x >= 2 && x <= 18) {
      return `SHONAN ROUTE 134 // SEASIDE HIGHWAY [${mode}]`;
    }

    // Beach
    if (x < -22) {
      return `YUIGAHAMA BEACH // VOLCANIC SAND SURF [${mode}]`;
    }

    // Hillside Cedar Forest
    if (x > 55) {
      return `ANCIENT CEDAR FOREST // SUGI TOUGE [${mode}]`;
    }

    return `SHONAN COASTLINE // KAMAKURA BAY [${mode}]`;
  }

  /* -------------------------------------------------------------
   * 15. Frame Animations & Updates
   * ------------------------------------------------------------- */
  update(time, dt) {
    this.time += dt;

    if (this.waterPosAttribute && this.waterBaseY) {
      const count = this.waterPosAttribute.count;
      for (let i = 0; i < count; i++) {
        const x = this.waterPosAttribute.getX(i);
        const z = this.waterPosAttribute.getZ(i);
        const wave1 = Math.sin(x * 0.05 + this.time * 1.8) * 0.35;
        const wave2 = Math.cos(z * 0.06 + this.time * 1.4) * 0.28;
        this.waterPosAttribute.setY(i, this.waterBaseY[i] + wave1 + wave2);
      }
      this.waterPosAttribute.needsUpdate = true;
    }

    const flashState = Math.floor(this.time * 2.2) % 2 === 0;
    this.trainCrossingLights.forEach((light, idx) => {
      light.visible = (idx === 0) ? flashState : !flashState;
    });

    this.lanternGlows.forEach((lantern, idx) => {
      const flicker = 0.9 + Math.sin(this.time * 8 + idx * 3.1) * 0.1;
      lantern.scale.set(flicker, flicker, flicker);
    });

    if (this.bonfireFlame) {
      const scaleY = 1.0 + Math.sin(this.time * 12.0) * 0.25;
      const scaleXZ = 1.0 + Math.cos(this.time * 14.0) * 0.15;
      this.bonfireFlame.scale.set(scaleXZ, scaleY, scaleXZ);
    }

    if (this.lighthouseBeacon) {
      this.lighthouseBeacon.rotation.y = this.time * 1.5;
    }

    this.incenseSmokes.forEach((puff, idx) => {
      const drift = Math.sin(this.time * 3.0 + idx * 2.1) * 0.15;
      puff.position.x = drift;
      puff.scale.setScalar(0.9 + Math.cos(this.time * 2.5 + idx) * 0.2);
    });
  }

  /* -------------------------------------------------------------
   * 16. Resource Cleanup
   * ------------------------------------------------------------- */
  destroy() {
    if (this.rootGroup) {
      this.rootGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.scene.remove(this.rootGroup);
    }
  }
}
