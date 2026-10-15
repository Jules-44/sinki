import { defineGame, type GameDefinition, type PlayerId } from '@sinki/platform-core';

export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number;
}

export interface LuckyDrawState {
  deck: Card[];
  dealerCard: Card | null;
  playerCards: Record<PlayerId, Card | null>;
  guesses: Record<PlayerId, 'higher' | 'lower' | null>;
  scores: Record<PlayerId, number>;
  round: number;
  phase: 'betting' | 'revealed';
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 },
  { rank: '5', val: 5 }, { rank: '6', val: 6 }, { rank: '7', val: 7 },
  { rank: '8', val: 8 }, { rank: '9', val: 9 }, { rank: '10', val: 10 },
  { rank: 'J', val: 11 }, { rank: 'Q', val: 12 }, { rank: 'K', val: 13 },
  { rank: 'A', val: 14 }
];

function createFreshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r.rank, value: r.val });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[], random: () => number): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const luckyDrawGame = defineGame<LuckyDrawState, { guess: 'higher' | 'lower' } | { nextRound: true }, any>({
  id: 'lucky-draw',
  name: 'Lucky Draw (Hi-Lo)',
  description: 'Guess if your secret hole card beats the community card!',
  players: { min: 1, max: 10 },

  setup(ctx): LuckyDrawState {
    const deck = shuffleDeck(createFreshDeck(), ctx.random);
    const dealerCard = deck.pop() || null;
    const playerCards: Record<PlayerId, Card | null> = {};
    const guesses: Record<PlayerId, 'higher' | 'lower' | null> = {};
    const scores: Record<PlayerId, number> = {};

    for (const seat of ctx.seats) {
      if (seat.playerId) {
        playerCards[seat.playerId] = deck.pop() || null;
        guesses[seat.playerId] = null;
        scores[seat.playerId] = seat.scoreOrChips != null && seat.scoreOrChips > 0 ? seat.scoreOrChips : 1000;
      }
    }

    return {
      deck,
      dealerCard,
      playerCards,
      guesses,
      scores,
      round: 1,
      phase: 'betting'
    };
  },

  processAction(state, action, playerId) {
    if ('guess' in action) {
      if (state.phase !== 'betting') {
        return { valid: false, error: 'Round is not in betting phase' };
      }
      if (!state.playerCards[playerId]) {
        return { valid: false, error: 'Player is not in this round' };
      }
      state.guesses[playerId] = action.guess;

      // Check if all seated players have guessed
      const allDone = Object.keys(state.playerCards).every(id => state.guesses[id] !== null);
      if (allDone) {
        state.phase = 'revealed';
        // Compute scores
        for (const pid of Object.keys(state.playerCards)) {
          const card = state.playerCards[pid];
          const guess = state.guesses[pid];
          if (card && state.dealerCard && guess) {
            const isHigher = card.value > state.dealerCard.value;
            const won = (guess === 'higher' && isHigher) || (guess === 'lower' && !isHigher);
            const delta = won ? 50 : -25;
            state.scores[pid] = Math.max(0, (state.scores[pid] ?? 1000) + delta);
          }
        }
      }

      return { valid: true, nextState: state };
    }

    if ('nextRound' in action) {
      if (state.phase !== 'revealed') {
        return { valid: false, error: 'Must finish betting before next round' };
      }
      // Re-deal
      const deck = shuffleDeck(createFreshDeck(), Math.random);
      state.dealerCard = deck.pop() || null;
      state.phase = 'betting';
      state.round += 1;
      for (const pid of Object.keys(state.playerCards)) {
        state.playerCards[pid] = deck.pop() || null;
        state.guesses[pid] = null;
      }
      return { valid: true, nextState: state };
    }

    return { valid: false, error: 'Unknown action' };
  },

  filterPlayerView(state, viewerPlayerId) {
    // Redact other players' hole cards unless revealed!
    const publicPlayerCards: Record<PlayerId, Card | { hidden: true } | null> = {};
    for (const [pid, card] of Object.entries(state.playerCards)) {
      if (!card) {
        publicPlayerCards[pid] = null;
      } else if (state.phase === 'revealed') {
        // Revealed at showdown for everyone
        publicPlayerCards[pid] = card;
      } else {
        // Face down (mystery card) during betting for all players
        publicPlayerCards[pid] = { hidden: true };
      }
    }

    return {
      round: state.round,
      phase: state.phase,
      dealerCard: state.dealerCard,
      playerCards: publicPlayerCards,
      guesses: state.guesses,
      scores: state.scores,
    };
  }
});
