<template>
  <div
    :class="[
      'playing-card',
      suitColor,
      { hidden: isHidden, highlighted: isHighlighted, small: size === 'sm' }
    ]"
  >
    <template v-if="isHidden">
      <div class="card-back-pattern">
        <div class="card-crest">S</div>
      </div>
    </template>
    <template v-else-if="visibleCard">
      <div class="card-corner top-left">
        <span class="rank">{{ visibleCard.rank }}</span>
        <span class="suit">{{ visibleCard.suit }}</span>
      </div>
      <div class="card-center">
        <span class="center-suit">{{ visibleCard.suit }}</span>
      </div>
      <div class="card-corner bottom-right">
        <span class="rank">{{ visibleCard.rank }}</span>
        <span class="suit">{{ visibleCard.suit }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface VisibleCard {
  suit: string;
  rank: string;
  value?: number;
}

export type CardProp = VisibleCard | { hidden: boolean } | null;

const props = withDefaults(
  defineProps<{
    card?: CardProp;
    size?: 'sm' | 'md' | 'lg';
    isHighlighted?: boolean;
  }>(),
  {
    card: null,
    size: 'md',
    isHighlighted: false,
  }
);

const isHidden = computed(() => {
  if (!props.card) return true;
  return 'hidden' in props.card && Boolean(props.card.hidden);
});

const visibleCard = computed<VisibleCard | null>(() => {
  if (!props.card || ('hidden' in props.card && props.card.hidden)) {
    return null;
  }
  return props.card as VisibleCard;
});

const suitColor = computed(() => {
  if (!visibleCard.value) return 'card-back';
  const suit = visibleCard.value.suit;
  return suit === '♥' || suit === '♦' ? 'red' : 'black';
});
</script>

<style scoped>
.playing-card {
  width: 72px;
  height: 104px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px;
  position: relative;
  user-select: none;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
  transform-style: preserve-3d;
}

.playing-card.small {
  width: 50px;
  height: 72px;
  padding: 4px;
}

.playing-card:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
}

.playing-card.highlighted {
  box-shadow: 0 0 0 2px var(--accent-gold), 0 8px 24px rgba(251, 191, 36, 0.4);
}

.playing-card.red {
  color: #dc2626;
}

.playing-card.black {
  color: #111827;
}

.card-corner {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.card-corner.top-left {
  align-self: flex-start;
}

.card-corner.bottom-right {
  align-self: flex-end;
  transform: rotate(180deg);
}

.rank {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.95rem;
}

.playing-card.small .rank {
  font-size: 0.75rem;
}

.suit {
  font-size: 0.85rem;
}

.playing-card.small .suit {
  font-size: 0.65rem;
}

.card-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  opacity: 0.9;
}

.playing-card.small .card-center {
  font-size: 1.25rem;
}

.playing-card.hidden {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 2px solid #334155;
}

.card-back-pattern {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 10%, transparent 10%);
  background-size: 8px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-crest {
  font-family: var(--font-display);
  font-weight: 900;
  color: var(--primary);
  font-size: 1.5rem;
  text-shadow: 0 0 10px var(--primary-glow);
}
</style>
