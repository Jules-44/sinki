import { describe, it, expect } from 'vitest';
import { parseChatMessage, extractRoomCode } from './chat-tokens.js';

describe('chat-tokens parser', () => {
  it('detects standalone room codes with digits like Y9B8', () => {
    const tokens = parseChatMessage('Join my game Y9B8 now!');
    expect(tokens.some((t) => t.type === 'room' && t.roomCode === 'Y9B8')).toBe(true);
  });

  it('detects invite URLs', () => {
    const tokens = parseChatMessage('Click here: http://localhost:5173?room=7XKP to join');
    expect(tokens.some((t) => t.type === 'room' && t.roomCode === '7XKP')).toBe(true);
  });

  it('detects standalone codes posted as entire message', () => {
    const tokens1 = parseChatMessage('Y9B8');
    expect(tokens1).toHaveLength(1);
    expect(tokens1[0].type).toBe('room');
    expect(tokens1[0].roomCode).toBe('Y9B8');

    const tokens2 = parseChatMessage('http://localhost:5173/?room=ABCD');
    expect(tokens2).toHaveLength(1);
    expect(tokens2[0].type).toBe('room');
    expect(tokens2[0].roomCode).toBe('ABCD');
  });

  it('detects all-letter codes when preceded by keywords like room or join', () => {
    const tokens = parseChatMessage('Head over to room FKLP right now');
    expect(tokens.some((t) => t.type === 'room' && t.roomCode === 'FKLP')).toBe(true);
  });

  it('does not falsely convert common words like THAT, WANT, or PLAY', () => {
    const tokens = parseChatMessage('I want to play that card game');
    expect(tokens.every((t) => t.type === 'text')).toBe(true);
  });
});

describe('extractRoomCode helper', () => {
  it('extracts code from raw strings', () => {
    expect(extractRoomCode('Y9B8')).toBe('Y9B8');
    expect(extractRoomCode('  y9b8  ')).toBe('Y9B8');
    expect(extractRoomCode('[7XKP]')).toBe('7XKP');
  });

  it('extracts code from URLs', () => {
    expect(extractRoomCode('http://localhost:5173/?room=Y9B8')).toBe('Y9B8');
    expect(extractRoomCode('https://sinki.fun/room/7XKP')).toBe('7XKP');
    expect(extractRoomCode('?room=ABCD')).toBe('ABCD');
  });

  it('extracts code from prefix phrases', () => {
    expect(extractRoomCode('room: Y9B8')).toBe('Y9B8');
    expect(extractRoomCode('join table 7XKP')).toBe('7XKP');
  });

  it('returns null for invalid inputs', () => {
    expect(extractRoomCode('')).toBeNull();
    expect(extractRoomCode('hello world this is too long')).toBeNull();
  });
});
