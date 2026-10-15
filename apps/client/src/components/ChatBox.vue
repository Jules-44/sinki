<template>
  <div class="chat-container glass-panel">
    <!-- Header with Tab Switcher -->
    <div class="chat-header">
      <div class="chat-tabs">
        <button
          :class="['chat-tab-btn', { active: activeTab === 'table' }]"
          @click="activeTab = 'table'"
        >
          <span>Table</span>
          <span class="tab-badge">{{ platformState.chat.length }}</span>
        </button>
        <button
          :class="['chat-tab-btn', { active: activeTab === 'lounge' }]"
          @click="activeTab = 'lounge'"
        >
          <span>Lounge</span>
          <span class="tab-badge">{{ loungeState.chat.length }}</span>
        </button>
      </div>

      <button
        v-if="platformState.roomCode"
        class="btn-share-room"
        title="Post invite code to Lounge chat"
        @click="shareTableToLounge"
      >
        Share Table
      </button>
    </div>

    <!-- Messages List -->
    <div ref="messagesContainer" class="messages-list">
      <!-- Active: Table Chat -->
      <template v-if="activeTab === 'table'">
        <div
          v-for="msg in platformState.chat"
          :key="msg.id"
          :class="['message-item', { system: msg.system }]"
        >
          <template v-if="msg.system">
            <div class="system-text">{{ msg.text }}</div>
          </template>
          <template v-else>
            <div class="message-meta">
              <span class="sender-name">{{ msg.senderName }}</span>
              <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="message-body">
              <template v-for="(token, tIdx) in parseChatMessage(msg.text)" :key="tIdx">
                <button
                  v-if="token.type === 'room' && token.roomCode"
                  class="chat-room-badge-btn"
                  :title="`Click to switch to Room ${token.roomCode}`"
                  @click="joinRoom(token.roomCode)"
                >
                  [{{ token.content }}]
                </button>
                <span v-else>{{ token.content }}</span>
              </template>
            </div>
          </template>
        </div>

        <div v-if="platformState.chat.length === 0" class="empty-chat">
          No table messages yet. Chat with players seated at your table.
        </div>
      </template>

      <!-- Active: Lounge Commons Chat -->
      <template v-else>
        <div
          v-for="msg in loungeState.chat"
          :key="msg.id"
          :class="['message-item', { system: msg.system }]"
        >
          <template v-if="msg.system">
            <div class="system-text">{{ msg.text }}</div>
          </template>
          <template v-else>
            <div class="message-meta">
              <span class="sender-name lounge-author">{{ msg.senderName }}</span>
              <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="message-body lounge-bubble">
              <template v-for="(token, tIdx) in parseChatMessage(msg.text)" :key="tIdx">
                <button
                  v-if="token.type === 'room' && token.roomCode"
                  class="chat-room-badge-btn"
                  :title="`Click to switch to Room ${token.roomCode}`"
                  @click="joinRoom(token.roomCode)"
                >
                  [{{ token.content }}]
                </button>
                <span v-else>{{ token.content }}</span>
              </template>
            </div>
          </template>
        </div>

        <div v-if="loungeState.chat.length === 0" class="empty-chat">
          No lounge messages yet. Broadcast to all players in the lounge.
        </div>
      </template>
    </div>

    <!-- Chat Input Form -->
    <form class="chat-input-bar" @submit.prevent="handleSend">
      <input
        v-model="inputMsg"
        type="text"
        :placeholder="activeTab === 'table' ? 'Message your table...' : 'Message the whole lounge...'"
        maxlength="200"
        class="input-field chat-input"
      />
      <button type="submit" class="btn-primary btn-send" :disabled="!inputMsg.trim()">
        Send
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { platformState, loungeState, sendChat, sendLoungeChat, joinRoom } from '../colyseus.js';
import { parseChatMessage } from '../utils/chat-tokens.js';

const activeTab = ref<'table' | 'lounge'>('table');
const inputMsg = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function handleSend() {
  if (!inputMsg.value.trim()) return;

  if (activeTab.value === 'table') {
    sendChat(inputMsg.value);
  } else {
    sendLoungeChat(inputMsg.value);
  }

  inputMsg.value = '';
  scrollToBottom();
}

function shareTableToLounge() {
  if (!platformState.roomCode) return;
  sendLoungeChat(`Join my table: ${platformState.roomCode}`);
  activeTab.value = 'lounge';
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(() => platformState.chat.length, () => {
  if (activeTab.value === 'table') scrollToBottom();
});

watch(() => loungeState.chat.length, () => {
  if (activeTab.value === 'lounge') scrollToBottom();
});

watch(activeTab, () => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(14, 18, 26, 0.75);
}

.chat-header {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(10, 13, 20, 0.5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.btn-share-room {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
  font-size: 0.725rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-share-room:hover {
  background: rgba(99, 102, 241, 0.3);
  color: #fff;
  border-color: var(--primary);
  transform: translateY(-1px);
}

.chat-tabs {
  display: flex;
  background: rgba(16, 22, 34, 0.6);
  padding: 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.chat-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.45rem 0.65rem;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.8rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.chat-tab-btn.active {
  background: var(--bg-surface-elevated);
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.tab-badge {
  font-size: 0.65rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-full);
  color: var(--text-dim);
}

.chat-tab-btn.active .tab-badge {
  background: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message-item {
  display: flex;
  flex-direction: column;
}

.message-item.system {
  align-items: center;
}

.system-text {
  font-size: 0.75rem;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
}

.message-meta {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.sender-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #a5b4fc;
}

.lounge-author {
  color: #38bdf8;
}

.timestamp {
  font-size: 0.675rem;
  color: var(--text-dim);
}

.message-body {
  font-size: 0.875rem;
  color: var(--text-main);
  background: rgba(22, 28, 40, 0.6);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.04);
  word-break: break-word;
}

.lounge-bubble {
  background: rgba(14, 28, 42, 0.6);
  border-color: rgba(56, 189, 248, 0.15);
}

.empty-chat {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-top: 2rem;
  line-height: 1.5;
  padding: 0.5rem;
}

.chat-input-bar {
  display: flex;
  padding: 0.75rem;
  gap: 0.5rem;
  border-top: 1px solid var(--border-subtle);
  background: rgba(10, 13, 20, 0.4);
}

.chat-input {
  flex: 1;
  font-size: 0.875rem;
  padding: 0.55rem 0.75rem;
}

.btn-send {
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
}

.chat-room-badge-btn {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  background: rgba(99, 102, 241, 0.25);
  border: 1px solid rgba(99, 102, 241, 0.5);
  color: #a5b4fc;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  margin: 0 0.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-room-badge-btn:hover {
  background: rgba(99, 102, 241, 0.45);
  border-color: var(--primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--primary-glow);
}
</style>
