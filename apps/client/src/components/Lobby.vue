<template>
  <div class="lobby-container">
    <div class="lobby-grid">
      <!-- Left Column: Room Setup & Game Launch -->
      <div class="lobby-main-col">
        <div class="hero-section">
          <div class="brand-badge">
            <span class="pulse-dot"></span>
            REALTIME MULTIPLAYER META-PLATFORM
          </div>
          <h1 class="hero-title">
            Play Together <span class="gradient-text">Anywhere</span>
          </h1>
          <p class="hero-subtitle">
            Jump straight into authoritative, real-time multiplayer games. No accounts required — just grab a seat and share the code.
          </p>
        </div>

        <div class="glass-panel lobby-card">
          <!-- Player Nickname -->
          <div class="form-group">
            <label for="nickname-input" class="form-label">Your Nickname</label>
            <div class="input-wrapper">
              <input
                id="nickname-input"
                v-model="nickname"
                type="text"
                maxlength="16"
                placeholder="Enter nickname..."
                class="input-field"
                @change="saveNickname"
              />
              <button class="btn-dice" title="Randomize name" @click="randomizeNickname">Reroll</button>
            </div>
          </div>

          <!-- Quick Join with Code (Compact Bar) -->
          <div class="quick-join-card">
            <label for="room-code-input" class="form-label">Join with Room Code</label>
            <div class="quick-join-bar">
              <input
                id="room-code-input"
                v-model="roomCodeInput"
                type="text"
                placeholder="Enter 4-letter code or paste link..."
                class="input-field quick-code-input"
                autocomplete="off"
                spellcheck="false"
                @paste="handlePasteCode"
                @input="handleInputCode"
                @keyup.enter="handleJoin"
              />
              <button
                class="btn-primary quick-join-btn"
                :disabled="platformState.isConnecting || !roomCodeInput.trim() || !nickname.trim()"
                @click="handleJoin"
              >
                Join Table
              </button>
            </div>
          </div>

          <div class="lobby-divider">
            <span class="divider-line"></span>
            <span class="divider-text">OR CREATE A TABLE</span>
            <span class="divider-line"></span>
          </div>

          <!-- Create Table Section -->
          <div class="create-section">
            <label class="form-label">Select Game</label>
            <div class="game-select-grid">
              <div
                v-for="game in availableGames"
                :key="game.id"
                :class="['game-choice-card', { selected: selectedGame === game.id }]"
                @click="selectedGame = game.id"
              >
                <div class="game-tag-badge">{{ game.tag }}</div>
                <div class="game-info">
                  <div class="game-name">{{ game.name }}</div>
                  <div class="game-desc">{{ game.desc }}</div>
                </div>
                <div class="game-badge">{{ game.badge }}</div>
              </div>
            </div>

            <button
              class="btn-primary full-width"
              :disabled="platformState.isConnecting || !nickname.trim()"
              @click="handleCreate"
            >
              <span v-if="platformState.isConnecting">Creating Lounge...</span>
              <span v-else>Launch Room</span>
            </button>
          </div>

          <div v-if="platformState.error" class="error-banner">
            {{ platformState.error }}
          </div>
        </div>
      </div>

      <!-- Right Column: Lounge Waiting Area Commons (Combined Chat & Presence) -->
      <div class="lobby-side-col">
        <div class="glass-panel lounge-commons-panel">
          <div class="commons-header">
            <div class="commons-title">
              <span class="commons-dot"></span>
              <span>Lounge Commons</span>
            </div>
            <div class="commons-count">
              {{ loungeState.users.length }} Online
            </div>
          </div>

          <!-- Online Players Strip -->
          <div class="online-players-strip">
            <div class="strip-label">HANGING OUT IN LOUNGE:</div>
            <div class="strip-avatars">
              <div
                v-for="u in loungeState.users"
                :key="u.sessionId"
                class="user-tag"
                :title="u.currentRoom ? `In Room ${u.currentRoom}` : 'In Waiting Area'"
              >
                <span class="user-tag-avatar">{{ getInitials(u.nickname) }}</span>
                <span class="user-tag-name">{{ u.nickname }}</span>
                <span v-if="u.currentRoom" class="user-tag-badge">Table {{ u.currentRoom }}</span>
              </div>
            </div>
          </div>

          <!-- Lounge Chat Messages Area -->
          <div ref="chatContainer" class="commons-chat-messages">
            <div
              v-for="msg in loungeState.chat"
              :key="msg.id"
              :class="['commons-msg-row', { system: msg.system }]"
            >
              <template v-if="msg.system">
                <span class="system-chip">{{ msg.text }}</span>
              </template>
              <template v-else>
                <div class="msg-bubble">
                  <div class="msg-meta">
                    <span class="msg-author">{{ msg.senderName }}</span>
                    <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                  <div class="msg-text">
                    <template v-for="(token, tIdx) in parseChatMessage(msg.text)" :key="tIdx">
                      <button
                        v-if="token.type === 'room' && token.roomCode"
                        class="chat-room-badge-btn"
                        :title="`Click to join room ${token.roomCode}`"
                        @click="handleJoinCode(token.roomCode)"
                      >
                        [{{ token.content }}]
                      </button>
                      <span v-else>{{ token.content }}</span>
                    </template>
                  </div>
                </div>
              </template>
            </div>

            <div v-if="loungeState.chat.length === 0" class="empty-commons">
              Welcome to the Lounge Waiting Area. Chat with other players while waiting for a game.
            </div>
          </div>

          <!-- Lounge Chat Input -->
          <form class="commons-input-form" @submit.prevent="handleSendLoungeChat">
            <input
              v-model="loungeChatInput"
              type="text"
              placeholder="Chat in the Lounge waiting area..."
              maxlength="200"
              class="input-field commons-input"
            />
            <button
              type="submit"
              class="btn-primary commons-send-btn"
              :disabled="!loungeChatInput.trim()"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import {
  platformState,
  loungeState,
  setNickname,
  createRoom,
  joinRoom,
  connectLounge,
  sendLoungeChat,
} from '../colyseus.js';
import { parseChatMessage, extractRoomCode } from '../utils/chat-tokens.js';

const nickname = ref(platformState.myNickname);
const roomCodeInput = ref('');
const selectedGame = ref('convoy-raid');
const loungeChatInput = ref('');
const chatContainer = ref<HTMLElement | null>(null);

function handleJoinCode(code: string) {
  saveNickname();
  joinRoom(code);
}

function handlePasteCode(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') || '';
  const extracted = extractRoomCode(text);
  if (extracted) {
    e.preventDefault();
    roomCodeInput.value = extracted;
  }
}

function handleInputCode(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  const extracted = extractRoomCode(val);
  if (extracted && val.length > 4) {
    roomCodeInput.value = extracted;
  }
}

onMounted(() => {
  connectLounge();
  // Auto-detect room code from URL query parameter (?room=CODE)
  try {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const code = extractRoomCode(roomParam);
      if (code) {
        roomCodeInput.value = code;
      }
    }
  } catch (e) {
    // ignore
  }
});

const availableGames = [
  {
    id: 'convoy-raid',
    name: 'Battle Cars (3D Wasteland)',
    tag: '3D COMBAT',
    desc: 'Two teams of battle cars playing for points! Twin autocannons, nitro boost, scrap salvage, or toggle Big Rig escort mode.',
    badge: 'Playable Now',
  },
  {
    id: 'lucky-draw',
    name: 'Lucky Draw (Hi-Lo)',
    tag: 'HI-LO',
    desc: 'Turn-based spike: secret hole card vs community card. Validates hidden state views.',
    badge: 'Playable Now',
  },
  {
    id: 'texas-holdem',
    name: "Texas Hold'em Poker",
    tag: 'POKER',
    desc: 'Up to 10 players, side pots, dealer button, turn timers, and showdowns.',
    badge: 'Planned',
  },
];

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s_]+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function saveNickname() {
  if (nickname.value.trim()) {
    setNickname(nickname.value);
  }
}

function randomizeNickname() {
  const adjectives = ['Cyber', 'Cosmic', 'Swift', 'Lucky', 'Pixel', 'Neon', 'Shadow', 'Ace'];
  const nouns = ['Fox', 'Falcon', 'Viper', 'Knight', 'Panda', 'Drifter', 'Rider', 'Wizard'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  nickname.value = `${adj}${noun}${num}`;
  saveNickname();
}

function handleCreate() {
  saveNickname();
  createRoom(selectedGame.value);
}

function handleJoin() {
  saveNickname();
  const code = extractRoomCode(roomCodeInput.value) || roomCodeInput.value.trim().toUpperCase();
  if (code) {
    roomCodeInput.value = code;
    joinRoom(code);
  }
}

function handleSendLoungeChat() {
  if (loungeChatInput.value.trim()) {
    sendLoungeChat(loungeChatInput.value);
    loungeChatInput.value = '';
    scrollToBottom();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

watch(() => loungeState.chat.length, scrollToBottom);
</script>

<style scoped>
.lobby-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 2rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.lobby-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2.5rem;
  width: 100%;
  align-items: start;
}

@media (max-width: 1024px) {
  .lobby-grid {
    grid-template-columns: 1fr;
  }
}

.lobby-main-col {
  display: flex;
  flex-direction: column;
}

.hero-section {
  margin-bottom: 2rem;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  margin-bottom: 1rem;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-emerald);
  box-shadow: 0 0 8px var(--accent-emerald);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.hero-title {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 0.75rem;
}

.gradient-text {
  background: linear-gradient(135deg, #a5b4fc 0%, #38bdf8 50%, #34d399 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.05rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.lobby-card {
  padding: 2.25rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.input-wrapper {
  display: flex;
  gap: 0.5rem;
}

.input-wrapper input {
  flex: 1;
}

.btn-dice {
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1.25rem;
  padding: 0 0.85rem;
}

.btn-dice:hover {
  background: #1f2738;
}

.quick-join-card {
  margin-bottom: 1.25rem;
  background: rgba(14, 19, 28, 0.6);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
}

.quick-join-bar {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.quick-code-input {
  flex: 1;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.6rem 0.85rem;
}

.quick-join-btn {
  padding: 0.6rem 1.25rem;
  font-size: 0.85rem;
}

.lobby-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0 1rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.divider-text {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}

.chat-room-badge-btn {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.45);
  color: #a5b4fc;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-sm);
  margin: 0 0.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-room-badge-btn:hover {
  background: rgba(99, 102, 241, 0.35);
  border-color: var(--primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--primary-glow);
}

.game-select-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.game-choice-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.game-choice-card:hover {
  border-color: rgba(99, 102, 241, 0.4);
  background: #131824;
}

.game-choice-card.selected {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 0 0 16px -4px var(--primary-glow);
}

.game-tag-badge {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: #a5b4fc;
  width: 52px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-sm);
}

.game-info {
  flex: 1;
}

.game-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
  margin-bottom: 0.2rem;
}

.game-desc {
  font-size: 0.775rem;
  color: var(--text-dim);
  line-height: 1.3;
}

.game-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
}

.room-code-input {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  text-transform: uppercase;
}

.full-width {
  width: 100%;
  justify-content: center;
  padding: 0.9rem;
  font-size: 1.05rem;
}

.error-banner {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #fca5a5;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  text-align: center;
}

/* Right Column: Lounge Commons Panel */
.lobby-side-col {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.lounge-commons-panel {
  display: flex;
  flex-direction: column;
  height: 620px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: rgba(13, 17, 26, 0.8);
}

.commons-header {
  padding: 1.15rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(10, 13, 20, 0.5);
}

.commons-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
}

.commons-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-emerald);
  box-shadow: 0 0 8px var(--accent-emerald);
}

.commons-count {
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.online-players-strip {
  padding: 0.75rem 1.25rem;
  background: rgba(8, 11, 18, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.strip-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin-bottom: 0.45rem;
}

.strip-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  max-height: 72px;
  overflow-y: auto;
}

.user-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(22, 28, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.user-tag-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #334155;
  color: #fff;
  font-size: 0.55rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-tag-name {
  font-weight: 600;
  color: #e2e8f0;
}

.user-tag-badge {
  font-size: 0.65rem;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 700;
}

.commons-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.commons-msg-row {
  display: flex;
  flex-direction: column;
}

.commons-msg-row.system {
  align-items: center;
}

.system-chip {
  font-size: 0.75rem;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
}

.msg-bubble {
  background: rgba(20, 26, 38, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  max-width: 90%;
  align-self: flex-start;
}

.msg-meta {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.msg-author {
  font-weight: 700;
  font-size: 0.8rem;
  color: #818cf8;
}

.msg-time {
  font-size: 0.65rem;
  color: var(--text-dim);
}

.msg-text {
  font-size: 0.875rem;
  color: var(--text-main);
  line-height: 1.4;
  word-break: break-word;
}

.empty-commons {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.85rem;
  margin: auto 0;
  line-height: 1.5;
  padding: 1rem;
}

.commons-input-form {
  display: flex;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: rgba(10, 13, 20, 0.5);
  border-top: 1px solid var(--border-subtle);
}

.commons-input {
  flex: 1;
  font-size: 0.875rem;
  padding: 0.65rem 0.85rem;
}

.commons-send-btn {
  padding: 0.65rem 1.15rem;
  font-size: 0.875rem;
}
</style>
