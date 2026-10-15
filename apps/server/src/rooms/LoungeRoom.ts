import { Room, Client, CloseCode } from 'colyseus';
import { LoungeRoomState, LoungeUserSchema } from './schema/LoungeRoomState.js';
import { ChatMessageSchema } from './schema/PlatformRoomState.js';

interface LoungeJoinOptions {
  nickname?: string;
}

export class LoungeRoom extends Room<{ state: LoungeRoomState }> {
  maxClients = 1000;
  state = new LoungeRoomState();

  onCreate() {
    this.roomId = 'global_lounge';

    this.onMessage('chat', (client, message: { text: string }) => {
      const user = this.state.users.get(client.sessionId);
      if (!user || !message.text?.trim()) return;

      const chat = new ChatMessageSchema();
      chat.id = Math.random().toString(36).slice(2, 9);
      chat.senderName = user.nickname;
      chat.text = message.text.trim();
      chat.timestamp = Date.now();
      chat.system = false;
      this.state.chat.push(chat);

      if (this.state.chat.length > 100) {
        this.state.chat.shift();
      }
    });

    this.onMessage('update_nickname', (client, message: { nickname: string }) => {
      const user = this.state.users.get(client.sessionId);
      if (user && message.nickname?.trim()) {
        const oldName = user.nickname;
        user.nickname = message.nickname.trim();
        this.addSystemChat(`${oldName} changed their name to ${user.nickname}`);
      }
    });

    this.onMessage('update_room', (client, message: { currentRoom: string }) => {
      const user = this.state.users.get(client.sessionId);
      if (user) {
        user.currentRoom = message.currentRoom || '';
      }
    });
  }

  onJoin(client: Client, options: LoungeJoinOptions) {
    const nickname = (options.nickname || `Guest_${Math.floor(1000 + Math.random() * 9000)}`).trim();

    const user = new LoungeUserSchema();
    user.sessionId = client.sessionId;
    user.nickname = nickname;
    user.joinedAt = Date.now();
    user.currentRoom = '';

    this.state.users.set(client.sessionId, user);
    this.addSystemChat(`${nickname} entered the Lounge`);
  }

  onLeave(client: Client, code?: CloseCode | number) {
    const user = this.state.users.get(client.sessionId);
    if (user) {
      this.addSystemChat(`${user.nickname} left the Lounge`);
      this.state.users.delete(client.sessionId);
    }
  }

  private addSystemChat(text: string) {
    const chat = new ChatMessageSchema();
    chat.id = Math.random().toString(36).slice(2, 9);
    chat.senderName = 'Lounge';
    chat.text = text;
    chat.timestamp = Date.now();
    chat.system = true;
    this.state.chat.push(chat);

    if (this.state.chat.length > 100) {
      this.state.chat.shift();
    }
  }
}
