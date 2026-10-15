import { schema, t, type SchemaType } from '@colyseus/schema';

export const SeatSchema = schema({
  seatIndex: t.uint8(),
  occupied: t.boolean().default(false),
  playerId: t.string().default(''),
  nickname: t.string().default(''),
  isReady: t.boolean().default(false),
  chips: t.number().default(1000),
  connected: t.boolean().default(true),
});
export type SeatSchema = SchemaType<typeof SeatSchema>;

export const ChatMessageSchema = schema({
  id: t.string(),
  senderName: t.string(),
  text: t.string(),
  timestamp: t.number(),
  system: t.boolean().default(false),
});
export type ChatMessageSchema = SchemaType<typeof ChatMessageSchema>;

export const PlatformRoomState = schema({
  roomCode: t.string().default(''),
  gameId: t.string().default('holdem'),
  hostPlayerId: t.string().default(''),
  gameStatus: t.string().default('lobby'), // 'lobby' | 'in_progress' | 'round_ended'
  seats: t.array(SeatSchema),
  chat: t.array(ChatMessageSchema),
  publicGameStateJson: t.string().default('{}'),
});
export type PlatformRoomState = SchemaType<typeof PlatformRoomState>;
