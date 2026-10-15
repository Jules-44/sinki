<template>
  <div class="app-layout">
    <!-- Top Navigation Header -->
    <header class="app-header">
      <div class="brand">
        <span class="brand-title">SINKI</span>
        <span class="brand-sub">LOUNGE</span>
      </div>

      <!-- In Room Status & Controls -->
      <div v-if="platformState.isConnected" class="room-nav-controls">
        <div class="room-code-badge" @click="copyRoomCode" title="Click to copy code">
          <span class="code-label">ROOM:</span>
          <span class="code-val">{{ platformState.roomCode }}</span>
        </div>

        <!-- Prominent Stack & Floating Delta without emoji -->
        <div v-if="myChips !== null" class="chips-display-badge">
          <span class="chip-label">STACK:</span>
          <span class="chip-amount">{{ myChips.toLocaleString() }}</span>
          <transition name="chip-pop">
            <span v-if="chipDelta !== null" :class="['chip-delta-pill', chipDelta >= 0 ? 'pos' : 'neg']">
              {{ chipDelta >= 0 ? `+${chipDelta}` : chipDelta }}
            </span>
          </transition>
        </div>

        <div class="user-pill">
          <span class="online-indicator"></span>
          {{ platformState.myNickname }}
        </div>

        <button class="btn-secondary btn-sm" @click="leaveRoom">
          Leave Room
        </button>
      </div>

      <!-- Out of room profile info -->
      <div v-else class="header-right">
        <div class="user-pill">
          {{ platformState.myNickname }}
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="app-main">
      <template v-if="!platformState.isConnected">
        <Lobby />
      </template>

      <template v-else>
        <div :class="['room-grid', { 'convoy-mode': platformState.gameId === 'convoy-raid' }]">
          <div class="table-column">
            <ConvoyGame v-if="platformState.gameId === 'convoy-raid'" />
            <SeatLayout v-else />
          </div>
          <div class="chat-column">
            <ChatBox />
          </div>
        </div>
      </template>
    </main>

    <!-- Copy Toast Notification -->
    <div v-if="toastMessage" class="toast-popup">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { platformState, leaveRoom } from './colyseus.js';
import Lobby from './components/Lobby.vue';
import SeatLayout from './components/SeatLayout.vue';
import ConvoyGame from './components/ConvoyGame.vue';
import ChatBox from './components/ChatBox.vue';

const toastMessage = ref<string | null>(null);

const mySeat = computed(() => {
  return platformState.seats.find((s) => s.playerId === platformState.mySessionId);
});

const myChips = computed(() => {
  return mySeat.value ? mySeat.value.chips : null;
});

const chipDelta = ref<number | null>(null);

watch(myChips, (newVal, oldVal) => {
  if (oldVal !== undefined && newVal !== undefined && oldVal !== null && newVal !== null && newVal !== oldVal) {
    chipDelta.value = newVal - oldVal;
    setTimeout(() => {
      chipDelta.value = null;
    }, 2500);
  }
});

function copyRoomCode() {
  const code = platformState.roomCode;
  const url = `${window.location.origin}?room=${code}`;
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Room code ${code} copied!`);
  }).catch(() => {
    showToast(`Code: ${code}`);
  });
}

function showToast(msg: string) {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = null;
  }, 2500);
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  height: 64px;
  background: rgba(11, 15, 23, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.brand-logo {
  font-size: 1.5rem;
}

.brand-title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 1.3rem;
  letter-spacing: -0.02em;
  color: #fff;
}

.brand-sub {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.75rem;
  color: #818cf8;
  letter-spacing: 0.15em;
  margin-top: 2px;
}

.room-nav-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.room-code-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.room-code-badge:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
}

.code-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #a5b4fc;
}

.code-val {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  color: #fff;
}

.copy-icon {
  font-size: 0.85rem;
}

.chips-display-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
  box-shadow: 0 0 16px -4px rgba(251, 191, 36, 0.25);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-sm);
  position: relative;
}

.chip-coin {
  font-size: 1rem;
}

.chip-label {
  font-size: 0.675rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--accent-gold);
}

.chip-amount {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.05rem;
  color: #fff;
  letter-spacing: 0.02em;
}

.chip-delta-pill {
  position: absolute;
  top: -14px;
  right: -8px;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.chip-delta-pill.pos {
  background: var(--accent-emerald);
  color: #000;
}

.chip-delta-pill.neg {
  background: var(--accent-rose);
  color: #fff;
}

.chip-pop-enter-active {
  animation: chipPopIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chip-pop-leave-active {
  animation: chipPopOut 0.4s ease-in forwards;
}

@keyframes chipPopIn {
  from { opacity: 0; transform: translateY(8px) scale(0.6); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes chipPopOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-12px); }
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.online-indicator {
  width: 7px;
  height: 7px;
  background: var(--accent-emerald);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent-emerald);
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.room-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1rem;
  height: calc(100vh - 64px);
  padding: 1rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.room-grid.convoy-mode {
  max-width: 100%;
  padding: 0;
  gap: 0;
  grid-template-columns: 1fr 340px;
}

@media (max-width: 900px) {
  .room-grid.convoy-mode {
    grid-template-columns: 1fr;
  }
}

.table-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toast-popup {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  border: 1px solid #475569;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
  font-size: 0.9rem;
  font-weight: 600;
  z-index: 1000;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
