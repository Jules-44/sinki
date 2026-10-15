import { schema, t, type SchemaType } from '@colyseus/schema';
import { ChatMessageSchema } from './PlatformRoomState.js';

export const LoungeUserSchema = schema({
  sessionId: t.string(),
  nickname: t.string(),
  joinedAt: t.number(),
  currentRoom: t.string().default(''),
});
export type LoungeUserSchema = SchemaType<typeof LoungeUserSchema>;

export const LoungeRoomState = schema({
  users: t.map(LoungeUserSchema),
  chat: t.array(ChatMessageSchema),
});
export type LoungeRoomState = SchemaType<typeof LoungeRoomState>;
