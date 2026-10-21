import type { GameDefinition } from '@sinki/platform-core';
import { luckyDrawGame } from './lucky-draw.js';
import { convoyRaidGame } from './convoy-raid.js';
import { lowPolyIslandGame } from './lowpolyisland.js';

const games = new Map<string, GameDefinition>();

export function registerGame(game: GameDefinition) {
  games.set(game.id, game);
}

export function getGame(id: string): GameDefinition | undefined {
  return games.get(id);
}

export function listAvailableGames(): { id: string; name: string; description?: string }[] {
  return Array.from(games.values()).map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
  }));
}

// Register default games
registerGame(luckyDrawGame);
registerGame(convoyRaidGame);
registerGame(lowPolyIslandGame);
