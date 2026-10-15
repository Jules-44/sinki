<template>
  <div class="convoy-game-container">
    <!-- 3D Canvas Canvas Mount -->
    <div ref="canvasContainer" class="webgl-canvas-mount"></div>

    <!-- Wasteland Combat HUD -->
    <div class="game-hud-overlay">
      <!-- Top Center: Match Objective Bar -->
      <div class="hud-top-bar glass-panel" :class="{ 'mode-points': isPointBattle }">
        <!-- POINT BATTLE MODE SCOREBOARD -->
        <template v-if="isPointBattle">
          <div class="point-battle-top">
            <!-- Blue Team Score -->
            <div class="team-score-card blue-team" :class="{ leading: blueScore > redScore && blueScore > 0 }">
              <div class="team-meta">
                <span class="team-indicator blue"></span>
                <span class="team-title">COBALT BLUE</span>
                <span class="car-count">{{ blueCarsAlive }} Active ({{ blueCarsRemaining }} Left)</span>
              </div>
              <div class="team-pts-row">
                <span class="pts-val">{{ blueScore }}</span>
                <span class="pts-target">/ {{ targetScore }} PTS</span>
              </div>
              <div class="score-progress-bar">
                <div class="score-progress-fill blue-fill" :style="{ width: `${blueProgressPct}%` }"></div>
              </div>
            </div>

            <!-- Match Center Info & Mode Switcher -->
            <div class="match-info-center">
              <div class="round-timer" :class="{ warning: roundTimeLeft < 30 }">
                {{ formatTimer(roundTimeLeft) }}
              </div>
              <div class="match-mode-label">
                <span class="pulse-spark"></span>
                FIRST TO {{ targetScore }} PTS
              </div>
              <div class="mode-toggle-group">
                <button class="btn-mode-pill active" title="Current Mode: 2 Teams playing for points">
                  2 Teams (Points)
                </button>
                <button class="btn-mode-pill" @click="toggleGameMode" title="Switch to Big Rig Convoy Escort">
                  Big Rig
                </button>
                <button class="btn-theme-pill" @click="toggleEnvironmentTheme" :title="`Current: ${environmentTheme === 'grassland' ? 'Emerald Grassland' : 'Desert Wasteland'}. Click to toggle.`">
                  {{ environmentTheme === 'grassland' ? '🌲 Grassland' : '🏜️ Desert' }}
                </button>
              </div>
            </div>

            <!-- Red Team Score -->
            <div class="team-score-card red-team" :class="{ leading: redScore > blueScore && redScore > 0 }">
              <div class="team-meta">
                <span class="team-indicator red"></span>
                <span class="team-title">CRIMSON RED</span>
                <span class="car-count">{{ redCarsAlive }} Active ({{ redCarsRemaining }} Left)</span>
              </div>
              <div class="team-pts-row">
                <span class="pts-val">{{ redScore }}</span>
                <span class="pts-target">/ {{ targetScore }} PTS</span>
              </div>
              <div class="score-progress-bar">
                <div class="score-progress-fill red-fill" :style="{ width: `${redProgressPct}%` }"></div>
              </div>
            </div>
          </div>
        </template>

        <!-- BIG RIG CONVOY ESCORT MODE (Fallback) -->
        <template v-else>
          <div class="objective-header">
            <div class="team-tag" :class="myVehicle?.team || 'convoy'">
              {{ myVehicle?.team === 'raiders' ? 'RAIDER TEAM' : 'CONVOY TEAM' }}
            </div>
            <div class="round-timer" :class="{ warning: roundTimeLeft < 30 }">
              {{ formatTimer(roundTimeLeft) }}
            </div>
            <div class="rig-status-pill">
              <span class="label">RIG DISTANCE:</span>
              <span class="value">{{ Math.round(rigDistanceLeft) }}m</span>
            </div>
            <button class="btn-mode-pill" @click="toggleGameMode" title="Switch to 2 Teams Point Match">
              &rarr; Point Match
            </button>
            <button class="btn-theme-pill" @click="toggleEnvironmentTheme" :title="`Current: ${environmentTheme === 'grassland' ? 'Emerald Grassland' : 'Desert Wasteland'}. Click to toggle.`">
              {{ environmentTheme === 'grassland' ? '🌲 Grassland' : '🏜️ Desert' }}
            </button>
          </div>

          <!-- Destination Waypoint Indicator & Outpost Compass -->
          <div class="destination-pointer-bar">
            <div class="dest-badge">
              <span class="pointer-arrow" :style="{ transform: `rotate(${destinationPointerAngle}deg)` }">▲</span>
              <span class="dest-label">OUTPOST OBJECTIVE:</span>
              <span class="dest-dist">{{ Math.round(distanceToOutpost) }}m</span>
            </div>
            <div class="dest-progress-track">
              <div class="dest-progress-fill" :style="{ width: `${outpostProgressPct}%` }"></div>
              <div class="dest-beacon-dot" :class="{ reached: outpostProgressPct >= 98 }">OUTPOST GATE</div>
            </div>
          </div>

          <!-- Big Rig Health Bar -->
          <div class="rig-health-container" :class="{ 'rig-hit-flash': hitMarkerActive }">
            <div class="rig-label-row">
              <span class="rig-title">WAR RIG ARMOR INTEGRITY</span>
              <span v-if="hitMarkerActive" class="hit-badge-inline">ARMOR HIT -25 HP</span>
              <span class="rig-hp-text">
                {{ Math.max(0, Math.round(rigHp)) }} / {{ rigMaxHp }} HP
                <small>({{ Math.round(Math.max(0, (rigHp / (rigMaxHp || 1)) * 100)) }}%)</small>
              </span>
            </div>
            <div class="health-track heavy-armor">
              <div
                class="health-fill"
                :class="rigHp / rigMaxHp < 0.25 ? 'critical' : rigHp / rigMaxHp < 0.55 ? 'warning' : 'healthy'"
                :style="{ width: `${Math.max(0, (rigHp / rigMaxHp) * 100)}%` }"
              ></div>
              <div class="armor-segments">
                <span v-for="i in 9" :key="i" class="segment-notch"></span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 1.1 Tactical Minimap / Radar in Top-Right -->
      <div class="hud-top-right glass-panel radar-card">
        <div class="radar-header">
          <div class="radar-title-group">
            <span class="radar-live-blip"></span>
            <span class="radar-title">TACTICAL RADAR</span>
          </div>
          <span class="radar-scale">360m</span>
        </div>

        <div class="radar-screen">
          <svg class="radar-svg" viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
            <!-- Background tactical grid lines -->
            <line x1="80" y1="0" x2="80" y2="220" stroke="rgba(255,255,255,0.07)" stroke-dasharray="2,3" />
            <line x1="0" y1="110" x2="160" y2="110" stroke="rgba(255,255,255,0.07)" stroke-dasharray="2,3" />
            <line x1="0" y1="55" x2="160" y2="55" stroke="rgba(255,255,255,0.04)" stroke-dasharray="1,4" />
            <line x1="0" y1="165" x2="160" y2="165" stroke="rgba(255,255,255,0.04)" stroke-dasharray="1,4" />

            <!-- Outpost Gate marker at z = 220 (top of map) -->
            <line x1="55" y1="12" x2="105" y2="12" stroke="#22c55e" stroke-width="2.5" />
            <text x="80" y="8" fill="#4ade80" font-size="7" text-anchor="middle" font-weight="700" letter-spacing="1">OUTPOST</text>

            <!-- River channel contour at z ≈ -44 -->
            <path
              d="M 6 150 Q 80 144 154 152"
              stroke="#0284c7"
              stroke-width="5"
              fill="none"
              opacity="0.6"
            />
            <text x="12" y="145" fill="#38bdf8" font-size="6.5" font-weight="700">RIVER</text>

            <!-- Ravine chasm contour at z ≈ 46 -->
            <path
              d="M 6 98 Q 80 104 154 96"
              stroke="#a855f7"
              stroke-width="5.5"
              fill="none"
              opacity="0.55"
            />
            <text x="12" y="94" fill="#c084fc" font-size="6.5" font-weight="700">RAVINE</text>

            <!-- Stunt Jump Ramps (Cyan triangles) -->
            <g v-for="ramp in rampMinimapList" :key="ramp.id">
              <polygon
                :points="`${ramp.x - 6},${ramp.y + 3.5} ${ramp.x + 6},${ramp.y + 3.5} ${ramp.x},${ramp.y - 3.5}`"
                fill="#00f2fe"
                stroke="#0369a1"
                stroke-width="0.8"
                opacity="0.95"
              />
            </g>

            <!-- Scrap Pickups (Golden diamonds) -->
            <g v-for="sc in scrapMinimapList" :key="sc.id">
              <polygon
                :points="`${sc.x},${sc.y - 3} ${sc.x + 3},${sc.y} ${sc.x},${sc.y + 3} ${sc.x - 3},${sc.y}`"
                fill="#fbbf24"
                stroke="#78350f"
                stroke-width="0.6"
                opacity="0.95"
              />
            </g>

            <!-- Big Rig blip (Convoy Mode) -->
            <g v-if="rigMinimapPos" :transform="`translate(${rigMinimapPos.x}, ${rigMinimapPos.y})`">
              <rect x="-4" y="-7" width="8" height="14" fill="#f59e0b" rx="2" stroke="#fff" stroke-width="1.2" />
              <line x1="0" y1="-7" x2="0" y2="-11" stroke="#f59e0b" stroke-width="2" />
            </g>

            <!-- Other Vehicle Blips -->
            <g v-for="v in vehicleMinimapList" :key="v.id" :transform="`translate(${v.x}, ${v.y})`">
              <circle
                :r="v.isMe ? 4.5 : 3.2"
                :fill="v.color"
                :stroke="v.isMe ? '#ffffff' : 'rgba(0,0,0,0.6)'"
                :stroke-width="v.isMe ? 1.5 : 0.8"
              />
              <!-- Direction Heading Arrow -->
              <line x1="0" y1="0" :x2="v.dirX" :y2="v.dirY" :stroke="v.color" stroke-width="1.8" stroke-linecap="round" />
            </g>
          </svg>
        </div>

        <div class="radar-legend">
          <span class="legend-blip"><span class="pip blue"></span>Blue</span>
          <span class="legend-blip"><span class="pip red"></span>Red</span>
          <span class="legend-blip"><span class="pip cyan"></span>Ramp</span>
          <span class="legend-blip"><span class="pip gold"></span>Scrap</span>
        </div>
      </div>

      <!-- 1.4 Floating Combat Damage Numbers Layer -->
      <div class="floating-damage-layer">
        <div
          v-for="dmg in floatingDamageList"
          :key="dmg.id"
          class="floating-damage-number"
          :class="{ crit: dmg.isCrit }"
          :style="{
            left: `${dmg.screenX}px`,
            top: `${dmg.screenY}px`,
            opacity: dmg.opacity
          }"
        >
          {{ dmg.text }}{{ dmg.isCrit ? ' CRIT!' : '' }}
        </div>
      </div>

      <!-- High-Impact Hit Marker Overlay -->
      <div v-if="hitConfirmedActive" class="hud-hitmarker">
        <div class="hit-pip top-left"></div>
        <div class="hit-pip top-right"></div>
        <div class="hit-pip bottom-left"></div>
        <div class="hit-pip bottom-right"></div>
        <span class="hit-damage-text">HIT</span>
      </div>

      <!-- Low Health Danger Pulse Vignette on Screen Edges -->
      <div
        v-if="myVehicle && myVehicle.alive && (myVehicle.hp / myVehicle.maxHp) < 0.35"
        class="low-health-vignette"
        :class="{ intense: (myVehicle.hp / myVehicle.maxHp) < 0.18 }"
      ></div>

      <!-- Player Damage Hit Flash Overlay -->
      <div v-if="playerDamageFlash" class="player-damage-flash"></div>

      <!-- Bottom Left: Local Player Status & Dashboard -->
      <div v-if="myVehicle" class="hud-bottom-left glass-panel">
        <div class="driver-profile">
          <div class="vehicle-role-badge" :class="myVehicle.team === 'convoy' ? 'support' : 'raider'">
            {{ isPointBattle ? (myVehicle.team === 'convoy' ? 'COBALT ENFORCER (BLUE)' : 'CRIMSON RAIDER (RED)') : (myVehicle.role === 'rig' ? 'THE BIG RIG' : myVehicle.role === 'support' ? 'CONVOY ESCORT' : 'RAIDER BUGGY') }}
          </div>
          <div class="driver-name">{{ platformState.myNickname }}</div>
        </div>

        <div class="player-hp-bar" :class="{ 'damage-pulse': isPlayerDamaged }">
          <div class="hp-label-row">
            <span class="hp-armor-title">
              <span class="hp-shield-icon">🛡️</span> ARMOR / HP
            </span>
            <span class="hp-numbers" :class="hpStatusClass">
              {{ Math.max(0, Math.round(myVehicle.hp)) }} / {{ myVehicle.maxHp }}
              <span class="hp-pct">({{ Math.round(Math.max(0, (myVehicle.hp / myVehicle.maxHp) * 100)) }}%)</span>
            </span>
          </div>
          <div class="health-track heavy-armor player-track">
            <div
              class="health-fill"
              :class="hpStatusClass"
              :style="{ width: `${Math.max(0, (myVehicle.hp / myVehicle.maxHp) * 100)}%` }"
            ></div>
            <div class="armor-segments">
              <div v-for="s in 7" :key="s" class="segment-notch"></div>
            </div>
          </div>
          <div v-if="(myVehicle.hp / myVehicle.maxHp) < 0.3 && myVehicle.alive" class="low-hp-warning-badge">
            ⚠️ CRITICAL DAMAGE — REPAIR AT GOLD SCRAP!
          </div>
        </div>

        <div class="vehicle-stats-row">
          <div class="stat-box">
            <span class="stat-lbl">SPEED</span>
            <span class="stat-val">{{ Math.round(Math.abs(myVehicle.speed) * 4.2) }} <small>KM/H</small></span>
          </div>
          <div class="stat-box">
            <span class="stat-lbl">KILLS</span>
            <span class="stat-val gold">{{ myVehicle.kills || 0 }}</span>
          </div>
        </div>

        <!-- Combat Buggy Lives / Respawns Remaining Indicator -->
        <div v-if="myVehicle.role !== 'rig'" class="lives-indicator-box">
          <span class="stat-lbl">COMBAT LIVES</span>
          <div class="lives-row">
            <div class="lives-pips">
              <span
                v-for="i in 3"
                :key="i"
                class="life-pip"
                :class="{ active: (myVehicle.respawnsLeft ?? 0) >= i, lost: (myVehicle.respawnsLeft ?? 0) < i }"
              >
                ●
              </span>
            </div>
            <span class="lives-text" :class="{ eliminated: (myVehicle.respawnsLeft ?? 0) === 0 && !myVehicle.alive }">
              {{ (myVehicle.respawnsLeft ?? 0) === 0 && !myVehicle.alive ? 'ELIMINATED' : `${myVehicle.respawnsLeft ?? 0} / 3 Respawns` }}
            </span>
          </div>
        </div>

        <!-- Weapon Arsenal Selection Row (for combat vehicles) -->
        <div v-if="myVehicle.role !== 'rig'" class="weapon-arsenal-box">
          <div class="weapon-arsenal-header">
            <span class="stat-lbl">WEAPON ARSENAL</span>
            <span class="wep-hint">[1] [2] [3] / [Q][E]</span>
          </div>
          <div class="weapon-selector-row">
            <button
              type="button"
              class="btn-weapon-pill"
              :class="{
                active: currentWeapon === 'twin_cannon',
                cooldown: currentWeapon === 'twin_cannon' && (myVehicle.shootCooldown || 0) > 0
              }"
              @click="handleSelectWeapon('twin_cannon')"
              title="Twin Autocannons - Rapid Bursts (0.2s CD)"
            >
              <span class="wep-key">1</span>
              <span class="wep-name">Twin Cannon</span>
            </button>
            <button
              type="button"
              class="btn-weapon-pill"
              :class="{
                active: currentWeapon === 'homing_missile',
                cooldown: currentWeapon === 'homing_missile' && (myVehicle.shootCooldown || 0) > 0
              }"
              @click="handleSelectWeapon('homing_missile')"
              title="Homing Missile - Guided Target Tracking (1.4s CD)"
            >
              <span class="wep-key">2</span>
              <span class="wep-name">Homing Missile</span>
              <span v-if="currentWeapon === 'homing_missile' && (myVehicle.shootCooldown || 0) > 0" class="wep-cd-badge">
                {{ (myVehicle.shootCooldown || 0).toFixed(1) }}s
              </span>
            </button>
            <button
              type="button"
              class="btn-weapon-pill"
              :class="{
                active: currentWeapon === 'shotgun_spread',
                cooldown: currentWeapon === 'shotgun_spread' && (myVehicle.shootCooldown || 0) > 0
              }"
              @click="handleSelectWeapon('shotgun_spread')"
              title="4-Shot Spread - Close Quarters Flak Blast (0.65s CD)"
            >
              <span class="wep-key">3</span>
              <span class="wep-name">4-Shot Spread</span>
            </button>
          </div>
        </div>

        <!-- Nitro Boost widget for Small Combat Vehicles -->
        <div class="boost-widget">
          <button
            class="btn-boost"
            :class="{ active: (myVehicle.boostActiveTimer || 0) > 0, ready: (myVehicle.boostCooldown || 0) <= 0 }"
            :disabled="(myVehicle.boostCooldown || 0) > 0"
            @mousedown="startBoost"
            @mouseup="stopBoost"
            @mouseleave="stopBoost"
            @touchstart.prevent="startBoost"
            @touchend.prevent="stopBoost"
          >
            <div class="boost-content">
              <span class="boost-title">
                {{ (myVehicle.boostActiveTimer || 0) > 0 ? 'NITRO SURGE ACTIVE!' : (myVehicle.boostCooldown || 0) <= 0 ? 'NITRO BOOST READY' : `RECHARGING (${(myVehicle.boostCooldown || 0).toFixed(1)}s)` }}
              </span>
              <span class="boost-hotkey">HOLD SHIFT</span>
            </div>
            <div
              v-if="(myVehicle.boostCooldown || 0) > 0"
              class="boost-recharge-bar"
              :style="{ width: `${Math.max(0, (1 - (myVehicle.boostCooldown || 0) / 3.5) * 100)}%` }"
            ></div>
          </button>
        </div>

        <button class="btn-secondary btn-sm full-width" @click="showRoleSelect = true">
          {{ isPointBattle ? 'Change Team' : 'Change Vehicle' }}
        </button>
      </div>

      <!-- Bottom Right: Controls Help -->
      <div class="hud-bottom-right glass-panel">
        <div class="controls-guide">
          <div class="key-row"><kbd>W</kbd><kbd>S</kbd> / <kbd>↑</kbd><kbd>↓</kbd> <span>Throttle / Reverse</span></div>
          <div class="key-row"><kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> <span>Steering</span></div>
          <div class="key-row">
            <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> / <kbd>Q</kbd><kbd>E</kbd>
            <span>Switch Weapons</span>
          </div>
          <div class="key-row">
            <kbd>SPACE</kbd> / <kbd>L-CLICK</kbd>
            <span>Fire Weapon</span>
          </div>
          <div class="key-row">
            <kbd>SHIFT</kbd>
            <span>Nitro Speed Boost</span>
          </div>
        </div>
      </div>

      <!-- Floating Kill / Alert Feed -->
      <div v-if="alertMessage" class="hud-alert-banner">
        {{ alertMessage }}
      </div>

      <!-- Role Selection Overlay -->
      <div v-if="showRoleSelect || !myVehicle" class="hud-role-selector glass-panel">
        <div class="role-selector-header">
          <div class="header-top-row">
            <h2>{{ isPointBattle ? 'SELECT YOUR BATTLE CAR & TEAM' : 'SELECT YOUR VEHICLE & ROLE' }}</h2>
            <button v-if="myVehicle" class="btn-secondary btn-sm" @click="showRoleSelect = false">Close</button>
          </div>
          <p v-if="isPointBattle">
            Two teams of battle cars fight for points across the dunes! Frag enemy buggies (+100 PTS) and collect glowing Scrap Salvage (+25 PTS).
          </p>
          <p v-else>
            The War Rig is automated and cruising to Canyon Outpost. Choose your combat vehicle to defend or attack.
          </p>
        </div>

        <div class="roles-grid two-cols">
          <!-- Blue Team Card -->
          <div
            class="role-card convoy"
            :class="{ active: myVehicle?.team === 'convoy' || (!myVehicle && true) }"
            @click="selectRole('convoy', 'support')"
          >
            <div class="role-badge">{{ isPointBattle ? 'TEAM BLUE' : 'DEFENDERS (DEFAULT)' }}</div>
            <div class="role-icon-box">ENFORCER</div>
            <div class="role-name">{{ isPointBattle ? 'Cobalt Enforcer' : 'Convoy Escort' }}</div>
            <div class="role-desc">
              {{ isPointBattle
                ? 'High-speed battle car in cobalt blue livery. Twin roof autocannons and nitro speed boost.'
                : 'High-speed buggy with twin cannons and nitro boost. Defend the automated War Rig against the attacking raiders.'
              }}
            </div>
            <div class="role-meta">
              <span>TWIN CANNONS</span>
              <span>NITRO BOOST</span>
              <span>250 HP</span>
            </div>
            <button class="btn-primary full-width" @click.stop="selectRole('convoy', 'support')">
              {{ isPointBattle ? 'Join Cobalt Blue' : 'Drive Escort Buggy' }}
            </button>
          </div>

          <!-- Red Team Card -->
          <div
            class="role-card raider"
            :class="{ active: myVehicle?.team === 'raiders' }"
            @click="selectRole('raiders', 'raider')"
          >
            <div class="role-badge raider-badge">{{ isPointBattle ? 'TEAM RED' : 'ATTACKERS' }}</div>
            <div class="role-icon-box raider-box">RAIDER</div>
            <div class="role-name">{{ isPointBattle ? 'Crimson Raider' : 'Raider Buggy' }}</div>
            <div class="role-desc">
              {{ isPointBattle
                ? 'Agile wasteland interceptor in crimson red livery. Twin roof autocannons and nitro speed boost.'
                : 'Agile wasteland interceptor with twin cannons and nitro boost. Swarm the automated War Rig and destroy it before the gate.'
              }}
            </div>
            <div class="role-meta">
              <span>TWIN CANNONS</span>
              <span>NITRO BOOST</span>
              <span>250 HP</span>
            </div>
            <button class="btn-danger full-width" @click.stop="selectRole('raiders', 'raider')">
              {{ isPointBattle ? 'Join Crimson Red' : 'Join Raiders' }}
            </button>
          </div>
        </div>

        <!-- Mode Toggle, Theme & Start Row -->
        <div class="modal-footer-row">
          <button class="btn-secondary" @click="toggleGameMode">
            Switch to {{ isPointBattle ? 'Big Rig Convoy Mode' : 'Team Point Battle Mode' }}
          </button>
          <button class="btn-theme-pill" @click="toggleEnvironmentTheme">
            {{ environmentTheme === 'grassland' ? '🌲 Theme: Grassland' : '🏜️ Theme: Desert' }}
          </button>
          <button v-if="platformState.gameStatus !== 'in_progress'" class="btn-primary btn-large" @click="handleStartMatch">
            Launch Battle
          </button>
        </div>
      </div>

      <!-- Respawn Banner if Destroyed -->
      <div
        v-if="myVehicle && !myVehicle.alive && platformState.gameStatus === 'in_progress'"
        class="respawn-modal glass-panel"
        :class="{ eliminated: (myVehicle.respawnsLeft ?? 0) <= 0 }"
      >
        <template v-if="(myVehicle.respawnsLeft ?? 0) > 0">
          <h3>VEHICLE DESTROYED</h3>
          <div class="lives-remaining-banner">
            <span class="banner-label">RESPAWNS REMAINING:</span>
            <span class="banner-count">{{ myVehicle.respawnsLeft }} / 3</span>
          </div>
          <p v-if="isPointBattle">
            Your battle car was blown up! Respawning at team base in {{ Math.max(1, Math.ceil(myVehicle.respawnTimer || 3)) }}s...
          </p>
          <p v-else-if="myVehicle.role === 'rig'">The War Rig was destroyed! The round is lost.</p>
          <p v-else>Your buggy was blown up. Respawning at base in {{ Math.max(1, Math.ceil(myVehicle.respawnTimer || 3)) }}s...</p>
          <button class="btn-primary" @click="handleRespawn">
            Respawn Immediately
          </button>
        </template>
        <template v-else>
          <div class="eliminated-skull">☠</div>
          <h3>OUT OF RESPAWNS</h3>
          <p class="eliminated-text">
            All 3 of your battle car respawns have been exhausted. You are permanently eliminated for this round!
          </p>
          <div class="spectate-badge">SPECTATING MATCH</div>
        </template>
      </div>

      <!-- Round End Outcome Overlay -->
      <div v-if="platformState.gameStatus === 'round_ended'" class="round-end-overlay glass-panel">
        <div class="victory-header">
          <div class="victory-subtitle">ROUND CONCLUDED</div>
          <template v-if="isPointBattle">
            <h1 :class="gameState?.winnerTeam === 'convoy' ? 'text-convoy' : gameState?.winnerTeam === 'raiders' ? 'text-raider' : 'text-gold'">
              {{ gameState?.winnerTeam === 'convoy' ? 'COBALT BLUE WINS!' : gameState?.winnerTeam === 'raiders' ? 'CRIMSON RED WINS!' : 'MATCH DRAW!' }}
            </h1>
            <div class="points-final-banner">
              <div class="final-score-pill blue">
                <span class="team-label">COBALT BLUE</span>
                <span class="team-score-num">{{ blueScore }} PTS</span>
              </div>
              <span class="score-vs-divider">VS</span>
              <div class="final-score-pill red">
                <span class="team-label">CRIMSON RED</span>
                <span class="team-score-num">{{ redScore }} PTS</span>
              </div>
            </div>
            <p class="summary-text">
              Target was {{ targetScore }} points. Kills rewarded +100 PTS, Scrap salvage rewarded +25 PTS!
            </p>
          </template>
          <template v-else>
            <h1 :class="gameState?.winnerTeam === 'convoy' ? 'text-convoy' : 'text-raider'">
              {{ gameState?.winnerTeam === 'convoy' ? 'CONVOY ESCAPED!' : 'WAR RIG DESTROYED!' }}
            </h1>
            <p class="summary-text">
              {{ gameState?.winnerTeam === 'convoy'
                ? 'The War Rig reached the safety of the Canyon Outpost. Convoy defenders win!'
                : 'The Raiders overwhelmed and demolished the War Rig. Raiders victory!'
              }}
            </p>
          </template>
        </div>

        <div class="round-actions">
          <button class="btn-primary btn-large" @click="handleRestartRound">
            Start Next Round
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as THREE from 'three';
import {
  platformState,
  privatePlayerView,
  sendGameAction,
  startGame,
} from '../colyseus.js';

// Deterministic terrain formula shared with server (river, ravine, redoubt, cliffs)
function getTerrainHeight(x: number, z: number): number {
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

type WeaponType = 'twin_cannon' | 'homing_missile' | 'shotgun_spread';

interface SpikePit {
  id: string;
  x: number;
  z: number;
  radius: number;
}

interface BoostMat {
  id: string;
  x: number;
  z: number;
  yaw: number;
  radius: number;
}

interface ShieldPickup {
  id: string;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
}

interface TerrainObstacle {
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

const TERRAIN_OBSTACLES: TerrainObstacle[] = createTerrainObstacles();

// Surface elevation accounting for natural terrain contour plus 3D stunt jump ramps
function getSurfaceHeight(x: number, z: number): number {
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

function getObstacleHeight(obs: TerrainObstacle): number {
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

function createSpikePits(): SpikePit[] {
  return [
    { id: 'pit_center_w', x: -22, z: 0, radius: 4.5 },
    { id: 'pit_center_e', x: 22, z: 0, radius: 4.5 },
    { id: 'pit_south_choke', x: -16, z: -125, radius: 4.2 },
    { id: 'pit_north_choke', x: 16, z: 145, radius: 4.2 },
  ];
}

function createBoostMats(): BoostMat[] {
  return [];
}

const SPIKE_PITS: SpikePit[] = createSpikePits();
const BOOST_MATS: BoostMat[] = createBoostMats();

const canvasContainer = ref<HTMLDivElement | null>(null);
const alertMessage = ref<string | null>(null);
const showRoleSelect = ref(false);
const hitMarkerActive = ref(false);
let hitTimeout: any = null;

const gameState = computed(() => privatePlayerView.value);

const gameMode = computed(() => gameState.value?.gameMode ?? 'point_battle');
const isPointBattle = computed(() => gameMode.value === 'point_battle');

const teamScores = computed(() => gameState.value?.teamScores ?? { convoy: 0, raiders: 0 });
const blueScore = computed(() => teamScores.value.convoy || 0);
const redScore = computed(() => teamScores.value.raiders || 0);
const targetScore = computed(() => gameState.value?.targetScore ?? 500);

const blueProgressPct = computed(() => Math.min(100, (blueScore.value / targetScore.value) * 100));
const redProgressPct = computed(() => Math.min(100, (redScore.value / targetScore.value) * 100));

const blueCarsAlive = computed(() => {
  if (!gameState.value?.vehicles) return 0;
  return gameState.value.vehicles.filter((v: any) => v.team === 'convoy' && v.alive).length;
});

const redCarsAlive = computed(() => {
  if (!gameState.value?.vehicles) return 0;
  return gameState.value.vehicles.filter((v: any) => v.team === 'raiders' && v.alive).length;
});

const blueCarsRemaining = computed(() => {
  if (!gameState.value?.vehicles) return 0;
  return gameState.value.vehicles.filter((v: any) => v.team === 'convoy' && (v.alive || (v.respawnsLeft ?? 0) > 0)).length;
});

const redCarsRemaining = computed(() => {
  if (!gameState.value?.vehicles) return 0;
  return gameState.value.vehicles.filter((v: any) => v.team === 'raiders' && (v.alive || (v.respawnsLeft ?? 0) > 0)).length;
});

const environmentTheme = ref<'grassland' | 'desert'>('grassland');

// 1.1 Tactical Minimap Radar Coordinates Projection
// Map X: [-120, 120] -> SVG [0, 160]
// Map Z: [-160, 220] -> SVG [220, 0] (North is Z = +220 at top of SVG Y = 0)
function mapToRadar(x: number, z: number): { x: number; y: number } {
  const radarX = Math.max(4, Math.min(156, ((x + 120) / 240) * 160));
  const radarY = Math.max(4, Math.min(216, ((220 - z) / 380) * 220));
  return { x: Math.round(radarX), y: Math.round(radarY) };
}

const rampMinimapList = computed(() => {
  return TERRAIN_OBSTACLES.filter((o) => o.type === 'jump_ramp').map((r) => {
    const pt = mapToRadar(r.x, r.z);
    return { id: r.id, x: pt.x, y: pt.y };
  });
});

const boostMatMinimapList = computed(() => {
  return BOOST_MATS.map((bm) => {
    const pt = mapToRadar(bm.x, bm.z);
    return { id: bm.id, x: pt.x, y: pt.y };
  });
});

const scrapMinimapList = computed(() => {
  const scraps = gameState.value?.scrapCaches || [];
  return scraps
    .filter((s: any) => s.active)
    .map((s: any) => {
      const pt = mapToRadar(s.x, s.z);
      return { id: s.id, x: pt.x, y: pt.y };
    });
});

const rigMinimapPos = computed(() => {
  if (isPointBattle.value) return null;
  const rig = rigVehicle.value;
  if (!rig || !rig.alive) return null;
  return mapToRadar(rig.x, rig.z);
});

const vehicleMinimapList = computed(() => {
  const vehicles = gameState.value?.vehicles || [];
  return vehicles
    .filter((v: any) => v.alive && v.role !== 'rig')
    .map((v: any) => {
      const pt = mapToRadar(v.x, v.z);
      const isMe = myVehicle.value?.playerId === v.playerId;
      const isConvoy = v.team === 'convoy';
      const color = isMe ? '#ffffff' : (isConvoy ? '#38bdf8' : '#ef4444');
      const yaw = v.yaw || 0;
      const dirX = Math.sin(yaw) * 6;
      const dirY = -Math.cos(yaw) * 6;
      return { id: v.playerId, x: pt.x, y: pt.y, dirX, dirY, isMe, color };
    });
});

// 1.4 Floating Combat Damage Numbers
interface FloatingDamageText {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  isCrit: boolean;
  opacity: number;
  screenX: number;
  screenY: number;
  age: number;
}
const floatingDamageList = ref<FloatingDamageText[]>([]);
let nextDamageId = 1;

function spawnFloatingDamage(x: number, y: number, z: number, damage: number, isCrit: boolean = false) {
  if (floatingDamageList.value.length > 25) {
    floatingDamageList.value.shift();
  }
  floatingDamageList.value.push({
    id: nextDamageId++,
    x,
    y: y + 1.2,
    z,
    text: `-${Math.round(damage)}`,
    isCrit: isCrit || damage >= 40,
    opacity: 1,
    screenX: -100,
    screenY: -100,
    age: 0,
  });
}

function toggleEnvironmentTheme() {
  const next = environmentTheme.value === 'grassland' ? 'desert' : 'grassland';
  applyEnvironmentTheme(next);
  triggerAlert(`ENVIRONMENT: Switched to ${next === 'grassland' ? '🌲 Emerald Grassland' : '🏜️ Wasteland Desert'}`);
}

const recentEvent = computed(() => gameState.value?.recentEvent || null);
watch(recentEvent, (newEv) => {
  if (newEv) {
    triggerAlert(newEv);
  }
});

const myVehicle = computed(() => {
  if (!gameState.value?.vehicles) return null;
  return gameState.value.vehicles.find((v: any) => v.playerId === platformState.mySessionId);
});

const myHp = computed(() => myVehicle.value?.hp || 0);
const myMaxHp = computed(() => myVehicle.value?.maxHp || 350);

const hpRatio = computed(() => {
  if (!myMaxHp.value) return 1;
  return Math.max(0, Math.min(1, myHp.value / myMaxHp.value));
});

const hpStatusClass = computed(() => {
  const r = hpRatio.value;
  if (r < 0.25) return 'critical';
  if (r < 0.55) return 'warning';
  return 'healthy';
});

const playerDamageFlash = ref(false);
const isPlayerDamaged = ref(false);
let playerDamageFlashTimer = 0;

watch(myHp, (newHp, oldHp) => {
  if (oldHp !== undefined && newHp < oldHp - 0.5) {
    playerDamageFlashTimer = 0.35;
    playerDamageFlash.value = true;
    isPlayerDamaged.value = true;
  }
});

const rigVehicle = computed(() => {
  if (!gameState.value?.vehicles) return null;
  return gameState.value.vehicles.find((v: any) => v.role === 'rig');
});

const rigHp = computed(() => rigVehicle.value?.hp || 0);
const rigMaxHp = computed(() => rigVehicle.value?.maxHp || 2200);

// Hit flash watcher when Rig takes bullet or ram damage
watch(rigHp, (newHp, oldHp) => {
  if (oldHp !== undefined && newHp < oldHp) {
    hitMarkerActive.value = true;
    if (hitTimeout) clearTimeout(hitTimeout);
    hitTimeout = setTimeout(() => {
      hitMarkerActive.value = false;
    }, 450);

    if (rigVehicle.value) {
      spawnHitSpark(rigVehicle.value.x, rigVehicle.value.y + 1.2, rigVehicle.value.z);
    }
  }
});

const rigDistanceLeft = computed(() => {
  if (!rigVehicle.value) return 400;
  return Math.max(0, 220 - rigVehicle.value.z);
});

const destinationPointerAngle = ref(0);

const distanceToOutpost = computed(() => {
  const v = myVehicle.value || rigVehicle.value;
  if (!v) return 220;
  return Math.hypot(v.x, 220 - v.z);
});

const outpostProgressPct = computed(() => {
  const v = rigVehicle.value || myVehicle.value;
  if (!v) return 0;
  const traveled = v.z - (-180);
  return Math.max(0, Math.min(100, (traveled / 400) * 100));
});

let lastPacketTime = performance.now();
watch(gameState, () => {
  lastPacketTime = performance.now();
}, { deep: false });

const roundTimeLeft = computed(() => {
  return gameState.value?.roundTimeLeft ?? (isPointBattle.value ? 180 : 120);
});

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function selectRole(team: 'convoy' | 'raiders', role: 'support' | 'raider') {
  if (platformState.gameStatus !== 'in_progress') {
    startGame();
  }
  sendGameAction({ type: 'select_role', team, role });
  showRoleSelect.value = false;
}

function handleStartMatch() {
  startGame();
  showRoleSelect.value = false;
}

function handleRespawn() {
  if (myVehicle.value && (myVehicle.value.respawnsLeft ?? 0) <= 0) {
    triggerAlert('No respawns remaining! You are eliminated for this round.');
    return;
  }
  sendGameAction({ type: 'respawn' });
}

function toggleGameMode() {
  const nextMode = isPointBattle.value ? 'convoy' : 'point_battle';
  sendGameAction({ type: 'set_game_mode', mode: nextMode });
}

function handleRestartRound() {
  sendGameAction({ type: 'restart_round' });
  triggerAlert('ROUND RESTARTED! ENGAGE!');
}

let isTouchBoosting = false;

function startBoost() {
  if (!myVehicle.value || myVehicle.value.role === 'rig') return;
  if ((myVehicle.value.boostCooldown || 0) > 0) return;
  isTouchBoosting = true;
  dispatchVehicleControls();
}

function stopBoost() {
  if (isTouchBoosting) {
    isTouchBoosting = false;
    dispatchVehicleControls();
  }
}

function handleBoostAction() {
  if (!myVehicle.value || myVehicle.value.role === 'rig') return;
  if ((myVehicle.value.boostCooldown || 0) > 0) {
    triggerAlert(`Boost recharging: ${(myVehicle.value.boostCooldown || 0).toFixed(1)}s`);
    return;
  }
  isTouchBoosting = !isTouchBoosting;
  dispatchVehicleControls();
  if (isTouchBoosting) {
    triggerAlert('HOLD SHIFT TO NITRO BOOST!');
  }
}

const currentWeapon = computed<WeaponType>(() => {
  return myVehicle.value?.weapon || 'twin_cannon';
});

const weaponOrder: WeaponType[] = ['twin_cannon', 'homing_missile', 'shotgun_spread'];

function handleSelectWeapon(weapon: WeaponType) {
  if (!myVehicle.value) return;
  if (myVehicle.value.role === 'rig') {
    triggerAlert('The War Rig cannot equip weapons!');
    return;
  }
  sendGameAction({ type: 'select_weapon', weapon });
}

function cycleWeapon(direction: 1 | -1 = 1) {
  const cur = currentWeapon.value;
  const idx = weaponOrder.indexOf(cur);
  const nextIdx = (idx + direction + weaponOrder.length) % weaponOrder.length;
  handleSelectWeapon(weaponOrder[nextIdx]);
}

// -------------------------------------------------------------
// THREE.JS SCENE, VEHICLES & RENDER LOOP
// -------------------------------------------------------------
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let smoothedCamTarget: THREE.Vector3 | null = null;
let animationFrameId: number | null = null;

// Meshes caches
const vehicleMeshes = new Map<string, THREE.Group>();
const bulletMeshes: THREE.Group[] = [];
const vehicleAliveState = new Map<string, boolean>();
const vehiclePrevHp = new Map<string, number>();

const hitConfirmedActive = ref(false);
let hitConfirmedTimeout: any = null;

function triggerHitMarker() {
  hitConfirmedActive.value = true;
  if (hitConfirmedTimeout) clearTimeout(hitConfirmedTimeout);
  hitConfirmedTimeout = setTimeout(() => {
    hitConfirmedActive.value = false;
  }, 160);
}

interface Explosion {
  mesh: THREE.Group;
  age: number;
  maxAge: number;
  scaleRate: number;
}
const activeExplosions: Explosion[] = [];

// Scene, lighting, and terrain theme references
let ambientLightRef: THREE.AmbientLight | null = null;
let hemiLightRef: THREE.HemisphereLight | null = null;
let sunLightRef: THREE.DirectionalLight | null = null;
let terrainMeshRef: THREE.Mesh | null = null;
let terrainPropsGroupRef: THREE.Group | null = null;

// Camera screenshake system (disabled - camera is rock-solid and smooth)
let cameraShakeIntensity = 0;
function triggerCameraShake(_intensity: number = 0) {
  // Screenshake completely disabled
  cameraShakeIntensity = 0;
}

// 2.1 Object pooling for tire spray particles (eliminates allocations and GC pauses)
interface PooledTireParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  active: boolean;
}
const TIRE_POOL_SIZE = 50;
const tireParticlePool: PooledTireParticle[] = [];
let tireGrassMat1: THREE.MeshBasicMaterial;
let tireGrassMat2: THREE.MeshBasicMaterial;
let tireSandMat1: THREE.MeshBasicMaterial;
let tireSandMat2: THREE.MeshBasicMaterial;
const tireParticleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

function initTireParticlePool(targetScene: THREE.Scene) {
  tireGrassMat1 = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 });
  tireGrassMat2 = new THREE.MeshBasicMaterial({ color: 0x14532d, transparent: true, opacity: 0.85 });
  tireSandMat1 = new THREE.MeshBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0.85 });
  tireSandMat2 = new THREE.MeshBasicMaterial({ color: 0x78350f, transparent: true, opacity: 0.85 });

  for (let i = 0; i < TIRE_POOL_SIZE; i++) {
    const mesh = new THREE.Mesh(tireParticleGeo, tireGrassMat1);
    mesh.visible = false;
    targetScene.add(mesh);
    tireParticlePool.push({
      mesh,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      maxAge: 0.4,
      active: false,
    });
  }
}

function spawnPooledTireParticle(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  maxAge: number,
  isGrass: boolean
) {
  const p = tireParticlePool.find((item) => !item.active);
  if (!p) return;
  p.active = true;
  p.age = 0;
  p.maxAge = maxAge;
  p.vx = vx;
  p.vy = vy;
  p.vz = vz;
  p.mesh.position.set(x, y, z);
  p.mesh.scale.set(1, 1, 1);
  p.mesh.material = isGrass
    ? (Math.random() < 0.65 ? tireGrassMat1 : tireGrassMat2)
    : (Math.random() < 0.65 ? tireSandMat1 : tireSandMat2);
  p.mesh.visible = true;
}

function applyEnvironmentTheme(theme: 'grassland' | 'desert') {
  environmentTheme.value = theme;
  if (!scene) return;

  const isGrass = theme === 'grassland';
  scene.background = new THREE.Color(isGrass ? 0x60a5fa : 0xf6af62);
  scene.fog = new THREE.Fog(isGrass ? 0x93c5fd : 0xf6af62, 180, 520);

  if (ambientLightRef) {
    ambientLightRef.color.setHex(isGrass ? 0xdbeafe : 0xffedd5);
    ambientLightRef.intensity = isGrass ? 0.5 : 0.42;
  }
  if (hemiLightRef) {
    hemiLightRef.color.setHex(isGrass ? 0x93c5fd : 0xbfdbfe);
    hemiLightRef.groundColor.setHex(isGrass ? 0x166534 : 0xb45309);
  }
  if (sunLightRef) {
    sunLightRef.color.setHex(isGrass ? 0xfffbeb : 0xfffaed);
  }

  // Update terrain mesh vertex colors
  if (terrainMeshRef) {
    const geo = terrainMeshRef.geometry;
    const pos = geo.attributes.position;
    const colorAttr = geo.attributes.color as THREE.BufferAttribute;
    if (colorAttr) {
      const colorDepths = isGrass ? new THREE.Color(0x14532d) : new THREE.Color(0xa7511c);
      const colorPlains = isGrass ? new THREE.Color(0x16a34a) : new THREE.Color(0xd97706);
      const colorCrests = isGrass ? new THREE.Color(0x84cc16) : new THREE.Color(0xfef08a);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = Math.max(0, Math.min(1, (y + 7.5) / 15.0));
        const vertexColor = new THREE.Color();
        if (t < 0.5) {
          vertexColor.copy(colorDepths).lerp(colorPlains, t * 2.0);
        } else {
          vertexColor.copy(colorPlains).lerp(colorCrests, (t - 0.5) * 2.0);
        }
        colorAttr.setXYZ(i, vertexColor.r, vertexColor.g, vertexColor.b);
      }
      colorAttr.needsUpdate = true;
    }
  }

  // Rebuild terrain props
  if (terrainPropsGroupRef) {
    scene.remove(terrainPropsGroupRef);
    boostMatMeshes.length = 0;
  }
  buildTerrainProps(scene, theme);
}

// Small punchy bullet/armor impact sparks (does not block vision)
function spawnHitSpark(x: number, y: number, z: number) {
  if (!scene) return;
  const group = new THREE.Group();
  group.position.set(
    x + (Math.random() - 0.5) * 1.6,
    y + (Math.random() - 0.5) * 0.8,
    z + (Math.random() - 0.5) * 2.4
  );

  const sparkGeo = new THREE.SphereGeometry(0.35, 6, 6);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff066, transparent: true, opacity: 0.95 });
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  group.add(spark);

  const speckGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const speckMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(speckGeo, speckMat);
    s.position.set((Math.random() - 0.5) * 0.8, Math.random() * 0.5, (Math.random() - 0.5) * 0.8);
    group.add(s);
  }

  scene.add(group);
  activeExplosions.push({
    mesh: group,
    age: 0,
    maxAge: 0.25,
    scaleRate: 1.5,
  });
}

// Crisp, well-proportioned vehicle destruction explosion
function spawnExplosion(x: number, y: number, z: number, isBig: boolean = false) {
  if (!scene) return;
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Core blazing fireball
  const coreRadius = isBig ? 1.6 : 0.9;
  const coreGeo = new THREE.SphereGeometry(coreRadius, 8, 8);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.95,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Outer orange shockwave sphere
  const outerRadius = isBig ? 2.5 : 1.4;
  const outerGeo = new THREE.SphereGeometry(outerRadius, 8, 8);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    transparent: true,
    opacity: 0.75,
  });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  group.add(outer);

  // Flying burning debris fragments
  const debrisCount = isBig ? 8 : 4;
  const debrisGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const debrisMat = new THREE.MeshBasicMaterial({ color: 0x1f1f1f });
  for (let i = 0; i < debrisCount; i++) {
    const deb = new THREE.Mesh(debrisGeo, debrisMat);
    const angle = (i / debrisCount) * Math.PI * 2;
    const rad = (Math.random() + 0.5) * (isBig ? 2.2 : 1.2);
    deb.position.set(
      Math.cos(angle) * rad,
      (Math.random() + 0.5) * (isBig ? 1.8 : 1.0),
      Math.sin(angle) * rad
    );
    group.add(deb);
  }

  scene.add(group);

  activeExplosions.push({
    mesh: group,
    age: 0,
    maxAge: isBig ? 0.85 : 0.5,
    scaleRate: isBig ? 2.2 : 1.6,
  });
}

// -------------------------------------------------------------
// WAR RIG OVERHEAD 3D FLOATING HEALTH BAR (BILLBOARD SPRITE)
// -------------------------------------------------------------
let rigHealthSprite: THREE.Sprite | null = null;
let rigHealthCanvas: HTMLCanvasElement | null = null;
let rigHealthCtx: CanvasRenderingContext2D | null = null;
let rigHealthTexture: THREE.CanvasTexture | null = null;
let lastRenderedRigHp = -1;
let lastRenderedRigMaxHp = -1;

function initRigHealthBar() {
  rigHealthCanvas = document.createElement('canvas');
  rigHealthCanvas.width = 512;
  rigHealthCanvas.height = 128;
  rigHealthCtx = rigHealthCanvas.getContext('2d');
  rigHealthTexture = new THREE.CanvasTexture(rigHealthCanvas);
  rigHealthTexture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({
    map: rigHealthTexture,
    transparent: true,
    depthTest: false,
  });

  rigHealthSprite = new THREE.Sprite(spriteMat);
  rigHealthSprite.scale.set(11.0, 2.75, 1.0);
  scene?.add(rigHealthSprite);
}

function updateRigHealthBar(hp: number, maxHp: number, isAlive: boolean) {
  if (!rigHealthCtx || !rigHealthCanvas || !rigHealthTexture) return;
  if (hp === lastRenderedRigHp && maxHp === lastRenderedRigMaxHp) return;
  lastRenderedRigHp = hp;
  lastRenderedRigMaxHp = maxHp;

  const ctx = rigHealthCtx;
  const w = rigHealthCanvas.width;
  const h = rigHealthCanvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!isAlive || hp <= 0) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(16, 20, w - 32, h - 40, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    ctx.font = '900 32px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('WAR RIG DESTROYED', w / 2, 74);
    rigHealthTexture.needsUpdate = true;
    return;
  }

  const ratio = Math.max(0, Math.min(1, hp / maxHp));

  // Outer dark high-contrast panel
  ctx.fillStyle = 'rgba(11, 15, 25, 0.94)';
  ctx.beginPath();
  ctx.roundRect(16, 14, w - 32, h - 28, 16);
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f59e0b'; // Wasteland Amber
  ctx.stroke();

  // Header row: Title + HP text
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('WAR RIG HEAVY ARMOR', 36, 46);

  ctx.textAlign = 'right';
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.round(hp)} / ${maxHp} HP`, w - 36, 46);

  // Health bar track
  const barX = 36;
  const barY = 62;
  const barW = w - 72;
  const barH = 30;

  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.fill();

  // Health fill gradient
  if (ratio > 0) {
    const fillW = Math.max(8, barW * ratio);
    const grad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    if (ratio > 0.5) {
      grad.addColorStop(0, '#059669');
      grad.addColorStop(1, '#10b981');
    } else if (ratio > 0.25) {
      grad.addColorStop(0, '#d97706');
      grad.addColorStop(1, '#fbbf24');
    } else {
      grad.addColorStop(0, '#dc2626');
      grad.addColorStop(1, '#f87171');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 8);
    ctx.fill();
  }

  // Armor plate segment dividers (10 segments)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  const segments = 10;
  for (let s = 1; s < segments; s++) {
    ctx.fillRect(barX + (barW / segments) * s - 1, barY, 2, barH);
  }

  rigHealthTexture.needsUpdate = true;
}

// Input state
const keysDown = {
  w: false,
  s: false,
  a: false,
  d: false,
  space: false,
  shift: false,
};

let inputSendInterval: any = null;

function initThreeScene() {
  if (!canvasContainer.value) return;

  const width = canvasContainer.value.clientWidth || window.innerWidth;
  const height = canvasContainer.value.clientHeight || window.innerHeight;

  const isGrass = environmentTheme.value === 'grassland';

  // 1. Scene atmosphere: crisp mountain sky & haze in grassland, amber sunset in desert
  scene = new THREE.Scene();
  scene.background = new THREE.Color(isGrass ? 0x60a5fa : 0xf6af62);
  scene.fog = new THREE.Fog(isGrass ? 0x93c5fd : 0xf6af62, 180, 520);

  // 2. Camera (Isometric fixed-angle view)
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.set(0, 56, -56);
  camera.lookAt(0, 0, 0);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasContainer.value.appendChild(renderer.domElement);

  // 4. Lights: raking sun angle and hemisphere fill create distinct relief shadows across all slopes
  ambientLightRef = new THREE.AmbientLight(isGrass ? 0xdbeafe : 0xffedd5, isGrass ? 0.5 : 0.42);
  scene.add(ambientLightRef);

  hemiLightRef = new THREE.HemisphereLight(
    isGrass ? 0x93c5fd : 0xbfdbfe,
    isGrass ? 0x166534 : 0xb45309,
    0.38
  );
  scene.add(hemiLightRef);

  sunLightRef = new THREE.DirectionalLight(isGrass ? 0xfffbeb : 0xfffaed, 1.85);
  sunLightRef.position.set(110, 85, -95);
  sunLightRef.castShadow = true;
  sunLightRef.shadow.mapSize.width = 2048;
  sunLightRef.shadow.mapSize.height = 2048;
  sunLightRef.shadow.camera.near = 10;
  sunLightRef.shadow.camera.far = 320;
  const d = 85;
  sunLightRef.shadow.camera.left = -d;
  sunLightRef.shadow.camera.right = d;
  sunLightRef.shadow.camera.top = d;
  sunLightRef.shadow.camera.bottom = -d;
  scene.add(sunLightRef);

  // 5. Undulating Terrain Mesh
  buildTerrainMesh(scene);

  // 6. Terrain Props (Alpine conifers or desert palms, huts, rocks, ramps, river)
  buildTerrainProps(scene, environmentTheme.value);

  // 6b. Object Pooled Tire Spray Particles (2.1)
  initTireParticlePool(scene);

  // 7. Destination Outpost Archway & Sky Beacon at z = 220
  buildOutpostGate(scene);

  // 7. War Rig Overhead 3D Floating Health Bar
  initRigHealthBar();

  // 8. Event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onWindowBlur);

  // 8. Start client input dispatch loop (20Hz)
  inputSendInterval = setInterval(dispatchVehicleControls, 50);

  // 9. Start render loop
  renderLoop();
}

function buildTerrainMesh(targetScene: THREE.Scene) {
  const width = 320;
  const depth = 550;
  const segX = 140;
  const segZ = 220;

  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors: number[] = [];

  const isGrass = environmentTheme.value === 'grassland';
  const colorDepths = isGrass ? new THREE.Color(0x14532d) : new THREE.Color(0xa7511c);
  const colorPlains = isGrass ? new THREE.Color(0x16a34a) : new THREE.Color(0xd97706);
  const colorCrests = isGrass ? new THREE.Color(0x84cc16) : new THREE.Color(0xfef08a);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    // Smooth continuous gradient across height range (-8m to +8m)
    const t = Math.max(0, Math.min(1, (y + 7.5) / 15.0));
    const vertexColor = new THREE.Color();
    if (t < 0.5) {
      vertexColor.copy(colorDepths).lerp(colorPlains, t * 2.0);
    } else {
      vertexColor.copy(colorPlains).lerp(colorCrests, (t - 0.5) * 2.0);
    }
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: false,
  });

  // Screen-space antialiased topographic contour lines (rock-solid, zero shimmer)
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vTerrainWorldPos;
        `
      )
      .replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vTerrainWorldPos;
        `
      )
      .replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>

        // Clean elevation contour lines every 2.5m elevation
        float cStep = 2.5;
        float cVal = vTerrainWorldPos.y / cStep;
        float cFract = abs(fract(cVal - 0.5) - 0.5);
        float cWidth = fwidth(cVal) * 1.5;
        float contour = 1.0 - smoothstep(0.0, max(0.045, cWidth), cFract);

        vec3 darkContour = gl_FragColor.rgb * 0.65;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, darkContour, contour * 0.42);
        `
      );
  };

  const terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;
  targetScene.add(terrainMesh);
  terrainMeshRef = terrainMesh;
}

function createHutMesh(obs: TerrainObstacle, theme: 'grassland' | 'desert' = environmentTheme.value): THREE.Group {
  const hutGroup = new THREE.Group();
  const y = getTerrainHeight(obs.x, obs.z);
  hutGroup.position.set(obs.x, y, obs.z);
  hutGroup.rotation.y = obs.rotation || 0;

  const variant = obs.variant || 0;
  const isGrass = theme === 'grassland';

  // Materials tailored to grassland alpine / wasteland desert aesthetic
  const wallColors = isGrass
    ? [0x5c3818, 0x475569, 0x78350f] // Log Timber / Alpine Slate / Weathered Wood
    : [0x9a5c37, 0x4b5563, 0x854d0e]; // Adobe / Scrap Metal / Weathered Timber
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColors[variant % wallColors.length],
    roughness: 0.85,
    metalness: variant === 1 ? 0.35 : 0.1,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: isGrass ? 0x334155 : 0x332211,
    roughness: 0.95,
  });

  const roofColors = isGrass
    ? [0x1e293b, 0x166534, 0x334155]
    : [0x7c2d12, 0x374151, 0x573410];
  const roofMat = new THREE.MeshStandardMaterial({
    color: roofColors[variant % roofColors.length],
    roughness: 0.6,
    metalness: 0.3,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3818,
    roughness: 0.85,
  });

  const darkTrimMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const barrelMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? 0x1e3a8a : 0x991b1b,
    roughness: 0.5,
    metalness: 0.6,
  });

  // 1. Foundation timber base
  const baseGeo = new THREE.BoxGeometry(4.4, 0.45, 4.0);
  const base = new THREE.Mesh(baseGeo, foundationMat);
  base.position.set(0, 0.22, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  hutGroup.add(base);

  // 2. Main Cabin Walls
  const cabinHeight = variant === 2 ? 3.0 : 2.5;
  const cabinGeo = new THREE.BoxGeometry(4.0, cabinHeight, 3.6);
  const cabin = new THREE.Mesh(cabinGeo, wallMat);
  cabin.position.set(0, 0.45 + cabinHeight * 0.5, 0);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  hutGroup.add(cabin);

  // 3. Pitched Tin / Corrugated Iron Roof
  const roofGeo = new THREE.BoxGeometry(4.6, 0.2, 4.2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 0.45 + cabinHeight + 0.15, 0);
  roof.rotation.x = -0.16; // Slanted pitch shedding desert sand
  roof.castShadow = true;
  hutGroup.add(roof);

  // 4. Front Porch Deck & Stilts
  const deckGeo = new THREE.BoxGeometry(4.0, 0.25, 1.8);
  const deck = new THREE.Mesh(deckGeo, woodMat);
  deck.position.set(0, 0.25, 2.3);
  deck.castShadow = true;
  deck.receiveShadow = true;
  hutGroup.add(deck);

  // Stilt pillars supporting awning
  const stiltGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6);
  for (const sx of [-1.7, 1.7]) {
    const stilt = new THREE.Mesh(stiltGeo, woodMat);
    stilt.position.set(sx, 1.25, 3.0);
    stilt.castShadow = true;
    hutGroup.add(stilt);
  }

  // Porch Awning
  const awningGeo = new THREE.BoxGeometry(4.2, 0.12, 1.8);
  const awning = new THREE.Mesh(awningGeo, roofMat);
  awning.position.set(0, 2.55, 2.3);
  awning.rotation.x = 0.18;
  awning.castShadow = true;
  hutGroup.add(awning);

  // 5. Doorway & Barred Window
  const doorGeo = new THREE.BoxGeometry(1.0, 1.8, 0.1);
  const door = new THREE.Mesh(doorGeo, darkTrimMat);
  door.position.set(-0.6, 1.35, 1.82);
  hutGroup.add(door);

  const windowGeo = new THREE.BoxGeometry(0.7, 0.6, 0.1);
  const win = new THREE.Mesh(windowGeo, lanternMat);
  win.position.set(1.0, 1.7, 1.82);
  hutGroup.add(win);

  // 6. Porch Lantern
  const lanternGeo = new THREE.BoxGeometry(0.25, 0.35, 0.25);
  const lantern = new THREE.Mesh(lanternGeo, lanternMat);
  lantern.position.set(1.6, 2.3, 2.9);
  hutGroup.add(lantern);

  // 7. Settlement Supplies (Wooden crate & metal fuel drum)
  const crateGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  const crate = new THREE.Mesh(crateGeo, crateMat);
  crate.position.set(2.4, 0.45, 0.6);
  crate.rotation.y = 0.25;
  crate.castShadow = true;
  hutGroup.add(crate);

  const barrelGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.05, 8);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(-2.3, 0.55, 0.5);
  barrel.castShadow = true;
  hutGroup.add(barrel);

  // 8. Rooftop Antenna Mast with beacon
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.06, 2.8, 6);
  const mast = new THREE.Mesh(mastGeo, darkTrimMat);
  mast.position.set(-1.2, 0.45 + cabinHeight + 1.4, -0.6);
  mast.castShadow = true;
  hutGroup.add(mast);

  const beaconGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(-1.2, 0.45 + cabinHeight + 2.8, -0.6);
  hutGroup.add(beacon);

  // Variant 1 extra: Side shed lean-to
  if (variant === 1) {
    const shedGeo = new THREE.BoxGeometry(1.6, 1.8, 2.6);
    const shed = new THREE.Mesh(shedGeo, wallMat);
    shed.position.set(2.4, 0.9, -0.2);
    shed.castShadow = true;
    hutGroup.add(shed);

    const shedRoofGeo = new THREE.BoxGeometry(1.8, 0.1, 2.8);
    const shedRoof = new THREE.Mesh(shedRoofGeo, roofMat);
    shedRoof.position.set(2.4, 1.85, -0.2);
    shedRoof.rotation.z = -0.2;
    shedRoof.castShadow = true;
    hutGroup.add(shedRoof);
  }

  // Variant 2 extra: Rooftop solar scrap panel
  if (variant === 2) {
    const panelGeo = new THREE.BoxGeometry(1.8, 0.08, 1.2);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.3 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0.8, 0.45 + cabinHeight + 0.45, -0.5);
    panel.rotation.x = -0.3;
    panel.rotation.y = 0.2;
    panel.castShadow = true;
    hutGroup.add(panel);
  }

  return hutGroup;
}

const boostMatMeshes: THREE.Group[] = [];

function createTallBuildingMesh(building: TerrainObstacle): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(building.x, building.z);
  group.position.set(building.x, y, building.z);
  group.rotation.y = building.rotation || 0;

  const variant = building.variant || 0;
  const bHeight = building.height || 18;

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.2,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: variant === 0 ? 0x475569 : variant === 1 ? 0x52525b : 0x3f3f46,
    roughness: 0.75,
    metalness: 0.45,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.85,
  });
  const windowColor = variant === 0 ? 0x38bdf8 : variant === 1 ? 0xf59e0b : 0x10b981;
  const windowMat = new THREE.MeshBasicMaterial({ color: windowColor });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // 1. Reinforced Concrete Foundation Plinth
  const baseWidth = building.radius * 1.8;
  const baseGeo = new THREE.BoxGeometry(baseWidth, 1.8, baseWidth);
  const base = new THREE.Mesh(baseGeo, concreteMat);
  base.position.set(0, 0.9, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Heavy Ground Tier (Armored blast bunker level)
  const tier1W = building.radius * 1.6;
  const tier1H = 6.0;
  const tier1Geo = new THREE.BoxGeometry(tier1W, tier1H, tier1W);
  const tier1 = new THREE.Mesh(tier1Geo, wallMat);
  tier1.position.set(0, 1.8 + tier1H * 0.5, 0);
  tier1.castShadow = true;
  tier1.receiveShadow = true;
  group.add(tier1);

  // Blast doors at front
  const doorGeo = new THREE.BoxGeometry(2.4, 3.2, 0.3);
  const door = new THREE.Mesh(doorGeo, steelMat);
  door.position.set(0, 3.4, tier1W * 0.5 + 0.1);
  group.add(door);

  // External conduit pipes
  const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, tier1H + 3.0, 8);
  for (const px of [-tier1W * 0.45, tier1W * 0.45]) {
    const pipe = new THREE.Mesh(pipeGeo, steelMat);
    pipe.position.set(px, (tier1H + 3.0) * 0.5, tier1W * 0.48);
    pipe.castShadow = true;
    group.add(pipe);
  }

  // 3. Mid Tower Tier with glowing window slits
  const tier2W = building.radius * 1.25;
  const tier2H = Math.max(6.0, bHeight * 0.4);
  const tier2Geo = new THREE.BoxGeometry(tier2W, tier2H, tier2W);
  const tier2 = new THREE.Mesh(tier2Geo, wallMat);
  tier2.position.set(0, 1.8 + tier1H + tier2H * 0.5, 0);
  tier2.castShadow = true;
  tier2.receiveShadow = true;
  group.add(tier2);

  // Glowing slit windows on mid tower
  const winSlitGeo = new THREE.BoxGeometry(tier2W * 0.7, 0.4, 0.15);
  for (let wy = -tier2H * 0.3; wy <= tier2H * 0.3; wy += 1.8) {
    const winF = new THREE.Mesh(winSlitGeo, windowMat);
    winF.position.set(0, 1.8 + tier1H + tier2H * 0.5 + wy, tier2W * 0.5 + 0.05);
    group.add(winF);
    const winB = new THREE.Mesh(winSlitGeo, windowMat);
    winB.position.set(0, 1.8 + tier1H + tier2H * 0.5 + wy, -tier2W * 0.5 - 0.05);
    group.add(winB);
  }

  // Mid Balcony / Walkway
  const balconyGeo = new THREE.BoxGeometry(tier2W * 1.3, 0.3, tier2W * 1.3);
  const balcony = new THREE.Mesh(balconyGeo, steelMat);
  balcony.position.set(0, 1.8 + tier1H + 0.15, 0);
  balcony.castShadow = true;
  group.add(balcony);

  // 4. Upper Penthouse / Crown
  const tier3W = building.radius * 0.85;
  const tier3H = 3.5;
  const tier3Geo = new THREE.BoxGeometry(tier3W, tier3H, tier3W);
  const tier3 = new THREE.Mesh(tier3Geo, concreteMat);
  const t3Y = 1.8 + tier1H + tier2H + tier3H * 0.5;
  tier3.position.set(0, t3Y, 0);
  tier3.castShadow = true;
  group.add(tier3);

  // 5. Crown Architecture by Variant
  if (variant === 0) {
    // Comms Mast with Dual Dishes and Beacon
    const spireGeo = new THREE.CylinderGeometry(0.08, 0.18, 8.0, 6);
    const spire = new THREE.Mesh(spireGeo, steelMat);
    spire.position.set(0, t3Y + tier3H * 0.5 + 4.0, 0);
    spire.castShadow = true;
    group.add(spire);

    const dishGeo = new THREE.CylinderGeometry(1.4, 0.3, 0.3, 12);
    dishGeo.rotateX(Math.PI / 3);
    const dish1 = new THREE.Mesh(dishGeo, steelMat);
    dish1.position.set(1.1, t3Y + tier3H * 0.5 + 3.0, 0);
    group.add(dish1);

    const beaconGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, t3Y + tier3H * 0.5 + 8.1, 0);
    group.add(beacon);
  } else if (variant === 1) {
    // Industrial Refinery Silo & Twin Smokestacks
    const siloGeo = new THREE.CylinderGeometry(1.8, 1.8, 14.0, 14);
    const silo = new THREE.Mesh(siloGeo, wallMat);
    silo.position.set(building.radius * 0.6, 7.0, -building.radius * 0.3);
    silo.castShadow = true;
    group.add(silo);

    const stackGeo = new THREE.CylinderGeometry(0.35, 0.45, 9.0, 8);
    for (const sx of [-0.9, 0.9]) {
      const stack = new THREE.Mesh(stackGeo, steelMat);
      stack.position.set(sx, t3Y + tier3H * 0.5 + 4.5, 0);
      stack.castShadow = true;
      group.add(stack);

      const flareGeo = new THREE.SphereGeometry(0.35, 6, 6);
      const flare = new THREE.Mesh(flareGeo, new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      flare.position.set(sx, t3Y + tier3H * 0.5 + 9.1, 0);
      group.add(flare);
    }
  } else {
    // Fortress Bastion with Radar Dome & Crane Girders
    const domeGeo = new THREE.SphereGeometry(1.6, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeo, steelMat);
    dome.position.set(0, t3Y + tier3H * 0.5, 0);
    group.add(dome);

    const beamGeo = new THREE.BoxGeometry(4.8, 0.25, 0.5);
    const beam = new THREE.Mesh(beamGeo, steelMat);
    beam.position.set(0, t3Y + tier3H * 0.5 + 2.0, 0);
    group.add(beam);
  }

  return group;
}

function createSpikePitMesh(pit: SpikePit): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(pit.x, pit.z);
  group.position.set(pit.x, y, pit.z);

  const size = pit.radius * 2.0;

  // Materials
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.85,
    metalness: 0.8,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.95,
  });
  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0x571c1c, // dark bloody rusted steel
    roughness: 0.4,
    metalness: 0.7,
  });
  const hazardMat = new THREE.MeshBasicMaterial({ color: 0xeab308 }); // caution yellow

  // Border frame (4 surrounding curbs with hazard warning)
  const curbGeoH = new THREE.BoxGeometry(size, 0.35, 0.6);
  const curbGeoV = new THREE.BoxGeometry(0.6, 0.35, size);

  const curbN = new THREE.Mesh(curbGeoH, frameMat);
  curbN.position.set(0, 0.15, size * 0.5);
  group.add(curbN);
  const curbS = new THREE.Mesh(curbGeoH, frameMat);
  curbS.position.set(0, 0.15, -size * 0.5);
  group.add(curbS);
  const curbW = new THREE.Mesh(curbGeoV, frameMat);
  curbW.position.set(-size * 0.5, 0.15, 0);
  group.add(curbW);
  const curbE = new THREE.Mesh(curbGeoV, frameMat);
  curbE.position.set(size * 0.5, 0.15, 0);
  group.add(curbE);

  // Hazard corner stripes
  const cornerGeo = new THREE.BoxGeometry(0.6, 0.36, 0.6);
  for (const cx of [-size * 0.5, size * 0.5]) {
    for (const cz of [-size * 0.5, size * 0.5]) {
      const cPip = new THREE.Mesh(cornerGeo, hazardMat);
      cPip.position.set(cx, 0.16, cz);
      group.add(cPip);
    }
  }

  // Sunken pit floor
  const floorGeo = new THREE.BoxGeometry(size - 0.8, 0.1, size - 0.8);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -0.15, 0);
  group.add(floor);

  // Grid of sharp pointed steel spikes
  const spikeGeo = new THREE.ConeGeometry(0.28, 1.35, 5);
  const count = 4;
  const step = (size - 1.8) / (count - 1);
  const start = -(size - 1.8) * 0.5;

  for (let ix = 0; ix < count; ix++) {
    for (let iz = 0; iz < count; iz++) {
      const sp = new THREE.Mesh(spikeGeo, spikeMat);
      const jx = Math.sin(ix * 3 + iz) * 0.15;
      const jz = Math.cos(iz * 3 + ix) * 0.15;
      sp.position.set(start + ix * step + jx, 0.55, start + iz * step + jz);
      sp.rotation.y = (ix + iz) * 0.8;
      sp.castShadow = true;
      group.add(sp);
    }
  }

  // Subtle crimson hazard glow
  const glowGeo = new THREE.PlaneGeometry(size - 0.8, size - 0.8);
  glowGeo.rotateX(-Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, -0.05, 0);
  group.add(glow);

  return group;
}

function createBoostMatMesh(mat: BoostMat): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(mat.x, mat.z);
  group.position.set(mat.x, y + 0.08, mat.z);
  group.rotation.y = mat.yaw;

  // 1. Sleek metallic base platform
  const matW = mat.radius ? Math.max(4.4, mat.radius * 1.6) : 4.4;
  const baseGeo = new THREE.BoxGeometry(matW, 0.22, 6.8);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.85,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.11, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Cyan LED border rails
  const railGeo = new THREE.BoxGeometry(0.3, 0.28, 6.8);
  const railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-matW * 0.5 + 0.1, 0.14, 0);
  group.add(railL);
  const railR = new THREE.Mesh(railGeo, railMat);
  railR.position.set(matW * 0.5 - 0.1, 0.14, 0);
  group.add(railR);

  // 3. Glowing animated directional chevron arrows (pointing forward along +Z)
  const chevronBarGeo = new THREE.BoxGeometry(1.4, 0.08, 0.35);
  const chevronZPositions = [-2.0, 0.0, 2.0];

  chevronZPositions.forEach((cz, cIdx) => {
    const chevronGroup = new THREE.Group();
    chevronGroup.name = `boostChevron_${cIdx}`;
    chevronGroup.position.set(0, 0.24, cz);

    const cMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const leftArm = new THREE.Mesh(chevronBarGeo, cMat);
    leftArm.position.set(-0.55, 0, 0);
    leftArm.rotation.y = 0.55;
    chevronGroup.add(leftArm);

    const rightArm = new THREE.Mesh(chevronBarGeo, cMat);
    rightArm.position.set(0.55, 0, 0);
    rightArm.rotation.y = -0.55;
    chevronGroup.add(rightArm);

    group.add(chevronGroup);
  });

  // Corner power nodule beacons
  const noduleGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8);
  const noduleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (const nx of [-2.0, 2.0]) {
    for (const nz of [-3.2, 3.2]) {
      const nodule = new THREE.Mesh(noduleGeo, noduleMat);
      nodule.position.set(nx, 0.22, nz);
      group.add(nodule);
    }
  }

  return group;
}

function createPineTreeMesh(t: TerrainObstacle, tIdx: number): THREE.Group {
  const treeGroup = new THREE.Group();
  const py = getTerrainHeight(t.x, t.z);
  treeGroup.position.set(t.x, py, t.z);

  // Slight natural mountain lean
  const tiltX = Math.sin(tIdx * 2.1) * 0.06;
  const tiltZ = Math.cos(tIdx * 3.3) * 0.06;
  treeGroup.rotation.set(tiltX, (tIdx * 1.7) % (Math.PI * 2), tiltZ);

  // Textured Cedar / Spruce Pine Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 6.0, 7);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.9,
    metalness: 0.05,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(0, 3.0, 0);
  trunk.castShadow = true;
  treeGroup.add(trunk);

  // Pine Foliage Materials (3 subtle tones of evergreen forest)
  const pineColors = [0x14532d, 0x166534, 0x15803d];
  const pineMatBase = new THREE.MeshStandardMaterial({
    color: pineColors[tIdx % pineColors.length],
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });
  const pineMatMid = new THREE.MeshStandardMaterial({
    color: pineColors[(tIdx + 1) % pineColors.length],
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });
  const pineMatTop = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true,
  });

  // Tier 1: Broad Lower Skirt
  const coneGeo1 = new THREE.ConeGeometry(3.4, 3.6, 7);
  const cone1 = new THREE.Mesh(coneGeo1, pineMatBase);
  cone1.position.set(0, 4.6, 0);
  cone1.castShadow = true;
  treeGroup.add(cone1);

  // Tier 2: Mid Foliage Tier
  const coneGeo2 = new THREE.ConeGeometry(2.6, 3.2, 7);
  const cone2 = new THREE.Mesh(coneGeo2, pineMatMid);
  cone2.position.set(0, 6.8, 0);
  cone2.castShadow = true;
  treeGroup.add(cone2);

  // Tier 3: Upper Crown Tier
  const coneGeo3 = new THREE.ConeGeometry(1.7, 2.8, 7);
  const cone3 = new THREE.Mesh(coneGeo3, pineMatTop);
  cone3.position.set(0, 8.8, 0);
  cone3.castShadow = true;
  treeGroup.add(cone3);

  return treeGroup;
}

function buildTerrainProps(targetScene: THREE.Scene, theme: 'grassland' | 'desert' = environmentTheme.value) {
  const propsGroup = new THREE.Group();
  terrainPropsGroupRef = propsGroup;

  const isGrass = theme === 'grassland';

  // 1. Settlements / Cabins
  const huts = TERRAIN_OBSTACLES.filter((o) => o.type === 'hut');
  for (const hut of huts) {
    const hutMesh = createHutMesh(hut, theme);
    propsGroup.add(hutMesh);
  }

  // 2. Weathered Sandstone / Alpine Slate Boulders
  const rockMat = new THREE.MeshStandardMaterial({
    color: isGrass ? 0x475569 : 0x854d0e,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const rockDarkMat = new THREE.MeshStandardMaterial({
    color: isGrass ? 0x334155 : 0x573410,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.85,
    metalness: 0.02,
    flatShading: true,
  });

  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const mossGeo = new THREE.DodecahedronGeometry(0.85, 1);
  const rocks = TERRAIN_OBSTACLES.filter((o) => o.type === 'rock');
  rocks.forEach((r, idx) => {
    const y = getTerrainHeight(r.x, r.z);
    const rock = new THREE.Mesh(rockGeo, idx % 2 === 0 ? rockMat : rockDarkMat);
    const scaleX = r.scaleX || 2.0;
    const scaleY = r.scaleY || 1.8;
    const scaleZ = r.scaleZ || 2.0;
    rock.scale.set(scaleX, scaleY, scaleZ);
    rock.position.set(r.x, y + scaleY * 0.4, r.z);
    rock.rotation.set((r.rotation || 0) * 0.5, r.rotation || 0, (r.rotation || 0) * 0.3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    propsGroup.add(rock);

    // In grassland, add lush moss cap to some boulders
    if (isGrass && idx % 2 === 0) {
      const moss = new THREE.Mesh(mossGeo, mossMat);
      moss.scale.set(scaleX * 0.85, scaleY * 0.35, scaleZ * 0.85);
      moss.position.set(r.x, y + scaleY * 0.78, r.z);
      moss.rotation.set(0, (r.rotation || 0) + 0.4, 0);
      moss.castShadow = true;
      propsGroup.add(moss);
    }
  });

  // 3. Trees: Alpine Pine Conifers in Grassland, Palms in Desert
  const trees = TERRAIN_OBSTACLES.filter((o) => o.type === 'tree');
  if (isGrass) {
    trees.forEach((t, tIdx) => {
      const pineMesh = createPineTreeMesh(t, tIdx);
      propsGroup.add(pineMesh);
    });
  } else {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3818,
      roughness: 0.85,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x3f6212,
      roughness: 0.7,
      metalness: 0.1,
    });

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 6.5, 7);
    const frondClusterGeo = new THREE.ConeGeometry(3.6, 2.2, 7);
    frondClusterGeo.rotateX(Math.PI);

    trees.forEach((t, tIdx) => {
      const py = getTerrainHeight(t.x, t.z);
      const treeGroup = new THREE.Group();
      treeGroup.position.set(t.x, py, t.z);

      const tiltX = Math.sin(tIdx * 2.1) * 0.15;
      const tiltZ = Math.cos(tIdx * 3.3) * 0.15;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(0, 3.2, 0);
      trunk.rotation.z = tiltZ;
      trunk.rotation.x = tiltX;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const canopy = new THREE.Mesh(frondClusterGeo, frondMat);
      canopy.position.set(tiltZ * 6, 6.8, tiltX * 6);
      canopy.castShadow = true;
      treeGroup.add(canopy);

      const canopyTop = new THREE.Mesh(frondClusterGeo, frondMat);
      canopyTop.scale.set(0.7, 0.7, 0.7);
      canopyTop.position.set(tiltZ * 6, 7.5, tiltX * 6);
      canopyTop.castShadow = true;
      treeGroup.add(canopyTop);

      propsGroup.add(treeGroup);
    });
  }

  // 4. Wasteland High-Rise & Industrial Mega-Structures (Taller Buildings)
  const tallBuildings = TERRAIN_OBSTACLES.filter((o) => o.type === 'tall_building');
  for (const bldg of tallBuildings) {
    const bldgMesh = createTallBuildingMesh(bldg);
    propsGroup.add(bldgMesh);
  }

  // 5. Spike Pits (Hazard zones in the terrain)
  for (const pit of SPIKE_PITS) {
    const pitMesh = createSpikePitMesh(pit);
    propsGroup.add(pitMesh);
  }

  // 7. Stunt Jump Ramps
  const ramps = TERRAIN_OBSTACLES.filter((o) => o.type === 'jump_ramp');
  for (const ramp of ramps) {
    const rampMesh = createJumpRampMesh(ramp);
    propsGroup.add(rampMesh);
  }

  // 8. River Water Ribbon (Curved translucent surface along river channel at z ≈ -44)
  const riverWaterGeo = new THREE.PlaneGeometry(280, 24, 70, 8);
  riverWaterGeo.rotateX(-Math.PI / 2);
  const posAttr = riverWaterGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const pz = posAttr.getZ(i);
    const riverCenterZ = -44 + Math.sin(px * 0.045) * 8.0;
    const worldZ = riverCenterZ + pz;
    const worldY = getTerrainHeight(px, worldZ) + 0.25;
    posAttr.setXYZ(i, px, worldY, worldZ);
  }
  riverWaterGeo.computeVertexNormals();

  const riverWaterMat = new THREE.MeshStandardMaterial({
    color: isGrass ? 0x0284c7 : 0x0ea5e9,
    roughness: 0.15,
    metalness: 0.35,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const riverMesh = new THREE.Mesh(riverWaterGeo, riverWaterMat);
  propsGroup.add(riverMesh);

  // 9. Ravine Bridge Causeway Structure across the deep canyon chasm at z ≈ 46
  buildRavineBridge(propsGroup);

  targetScene.add(propsGroup);
}

function createJumpRampMesh(ramp: TerrainObstacle): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(ramp.x, ramp.z);
  group.position.set(ramp.x, y, ramp.z);
  group.rotation.y = ramp.rotation || 0;

  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.8,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.3,
    metalness: 0.4,
  });

  const rampL = 9.0;
  const rampW = 12.0;
  const rampH = ramp.height || 2.8;

  // Inclined main deck
  const deckGeo = new THREE.BoxGeometry(rampW, 0.3, rampL);
  const deck = new THREE.Mesh(deckGeo, rampMat);
  const pitchAngle = Math.atan2(rampH, rampL);
  deck.rotation.x = -pitchAngle;
  deck.position.set(0, rampH * 0.5, rampL * 0.45);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  // Smooth entrance toe plate into the ground
  const toeGeo = new THREE.BoxGeometry(rampW, 0.1, 1.4);
  const toe = new THREE.Mesh(toeGeo, rampMat);
  toe.rotation.x = -pitchAngle * 0.5;
  toe.position.set(0, 0.04, -0.4);
  toe.receiveShadow = true;
  group.add(toe);

  // Side truss guard rails
  const railGeo = new THREE.BoxGeometry(0.3, 0.8, rampL);
  const leftRail = new THREE.Mesh(railGeo, stripeMat);
  leftRail.rotation.x = -pitchAngle;
  leftRail.position.set(-rampW * 0.5 + 0.15, rampH * 0.5 + 0.35, rampL * 0.45);
  group.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, stripeMat);
  rightRail.rotation.x = -pitchAngle;
  rightRail.position.set(rampW * 0.5 - 0.15, rampH * 0.5 + 0.35, rampL * 0.45);
  group.add(rightRail);

  // Chevron launch arrows across the wide ramp deck
  const arrowOffsets = [-3.8, 0, 3.8];
  for (const xOff of arrowOffsets) {
    const arrowGeo = new THREE.ConeGeometry(0.8, 1.6, 3);
    arrowGeo.rotateX(-Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -pitchAngle;
    arrow.position.set(xOff, rampH * 0.5 + 0.18, rampL * 0.45);
    group.add(arrow);
  }

  return group;
}

function buildRavineBridge(targetGroup: THREE.Group) {
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.6,
    metalness: 0.8,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.5,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.4,
  });

  // Guardrails along west and east edges of the bridge highway across the gorge
  const railLength = 34.0;
  const railGeo = new THREE.BoxGeometry(0.5, 1.2, railLength);
  for (const side of [-13.0, 13.0]) {
    const railY = getTerrainHeight(side, 46) + 0.6;
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(side, railY, 46);
    rail.castShadow = true;
    targetGroup.add(rail);

    // Support pillars reaching down into the canyon floor
    for (const pz of [34, 46, 58]) {
      const topY = getTerrainHeight(side, pz);
      const canyonFloorY = topY - 13.5;
      const colH = topY - canyonFloorY;
      const colGeo = new THREE.BoxGeometry(1.8, colH, 1.8);
      const col = new THREE.Mesh(colGeo, pillarMat);
      col.position.set(side + (side > 0 ? -0.4 : 0.4), canyonFloorY + colH * 0.5, pz);
      col.castShadow = true;
      targetGroup.add(col);
    }

    // Amber warning hazard beacons at bridge heads
    for (const pz of [29, 63]) {
      const beaconGeo = new THREE.CylinderGeometry(0.3, 0.45, 1.8, 6);
      const beacon = new THREE.Mesh(beaconGeo, bridgeMat);
      const by = getTerrainHeight(side, pz) + 0.9;
      beacon.position.set(side, by, pz);
      targetGroup.add(beacon);

      const lampGeo = new THREE.SphereGeometry(0.32, 6, 6);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(side, by + 1.0, pz);
      targetGroup.add(lamp);
    }
  }
}

function buildOutpostGate(targetScene: THREE.Scene) {
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, getTerrainHeight(0, 220), 220);

  // Two massive reinforced steel gate towers
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.7, metalness: 0.8 });
  const towerGeo = new THREE.BoxGeometry(6, 24, 6);

  const leftTower = new THREE.Mesh(towerGeo, towerMat);
  leftTower.position.set(-25, 12, 0);
  leftTower.castShadow = true;
  gateGroup.add(leftTower);

  const rightTower = new THREE.Mesh(towerGeo, towerMat);
  rightTower.position.set(25, 12, 0);
  rightTower.castShadow = true;
  gateGroup.add(rightTower);

  // Overhead beam
  const beamGeo = new THREE.BoxGeometry(56, 4, 4);
  const beam = new THREE.Mesh(beamGeo, towerMat);
  beam.position.set(0, 22, 0);
  beam.castShadow = true;
  gateGroup.add(beam);

  // Caution banner strip
  const bannerMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
  const bannerGeo = new THREE.BoxGeometry(50, 2, 0.5);
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 19, 0);
  gateGroup.add(banner);

  // Towering luminous cyan energy sky beacon shooting 90m into the sky
  const beaconGeo = new THREE.CylinderGeometry(4.0, 4.0, 90, 16, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 45, 0);
  gateGroup.add(beacon);

  // Intense white-hot core energy beam
  const coreBeamGeo = new THREE.CylinderGeometry(0.8, 0.8, 95, 8);
  const coreBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const coreBeam = new THREE.Mesh(coreBeamGeo, coreBeamMat);
  coreBeam.position.set(0, 47, 0);
  gateGroup.add(coreBeam);

  // Ground Arrival Waypoint Ring
  const ringGeo = new THREE.RingGeometry(8, 12, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(0, 0.25, 0);
  gateGroup.add(ring);

  targetScene.add(gateGroup);
}

// -------------------------------------------------------------
// VEHICLE PROCEDURAL 3D MESH BUILDERS
// -------------------------------------------------------------
function createRigMesh(): THREE.Group {
  const group = new THREE.Group();

  // Materials
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.35, metalness: 0.65 }); // Convoy Navy
  const tankerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.75 }); // Steel Armor
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.6 }); // Ochre Hazard Trim
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.85 }); // Dark Cast Iron
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 }); // Gleaming Chrome
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 }); // Heavy Tread Rubber
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 }); // Steel Wheel Rim
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 }); // Dark Armored Slit Glass
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Bright Headlights

  // 1. Truck Cabin Base & Hood
  const cabinGeo = new THREE.BoxGeometry(3.2, 3.2, 3.8);
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 2.4, 1.6);
  cabin.castShadow = true;
  group.add(cabin);

  // Armored Sloped Hood Nose
  const hoodGeo = new THREE.BoxGeometry(3.0, 1.8, 2.2);
  const hood = new THREE.Mesh(hoodGeo, cabinMat);
  hood.position.set(0, 1.6, 3.8);
  hood.castShadow = true;
  group.add(hood);

  // Armored Windshield & Sun Visor
  const visorGeo = new THREE.BoxGeometry(3.1, 0.4, 0.8);
  const visor = new THREE.Mesh(visorGeo, metalMat);
  visor.position.set(0, 3.8, 2.6);
  group.add(visor);

  const windshieldGeo = new THREE.BoxGeometry(2.8, 0.9, 0.2);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 3.2, 2.8);
  group.add(windshield);

  // Roof Observation Turret Hatch
  const hatchGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.4, 12);
  const hatch = new THREE.Mesh(hatchGeo, metalMat);
  hatch.position.set(0, 4.2, 1.2);
  group.add(hatch);

  // 2. Heavy Spiked Cowcatcher & Radiator Grille
  const ramGeo = new THREE.BoxGeometry(3.8, 1.6, 1.2);
  const ram = new THREE.Mesh(ramGeo, metalMat);
  ram.position.set(0, 1.1, 4.8);
  ram.castShadow = true;
  group.add(ram);

  // 3 Sharp Ramming Spikes
  const spikeGeo = new THREE.ConeGeometry(0.2, 1.0, 6);
  spikeGeo.rotateX(Math.PI / 2);
  for (let s = -1; s <= 1; s++) {
    const spike = new THREE.Mesh(spikeGeo, chromeMat);
    spike.position.set(s * 1.3, 1.1, 5.5);
    group.add(spike);
  }

  // Chrome Radiator Grille & Headlights
  const grillGeo = new THREE.BoxGeometry(2.2, 1.4, 0.2);
  const grill = new THREE.Mesh(grillGeo, chromeMat);
  grill.position.set(0, 1.7, 4.9);
  group.add(grill);

  const headLightGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.3, 8);
  headLightGeo.rotateX(Math.PI / 2);
  const hlL = new THREE.Mesh(headLightGeo, lightMat);
  hlL.position.set(-1.2, 1.8, 4.9);
  group.add(hlL);
  const hlR = new THREE.Mesh(headLightGeo, lightMat);
  hlR.position.set(1.2, 1.8, 4.9);
  group.add(hlR);

  // 3. Armored Tanker Trailer
  const tankerGeo = new THREE.CylinderGeometry(1.65, 1.65, 6.8, 18);
  tankerGeo.rotateX(Math.PI / 2);
  const tanker = new THREE.Mesh(tankerGeo, tankerMat);
  tanker.position.set(0, 2.5, -3.4);
  tanker.castShadow = true;
  group.add(tanker);

  // Tanker Heavy Steel Reinforcement Bands (3 rings)
  const bandGeo = new THREE.TorusGeometry(1.72, 0.12, 8, 24);
  for (const bz of [-5.6, -3.4, -1.2]) {
    const band = new THREE.Mesh(bandGeo, trimMat);
    band.position.set(0, 2.5, bz);
    group.add(band);
  }

  // Tanker Top Catwalk Walkway
  const catwalkGeo = new THREE.BoxGeometry(1.2, 0.15, 6.4);
  const catwalk = new THREE.Mesh(catwalkGeo, metalMat);
  catwalk.position.set(0, 4.25, -3.4);
  group.add(catwalk);

  // Side Fuel Pods
  const tankPodGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.8, 12);
  tankPodGeo.rotateX(Math.PI / 2);
  const podL = new THREE.Mesh(tankPodGeo, chromeMat);
  podL.position.set(-1.8, 1.1, 0.4);
  group.add(podL);
  const podR = new THREE.Mesh(tankPodGeo, chromeMat);
  podR.position.set(1.8, 1.1, 0.4);
  group.add(podR);

  // 4. Dual Tall Chrome Exhaust Smokestacks
  const pipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.0, 8);
  const pipeL = new THREE.Mesh(pipeGeo, chromeMat);
  pipeL.position.set(-1.5, 4.2, 0.4);
  group.add(pipeL);

  const pipeR = new THREE.Mesh(pipeGeo, chromeMat);
  pipeR.position.set(1.5, 4.2, 0.4);
  group.add(pipeR);

  // Smokestack Heat Shield Cages
  const shieldGeo = new THREE.CylinderGeometry(0.26, 0.26, 2.2, 8, 1, true);
  const sL = new THREE.Mesh(shieldGeo, metalMat);
  sL.position.set(-1.5, 3.4, 0.4);
  group.add(sL);
  const sR = new THREE.Mesh(shieldGeo, metalMat);
  sR.position.set(1.5, 3.4, 0.4);
  group.add(sR);

  // Nitro Boost Exhaust Flame Cones
  const flameGeo = new THREE.ConeGeometry(0.32, 2.2, 8);
  flameGeo.rotateX(-Math.PI);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 });

  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-1.5, 6.3, 0.4);
  flameL.visible = false;
  flameL.name = 'boostFlameL';
  group.add(flameL);

  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(1.5, 6.3, 0.4);
  flameR.visible = false;
  flameR.name = 'boostFlameR';
  group.add(flameR);

  // 5. Wheels (8 heavy dual-axle off-road tires with steel rims)
  const tireGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.65, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.68, 10);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.7, 0.72, 3.2], [1.7, 0.72, 3.2],
    [-1.7, 0.72, 0.4], [1.7, 0.72, 0.4],
    [-1.7, 0.72, -4.2], [1.7, 0.72, -4.2],
    [-1.7, 0.72, -5.6], [1.7, 0.72, -5.6],
  ];

  for (const [wx, wy, wz] of wheelPositions) {
    const tire = new THREE.Mesh(tireGeo, wheelMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    group.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(wx, wy, wz);
    group.add(rim);
  }

  return group;
}

function createBuggyMesh(team: 'convoy' | 'raiders'): THREE.Group {
  const group = new THREE.Group();

  const isConvoy = team === 'convoy';
  const primaryColor = isConvoy ? 0x2563eb : 0xdc2626; // Cobalt Blue vs Crimson Raider
  const accentColor = isConvoy ? 0xf59e0b : 0x1f2937; // High-Vis Yellow vs Iron Black
  const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.45, metalness: 0.65 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5, metalness: 0.7 });
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.85 }); // Welded Tube Steel
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: isConvoy ? 0xe2e8f0 : 0x78716c, roughness: 0.3, metalness: 0.85 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.9 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // 1. Tapered Wedge Chassis Body
  const hoodGeo = new THREE.BoxGeometry(1.8, 0.6, 2.2);
  const hood = new THREE.Mesh(hoodGeo, bodyMat);
  hood.position.set(0, 0.85, 0.4);
  hood.castShadow = true;
  group.add(hood);

  // Hood Supercharger Air Scoop with triple butterfly valves
  const scoopGeo = new THREE.BoxGeometry(0.7, 0.35, 0.9);
  const scoop = new THREE.Mesh(scoopGeo, accentMat);
  scoop.position.set(0, 1.25, 0.8);
  scoop.castShadow = true;
  group.add(scoop);

  const valveGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8);
  valveGeo.rotateX(Math.PI / 2);
  const valveMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  for (let s = -1; s <= 1; s++) {
    const valve = new THREE.Mesh(valveGeo, valveMat);
    valve.position.set(s * 0.2, 1.28, 1.26);
    group.add(valve);
  }

  // Rear Raised Engine Bay / Cowl
  const rearGeo = new THREE.BoxGeometry(2.1, 0.75, 1.4);
  const rear = new THREE.Mesh(rearGeo, bodyMat);
  rear.position.set(0, 1.05, -1.2);
  rear.castShadow = true;
  group.add(rear);

  // Front Tubular Bullbar / Brush Guard
  const bullbarGeo = new THREE.BoxGeometry(2.0, 0.6, 0.4);
  const bullbar = new THREE.Mesh(bullbarGeo, cageMat);
  bullbar.position.set(0, 0.9, 1.6);
  bullbar.castShadow = true;
  group.add(bullbar);

  // Dual Rally Headlights
  const hlGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8);
  hlGeo.rotateX(Math.PI / 2);
  const hl1 = new THREE.Mesh(hlGeo, lightMat);
  hl1.position.set(-0.6, 1.0, 1.75);
  group.add(hl1);
  const hl2 = new THREE.Mesh(hlGeo, lightMat);
  hl2.position.set(0.6, 1.0, 1.75);
  group.add(hl2);

  // Heavy Tubular Side Rock-Sliders / Nerf-Bars
  const nerfBarGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6);
  nerfBarGeo.rotateX(Math.PI / 2);
  const nerfL = new THREE.Mesh(nerfBarGeo, cageMat);
  nerfL.position.set(-1.18, 0.55, 0.0);
  group.add(nerfL);
  const nerfR = new THREE.Mesh(nerfBarGeo, cageMat);
  nerfR.position.set(1.18, 0.55, 0.0);
  group.add(nerfR);

  // 2. Open Tubular Roll Cage Structure
  const cagePillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6);
  const pillarCoords = [
    [-0.85, 1.45, 0.5], [0.85, 1.45, 0.5],
    [-0.95, 1.55, -0.7], [0.95, 1.55, -0.7],
  ];
  for (const [px, py, pz] of pillarCoords) {
    const pillar = new THREE.Mesh(cagePillarGeo, cageMat);
    pillar.position.set(px, py, pz);
    group.add(pillar);
  }

  // Roof cage top frame
  const roofRailGeo = new THREE.BoxGeometry(1.8, 0.1, 1.4);
  const roof = new THREE.Mesh(roofRailGeo, cageMat);
  roof.position.set(0, 2.05, -0.1);
  group.add(roof);

  // Quad Roof Spotlight Light-Bar
  const spotGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
  spotGeo.rotateX(Math.PI / 2);
  for (let b = -1.5; b <= 1.5; b += 1.0) {
    const spot = new THREE.Mesh(spotGeo, lightMat);
    spot.position.set(b * 0.35, 2.22, 0.55);
    group.add(spot);
  }

  // Cockpit Racing Seat
  const seatGeo = new THREE.BoxGeometry(0.8, 0.9, 0.7);
  const seat = new THREE.Mesh(seatGeo, accentMat);
  seat.position.set(0, 1.3, -0.1);
  group.add(seat);

  // 3. Twin High-Caliber Autocannons on Roof
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8);
  cannonBarrelGeo.rotateX(Math.PI / 2);
  const gunL = new THREE.Mesh(cannonBarrelGeo, gunMat);
  gunL.position.set(-0.65, 2.2, 0.8);
  gunL.castShadow = true;
  group.add(gunL);

  const gunR = new THREE.Mesh(cannonBarrelGeo, gunMat);
  gunR.position.set(0.65, 2.2, 0.8);
  gunR.castShadow = true;
  group.add(gunR);

  // Ammo Drum Box
  const ammoGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 10);
  ammoGeo.rotateZ(Math.PI / 2);
  const ammoBox = new THREE.Mesh(ammoGeo, accentMat);
  ammoBox.position.set(0, 2.25, -0.1);
  group.add(ammoBox);

  // 4. Exposed Rear V8 Supercharger & Dual Exhausts
  const blowerGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
  const blower = new THREE.Mesh(blowerGeo, accentMat);
  blower.position.set(0, 1.6, -1.1);
  group.add(blower);

  const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6);
  exhaustGeo.rotateX(Math.PI / 2);
  const exL = new THREE.Mesh(exhaustGeo, rimMat);
  exL.position.set(-0.5, 0.9, -1.9);
  group.add(exL);
  const exR = new THREE.Mesh(exhaustGeo, rimMat);
  exR.position.set(0.5, 0.9, -1.9);
  group.add(exR);

  // Nitro Boost Exhaust Flame Cones for Buggies
  const flameGeo = new THREE.ConeGeometry(0.18, 1.4, 8);
  flameGeo.rotateX(-Math.PI / 2); // points backward along -Z
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 });

  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.5, 0.9, -2.6);
  flameL.visible = false;
  flameL.name = 'boostFlameL';
  group.add(flameL);

  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(0.5, 0.9, -2.6);
  flameR.visible = false;
  flameR.name = 'boostFlameR';
  group.add(flameR);

  // Rear High Downforce Spoiler Wing with Endplates
  const wingGeo = new THREE.BoxGeometry(2.3, 0.12, 0.6);
  const wing = new THREE.Mesh(wingGeo, isConvoy ? bodyMat : accentMat);
  wing.position.set(0, 1.7, -1.8);
  wing.castShadow = true;
  group.add(wing);

  const epGeo = new THREE.BoxGeometry(0.08, 0.45, 0.65);
  const epL = new THREE.Mesh(epGeo, accentMat);
  epL.position.set(-1.15, 1.82, -1.8);
  group.add(epL);
  const epR = new THREE.Mesh(epGeo, accentMat);
  epR.position.set(1.15, 1.82, -1.8);
  group.add(epR);

  // Long whip radio antenna
  const antGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.7, 4);
  const ant = new THREE.Mesh(antGeo, cageMat);
  ant.position.set(0.85, 2.3, -1.2);
  ant.rotation.z = -0.15;
  group.add(ant);

  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: isConvoy ? 0x38bdf8 : 0xef4444 }));
  antTip.position.set(1.0, 3.1, -1.2);
  group.add(antTip);

  // 5. Chunky Desert Off-Road Tires with 5-Spoke Rims
  const tireGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.55, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.58, 10);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.3, 0.68, 1.2], [1.3, 0.68, 1.2],
    [-1.3, 0.68, -1.1], [1.3, 0.68, -1.1],
  ];

  for (const [wx, wy, wz] of wheelPositions) {
    const tire = new THREE.Mesh(tireGeo, wheelMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    group.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(wx, wy, wz);
    group.add(rim);
  }

  // 5. Overhead 3D Floating Health Bar
  const hpGroup = new THREE.Group();
  hpGroup.name = 'healthBar';
  hpGroup.position.set(0, 2.7, 0);
  hpGroup.rotation.x = -Math.PI / 4; // tilt towards overhead isometric camera

  const hpBgGeo = new THREE.BoxGeometry(2.0, 0.22, 0.06);
  const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
  hpGroup.add(hpBg);

  const hpFillGeo = new THREE.BoxGeometry(1.92, 0.16, 0.08);
  const hpFillColor = team === 'convoy' ? 0x38bdf8 : 0xef4444;
  const hpFillMat = new THREE.MeshBasicMaterial({ color: hpFillColor });
  const hpFill = new THREE.Mesh(hpFillGeo, hpFillMat);
  hpFill.name = 'healthFill';
  hpGroup.add(hpFill);

  // Distinct overhead player indicator ("YOU")
  const markerGeo = new THREE.ConeGeometry(0.35, 0.6, 3);
  markerGeo.rotateX(Math.PI);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const markerMesh = new THREE.Mesh(markerGeo, markerMat);
  markerMesh.name = 'playerMarker';
  markerMesh.position.set(0, 0.58, 0);
  markerMesh.visible = false;
  hpGroup.add(markerMesh);

  group.add(hpGroup);

  return group;
}

function createProjectileMesh(type?: string, team?: string): THREE.Group {
  const group = new THREE.Group();

  if (type === 'missile') {
    // 1. Sleek aerodynamic rocket fuselage
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 2.4, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // 2. High-explosive warhead cone
    const coneGeo = new THREE.ConeGeometry(0.26, 0.9, 8);
    coneGeo.rotateX(Math.PI / 2);
    const coneColor = team === 'convoy' ? 0x0284c7 : 0xdc2626;
    const coneMat = new THREE.MeshStandardMaterial({
      color: coneColor,
      roughness: 0.3,
      metalness: 0.5,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, 0, 1.6);
    group.add(cone);

    // 3. Four stabilizing cruciform tail fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const finGeoH = new THREE.BoxGeometry(0.95, 0.04, 0.55);
    const finGeoV = new THREE.BoxGeometry(0.04, 0.95, 0.55);
    const finH = new THREE.Mesh(finGeoH, finMat);
    finH.position.set(0, 0, -0.9);
    group.add(finH);
    const finV = new THREE.Mesh(finGeoV, finMat);
    finV.position.set(0, 0, -0.9);
    group.add(finV);

    // 4. Burning rocket propellant thruster flame & trail
    const flameGeo = new THREE.ConeGeometry(0.22, 1.6, 8);
    flameGeo.rotateX(-Math.PI / 2); // points backward along -Z
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0, -2.0);
    group.add(flame);

    const coreFlameGeo = new THREE.ConeGeometry(0.12, 1.2, 8);
    coreFlameGeo.rotateX(-Math.PI / 2);
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const coreFlame = new THREE.Mesh(coreFlameGeo, coreFlameMat);
    coreFlame.position.set(0, 0, -1.8);
    group.add(coreFlame);

    return group;
  }

  if (type === 'spread') {
    // 4-Shot scatter flak pellet (incendiary glowing cluster)
    const pelletGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const pelletMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const pellet = new THREE.Mesh(pelletGeo, pelletMat);
    group.add(pellet);

    // Fiery flak aura
    const glowGeo = new THREE.SphereGeometry(0.58, 8, 8);
    const glowColor = team === 'convoy' ? 0x38bdf8 : 0xf97316;
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // Short incendiary streak
    const streakGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6);
    streakGeo.rotateX(Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75 });
    const streak = new THREE.Mesh(streakGeo, streakMat);
    streak.position.set(0, 0, -0.6);
    group.add(streak);

    return group;
  }

  // Default: Twin cannon high-speed tracer streak
  const tracerGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.4, 8);
  tracerGeo.rotateX(Math.PI / 2);
  const tracerColor = team === 'convoy' ? 0x38bdf8 : 0xf97316;
  const outerMat = new THREE.MeshBasicMaterial({ color: tracerColor });
  const outer = new THREE.Mesh(tracerGeo, outerMat);
  group.add(outer);

  const coreGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8);
  coreGeo.rotateX(Math.PI / 2);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const tipGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(0, 0, 1.7);
  group.add(tip);

  return group;
}

function createTracerMesh(team?: string): THREE.Group {
  return createProjectileMesh('bullet', team);
}

const shieldMeshes = new Map<string, THREE.Group>();

function createShieldMesh(): THREE.Group {
  const group = new THREE.Group();

  // 1. Faceted emerald/cyan shield crystal core
  const coreGeo = new THREE.IcosahedronGeometry(1.2, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    roughness: 0.2,
    metalness: 0.8,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'core';
  core.castShadow = true;
  group.add(core);

  // 2. Translucent outer energy shield sphere
  const bubbleGeo = new THREE.SphereGeometry(1.65, 12, 12);
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
  });
  const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
  bubble.name = 'bubble';
  group.add(bubble);

  // 3. Floating orbital shield crests / orbiting satellites
  const orbitGroup = new THREE.Group();
  orbitGroup.name = 'orbit';
  const crestGeo = new THREE.BoxGeometry(0.3, 0.65, 0.1);
  const crestMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(Math.cos(angle) * 1.85, 0, Math.sin(angle) * 1.85);
    crest.rotation.y = angle;
    orbitGroup.add(crest);
  }
  group.add(orbitGroup);

  // 4. Ground energy beacon ring
  const ringGeo = new THREE.RingGeometry(1.5, 2.2, 16);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = -1.0;
  group.add(ring);

  // 5. Emerald repair beacon pillar
  const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 7.5, 6);
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.35,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = 2.8;
  group.add(pillar);

  return group;
}

const scrapMeshes = new Map<string, THREE.Group>();

function createScrapMesh(): THREE.Group {
  const group = new THREE.Group();

  // 1. Faceted floating salvage crystal core
  const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    roughness: 0.2,
    metalness: 0.85,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'core';
  core.castShadow = true;
  group.add(core);

  // 2. Wireframe outer shell
  const wireGeo = new THREE.OctahedronGeometry(1.45, 0);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true, transparent: true, opacity: 0.75 });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.name = 'wire';
  group.add(wire);

  // 3. Ground energy beacon ring
  const ringGeo = new THREE.RingGeometry(1.4, 2.0, 16);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = -1.0;
  group.add(ring);

  // 4. Subtle beacon light pillar
  const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 7.0, 6);
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = 2.5;
  group.add(pillar);

  return group;
}

// -------------------------------------------------------------
// USER INPUT & ACTIONS
// -------------------------------------------------------------
function onKeyDown(e: KeyboardEvent) {
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', '1', '2', '3', 'q', 'e'].includes(key)) {
    e.preventDefault();
  }

  if (key === '1') handleSelectWeapon('twin_cannon');
  if (key === '2') handleSelectWeapon('homing_missile');
  if (key === '3') handleSelectWeapon('shotgun_spread');
  if (key === 'q') cycleWeapon(-1);
  if (key === 'e') cycleWeapon(1);

  if (key === 'shift') {
    if (!keysDown.shift) {
      keysDown.shift = true;
      dispatchVehicleControls();
    }
  }
  if (key === 'w' || key === 'arrowup') keysDown.w = true;
  if (key === 's' || key === 'arrowdown') keysDown.s = true;
  if (key === 'a' || key === 'arrowleft') keysDown.a = true;
  if (key === 'd' || key === 'arrowright') keysDown.d = true;
  if (key === ' ') {
    keysDown.space = true;
    handleShootAction();
  }
}

function onKeyUp(e: KeyboardEvent) {
  const key = e.key.toLowerCase();
  if (key === 'shift') {
    if (keysDown.shift) {
      keysDown.shift = false;
      dispatchVehicleControls();
    }
  }
  if (key === 'w' || key === 'arrowup') keysDown.w = false;
  if (key === 's' || key === 'arrowdown') keysDown.s = false;
  if (key === 'a' || key === 'arrowleft') keysDown.a = false;
  if (key === 'd' || key === 'arrowright') keysDown.d = false;
  if (key === ' ') keysDown.space = false;
}

function onWindowBlur() {
  keysDown.shift = false;
  isTouchBoosting = false;
  dispatchVehicleControls();
}

let isMouseDown = false;

function onMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
  if (e.button === 0) {
    isMouseDown = true;
    handleShootAction();
  }
}

function onMouseUp(e: MouseEvent) {
  if (e.button === 0) {
    isMouseDown = false;
  }
}

function handleShootAction() {
  if (!myVehicle.value) return;
  if (myVehicle.value.role === 'rig') {
    triggerAlert('The War Rig has no guns! Navigate & defend!');
    return;
  }
  const myMesh = vehicleMeshes.get(myVehicle.value.playerId);
  sendGameAction({
    type: 'shoot',
    y: myMesh ? myMesh.position.y : myVehicle.value.y,
    pitch: myMesh ? myMesh.rotation.x : myVehicle.value.pitch,
  });
}

function triggerAlert(msg: string) {
  alertMessage.value = msg;
  setTimeout(() => {
    if (alertMessage.value === msg) alertMessage.value = null;
  }, 2500);
}

function dispatchVehicleControls() {
  if (!myVehicle.value || !myVehicle.value.alive) return;
  if (platformState.gameStatus !== 'in_progress') return;

  // Auto-fire twin cannons continuously while holding Space or Left Mouse Button
  const isHoldingFire = keysDown.space || isMouseDown;
  if (isHoldingFire && myVehicle.value.role !== 'rig' && (myVehicle.value.shootCooldown || 0) <= 0.05) {
    const myMesh = vehicleMeshes.get(myVehicle.value.playerId);
    sendGameAction({
      type: 'shoot',
      y: myMesh ? myMesh.position.y : myVehicle.value.y,
      pitch: myMesh ? myMesh.rotation.x : myVehicle.value.pitch,
    });
  }

  let throttle = 0;
  if (keysDown.w) throttle += 1;
  if (keysDown.s) throttle -= 1;

  let steer = 0;
  if (keysDown.a) steer -= 1;
  if (keysDown.d) steer += 1;

  const isHoldingBoost = keysDown.shift || isTouchBoosting;

  sendGameAction({
    type: 'control',
    throttle,
    steer,
    boost: isHoldingBoost,
  });
}

function onWindowResize() {
  if (!canvasContainer.value || !camera || !renderer) return;
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// -------------------------------------------------------------
// MAIN RENDER LOOP & ENTITY SYNCHRONIZATION
// -------------------------------------------------------------
function renderLoop() {
  animationFrameId = requestAnimationFrame(renderLoop);

  if (!scene || !camera || !renderer) return;

  if (playerDamageFlashTimer > 0) {
    playerDamageFlashTimer -= 0.016;
    if (playerDamageFlashTimer <= 0) {
      playerDamageFlash.value = false;
      isPlayerDamaged.value = false;
    }
  }

  const now = performance.now();
  const timeSincePacket = Math.max(0, Math.min(0.08, (now - lastPacketTime) / 1000));

  const currentVehicles = gameState.value?.vehicles || [];

  // 1. Sync Vehicle 3D Meshes
  const activeIds = new Set<string>();

  for (const v of currentVehicles) {
    activeIds.add(v.playerId);

    let mesh = vehicleMeshes.get(v.playerId);
    // Dynamically rebuild mesh if role or team changed
    if (!mesh || mesh.userData?.role !== v.role || mesh.userData?.team !== v.team) {
      if (mesh) {
        scene.remove(mesh);
      }
      if (v.role === 'rig') {
        mesh = createRigMesh();
      } else {
        mesh = createBuggyMesh(v.team);
      }
      mesh.userData = { role: v.role, team: v.team, initialized: true };
      mesh.position.set(v.x, v.y, v.z);
      mesh.rotation.y = v.yaw || 0;
      scene.add(mesh);
      vehicleMeshes.set(v.playerId, mesh);
    }

    // Damage transition check -> spawn hit sparks, floating damage text, and trigger player hitmarker!
    const prevHp = vehiclePrevHp.get(v.playerId);
    if (prevHp !== undefined && v.hp < prevHp && v.alive) {
      const dmg = prevHp - v.hp;
      spawnHitSpark(mesh.position.x, mesh.position.y + 0.9, mesh.position.z);
      spawnFloatingDamage(mesh.position.x, mesh.position.y + 1.2, mesh.position.z, dmg, dmg >= 40);
      // If an enemy vehicle was damaged, show hit confirmation on player's HUD
      if (myVehicle.value && v.team !== myVehicle.value.team) {
        triggerHitMarker();
      }
    }
    vehiclePrevHp.set(v.playerId, v.hp);

    // Death transition check -> trigger explosion!
    const prevAlive = vehicleAliveState.get(v.playerId);
    if (prevAlive === true && v.alive === false) {
      spawnExplosion(v.x, v.y + 1.2, v.z, v.role === 'rig');
      if (v.role === 'rig') {
        triggerAlert('THE WAR RIG HAS BEEN DESTROYED!');
      } else {
        triggerAlert(`${v.nickname} destroyed!`);
      }
    }
    vehicleAliveState.set(v.playerId, v.alive);

    // Transform and terrain contour slope tilt update
    if (!v.alive) {
      // Wreckage presentation: tilted on side
      mesh.visible = true;
      mesh.position.set(v.x, v.y, v.z);
      mesh.rotation.set(
        (v.pitch || 0) + 0.25,
        v.yaw || 0,
        (v.roll || 0) + (v.role === 'rig' ? 0.8 : 1.2),
        'YXZ'
      );
    } else {
      mesh.visible = true;

      // Dead-reckoning forward projection based on vehicle velocity:
      // Projects server position forward by timeSincePacket to eliminate 20Hz packet stepping
      const speed = v.speed || 0;
      const projectedX = v.x + Math.sin(v.yaw || 0) * speed * timeSincePacket;
      const projectedZ = v.z + Math.cos(v.yaw || 0) * speed * timeSincePacket;

      const distToTarget = Math.hypot(projectedX - mesh.position.x, projectedZ - mesh.position.z);
      if (distToTarget > 25 || !mesh.userData.initialized) {
        mesh.position.x = projectedX;
        mesh.position.z = projectedZ;
        mesh.rotation.y = v.yaw || 0;
        mesh.userData.initialized = true;
      } else {
        // Continuous smoothing chasing the projected target
        mesh.position.x += (projectedX - mesh.position.x) * 0.35;
        mesh.position.z += (projectedZ - mesh.position.z) * 0.35;

        // Angle lerp for yaw heading (wrap-around safe)
        let yawDiff = (v.yaw || 0) - mesh.rotation.y;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        mesh.rotation.y += yawDiff * 0.3;
      }

      // Solid collision resolution: prevent vehicle mesh from clipping into terrain obstacles (skip jump ramps)
      const vRadius = v.role === 'rig' ? 4.2 : 1.9;
      const vehicleY = Math.max(mesh.position.y, v.y);
      for (const obs of TERRAIN_OBSTACLES) {
        if (obs.type === 'jump_ramp') continue;
        const obsGroundY = getTerrainHeight(obs.x, obs.z);
        const obsTopY = obsGroundY + getObstacleHeight(obs);
        // If vehicle is airborne above obstacle top, clear it cleanly without hitting invisible walls
        if (vehicleY >= obsTopY - 0.2) continue;

        const dx = mesh.position.x - obs.x;
        const dz = mesh.position.z - obs.z;
        if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue; // Broad-phase distance filter (optimization 2.3)
        const minDist = vRadius + obs.radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;
          const pushMargin = v.role === 'rig' ? 0.35 : 0.55;
          mesh.position.x += nx * (overlap + pushMargin);
          mesh.position.z += nz * (overlap + pushMargin);

          // Contact impact sparks when bouncing off solid obstacle boundaries at speed
          const vx = Math.sin(mesh.rotation.y) * (v.speed || 0);
          const vz = Math.cos(mesh.rotation.y) * (v.speed || 0);
          const vNormal = vx * nx + vz * nz;
          if (vNormal < -6.0) {
            spawnHitSpark(mesh.position.x - nx * vRadius, mesh.position.y + 0.6, mesh.position.z - nz * vRadius);
          }
        }
      }

      // 4-wheel height sampling for realistic terrain contour tilting based on smoothed position
      const curX = mesh.position.x;
      const curZ = mesh.position.z;
      const curYaw = mesh.rotation.y;

      const halfL = v.role === 'rig' ? 4.2 : 1.5;
      const halfW = v.role === 'rig' ? 1.4 : 0.9;
      const fx = Math.sin(curYaw);
      const fz = Math.cos(curYaw);
      const rx = Math.cos(curYaw);
      const rz = -Math.sin(curYaw);

      const hF = getSurfaceHeight(curX + fx * halfL, curZ + fz * halfL);
      const hB = getSurfaceHeight(curX - fx * halfL, curZ - fz * halfL);
      const hR = getSurfaceHeight(curX + rx * halfW, curZ + rz * halfW);
      const hL = getSurfaceHeight(curX - rx * halfW, curZ - rz * halfW);

      // Dynamic terrain slope + impact collision knockback pitch/roll tilt
      const targetPitch = -Math.atan2(hF - hB, halfL * 2) + (v.pitch || 0);
      const targetRoll = Math.atan2(hL - hR, halfW * 2) + (v.roll || 0);
      const avgGroundY = (hF + hB + hR + hL) * 0.25;

      // Smooth vertical ground suspension & contour tilt
      mesh.position.y += (Math.max(v.y, avgGroundY) - mesh.position.y) * 0.35;
      mesh.rotation.x += (targetPitch - mesh.rotation.x) * 0.3;
      mesh.rotation.z += (targetRoll - mesh.rotation.z) * 0.3;

      // Tire kick-up particles behind driving vehicles (using pooled objects - optimization 2.1)
      if (Math.abs(speed) > 3.0 && Math.random() < 0.35) {
        const isGrass = environmentTheme.value === 'grassland';
        const yaw = mesh.rotation.y;
        const backDist = v.role === 'rig' ? 4.0 : 1.5;
        const sideOffset = (Math.random() - 0.5) * (v.role === 'rig' ? 2.2 : 1.2);
        const bx = mesh.position.x - Math.sin(yaw) * backDist + Math.cos(yaw) * sideOffset;
        const bz = mesh.position.z - Math.cos(yaw) * backDist - Math.sin(yaw) * sideOffset;
        const by = mesh.position.y + 0.25;
        spawnPooledTireParticle(
          bx,
          by,
          bz,
          (Math.random() - 0.5) * 1.5 - Math.sin(yaw) * (speed * 0.12),
          0.6 + Math.random() * 0.7,
          (Math.random() - 0.5) * 1.5 - Math.cos(yaw) * (speed * 0.12),
          0.32 + Math.random() * 0.2,
          isGrass
        );
      }

      // Update Nitro Boost exhaust flame on boosting vehicles
      const isBoosting = (v.boostActiveTimer || 0) > 0;
      const flameL = mesh.getObjectByName('boostFlameL');
      const flameR = mesh.getObjectByName('boostFlameR');
      if (flameL && flameR) {
        flameL.visible = isBoosting;
        flameR.visible = isBoosting;
        if (isBoosting) {
          const flicker = 0.85 + Math.random() * 0.45;
          flameL.scale.set(flicker, flicker, flicker * 1.5);
          flameR.scale.set(flicker, flicker, flicker * 1.5);
        }
      }

      // Update Buggy Overhead Health Bar
      const hpGroup = mesh.getObjectByName('healthBar');
      const hpFill = mesh.getObjectByName('healthFill') as THREE.Mesh | undefined;
      const playerMarker = mesh.getObjectByName('playerMarker') as THREE.Mesh | undefined;
      const isMyCar = v.playerId === myVehicle.value?.playerId;

      if (hpGroup && hpFill) {
        if (!v.alive) {
          hpGroup.visible = false;
        } else {
          hpGroup.visible = true;
          const maxHp = v.maxHp || (v.team === 'convoy' ? 350 : 320);
          const ratio = Math.max(0, Math.min(1, v.hp / maxHp));
          hpFill.scale.x = ratio;
          hpFill.position.x = -(1 - ratio) * 0.96;

          if (isMyCar) {
            // User's car: Large, prominent, distinct overhead indicator!
            hpGroup.scale.set(1.45, 1.45, 1.45);
            hpGroup.position.y = 3.2;
            if (playerMarker) {
              playerMarker.visible = true;
              playerMarker.position.y = 0.58 + Math.sin(now * 0.007) * 0.1;
            }

            const fillMat = hpFill.material as THREE.MeshBasicMaterial;
            if (fillMat) {
              if (playerDamageFlashTimer > 0) {
                fillMat.color.setHex(0xffffff); // Damage impact white flash
              } else if (ratio < 0.25) {
                const pulse = Math.sin(now * 0.012) > 0;
                fillMat.color.setHex(pulse ? 0xef4444 : 0xff7777);
              } else if (ratio < 0.55) {
                fillMat.color.setHex(0xf59e0b);
              } else {
                fillMat.color.setHex(0x10b981);
              }
            }
          } else {
            hpGroup.scale.set(1.0, 1.0, 1.0);
            hpGroup.position.y = 2.7;
            if (playerMarker) playerMarker.visible = false;
            const fillMat = hpFill.material as THREE.MeshBasicMaterial;
            if (fillMat) {
              fillMat.color.setHex(v.team === 'convoy' ? 0x38bdf8 : 0xef4444);
            }
          }
        }
      }
    }
  }

  // Remove disconnected/despawned meshes
  for (const [id, mesh] of vehicleMeshes) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      vehicleMeshes.delete(id);
      vehicleAliveState.delete(id);
      vehiclePrevHp.delete(id);
    }
  }

  // 2. Sync Bullets (Fiery High-Velocity Tracer Rounds, Homing Missiles, Scatter Pellets)
  const bullets = gameState.value?.bullets || [];
  while (bulletMeshes.length < bullets.length) {
    const idx = bulletMeshes.length;
    const b = bullets[idx];
    const bMesh = createProjectileMesh(b?.type, b?.team);
    bMesh.userData = { type: b?.type, team: b?.team };
    bMesh.position.set(b.x, b.y, b.z);
    scene.add(bMesh);
    bulletMeshes.push(bMesh);
  }
  while (bulletMeshes.length > bullets.length) {
    const b = bulletMeshes.pop();
    if (b) scene.remove(b);
  }
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    let bMesh = bulletMeshes[i];
    if (bMesh.userData?.type !== b.type || bMesh.userData?.team !== b.team) {
      scene.remove(bMesh);
      bMesh = createProjectileMesh(b.type, b.team);
      bMesh.userData = { type: b.type, team: b.team };
      bMesh.position.set(b.x, b.y, b.z);
      scene.add(bMesh);
      bulletMeshes[i] = bMesh;
    }
    if (bMesh.position.distanceTo(new THREE.Vector3(b.x, b.y, b.z)) > 12) {
      bMesh.position.set(b.x, b.y, b.z);
    } else {
      bMesh.position.x += (b.x - bMesh.position.x) * 0.45;
      bMesh.position.y += (b.y - bMesh.position.y) * 0.45;
      bMesh.position.z += (b.z - bMesh.position.z) * 0.45;
    }
    // Align projectile streak with 3D velocity vector (yaw and pitch)
    const horizSpeed = Math.hypot(b.vx, b.vz);
    const pitch = b.vy ? -Math.atan2(b.vy, horizSpeed) : 0;
    bMesh.rotation.set(pitch, Math.atan2(b.vx, b.vz), 0, 'YXZ');
  }

  // 3. Update Active Explosions & Smoke
  for (let i = activeExplosions.length - 1; i >= 0; i--) {
    const exp = activeExplosions[i];
    exp.age += 0.035;
    const progress = exp.age / exp.maxAge;
    if (progress >= 1) {
      scene.remove(exp.mesh);
      activeExplosions.splice(i, 1);
    } else {
      const s = 1.0 + progress * exp.scaleRate;
      exp.mesh.scale.set(s, s, s);
      exp.mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material && 'opacity' in child.material) {
          child.material.opacity = Math.max(0, (1 - progress) * 0.9);
        }
      });
    }
  }

  // 4. Update Scrap Caches (Floating glowing salvage cores in Point Battle)
  if (gameState.value?.scrapCaches && scene) {
    const activeCacheIds = new Set<string>();
    for (const sc of gameState.value.scrapCaches) {
      activeCacheIds.add(sc.id);
      let sMesh = scrapMeshes.get(sc.id);
      if (!sMesh) {
        sMesh = createScrapMesh();
        sMesh.position.set(sc.x, sc.y, sc.z);
        scene.add(sMesh);
        scrapMeshes.set(sc.id, sMesh);
      }

      sMesh.visible = sc.active;
      if (sc.active) {
        const timeSec = now * 0.002;
        const core = sMesh.getObjectByName('core');
        const wire = sMesh.getObjectByName('wire');
        if (core) {
          core.rotation.y = timeSec * 2.0;
          core.rotation.x = Math.sin(timeSec * 1.5) * 0.3;
          core.position.y = Math.sin(timeSec * 3.0) * 0.35;
        }
        if (wire) {
          wire.rotation.y = -timeSec * 1.5;
          wire.rotation.z = Math.cos(timeSec * 1.5) * 0.3;
          wire.position.y = Math.sin(timeSec * 3.0) * 0.35;
        }
      }
    }

    for (const [id, sMesh] of scrapMeshes) {
      if (!activeCacheIds.has(id)) {
        scene.remove(sMesh);
        scrapMeshes.delete(id);
      }
    }
  }

  // 4b. Update Shield Pickups (Floating glowing emerald shield replenishments)
  if (gameState.value?.shieldPickups && scene) {
    const activeShieldIds = new Set<string>();
    for (const sp of gameState.value.shieldPickups) {
      activeShieldIds.add(sp.id);
      let sMesh = shieldMeshes.get(sp.id);
      if (!sMesh) {
        sMesh = createShieldMesh();
        sMesh.position.set(sp.x, sp.y, sp.z);
        scene.add(sMesh);
        shieldMeshes.set(sp.id, sMesh);
      }

      sMesh.visible = sp.active;
      if (sp.active) {
        const timeSec = now * 0.0025;
        const core = sMesh.getObjectByName('core');
        const bubble = sMesh.getObjectByName('bubble');
        const orbit = sMesh.getObjectByName('orbit');
        if (core) {
          core.rotation.y = timeSec * 1.8;
          core.rotation.x = Math.sin(timeSec * 1.4) * 0.25;
          core.position.y = Math.sin(timeSec * 2.8) * 0.3;
        }
        if (bubble) {
          bubble.rotation.y = -timeSec * 1.2;
          bubble.position.y = Math.sin(timeSec * 2.8) * 0.3;
        }
        if (orbit) {
          orbit.rotation.y = timeSec * 2.4;
          orbit.position.y = Math.sin(timeSec * 2.8) * 0.3;
        }
      }
    }

    for (const [id, sMesh] of shieldMeshes) {
      if (!activeShieldIds.has(id)) {
        scene.remove(sMesh);
        shieldMeshes.delete(id);
      }
    }
  }

  // 5. Update War Rig floating overhead 3D health bar (locked to smoothed mesh position)
  if (!isPointBattle.value && rigVehicle.value && rigHealthSprite) {
    const rigMesh = vehicleMeshes.get(rigVehicle.value.playerId);
    const rx = rigMesh ? rigMesh.position.x : rigVehicle.value.x;
    const ry = rigMesh ? rigMesh.position.y : rigVehicle.value.y;
    const rz = rigMesh ? rigMesh.position.z : rigVehicle.value.z;
    rigHealthSprite.position.set(rx, ry + 6.8, rz);
    rigHealthSprite.visible = true;
    updateRigHealthBar(rigVehicle.value.hp, rigVehicle.value.maxHp || 6000, rigVehicle.value.alive);
  } else if (rigHealthSprite) {
    rigHealthSprite.visible = false;
  }

  // 6. Camera Tracking (Smoothly follows active player, alive car, or rig)
  const targetVehicle = myVehicle.value || (isPointBattle.value ? currentVehicles.find((v: any) => v.alive) : rigVehicle.value) || currentVehicles[0];
  if (targetVehicle && camera) {
    const targetMesh = vehicleMeshes.get(targetVehicle.playerId);
    const targetX = targetMesh ? targetMesh.position.x : targetVehicle.x;
    const targetY = targetMesh ? targetMesh.position.y : targetVehicle.y;
    const targetZ = targetMesh ? targetMesh.position.z : targetVehicle.z;

    // Isometric elevated offset behind and above (zoomed out for expanded tactical view)
    const desiredCamX = targetX - 28;
    const desiredCamY = targetY + 36;
    const desiredCamZ = targetZ - 31;

    camera.position.x += (desiredCamX - camera.position.x) * 0.12;
    camera.position.y += (desiredCamY - camera.position.y) * 0.12;
    camera.position.z += (desiredCamZ - camera.position.z) * 0.12;

    if (!smoothedCamTarget) {
      smoothedCamTarget = new THREE.Vector3(targetX, targetY + 2, targetZ);
    } else {
      smoothedCamTarget.x += (targetX - smoothedCamTarget.x) * 0.15;
      smoothedCamTarget.y += (targetY + 2 - smoothedCamTarget.y) * 0.15;
      smoothedCamTarget.z += (targetZ - smoothedCamTarget.z) * 0.15;
    }

    camera.lookAt(smoothedCamTarget);

    // 2.2 Adaptive Shadow Frustum: Focus directional light on player
    if (sunLightRef) {
      sunLightRef.position.set(targetX + 65, targetY + 75, targetZ - 60);
      sunLightRef.target.position.set(targetX, targetY, targetZ);
      sunLightRef.target.updateMatrixWorld();
    }
  }

  // Calculate HUD destination compass/pointer angle towards Outpost Gate (0, y, 220)
  const focusedVeh = myVehicle.value || rigVehicle.value;
  if (focusedVeh && camera) {
    const dx = 0 - focusedVeh.x;
    const dz = 220 - focusedVeh.z;
    const targetAngle = Math.atan2(dx, dz);

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const camAngle = Math.atan2(camDir.x, camDir.z);

    let relAngle = (targetAngle - camAngle) * (180 / Math.PI);
    while (relAngle > 180) relAngle -= 360;
    while (relAngle < -180) relAngle += 360;
    destinationPointerAngle.value = Math.round(relAngle);
  }



  // 1.4 Update Floating Combat Damage Numbers and project to screen coordinates
  if (camera && floatingDamageList.value.length > 0) {
    const tempV = new THREE.Vector3();
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;

    for (let i = floatingDamageList.value.length - 1; i >= 0; i--) {
      const d = floatingDamageList.value[i];
      d.age += 0.025;
      if (d.age >= 1.0) {
        floatingDamageList.value.splice(i, 1);
      } else {
        d.y += 0.04;
        d.opacity = Math.max(0, 1.0 - d.age);
        tempV.set(d.x, d.y, d.z);
        tempV.project(camera);

        if (tempV.z < 1) {
          d.screenX = (tempV.x * 0.5 + 0.5) * canvasW;
          d.screenY = (-tempV.y * 0.5 + 0.5) * canvasH;
        } else {
          d.screenX = -200;
          d.screenY = -200;
        }
      }
    }
  }

  // 2.1 Update Pooled Tire Spray Particles (zero allocations, no GC)
  for (const tp of tireParticlePool) {
    if (!tp.active) continue;
    tp.age += 0.035;
    if (tp.age >= tp.maxAge) {
      tp.active = false;
      tp.mesh.visible = false;
    } else {
      tp.mesh.position.x += tp.vx * 0.035;
      tp.mesh.position.y += tp.vy * 0.035;
      tp.mesh.position.z += tp.vz * 0.035;
      tp.vy -= 1.8 * 0.035;
      const progress = tp.age / tp.maxAge;
      const s = 1.0 - progress * 0.5;
      tp.mesh.scale.set(s, s, s);
    }
  }

  renderer.render(scene, camera);
}

onMounted(() => {
  initThreeScene();
  // Auto-start match if not already running
  if (platformState.gameStatus !== 'in_progress') {
    startGame();
  }
});

onUnmounted(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  if (inputSendInterval) clearInterval(inputSendInterval);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('blur', onWindowBlur);

  if (rigHealthTexture) rigHealthTexture.dispose();
  if (rigHealthSprite && scene) scene.remove(rigHealthSprite);
  rigHealthSprite = null;
  rigHealthTexture = null;
  lastRenderedRigHp = -1;

  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.convoy-game-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
  overflow: hidden;
  background: #111;
}

.webgl-canvas-mount {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.game-hud-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem;
}

.game-hud-overlay * {
  pointer-events: auto;
}

/* Central High-Impact Hit Marker */
.hud-hitmarker {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 60;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: hitmarkerPop 0.16s ease-out;
}

.hit-pip {
  position: absolute;
  width: 10px;
  height: 3px;
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444, 0 0 16px rgba(239, 68, 68, 0.8);
  border-radius: 2px;
}

.hit-pip.top-left {
  top: 6px;
  left: 6px;
  transform: rotate(45deg);
}

.hit-pip.top-right {
  top: 6px;
  right: 6px;
  transform: rotate(-45deg);
}

.hit-pip.bottom-left {
  bottom: 6px;
  left: 6px;
  transform: rotate(-45deg);
}

.hit-pip.bottom-right {
  bottom: 6px;
  right: 6px;
  transform: rotate(45deg);
}

.hit-damage-text {
  position: absolute;
  bottom: -22px;
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #f87171;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.9);
  pointer-events: none;
}

@keyframes hitmarkerPop {
  0% { transform: translate(-50%, -50%) scale(0.65); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0; }
}

/* Top Center Objective HUD */
.hud-top-bar {
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.75rem;
  min-width: 480px;
  background: rgba(13, 17, 26, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.hud-top-bar.mode-points {
  min-width: 640px;
  max-width: 780px;
  padding: 0.75rem 1.5rem;
}

/* Point Battle Mode Top HUD */
.point-battle-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1.25rem;
}

.team-score-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem 0.95rem;
  border-radius: var(--radius-sm);
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.25s ease;
}

.team-score-card.blue-team {
  border-left: 3px solid #38bdf8;
}

.team-score-card.blue-team.leading {
  background: rgba(30, 58, 138, 0.35);
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
}

.team-score-card.red-team {
  border-right: 3px solid #ef4444;
}

.team-score-card.red-team.leading {
  background: rgba(153, 27, 27, 0.35);
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.25);
}

.team-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.team-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.team-indicator.blue {
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

.team-indicator.red {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.team-title {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fff;
}

.car-count {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-left: auto;
}

.team-pts-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.pts-val {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
}

.blue-team .pts-val {
  color: #38bdf8;
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
}

.red-team .pts-val {
  color: #f87171;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.pts-target {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}

.score-progress-bar {
  height: 5px;
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  overflow: hidden;
}

.score-progress-fill.blue-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #38bdf8);
  box-shadow: 0 0 8px #38bdf8;
  transition: width 0.3s ease;
}

.score-progress-fill.red-fill {
  height: 100%;
  background: linear-gradient(90deg, #b91c1c, #ef4444);
  box-shadow: 0 0 8px #ef4444;
  transition: width 0.3s ease;
}

.match-info-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 150px;
}

.match-mode-label {
  font-family: var(--font-display);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.pulse-spark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 8px #fbbf24;
  animation: pulse-spark 1.2s infinite;
}

@keyframes pulse-spark {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.mode-toggle-group {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.2rem;
}

.btn-mode-pill {
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mode-pill:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.btn-mode-pill.active {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  color: #38bdf8;
}

.btn-theme-pill {
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.16);
  border: 1px solid rgba(52, 211, 153, 0.45);
  color: #6ee7b7;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-theme-pill:hover {
  background: rgba(16, 185, 129, 0.32);
  border-color: #34d399;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
}

.modal-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
  width: 100%;
}

.points-final-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin: 1.25rem 0;
}

.final-score-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  min-width: 140px;
}

.final-score-pill.blue {
  border-color: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.2);
}

.final-score-pill.blue .team-label,
.final-score-pill.blue .team-score-num {
  color: #38bdf8;
}

.final-score-pill.red {
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.2);
}

.final-score-pill.red .team-label,
.final-score-pill.red .team-score-num {
  color: #f87171;
}

.final-score-pill .team-label {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.team-score-num {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1;
}

.score-vs-divider {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 1.2rem;
  color: var(--text-muted);
}

.objective-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1.5rem;
}

.team-tag {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-sm);
}

.team-tag.convoy {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.team-tag.raiders {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.round-timer {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.05em;
}

.round-timer.warning {
  color: #f87171;
  animation: pulse-timer 1s infinite;
}

@keyframes pulse-timer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.rig-status-pill {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  display: flex;
  gap: 0.4rem;
}

.rig-status-pill .value {
  color: #38bdf8;
  font-weight: 800;
}

.destination-pointer-bar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
}

.dest-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
}

.pointer-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
  font-size: 1.1rem;
  font-weight: 900;
  transition: transform 0.1s ease-out;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
}

.dest-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 800;
  color: var(--text-muted);
}

.dest-dist {
  font-size: 0.95rem;
  font-weight: 900;
  color: #38bdf8;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.dest-progress-track {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: visible;
}

.dest-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #38bdf8);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
  transition: width 0.1s linear;
}

.dest-beacon-dot {
  position: absolute;
  right: 0;
  top: -6px;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: #38bdf8;
  background: #0f172a;
  border: 1px solid #38bdf8;
  padding: 1px 6px;
  border-radius: 4px;
  transform: translateY(-50%);
  text-shadow: 0 0 6px rgba(56, 189, 248, 0.9);
}

.dest-beacon-dot.reached {
  background: #16a34a;
  border-color: #4ade80;
  color: #ffffff;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.8);
}

.rig-health-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.rig-hit-flash {
  animation: hitPulse 0.35s ease;
}

@keyframes hitPulse {
  0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.9)); }
  50% { transform: scale(1.03); filter: drop-shadow(0 0 20px rgba(239, 68, 68, 1)); }
  100% { transform: scale(1); filter: none; }
}

.hit-badge-inline {
  background: #ef4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
  animation: badgePop 0.2s ease-out;
}

@keyframes badgePop {
  0% { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.rig-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-dim);
}

.rig-title {
  color: #fbbf24;
}

.rig-hp-text {
  font-family: var(--font-display);
}

.health-track {
  width: 100%;
  height: 12px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.health-track.heavy-armor {
  height: 16px;
  position: relative;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(251, 191, 36, 0.4);
  background: rgba(10, 14, 23, 0.85);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.7);
}

.armor-segments {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-evenly;
  pointer-events: none;
}

.segment-notch {
  width: 2px;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.1);
}

.health-track.sm {
  height: 8px;
}

.health-fill {
  height: 100%;
  transition: width 0.2s ease;
}

.health-fill.healthy {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.health-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.health-fill.critical {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

/* Bottom Left HUD */
.hud-bottom-left {
  position: absolute;
  bottom: 1.25rem;
  left: 1.25rem;
  padding: 1.1rem 1.4rem;
  width: 290px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.driver-profile {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vehicle-role-badge {
  font-family: var(--font-display);
  font-size: 0.725rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.vehicle-role-badge.rig {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.vehicle-role-badge.support {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.vehicle-role-badge.raider {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.driver-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
}

.health-track.player-track {
  height: 18px;
  background: rgba(10, 14, 23, 0.9);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  position: relative;
  overflow: hidden;
  margin-top: 0.35rem;
}

.player-hp-bar {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.player-hp-bar.damage-pulse {
  animation: hp-damage-shake 0.35s ease-out;
  border-color: #ef4444 !important;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.6) !important;
}

@keyframes hp-damage-shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

.hp-armor-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #e2e8f0;
}

.hp-numbers {
  font-family: var(--font-mono);
  font-weight: 800;
  font-size: 0.85rem;
}

.hp-numbers.healthy { color: #34d399; }
.hp-numbers.warning { color: #fbbf24; }
.hp-numbers.critical { color: #f87171; text-shadow: 0 0 8px rgba(239, 68, 68, 0.7); }

.hp-pct {
  font-size: 0.75rem;
  opacity: 0.85;
}

.health-track.player-track .health-fill.healthy {
  background: linear-gradient(90deg, #059669, #10b981, #34d399);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
}

.health-track.player-track .health-fill.warning {
  background: linear-gradient(90deg, #d97706, #f59e0b, #fbbf24);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
}

.health-track.player-track .health-fill.critical {
  background: linear-gradient(90deg, #dc2626, #ef4444, #f87171);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
  animation: critical-hp-pulse 0.9s infinite alternate;
}

@keyframes critical-hp-pulse {
  from { opacity: 0.8; filter: brightness(1); }
  to { opacity: 1; filter: brightness(1.35); }
}

.low-hp-warning-badge {
  margin-top: 0.4rem;
  font-size: 0.675rem;
  font-weight: 800;
  text-align: center;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 4px;
  padding: 0.25rem 0.4rem;
  animation: critical-hp-pulse 0.7s infinite alternate;
}

/* Screen-edge Damage Flash & Low Health Vignette */
.player-damage-flash {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 998;
  box-shadow: inset 0 0 80px 20px rgba(239, 68, 68, 0.55);
  animation: fade-out-flash 0.35s ease-out forwards;
}

@keyframes fade-out-flash {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.low-health-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 997;
  box-shadow: inset 0 0 100px 30px rgba(220, 38, 38, 0.45);
  animation: vignette-pulse 1.4s ease-in-out infinite alternate;
}

.low-health-vignette.intense {
  box-shadow: inset 0 0 140px 45px rgba(220, 38, 38, 0.7);
  animation: vignette-pulse 0.7s ease-in-out infinite alternate;
}

@keyframes vignette-pulse {
  from { opacity: 0.45; }
  to { opacity: 0.95; }
}

.hp-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-dim);
  margin-bottom: 0.25rem;
}

.vehicle-stats-row {
  display: flex;
  gap: 0.6rem;
}

.stat-box {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  padding: 0.45rem 0.55rem;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
}

.stat-lbl {
  font-size: 0.625rem;
  font-weight: 800;
  color: var(--text-dim);
}

.stat-val {
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
}

.stat-val.ready {
  color: #34d399;
}

.stat-val.disabled {
  color: #94a3b8;
  font-size: 0.75rem;
}

.stat-val.gold {
  color: #fbbf24;
}

/* Combat Buggy Lives Indicator in Dashboard */
.lives-indicator-box {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.45rem 0.65rem;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lives-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lives-pips {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.life-pip {
  font-size: 1.15rem;
  line-height: 1;
  color: #38bdf8;
  filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.7));
  transition: all 0.2s ease;
}

.life-pip.lost {
  color: #475569;
  filter: none;
  opacity: 0.4;
}

.lives-text {
  font-family: var(--font-display);
  font-size: 0.725rem;
  font-weight: 800;
  color: var(--text-muted);
}

.lives-text.eliminated {
  color: #ef4444;
  font-weight: 900;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.85);
}

/* Bottom Right Controls */
.hud-bottom-right {
  position: absolute;
  bottom: 1.25rem;
  right: 1.25rem;
  padding: 0.85rem 1.15rem;
}

.controls-guide {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.775rem;
}

.key-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted);
}

kbd {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 0.15rem 0.45rem;
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
}

/* Alert Banner */
.hud-alert-banner {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: var(--radius-full);
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

/* Role Selector Modal */
.hud-role-selector {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 860px;
  padding: 2.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(13, 17, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.role-selector-header {
  text-align: center;
  margin-bottom: 2rem;
}

.role-selector-header h2 {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.role-selector-header p {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  width: 100%;
}

.roles-grid.two-cols {
  grid-template-columns: repeat(2, 1fr);
  max-width: 680px;
  margin: 0 auto;
}

.role-card {
  background: rgba(22, 28, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(30, 41, 59, 0.8);
}

.role-card.active {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.15);
  box-shadow: 0 0 20px -4px var(--primary-glow);
}

.role-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.role-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  margin-bottom: 0.85rem;
}

.raider-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.role-icon-box {
  width: 60px;
  height: 60px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 0.85rem;
  color: #bfdbfe;
  margin-bottom: 1rem;
}

.raider-box {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.role-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 0.4rem;
}

.role-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 1.25rem;
  flex: 1;
}

.role-meta {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 0.725rem;
  font-weight: 800;
  color: var(--text-dim);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.75rem;
  margin-bottom: 1.25rem;
}

.start-game-row {
  margin-top: 2rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

.btn-large {
  padding: 1rem 3rem;
  font-size: 1.15rem;
}

/* Respawn and Round Overlays */
.respawn-modal,
.round-end-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 2.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: rgba(13, 17, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
}

.respawn-modal.eliminated {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 20px 50px rgba(239, 68, 68, 0.3);
}

.eliminated-skull {
  font-size: 2.8rem;
  line-height: 1;
  color: #ef4444;
  text-shadow: 0 0 18px rgba(239, 68, 68, 0.85);
}

.eliminated-text {
  color: #fca5a5;
  font-size: 0.95rem;
  max-width: 400px;
  line-height: 1.5;
}

.spectate-badge {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  padding: 0.4rem 1.1rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #94a3b8;
}

.lives-remaining-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
}

.lives-remaining-banner .banner-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #93c5fd;
}

.lives-remaining-banner .banner-count {
  font-size: 0.95rem;
  font-weight: 900;
  color: #38bdf8;
}

.victory-subtitle {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--text-dim);
}

.text-convoy {
  color: #60a5fa;
  font-size: 2.6rem;
  font-weight: 900;
}

.text-raider {
  color: #f87171;
  font-size: 2.6rem;
  font-weight: 900;
}

.summary-text {
  color: var(--text-muted);
  max-width: 440px;
  line-height: 1.5;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  border: none;
  padding: 0.75rem 1rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: #b91c1c;
}

.full-width {
  width: 100%;
}

/* Nitro Boost Button and Dashboard Widget */
.boost-widget {
  width: 100%;
  margin-top: -0.25rem;
}

.btn-boost {
  width: 100%;
  position: relative;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #94a3b8;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.btn-boost.ready {
  border-color: #38bdf8;
  color: #38bdf8;
  background: rgba(14, 165, 233, 0.15);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.35);
  animation: boostGlow 1.8s infinite alternate;
}

@keyframes boostGlow {
  0% { box-shadow: 0 0 8px rgba(56, 189, 248, 0.2); }
  100% { box-shadow: 0 0 22px rgba(56, 189, 248, 0.6); }
}

.btn-boost.active {
  border-color: #f97316;
  color: #fff;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.75), rgba(234, 88, 12, 0.95));
  box-shadow: 0 0 25px rgba(249, 115, 22, 0.8);
  animation: boostBurn 0.18s infinite alternate;
}

@keyframes boostBurn {
  0% { transform: scale(1); filter: brightness(1.1); }
  100% { transform: scale(1.02); filter: brightness(1.35); }
}

.btn-boost:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.boost-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  z-index: 2;
}

.boost-hotkey {
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.65rem;
  color: #fff;
}

.boost-recharge-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
  transition: width 0.1s linear;
  z-index: 1;
}

/* Weapon Arsenal Selector Box */
.weapon-arsenal-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.55rem;
}

.weapon-arsenal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.wep-hint {
  font-size: 0.58rem;
  color: #64748b;
  letter-spacing: 0.04em;
}

.weapon-selector-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.btn-weapon-pill {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.35rem 0.2rem;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(100, 116, 139, 0.35);
  border-radius: 4px;
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.btn-weapon-pill:hover {
  background: rgba(51, 65, 85, 0.95);
  border-color: rgba(56, 189, 248, 0.5);
  color: #f8fafc;
}

.btn-weapon-pill.active {
  background: rgba(14, 165, 233, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
}

.btn-weapon-pill.active .wep-key {
  background: #38bdf8;
  color: #0f172a;
}

.wep-key {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 800;
  padding: 0.05rem 0.3rem;
  background: rgba(15, 23, 42, 0.85);
  border-radius: 2px;
  color: #94a3b8;
  transition: all 0.15s ease;
}

.wep-name {
  font-family: var(--font-display);
  font-size: 0.62rem;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.wep-cd-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  font-weight: 800;
  padding: 0.05rem 0.25rem;
  border-radius: 8px;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
  animation: pulse 1s infinite alternate;
}

/* 1.1 Tactical Minimap Radar HUD */
.hud-top-right.radar-card {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 172px;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  padding: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(56, 189, 248, 0.1);
  z-index: 45;
  pointer-events: auto;
}

.radar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.25rem;
}

.radar-title-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.radar-live-blip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
  animation: radarBlipPulse 1.2s infinite ease-in-out;
}

@keyframes radarBlipPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}

.radar-title {
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #38bdf8;
}

.radar-scale {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  font-weight: 700;
  color: #64748b;
}

.radar-screen {
  width: 100%;
  height: 200px;
  background: radial-gradient(circle at center, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.95) 85%);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
}

.radar-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.radar-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.52rem;
  color: #94a3b8;
  padding-top: 0.2rem;
}

.legend-blip {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}

.pip.blue { background: #38bdf8; box-shadow: 0 0 4px #38bdf8; }
.pip.red { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
.pip.cyan { background: #00f2fe; box-shadow: 0 0 4px #00f2fe; }
.pip.gold { background: #fbbf24; box-shadow: 0 0 4px #fbbf24; }

/* 1.4 Floating Combat Damage Numbers */
.floating-damage-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 55;
  overflow: hidden;
}

.floating-damage-number {
  position: absolute;
  font-family: var(--font-display, sans-serif);
  font-size: 1.15rem;
  font-weight: 900;
  color: #f87171;
  text-shadow: 0 0 6px rgba(239, 68, 68, 0.9), 0 2px 4px rgba(0, 0, 0, 0.85);
  transform: translate(-50%, -100%);
  letter-spacing: 0.04em;
  pointer-events: none;
  white-space: nowrap;
  user-select: none;
}

.floating-damage-number.crit {
  font-size: 1.45rem;
  color: #fbbf24;
  text-shadow: 0 0 10px rgba(245, 158, 11, 0.95), 0 0 20px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0, 0, 0, 0.9);
  animation: critFlash 0.3s ease-out;
}

@keyframes critFlash {
  0% { transform: translate(-50%, -100%) scale(1.6); }
  50% { transform: translate(-50%, -100%) scale(1.1); }
  100% { transform: translate(-50%, -100%) scale(1.35); }
}
</style>
