import { reactive, ref, shallowRef } from 'vue';
import { Client, type Room } from '@colyseus/sdk';
import { extractRoomCode } from './utils/chat-tokens.js';

const isLocalVite = typeof window !== 'undefined' && window.location.port === '5173';
const DEFAULT_URL = typeof window !== 'undefined'
  ? (isLocalVite
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:2567`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)
  : 'ws://localhost:2567';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || DEFAULT_URL;

export interface ClientSeat {
  seatIndex: number;
  occupied: boolean;
  playerId: string;
  nickname: string;
  isReady: boolean;
  chips: number;
  connected: boolean;
}

export interface ClientChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  system: boolean;
}

export interface PlatformState {
  roomCode: string;
  gameId: string;
  hostPlayerId: string;
  gameStatus: 'lobby' | 'in_progress' | 'round_ended';
  seats: ClientSeat[];
  chat: ClientChatMessage[];
  mySessionId: string;
  myNickname: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface LoungeUser {
  sessionId: string;
  nickname: string;
  currentRoom: string;
}

export interface LoungeState {
  isConnected: boolean;
  users: LoungeUser[];
  chat: ClientChatMessage[];
}

export const loungeState = reactive<LoungeState>({
  isConnected: false,
  users: [],
  chat: [],
});

export const platformState = reactive<PlatformState>({
  roomCode: '',
  gameId: 'lucky-draw',
  hostPlayerId: '',
  gameStatus: 'lobby',
  seats: [],
  chat: [],
  mySessionId: '',
  myNickname: localStorage.getItem('sinki_nickname') || `Player_${Math.floor(100 + Math.random() * 900)}`,
  isConnected: false,
  isConnecting: false,
  error: null,
});

export const privatePlayerView = ref<any>(null);

let client: Client | null = null;
const activeRoom = shallowRef<Room | null>(null);
const loungeRoom = shallowRef<Room | null>(null);

export function getClient(): Client {
  if (!client) {
    client = new Client(SERVER_URL);
  }
  return client;
}

export async function connectLounge() {
  if (loungeRoom.value) return;
  try {
    const c = getClient();
    const room = await c.joinOrCreate('lounge_room', {
      nickname: platformState.myNickname,
    });
    loungeRoom.value = room;
    loungeState.isConnected = true;

    room.onStateChange((state: any) => {
      if (state.users) {
        loungeState.users = Array.from(state.users.values()).map((u: any) => ({
          sessionId: u.sessionId,
          nickname: u.nickname,
          currentRoom: u.currentRoom,
        }));
      }

      if (state.chat) {
        loungeState.chat = Array.from(state.chat).map((c: any) => ({
          id: c.id,
          senderName: c.senderName,
          text: c.text,
          timestamp: c.timestamp,
          system: c.system,
        }));
      }
    });

    room.onLeave(() => {
      loungeState.isConnected = false;
      loungeRoom.value = null;
    });
  } catch (err) {
    console.warn('Lounge connection issue:', err);
  }
}

export function sendLoungeChat(text: string) {
  if (!text.trim()) return;
  loungeRoom.value?.send('chat', { text: text.trim() });
}

export function setNickname(name: string) {
  platformState.myNickname = name.trim();
  localStorage.setItem('sinki_nickname', platformState.myNickname);
  loungeRoom.value?.send('update_nickname', { nickname: platformState.myNickname });
}

export async function createRoom(gameId: string = 'lucky-draw') {
  platformState.isConnecting = true;
  platformState.error = null;
  try {
    const c = getClient();
    const room = await c.create('platform_room', {
      nickname: platformState.myNickname,
      gameId,
    });
    bindRoom(room);
  } catch (err: any) {
    platformState.error = err.message || 'Failed to create room';
    platformState.isConnecting = false;
  }
}

export async function joinRoom(roomCode: string) {
  const cleanCode = extractRoomCode(roomCode);
  if (!cleanCode) {
    platformState.error = 'Invalid room code';
    return;
  }

  // If already connected to this room, no need to reconnect
  if (activeRoom.value && activeRoom.value.roomId === cleanCode) {
    return;
  }

  platformState.isConnecting = true;
  platformState.error = null;

  try {
    // If currently in a different room, leave it gracefully before switching
    if (activeRoom.value) {
      const prev = activeRoom.value;
      activeRoom.value = null;
      try {
        await prev.leave();
      } catch (e) {
        // Ignore leave errors when switching
      }
    }

    const c = getClient();
    const room = await c.joinById(cleanCode, {
      nickname: platformState.myNickname,
      roomCode: cleanCode,
    });
    bindRoom(room);
  } catch (err: any) {
    platformState.error = err.message || 'Failed to join room';
    platformState.isConnecting = false;
  }
}

function bindRoom(room: Room) {
  activeRoom.value = room;
  platformState.isConnected = true;
  platformState.isConnecting = false;
  platformState.mySessionId = room.sessionId;
  platformState.roomCode = room.roomId;

  // Inform lounge room of active table
  loungeRoom.value?.send('update_room', { currentRoom: room.roomId });

  // Persist for quick reconnection on refresh
  sessionStorage.setItem('sinki_last_room', room.roomId);
  if (room.reconnectionToken) {
    sessionStorage.setItem('sinki_reconnect_token', room.reconnectionToken);
  }

  // Handle schema sync
  room.onStateChange((state: any) => {
    platformState.roomCode = state.roomCode || room.roomId;
    platformState.gameId = state.gameId;
    platformState.hostPlayerId = state.hostPlayerId;
    platformState.gameStatus = state.gameStatus;

    if (state.seats) {
      platformState.seats = Array.from(state.seats).map((s: any) => ({
        seatIndex: s.seatIndex,
        occupied: s.occupied,
        playerId: s.playerId,
        nickname: s.nickname,
        isReady: s.isReady,
        chips: s.chips,
        connected: s.connected,
      }));
    }

    if (state.chat) {
      platformState.chat = Array.from(state.chat).map((c: any) => ({
        id: c.id,
        senderName: c.senderName,
        text: c.text,
        timestamp: c.timestamp,
        system: c.system,
      }));
    }
  });

  // Handle private/filtered player view messages
  room.onMessage('player_view', (view: any) => {
    privatePlayerView.value = view;
  });

  room.onMessage('error', (err: { message: string }) => {
    platformState.error = err.message;
    setTimeout(() => {
      if (platformState.error === err.message) {
        platformState.error = null;
      }
    }, 4000);
  });

  room.onLeave((code) => {
    platformState.isConnected = false;
    privatePlayerView.value = null;
    activeRoom.value = null;
    sessionStorage.removeItem('sinki_last_room');
  });

  room.onError((code, message) => {
    platformState.error = message || `Room error (${code})`;
  });
}

export function takeSeat(seatIndex: number) {
  activeRoom.value?.send('join_seat', { seatIndex });
}

export function leaveSeat() {
  activeRoom.value?.send('leave_seat', {});
}

export function toggleReady() {
  activeRoom.value?.send('toggle_ready', {});
}

export function startGame() {
  activeRoom.value?.send('start_game', {});
}

export function sendGameAction(action: any) {
  activeRoom.value?.send('game_action', { action });
}

export function sendChat(text: string) {
  if (!text.trim()) return;
  activeRoom.value?.send('chat', { text });
}

export function leaveRoom() {
  activeRoom.value?.leave();
  platformState.isConnected = false;
  platformState.roomCode = '';
  privatePlayerView.value = null;
  activeRoom.value = null;
  loungeRoom.value?.send('update_room', { currentRoom: '' });
  sessionStorage.removeItem('sinki_last_room');
  sessionStorage.removeItem('sinki_reconnect_token');
}
