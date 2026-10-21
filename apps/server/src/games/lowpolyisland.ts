import { defineGame, type PlayerId } from '@sinki/platform-core';

export type IslandType = 'island' | 'cybercity' | 'kamakura';

export interface PlayerNetworkState {
  playerId: PlayerId;
  nickname: string;
  island: IslandType;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  moveState: string;
  isGliding: boolean;
  isDrivingQuad: boolean;
  quadSpeed: number;
  colorIndex: number;
  lastActiveTime: number;
}

export interface LowPolyIslandState {
  players: Record<PlayerId, PlayerNetworkState>;
  sharedTapes: string[];
  recentEvents: {
    id: string;
    type: 'bell_strike' | 'island_switch' | 'hang_glider_launch';
    playerId: PlayerId;
    nickname: string;
    timestamp: number;
    text: string;
  }[];
}

export type LowPolyIslandAction =
  | {
      type: 'move';
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch?: number;
      roll?: number;
      moveState?: string;
      isGliding?: boolean;
      isDrivingQuad?: boolean;
      quadSpeed?: number;
      island?: IslandType;
    }
  | {
      type: 'switch_island';
      island: IslandType;
    }
  | {
      type: 'bell_strike';
      bellId: string;
    }
  | {
      type: 'collect_tape';
      tapeId: string;
    }
  | {
      type: 'knockback';
      targetPlayerId: PlayerId;
      forceX: number;
      forceY: number;
      forceZ: number;
    };

export const lowPolyIslandGame = defineGame<LowPolyIslandState, LowPolyIslandAction, any>({
  id: 'lowpolyisland',
  name: 'Low-Poly Islands',
  description: 'Retro 90s low-poly 3D adventure! Quads, hang-gliding, seabirds & 3 explorable islands.',
  players: { min: 1, max: 16 },

  setup(ctx): LowPolyIslandState {
    const players: Record<PlayerId, PlayerNetworkState> = {};
    let idx = 0;

    for (const seat of ctx.seats) {
      if (seat.playerId) {
        players[seat.playerId] = {
          playerId: seat.playerId,
          nickname: seat.nickname || `Explorer_${seat.seatIndex + 1}`,
          island: 'island',
          x: (idx - 2) * 2.5,
          y: 2.38,
          z: -10,
          yaw: Math.PI,
          pitch: 0,
          roll: 0,
          moveState: 'IDLE',
          isGliding: false,
          isDrivingQuad: false,
          quadSpeed: 0,
          colorIndex: idx % 6,
          lastActiveTime: Date.now(),
        };
        idx++;
      }
    }

    return {
      players,
      sharedTapes: [],
      recentEvents: [],
    };
  },

  processAction(state, action, playerId, ctx) {
    // Ensure player exists in state
    if (!state.players[playerId]) {
      const seat = ctx.seats.find((s) => s.playerId === playerId);
      const nickname = seat?.nickname || `Player_${playerId.slice(0, 4)}`;
      state.players[playerId] = {
        playerId,
        nickname,
        island: 'island',
        x: 0,
        y: 2.38,
        z: -10,
        yaw: Math.PI,
        pitch: 0,
        roll: 0,
        moveState: 'IDLE',
        isGliding: false,
        isDrivingQuad: false,
        quadSpeed: 0,
        colorIndex: Object.keys(state.players).length % 6,
        lastActiveTime: Date.now(),
      };
    }

    const p = state.players[playerId];
    p.lastActiveTime = Date.now();

    if (action.type === 'move') {
      p.x = action.x;
      p.y = action.y;
      p.z = action.z;
      p.yaw = action.yaw;
      if (action.pitch !== undefined) p.pitch = action.pitch;
      if (action.roll !== undefined) p.roll = action.roll;
      if (action.moveState !== undefined) p.moveState = action.moveState;
      if (action.isGliding !== undefined) p.isGliding = action.isGliding;
      if (action.isDrivingQuad !== undefined) p.isDrivingQuad = action.isDrivingQuad;
      if (action.quadSpeed !== undefined) p.quadSpeed = action.quadSpeed;
      if (action.island) p.island = action.island;
      return { valid: true, nextState: state };
    }

    if (action.type === 'switch_island') {
      p.island = action.island;
      p.x = 0;
      p.y = 2.4;
      p.z = -10;
      p.isGliding = false;
      p.isDrivingQuad = false;

      state.recentEvents.push({
        id: Math.random().toString(36).slice(2, 8),
        type: 'island_switch',
        playerId,
        nickname: p.nickname,
        timestamp: Date.now(),
        text: `${p.nickname} traveled to ${action.island.toUpperCase()}`,
      });
      if (state.recentEvents.length > 20) state.recentEvents.shift();

      return { valid: true, nextState: state };
    }

    if (action.type === 'bell_strike') {
      state.recentEvents.push({
        id: Math.random().toString(36).slice(2, 8),
        type: 'bell_strike',
        playerId,
        nickname: p.nickname,
        timestamp: Date.now(),
        text: `🔔 ${p.nickname} struck the Great Temple Bell!`,
      });
      if (state.recentEvents.length > 20) state.recentEvents.shift();
      return { valid: true, nextState: state };
    }

    if (action.type === 'collect_tape') {
      if (!state.sharedTapes.includes(action.tapeId)) {
        state.sharedTapes.push(action.tapeId);
      }
      return { valid: true, nextState: state };
    }

    if (action.type === 'knockback') {
      const target = state.players[action.targetPlayerId];
      const targetName = target?.nickname || 'Player';
      state.recentEvents.push({
        id: Math.random().toString(36).slice(2, 8),
        type: 'knockback' as any,
        playerId,
        nickname: p.nickname,
        timestamp: Date.now(),
        text: `💥 ${p.nickname} rammed ${targetName} with 4x4 Quad Bike!`,
        targetPlayerId: action.targetPlayerId,
        forceX: action.forceX,
        forceY: action.forceY,
        forceZ: action.forceZ,
      } as any);
      if (state.recentEvents.length > 20) state.recentEvents.shift();
      return { valid: true, nextState: state };
    }

    return { valid: false, error: 'Unknown action type' };
  },

  // Real-time tick cleanup (removes disconnected players after 30s)
  tick(state) {
    const now = Date.now();
    for (const [id, p] of Object.entries(state.players)) {
      if (now - p.lastActiveTime > 30000) {
        delete state.players[id];
      }
    }
    return state;
  },

  filterPlayerView(state, viewerPlayerId) {
    return {
      players: state.players,
      sharedTapes: state.sharedTapes,
      recentEvents: state.recentEvents.slice(-5),
      viewerId: viewerPlayerId,
    };
  },
});
