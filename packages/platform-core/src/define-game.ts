import type { GameDefinition } from './types.js';

export function defineGame<TState, TAction, TPlayerView>(
  def: GameDefinition<TState, TAction, TPlayerView>
): GameDefinition<TState, TAction, TPlayerView> {
  if (!def.id) {
    throw new Error('Game definition must have an id');
  }
  if (!def.name) {
    throw new Error('Game definition must have a name');
  }
  if (!def.players || def.players.min < 1 || def.players.max < def.players.min) {
    throw new Error(`Invalid player configuration for game ${def.id}`);
  }
  return def;
}
