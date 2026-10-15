import { defineGame, type PlayerId } from '@sinki/platform-core';

export type Team = 'convoy' | 'raiders';
export type VehicleRole = 'rig' | 'support' | 'raider';
export type GameMode = 'point_battle' | 'convoy';
export type WeaponType = 'twin_cannon' | 'homing_missile' | 'shotgun_spread';

export interface VehicleState {
  playerId: PlayerId;
  nickname: string;
  team: Team;
  role: VehicleRole;
  x: number;
  y: number;
  z: number;
  yaw: number;        // heading in radians
  pitch: number;      // terrain tilt in radians
  roll: number;       // bank tilt in radians
  speed: number;      // forward velocity
  vy: number;         // vertical velocity (gravity / airtime)
  hp: number;
  maxHp: number;
  alive: boolean;
  isGrounded: boolean;
  kills: number;
  shootCooldown: number;
  lastDamageTime: number;
  boostCooldown: number;
  boostActiveTimer: number;
  boostFuel?: number;
  boostHolding?: boolean;
  respawnTimer: number;
  respawnsLeft: number;
  weapon: WeaponType;
  boostMatCooldown?: number;
}

export interface BulletState {
  id: string;
  ownerId: PlayerId;
  team: Team;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy?: number;
  vz: number;
  life: number; // remaining life in seconds
  type?: 'bullet' | 'missile' | 'spread';
  targetId?: string;
}

export interface ScrapCache {
  id: string;
  x: number;
  y: number;
  z: number;
  value: number;
  active: boolean;
  respawnTimer: number;
}

export interface SpikePit {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface BoostMat {
  id: string;
  x: number;
  z: number;
  yaw: number;
  radius: number;
}

export interface ShieldPickup {
  id: string;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
}

export interface ConvoyRaidState {
  gameMode: GameMode;
  vehicles: Record<PlayerId, VehicleState>;
  bullets: BulletState[];
  scrapCaches: ScrapCache[];
  spikePits: SpikePit[];
  boostMats: BoostMat[];
  shieldPickups: ShieldPickup[];
  roundTimeLeft: number;
  status: 'running' | 'convoy_escaped' | 'rig_destroyed' | 'team_victory';
  destinationZ: number;
  winnerTeam: Team | null;
  scores: Record<PlayerId, number>;
  teamScores: Record<Team, number>;
  targetScore: number;
  recentEvent?: string;
}

export type ConvoyRaidAction =
  | { type: 'control'; throttle: number; steer: number; handbrake?: boolean; boost?: boolean }
  | { type: 'shoot'; y?: number; pitch?: number }
  | { type: 'boost'; active?: boolean }
  | { type: 'select_role'; team: Team; role: VehicleRole }
  | { type: 'select_weapon'; weapon: WeaponType }
  | { type: 'respawn' }
  | { type: 'set_game_mode'; mode: GameMode }
  | { type: 'restart_round' };

// Deterministic terrain height with river, ravine chasm, redoubts, and cliff bluffs
export function getTerrainHeight(x: number, z: number): number {
  // 1. Base rolling hills
  const wave1 = Math.sin(x * 0.032) * Math.cos(z * 0.032) * 4.2;
  const wave2 = Math.sin((x + z) * 0.065) * 1.8;
  const wave3 = Math.cos(x * 0.11 - z * 0.075) * 0.9;
  let h = wave1 + wave2 + wave3;

  // Central Convoy Highway Corridor (|x| < 13)
  // Provides a graded, clear elevated causeway across the terrain so vehicles and the Big Rig never get stuck
  const highwayFactor = Math.max(0, 1.0 - Math.abs(x) / 13.0);
  const terrainDepthScale = 1.0 - highwayFactor;

  // 2. Winding River Channel around z = -44 (sunken gravel riverbed)
  const riverZ = -44 + Math.sin(x * 0.045) * 8.0;
  const distRiver = Math.abs(z - riverZ);
  if (distRiver < 13.0) {
    const t = 1.0 - (distRiver / 13.0);
    h -= Math.sin(t * Math.PI * 0.5) * (3.6 * (0.2 + 0.8 * terrainDepthScale));
  }

  // 3. Deep Rocky Ravine Chasm around z = 46 (deep canyon gorge)
  const ravineZ = 46 + Math.cos(x * 0.04) * 6.0;
  const distRavine = Math.abs(z - ravineZ);
  if (distRavine < 18.0) {
    const t = 1.0 - (distRavine / 18.0);
    // Deep canyon gorge: dramatic 14.0m deep plunge on the flank lanes with steep cliff walls!
    const gorgeProfile = Math.pow(Math.sin(t * Math.PI * 0.5), 1.25);
    h -= gorgeProfile * (14.0 * terrainDepthScale);
  }

  // 4. Western Fortified Redoubt (x: -70 to -35, z: -15 to 25)
  const redoubtDx = (x - (-52)) / 20.0;
  const redoubtDz = (z - 5) / 22.0;
  const redoubtDist = redoubtDx * redoubtDx + redoubtDz * redoubtDz;
  if (redoubtDist < 1.0) {
    const t = Math.cos(Math.sqrt(redoubtDist) * Math.PI * 0.5);
    h += t * 5.2;
  }

  // 5. Eastern Cliff Ridge (x: 40 to 85, z: -70 to 70)
  if (x > 38 && x < 88) {
    const cliffFactor = Math.sin(((x - 38) / 50) * Math.PI);
    h += cliffFactor * 4.0;
  }

  return h;
}

// Surface normal on terrain
export function getTerrainNormal(x: number, z: number): [number, number, number] {
  const eps = 0.5;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);
  const nx = (hL - hR) / (2 * eps);
  const nz = (hD - hU) / (2 * eps);
  const ny = 1.0;
  const len = Math.hypot(nx, ny, nz);
  return [nx / len, ny / len, nz / len];
}

const DESTINATION_Z = 220;
const MAP_BOUND_X = 140;

// Continuous Swept-Segment Distance to prevent high-speed bullet tunneling
function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 0.0001) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

export interface TerrainObstacle {
  id: string;
  type: 'hut' | 'rock' | 'tree' | 'tower' | 'tall_building' | 'jump_ramp';
  x: number;
  z: number;
  radius: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotation?: number;
  variant?: number;
}

export function getObstacleHeight(obs: TerrainObstacle): number {
  if (obs.height !== undefined) return obs.height;
  switch (obs.type) {
    case 'rock':
      return (obs.scaleY || 1.8) * 1.4; // Rocks are ~1.5 - 3.5m high
    case 'hut':
      return 4.2; // Standard desert hut roof peak
    case 'tree':
      return 7.5; // Palm / pine tree canopy
    case 'tower':
      return 14.0; // Gate towers
    case 'tall_building':
      return obs.height || 18.0;
    case 'jump_ramp':
      return obs.height || 3.0;
    default:
      return 3.5;
  }
}

function createTerrainObstacles(): TerrainObstacle[] {
  const list: TerrainObstacle[] = [];

  // 1. Wasteland Huts / Desert Settlement Houses (Rejigged to frame the battlefield outside jump runways)
  // Settlement 1: "Dusty Ridge" (Southwest: z: -140 to -115, x: -38 to -62)
  list.push(
    { id: 'hut_sw_1', type: 'hut', x: -42, z: -138, radius: 3.8, rotation: 0.35, variant: 0 },
    { id: 'hut_sw_2', type: 'hut', x: -56, z: -144, radius: 3.6, rotation: -0.4, variant: 1 },
    { id: 'hut_sw_3', type: 'hut', x: -46, z: -122, radius: 4.2, rotation: 0.75, variant: 2 },
    { id: 'hut_sw_4', type: 'hut', x: -60, z: -116, radius: 3.5, rotation: -0.2, variant: 0 }
  );

  // Settlement 2: "Scrap Oasis" (Southeast: z: -135 to -105, x: 38 to 62)
  list.push(
    { id: 'hut_se_1', type: 'hut', x: 42, z: -135, radius: 3.8, rotation: -0.6, variant: 1 },
    { id: 'hut_se_2', type: 'hut', x: 56, z: -126, radius: 4.0, rotation: 0.5, variant: 2 },
    { id: 'hut_se_3', type: 'hut', x: 46, z: -110, radius: 3.6, rotation: 0.2, variant: 0 },
    { id: 'hut_se_4', type: 'hut', x: 60, z: -116, radius: 3.8, rotation: -0.85, variant: 1 }
  );

  // Settlement 3: "Ironhold Bastion" (Northwest: z: 92 to 135, x: -42 to -64)
  list.push(
    { id: 'hut_nw_1', type: 'hut', x: -45, z: 96, radius: 4.2, rotation: 0.55, variant: 2 },
    { id: 'hut_nw_2', type: 'hut', x: -58, z: 106, radius: 3.6, rotation: -0.3, variant: 0 },
    { id: 'hut_nw_3', type: 'hut', x: -44, z: 126, radius: 3.8, rotation: 0.8, variant: 1 },
    { id: 'hut_nw_4', type: 'hut', x: -62, z: 134, radius: 3.5, rotation: -0.5, variant: 2 }
  );

  // Settlement 4: "Outpost Garrison" (Northeast: z: 92 to 135, x: 42 to 64)
  list.push(
    { id: 'hut_ne_1', type: 'hut', x: 45, z: 96, radius: 3.8, rotation: -0.45, variant: 0 },
    { id: 'hut_ne_2', type: 'hut', x: 58, z: 106, radius: 4.2, rotation: 0.7, variant: 1 },
    { id: 'hut_ne_3', type: 'hut', x: 44, z: 126, radius: 3.6, rotation: 0.3, variant: 2 },
    { id: 'hut_ne_4', type: 'hut', x: 62, z: 134, radius: 3.8, rotation: -0.65, variant: 0 }
  );

  // Roadside Shacks / Midfield Watch-Huts
  list.push(
    { id: 'hut_rd_1', type: 'hut', x: 28, z: -165, radius: 3.5, rotation: -0.7, variant: 1 },
    { id: 'hut_rd_2', type: 'hut', x: -28, z: -165, radius: 3.6, rotation: 0.4, variant: 0 },
    { id: 'hut_rd_3', type: 'hut', x: 28, z: -2, radius: 3.8, rotation: -0.3, variant: 2 },
    { id: 'hut_rd_4', type: 'hut', x: -28, z: -2, radius: 3.5, rotation: 0.6, variant: 1 }
  );

  // 2. Wasteland Desert Palm Trees (grouped in desert oasis groves clear of runways)
  const oasisCenters = [
    { x: -68, z: -150 },
    { x: 68, z: -150 },
    { x: -74, z: -44 },
    { x: 74, z: -44 },
    { x: -70, z: 145 },
    { x: 70, z: 145 },
  ];

  oasisCenters.forEach((oasis, oIdx) => {
    for (let p = 0; p < 4; p++) {
      const pSeed = oIdx * 4 + p;
      const pR1 = Math.abs(Math.sin(pSeed * 17.13));
      const pR2 = Math.abs(Math.cos(pSeed * 29.41));
      const px = oasis.x + (pR1 - 0.5) * 16;
      const pz = oasis.z + (pR2 - 0.5) * 16;
      list.push({
        id: `tree_${oIdx}_${p}`,
        type: 'tree',
        x: px,
        z: pz,
        radius: 1.2,
      });
    }
  });

  // 3. Weathered Sandstone Boulders (placed along dunes |x| >= 24, excluding jump runways)
  for (let i = 0; i < 48; i++) {
    const seed1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const r1 = seed1 - Math.floor(seed1);
    const seed2 = Math.sin(i * 93.9898 + 67.345) * 23421.631;
    const r2 = seed2 - Math.floor(seed2);

    const side = r1 > 0.5 ? 1 : -1;
    const x = side * (24 + r1 * 80);
    const z = -210 + r2 * 420;

    // Filter out boulders from jump flight lanes & runways
    if (
      (z >= -66 && z <= -18 && Math.abs(x) >= 12 && Math.abs(x) <= 72) ||
      (z >= 16 && z <= 76 && Math.abs(x) >= 12 && Math.abs(x) <= 72)
    ) {
      continue;
    }

    const scaleX = 1.3 + r2 * 2.4;
    const scaleY = 1.0 + r1 * 2.0;
    const scaleZ = 1.3 + (1 - r2) * 2.4;
    const radius = Math.max(scaleX, scaleZ) * 0.85;

    list.push({
      id: `rock_${i}`,
      type: 'rock',
      x,
      z,
      radius: Math.max(1.8, Math.min(3.2, radius)),
      scaleX,
      scaleY,
      scaleZ,
      rotation: (r1 + r2) * 3,
    });
  }

  // 4. Outpost Gate Towers at z: 220
  list.push(
    { id: 'tower_left', type: 'tower', x: -25, z: 220, radius: 3.2 },
    { id: 'tower_right', type: 'tower', x: 25, z: 220, radius: 3.2 }
  );

  // 5. Wasteland High-Rise & Industrial Mega-Structures (Taller Buildings on outer rim)
  list.push(
    { id: 'bldg_sw_comms', type: 'tall_building', x: -74, z: -90, radius: 5.8, height: 18, variant: 0, rotation: 0.2 },
    { id: 'bldg_se_refinery', type: 'tall_building', x: 74, z: -90, radius: 6.2, height: 16, variant: 1, rotation: -0.35 },
    { id: 'bldg_mw_tower', type: 'tall_building', x: -76, z: 0, radius: 6.5, height: 22, variant: 2, rotation: 0.15 },
    { id: 'bldg_me_power', type: 'tall_building', x: 76, z: 0, radius: 6.0, height: 17, variant: 0, rotation: -0.2 },
    { id: 'bldg_nw_bastion', type: 'tall_building', x: -74, z: 110, radius: 6.2, height: 20, variant: 1, rotation: 0.4 },
    { id: 'bldg_ne_hab', type: 'tall_building', x: 74, z: 110, radius: 6.5, height: 19, variant: 2, rotation: -0.5 }
  );

  // 6. Two-Way Stunt Jump Ramps facing BOTH North and South across River and Ravine
  list.push(
    // === RIVER CROSSING (z ≈ -44) ===
    // Northbound River Ramps (launch North +Z across river from South bank)
    { id: 'ramp_river_w_north', type: 'jump_ramp', x: -18, z: -58, radius: 6.5, rotation: 0, height: 2.8 },
    { id: 'ramp_river_e_north', type: 'jump_ramp', x: 18, z: -58, radius: 6.5, rotation: 0, height: 2.8 },
    { id: 'ramp_river_outer_w_north', type: 'jump_ramp', x: -48, z: -58, radius: 6.5, rotation: 0.08, height: 3.2 },
    { id: 'ramp_river_outer_e_north', type: 'jump_ramp', x: 48, z: -58, radius: 6.5, rotation: -0.08, height: 3.2 },

    // Southbound River Ramps (launch South -Z across river from North bank)
    { id: 'ramp_river_w_south', type: 'jump_ramp', x: -32, z: -30, radius: 6.5, rotation: Math.PI, height: 2.8 },
    { id: 'ramp_river_e_south', type: 'jump_ramp', x: 32, z: -30, radius: 6.5, rotation: Math.PI, height: 2.8 },
    { id: 'ramp_river_outer_w_south', type: 'jump_ramp', x: -62, z: -30, radius: 6.5, rotation: Math.PI - 0.08, height: 3.2 },
    { id: 'ramp_river_outer_e_south', type: 'jump_ramp', x: 62, z: -30, radius: 6.5, rotation: Math.PI + 0.08, height: 3.2 },

    // === DEEP RAVINE GORGE (z ≈ 46, plunging 14m down) ===
    // Northbound Ravine Ramps (launch North +Z across deep gorge from South rim)
    { id: 'ramp_ravine_w_north', type: 'jump_ramp', x: -18, z: 22, radius: 6.5, rotation: 0, height: 3.8 },
    { id: 'ramp_ravine_e_north', type: 'jump_ramp', x: 18, z: 22, radius: 6.5, rotation: 0, height: 3.8 },
    { id: 'ramp_ravine_outer_w_north', type: 'jump_ramp', x: -50, z: 22, radius: 6.5, rotation: 0.06, height: 4.2 },
    { id: 'ramp_ravine_outer_e_north', type: 'jump_ramp', x: 50, z: 22, radius: 6.5, rotation: -0.06, height: 4.2 },

    // Southbound Ravine Ramps (launch South -Z across deep gorge from North rim)
    { id: 'ramp_ravine_w_south', type: 'jump_ramp', x: -34, z: 70, radius: 6.5, rotation: Math.PI, height: 3.8 },
    { id: 'ramp_ravine_e_south', type: 'jump_ramp', x: 34, z: 70, radius: 6.5, rotation: Math.PI, height: 3.8 },
    { id: 'ramp_ravine_outer_w_south', type: 'jump_ramp', x: -66, z: 70, radius: 6.5, rotation: Math.PI - 0.06, height: 4.2 },
    { id: 'ramp_ravine_outer_e_south', type: 'jump_ramp', x: 66, z: 70, radius: 6.5, rotation: Math.PI + 0.06, height: 4.2 }
  );

  return list;
}

export const TERRAIN_OBSTACLES: TerrainObstacle[] = createTerrainObstacles();
export function getTerrainObstacles(): TerrainObstacle[] {
  return TERRAIN_OBSTACLES;
}

// Surface elevation accounting for natural terrain contour plus 3D stunt jump ramps
export function getSurfaceHeight(x: number, z: number): number {
  let h = getTerrainHeight(x, z);

  // Check if position is on any jump ramp deck
  for (const obs of TERRAIN_OBSTACLES) {
    if (obs.type !== 'jump_ramp') continue;
    const dx = x - obs.x;
    const dz = z - obs.z;
    if (Math.abs(dx) > 10 || Math.abs(dz) > 14) continue;

    const rot = obs.rotation || 0;
    const cosR = Math.cos(-rot);
    const sinR = Math.sin(-rot);
    const localX = dx * cosR - dz * sinR;
    const localZ = dx * sinR + dz * cosR;

    const rampW = 12.0;
    const rampL = 9.0;
    const rampH = obs.height || 2.8;

    // Check bounds on the ramp deck
    if (Math.abs(localX) <= rampW * 0.5 && localZ >= -0.8 && localZ <= rampL * 0.98) {
      const t = Math.max(0, Math.min(1, (localZ + 0.4) / (rampL * 0.92)));
      const rampBaseY = getTerrainHeight(obs.x, obs.z);
      const deckY = rampBaseY + t * rampH;
      if (deckY > h) {
        h = deckY;
      }
    }
  }

  return h;
}

export function createSpikePits(): SpikePit[] {
  return [
    { id: 'pit_center_w', x: -22, z: 0, radius: 4.5 },
    { id: 'pit_center_e', x: 22, z: 0, radius: 4.5 },
    { id: 'pit_south_choke', x: -16, z: -125, radius: 4.2 },
    { id: 'pit_north_choke', x: 16, z: 145, radius: 4.2 },
  ];
}

export function createBoostMats(): BoostMat[] {
  return [];
}

export function createShieldPickups(): ShieldPickup[] {
  const coords: [number, number][] = [
    [-24, -10],
    [24, 10],
    [0, -150],
    [0, 150],
    [-44, 35],
    [44, -35],
  ];

  return coords.map(([x, z], idx) => ({
    id: `shield_${idx + 1}`,
    x,
    y: getTerrainHeight(x, z) + 1.2,
    z,
    active: true,
    respawnTimer: 0,
  }));
}

export function createScrapCaches(): ScrapCache[] {
  const coords: [number, number, number][] = [
    [0, 0, 25],          // Central Arena
    [0, -40, 25],        // South Midline
    [0, 40, 25],         // North Midline
    [-35, -125, 25],     // Dusty Ridge Settlement
    [38, -55, 25],       // Scrap Oasis Settlement
    [-38, 40, 25],       // Rustwater Depot Settlement
    [38, 145, 25],       // Outpost Approach Settlement
    [-24, -45, 25],      // West Dune Gap
    [24, 45, 25],        // East Dune Gap
    [-45, 0, 50],        // West Flank High Value Cache (50 pts)
    [45, 0, 50],         // East Flank High Value Cache (50 pts)
    [0, -90, 25],        // South Jump Ramp
    [0, 90, 25],         // North Jump Ramp
  ];

  return coords.map(([x, z, val], idx) => ({
    id: `scrap_${idx + 1}`,
    x,
    y: getTerrainHeight(x, z) + 1.2,
    z,
    value: val,
    active: true,
    respawnTimer: 0,
  }));
}

function createVehicle(
  playerId: PlayerId,
  nickname: string,
  team: Team,
  role: VehicleRole,
  random: () => number,
  mode: GameMode = 'point_battle'
): VehicleState {
  let spawnX = 0;
  let spawnZ = -100;
  let yaw = 0;
  let maxHp = 350;

  if (mode === 'point_battle') {
    maxHp = 350;
    if (team === 'convoy') {
      spawnX = (random() - 0.5) * 60;
      spawnZ = -100 + (random() - 0.5) * 30;
      yaw = 0; // heading North towards central arena
    } else {
      spawnX = (random() - 0.5) * 60;
      spawnZ = 100 + (random() - 0.5) * 30;
      yaw = Math.PI; // heading South towards central arena
    }
  } else {
    // Convoy mode
    if (role === 'rig') {
      spawnX = 0;
      spawnZ = -180;
      yaw = 0;
      maxHp = 4500;
    } else if (role === 'support') {
      spawnX = (random() > 0.5 ? 1 : -1) * (15 + random() * 15);
      spawnZ = -180 + (random() - 0.5) * 20;
      yaw = 0;
      maxHp = 350;
    } else {
      spawnX = (random() - 0.5) * 120;
      spawnZ = -80 + (random() - 0.5) * 80;
      yaw = Math.PI;
      maxHp = 320;
    }
  }

  // Ensure initial spawn does not overlap directly with static obstacles
  for (const obs of TERRAIN_OBSTACLES) {
    if (obs.type === 'jump_ramp') continue;
    if (Math.hypot(spawnX - obs.x, spawnZ - obs.z) < obs.radius + 3.0) {
      spawnX += (spawnX >= obs.x ? 1 : -1) * (obs.radius + 4.0);
    }
  }

  const spawnY = getTerrainHeight(spawnX, spawnZ);

  const weapons: WeaponType[] = ['twin_cannon', 'homing_missile', 'shotgun_spread'];
  const weapon: WeaponType = playerId.startsWith('ai_')
    ? (weapons[Math.floor(random() * weapons.length)] || 'twin_cannon')
    : 'twin_cannon';

  return {
    playerId,
    nickname,
    team,
    role,
    x: spawnX,
    y: spawnY,
    z: spawnZ,
    yaw,
    pitch: 0,
    roll: 0,
    speed: 0,
    vy: 0,
    hp: maxHp,
    maxHp,
    alive: true,
    isGrounded: true,
    kills: 0,
    shootCooldown: 0,
    lastDamageTime: 0,
    boostCooldown: 0,
    boostActiveTimer: 0,
    boostFuel: 2.5,
    boostHolding: false,
    respawnTimer: 0,
    respawnsLeft: role === 'rig' ? 0 : 3,
    weapon,
    boostMatCooldown: 0,
  };
}

function ensureBotBalance(state: ConvoyRaidState, random: () => number, inheritRigPos?: { x: number; z: number }) {
  if (state.gameMode === 'point_battle') {
    // 1. Remove War Rig in point battle mode
    for (const [pid, v] of Object.entries(state.vehicles)) {
      if (v.role === 'rig') {
        delete state.vehicles[pid];
      }
    }

    // 2. Count Blue vehicles (convoy team)
    const blueVehicles = Object.values(state.vehicles).filter((v) => v.team === 'convoy');
    const neededBlue = Math.max(0, 3 - blueVehicles.length);
    const blueBotNames = ['Enforcer Apex', 'Enforcer Bolt', 'Enforcer Drift', 'Enforcer Stryker'];
    for (let b = 0; b < neededBlue; b++) {
      const botId = `ai_blue_${b + 1}`;
      if (!state.vehicles[botId]) {
        state.vehicles[botId] = createVehicle(
          botId,
          blueBotNames[b] || `Enforcer ${b + 1}`,
          'convoy',
          'support',
          random,
          'point_battle'
        );
      }
    }

    // 3. Count Red vehicles (raiders team)
    const redVehicles = Object.values(state.vehicles).filter((v) => v.team === 'raiders');
    const neededRed = Math.max(0, 3 - redVehicles.length);
    const redBotNames = ['Raider Rust', 'Raider Scab', 'Raider Vulture', 'Raider Fang'];
    for (let b = 0; b < neededRed; b++) {
      const botId = `ai_red_${b + 1}`;
      if (!state.vehicles[botId]) {
        state.vehicles[botId] = createVehicle(
          botId,
          redBotNames[b] || `Raider ${b + 1}`,
          'raiders',
          'raider',
          random,
          'point_battle'
        );
      }
    }
    return;
  }

  // Convoy mode: 1. Ensure a Big Rig always exists
  const hasRig = Object.values(state.vehicles).some((v) => v.role === 'rig');
  if (!hasRig) {
    const rigId = 'ai_war_rig';
    const newRig = createVehicle(rigId, 'War Rig (AI)', 'convoy', 'rig', random, 'convoy');
    if (inheritRigPos) {
      newRig.x = inheritRigPos.x;
      newRig.z = inheritRigPos.z;
      newRig.y = getTerrainHeight(newRig.x, newRig.z);
    }
    state.vehicles[rigId] = newRig;
  }

  // 2. Count living raiders
  const raiders = Object.values(state.vehicles).filter((v) => v.team === 'raiders');
  const neededRaiders = Math.max(0, 3 - raiders.length);
  const botNames = ['Raider Rust', 'Raider Scab', 'Raider Vulture'];

  for (let b = 0; b < neededRaiders; b++) {
    const botId = `ai_raider_${b + 1}`;
    if (!state.vehicles[botId]) {
      state.vehicles[botId] = createVehicle(
        botId,
        botNames[b] || `Raider ${b + 1}`,
        'raiders',
        'raider',
        random,
        'convoy'
      );
    }
  }

  // 3. If human is a raider, ensure there's at least 1 Convoy Escort defending the Rig
  const isHumanRaider = Object.values(state.vehicles).some(
    (v) => !v.playerId.startsWith('ai_') && v.team === 'raiders'
  );
  const hasEscort = Object.values(state.vehicles).some((v) => v.role === 'support');
  if (isHumanRaider && !hasEscort) {
    const escortId = 'ai_escort_1';
    state.vehicles[escortId] = createVehicle(
      escortId,
      'Escort Buggy (AI)',
      'convoy',
      'support',
      random,
      'convoy'
    );
  }
}

function respawnVehicle(v: VehicleState, random: () => number, mode: GameMode, rigZ: number = -100) {
  v.alive = true;
  v.hp = v.maxHp;
  v.speed = 0;
  v.vy = 0;
  v.pitch = 0;
  v.roll = 0;
  v.boostCooldown = 0;
  v.boostActiveTimer = 0;
  v.boostFuel = 2.5;
  v.boostHolding = false;
  (v as any).boostMatTimer = 0;
  v.respawnTimer = 0;

  if (mode === 'point_battle') {
    if (v.team === 'convoy') {
      v.x = (random() - 0.5) * 60;
      v.z = -100 - random() * 20;
      v.yaw = 0;
    } else {
      v.x = (random() - 0.5) * 60;
      v.z = 100 + random() * 20;
      v.yaw = Math.PI;
    }
  } else {
    if (v.team === 'raiders') {
      v.x = (random() - 0.5) * 110;
      v.z = Math.min(DESTINATION_Z - 30, rigZ + 55 + random() * 45);
      v.yaw = Math.PI;
    } else {
      v.x = (random() > 0.5 ? 1 : -1) * (16 + random() * 14);
      v.z = rigZ - 20 - random() * 15;
      v.yaw = 0;
    }
  }

  for (const obs of TERRAIN_OBSTACLES) {
    if (obs.type === 'jump_ramp') continue;
    if (Math.hypot(v.x - obs.x, v.z - obs.z) < obs.radius + 3.0) {
      v.x += (v.x >= obs.x ? 1 : -1) * (obs.radius + 4.0);
    }
  }
  v.y = getTerrainHeight(v.x, v.z);
}

function handleVehicleDestruction(
  victim: VehicleState,
  attacker: VehicleState | null,
  state: ConvoyRaidState,
  cause: string
) {
  if (victim.hp > 0 || !victim.alive) return;

  victim.alive = false;
  victim.speed = 0;
  victim.vy = 0;

  if (victim.respawnsLeft > 0) {
    victim.respawnTimer = state.gameMode === 'point_battle' ? 3.5 : 4.5;
  } else {
    victim.respawnTimer = 0;
  }

  if (attacker) {
    attacker.kills++;
    if (state.gameMode === 'point_battle') {
      state.teamScores[attacker.team] = (state.teamScores[attacker.team] || 0) + 100;
      state.scores[attacker.playerId] = (state.scores[attacker.playerId] || 0) + 100;
    }
  }

  const livesRemaining = victim.respawnsLeft;
  const livesMsg = victim.role === 'rig'
    ? 'THE WAR RIG HAS FALLEN!'
    : livesRemaining > 0
    ? `(${livesRemaining} respawn${livesRemaining === 1 ? '' : 's'} remaining)`
    : '(OUT OF RESPAWNS - ELIMINATED)';

  if (attacker) {
    const tName = attacker.team === 'convoy' ? 'Blue' : 'Red';
    const ptsMsg = state.gameMode === 'point_battle' ? ` (+100 PTS for Team ${tName})` : '';
    state.recentEvent = `${attacker.nickname} ${cause} ${victim.nickname}! ${livesMsg}${ptsMsg}`;
  } else {
    state.recentEvent = `${victim.nickname} was destroyed! ${livesMsg}`;
  }
}

export const convoyRaidGame = defineGame<ConvoyRaidState, ConvoyRaidAction, any>({
  id: 'convoy-raid',
  name: 'Battle Cars (3D Wasteland)',
  description: 'Two teams of battle cars playing for points! Twin cannons, nitro boost, scrap salvage, and Big Rig convoy mode.',
  players: { min: 1, max: 10 },

  setup(ctx): ConvoyRaidState {
    const vehicles: Record<PlayerId, VehicleState> = {};
    const scores: Record<PlayerId, number> = {};

    const seated = ctx.seats.filter((s) => s.playerId);
    seated.forEach((seat, idx) => {
      const pid = seat.playerId!;
      scores[pid] = seat.scoreOrChips ?? 1000;

      // Default human players to shooting cars (Blue Enforcer vs Red Raider)
      const isRaider = idx % 2 === 1;
      const team: Team = isRaider ? 'raiders' : 'convoy';
      const role: VehicleRole = isRaider ? 'raider' : 'support';

      vehicles[pid] = createVehicle(pid, seat.nickname || `Driver ${idx + 1}`, team, role, ctx.random, 'point_battle');
    });

    const state: ConvoyRaidState = {
      gameMode: 'point_battle',
      vehicles,
      bullets: [],
      scrapCaches: createScrapCaches(),
      spikePits: createSpikePits(),
      boostMats: createBoostMats(),
      shieldPickups: createShieldPickups(),
      roundTimeLeft: 240, // 4-minute round
      status: 'running',
      destinationZ: DESTINATION_Z,
      winnerTeam: null,
      scores,
      teamScores: { convoy: 0, raiders: 0 },
      targetScore: 1500,
      recentEvent: 'Match started! 3 Respawns per driver. First team to 1500 PTS or knockout wins!',
    };

    // Auto-balance with bots for single player or uneven games
    ensureBotBalance(state, ctx.random);

    return state;
  },

  processAction(state, action, playerId, ctx) {
    if (!action) return { valid: false, error: 'No action' };

    let vehicle = state.vehicles[playerId];

    if (action.type === 'set_game_mode') {
      state.gameMode = action.mode;
      state.teamScores = { convoy: 0, raiders: 0 };
      state.roundTimeLeft = action.mode === 'point_battle' ? 240 : 180;
      state.targetScore = 1500;
      state.status = 'running';
      state.winnerTeam = null;
      state.bullets = [];
      state.scrapCaches = createScrapCaches();
      state.spikePits = createSpikePits();
      state.boostMats = createBoostMats();
      state.shieldPickups = createShieldPickups();

      for (const [pid, v] of Object.entries(state.vehicles)) {
        if (!pid.startsWith('ai_')) {
          const seat = ctx.seats.find((s) => s.playerId === pid);
          state.vehicles[pid] = createVehicle(
            pid,
            seat?.nickname || v.nickname,
            v.team,
            v.role === 'rig' && action.mode === 'point_battle' ? 'support' : v.role,
            ctx.random,
            action.mode
          );
        } else {
          delete state.vehicles[pid];
        }
      }
      ensureBotBalance(state, ctx.random);
      state.recentEvent = `Game mode changed to ${action.mode === 'point_battle' ? 'Team Point Battle' : 'Big Rig Escort'}!`;
      return { valid: true, nextState: { ...state } };
    }

    if (action.type === 'restart_round') {
      state.teamScores = { convoy: 0, raiders: 0 };
      state.roundTimeLeft = state.gameMode === 'point_battle' ? 240 : 180;
      state.targetScore = 1500;
      state.status = 'running';
      state.winnerTeam = null;
      state.bullets = [];
      state.scrapCaches = createScrapCaches();
      state.spikePits = createSpikePits();
      state.boostMats = createBoostMats();
      state.shieldPickups = createShieldPickups();

      for (const [pid, v] of Object.entries(state.vehicles)) {
        if (!pid.startsWith('ai_')) {
          const seat = ctx.seats.find((s) => s.playerId === pid);
          state.vehicles[pid] = createVehicle(
            pid,
            seat?.nickname || v.nickname,
            v.team,
            v.role === 'rig' && state.gameMode === 'point_battle' ? 'support' : v.role,
            ctx.random,
            state.gameMode
          );
        } else {
          delete state.vehicles[pid];
        }
      }
      ensureBotBalance(state, ctx.random);
      state.recentEvent = 'Round restarted! 3 Respawns per driver. Engage!';
      return { valid: true, nextState: { ...state } };
    }

    // If player doesn't have a vehicle yet (e.g. joined mid-game)
    if (!vehicle && action.type === 'select_role') {
      const seat = ctx.seats.find((s) => s.playerId === playerId);
      vehicle = createVehicle(
        playerId,
        seat?.nickname || 'Wastelander',
        action.team,
        state.gameMode === 'point_battle' ? (action.team === 'convoy' ? 'support' : 'raider') : action.role,
        ctx.random,
        state.gameMode
      );
      state.vehicles[playerId] = vehicle;
      ensureBotBalance(state, ctx.random);
      return { valid: true, nextState: { ...state } };
    }

    if (!vehicle) return { valid: false, error: 'Vehicle not found' };

    if (action.type === 'select_role') {
      if (state.gameMode === 'convoy' && action.role === 'rig') {
        return { valid: false, error: 'The War Rig is automated! Players drive Escort or Raider buggies.' };
      }

      vehicle.team = action.team;
      vehicle.role = state.gameMode === 'point_battle' ? (action.team === 'convoy' ? 'support' : 'raider') : action.role;
      vehicle.maxHp = vehicle.role === 'raider' ? 320 : 350;
      vehicle.hp = vehicle.maxHp;
      vehicle.alive = true;
      vehicle.speed = 0;
      vehicle.vy = 0;
      vehicle.respawnTimer = 0;
      vehicle.pitch = 0;
      vehicle.roll = 0;

      if (state.gameMode === 'point_battle') {
        if (action.team === 'convoy') {
          vehicle.x = (Math.random() - 0.5) * 40;
          vehicle.z = -100 - Math.random() * 20;
          vehicle.yaw = 0;
        } else {
          vehicle.x = (Math.random() - 0.5) * 40;
          vehicle.z = 100 + Math.random() * 20;
          vehicle.yaw = Math.PI;
        }
      } else {
        const rig = Object.values(state.vehicles).find((v) => v.role === 'rig');
        const rigZ = rig ? rig.z : -160;
        if (action.role === 'support') {
          vehicle.x = (Math.random() > 0.5 ? 1 : -1) * 18;
          vehicle.z = rigZ - 10;
          vehicle.yaw = 0;
        } else {
          vehicle.x = (Math.random() - 0.5) * 60;
          vehicle.z = Math.min(DESTINATION_Z - 30, rigZ + 50);
          vehicle.yaw = Math.PI;
        }
      }
      vehicle.y = getTerrainHeight(vehicle.x, vehicle.z);

      ensureBotBalance(state, ctx.random);
      return { valid: true, nextState: { ...state } };
    }

    if (action.type === 'respawn') {
      if (vehicle && !vehicle.alive && vehicle.role !== 'rig' && vehicle.respawnsLeft > 0) {
        vehicle.respawnsLeft--;
        const rig = Object.values(state.vehicles).find((other) => other.role === 'rig');
        respawnVehicle(vehicle, ctx.random, state.gameMode, rig ? rig.z : -100);
        state.recentEvent = `${vehicle.nickname} returned to the fight! (${vehicle.respawnsLeft} lives left)`;
      }
      return { valid: true, nextState: { ...state } };
    }

    if (!vehicle.alive) {
      return { valid: false, error: 'Vehicle destroyed' };
    }

    if (action.type === 'control') {
      const { throttle, steer, boost } = action;

      if (vehicle.role !== 'rig' && boost !== undefined) {
        vehicle.boostHolding = !!boost;
      }

      // Parameters depending on vehicle type: Buggies are faster, agile & drift
      const isRig = vehicle.role === 'rig';
      const isBoosting = (vehicle.boostActiveTimer || 0) > 0;
      const accelRate = isRig ? 8.0 : (isBoosting ? 48.0 : 32.0);
      const maxSpeed = isRig ? 16.0 : (isBoosting ? 64.0 : 36.0);
      const turnRate = isRig ? 1.2 : 3.2;

      // Clamp input
      const t = Math.max(-1, Math.min(1, throttle || 0));
      const s = Math.max(-1, Math.min(1, steer || 0));

      // Accelerate / brake
      if (t > 0) {
        vehicle.speed = Math.min(maxSpeed, vehicle.speed + accelRate * 0.05 * t);
      } else if (t < 0) {
        vehicle.speed = Math.max(-maxSpeed * 0.4, vehicle.speed + accelRate * 0.08 * t);
      } else {
        // Natural friction rolling deceleration
        vehicle.speed *= (isBoosting ? 0.98 : 0.94);
      }

      // Steer only when moving (steer -1 = left, steer +1 = right)
      if (Math.abs(vehicle.speed) > 0.5) {
        const dir = vehicle.speed > 0 ? 1 : -1;
        vehicle.yaw -= s * turnRate * 0.05 * dir;
      }

      return { valid: true, nextState: { ...state } };
    }

    if (action.type === 'select_weapon') {
      if (vehicle.role === 'rig') {
        return { valid: false, error: 'The Big Rig has no weapons!' };
      }
      vehicle.weapon = action.weapon;
      return { valid: true, nextState: { ...state } };
    }

    if (action.type === 'shoot') {
      // Big Rig CANNOT shoot
      if (vehicle.role === 'rig') {
        return { valid: false, error: 'Big Rig cannot shoot!' };
      }

      if (vehicle.shootCooldown <= 0) {
        const currentY = (typeof action.y === 'number' && Number.isFinite(action.y) && Math.abs(action.y - vehicle.y) < 15.0)
          ? action.y
          : vehicle.y;
        const currentPitch = (typeof action.pitch === 'number' && Number.isFinite(action.pitch))
          ? action.pitch
          : (vehicle.pitch || 0);

        const pitchCos = Math.cos(currentPitch);
        const pitchSin = Math.sin(-currentPitch);
        const forwardX = Math.sin(vehicle.yaw);
        const forwardZ = Math.cos(vehicle.yaw);
        const rightX = Math.cos(vehicle.yaw);
        const rightZ = -Math.sin(vehicle.yaw);

        const fX = forwardX * pitchCos;
        const fY = pitchSin;
        const fZ = forwardZ * pitchCos;

        const inheritedVy = vehicle.isGrounded ? 0 : (vehicle.vy || 0) * 0.4;

        if (vehicle.weapon === 'homing_missile') {
          // Homing Missile with 1.4s cooldown (shortened from 3.0s)
          vehicle.shootCooldown = 1.4;
          const bulletSpeed = 75.0 + Math.max(0, vehicle.speed * 0.4);

          // Find optimal target in front cone or nearest enemy
          const enemies = Object.values(state.vehicles).filter((v) => v.alive && v.team !== vehicle.team);
          let bestTarget: VehicleState | null = null;
          let bestScore = 999999;
          for (const en of enemies) {
            const dx = en.x - vehicle.x;
            const dz = en.z - vehicle.z;
            const d = Math.hypot(dx, dz);
            const angleTo = Math.atan2(dx, dz);
            let diff = angleTo - vehicle.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const score = d + Math.abs(diff) * 35;
            if (score < bestScore) {
              bestScore = score;
              bestTarget = en;
            }
          }

          state.bullets.push({
            id: Math.random().toString(36).slice(2, 9),
            ownerId: playerId,
            team: vehicle.team,
            x: vehicle.x + fX * 2.2,
            y: currentY + 1.2 + fY * 2.2,
            z: vehicle.z + fZ * 2.2,
            vx: fX * bulletSpeed,
            vy: fY * bulletSpeed + inheritedVy,
            vz: fZ * bulletSpeed,
            life: 3.2,
            type: 'missile',
            targetId: bestTarget ? bestTarget.playerId : undefined,
          });
        } else if (vehicle.weapon === 'shotgun_spread') {
          // 4-Shot Spreading Flak Cannon (0.65s cooldown)
          vehicle.shootCooldown = 0.65;
          const bulletSpeed = 95.0 + Math.max(0, vehicle.speed);
          const spreadAngles = [-0.22, -0.07, 0.07, 0.22];

          for (const spread of spreadAngles) {
            const ang = vehicle.yaw + spread;
            const vx = Math.sin(ang) * pitchCos * bulletSpeed;
            const vz = Math.cos(ang) * pitchCos * bulletSpeed;
            const vy = fY * bulletSpeed + inheritedVy;
            state.bullets.push({
              id: Math.random().toString(36).slice(2, 9),
              ownerId: playerId,
              team: vehicle.team,
              x: vehicle.x + Math.sin(ang) * 2.0,
              y: currentY + 0.9 + fY * 2.0,
              z: vehicle.z + Math.cos(ang) * 2.0,
              vx,
              vy,
              vz,
              life: 1.1,
              type: 'spread',
            });
          }
        } else {
          // Twin Autocannons (0.20s rapid burst)
          vehicle.shootCooldown = 0.20;
          const bulletSpeed = 100.0 + Math.max(0, vehicle.speed);
          const leftOffset = -0.9;
          const rightOffset = 0.9;

          for (const offset of [leftOffset, rightOffset]) {
            const bx = vehicle.x + fX * 2.0 + rightX * offset;
            const bz = vehicle.z + fZ * 2.0 + rightZ * offset;
            const by = currentY + 0.9 + fY * 2.0;

            state.bullets.push({
              id: Math.random().toString(36).slice(2, 9),
              ownerId: playerId,
              team: vehicle.team,
              x: bx,
              y: by,
              z: bz,
              vx: fX * bulletSpeed,
              vy: fY * bulletSpeed + inheritedVy,
              vz: fZ * bulletSpeed,
              life: 1.5,
              type: 'bullet',
            });
          }
        }
      }
      return { valid: true, nextState: { ...state } };
    }

    if (action.type === 'boost') {
      if (vehicle.role === 'rig') {
        return { valid: false, error: 'The Big Rig has no Nitro Boost!' };
      }
      if (action.active !== undefined) {
        vehicle.boostHolding = action.active;
      } else {
        if (vehicle.boostCooldown <= 0) {
          vehicle.boostHolding = !vehicle.boostHolding;
        }
      }
      return { valid: true, nextState: { ...state } };
    }

    return { valid: false, error: 'Unknown action' };
  },

  tick(state, dtMs, ctx) {
    if (state.status !== 'running') return state;
    const rng = ctx?.random || Math.random;

    const dt = Math.max(0.001, Math.min(0.1, (Number(dtMs) || 50) / 1000));
    state.roundTimeLeft = Math.max(0, state.roundTimeLeft - dt);

    const vehicles = Object.values(state.vehicles);

    // 0. Update Pickups (Scrap Caches & Shield Replenishments)
    for (const sc of state.scrapCaches) {
      if (!sc.active) {
        sc.respawnTimer -= dt;
        if (sc.respawnTimer <= 0) {
          sc.active = true;
          sc.respawnTimer = 0;
        }
        continue;
      }

      for (const v of vehicles) {
        if (!v.alive) continue;
        const distSq = (v.x - sc.x) ** 2 + (v.z - sc.z) ** 2;
        if (distSq < 4.5 * 4.5) {
          sc.active = false;
          sc.respawnTimer = 12.0; // 12 seconds to respawn
          state.teamScores[v.team] = (state.teamScores[v.team] || 0) + sc.value;
          state.scores[v.playerId] = (state.scores[v.playerId] || 0) + sc.value;
          const tName = v.team === 'convoy' ? 'Blue' : 'Red';
          state.recentEvent = `${v.nickname} collected +${sc.value} Scrap for Team ${tName}!`;
          break;
        }
      }
    }

    // Shield Replenishments
    for (const sp of state.shieldPickups) {
      if (!sp.active) {
        sp.respawnTimer -= dt;
        if (sp.respawnTimer <= 0) {
          sp.active = true;
          sp.respawnTimer = 0;
        }
        continue;
      }

      for (const v of vehicles) {
        if (!v.alive) continue;
        const distSq = (v.x - sp.x) ** 2 + (v.z - sp.z) ** 2;
        if (distSq < 4.5 * 4.5 && v.hp < v.maxHp) {
          const healed = Math.min(v.maxHp - v.hp, 90);
          v.hp = Math.min(v.maxHp, v.hp + 90);
          sp.active = false;
          sp.respawnTimer = 14.0;
          state.recentEvent = `${v.nickname} collected Shield Replenishment (+${Math.round(healed)} HP)!`;
          break;
        }
      }
    }

    // 1. AI Autonomous Driving & Combat / Respawns
    for (const v of vehicles) {
      const isBot = v.playerId.startsWith('ai_');
      if (!v.alive && v.role !== 'rig') {
        if (v.respawnsLeft > 0) {
          const cooldown = state.gameMode === 'point_battle' ? 3.0 : 4.5;
          v.respawnTimer = (v.respawnTimer > 0 ? v.respawnTimer : cooldown) - dt;
          if (v.respawnTimer <= 0) {
            v.respawnsLeft--;
            const rig = Object.values(state.vehicles).find((other) => other.role === 'rig');
            respawnVehicle(v, rng, state.gameMode, rig ? rig.z : -100);
            state.recentEvent = `${v.nickname} respawned! (${v.respawnsLeft} lives left)`;
          }
        }
        continue;
      }

      if (!isBot) continue;

      if (state.gameMode === 'point_battle') {
        // Point Battle Bot AI: Hunt enemies or scavenge scrap
        const enemies = vehicles.filter((e) => e.team !== v.team && e.alive);
        let nearestEnemy: VehicleState | null = null;
        let minDist = 999999;
        for (const e of enemies) {
          const d = Math.hypot(e.x - v.x, e.z - v.z);
          if (d < minDist) {
            minDist = d;
            nearestEnemy = e;
          }
        }

        // Divert to active scrap cache if nearby (< 28m)
        let scrapTarget: ScrapCache | null = null;
        let minScrapDist = 28;
        for (const sc of state.scrapCaches) {
          if (!sc.active) continue;
          const sd = Math.hypot(sc.x - v.x, sc.z - v.z);
          if (sd < minScrapDist) {
            minScrapDist = sd;
            scrapTarget = sc;
          }
        }

        let targetX = v.x;
        let targetZ = v.z;

        if (scrapTarget && minScrapDist < 20) {
          targetX = scrapTarget.x;
          targetZ = scrapTarget.z;
        } else if (nearestEnemy) {
          const botNum = parseInt(v.playerId.replace(/\D/g, '') || '1', 10);
          const flankDir = botNum % 2 === 0 ? 1 : -1;
          if (minDist < 25) {
            targetX = nearestEnemy.x + flankDir * 16;
            targetZ = nearestEnemy.z + (botNum % 3 === 0 ? -10 : 10);
          } else {
            targetX = nearestEnemy.x;
            targetZ = nearestEnemy.z;
          }
        } else {
          targetX = (Math.random() - 0.5) * 40;
          targetZ = (Math.random() - 0.5) * 40;
        }

        let targetYaw = Math.atan2(targetX - v.x, targetZ - v.z);

        // Obstacle avoidance (skip jump ramps so bots can drive over ramps)
        for (const obs of TERRAIN_OBSTACLES) {
          if (obs.type === 'jump_ramp') continue;
          const dObsX = obs.x - v.x;
          const dObsZ = obs.z - v.z;
          if (Math.abs(dObsX) > 16 || Math.abs(dObsZ) > 16) continue;
          const obsDist = Math.hypot(dObsX, dObsZ);
          if (obsDist < obs.radius + 7.0 && obsDist > 0.1) {
            const angleToObs = Math.atan2(dObsX, dObsZ);
            let relAngle = angleToObs - v.yaw;
            while (relAngle > Math.PI) relAngle -= Math.PI * 2;
            while (relAngle < -Math.PI) relAngle += Math.PI * 2;
            if (Math.abs(relAngle) < 0.95) {
              targetYaw += relAngle >= 0 ? -1.1 : 1.1;
            }
          }
        }

        let yawDiff = targetYaw - v.yaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

        v.yaw += Math.max(-2.8 * dt, Math.min(2.8 * dt, yawDiff));

        let desiredSpeed = 26.0;
        if (minDist > 45.0) {
          desiredSpeed = 34.0;
          if (v.boostCooldown <= 0 && Math.abs(yawDiff) < 0.35) {
            v.boostCooldown = 5.0;
            (v as any).botBoostTimer = 1.6;
            v.boostActiveTimer = 1.6;
            v.speed = Math.min(38.0, v.speed + 12.0);
          }
        } else if (minDist < 12.0) {
          desiredSpeed = 18.0;
        }
        v.speed += Math.max(-14.0 * dt, Math.min(18.0 * dt, desiredSpeed - v.speed));

        // Bot weapons fire
        if (nearestEnemy && minDist < 60.0 && v.shootCooldown <= 0) {
          const angleToEnemy = Math.atan2(nearestEnemy.x - v.x, nearestEnemy.z - v.z);
          let aimDiff = angleToEnemy - v.yaw;
          while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;
          while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;

          if (Math.abs(aimDiff) < 0.50) {
            const forwardX = Math.sin(v.yaw);
            const forwardZ = Math.cos(v.yaw);
            const rightX = Math.cos(v.yaw);
            const rightZ = -Math.sin(v.yaw);
            const pitchCos = Math.cos(v.pitch || 0);
            const pitchSin = Math.sin(-(v.pitch || 0));
            const fX = forwardX * pitchCos;
            const fY = pitchSin;
            const fZ = forwardZ * pitchCos;
            const inheritedVy = v.isGrounded ? 0 : (v.vy || 0) * 0.4;

            if (v.weapon === 'homing_missile') {
              v.shootCooldown = 1.6 + Math.random() * 0.4;
              const bulletSpeed = 75.0 + Math.max(0, v.speed * 0.4);
              state.bullets.push({
                id: Math.random().toString(36).slice(2, 9),
                ownerId: v.playerId,
                team: v.team,
                x: v.x + fX * 2.2,
                y: v.y + 1.2 + fY * 2.2,
                z: v.z + fZ * 2.2,
                vx: fX * bulletSpeed,
                vy: fY * bulletSpeed + inheritedVy,
                vz: fZ * bulletSpeed,
                life: 3.2,
                type: 'missile',
                targetId: nearestEnemy.playerId,
              });
            } else if (v.weapon === 'shotgun_spread') {
              v.shootCooldown = 1.3 + Math.random() * 0.4;
              const bulletSpeed = 90.0 + Math.max(0, v.speed);
              for (const spread of [-0.22, -0.07, 0.07, 0.22]) {
                const ang = v.yaw + spread;
                const vx = Math.sin(ang) * pitchCos * bulletSpeed;
                const vz = Math.cos(ang) * pitchCos * bulletSpeed;
                state.bullets.push({
                  id: Math.random().toString(36).slice(2, 9),
                  ownerId: v.playerId,
                  team: v.team,
                  x: v.x + Math.sin(ang) * 2.0,
                  y: v.y + 0.9 + fY * 2.0,
                  z: v.z + Math.cos(ang) * 2.0,
                  vx,
                  vy: fY * bulletSpeed + inheritedVy,
                  vz,
                  life: 1.1,
                  type: 'spread',
                });
              }
            } else {
              v.shootCooldown = 1.1 + Math.random() * 0.6;
              const bulletSpeed = 90.0 + Math.max(0, v.speed);
              for (const offset of [-0.85, 0.85]) {
                state.bullets.push({
                  id: Math.random().toString(36).slice(2, 9),
                  ownerId: v.playerId,
                  team: v.team,
                  x: v.x + fX * 2.0 + rightX * offset,
                  y: v.y + 0.9 + fY * 2.0,
                  z: v.z + fZ * 2.0 + rightZ * offset,
                  vx: fX * bulletSpeed,
                  vy: fY * bulletSpeed + inheritedVy,
                  vz: fZ * bulletSpeed,
                  life: 1.3,
                  type: 'bullet',
                });
              }
            }
          }
        }
      } else {
        // Convoy Escort mode bot logic
        if (v.role === 'rig') {
          const targetX = 0;
          const targetZ = DESTINATION_Z;
          const targetYaw = Math.atan2(targetX - v.x, targetZ - v.z);
          let yawDiff = targetYaw - v.yaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

          v.yaw += Math.max(-1.0 * dt, Math.min(1.0 * dt, yawDiff));
          v.speed = Math.min(15.0, v.speed + 8.0 * dt);
        } else if (v.role === 'raider') {
          const rig = Object.values(state.vehicles).find((other) => other.role === 'rig' && other.alive);
          if (rig) {
            const dxToRig = rig.x - v.x;
            const dzToRig = rig.z - v.z;
            const distToRig = Math.hypot(dxToRig, dzToRig);

            const botNum = parseInt(v.playerId.replace(/\D/g, '') || '1', 10);
            const flankSide = botNum % 2 === 1 ? -1 : 1;
            const lateralStandoff = 22.0 + (botNum % 3) * 4.0;
            const zOffset = (botNum === 3 ? -20.0 : (flankSide * 4.0)) + Math.sin(state.roundTimeLeft * 1.2 + botNum) * 6.0;

            let steerTargetX = rig.x + flankSide * lateralStandoff;
            let steerTargetZ = rig.z + zOffset;

            if (distToRig < 20.0) {
              const pushDirX = (v.x - rig.x) / (distToRig || 1);
              const pushDirZ = (v.z - rig.z) / (distToRig || 1);
              steerTargetX = v.x + pushDirX * 30.0;
              steerTargetZ = v.z + pushDirZ * 20.0;
            } else if (v.z > rig.z - 4.0 && Math.abs(v.x - rig.x) < 14.0) {
              steerTargetX = rig.x + flankSide * 28.0;
              steerTargetZ = v.z + 10.0;
            }

            let targetYaw = Math.atan2(steerTargetX - v.x, steerTargetZ - v.z);

            for (const obs of TERRAIN_OBSTACLES) {
              if (obs.type === 'jump_ramp') continue;
              const dObsX = obs.x - v.x;
              const dObsZ = obs.z - v.z;
              if (Math.abs(dObsX) > 16 || Math.abs(dObsZ) > 16) continue;
              const obsDist = Math.hypot(dObsX, dObsZ);
              if (obsDist < obs.radius + 7.0 && obsDist > 0.1) {
                const angleToObs = Math.atan2(dObsX, dObsZ);
                let relAngle = angleToObs - v.yaw;
                while (relAngle > Math.PI) relAngle -= Math.PI * 2;
                while (relAngle < -Math.PI) relAngle += Math.PI * 2;
                if (Math.abs(relAngle) < 0.95) {
                  targetYaw += relAngle >= 0 ? -1.1 : 1.1;
                }
              }
            }

            const angleToRig = Math.atan2(dxToRig, dzToRig);
            if (v.shootCooldown <= 0.35 && distToRig > 18.0 && distToRig < 55.0) {
              let aimDiff = angleToRig - targetYaw;
              while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;
              while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;
              targetYaw += aimDiff * 0.45;
            }

            let yawDiff = targetYaw - v.yaw;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

            v.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, yawDiff));

            let desiredSpeed = rig.speed;
            if (v.z < steerTargetZ - 8.0) {
              desiredSpeed = Math.min(26.0, rig.speed + 8.0);
            } else if (v.z > steerTargetZ + 8.0) {
              desiredSpeed = Math.max(8.0, rig.speed - 4.0);
            } else {
              desiredSpeed = Math.max(12.0, rig.speed + 1.0);
            }

            if (distToRig < 18.0) {
              desiredSpeed = Math.max(desiredSpeed, 20.0);
            }

            v.speed += Math.max(-12.0 * dt, Math.min(14.0 * dt, desiredSpeed - v.speed));

            let gunAimDiff = angleToRig - v.yaw;
            while (gunAimDiff > Math.PI) gunAimDiff -= Math.PI * 2;
            while (gunAimDiff < -Math.PI) gunAimDiff += Math.PI * 2;

            if (distToRig >= 16.0 && distToRig <= 55.0 && Math.abs(gunAimDiff) < 0.55 && v.shootCooldown <= 0) {
              v.shootCooldown = 1.8 + (botNum * 0.35) + (Math.abs(Math.sin(v.x)) * 0.5);
              const bulletSpeed = 85.0;
              const forwardX = Math.sin(v.yaw);
              const forwardZ = Math.cos(v.yaw);
              const rightX = Math.cos(v.yaw);
              const rightZ = -Math.sin(v.yaw);
              const pitchCos = Math.cos(v.pitch || 0);
              const pitchSin = Math.sin(-(v.pitch || 0));
              const fX = forwardX * pitchCos;
              const fY = pitchSin;
              const fZ = forwardZ * pitchCos;
              const inheritedVy = v.isGrounded ? 0 : (v.vy || 0) * 0.4;

              for (const offset of [-0.8, 0.8]) {
                state.bullets.push({
                  id: Math.random().toString(36).slice(2, 9),
                  ownerId: v.playerId,
                  team: 'raiders',
                  x: v.x + fX * 2.0 + rightX * offset,
                  y: v.y + 0.9 + fY * 2.0,
                  z: v.z + fZ * 2.0 + rightZ * offset,
                  vx: fX * bulletSpeed,
                  vy: fY * bulletSpeed + inheritedVy,
                  vz: fZ * bulletSpeed,
                  life: 1.2,
                });
              }
            }
          }
        } else if (v.role === 'support') {
          const nearestRaider = Object.values(state.vehicles).find(
            (other) => other.team === 'raiders' && other.alive
          );
          if (nearestRaider) {
            const dx = nearestRaider.x - v.x;
            const dz = nearestRaider.z - v.z;
            const dist = Math.hypot(dx, dz);
            const targetYaw = Math.atan2(dx, dz);

            let yawDiff = targetYaw - v.yaw;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

            v.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, yawDiff));
            v.speed = Math.min(25.0, v.speed + 16.0 * dt);

            if (dist < 55 && Math.abs(yawDiff) < 0.35 && v.shootCooldown <= 0) {
              v.shootCooldown = 1.4 + (Math.abs(Math.cos(v.z)) * 0.6);
              const bulletSpeed = 75.0;
              const forwardX = Math.sin(v.yaw);
              const forwardZ = Math.cos(v.yaw);
              const rightX = Math.cos(v.yaw);
              const rightZ = -Math.sin(v.yaw);
              const pitchCos = Math.cos(v.pitch || 0);
              const pitchSin = Math.sin(-(v.pitch || 0));
              const fX = forwardX * pitchCos;
              const fY = pitchSin;
              const fZ = forwardZ * pitchCos;
              const inheritedVy = v.isGrounded ? 0 : (v.vy || 0) * 0.4;

              for (const offset of [-0.8, 0.8]) {
                state.bullets.push({
                  id: Math.random().toString(36).slice(2, 9),
                  ownerId: v.playerId,
                  team: 'convoy',
                  x: v.x + fX * 2.0 + rightX * offset,
                  y: v.y + 0.9 + fY * 2.0,
                  z: v.z + fZ * 2.0 + rightZ * offset,
                  vx: fX * bulletSpeed,
                  vy: fY * bulletSpeed + inheritedVy,
                  vz: fZ * bulletSpeed,
                  life: 1.2,
                });
              }
            }
          }
        }
      }
    }

    // 2. Update each vehicle physics (movement, bumps, gravity, airtime, slope tilt)
    for (const v of vehicles) {
      if (!v.alive) continue;

      if (v.shootCooldown > 0) {
        v.shootCooldown = Math.max(0, v.shootCooldown - dt);
      }
      if (v.boostMatCooldown && v.boostMatCooldown > 0) {
        v.boostMatCooldown = Math.max(0, v.boostMatCooldown - dt);
      }

      // Nitro Boost mechanics: Boost ONLY lasts as long as held down!
      if (v.role !== 'rig') {
        if (v.boostFuel === undefined) v.boostFuel = 2.5;

        if (((v as any).botBoostTimer || 0) > 0) {
          (v as any).botBoostTimer = Math.max(0, (v as any).botBoostTimer - dt);
          v.boostActiveTimer = (v as any).botBoostTimer;
          v.speed = Math.min(64.0, v.speed + 44.0 * dt);
        } else if (v.boostHolding && v.boostCooldown <= 0 && v.boostFuel > 0.05) {
          // Holding down boost key/button!
          v.boostFuel = Math.max(0, v.boostFuel - dt);
          v.boostActiveTimer = v.boostFuel;
          v.speed = Math.min(64.0, v.speed + 46.0 * dt);

          if (v.boostFuel <= 0) {
            v.boostHolding = false;
            v.boostActiveTimer = 0;
            v.boostCooldown = 3.2; // Full overheat recharge delay
          }
        } else {
          // Not holding down boost
          if (v.boostActiveTimer > 0) {
            v.boostActiveTimer = 0;
            if (v.boostCooldown <= 0) {
              const burnedFuel = 2.5 - v.boostFuel;
              v.boostCooldown = Math.max(0.6, burnedFuel * 0.9);
            }
          }

          if (v.boostCooldown > 0) {
            v.boostCooldown = Math.max(0, v.boostCooldown - dt);
          } else {
            v.boostFuel = Math.min(2.5, v.boostFuel + dt * 1.25);
          }
        }
      }

      // Check Spike Pits hazard interaction (only affects grounded vehicles)
      for (const pit of state.spikePits) {
        if (v.y > getTerrainHeight(pit.x, pit.z) + 1.2) continue; // Airborne jumping cleanly over spike pit
        const dist = Math.hypot(v.x - pit.x, v.z - pit.z);
        if (dist < pit.radius + (v.role === 'rig' ? 2.0 : 0.8)) {
          const spikeDamage = (v.role === 'rig' ? 35 : 60) * dt;
          v.hp = Math.max(0, v.hp - spikeDamage);
          v.lastDamageTime = Date.now();
          v.speed *= Math.max(0.2, 1 - 2.5 * dt); // heavy tire drag
          if (v.hp <= 0 && v.alive) {
            handleVehicleDestruction(v, null, state, 'punctured by a Spike Pit');
          }
          break;
        }
      }

      // Horizontal position integration
      v.x += Math.sin(v.yaw) * v.speed * dt;
      v.z += Math.cos(v.yaw) * v.speed * dt;

      // Keep inside map bounds
      v.x = Math.max(-MAP_BOUND_X, Math.min(MAP_BOUND_X, v.x));

      // Static terrain obstacle collisions (skip jump ramps so vehicles launch smoothly)
      const vRadius = v.role === 'rig' ? 4.2 : 1.9;
      for (const obs of TERRAIN_OBSTACLES) {
        if (obs.type === 'jump_ramp') continue;
        const obsGroundY = getTerrainHeight(obs.x, obs.z);
        const obsTopY = obsGroundY + getObstacleHeight(obs);
        // Clear vertically if vehicle bottom/wheels are above obstacle top
        if (v.y >= obsTopY - 0.2) continue;

        const dx = v.x - obs.x;
        const dz = v.z - obs.z;
        if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue; // Broad-phase filter
        const minDist = vRadius + obs.radius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist; // Outward surface normal pointing from obstacle center to car
          const nz = dz / dist;
          const overlap = minDist - dist;

          // Push vehicle completely outside obstacle boundary plus a safety clearance margin
          const pushMargin = v.role === 'rig' ? 0.35 : 0.55;
          v.x += nx * (overlap + pushMargin);
          v.z += nz * (overlap + pushMargin);

          // Current velocity vector
          const vx = Math.sin(v.yaw) * v.speed;
          const vz = Math.cos(v.yaw) * v.speed;
          const vNormal = vx * nx + vz * nz; // Component moving along outward normal

          if (vNormal < 0) { // Vehicle moving INTO the obstacle
            const impactSpeed = -vNormal;
            const isBoosting = (v.boostActiveTimer || 0) > 0;
            const elasticity = v.role === 'rig' ? 0.40 : 0.75; // Arcade bounciness restitution factor

            // Reflect 2D velocity off collision surface normal: V' = V - (1 + e) * (V . N) * N
            const rVx = vx - (1 + elasticity) * vNormal * nx;
            const rVz = vz - (1 + elasticity) * vNormal * nz;
            const reflectedSpeed = Math.hypot(rVx, rVz);
            const reflectedHeading = Math.atan2(rVx, rVz);

            // Determine impact geometry: glancing blow vs direct head-on
            const forwardX = Math.sin(v.yaw);
            const forwardZ = Math.cos(v.yaw);
            const dotForward = forwardX * nx + forwardZ * nz;

            // Cross product indicates which side of the obstacle was struck (+1 right, -1 left)
            const cross = forwardX * nz - forwardZ * nx;
            const deflectDir = cross >= 0 ? 1 : -1;

            if (dotForward > -0.62) {
              // Glancing impact: deflect heading away from obstacle and maintain energetic forward momentum!
              let yawDiff = reflectedHeading - v.yaw;
              while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
              while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
              v.yaw += yawDiff * 0.72 + deflectDir * 0.18;

              v.speed = Math.max(12.0, reflectedSpeed * 0.85 + (isBoosting ? 14.0 : 4.0));
              v.roll += deflectDir * 0.35;
              v.vy = Math.max(v.vy, 3.2); // slight suspension bounce
            } else {
              // Direct head-on impact: strong elastic bounce backwards with spin deflection away from the obstacle
              const reboundImpulse = Math.max(14.0, impactSpeed * 0.75 + (isBoosting ? 18.0 : 6.0));
              v.speed = -Math.min(32.0, reboundImpulse);

              // Deflect yaw so car turns away from the tree/building rather than remaining aimed into it
              v.yaw += deflectDir * 0.58;
              v.roll += deflectDir * 0.45;
              v.vy = Math.max(v.vy, 4.2); // airborne suspension jolt
            }

            // High speed collision damage
            if (impactSpeed > 18.0 && v.alive) {
              v.hp = Math.max(0, v.hp - (impactSpeed * 0.35));
              v.lastDamageTime = Date.now();
            }
          }
        }
      }

      // 4-wheel height sampling for terrain contour tilting
      const halfL = v.role === 'rig' ? 4.2 : 1.5;
      const halfW = v.role === 'rig' ? 1.4 : 0.9;
      const fx = Math.sin(v.yaw);
      const fz = Math.cos(v.yaw);
      const rx = Math.cos(v.yaw);
      const rz = -Math.sin(v.yaw);

      const hFront = getSurfaceHeight(v.x + fx * halfL, v.z + fz * halfL);
      const hBack = getSurfaceHeight(v.x - fx * halfL, v.z - fz * halfL);
      const hRight = getSurfaceHeight(v.x + rx * halfW, v.z + rz * halfW);
      const hLeft = getSurfaceHeight(v.x - rx * halfW, v.z - rz * halfW);

      const targetPitch = -Math.atan2(hFront - hBack, halfL * 2);
      const targetRoll = Math.atan2(hLeft - hRight, halfW * 2);

      v.pitch += (targetPitch - v.pitch) * Math.min(1, dt * 14);
      v.roll += (targetRoll - v.roll) * Math.min(1, dt * 14);

      const groundY = (hFront + hBack + hRight + hLeft) * 0.25;

      // Ballistic Launch off Ramps & Steep Crests when driving fast
      const onRamp = (hFront + hBack) * 0.5 > getTerrainHeight(v.x, v.z) + 0.35;
      if (v.role !== 'rig' && v.isGrounded && v.speed > 16.0 && (targetPitch < -0.10 || onRamp)) {
        const pitchMagnitude = Math.abs(targetPitch);
        const launchSpeed = Math.max(pitchMagnitude * v.speed * 0.75, onRamp ? 7.5 : 0);
        if (launchSpeed > 5.0) {
          v.vy = Math.max(v.vy, launchSpeed);
          v.isGrounded = false;
        }
      }

      if (v.y > groundY + 0.15 || !v.isGrounded) {
        v.vy -= 24.0 * dt; // airborne gravity
        v.y += v.vy * dt;
        if (v.y <= groundY) {
          v.y = groundY;
          if (v.vy < -8.0) {
            v.vy = -v.vy * 0.2; // subtle suspension compression bounce
          } else {
            v.vy = 0;
            v.isGrounded = true;
          }
        } else {
          v.isGrounded = false;
        }
      } else {
        v.y = groundY;
        v.vy = 0;
        v.isGrounded = true;
      }
    }

    // 3. Vehicle-Vehicle Ramming & Collisions with Dynamic Knockback Impulse
    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const v1 = vehicles[i];
        const v2 = vehicles[j];
        if (!v1.alive || !v2.alive) continue;

        const dx = v2.x - v1.x;
        const dz = v2.z - v1.z;
        const dist = Math.hypot(dx, dz);

        const v1Radius = v1.role === 'rig' ? 4.5 : 2.0;
        const v2Radius = v2.role === 'rig' ? 4.5 : 2.0;
        const minDist = v1Radius + v2Radius;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist; // unit vector pointing from v1 to v2
          const nz = dz / dist;
          const overlap = minDist - dist + 0.05;

          const m1 = v1.role === 'rig' ? 14.0 : 1.8;
          const m2 = v2.role === 'rig' ? 14.0 : 1.8;
          const totalM = m1 + m2;

          // Separation push weighted by inverse mass
          v1.x -= nx * overlap * (m2 / totalM);
          v1.z -= nz * overlap * (m2 / totalM);
          v2.x += nx * overlap * (m1 / totalM);
          v2.z += nz * overlap * (m1 / totalM);

          // Kinetic velocity vectors
          const vx1 = Math.sin(v1.yaw) * v1.speed;
          const vz1 = Math.cos(v1.yaw) * v1.speed;
          const vx2 = Math.sin(v2.yaw) * v2.speed;
          const vz2 = Math.cos(v2.yaw) * v2.speed;

          const relVx = vx1 - vx2;
          const relVz = vz1 - vz2;
          const closingSpeed = Math.max(0, -(relVx * nx + relVz * nz));

          const isBoostRam = (v1.boostActiveTimer || 0) > 0 || (v2.boostActiveTimer || 0) > 0;
          const impactForce = Math.max(10.0, closingSpeed * 1.45 + (isBoostRam ? 20.0 : 4.0));

          // Violent knockback impulse displacement (knocks the other car around!)
          const knock1 = (impactForce * (m2 / totalM)) * 0.44;
          const knock2 = (impactForce * (m1 / totalM)) * 0.44;

          v1.x -= nx * knock1;
          v1.z -= nz * knock1;
          v2.x += nx * knock2;
          v2.z += nz * knock2;

          // Deflect forward momentum
          if (v1.role !== 'rig') {
            v1.speed *= 0.35;
          }
          if (v2.role !== 'rig') {
            v2.speed *= 0.35;
          }

          // Spin torque (knock cars around their yaw!)
          const cross1 = Math.sin(v1.yaw) * nz - Math.cos(v1.yaw) * nx;
          const cross2 = Math.sin(v2.yaw) * (-nz) - Math.cos(v2.yaw) * (-nx);

          const spinPower = Math.min(1.5, impactForce * 0.055 + 0.38);
          if (v1.role !== 'rig') {
            v1.yaw += (cross1 >= 0 ? 1 : -1) * spinPower;
            v1.roll += (cross1 >= 0 ? 0.45 : -0.45);
            v1.vy = Math.min(7.5, impactForce * 0.2); // airborne suspension jolt
          }
          if (v2.role !== 'rig') {
            v2.yaw += (cross2 >= 0 ? 1 : -1) * spinPower;
            v2.roll += (cross2 >= 0 ? 0.45 : -0.45);
            v2.vy = Math.min(7.5, impactForce * 0.2);
          }

          // Damage calculation
          if (v1.team !== v2.team) {
            const relSpeed = Math.abs(v1.speed - v2.speed) + impactForce;
            if (v1.role === 'rig') {
              v2.hp = Math.max(0, v2.hp - relSpeed * 3.2);
              v1.hp = Math.max(0, v1.hp - relSpeed * 0.3);
            } else if (v2.role === 'rig') {
              v1.hp = Math.max(0, v1.hp - relSpeed * 3.2);
              v2.hp = Math.max(0, v2.hp - relSpeed * 0.3);
            } else {
              v1.hp = Math.max(0, v1.hp - relSpeed * 2.2);
              v2.hp = Math.max(0, v2.hp - relSpeed * 2.2);
            }

            handleVehicleDestruction(v1, v2, state, 'rammed & destroyed');
            handleVehicleDestruction(v2, v1, state, 'rammed & destroyed');
          }
        }
      }
    }

    // Resolve static terrain obstacle collisions (post vehicle-vehicle ramming)
    for (const v of vehicles) {
      if (!v.alive) continue;
      const vRadius = v.role === 'rig' ? 4.2 : 1.9;
      for (const obs of TERRAIN_OBSTACLES) {
        if (obs.type === 'jump_ramp') continue;
        const obsGroundY = getTerrainHeight(obs.x, obs.z);
        const obsTopY = obsGroundY + getObstacleHeight(obs);
        if (v.y >= obsTopY - 0.2) continue;

        const minDist = vRadius + obs.radius;
        const dx = v.x - obs.x;
        const dz = v.z - obs.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;
          const pushMargin = v.role === 'rig' ? 0.35 : 0.55;
          v.x += nx * (overlap + pushMargin);
          v.z += nz * (overlap + pushMargin);

          const vx = Math.sin(v.yaw) * v.speed;
          const vz = Math.cos(v.yaw) * v.speed;
          const vNormal = vx * nx + vz * nz;
          if (vNormal < 0) {
            v.speed = -Math.max(8.0, -vNormal * 0.6);
            v.roll += (Math.sin(v.yaw) * nz - Math.cos(v.yaw) * nx >= 0 ? 0.3 : -0.3);
            v.vy = Math.max(v.vy, 3.0);
          }
        }
      }
    }

    // 4. Update bullets & continuous swept-segment hit testing
    const nextBullets: BulletState[] = [];
    for (const b of state.bullets) {
      b.life -= dt;
      if (b.life <= 0) continue;

      // Homing missile steering guidance towards target in 3D
      if (b.type === 'missile') {
        let target: VehicleState | undefined = b.targetId ? state.vehicles[b.targetId] : undefined;
        if (!target || !target.alive || target.team === b.team) {
          let bestD = 999999;
          target = undefined;
          for (const ev of vehicles) {
            if (!ev.alive || ev.team === b.team) continue;
            const d = Math.hypot(ev.x - b.x, ev.z - b.z);
            if (d < bestD) {
              bestD = d;
              target = ev;
            }
          }
          if (target) b.targetId = target.playerId;
        }

        if (target && target.alive) {
          const desiredYaw = Math.atan2(target.x - b.x, target.z - b.z);
          const currentYaw = Math.atan2(b.vx, b.vz);
          let yawDiff = desiredYaw - currentYaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

          const turnSpeed = 4.2;
          const newYaw = currentYaw + Math.max(-turnSpeed * dt, Math.min(turnSpeed * dt, yawDiff));
          const spd = Math.min(105, Math.hypot(b.vx, b.vz) + 22 * dt);
          b.vx = Math.sin(newYaw) * spd;
          b.vz = Math.cos(newYaw) * spd;

          // 3D vertical homing towards target's center of mass
          const targetY = target.y + (target.role === 'rig' ? 2.0 : 1.0);
          const dy = targetY - b.y;
          const currentVy = b.vy || 0;
          const desiredVy = Math.max(-35, Math.min(35, dy * 3.5));
          b.vy = currentVy + (desiredVy - currentVy) * Math.min(1, dt * 5.0);
        }
      }

      const prevX = b.x;
      const prevY = b.y;
      const prevZ = b.z;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y += (b.vy || 0) * dt;

      // Ballistic gravity drop on non-missile projectiles
      if (b.type !== 'missile') {
        b.vy = (b.vy || 0) - 8.0 * dt;
      }

      // Check ground collision (terrain impact)
      const groundY = getTerrainHeight(b.x, b.z);
      if (b.y <= groundY + 0.15) {
        continue; // Impacted terrain ground surface
      }

      let hit = false;

      // Obstacle collision (only if projectile is at or below obstacle top!)
      for (const obs of TERRAIN_OBSTACLES) {
        if (obs.type === 'jump_ramp') continue;
        const obsGroundY = getTerrainHeight(obs.x, obs.z);
        const obsTopY = obsGroundY + getObstacleHeight(obs);
        if (b.y > obsTopY) continue; // projectile is flying above the obstacle in the sky!
        if (b.y < obsGroundY - 0.5) continue;

        const sweepDist = distToSegment(obs.x, obs.z, prevX, prevZ, b.x, b.z);
        if (sweepDist < obs.radius) {
          hit = true;
          break;
        }
      }

      if (hit) continue;

      for (const v of vehicles) {
        if (!v.alive) continue;
        if (v.playerId === b.ownerId) continue;

        const isEnemy = v.team !== b.team;
        const isRig = v.role === 'rig';
        if (!isEnemy && !isRig) continue;

        // Check vertical height overlap with vehicle
        const vHeight = isRig ? 4.5 : 2.5;
        if (b.y < v.y - 0.5 || b.y > v.y + vHeight) continue;

        const hitDist = isRig ? 5.4 : 3.4;
        const sweepDist = distToSegment(v.x, v.z, prevX, prevZ, b.x, b.z);
        if (sweepDist < hitDist) {
          hit = true;
          const damage = b.type === 'missile'
            ? (isRig ? 60 : 140)
            : b.type === 'spread'
            ? (isRig ? 16 : 45)
            : (isRig ? 25 : 75);
          v.hp = Math.max(0, v.hp - damage);
          v.lastDamageTime = Date.now();

          if (v.hp <= 0 && v.alive) {
            const attacker = state.vehicles[b.ownerId] || null;
            const wepInfo = b.type === 'missile' ? 'blasted with Homing Missile' : b.type === 'spread' ? 'shredded with 4-Shot Spread' : 'destroyed';
            handleVehicleDestruction(v, attacker, state, wepInfo);
          }
          break;
        }
      }

      if (!hit) {
        nextBullets.push(b);
      }
    }
    state.bullets = nextBullets;

    // 5. Check Round Win / Loss conditions
    if (state.gameMode === 'point_battle') {
      const convoyActive = vehicles.filter((v) => v.team === 'convoy' && (v.alive || v.respawnsLeft > 0)).length;
      const raidersActive = vehicles.filter((v) => v.team === 'raiders' && (v.alive || v.respawnsLeft > 0)).length;

      if (convoyActive === 0 && raidersActive > 0) {
        state.status = 'team_victory';
        state.winnerTeam = 'raiders';
      } else if (raidersActive === 0 && convoyActive > 0) {
        state.status = 'team_victory';
        state.winnerTeam = 'convoy';
      } else if (state.teamScores.convoy >= state.targetScore) {
        state.status = 'team_victory';
        state.winnerTeam = 'convoy';
      } else if (state.teamScores.raiders >= state.targetScore) {
        state.status = 'team_victory';
        state.winnerTeam = 'raiders';
      } else if (state.roundTimeLeft <= 0) {
        state.status = 'team_victory';
        if (state.teamScores.convoy > state.teamScores.raiders) {
          state.winnerTeam = 'convoy';
        } else if (state.teamScores.raiders > state.teamScores.convoy) {
          state.winnerTeam = 'raiders';
        } else {
          state.winnerTeam = null; // Draw
        }
      }
    } else {
      const rig = Object.values(state.vehicles).find((v) => v.role === 'rig');
      const raidersActive = vehicles.filter((v) => v.team === 'raiders' && (v.alive || v.respawnsLeft > 0)).length;

      if (rig) {
        if (!rig.alive || rig.hp <= 0) {
          state.status = 'rig_destroyed';
          state.winnerTeam = 'raiders';
        } else if (raidersActive === 0) {
          state.status = 'convoy_escaped';
          state.winnerTeam = 'convoy';
        } else if (rig.z >= state.destinationZ || state.roundTimeLeft <= 0) {
          state.status = 'convoy_escaped';
          state.winnerTeam = 'convoy';
        }
      }
    }

    return state;
  },

  checkFinished(state) {
    if (state.status === 'team_victory') {
      const winnerName =
        state.winnerTeam === 'convoy'
          ? 'Cobalt Enforcers (Blue Team)'
          : state.winnerTeam === 'raiders'
          ? 'Crimson Raiders (Red Team)'
          : 'Match Draw';
      const winnerIds = state.winnerTeam
        ? Object.values(state.vehicles).filter((v) => v.team === state.winnerTeam).map((v) => v.playerId)
        : [];

      const enemyActive = state.winnerTeam
        ? Object.values(state.vehicles).filter(v => v.team !== state.winnerTeam && (v.alive || v.respawnsLeft > 0)).length
        : 1;
      const isKnockout = enemyActive === 0 && state.winnerTeam !== null;

      const summaryText = isKnockout
        ? `${winnerName} wins by Knockout! All enemy battle cars eliminated!`
        : state.winnerTeam
        ? `${winnerName} wins the point match!`
        : 'Match concluded in a draw!';

      return {
        finished: true,
        winners: winnerIds,
        summary: summaryText,
      };
    }

    if (state.status === 'rig_destroyed') {
      const raiderIds = Object.values(state.vehicles)
        .filter((v) => v.team === 'raiders')
        .map((v) => v.playerId);
      return {
        finished: true,
        winners: raiderIds,
        summary: 'Raiders destroyed the Big Rig! Raiders Victory!',
      };
    }

    if (state.status === 'convoy_escaped') {
      const convoyIds = Object.values(state.vehicles)
        .filter((v) => v.team === 'convoy')
        .map((v) => v.playerId);
      const raidersActive = Object.values(state.vehicles).filter(v => v.team === 'raiders' && (v.alive || v.respawnsLeft > 0)).length;
      const summaryText = raidersActive === 0
        ? 'Convoy defenders wiped out all Raider attackers! Convoy Victory!'
        : 'Big Rig reached the safe zone! Convoy Victory!';
      return {
        finished: true,
        winners: convoyIds,
        summary: summaryText,
      };
    }

    return null;
  },

  filterPlayerView(state, viewerPlayerId) {
    // Spatial views are public/synchronized to all players
    return {
      gameMode: state.gameMode,
      vehicles: Object.values(state.vehicles),
      bullets: state.bullets,
      scrapCaches: state.scrapCaches,
      spikePits: state.spikePits,
      boostMats: state.boostMats,
      shieldPickups: state.shieldPickups,
      roundTimeLeft: Math.ceil(state.roundTimeLeft),
      status: state.status,
      destinationZ: state.destinationZ,
      winnerTeam: state.winnerTeam,
      teamScores: state.teamScores,
      targetScore: state.targetScore,
      recentEvent: state.recentEvent,
      myPlayerId: viewerPlayerId,
    };
  },
});
