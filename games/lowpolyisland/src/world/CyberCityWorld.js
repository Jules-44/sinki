import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld.js';

/**
 * CyberCityWorld — Level 2: Synthwave Metropolis // Sprawling Multi-Block Grid, Open Skyway & Rich Facades
 *
 * Features:
 * - Sprawling 840m x 840m metropolis grid with 7 North-South Avenues and 7 East-West Streets
 * - DEDICATED 64-METER OPEN SKYWAY CORRIDOR (X = -132 to -68): Zero buildings in the corridor!
 * - Extended 820m Elevated Skyway Expressway (Y = 9.5m, deck Z: -330 to 330, ramps to -410 and 410)
 * - 7 Drivable Entry & Exit Ramps across the city:
 *   1. South Terminal On-Ramp (Z: -410 to -330)
 *   2. North Terminal Off-Ramp (Z: 330 to 410)
 *   3. Central Broadway On-Ramp (Z: -75 to -18, directly enters from Central Broadway!)
 *   4. Central Broadway Off-Ramp (Z: 18 to 75, directly exits into Central Broadway!)
 *   5. South District On-Ramp (Z: -230 to -165)
 *   6. North District Off-Ramp (Z: 165 to 230)
 *   7. West Connector Flyover On-Ramp (X: -165 to -105 at Z = 0)
 *   All ramps feature illuminated portal signs and exact mathematical elevation physics!
 * - Rich, highly detailed building fronts on ALL towers:
 *   - Double-height glass lobby entrances with warm interior reception desks
 *   - Cantilevered architectural canopies with glowing neon edge trims and recessed LED downlights
 *   - Extruded illuminated corporate tenant logos and signs
 *   - Ground-floor display boutique windows with retail awnings
 *   - Classic cyberpunk vertical projecting neon blade signs (Japanese & English text)
 *   - Exterior AC condenser units mounted on window ledges
 *   - Vertical neon accent light fins running up building facades
 *   - Concrete entrance planter boxes and curb security bollards
 * - 6 distinct architectural building archetypes:
 *   1. Art-Deco Stepped Skyscraper (3 tiers of setbacks, art-deco spire, glowing crowns)
 *   2. Cylindrical / Faceted Octagonal Glass Cyber Tower (8-sided tower, banded glass, halo crown)
 *   3. Angled / Slanted Prism Tower (high-tech geometric monolith with 45-degree sloping roof)
 *   4. Twin Towers with High-Altitude Skybridge (two 82m towers joined by glowing pedestrian bridge at 46m)
 *   5. Mid-Rise Commercial Complex (rooftop AC chillers, water towers, satellite dishes, giant neon billboard)
 *   6. Slender Pencil Tower with Architectural Fins (slender high-rise with vertical neon edge fins)
 * - Ground-level storefronts: Neo Ramen Bar, Cyber Arcade 1999, Synthwave Cafe, 160 BPM Vinyl Records, Tokyo Mart 24/7, Nightclub MATRIX
 * - Full urban street furniture: streetlamps every 32m, traffic light gantries at intersections, bus stops, vending machines, newsstands, bins, hydrants
 * - Authentic road paint: double-yellow centerlines, dashed lane dividers, zebra crosswalks, stop lines, speed markings
 * - 18 animated flying hovercars in sky corridors
 * - ZERO snow particles — 100% pure synthwave dusk aesthetic!
 */
export class CyberCityWorld {
  constructor(scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.time = 0;
    this.collisionWorld = new CollisionWorld();

    // Level metadata
    this.id = 'cybercity';
    this.name = 'NEON METROPOLIS // MULTI-BLOCK EXPENSE';
    this.skyTheme = 'CYBER_MIDNIGHT';
    this.hasOcean = false;
    this.playerSpawn = { x: 0, y: 0.22, z: 6, rotY: 0 };
    this.quadSpawn = { x: 4.5, y: 0.2, z: 4, rotY: 0 };
    this.defaultTrackIndex = 3; // CYBER ROOFTOPS (TECHSTEP VIP)

    // Animated entities
    this.flyingCars = [];
    this.neonSigns = [];
    this.trafficLights = [];
    this.beaconLights = [];
    this.ramps = [];

    // Highway configuration
    this.highwayX = -100.0;
    this.highwayW = 12.0;
    this.highwayY = 9.5;
    this.highwayL = 660.0; // Main elevated deck from Z = -330 to Z = 330

    // City grid definitions
    this._initGridCoordinates();

    // Build the synthwave metropolis
    this._buildMaterials();
    this._buildRoadGridAndGround();
    this._buildElevatedHighway();
    this._buildCityBlocksAndBuildings();
    this._buildShopfronts();
    this._buildStreetFurniture();
    this._buildAnimatedFlyingTraffic();
  }

  _initGridCoordinates() {
    this.avenueX = [-300, -200, -100, 0, 100, 200, 300];
    this.streetZ = [-300, -200, -100, 0, 100, 200, 300];

    // Define city blocks boundaries: [minX, maxX, minZ, maxZ]
    // The Highway corridor is at X = -100: the zone from X = -132 to X = -68 is 100% OPEN SKY!
    // NO BUILDINGS EVER SPAWN IN [X: -132 to -68]!
    this.blocks = [];

    const xIntervals = [
      { min: -380, max: -320 }, // Col 0: Far West
      { min: -280, max: -220 }, // Col 1: West Mid
      { min: -180, max: -132 }, // Col 2: West of Highway (buffer of 32m to highway)
      // Highway Corridor [-132, -68] has NO BUILDINGS!
      { min: -68, max: -20 },   // Col 3: East of Highway / West of Grand Blvd
      { min: 20, max: 80 },     // Col 4: Central East (Ramen / Arcade / Mart)
      { min: 120, max: 180 },   // Col 5: East Mid
      { min: 220, max: 280 },   // Col 6: East Outer
      { min: 320, max: 380 }    // Col 7: Far East
    ];

    const zIntervals = [
      { min: -380, max: -320 }, // Row 0: South Outer
      { min: -280, max: -220 }, // Row 1: South Mid
      { min: -180, max: -120 }, // Row 2: South Central
      { min: -80, max: -18 },   // Row 3: Broadway South
      { min: 18, max: 80 },     // Row 4: Broadway North
      { min: 120, max: 180 },   // Row 5: North Central
      { min: 220, max: 280 },   // Row 6: North Mid
      { min: 320, max: 380 }    // Row 7: North Outer
    ];

    for (let xi = 0; xi < xIntervals.length; xi++) {
      for (let zi = 0; zi < zIntervals.length; zi++) {
        this.blocks.push({
          minX: xIntervals[xi].min,
          maxX: xIntervals[xi].max,
          minZ: zIntervals[zi].min,
          maxZ: zIntervals[zi].max,
          col: xi,
          row: zi
        });
      }
    }
  }

  _buildMaterials() {
    // Road asphalt — rich visible charcoal dusk asphalt
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x242736,
      roughness: 0.8,
      metalness: 0.12,
      flatShading: true
    });

    // Sidewalk concrete — urban twilight pavement
    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x42485c,
      roughness: 0.7,
      metalness: 0.15,
      flatShading: true
    });

    // Architectural Dusk Building Materials (distinct hues, visible form)
    this.buildingMatDark = new THREE.MeshStandardMaterial({
      color: 0x2c3247, // Deep architectural slate
      roughness: 0.75,
      metalness: 0.22,
      flatShading: true
    });

    this.buildingMatMid = new THREE.MeshStandardMaterial({
      color: 0x383f59, // Steel-blue commercial tower
      roughness: 0.7,
      metalness: 0.28,
      flatShading: true
    });

    this.buildingMatNavy = new THREE.MeshStandardMaterial({
      color: 0x323a52, // Cool twilight concrete
      roughness: 0.72,
      metalness: 0.25,
      flatShading: true
    });

    this.buildingMatWarm = new THREE.MeshStandardMaterial({
      color: 0x4a3c48, // Warm dusk terracotta masonry
      roughness: 0.75,
      metalness: 0.2,
      flatShading: true
    });

    this.buildingMatTeal = new THREE.MeshStandardMaterial({
      color: 0x223c4a, // Teal cyber corporate tower
      roughness: 0.65,
      metalness: 0.35,
      flatShading: true
    });

    this.buildingMatBronze = new THREE.MeshStandardMaterial({
      color: 0x4d382c, // Bronze / copper finish
      roughness: 0.6,
      metalness: 0.45,
      flatShading: true
    });

    // Steel and chrome
    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0x6a7591,
      roughness: 0.35,
      metalness: 0.85,
      flatShading: true
    });

    // Glass
    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.65,
      flatShading: true
    });

    // Fabric awning materials for retail shops
    this.awningBurgundyMat = new THREE.MeshStandardMaterial({ color: 0x8a2334, roughness: 0.7, flatShading: true });
    this.awningGreenMat = new THREE.MeshStandardMaterial({ color: 0x1f543c, roughness: 0.7, flatShading: true });
    this.awningNavyMat = new THREE.MeshStandardMaterial({ color: 0x24355a, roughness: 0.7, flatShading: true });

    // Synthwave Glowing Neon Materials
    this.neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    this.neonAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.neonYellowMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    this.neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    this.neonRedMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });
    this.neonVioletMat = new THREE.MeshBasicMaterial({ color: 0xb537f2 });
    this.windowLitMat = new THREE.MeshBasicMaterial({ color: 0xffd175 }); // Warm golden glow
    this.windowCyanMat = new THREE.MeshBasicMaterial({ color: 0x4df2ff }); // Cyan office glow
    this.windowVioletMat = new THREE.MeshBasicMaterial({ color: 0xd957ff }); // Violet glow
  }

  _buildRoadGridAndGround() {
    this.groundGroup = new THREE.Group();

    // Sprawling dark road plane (860m x 860m) at Y = 0
    const groundGeo = new THREE.PlaneGeometry(880, 880);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeo, this.asphaltMat);
    groundMesh.receiveShadow = true;
    this.groundGroup.add(groundMesh);

    // Road Markings Group
    const markingsGroup = new THREE.Group();
    markingsGroup.position.y = 0.02;

    // A. Main North-South Grand Boulevard (X = 0, Width = 28m, Z: -420 to 420)
    const yLineGeo = new THREE.PlaneGeometry(0.35, 840);
    yLineGeo.rotateX(-Math.PI / 2);
    const yLine1 = new THREE.Mesh(yLineGeo, this.neonYellowMat);
    yLine1.position.set(-0.35, 0, 0);
    const yLine2 = new THREE.Mesh(yLineGeo, this.neonYellowMat);
    yLine2.position.set(0.35, 0, 0);
    markingsGroup.add(yLine1, yLine2);

    // Dashed lane dividers for Grand Boulevard
    const dashLength = 4.8;
    const dashGap = 5.2;
    const totalDashes = Math.floor(840 / (dashLength + dashGap));
    for (let i = 0; i < totalDashes; i++) {
      const dz = -420 + i * (dashLength + dashGap) + dashLength / 2;
      if (Math.abs(dz) < 18 || Math.abs(dz - 100) < 18 || Math.abs(dz + 100) < 18 ||
          Math.abs(dz - 200) < 18 || Math.abs(dz + 200) < 18 || Math.abs(dz - 300) < 18 || Math.abs(dz + 300) < 18) {
        continue;
      }
      [-6.5, 6.5].forEach((lx) => {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, dashLength), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        dash.rotateX(-Math.PI / 2);
        dash.position.set(lx, 0, dz);
        markingsGroup.add(dash);
      });
    }

    // B. Other North-South Avenues
    [-300, -200, -100, 100, 200, 300].forEach((ax) => {
      const aveLineGeo = new THREE.PlaneGeometry(0.3, 840);
      aveLineGeo.rotateX(-Math.PI / 2);
      const aveLine = new THREE.Mesh(aveLineGeo, this.neonYellowMat);
      aveLine.position.set(ax, 0, 0);
      markingsGroup.add(aveLine);
    });

    // C. East-West Avenues & Streets
    [-300, -200, -100, 0, 100, 200, 300].forEach((cz) => {
      const xLineGeo = new THREE.PlaneGeometry(840, 0.35);
      xLineGeo.rotateX(-Math.PI / 2);
      const xLine = new THREE.Mesh(xLineGeo, this.neonYellowMat);
      xLine.position.set(0, 0, cz);
      markingsGroup.add(xLine);

      // Zebra Crossings at all major intersections
      [-300, -200, -100, 0, 100, 200, 300].forEach((ix) => {
        [-12, 12].forEach((offsetZ) => {
          for (let s = -6.0; s <= 6.0; s += 1.4) {
            const zStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.4), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
            zStripe.rotateX(-Math.PI / 2);
            zStripe.position.set(ix + s, 0, cz + offsetZ);
            markingsGroup.add(zStripe);
          }
        });
      });
    });

    // D. Speed markings on asphalt
    const speedMarks = [
      { text: "TURBO 4X4", x: 5.5, z: 24, w: 4.8, h: 1.3 },
      { text: "164 BPM", x: -5.5, z: -24, w: 3.8, h: 1.3 },
      { text: "SKYWAY 101", x: -95.0, z: 20, w: 4.5, h: 1.3 },
      { text: "METRO GRID", x: 104.5, z: 20, w: 4.5, h: 1.3 }
    ];
    speedMarks.forEach((sm) => {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(sm.w, sm.h), this.neonCyanMat);
      stripe.rotateX(-Math.PI / 2);
      stripe.position.set(sm.x, 0, sm.z);
      markingsGroup.add(stripe);
    });

    this.groundGroup.add(markingsGroup);
    this.rootGroup.add(this.groundGroup);
  }

  _buildElevatedHighway() {
    this.highwayGroup = new THREE.Group();

    // Extended Elevated Skyway Expressway:
    // Placed at X = -100.0, running from Z = -330 to Z = 330 (660m main elevated deck, Y = 9.5m, Width = 12.0m).
    // Flanked by terminal on-ramps to Z = -410 and off-ramps to Z = 410 (total 820m continuous highway).
    const hwW = this.highwayW;
    const hwL = this.highwayL;
    const hwY = this.highwayY;
    const hwX = this.highwayX;

    // Main elevated road deck
    const deckGeo = new THREE.BoxGeometry(hwW, 1.0, hwL);
    const deckMesh = new THREE.Mesh(deckGeo, this.asphaltMat);
    deckMesh.position.set(hwX, hwY, 0);
    deckMesh.receiveShadow = true;
    this.highwayGroup.add(deckMesh);

    // Glowing road paint on highway
    const hwLineGeo = new THREE.PlaneGeometry(0.45, hwL * 0.98);
    hwLineGeo.rotateX(-Math.PI / 2);
    const hwLine = new THREE.Mesh(hwLineGeo, this.neonAmberMat);
    hwLine.position.set(hwX, hwY + 0.51, 0);
    this.highwayGroup.add(hwLine);

    // Guardrail barriers with glowing neon edge rails
    const railH = 1.25;
    [-hwW / 2 + 0.35, hwW / 2 - 0.35].forEach((rx) => {
      const railGeo = new THREE.BoxGeometry(0.45, railH, hwL);
      const railMesh = new THREE.Mesh(railGeo, this.steelMat);
      railMesh.position.set(hwX + rx, hwY + railH / 2 + 0.5, 0);
      this.highwayGroup.add(railMesh);

      const tubeGeo = new THREE.CylinderGeometry(0.09, 0.09, hwL, 6);
      tubeGeo.rotateX(Math.PI / 2);
      const tubeMesh = new THREE.Mesh(tubeGeo, this.neonPinkMat);
      tubeMesh.position.set(hwX + rx, hwY + railH + 0.5, 0);
      this.highwayGroup.add(tubeMesh);
    });

    // Concrete Support Pillars
    // Spaced along Z avoiding all cross streets (cz in [-300, -200, -100, 0, 100, 200, 300])
    const crossStreets = [-300, -200, -100, 0, 100, 200, 300];
    for (let pz = -310; pz <= 310; pz += 25) {
      const nearCross = crossStreets.some(cz => Math.abs(pz - cz) < 16);
      if (nearCross) continue;

      // Pair of pillars on outer edges of the highway corridor (leaving the roadway underneath 100% open!)
      [-hwW / 2 + 0.9, hwW / 2 - 0.9].forEach((colOffset) => {
        const px = hwX + colOffset;
        const colGeo = new THREE.BoxGeometry(1.6, hwY, 1.6);
        const colMesh = new THREE.Mesh(colGeo, this.steelMat);
        colMesh.position.set(px, hwY / 2, pz);
        colMesh.castShadow = true;
        this.highwayGroup.add(colMesh);

        // Neon underglow ring
        const ring = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 1.8), this.neonCyanMat);
        ring.position.set(px, hwY - 0.7, pz);
        this.highwayGroup.add(ring);

        this.collisionWorld.addBox(px - 0.85, px + 0.85, pz - 0.85, pz + 0.85, 0, hwY, false, 'highway_pillar');
      });
    }

    // Register highway surface collider: minY is 8.5m so cars and players pass under at street level (Y=0 to 1.8) with zero collision!
    this.collisionWorld.addBox(hwX - hwW / 2, hwX + hwW / 2, -hwL / 2, hwL / 2, 8.5, 10.0, true, 'elevated_highway');

    // -------------------------------------------------------------------------------------
    // 7 DRIVABLE ON-RAMPS & OFF-RAMPS (Terminal ramps + Mid-city entry/exit ramps)
    // -------------------------------------------------------------------------------------
    this.ramps = [];

    // 1. South Terminal On-Ramp: slopes from ground at Z = -410 (Y=0) up to Z = -330 (Y=9.5)
    this._createHighwayRamp(hwX, -410, 0, hwX, -330, hwY, hwW, 'south_terminal_ramp', 'HIGHWAY 101 // SOUTH TERMINAL ENTRANCE');

    // 2. North Terminal Off-Ramp: slopes from Z = 330 (Y=9.5) down to ground at Z = 410 (Y=0)
    this._createHighwayRamp(hwX, 330, hwY, hwX, 410, 0, hwW, 'north_terminal_ramp', 'HIGHWAY 101 // NORTH TERMINAL EXIT');

    // 3. Central Broadway On-Ramp (Direct highway access from Central Broadway!)
    // Starts at ground near X = -75, Z = -75, climbs smoothly up to merge into the Skyway at X = -97, Z = -18
    this._createHighwayRamp(-75, -75, 0, -97, -18, hwY, 6.5, 'broadway_onramp', 'RAMP TO HIGHWAY 101 // BROADWAY ENTRANCE');

    // 4. Central Broadway Off-Ramp (Direct highway exit into Central Broadway!)
    // Departs Skyway at X = -97, Z = 18, slopes down to ground at X = -75, Z = 75
    this._createHighwayRamp(-97, 18, hwY, -75, 75, 0, 6.5, 'broadway_offramp', 'EXIT 1: BROADWAY & ENTERTAINMENT ROW');

    // 5. South District On-Ramp (Direct highway entry from South District!)
    // Starts at ground near X = -124, Z = -230, climbs to merge at X = -103, Z = -165
    this._createHighwayRamp(-124, -230, 0, -103, -165, hwY, 6.5, 'south_district_onramp', 'RAMP TO HIGHWAY 101 // SOUTH SECTOR');

    // 6. North District Off-Ramp (Direct highway exit into North District!)
    // Departs Skyway at X = -103, Z = 165, slopes down to ground at X = -124, Z = 230
    this._createHighwayRamp(-103, 165, hwY, -124, 230, 0, 6.5, 'north_district_offramp', 'EXIT 2: NORTH TECH SECTOR');

    // 7. West Connector Flyover On-Ramp (Direct flyover climbing from West Avenue onto the highway!)
    // Starts at ground near X = -165, Z = -4, climbs up to merge at X = -105, Z = -4
    this._createHighwayRamp(-165, -4, 0, -105, -4, hwY, 6.5, 'west_flyover_onramp', 'WEST CONNECTOR // FLYOVER RAMP');

    // Overhead highway matrix gantry signs
    [-200, -80, 0, 80, 200].forEach((gz) => {
      const gantry = new THREE.Group();
      gantry.position.set(hwX, hwY + 0.5, gz);

      [-hwW / 2 + 0.35, hwW / 2 - 0.35].forEach((gx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.4, 6), this.steelMat);
        post.position.set(gx, 2.2, 0);
        gantry.add(post);
      });

      const beam = new THREE.Mesh(new THREE.BoxGeometry(hwW, 0.38, 0.38), this.steelMat);
      beam.position.y = 4.4;
      gantry.add(beam);

      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.5, 0.25), this.buildingMatDark);
      signBoard.position.set(0, 3.5, 0);
      gantry.add(signBoard);

      const signFace = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.2), this.neonCyanMat);
      signFace.position.set(0, 3.5, 0.14);
      gantry.add(signFace);

      this.highwayGroup.add(gantry);
    });

    this.rootGroup.add(this.highwayGroup);
  }

  _createHighwayRamp(x1, z1, y1, x2, z2, y2, width, tag, portalText = null) {
    // Store ramp definition for exact mathematical elevation queries in getIslandElevation
    this.ramps.push({ x1, z1, y1, x2, z2, y2, width, tag });

    const rampGroup = new THREE.Group();
    const length = Math.hypot(x2 - x1, z2 - z1);
    const heightDiff = y2 - y1;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midZ = (z1 + z2) / 2;

    const anglePitch = Math.atan2(heightDiff, length);
    const angleYaw = Math.atan2(x2 - x1, z2 - z1);

    const rampGeo = new THREE.BoxGeometry(width, 0.9, length);
    const rampMesh = new THREE.Mesh(rampGeo, this.asphaltMat);
    rampMesh.receiveShadow = true;

    rampGroup.position.set(midX, midY, midZ);
    rampGroup.rotation.y = angleYaw;
    rampGroup.rotation.x = -anglePitch;
    rampGroup.add(rampMesh);

    // Glowing center yellow stripe on ramp
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.35, length * 0.98), this.neonYellowMat);
    stripe.rotateX(-Math.PI / 2);
    stripe.position.y = 0.46;
    rampGroup.add(stripe);

    // Glowing side guardrails
    [-width / 2 + 0.35, width / 2 - 0.35].forEach((rx) => {
      const railGeo = new THREE.BoxGeometry(0.4, 1.1, length);
      const railMesh = new THREE.Mesh(railGeo, this.steelMat);
      railMesh.position.set(rx, 0.9, 0);
      rampGroup.add(railMesh);

      const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, length, 6);
      tubeGeo.rotateX(Math.PI / 2);
      const tubeMesh = new THREE.Mesh(tubeGeo, this.neonPinkMat);
      tubeMesh.position.set(rx, 1.45, 0);
      rampGroup.add(tubeMesh);
    });

    // Support trestles under elevated portions of ramps
    const trestleCount = Math.max(1, Math.floor(length / 22));
    for (let t = 1; t < trestleCount; t++) {
      const frac = t / trestleCount;
      const trestleY = y1 + frac * (y2 - y1);
      if (trestleY > 2.0) {
        const tz = -length / 2 + frac * length;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, trestleY, 1.4), this.steelMat);
        pier.position.set(0, -trestleY / 2, tz);
        rampGroup.add(pier);
      }
    }

    // Illuminated entrance/exit portal sign at ramp threshold
    if (portalText) {
      const portal = new THREE.Group();
      const pX = y1 < y2 ? x1 : x2;
      const pZ = y1 < y2 ? z1 : z2;
      const pY = y1 < y2 ? y1 : y2;
      portal.position.set(pX, pY + 0.1, pZ);

      // Support posts
      [-width / 2 + 0.2, width / 2 - 0.2].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 6), this.steelMat);
        post.position.set(px, 2.1, 0);
        portal.add(post);
      });

      // Overhead beam
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.35, 0.35), this.steelMat);
      beam.position.y = 4.2;
      portal.add(beam);

      // Glowing sign panel (Green for on-ramps, Amber for off-ramps)
      const isEntrance = y1 < y2;
      const signMat = isEntrance ? this.neonGreenMat : this.neonAmberMat;
      const sign = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 1.1, 0.2), signMat);
      sign.position.set(0, 3.4, 0);
      portal.add(sign);

      this.highwayGroup.add(portal);
    }

    this.highwayGroup.add(rampGroup);
  }

  _buildCityBlocksAndBuildings() {
    this.buildingsGroup = new THREE.Group();

    this.blocks.forEach((blk, bIdx) => {
      const bW = blk.maxX - blk.minX;
      const bD = blk.maxZ - blk.minZ;
      const cX = (blk.minX + blk.maxX) / 2;
      const cZ = (blk.minZ + blk.maxZ) / 2;

      const walkGeo = new THREE.BoxGeometry(bW, 0.22, bD);
      const walkMesh = new THREE.Mesh(walkGeo, this.sidewalkMat);
      walkMesh.position.set(cX, 0.11, cZ);
      walkMesh.receiveShadow = true;
      this.buildingsGroup.add(walkMesh);

      this.collisionWorld.addBox(blk.minX, blk.maxX, blk.minZ, blk.maxZ, 0, 0.22, true, 'sidewalk');

      this._populateBlockWithBuildings(blk, bIdx);
    });

    // Landmark: Iconic Cyber Twin Towers with high-altitude Skybridge (at Col 4, Row 5: X: 50, Z: 150)
    this._createTwinTowers(50, 150);

    this.rootGroup.add(this.buildingsGroup);
  }

  _populateBlockWithBuildings(blk, bIdx) {
    const bW = blk.maxX - blk.minX;
    const bD = blk.maxZ - blk.minZ;

    const numX = Math.max(1, Math.floor(bW / 26));
    const numZ = Math.max(1, Math.floor(bD / 26));

    const stepX = bW / numX;
    const stepZ = bD / numZ;

    for (let ix = 0; ix < numX; ix++) {
      for (let iz = 0; iz < numZ; iz++) {
        // Skip storefront locations in central blocks
        if (blk.col === 4 && blk.row === 4 && ix === 0) continue; // Ramen & Arcade
        if (blk.col === 3 && blk.row === 4 && ix === numX - 1) continue; // Cafe & Vinyl
        if (blk.col === 4 && blk.row === 3 && ix === 0 && iz === numZ - 1) continue; // Tokyo Mart & Club
        if (blk.col === 4 && blk.row === 5) continue; // Twin Towers

        const padding = 3.2;
        const bMinX = blk.minX + ix * stepX + padding;
        const bMaxX = blk.minX + (ix + 1) * stepX - padding;
        const bMinZ = blk.minZ + iz * stepZ + padding;
        const bMaxZ = blk.minZ + (iz + 1) * stepZ - padding;

        const w = bMaxX - bMinX;
        const d = bMaxZ - bMinZ;
        if (w < 10 || d < 10) continue;

        const cx = (bMinX + bMaxX) / 2;
        const cz = (bMinZ + bMaxZ) / 2;

        const seed = bIdx * 19 + ix * 7 + iz * 13;
        const archetype = seed % 5;

        const isSkyscraper = (ix + iz + bIdx) % 3 === 0;
        const height = isSkyscraper ? 54 + ((seed * 11) % 38) : 22 + ((seed * 7) % 24);

        if (archetype === 0) {
          this._createSteppedTower(cx, cz, w, d, height, seed);
        } else if (archetype === 1) {
          this._createCylindricalTower(cx, cz, Math.min(w, d), height, seed);
        } else if (archetype === 2) {
          this._createAngledPrismTower(cx, cz, w, d, height, seed);
        } else if (archetype === 3) {
          this._createMidriseComplex(cx, cz, w, d, Math.min(36, height), seed);
        } else {
          this._createFinTower(cx, cz, w, d, height, seed);
        }
      }
    }
  }

  // -------------------------------------------------------------------------------------
  // DETAILED BUILDING ARCHETYPES & STREET-LEVEL FACADE ENHANCEMENTS
  // -------------------------------------------------------------------------------------

  /**
   * Adds rich street-level facade details to ANY building:
   * - Double-height illuminated lobby entrance with glass doors and reception desk
   * - Floating cantilevered entrance canopy with glowing neon edge trim and LED downlights
   * - Extruded 3D backlit tenant corporate logos & business signs
   * - Display boutique retail windows with fabric awnings
   * - Protruding vertical cyberpunk neon blade signs (Japanese & English text)
   * - Exterior AC condenser units mounted on window ledges
   * - Architectural vertical neon accent fins
   * - Street-level concrete planters and curb security bollards
   */
  _addStreetLevelFacadeDetails(building, w, d, height, seed) {
    const frontZ = d / 2;
    const lobbyW = Math.min(13.0, w * 0.52);

    // 1. Recessed Double-Height Glass Entrance Lobby
    const lobbyPortal = new THREE.Mesh(new THREE.BoxGeometry(lobbyW, 4.8, 1.2), this.buildingMatDark);
    lobbyPortal.position.set(0, 2.4, frontZ - 0.4);
    building.add(lobbyPortal);

    // Backlit Warm Reception Desk Wall inside lobby
    const lobbyInterior = new THREE.Mesh(new THREE.PlaneGeometry(lobbyW - 0.8, 4.2), this.windowLitMat);
    lobbyInterior.position.set(0, 2.4, frontZ - 0.95);
    building.add(lobbyInterior);

    // Transparent Glass Curtain Entry Doors
    const glassDoor = new THREE.Mesh(new THREE.PlaneGeometry(lobbyW - 0.6, 4.4), this.glassMat);
    glassDoor.position.set(0, 2.4, frontZ + 0.1);
    building.add(glassDoor);

    // 2. Floating Cantilevered Architectural Canopy / Marquee
    const canopyW = lobbyW + 1.4;
    const canopyD = 2.8;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.35, canopyD), this.steelMat);
    canopy.position.set(0, 4.9, frontZ + canopyD / 2 - 0.2);
    building.add(canopy);

    // Glowing Neon Edge Trim around canopy perimeter
    const neonColors = [this.neonCyanMat, this.neonPinkMat, this.neonAmberMat, this.neonGreenMat, this.neonVioletMat];
    const canopyNeonMat = neonColors[seed % neonColors.length];

    const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(canopyW + 0.1, 0.12, canopyD + 0.1), canopyNeonMat);
    canopyTrim.position.set(0, 4.9, frontZ + canopyD / 2 - 0.2);
    building.add(canopyTrim);

    // 4 Recessed LED Downlights underneath canopy
    [-canopyW * 0.3, canopyW * 0.3].forEach((lx) => {
      const downlight = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 6), this.windowLitMat);
      downlight.position.set(lx, 4.7, frontZ + 1.2);
      building.add(downlight);
    });

    // 3. Extruded Corporate Tenant Signage above entrance
    const signNames = [
      "CYBERCORP // R&D",
      "OMNI MATRIX // HQ",
      "VERTEX GLOBAL",
      "SYNTHESIS // LABS",
      "PULSE AUDIO",
      "NIGHTFALL // CLUB",
      "HORIZON AI",
      "QUANTUM CHIP",
      "NEO TOKYO // TRADE",
      "METROPOLIS BANK"
    ];
    const signText = signNames[seed % signNames.length];
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(lobbyW * 0.85, 1.1, 0.35), this.buildingMatDark);
    signBox.position.set(0, 5.9, frontZ + 0.15);
    building.add(signBox);

    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(lobbyW * 0.82, 0.85), canopyNeonMat);
    signFace.position.set(0, 5.9, frontZ + 0.34);
    building.add(signFace);

    // 4. Ground-Floor Retail Display Windows with Awnings on Left/Right Flanks
    const flankW = (w - lobbyW) / 2 - 0.8;
    if (flankW > 3.0) {
      [-w / 2 + flankW / 2 + 0.4, w / 2 - flankW / 2 - 0.4].forEach((fx, fIdx) => {
        // Display Window
        const dispWin = new THREE.Mesh(new THREE.PlaneGeometry(flankW, 3.6), (seed + fIdx) % 2 === 0 ? this.windowLitMat : this.windowCyanMat);
        dispWin.position.set(fx, 2.0, frontZ + 0.06);
        building.add(dispWin);

        // Slanted Fabric Awning
        const awningMats = [this.awningBurgundyMat, this.awningGreenMat, this.awningNavyMat];
        const aMat = awningMats[(seed + fIdx) % awningMats.length];
        const awning = new THREE.Mesh(new THREE.BoxGeometry(flankW + 0.2, 0.25, 1.8), aMat);
        awning.position.set(fx, 4.0, frontZ + 0.85);
        awning.rotation.x = 0.22;
        building.add(awning);
      });
    }

    // 5. Classic Cyberpunk Vertical Protruding Blade Sign
    const bladeColor = neonColors[(seed + 2) % neonColors.length];
    const bladeSign = new THREE.Group();
    bladeSign.position.set(w / 2 + 0.1, 10.5, frontZ - 1.2);

    const bladeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 1.6), this.buildingMatDark);
    bladeSign.add(bladeFrame);

    const bladeGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 7.1), bladeColor);
    bladeGlow.position.x = 0.16;
    bladeGlow.rotation.y = Math.PI / 2;
    bladeSign.add(bladeGlow);

    const bladeGlow2 = bladeGlow.clone();
    bladeGlow2.position.x = -0.16;
    bladeGlow2.rotation.y = -Math.PI / 2;
    bladeSign.add(bladeGlow2);

    building.add(bladeSign);

    // 6. Exterior AC Condenser Units on Upper Window Ledges
    [-w * 0.35, w * 0.35].forEach((acX, acIdx) => {
      [8.0, 14.0].forEach((acY) => {
        if (acY < height - 4) {
          const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.75), this.steelMat);
          acUnit.position.set(acX, acY, frontZ + 0.4);
          building.add(acUnit);
        }
      });
    });

    // 7. Street-Level Planters & Curb Security Bollards
    [-lobbyW / 2 - 0.7, lobbyW / 2 + 0.7].forEach((bx) => {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.2), this.buildingMatNavy);
      planter.position.set(bx, 0.35, frontZ + 1.6);
      building.add(planter);

      const shrub = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), this.neonGreenMat);
      shrub.position.set(bx, 0.9, frontZ + 1.6);
      building.add(shrub);
    });
  }

  // Archetype 1: Art-Deco Stepped Skyscraper
  _createSteppedTower(cx, cz, w, d, height, seed) {
    const building = new THREE.Group();
    building.position.set(cx, 0, cz);

    const mats = [this.buildingMatDark, this.buildingMatMid, this.buildingMatWarm];
    const mat = mats[seed % mats.length];

    const h1 = height * 0.4;
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(w, h1, d), mat);
    m1.position.y = h1 / 2;
    m1.castShadow = true;
    building.add(m1);

    const h2 = height * 0.35;
    const w2 = w * 0.78;
    const d2 = d * 0.78;
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), mat);
    m2.position.y = h1 + h2 / 2;
    m2.castShadow = true;
    building.add(m2);

    const h3 = height * 0.25;
    const w3 = w * 0.55;
    const d3 = d * 0.55;
    const m3 = new THREE.Mesh(new THREE.BoxGeometry(w3, h3, d3), mat);
    m3.position.y = h1 + h2 + h3 / 2;
    m3.castShadow = true;
    building.add(m3);

    const neonColors = [0x00f0ff, 0xff007f, 0xffaa00, 0x00ff66];
    const nColor = neonColors[seed % neonColors.length];
    const trimMat = new THREE.MeshBasicMaterial({ color: nColor });

    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), trimMat);
    trim1.position.y = h1;
    building.add(trim1);

    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(w2 + 0.3, 0.4, d2 + 0.3), trimMat);
    trim2.position.y = h1 + h2;
    building.add(trim2);

    const spireH = 12.0;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, spireH, 4), this.steelMat);
    spire.position.y = height + spireH / 2;
    building.add(spire);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
    beacon.position.y = height + spireH;
    building.add(beacon);
    this.beaconLights.push(beacon);

    this._addWindowGridToBuilding(building, w3, d3, height, seed);
    this._addStreetLevelFacadeDetails(building, w, d, height, seed);

    this.buildingsGroup.add(building);
    this.collisionWorld.addBox(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 0, height, false, 'stepped_tower');
  }

  // Archetype 2: Faceted Octagonal Glass Cyber Tower
  _createCylindricalTower(cx, cz, diameter, height, seed) {
    const building = new THREE.Group();
    building.position.set(cx, 0, cz);

    const radius = diameter / 2;
    const cylGeo = new THREE.CylinderGeometry(radius, radius * 1.05, height, 8);
    const cylMesh = new THREE.Mesh(cylGeo, this.buildingMatTeal);
    cylMesh.position.y = height / 2;
    cylMesh.castShadow = true;
    building.add(cylMesh);

    const bandCount = Math.floor(height / 10);
    const ringColor = [0x00f0ff, 0xb537f2, 0x00ff66][seed % 3];
    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor });

    for (let b = 1; b <= bandCount; b++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.35, radius + 0.35, 0.5, 8), ringMat);
      ring.position.y = b * 9.5;
      building.add(ring);
    }

    const crown = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.85, 0.35, 6, 12), ringMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = height + 1.2;
    building.add(crown);

    this._addStreetLevelFacadeDetails(building, diameter, diameter, height, seed);

    this.buildingsGroup.add(building);
    this.collisionWorld.addBox(cx - radius, cx + radius, cz - radius, cz + radius, 0, height, false, 'cyl_tower');
  }

  // Archetype 3: Angled / Slanted Prism Tower
  _createAngledPrismTower(cx, cz, w, d, height, seed) {
    const building = new THREE.Group();
    building.position.set(cx, 0, cz);

    const bodyH = height * 0.82;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), this.buildingMatBronze);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    building.add(body);

    const wedgeH = height * 0.18;
    const wedgeGeo = new THREE.CylinderGeometry(0.1, w * 0.65, wedgeH, 4);
    const wedgeMat = seed % 2 === 0 ? this.glassMat : this.steelMat;
    const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
    wedge.position.set(0, bodyH + wedgeH / 2, 0);
    wedge.rotation.y = Math.PI / 4;
    building.add(wedge);

    const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.35, bodyH, 0.35), this.neonCyanMat);
    chevron.position.set(w / 2 + 0.1, bodyH / 2, d / 2 + 0.1);
    building.add(chevron);

    this._addWindowGridToBuilding(building, w, d, bodyH, seed);
    this._addStreetLevelFacadeDetails(building, w, d, height, seed);

    this.buildingsGroup.add(building);
    this.collisionWorld.addBox(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 0, height, false, 'prism_tower');
  }

  // Archetype 4: Twin Towers with High-Altitude Skybridge Landmark (82m tall)
  _createTwinTowers(cx, cz) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const tW = 18;
    const tD = 18;
    const tH = 82;
    const gap = 16;

    const towerL = new THREE.Mesh(new THREE.BoxGeometry(tW, tH, tD), this.buildingMatMid);
    towerL.position.set(-gap / 2 - tW / 2, tH / 2, 0);
    towerL.castShadow = true;
    group.add(towerL);

    const towerR = new THREE.Mesh(new THREE.BoxGeometry(tW, tH, tD), this.buildingMatMid);
    towerR.position.set(gap / 2 + tW / 2, tH / 2, 0);
    towerR.castShadow = true;
    group.add(towerR);

    // Glowing Neon Glass Skybridge at Y = 46m spanning between the towers
    const bridgeY = 46;
    const bridgeW = gap + 2.0;
    const bridgeGeo = new THREE.BoxGeometry(bridgeW, 4.2, 5.5);
    const bridge = new THREE.Mesh(bridgeGeo, this.glassMat);
    bridge.position.set(0, bridgeY, 0);
    group.add(bridge);

    [-2.6, 2.6].forEach((bz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 0.4, 0.4), this.neonCyanMat);
      beam.position.set(0, bridgeY - 2.1, bz);
      group.add(beam);
    });

    [-gap / 2 - tW / 2, gap / 2 + tW / 2].forEach((tx) => {
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.4, 14, 4), this.steelMat);
      spire.position.set(tx, tH + 7, 0);
      group.add(spire);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      beacon.position.set(tx, tH + 14, 0);
      group.add(beacon);
      this.beaconLights.push(beacon);
    });

    this._addStreetLevelFacadeDetails(towerL, tW, tD, tH, 101);
    this._addStreetLevelFacadeDetails(towerR, tW, tD, tH, 102);

    this.buildingsGroup.add(group);
    this.collisionWorld.addBox(cx - gap / 2 - tW, cx - gap / 2, cz - tD / 2, cz + tD / 2, 0, tH, false, 'twin_tower_L');
    this.collisionWorld.addBox(cx + gap / 2, cx + gap / 2 + tW, cz - tD / 2, cz + tD / 2, 0, tH, false, 'twin_tower_R');
  }

  // Archetype 5: Mid-Rise Commercial Complex with Rooftop Billboard & Infrastructure
  _createMidriseComplex(cx, cz, w, d, height, seed) {
    const building = new THREE.Group();
    building.position.set(cx, 0, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), this.buildingMatDark);
    body.position.y = height / 2;
    body.castShadow = true;
    building.add(body);

    const waterTower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.8, 8), this.steelMat);
    waterTower.position.set(-w * 0.25, height + 1.4, -d * 0.2);
    building.add(waterTower);

    const ac = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 2.2), this.steelMat);
    ac.position.set(w * 0.25, height + 0.7, -d * 0.2);
    building.add(ac);

    const boardW = Math.min(18, w * 0.85);
    const boardH = 3.8;
    const billboard = new THREE.Group();
    billboard.position.set(0, height + boardH / 2 + 0.4, d * 0.25);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, 0.35), this.buildingMatDark);
    billboard.add(frame);

    const neonSlogans = [this.neonCyanMat, this.neonPinkMat, this.neonAmberMat, this.neonGreenMat];
    const signMat = neonSlogans[seed % neonSlogans.length];
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(boardW - 0.6, boardH - 0.6), signMat);
    signFace.position.z = 0.2;
    billboard.add(signFace);

    building.add(billboard);
    this._addWindowGridToBuilding(building, w, d, height, seed);
    this._addStreetLevelFacadeDetails(building, w, d, height, seed);

    this.buildingsGroup.add(building);
    this.collisionWorld.addBox(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 0, height, false, 'midrise_complex');
  }

  // Archetype 6: Slender Pencil Tower with Architectural Fins
  _createFinTower(cx, cz, w, d, height, seed) {
    const building = new THREE.Group();
    building.position.set(cx, 0, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, height, d * 0.82), this.buildingMatNavy);
    body.position.y = height / 2;
    body.castShadow = true;
    building.add(body);

    const finColor = [0x00f0ff, 0xff007f, 0xffaa00][seed % 3];
    const finNeonMat = new THREE.MeshBasicMaterial({ color: finColor });

    [-w / 2 + 0.2, w / 2 - 0.2].forEach((fx) => {
      [-d / 2 + 0.2, d / 2 - 0.2].forEach((fz) => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, height + 3.0, 0.5), finNeonMat);
        fin.position.set(fx, (height + 3.0) / 2, fz);
        building.add(fin);
      });
    });

    this._addWindowGridToBuilding(building, w * 0.8, d * 0.8, height, seed);
    this._addStreetLevelFacadeDetails(building, w, d, height, seed);

    this.buildingsGroup.add(building);
    this.collisionWorld.addBox(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 0, height, false, 'fin_tower');
  }

  _addWindowGridToBuilding(buildingGroup, w, d, height, seed) {
    const winCols = Math.floor(w / 3.4);
    const winRows = Math.floor((height - 7) / 3.6);
    if (winCols < 2 || winRows < 2) return;

    const winW = 1.6;
    const winH = 1.8;

    const northZ = d / 2 + 0.04;
    const southZ = -d / 2 - 0.04;

    const winMaterials = [this.windowLitMat, this.windowCyanMat, this.windowVioletMat];

    for (let r = 0; r < winRows; r++) {
      const wy = 6.2 + r * 3.6;
      for (let c = 0; c < winCols; c++) {
        const hash = (seed * 137 + r * 31 + c * 17) % 100;
        if (hash > 48) continue;

        const wx = -w / 2 + 1.8 + c * 3.4;
        const mat = winMaterials[(seed + r + c) % winMaterials.length];

        const winN = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), mat);
        winN.position.set(wx, wy, northZ);
        buildingGroup.add(winN);

        const winS = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), mat);
        winS.position.set(wx, wy, southZ);
        winS.rotation.y = Math.PI;
        buildingGroup.add(winS);
      }
    }
  }

  _buildShopfronts() {
    this.shopGroup = new THREE.Group();

    // 1. Neo Ramen Bar (East Avenue, X: 24, Z: 22)
    this._createRamenBar(24, 0.22, 22);

    // 2. Cyber Arcade 1999 (East Avenue, X: 24, Z: 48)
    this._createCyberArcade(24, 0.22, 48);

    // 3. Synthwave Cafe & Lounge (West Avenue, X: -24, Z: 22)
    this._createSynthCafe(-24, 0.22, 22);

    // 4. 160 BPM Vinyl Records (West Avenue, X: -24, Z: 48)
    this._createVinylShop(-24, 0.22, 48);

    // 5. Tokyo Mart 24/7 (East Avenue South, X: 24, Z: -24)
    this._createTokyoMart(24, 0.22, -24);

    // 6. Nightclub MATRIX (West Avenue South, X: -24, Z: -24)
    this._createMatrixClub(-24, 0.22, -24);

    this.rootGroup.add(this.shopGroup);
  }

  _createRamenBar(cx, cy, cz) {
    const shop = new THREE.Group();
    shop.position.set(cx, cy, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 14), this.buildingMatDark);
    body.position.y = 2.6;
    shop.add(body);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.6 }));
    awning.position.set(0, 4.4, -7.5);
    awning.rotation.x = 0.15;
    shop.add(awning);

    const signGroup = new THREE.Group();
    signGroup.position.set(0, 5.8, -7.2);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.9, 1.1, 8), this.neonPinkMat);
    signGroup.add(bowl);

    const noodles = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.15, 6, 12), this.neonYellowMat);
    noodles.rotation.x = Math.PI / 2;
    noodles.position.y = 0.55;
    signGroup.add(noodles);

    const kanjiMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 0.2), this.neonCyanMat);
    kanjiMesh.position.set(0, -1.2, 0.2);
    signGroup.add(kanjiMesh);

    shop.add(signGroup);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(11.0, 1.05, 1.4), new THREE.MeshStandardMaterial({ color: 0x3d2817 }));
    counter.position.set(0, 0.52, -6.2);
    shop.add(counter);

    [-4.5, -1.5, 1.5, 4.5].forEach((lx) => {
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 6), this.neonRedMat);
      lantern.position.set(lx, 3.6, -7.2);
      shop.add(lantern);
    });

    this.shopGroup.add(shop);
    this.collisionWorld.addBox(cx - 8, cx + 8, cz - 7, cz + 7, cy, cy + 5.2, false, 'ramen_bar');
  }

  _createCyberArcade(cx, cy, cz) {
    const shop = new THREE.Group();
    shop.position.set(cx, cy, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5.4, 14), this.buildingMatDark);
    body.position.y = 2.7;
    shop.add(body);

    const marquee = new THREE.Mesh(new THREE.BoxGeometry(14.0, 1.6, 0.5), this.neonCyanMat);
    marquee.position.set(0, 4.6, -7.2);
    shop.add(marquee);

    [-5, -2.5, 0, 2.5, 5].forEach((ax, idx) => {
      const cab = new THREE.Group();
      cab.position.set(ax, 0, -6.2);

      const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 1.2), this.buildingMatNavy);
      cabBody.position.y = 1.05;
      cab.add(cabBody);

      const screenColors = [0x00f0ff, 0xff007f, 0x00ff66, 0xffaa00, 0xb537f2];
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), new THREE.MeshBasicMaterial({ color: screenColors[idx % screenColors.length] }));
      screen.position.set(0, 1.35, -0.61);
      screen.rotation.x = -0.2;
      cab.add(screen);

      shop.add(cab);
    });

    this.shopGroup.add(shop);
    this.collisionWorld.addBox(cx - 8, cx + 8, cz - 7, cz + 7, cy, cy + 5.4, false, 'cyber_arcade');
  }

  _createSynthCafe(cx, cy, cz) {
    const shop = new THREE.Group();
    shop.position.set(cx, cy, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 14), this.buildingMatMid);
    body.position.y = 2.6;
    shop.add(body);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(11.0, 1.4, 0.4), this.neonPinkMat);
    sign.position.set(0, 4.6, -7.2);
    shop.add(sign);

    [-4, 4].forEach((tx) => {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.85, 8), this.steelMat);
      table.position.set(tx, 0.42, -9.0);
      shop.add(table);

      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8), this.neonCyanMat);
      umbrella.position.set(tx, 2.3, -9.0);
      shop.add(umbrella);
    });

    this.shopGroup.add(shop);
    this.collisionWorld.addBox(cx - 8, cx + 8, cz - 7, cz + 7, cy, cy + 5.2, false, 'synth_cafe');
  }

  _createVinylShop(cx, cy, cz) {
    const shop = new THREE.Group();
    shop.position.set(cx, cy, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 14), this.buildingMatDark);
    body.position.y = 2.6;
    shop.add(body);

    const signGroup = new THREE.Group();
    signGroup.position.set(0, 4.8, -7.3);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.15, 16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    disc.rotation.x = Math.PI / 2;
    signGroup.add(disc);

    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), this.neonYellowMat);
    label.rotation.x = Math.PI / 2;
    signGroup.add(label);

    const titleMesh = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.0, 0.3), this.neonPinkMat);
    titleMesh.position.set(0, -1.6, 0);
    signGroup.add(titleMesh);

    shop.add(signGroup);
    this.shopGroup.add(shop);
    this.collisionWorld.addBox(cx - 8, cx + 8, cz - 7, cz + 7, cy, cy + 5.2, false, 'vinyl_shop');
  }

  _createTokyoMart(cx, cy, cz) {
    const shop = new THREE.Group();
    shop.position.set(cx, cy, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 14), this.buildingMatMid);
    body.position.y = 2.6;
    shop.add(body);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(15.0, 1.4, 0.4), this.neonGreenMat);
    fascia.position.set(0, 4.5, -7.2);
    shop.add(fascia);

    [-4, 4].forEach((vx) => {
      const vm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.9), this.neonCyanMat);
      vm.position.set(vx, 1.1, -7.5);
      shop.add(vm);
    });

    this.shopGroup.add(shop);
    this.collisionWorld.addBox(cx - 8, cx + 8, cz - 7, cz + 7, cy, cy + 5.2, false, 'tokyo_mart');
  }

  _createMatrixClub(cx, cy, cz) {
    const shop = new THREE.Group();
    shop.position.set(cx, cy, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 5.6, 14), this.buildingMatDark);
    body.position.y = 2.8;
    shop.add(body);

    const logo = new THREE.Mesh(new THREE.BoxGeometry(12.0, 1.8, 0.4), this.neonVioletMat);
    logo.position.set(0, 4.8, -7.2);
    shop.add(logo);

    this.shopGroup.add(shop);
    this.collisionWorld.addBox(cx - 8, cx + 8, cz - 7, cz + 7, cy, cy + 5.6, false, 'matrix_club');
  }

  _buildStreetFurniture() {
    this.furnitureGroup = new THREE.Group();

    [-12.8, 12.8, -52.8, 52.8, 88.0, -188.0].forEach((lx) => {
      for (let lz = -340; lz <= 340; lz += 32) {
        if (Math.abs(lz) < 16 || Math.abs(lz - 100) < 16 || Math.abs(lz + 100) < 16 ||
            Math.abs(lz - 200) < 16 || Math.abs(lz + 200) < 16) continue;
        this._createStreetLamp(lx, 0.22, lz, lx > 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    });

    const intersections = [
      { x: 0, z: 0 },
      { x: 0, z: 100 },
      { x: 0, z: -100 },
      { x: 100, z: 0 },
      { x: -100, z: 0 },
      { x: 0, z: 200 },
      { x: 0, z: -200 }
    ];
    intersections.forEach((inter) => {
      this._createTrafficIntersection(inter.x, inter.z);
    });

    this._createBusStop(13.5, 0.22, 16);
    this._createBusStop(-13.5, 0.22, -45);
    this._createBusStop(93.5, 0.22, 30);

    this._createNewsstand(13.8, 0.22, 36);
    this._createNewsstand(-13.8, 0.22, 16);

    [8, -8, 28, -28].forEach((hz) => {
      const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.7, 6), this.neonYellowMat);
      hyd.position.set(13.2, 0.22 + 0.35, hz);
      this.furnitureGroup.add(hyd);
    });

    this.rootGroup.add(this.furnitureGroup);
  }

  _createStreetLamp(x, y, z, rotY) {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);
    lamp.rotation.y = rotY;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.2, 6), this.steelMat);
    pole.position.y = 3.1;
    lamp.add(pole);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), this.steelMat);
    arm.position.set(0.85, 6.1, 0);
    arm.rotation.z = Math.PI / 3;
    lamp.add(arm);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.4), this.neonCyanMat);
    head.position.set(1.65, 6.4, 0);
    lamp.add(head);

    this.furnitureGroup.add(lamp);
  }

  _createTrafficIntersection(cx, cz) {
    [
      { x: cx - 13.5, z: cz - 13.5, rot: 0 },
      { x: cx + 13.5, z: cz + 13.5, rot: Math.PI },
      { x: cx - 13.5, z: cz + 13.5, rot: Math.PI / 2 },
      { x: cx + 13.5, z: cz - 13.5, rot: -Math.PI / 2 }
    ].forEach((sig) => {
      const signal = new THREE.Group();
      signal.position.set(sig.x, 0.22, sig.z);
      signal.rotation.y = sig.rot;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.8, 6), this.steelMat);
      pole.position.y = 2.9;
      signal.add(pole);

      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.35), this.buildingMatDark);
      mast.position.set(0, 4.6, 0);
      signal.add(mast);

      const rLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), this.neonRedMat);
      rLens.position.set(0, 5.0, 0.2);
      const aLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), this.neonAmberMat);
      aLens.position.set(0, 4.6, 0.2);
      const gLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), this.neonGreenMat);
      gLens.position.set(0, 4.2, 0.2);
      signal.add(rLens, aLens, gLens);

      this.furnitureGroup.add(signal);
    });
  }

  _createBusStop(x, y, z) {
    const busStop = new THREE.Group();
    busStop.position.set(x, y, z);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 2.2), this.steelMat);
    frame.position.y = 1.4;
    busStop.add(frame);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.15, 2.6), this.neonCyanMat);
    roof.position.y = 2.85;
    busStop.add(roof);

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), this.neonAmberMat);
    sign.position.set(2.2, 1.4, 0);
    sign.rotation.y = -Math.PI / 2;
    busStop.add(sign);

    this.furnitureGroup.add(busStop);
    this.collisionWorld.addBox(x - 2.5, x + 2.5, z - 1.2, z + 1.2, y, y + 3.0, false, 'bus_stop');
  }

  _createNewsstand(x, y, z) {
    const stand = new THREE.Group();
    stand.position.set(x, y, z);

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 2.4), this.steelMat);
    body.position.y = 1.3;
    stand.add(body);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 2.8), this.neonPinkMat);
    awning.position.y = 2.7;
    stand.add(awning);

    this.furnitureGroup.add(stand);
    this.collisionWorld.addBox(x - 1.8, x + 1.8, z - 1.3, z + 1.3, y, y + 2.8, false, 'newsstand');
  }

  _buildAnimatedFlyingTraffic() {
    this.trafficGroup = new THREE.Group();

    for (let i = 0; i < 18; i++) {
      const carGroup = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 4.8), this.steelMat);
      carGroup.add(body);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.4), this.glassMat);
      canopy.position.set(0, 0.5, -0.3);
      carGroup.add(canopy);

      const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.15), this.neonCyanMat);
      hl1.position.set(-0.75, 0, 2.45);
      const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.15), this.neonCyanMat);
      hl2.position.set(0.75, 0, 2.45);
      carGroup.add(hl1, hl2);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.15), this.neonPinkMat);
      tl.position.set(0, 0, -2.45);
      carGroup.add(tl);

      const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 6.5), new THREE.MeshBasicMaterial({
        color: 0xff007f,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      }));
      trail.rotateX(Math.PI / 2);
      trail.position.set(0, 0, -5.6);
      carGroup.add(trail);

      const isNorthSouth = i % 2 === 0;
      const altitude = 34 + (i % 4) * 8;
      const corridorCoord = [-200, -100, 0, 100, 200][i % 5];

      this.flyingCars.push({
        group: carGroup,
        isNorthSouth,
        fixedCoord: corridorCoord,
        altitude,
        posAlong: -380 + i * 42,
        speed: 38 + (i % 3) * 12
      });

      this.trafficGroup.add(carGroup);
    }

    this.rootGroup.add(this.trafficGroup);
  }

  /**
   * Surface Elevation & Collision Queries
   * Supports:
   * - 660m Elevated Highway Deck (Y = 9.5m) with smooth underpass clearance at street level (Y = 0m)
   * - 7 On-Ramps and Off-Ramps with exact mathematical projection along ramp vector
   * - Sidewalks on city blocks (0.22m)
   * - Street asphalt (0.0m)
   */
  getIslandElevation(x, z, currentY = null) {
    const hwX = this.highwayX;
    const hwHalfW = this.highwayW / 2 + 0.6; // 6.6m width tolerance

    // 1. Check Main Elevated Highway Deck (Z: -330 to 330 at Y = 9.5m)
    if (Math.abs(x - hwX) <= hwHalfW && z >= -330 && z <= 330) {
      if (currentY !== null && currentY < 5.5) {
        // Underpass clearance: entity passing underneath at street level!
        return 0.0;
      }
      return this.highwayY;
    }

    // 2. Check All 7 Highway On-Ramps and Off-Ramps (generic mathematical projection!)
    if (this.ramps && this.ramps.length > 0) {
      for (let i = 0; i < this.ramps.length; i++) {
        const r = this.ramps[i];
        const dx = r.x2 - r.x1;
        const dz = r.z2 - r.z1;
        const lenSq = dx * dx + dz * dz;
        if (lenSq < 0.001) continue;

        // Project (x, z) onto the ramp line segment
        const t = ((x - r.x1) * dx + (z - r.z1) * dz) / lenSq;
        if (t >= -0.05 && t <= 1.05) {
          const projX = r.x1 + t * dx;
          const projZ = r.z1 + t * dz;
          const perpDist = Math.hypot(x - projX, z - projZ);
          if (perpDist <= r.width / 2 + 0.7) {
            const clampedT = Math.max(0, Math.min(1, t));
            const rampY = r.y1 + clampedT * (r.y2 - r.y1);
            if (currentY === null || currentY >= rampY - 2.5) {
              return rampY;
            }
          }
        }
      }
    }

    // 3. Sidewalk elevation (0.22m) when on any city block
    if (this.blocks) {
      for (let i = 0; i < this.blocks.length; i++) {
        const b = this.blocks[i];
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
          return 0.22;
        }
      }
    }

    // Default street asphalt level
    return 0.0;
  }

  getGroundHeight(x, z, currentY = null) {
    const baseElev = this.getIslandElevation(x, z, currentY);
    if (!this.collisionWorld) return baseElev;
    const testY = currentY !== null ? currentY : baseElev;
    return this.collisionWorld.getSurfaceHeight(x, z, testY, baseElev);
  }

  resolveCollisions(pos, radius, currentY) {
    if (this.collisionWorld) {
      this.collisionWorld.resolveHorizontalCollisions(pos, radius, currentY);
    }
  }

  getZoneName(p, isQuad = false) {
    if (isQuad) {
      if (Math.abs(p.x - this.highwayX) <= 6.5 && p.y > 6.0) {
        return "NEON SKYWAY // HIGHWAY CRUISER [9.5M]";
      }
      return "METRO HIGHWAY CRUISER // TURBO 4X4";
    }

    if (Math.abs(p.x - this.highwayX) <= 6.5 && p.y > 6.0) {
      return "NEON SKYWAY // ELEVATED EXPRESSWAY (9.5M)";
    }

    if (Math.abs(p.x) < 16) {
      if (p.z > 100) return "GRAND BOULEVARD // NORTH DISTRICT";
      if (p.z < -100) return "GRAND BOULEVARD // SOUTH TRANSIT SECTOR";
      return "GRAND BOULEVARD // CENTRAL INTERSECTION";
    }

    if (Math.abs(p.z) < 16) {
      if (p.x > 80) return "NEON BROADWAY // EAST COMMERCIAL ROW";
      if (p.x < -80) return "NEON BROADWAY // WEST SKYWAY SECTOR";
      return "NEON BROADWAY // DOWNTOWN CROSSING";
    }

    if (p.x > 18 && p.x < 80 && p.z >= 18 && p.z <= 80) {
      return "NEO RAMEN & CYBER ARCADE // 1ST AVENUE";
    }

    if (p.x > -68 && p.x < -18 && p.z >= 18 && p.z <= 80) {
      return "SYNTHWAVE CAFE & VINYL // 1ST AVENUE";
    }

    if (p.x > 18 && p.x < 80 && p.z >= -80 && p.z <= -18) {
      return "TOKYO MART 24/7 // SOUTH DISTRICT";
    }
    if (p.x > -68 && p.x < -18 && p.z >= -80 && p.z <= -18) {
      return "NIGHTCLUB MATRIX // UNDERGROUND SECTOR";
    }

    if (p.x > 200) return "EAST PERIMETER // SKYLINE PROMENADE";
    if (p.x < -200) return "WEST PERIMETER // INDUSTRIAL MEGAPLEX";
    if (p.z > 200) return "NORTH SECTOR // TWIN TOWERS PLAZA";
    if (p.z < -200) return "SOUTH SECTOR // HARBOR TRANSIT";

    return "METROPOLIS DOWNTOWN // NEON GRID";
  }

  update(dt) {
    this.time += dt;

    if (this.flyingCars && this.flyingCars.length > 0) {
      this.flyingCars.forEach((c) => {
        c.posAlong += c.speed * dt;
        if (c.posAlong > 410) c.posAlong = -410;

        if (c.isNorthSouth) {
          c.group.position.set(c.fixedCoord, c.altitude, c.posAlong);
          c.group.rotation.y = 0;
        } else {
          c.group.position.set(c.posAlong, c.altitude, c.fixedCoord);
          c.group.rotation.y = Math.PI / 2;
        }
      });
    }

    if (this.beaconLights && this.beaconLights.length > 0) {
      const on = Math.sin(this.time * 3.5) > 0.0;
      this.beaconLights.forEach((b) => {
        b.visible = on;
      });
    }
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
