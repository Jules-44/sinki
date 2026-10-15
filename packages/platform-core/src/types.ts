export type PlayerId = string;

export interface PlayerProfile {
  id: PlayerId;
  nickname: string;
  avatarSeed?: string;
  connected: boolean;
}

export interface SeatState {
  seatIndex: number;
  playerId: PlayerId | null;
  nickname: string | null;
  isReady: boolean;
  scoreOrChips?: number;
  isSittingOut?: boolean;
}

export interface RoomMeta {
  code: string;
  gameId: string;
  name: string;
  maxSeats: number;
  hostPlayerId: string;
  createdTime: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

/**
 * Contract for a game module plugged into the Sinki platform
 */
export interface GameContext {
  random: () => number;
  seats: SeatState[];
}

export interface GameDefinition<TState = any, TAction = any, TPlayerView = any> {
  id: string;
  name: string;
  description?: string;
  players: {
    min: number;
    max: number;
  };
  
  /** Initialize new match state given seated players and seed context */
  setup: (ctx: GameContext) => TState;
  
  /**
   * Action handler: returns new state or throws/returns error string if invalid.
   */
  processAction: (state: TState, action: TAction, playerId: PlayerId, ctx: GameContext) => {
    valid: boolean;
    error?: string;
    nextState?: TState;
  };

  /**
   * Optional periodic tick for real-time games (e.g. 20Hz exploration).
   * For turn-based games, leave undefined.
   */
  tick?: (state: TState, dtMs: number, ctx: GameContext) => TState;

  /**
   * Redacts sensitive or hidden state (e.g. other players' hole cards) for a given player or spectator.
   */
  filterPlayerView: (state: TState, viewerPlayerId: PlayerId | null) => TPlayerView;

  /**
   * Determine if game has completed and what the outcome is
   */
  checkFinished?: (state: TState) => {
    finished: boolean;
    winners?: PlayerId[];
    summary?: string;
  } | null;
}

export type PlatformClientMessage =
  | { type: 'join_seat'; seatIndex: number }
  | { type: 'leave_seat' }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'start_game' }
  | { type: 'game_action'; action: any }
  | { type: 'send_chat'; text: string };
