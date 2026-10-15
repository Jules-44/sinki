import { Room, Client, CloseCode } from 'colyseus';
import { PlatformRoomState, SeatSchema, ChatMessageSchema } from './schema/PlatformRoomState.js';
import { generateRoomCode, type GameContext, type SeatState, type PlayerId } from '@sinki/platform-core';
import { getGame } from '../games/registry.js';

interface ClientOptions {
  nickname?: string;
  roomCode?: string;
  gameId?: string;
}

export class PlatformRoom extends Room<{ state: PlatformRoomState }> {
  maxClients = 20; // 10 seated players + spectators
  state = new PlatformRoomState();

  private internalGameState: any = null;
  private clientProfiles = new Map<string, { playerId: PlayerId; nickname: string }>();

  onCreate(options: ClientOptions) {
    const code = options.roomCode || generateRoomCode();
    this.state.roomCode = code;
    this.state.gameId = options.gameId || 'lucky-draw';
    this.roomId = code; // Use readable room code as room ID

    // Set matchmaking metadata so clients can join by code
    this.setMetadata({
      roomCode: code,
      gameId: this.state.gameId,
    });

    // Initialize 10 seats
    for (let i = 0; i < 10; i++) {
      const seat = new SeatSchema();
      seat.seatIndex = i;
      seat.occupied = false;
      seat.playerId = '';
      seat.nickname = '';
      seat.isReady = false;
      seat.chips = 1000;
      seat.connected = false;
      this.state.seats.push(seat);
    }

    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    this.onMessage('join_seat', (client, message: { seatIndex: number }) => {
      const profile = this.clientProfiles.get(client.sessionId);
      if (!profile) return;

      const targetSeat = this.state.seats[message.seatIndex];
      if (!targetSeat || targetSeat.occupied) return;

      // Leave any existing seat first
      this.vacateSeatForPlayer(profile.playerId);

      targetSeat.occupied = true;
      targetSeat.playerId = profile.playerId;
      targetSeat.nickname = profile.nickname;
      targetSeat.isReady = false;
      targetSeat.connected = true;

      this.addSystemChat(`${profile.nickname} sat down at Seat ${message.seatIndex + 1}`);
      this.syncViews();
    });

    this.onMessage('leave_seat', (client) => {
      const profile = this.clientProfiles.get(client.sessionId);
      if (!profile) return;

      const vacated = this.vacateSeatForPlayer(profile.playerId);
      if (vacated !== null) {
        this.addSystemChat(`${profile.nickname} stood up from Seat ${vacated + 1}`);
        this.syncViews();
      }
    });

    this.onMessage('toggle_ready', (client) => {
      const profile = this.clientProfiles.get(client.sessionId);
      if (!profile) return;

      const seat = this.state.seats.find((s) => s.playerId === profile.playerId);
      if (seat) {
        seat.isReady = !seat.isReady;
        this.syncViews();
      }
    });

    this.onMessage('start_game', (client) => {
      const profile = this.clientProfiles.get(client.sessionId);
      if (!profile) return;

      // Auto-seat caller if not yet seated
      let seatedPlayers = this.state.seats.filter((s) => s.occupied && s.playerId);
      if (seatedPlayers.length === 0) {
        const freeSeat = this.state.seats.find((s) => !s.occupied) || this.state.seats[0];
        if (freeSeat) {
          freeSeat.occupied = true;
          freeSeat.playerId = profile.playerId;
          freeSeat.nickname = profile.nickname;
          freeSeat.connected = true;
          seatedPlayers = [freeSeat];
        }
      }

      const gameDef = getGame(this.state.gameId);
      if (!gameDef) {
        client.send('error', { message: `Game ${this.state.gameId} not found` });
        return;
      }

      // Initialize game state
      const ctx: GameContext = {
        random: Math.random,
        seats: this.getSeatStates(),
      };

      this.internalGameState = gameDef.setup(ctx);
      this.state.gameStatus = 'in_progress';
      this.addSystemChat(`Game started!`);
      this.startTickLoop(gameDef);
      this.syncViews();
    });

    this.onMessage('game_action', (client, message: { action: any }) => {
      const profile = this.clientProfiles.get(client.sessionId);
      if (!profile) return;

      const gameDef = getGame(this.state.gameId);
      if (!gameDef) return;

      const ctx: GameContext = {
        random: Math.random,
        seats: this.getSeatStates(),
      };

      // If game has not started yet, auto-initialize on first action (e.g. select_role)
      if (!this.internalGameState) {
        this.internalGameState = gameDef.setup(ctx);
        this.state.gameStatus = 'in_progress';
        this.startTickLoop(gameDef);
      }

      const result = gameDef.processAction(
        this.internalGameState,
        message.action,
        profile.playerId,
        ctx
      );

      if (!result.valid) {
        client.send('error', { message: result.error || 'Invalid action' });
        return;
      }

      if (result.nextState) {
        this.internalGameState = result.nextState;
      }

      // Check whether action concluded the round or resumed play (e.g. restart_round or set_game_mode)
      if (gameDef.checkFinished) {
        const finish = gameDef.checkFinished(this.internalGameState);
        if (finish && finish.finished) {
          this.state.gameStatus = 'round_ended';
          this.addSystemChat(finish.summary || 'Round Finished');
          if (this.tickInterval) {
            this.tickInterval.clear();
            this.tickInterval = null;
          }
        } else if (this.state.gameStatus === 'round_ended') {
          this.state.gameStatus = 'in_progress';
          this.addSystemChat('Round started!');
          if (gameDef.tick && !this.tickInterval) {
            this.startTickLoop(gameDef);
          }
        }
      } else if (this.state.gameStatus === 'round_ended') {
        this.state.gameStatus = 'in_progress';
      }

      if (gameDef.tick && !this.tickInterval && this.state.gameStatus === 'in_progress') {
        this.startTickLoop(gameDef);
      }

      this.syncViews();
    });

    this.onMessage('chat', (client, message: { text: string }) => {
      const profile = this.clientProfiles.get(client.sessionId);
      if (!profile || !message.text?.trim()) return;

      const chat = new ChatMessageSchema();
      chat.id = Math.random().toString(36).slice(2, 9);
      chat.senderName = profile.nickname;
      chat.text = message.text.trim();
      chat.timestamp = Date.now();
      chat.system = false;
      this.state.chat.push(chat);

      // Keep last 50 chat messages
      if (this.state.chat.length > 50) {
        this.state.chat.shift();
      }
    });
  }

  onJoin(client: Client, options: ClientOptions) {
    const nickname = (options.nickname || `Guest_${Math.floor(1000 + Math.random() * 9000)}`).trim();
    const playerId = client.sessionId;

    this.clientProfiles.set(client.sessionId, { playerId, nickname });

    // Set first player as host
    if (!this.state.hostPlayerId) {
      this.state.hostPlayerId = playerId;
    }

    // Auto-seat player in the first free seat
    const freeSeat = this.state.seats.find((s) => !s.occupied);
    if (freeSeat) {
      freeSeat.occupied = true;
      freeSeat.playerId = playerId;
      freeSeat.nickname = nickname;
      freeSeat.connected = true;
    }

    this.addSystemChat(`${nickname} joined the room`);

    // For real-time 3D games (like convoy-raid), auto-initialize match if not already running
    if (this.state.gameId === 'convoy-raid') {
      const gameDef = getGame(this.state.gameId);
      if (gameDef && !this.internalGameState) {
        const ctx: GameContext = {
          random: Math.random,
          seats: this.getSeatStates(),
        };
        this.internalGameState = gameDef.setup(ctx);
        this.state.gameStatus = 'in_progress';
        this.startTickLoop(gameDef);
      }
    }

    this.syncViews();
  }

  async onLeave(client: Client, code?: CloseCode | number) {
    const profile = this.clientProfiles.get(client.sessionId);
    if (!profile) return;

    const seat = this.state.seats.find((s) => s.playerId === profile.playerId);
    if (seat) {
      seat.connected = false;
    }

    const consented = code === CloseCode.CONSENTED;
    if (!consented) {
      try {
        // Allow up to 30s to reconnect
        await this.allowReconnection(client, 30);
        if (seat) {
          seat.connected = true;
          this.addSystemChat(`${profile.nickname} reconnected`);
          this.syncViews();
          return;
        }
      } catch {
        // Reconnect expired
      }
    }

    this.clientProfiles.delete(client.sessionId);
    this.vacateSeatForPlayer(profile.playerId);

    if (this.state.hostPlayerId === profile.playerId) {
      const nextClient = this.clients[0];
      const nextProfile = nextClient ? this.clientProfiles.get(nextClient.sessionId) : null;
      this.state.hostPlayerId = nextProfile ? nextProfile.playerId : '';
    }

    this.addSystemChat(`${profile.nickname} left`);
    this.syncViews();
  }

  private vacateSeatForPlayer(playerId: PlayerId): number | null {
    for (const seat of this.state.seats) {
      if (seat.playerId === playerId) {
        seat.occupied = false;
        seat.playerId = '';
        seat.nickname = '';
        seat.isReady = false;
        seat.connected = false;
        return seat.seatIndex;
      }
    }
    return null;
  }

  private addSystemChat(text: string) {
    const chat = new ChatMessageSchema();
    chat.id = Math.random().toString(36).slice(2, 9);
    chat.senderName = 'System';
    chat.text = text;
    chat.timestamp = Date.now();
    chat.system = true;
    this.state.chat.push(chat);
    if (this.state.chat.length > 50) {
      this.state.chat.shift();
    }
  }

  private getSeatStates(): SeatState[] {
    return this.state.seats.map((s) => ({
      seatIndex: s.seatIndex,
      playerId: s.occupied ? s.playerId : null,
      nickname: s.occupied ? s.nickname : null,
      isReady: s.isReady,
      scoreOrChips: s.chips,
      isSittingOut: !s.connected,
    }));
  }

  private syncViews() {
    const gameDef = getGame(this.state.gameId);
    if (!gameDef || !this.internalGameState) {
      this.state.publicGameStateJson = JSON.stringify({ status: this.state.gameStatus });
      return;
    }

    // Sync chip totals back to seat schema
    if (this.internalGameState.scores) {
      for (const seat of this.state.seats) {
        if (seat.occupied && seat.playerId in this.internalGameState.scores) {
          seat.chips = this.internalGameState.scores[seat.playerId];
        }
      }
    }

    // Send filtered personalized views to each connected client
    for (const client of this.clients) {
      const profile = this.clientProfiles.get(client.sessionId);
      const filteredView = gameDef.filterPlayerView(
        this.internalGameState,
        profile ? profile.playerId : null
      );
      client.send('player_view', filteredView);
    }

    // Spectator / public summary view
    const publicView = gameDef.filterPlayerView(this.internalGameState, null);
    this.state.publicGameStateJson = JSON.stringify(publicView);
  }

  private tickInterval: any = null;

  private startTickLoop(gameDef: any) {
    if (this.tickInterval) {
      this.tickInterval.clear();
      this.tickInterval = null;
    }

    if (!gameDef.tick) return;

    this.tickInterval = this.clock.setInterval(() => {
      if (this.state.gameStatus !== 'in_progress' || !this.internalGameState) return;

      const dtMs = this.clock.deltaTime || 50;
      const ctx: GameContext = {
        random: Math.random,
        seats: this.getSeatStates(),
      };

      this.internalGameState = gameDef.tick(this.internalGameState, dtMs, ctx);

      if (gameDef.checkFinished) {
        const finish = gameDef.checkFinished(this.internalGameState);
        if (finish && finish.finished) {
          this.state.gameStatus = 'round_ended';
          this.addSystemChat(finish.summary || 'Round Finished');
          this.syncViews();
          if (this.tickInterval) {
            this.tickInterval.clear();
            this.tickInterval = null;
          }
          return;
        }
      }

      this.syncViews();
    }, 50); // 20 Hz tick
  }

  onDispose() {
    if (this.tickInterval) {
      this.tickInterval.clear();
      this.tickInterval = null;
    }
  }
}
