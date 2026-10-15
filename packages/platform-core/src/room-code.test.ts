import { describe, it, expect } from 'vitest';
import { generateRoomCode, sanitizeRoomCode } from './room-code.js';

describe('room-code', () => {
  it('generates a 4-letter code by default', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('sanitizes input properly', () => {
    expect(sanitizeRoomCode('  a-b-c-d  ')).toBe('ABCD');
    expect(sanitizeRoomCode('w9x2!')).toBe('W9X2');
  });
});
