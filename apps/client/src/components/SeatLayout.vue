<template>
  <div class="table-arena">
    <!-- Felt Poker / Card Table -->
    <div class="poker-table">
      <div class="felt-surface">
        <!-- Table Rim Accent -->
        <div class="felt-line"></div>

        <!-- Center Area -->
        <div class="table-center">
          <!-- Game Status or Community Cards -->
          <div v-if="platformState.gameStatus === 'lobby'" class="lobby-banner">
            <div class="status-badge">WAITING ROOM</div>
            <h3 class="banner-title">Choose a Seat to Play</h3>
            <p class="banner-sub">
              {{ seatedCount }} / {{ platformState.seats.length }} seated
              • Need at least 1 player to start
            </p>

            <button
              v-if="isHost"
              class="btn-primary start-btn"
              :disabled="seatedCount < 1"
              @click="startGame"
            >
              Start Game
            </button>
            <div v-else-if="mySeatIndex !== -1" class="wait-note">
              Waiting for room host to start...
            </div>
            <div v-else class="wait-note">
              Click an open seat (+ Sit) to join!
            </div>
          </div>

          <!-- Active Game Community Area (Lucky Draw Spike) -->
          <div v-else-if="gameView" class="game-center">
            <div class="round-indicator">
              Round {{ gameView.round }} •
              <span class="phase-name">{{ gameView.phase === 'betting' ? 'Make Your Guess' : 'Showdown Results' }}</span>
            </div>

            <!-- Dealer / Community Card -->
            <div class="dealer-box">
              <span class="card-label">Community Target</span>
              <PlayingCard :card="gameView.dealerCard" size="lg" :isHighlighted="true" />
            </div>

            <!-- Upgraded Next Deal Action Panel -->
            <div v-if="gameView.phase === 'revealed'" class="next-deal-panel">
              <div class="deal-status-badge">
                SHOWDOWN COMPLETE
              </div>
              <button
                class="btn-deal-hand"
                @click="handleNextRound"
              >
                <span class="deal-label">Deal Next Hand</span>
                <span v-if="autoDealTimer > 0" class="auto-timer-pill">
                  {{ autoDealTimer }}s
                </span>
              </button>
              <div class="deal-subtext">
                Click to deal instantly or auto-deals in {{ autoDealTimer }}s
              </div>
            </div>
          </div>
        </div>

        <!-- 10 Seats Around the Perimeter -->
        <div
          v-for="seat in platformState.seats"
          :key="seat.seatIndex"
          :class="[
            'seat-pod',
            `seat-${seat.seatIndex}`,
            {
              occupied: seat.occupied,
              'my-seat': seat.seatIndex === mySeatIndex,
              ready: seat.isReady
            }
          ]"
        >
          <!-- Occupied Seat -->
          <template v-if="seat.occupied">
            <div class="seat-avatar">
              <div class="avatar-circle">
                {{ getInitials(seat.nickname) }}
              </div>
              <div v-if="seat.seatIndex === mySeatIndex" class="you-indicator">YOU</div>
              <div v-if="seat.playerId === platformState.hostPlayerId" class="host-badge" title="Room Host">HOST</div>

              <!-- Floating Chip Gain/Loss Tag on Seat -->
              <transition name="chip-float">
                <div
                  v-if="seatDeltaMap[seat.playerId]"
                  :class="['floating-seat-delta', seatDeltaMap[seat.playerId] > 0 ? 'gain' : 'loss']"
                >
                  {{ seatDeltaMap[seat.playerId] > 0 ? `+${seatDeltaMap[seat.playerId]}` : seatDeltaMap[seat.playerId] }}
                </div>
              </transition>
            </div>

            <div class="seat-info">
              <div class="seat-name">{{ seat.nickname }}</div>
              <div class="chips-pill">{{ seat.chips.toLocaleString() }}</div>
            </div>

            <!-- Player's Card in game -->
            <div v-if="platformState.gameStatus === 'in_progress' && gameView?.playerCards" class="seat-card-slot">
              <PlayingCard
                :card="gameView.playerCards[seat.playerId]"
                size="sm"
              />
              <div v-if="gameView.guesses?.[seat.playerId]" class="guess-tag">
                {{ gameView.guesses[seat.playerId] === 'higher' ? 'HIGH' : 'LOW' }}
              </div>
            </div>

            <button
              v-if="seat.seatIndex === mySeatIndex && platformState.gameStatus === 'lobby'"
              class="btn-leave-seat"
              title="Stand up"
              @click="leaveSeat"
            >
              Stand Up
            </button>
          </template>

          <!-- Empty Seat -->
          <template v-else>
            <button
              class="empty-seat-btn"
              :disabled="mySeatIndex !== -1"
              @click="takeSeat(seat.seatIndex)"
            >
              <span class="seat-num">Seat {{ seat.seatIndex + 1 }}</span>
              <span class="plus-icon">+ Sit</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Player Action Tray (Bottom Dock) -->
    <div class="action-dock glass-panel">
      <!-- Seated & In Game: Game Controls -->
      <div v-if="mySeatIndex !== -1 && platformState.gameStatus === 'in_progress'" class="player-turn-actions">
        <!-- Prominent Chip Dashboard Bar in Dock -->
        <div class="dock-bankroll-bar">
          <div class="bankroll-stack">
            <span class="bankroll-label">YOUR CHIPS:</span>
            <span class="bankroll-amount">{{ myCurrentChips.toLocaleString() }}</span>
          </div>
          <div v-if="myRoundResult" :class="['bankroll-result-pill', myRoundResult.won ? 'win' : 'loss']">
            {{ myRoundResult.won ? '+50 WON' : '-25 LOST' }}
          </div>
        </div>

        <template v-if="gameView?.phase === 'betting'">
          <div class="action-prompt">Will your hidden card be Higher or Lower than the target?</div>
          <div class="action-buttons">
            <button
              class="btn-action high"
              :class="{ selected: gameView?.guesses?.[platformState.mySessionId] === 'higher' }"
              @click="submitGuess('higher')"
            >
              Bet Higher (+50)
            </button>
            <button
              class="btn-action low"
              :class="{ selected: gameView?.guesses?.[platformState.mySessionId] === 'lower' }"
              @click="submitGuess('lower')"
            >
              Bet Lower (+50)
            </button>
          </div>
        </template>
        <template v-else>
          <div class="round-over-summary">
            <span v-if="myRoundResult?.won" class="result-won">
              Nice Call! Your secret card was <strong>{{ myCard?.rank }}{{ myCard?.suit }}</strong> — You won +50 chips!
            </span>
            <span v-else-if="myRoundResult" class="result-lost">
              Unlucky. Your secret card was <strong>{{ myCard?.rank }}{{ myCard?.suit }}</strong> — You lost 25 chips.
            </span>
            <span v-else>
              Round complete! All cards revealed above.
            </span>
          </div>
        </template>
      </div>

      <!-- Seated & In Lobby -->
      <div v-else-if="mySeatIndex !== -1" class="lobby-seat-actions">
        <div class="seat-status-text">
          Seated at <strong>Seat {{ mySeatIndex + 1 }}</strong> as <strong>{{ platformState.myNickname }}</strong>
        </div>
        <button class="btn-secondary" @click="leaveSeat">
          Stand Up
        </button>
      </div>

      <!-- Spectator -->
      <div v-else class="spectator-tray">
        <span class="spectator-pill">Spectating</span>
        <span class="spectator-hint">Click any open seat around the table to join the game!</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import confetti from 'canvas-confetti';
import {
  platformState,
  privatePlayerView,
  takeSeat,
  leaveSeat,
  startGame,
  sendGameAction,
} from '../colyseus.js';
import PlayingCard from './PlayingCard.vue';

const gameView = computed(() => privatePlayerView.value);

const seatedCount = computed(() => {
  return platformState.seats.filter((s) => s.occupied).length;
});

const mySeatIndex = computed(() => {
  return platformState.seats.findIndex((s) => s.playerId === platformState.mySessionId);
});

const isHost = computed(() => {
  return platformState.hostPlayerId === platformState.mySessionId;
});

const myCard = computed(() => {
  return gameView.value?.playerCards?.[platformState.mySessionId];
});

const myRoundResult = computed(() => {
  if (gameView.value?.phase !== 'revealed') return null;
  const card = myCard.value;
  const dealer = gameView.value?.dealerCard;
  const guess = gameView.value?.guesses?.[platformState.mySessionId];
  if (!card || !dealer || !guess || 'hidden' in card) return null;
  const isHigher = card.value > dealer.value;
  const won = (guess === 'higher' && isHigher) || (guess === 'lower' && !isHigher);
  return { won, isHigher, guess };
});

const autoDealTimer = ref(0);
let autoDealInterval: any = null;

const seatDeltaMap = ref<Record<string, number>>({});
const prevSeatChips: Record<string, number> = {};

watch(() => platformState.seats, (seats) => {
  for (const s of seats) {
    if (s.playerId) {
      if (prevSeatChips[s.playerId] !== undefined) {
        const diff = s.chips - prevSeatChips[s.playerId];
        if (diff !== 0) {
          seatDeltaMap.value[s.playerId] = diff;
          setTimeout(() => {
            delete seatDeltaMap.value[s.playerId];
          }, 3500);
        }
      }
      prevSeatChips[s.playerId] = s.chips;
    }
  }
}, { deep: true });

const myCurrentChips = computed(() => {
  const seat = platformState.seats.find((s) => s.playerId === platformState.mySessionId);
  return seat ? seat.chips : 1000;
});

// Auto-countdown timer when phase switches to 'revealed'
watch(() => gameView.value?.phase, (phase) => {
  clearInterval(autoDealInterval);
  if (phase === 'revealed') {
    autoDealTimer.value = 6;
    autoDealInterval = setInterval(() => {
      autoDealTimer.value--;
      if (autoDealTimer.value <= 0) {
        clearInterval(autoDealInterval);
        handleNextRound();
      }
    }, 1000);
  } else {
    autoDealTimer.value = 0;
  }
});

watch(() => myRoundResult.value?.won, (won) => {
  if (won) {
    try {
      confetti({
        particleCount: 75,
        spread: 75,
        origin: { y: 0.72 },
      });
    } catch {
      // safe fallback
    }
  }
});

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s_]+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function submitGuess(guess: 'higher' | 'lower') {
  sendGameAction({ guess });
}

function handleNextRound() {
  clearInterval(autoDealInterval);
  autoDealTimer.value = 0;
  sendGameAction({ nextRound: true });
}
</script>

<style scoped>
.table-arena {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 1rem 0;
  position: relative;
}

/* Oval Poker Table */
.poker-table {
  width: 95%;
  max-width: 960px;
  height: 540px;
  background: radial-gradient(ellipse at center, #112d23 0%, #061912 65%, #030c08 100%);
  border: 14px solid #1e293b;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.8),
    0 20px 50px -10px rgba(0, 0, 0, 0.7),
    0 0 0 2px rgba(255, 255, 255, 0.05);
  border-radius: 280px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;
}

.felt-surface {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 260px;
}

.felt-line {
  position: absolute;
  top: 18px;
  left: 24px;
  right: 24px;
  bottom: 18px;
  border: 2px dashed rgba(16, 185, 129, 0.2);
  border-radius: 250px;
  pointer-events: none;
}

.table-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
  max-width: 420px;
}

.lobby-banner {
  background: rgba(14, 20, 28, 0.85);
  backdrop-filter: blur(12px);
  padding: 1.5rem 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--accent-emerald);
  margin-bottom: 0.5rem;
}

.banner-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.4rem;
}

.banner-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.start-btn {
  margin: 0 auto;
}

.wait-note {
  font-size: 0.85rem;
  color: #94a3b8;
  font-style: italic;
}

.game-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.round-indicator {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.5);
  padding: 0.35rem 1rem;
  border-radius: var(--radius-full);
}

.phase-name {
  color: var(--accent-gold);
}

.dealer-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.card-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #a5b4fc;
}

.next-round-btn {
  margin-top: 0.5rem;
}

/* 10 Seat Positioning around the ellipse */
.seat-pod {
  position: absolute;
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  z-index: 20;
}

/* Symmetrical 10 seat coordinates */
.seat-0 { top: 4%;  left: 25%; }
.seat-1 { top: 2%;  left: 50%; }
.seat-2 { top: 4%;  left: 75%; }
.seat-3 { top: 28%; left: 94%; }
.seat-4 { top: 68%; left: 94%; }
.seat-5 { top: 96%; left: 75%; }
.seat-6 { top: 98%; left: 50%; }
.seat-7 { top: 96%; left: 25%; }
.seat-8 { top: 68%; left: 6%;  }
.seat-9 { top: 28%; left: 6%;  }

.avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  position: relative;
}

.seat-pod.my-seat .avatar-circle {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 16px var(--border-glow);
}

.you-indicator {
  position: absolute;
  top: -8px;
  right: -6px;
  background: var(--accent-cyan);
  color: #000;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.host-badge {
  position: absolute;
  bottom: -4px;
  right: -6px;
  font-size: 0.85rem;
}

.seat-avatar {
  position: relative;
  margin-bottom: 0.25rem;
}

.seat-info {
  background: rgba(10, 14, 22, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  text-align: center;
  width: 100%;
}

.seat-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chips-pill {
  font-size: 0.7rem;
  color: var(--accent-gold);
  font-weight: 700;
}

.empty-seat-btn {
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 0.45rem 0.75rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  transition: all 0.2s ease;
}

.empty-seat-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
  border-color: var(--primary);
  color: #fff;
  transform: scale(1.05);
}

.seat-num {
  font-size: 0.65rem;
  font-weight: 600;
  opacity: 0.8;
}

.plus-icon {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--accent-emerald);
}

.seat-card-slot {
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.guess-tag {
  font-size: 0.65rem;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: var(--accent-gold);
}

.btn-leave-seat {
  margin-top: 0.25rem;
  font-size: 0.65rem;
  background: rgba(244, 63, 94, 0.2);
  color: #fca5a5;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
}

/* Bottom Action Dock */
.action-dock {
  width: 95%;
  max-width: 960px;
  margin-top: 1rem;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-turn-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.action-prompt {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
}

.action-buttons {
  display: flex;
  gap: 1.5rem;
}

.btn-action {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
  padding: 0.85rem 2rem;
  border-radius: var(--radius-md);
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.btn-action.high {
  background: linear-gradient(135deg, #10b981, #059669);
}

.btn-action.low {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.btn-action.selected {
  outline: 3px solid #fff;
  transform: scale(1.05);
}

.round-over-summary {
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
}

.result-won {
  color: var(--accent-emerald);
  text-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
}

.result-lost {
  color: var(--accent-rose);
  text-shadow: 0 0 12px rgba(244, 63, 94, 0.3);
}

.lobby-seat-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.seat-status-text {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.spectator-tray {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.spectator-pill {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 700;
}

.spectator-hint {
  font-size: 0.85rem;
  color: var(--text-dim);
}

/* Upgraded Next Deal Action Panel */
.next-deal-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  animation: fadeIn 0.3s ease-out;
}

.deal-status-badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--accent-gold);
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-deal-hand {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  padding: 0.85rem 1.75rem;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-deal-hand:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
  background: linear-gradient(135deg, #4f46e5, #4338ca);
}

.deal-icon {
  font-size: 1.15rem;
}

.auto-timer-pill {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #a5b4fc;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
}

.deal-subtext {
  font-size: 0.725rem;
  color: var(--text-dim);
}

/* Floating Seat Delta */
.floating-seat-delta {
  position: absolute;
  top: -16px;
  right: -12px;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 30;
  pointer-events: none;
}

.floating-seat-delta.gain {
  background: var(--accent-emerald);
  color: #000;
}

.floating-seat-delta.loss {
  background: var(--accent-rose);
  color: #fff;
}

.chip-float-enter-active {
  animation: chipFloatIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chip-float-leave-active {
  animation: chipFloatOut 0.4s ease-in forwards;
}

@keyframes chipFloatIn {
  from { opacity: 0; transform: translateY(6px) scale(0.6); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes chipFloatOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-14px); }
}

/* Dock Bankroll Dashboard Bar */
.dock-bankroll-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(14, 20, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.45rem 1.25rem;
  border-radius: var(--radius-full);
  margin-bottom: 0.25rem;
}

.bankroll-stack {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.bankroll-coin {
  font-size: 1.1rem;
}

.bankroll-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-dim);
}

.bankroll-amount {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent-gold);
}

.bankroll-result-pill {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-full);
}

.bankroll-result-pill.win {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: var(--accent-emerald);
}

.bankroll-result-pill.loss {
  background: rgba(244, 63, 94, 0.2);
  border: 1px solid rgba(244, 63, 94, 0.4);
  color: #fca5a5;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>
