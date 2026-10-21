<template>
  <div class="island-game-wrapper">
    <!-- WebGL Canvas Mount -->
    <div ref="canvasContainer" class="three-viewport" @click="handleCanvasClick"></div>

    <!-- UI Overlay Layer -->
    <div class="hud-layer">
      <!-- Top Bar: Zone, Room Info & Island Switcher Tabs -->
      <header class="top-bar">
        <!-- Top Left: Live Zone Badge -->
        <div class="zone-badge">
          <span class="dot live-pulse"></span>
          <span class="zone-name">{{ currentZoneName }}</span>
        </div>

        <!-- Top Center: Room Code & Online Explorers -->
        <div class="room-status-badge glass-panel">
          <span class="room-label">ROOM:</span>
          <span class="room-code-val">{{ platformState.roomCode }}</span>
          <span class="divider">|</span>
          <span class="exp-count">{{ activeExplorersCount }}</span>
          <span class="exp-label">Online</span>
        </div>

        <!-- Top Right: Island Switcher Tabs & Speed Badge -->
        <div class="top-bar-right">
          <div class="island-tabs-group">
            <button
              class="island-tab-btn"
              :class="{ active: currentIsland === 'island' }"
              @click="switchIsland('island')"
              title="Tropical Island (Press [1])"
            >
              [1] 🏝️ Tropical
            </button>
            <button
              class="island-tab-btn"
              :class="{ active: currentIsland === 'cybercity' }"
              @click="switchIsland('cybercity')"
              title="CyberCity Metropolis (Press [2])"
            >
              [2] 🏙️ CyberCity
            </button>
            <button
              class="island-tab-btn"
              :class="{ active: currentIsland === 'kamakura' }"
              @click="switchIsland('kamakura')"
              title="Kamakura Coastal Shonan (Press [3])"
            >
              [3] ⛩️ Kamakura
            </button>
          </div>

          <div class="speed-badge" :class="speedBadgeClass">
            {{ speedBadgeText }}
          </div>

          <div class="fps-display">{{ fps }} FPS</div>
        </div>
      </header>

      <!-- Center Action Prompt (e.g. "[E] RIDE QUAD BIKE") -->
      <transition name="pop">
        <div v-if="actionPromptText" class="action-prompt">
          <span class="key-badge">E</span>
          <span class="prompt-text">{{ actionPromptText }}</span>
        </div>
      </transition>

      <!-- Bottom Bar -->
      <footer class="bottom-bar">
        <!-- Lower-Left: Retro PS1 / Walkman Controls Panel (Hover to expand) -->
        <div class="controls-overlay">
          <div class="cam-badge-row">
            <div class="cam-badge" @click="toggleCameraView" title="Toggle 1st / 3rd Person View">
              <span class="label">VIEW:</span>
              <span class="mode">{{ cameraModeText }}</span>
            </div>
            <button
              class="cam-option-btn"
              :class="{ active: arrowCamMode }"
              @click="toggleArrowMode"
              title="Toggle Arrow Keys Camera Rotation"
            >
              ARROWS: {{ arrowCamMode ? 'CAM' : 'MOVE' }}
            </button>
            <button
              class="cam-option-btn"
              :class="{ active: isPointerLocked }"
              @click="togglePointerLock"
              title="Lock Cursor for 1-Finger Look"
            >
              {{ isPointerLocked ? 'LOCKED' : 'LOCK' }}
            </button>
            <button
              class="cam-option-btn alt-mode"
              @click="cycleTheme"
              title="Cycle Sunset Atmosphere (or press [T])"
            >
              PALETTE [T]: {{ currentSkyTheme }}
            </button>
          </div>

          <!-- Key Commands Legend -->
          <div class="controls-legend-grid">
            <div class="key-item"><span class="k-kbd">WASD</span><span>Move</span></div>
            <div class="key-item"><span class="k-kbd">SHIFT</span><span>Sprint</span></div>
            <div class="key-item"><span class="k-kbd">Z</span><span>Zoom (24 m/s)</span></div>
            <div class="key-item"><span class="k-kbd">SPACE</span><span>Jump / Glider</span></div>
            <div class="key-item"><span class="k-kbd">E</span><span>Quad Bike</span></div>
            <div class="key-item"><span class="k-kbd">1/2/3</span><span>Switch Islands</span></div>
          </div>
        </div>
      </footer>

      <!-- Floating Toast for Shared World Events -->
      <transition name="fade">
        <div v-if="latestEventText" class="event-banner">
          {{ latestEventText }}
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import * as THREE from 'three';
import {
  platformState,
  privatePlayerView,
  sendGameAction
} from '../colyseus.js';

import {
  SceneManager,
  InputManager,
  CameraController,
  Player,
  QuadBike,
  World,
  CyberCityWorld,
  KamakuraWorld,
  RemotePlayerManager
} from '@sinki/game-lowpolyisland';

const canvasContainer = ref<HTMLElement | null>(null);

const currentIsland = ref<'island' | 'cybercity' | 'kamakura'>('island');
const currentZoneName = ref('COASTAL HAVEN // PIER SECTOR');
const currentSkyTheme = ref('GOLDEN');
const speedBadgeText = ref('WALK 7 M/S');
const speedBadgeClass = ref('walk');
const cameraModeText = ref('3RD PERSON [V]');
const arrowCamMode = ref(false);
const isPointerLocked = ref(false);
const actionPromptText = ref<string | null>(null);
const latestEventText = ref<string | null>(null);
const fps = ref(60);

let sceneManager: any = null;
let inputManager: any = null;
let cameraController: any = null;
let player: any = null;
let quadBike: any = null;
let remoteManager: any = null;
let currentWorld: any = null;
let isRunning = false;
let lastNetSync = 0;
let lastTime = performance.now();
let frameCount = 0;
let lastFpsTime = performance.now();
let resizeObserver: ResizeObserver | null = null;
const processedKnockbackEvents = new Set<string>();

const activeExplorersCount = computed(() => {
  const players = privatePlayerView.value?.players || {};
  return Object.values(players).filter((p: any) => p.island === currentIsland.value).length || 1;
});

// Watch recent server events (temple bell rings, player travels)
watch(
  () => privatePlayerView.value?.recentEvents,
  (events) => {
    if (events && events.length > 0) {
      for (const ev of events) {
        if ((ev as any).type === 'knockback' && (ev as any).targetPlayerId === platformState.mySessionId) {
          if (!processedKnockbackEvents.has(ev.id)) {
            processedKnockbackEvents.add(ev.id);
            if (player && typeof player.applyKnockback === 'function') {
              player.applyKnockback((ev as any).forceX, (ev as any).forceY, (ev as any).forceZ);
            }
          }
        }
      }
      const latest = events[events.length - 1];
      if (latest && Date.now() - latest.timestamp < 4000) {
        latestEventText.value = latest.text;
        setTimeout(() => {
          if (latestEventText.value === latest.text) {
            latestEventText.value = null;
          }
        }, 3200);
      }
    }
  },
  { deep: true }
);

function cycleTheme() {
  if (sceneManager) {
    const t = sceneManager.cycleSkyTheme();
    currentSkyTheme.value = t.shortName || t.name;
  }
}

function toggleCameraView() {
  if (cameraController) {
    cameraController.toggleMode(player);
    cameraModeText.value = cameraController.getMode();
  }
}

function toggleArrowMode() {
  if (inputManager) {
    arrowCamMode.value = !arrowCamMode.value;
    inputManager.arrowCamMode = arrowCamMode.value;
  }
}

function togglePointerLock() {
  if (inputManager) {
    inputManager.togglePointerLock();
  }
}

function handleCanvasClick() {
  if (inputManager && !inputManager.isPointerLocked) {
    inputManager.requestPointerLock();
  }
}

function switchIsland(target: 'island' | 'cybercity' | 'kamakura') {
  if (currentIsland.value === target) return;
  currentIsland.value = target;

  if (currentWorld) {
    currentWorld.destroy();
  }

  if (target === 'cybercity') {
    currentWorld = new CyberCityWorld(sceneManager.scene);
    player.position.set(0, 1.0, 0);
  } else if (target === 'kamakura') {
    currentWorld = new KamakuraWorld(sceneManager.scene);
    player.position.set(5.0, 1.2, -15.0);
  } else {
    currentWorld = new World(sceneManager.scene);
    player.position.set(0, 2.38, -10.0);
  }

  quadBike.position.set(player.position.x + 3.0, player.position.y, player.position.z);
  quadBike.mesh.position.copy(quadBike.position);
  player.isDrivingQuad = false;
  player.isGliding = false;

  sendGameAction({
    type: 'switch_island',
    island: target
  });
}

function updateZoneIndicator() {
  if (!player) return;
  const p = player.position;
  let zone = 'COASTAL HAVEN // PIER SECTOR';

  if (currentWorld && typeof currentWorld.getZoneName === 'function') {
    zone = currentWorld.getZoneName(p, player.isDrivingQuad);
  } else if (currentIsland.value === 'island') {
    if (player.isDrivingQuad) {
      zone = 'ALL-TERRAIN EXPLORER // 4X4 QUAD BIKE';
    } else if (p.distanceTo(new THREE.Vector3(-36, currentWorld?.getGroundHeight(-36, 46) || 0, 46)) < 12) {
      zone = 'NORTH FOOTHILLS // ALL-TERRAIN TRAIL';
    } else if (Math.abs(p.x) < 5.5 && p.z >= 16 && p.z <= 28) {
      zone = 'NEON PLAZA // 164 BPM DANCE ARENA';
    } else if (p.distanceTo(new THREE.Vector3(11, currentWorld?.getGroundHeight(11, 14) || 0, 14)) < 8) {
      zone = 'TIKI COVE // SUNSET BEACH BAR';
    } else if (p.distanceTo(new THREE.Vector3(25, currentWorld?.getGroundHeight(25, 44) || 0, 44)) < 10) {
      zone = 'CLIFFSIDE TRAIL // SCENIC ASCENT';
    } else if (p.distanceTo(new THREE.Vector3(48, currentWorld?.getGroundHeight(48, 68) || 0, 68)) < 10) {
      zone = 'SUMMIT DECK // PANORAMIC LOOKOUT';
    } else if (p.z >= 35 && p.x > 25) {
      zone = 'CRAGGY BLUFFS // EASTERN SEA CLIFFS';
    } else if (p.z >= 35 && p.x <= 25) {
      zone = 'EMERALD RIDGE // PINE FOREST TRAILS';
    }
  }

  currentZoneName.value = zone;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Digit1') switchIsland('island');
  if (e.code === 'Digit2') switchIsland('cybercity');
  if (e.code === 'Digit3') switchIsland('kamakura');
  if (e.code === 'KeyV') toggleCameraView();
  if (e.code === 'KeyT') cycleTheme();
}

function animationLoop() {
  if (!isRunning) return;

  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // 1. World Animation
  if (currentWorld && typeof currentWorld.update === 'function') {
    currentWorld.update(dt);
  }

  // 2. Player Movement & Hang Glider
  const camYaw = inputManager.mouse.yaw;
  player.update(dt, inputManager, camYaw, currentWorld);

  // 3. Quad Bike Interaction & Proximity Prompt
  const distToQuad = player.position.distanceTo(quadBike.position);
  if (!player.isDrivingQuad && distToQuad < 3.2) {
    actionPromptText.value = 'RIDE QUAD BIKE';
  } else if (player.isDrivingQuad) {
    actionPromptText.value = 'DISMOUNT QUAD BIKE';
  } else {
    actionPromptText.value = null;
  }

  if (inputManager.keys['KeyE']) {
    inputManager.keys['KeyE'] = false;
    if (!player.isDrivingQuad && distToQuad < 3.2) {
      player.isDrivingQuad = true;
      quadBike.mount(player);
    } else if (player.isDrivingQuad) {
      quadBike.dismount(player, currentWorld);
    }
  }

  quadBike.update(dt, inputManager, currentWorld, player);

  // 4. Camera Chase
  cameraController.update(dt, player, inputManager);

  // 5. Remote Multiplayer Avatars
  if (remoteManager) {
    const netPlayers = privatePlayerView.value?.players || {};
    remoteManager.update(dt, netPlayers, platformState.mySessionId, currentIsland.value);

    // 5b. Physical Collisions & Quad Bike Ramming Knockback
    const isLocalQuad = player.isDrivingQuad;
    const localPos = isLocalQuad ? quadBike.position : player.position;
    const localQuadSpeed = isLocalQuad ? (quadBike.speed || 0) : 0;

    for (const [remoteId, avatar] of remoteManager.remotePlayers.entries()) {
      const netPlayer = (netPlayers as any)[remoteId];
      if (!netPlayer || netPlayer.island !== currentIsland.value) continue;

      const remotePos = avatar.root.position;
      const dist = localPos.distanceTo(remotePos);

      // (A) LOCAL ON QUAD BIKE RAMS REMOTE PLAYER
      if (isLocalQuad && Math.abs(localQuadSpeed) > 4.5 && dist < 2.4) {
        let dirX = remotePos.x - localPos.x;
        let dirZ = remotePos.z - localPos.z;
        const len = Math.hypot(dirX, dirZ) || 0.001;
        dirX /= len;
        dirZ /= len;

        const forceMag = Math.min(26, Math.max(12, Math.abs(localQuadSpeed) * 0.95));
        const forceX = dirX * forceMag;
        const forceY = 9.0;
        const forceZ = dirZ * forceMag;

        // Visual launch of remote avatar immediately
        avatar.root.position.x += dirX * 2.8;
        avatar.root.position.y += 1.6;
        avatar.root.position.z += dirZ * 2.8;

        sendGameAction({
          type: 'knockback',
          targetPlayerId: remoteId,
          forceX: Math.round(forceX * 10) / 10,
          forceY: Math.round(forceY * 10) / 10,
          forceZ: Math.round(forceZ * 10) / 10
        });

        quadBike.speed *= 0.65;
      }

      // (B) REMOTE ON QUAD BIKE RAMS LOCAL PLAYER ON FOOT
      if (!isLocalQuad && netPlayer.isDrivingQuad && Math.abs(netPlayer.quadSpeed || 0) > 4.5 && dist < 2.2) {
        let dirX = player.position.x - remotePos.x;
        let dirZ = player.position.z - remotePos.z;
        const len = Math.hypot(dirX, dirZ) || 0.001;
        dirX /= len;
        dirZ /= len;

        const forceMag = Math.min(26, Math.max(12, Math.abs(netPlayer.quadSpeed || 15) * 0.95));
        player.applyKnockback(dirX * forceMag, 9.0, dirZ * forceMag);
      }

      // (C) FOOT-TO-FOOT SOLID COLLISION (Push apart if overlapping)
      if (!isLocalQuad && !netPlayer.isDrivingQuad && dist < 0.95 && dist > 0.001) {
        const overlap = (0.95 - dist) * 0.5;
        const pushX = ((player.position.x - remotePos.x) / dist) * overlap;
        const pushZ = ((player.position.z - remotePos.z) / dist) * overlap;
        player.position.x += pushX;
        player.position.z += pushZ;
        avatar.root.position.x -= pushX;
        avatar.root.position.z -= pushZ;
      }
    }
  }

  // 6. Network Position Broadcast (20Hz)
  if (now - lastNetSync > 50) {
    lastNetSync = now;
    sendGameAction({
      type: 'move',
      x: Math.round(player.position.x * 100) / 100,
      y: Math.round(player.position.y * 100) / 100,
      z: Math.round(player.position.z * 100) / 100,
      yaw: Math.round(player.rotation * 100) / 100,
      moveState: player.moveState,
      isGliding: player.isGliding,
      isDrivingQuad: player.isDrivingQuad,
      quadSpeed: Math.round(quadBike.speed || 0),
      island: currentIsland.value
    });
  }

  // 7. Update Speed Badge
  if (player.isDrivingQuad) {
    const spd = Math.round(Math.abs(quadBike.speed || 0));
    speedBadgeText.value = quadBike.isTurbo ? `🔥 NITRO ${spd} M/S` : `QUAD: ${spd} M/S`;
    speedBadgeClass.value = quadBike.isTurbo ? 'nitro' : 'run';
  } else if (player.isGliding) {
    const spd = Math.round(Math.hypot(player.velocity.x, player.velocity.z));
    speedBadgeText.value = `🪂 GLIDER: ${spd} M/S`;
    speedBadgeClass.value = 'airtime';
  } else if (!player.isGrounded && player.bounceCombo > 0) {
    if (player.bounceCombo === 3) {
      speedBadgeText.value = '💥 SUPER BOUNCE!!';
      speedBadgeClass.value = 'nitro';
    } else if (player.bounceCombo === 2) {
      speedBadgeText.value = '🦘 HIGH BOUNCE';
      speedBadgeClass.value = 'zoom';
    } else {
      speedBadgeText.value = 'SPRING JUMP';
      speedBadgeClass.value = 'run';
    }
  } else if (player.moveState === 'ZOOM') {
    speedBadgeText.value = '⚡ ZOOM 24 M/S';
    speedBadgeClass.value = 'zoom';
  } else if (player.moveState === 'RUN') {
    speedBadgeText.value = 'RUN 14 M/S';
    speedBadgeClass.value = 'run';
  } else {
    speedBadgeText.value = player.isMoving ? 'WALK 7 M/S' : 'IDLE';
    speedBadgeClass.value = 'walk';
  }

  // 8. FPS Counter & Zone updates
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fps.value = Math.round((frameCount * 1000) / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;
    updateZoneIndicator();
  }

  // 9. Render Three.js Scene
  sceneManager.render();

  requestAnimationFrame(animationLoop);
}

onMounted(async () => {
  await nextTick();
  if (!canvasContainer.value) return;

  sceneManager = new SceneManager(canvasContainer.value);
  inputManager = new InputManager();
  cameraController = new CameraController(sceneManager.camera);
  player = new Player(sceneManager.scene);
  quadBike = new QuadBike(sceneManager.scene, 3.0, -10.0);
  remoteManager = new RemotePlayerManager(sceneManager.scene);

  // Load Initial World
  currentWorld = new World(sceneManager.scene);
  player.position.set(0, 2.38, -10.0);
  quadBike.position.set(3.0, 2.38, -10.0);

  // Sync pointer lock state
  inputManager.onPointerLockChange = (locked: boolean) => {
    isPointerLocked.value = locked;
  };

  // ResizeObserver for auto-scaling
  resizeObserver = new ResizeObserver(() => {
    if (sceneManager) sceneManager.onWindowResize();
  });
  resizeObserver.observe(canvasContainer.value);

  window.addEventListener('keydown', handleKeyDown);

  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(animationLoop);
});

onUnmounted(() => {
  isRunning = false;
  window.removeEventListener('keydown', handleKeyDown);

  if (resizeObserver) resizeObserver.disconnect();
  if (currentWorld) currentWorld.destroy();
  if (remoteManager) remoteManager.destroy();
  if (sceneManager) sceneManager.dispose();
  if (inputManager) inputManager.dispose();
});
</script>

<style scoped>
:root {
  --neon-cyan: #2de2e6;
  --neon-amber: #facc15;
  --neon-pink: #ec4899;
}

.island-game-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
  min-height: 500px;
  overflow: hidden;
  background: #090d16;
  font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
  user-select: none;
}

.three-viewport {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.hud-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 20px;
}

/* ========================================================
   TOP BAR: Zone, Room Code, Island Switcher Tabs & Speed
   ======================================================== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.zone-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(13, 17, 29, 0.78);
  border: 1px solid rgba(80, 100, 140, 0.45);
  border-left: 3px solid #2de2e6;
  padding: 6px 14px;
  border-radius: 4px;
  backdrop-filter: blur(8px);
  font-family: monospace;
  font-size: 12px;
  color: #f1f5f9;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.dot.live-pulse {
  width: 8px;
  height: 8px;
  background-color: #2de2e6;
  border-radius: 50%;
  box-shadow: 0 0 10px #2de2e6;
  animation: pulse 1.6s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
}

.room-status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 17, 29, 0.82);
  border: 1px solid rgba(45, 226, 230, 0.3);
  padding: 6px 16px;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
  font-size: 12px;
  font-family: monospace;
}

.room-label {
  color: #94a3b8;
}

.room-code-val {
  color: #2de2e6;
  font-weight: 700;
  letter-spacing: 1px;
}

.divider {
  color: rgba(255, 255, 255, 0.2);
}

.exp-count {
  color: #facc15;
  font-weight: 700;
}

.exp-label {
  color: #94a3b8;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Island Switcher Tabs (cleanly nestled in top right) */
.island-tabs-group {
  display: flex;
  background: rgba(13, 17, 29, 0.85);
  border: 1px solid rgba(80, 100, 140, 0.4);
  border-radius: 6px;
  padding: 2px;
  backdrop-filter: blur(8px);
}

.island-tab-btn {
  background: transparent;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  pointer-events: auto;
}

.island-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.island-tab-btn.active {
  background: linear-gradient(135deg, #2de2e6, #0284c7);
  color: #030712;
  font-weight: 700;
  box-shadow: 0 0 12px rgba(45, 226, 230, 0.4);
}

.speed-badge {
  background: rgba(13, 17, 29, 0.85);
  padding: 5px 14px;
  border-radius: 4px;
  border: 1px solid rgba(80, 100, 140, 0.4);
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(220, 230, 255, 0.85);
  backdrop-filter: blur(8px);
  white-space: nowrap;
}

.speed-badge.run {
  border-color: #2de2e6;
  color: #2de2e6;
  box-shadow: 0 0 12px rgba(45, 226, 230, 0.4);
}

.speed-badge.zoom {
  border-color: #ec4899;
  color: #ec4899;
  box-shadow: 0 0 16px rgba(236, 72, 153, 0.5);
}

.speed-badge.airtime {
  border-color: #00e5ff;
  color: #00e5ff;
  background: rgba(5, 25, 45, 0.88);
  box-shadow: 0 0 18px rgba(0, 229, 255, 0.7);
}

.speed-badge.nitro {
  border-color: #f59e0b;
  color: #fef08a;
  background: rgba(35, 20, 5, 0.9);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
}

.fps-display {
  color: rgba(255, 255, 255, 0.45);
  font-family: monospace;
  font-size: 11px;
}

/* ========================================================
   CENTER ACTION PROMPT ([E] RIDE QUAD BIKE)
   ======================================================== */
.action-prompt {
  align-self: center;
  position: absolute;
  top: 62%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 20, 35, 0.92);
  border: 1px solid #2de2e6;
  box-shadow: 0 0 24px rgba(45, 226, 230, 0.35);
  padding: 10px 22px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ffffff;
  animation: bounce 1.8s infinite ease-in-out;
}

.key-badge {
  background: #2de2e6;
  color: #070912;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 14px;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.pop-enter-active, .pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* ========================================================
   BOTTOM CONTROLS OVERLAY (Authentic Standalone App Look)
   ======================================================== */
.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
}

.controls-overlay {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(22, 28, 45, 0.88);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(80, 100, 140, 0.4);
  border-top: 2px solid #2de2e6;
  backdrop-filter: blur(12px);
  width: fit-content;
  max-width: 440px;
  transform-origin: bottom left;
  transform: scale(0.88);
  transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.26s ease, border-color 0.26s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(45, 226, 230, 0.15);
}

.controls-overlay:hover {
  transform: scale(1.08);
  border-color: #2de2e6;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.85), 0 0 25px rgba(45, 226, 230, 0.35);
}

.cam-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(80, 100, 140, 0.35);
  padding-bottom: 8px;
}

.cam-badge {
  display: flex;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.cam-badge .label {
  color: rgba(255, 255, 255, 0.6);
}

.cam-badge .mode {
  color: #2de2e6;
}

.cam-option-btn {
  background: rgba(30, 40, 65, 0.85);
  border: 1px solid #2de2e6;
  color: #2de2e6;
  font-family: monospace;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cam-option-btn:hover, .cam-option-btn.active {
  background: rgba(45, 226, 230, 0.25);
  box-shadow: 0 0 10px rgba(45, 226, 230, 0.3);
}

.cam-option-btn.alt-mode {
  border-color: #facc15;
  color: #facc15;
  background: rgba(250, 204, 21, 0.15);
}

.controls-legend-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 12px;
  font-size: 11px;
  color: #94a3b8;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.k-kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.event-banner {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 22px;
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  border: 1px solid rgba(250, 204, 21, 0.5);
  border-radius: 9999px;
  background: rgba(20, 24, 38, 0.9);
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.35);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
