export interface ChatToken {
  type: 'text' | 'room';
  content: string;
  roomCode?: string;
}

/**
 * Extracts a valid room code (4-6 uppercase chars) from any input:
 * - Direct codes: "Y9B8", "y9b8", "  7xkp  ", "[Y9B8]", "#Y9B8"
 * - URLs: "http://localhost:5173/?room=Y9B8", "?room=7XKP", "/room/Y9B8"
 * - Prefixed strings: "room: Y9B8", "table Y9B8", "code 7XKP", "join Y9B8"
 */
export function extractRoomCode(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. URL with query parameter: ?room=CODE or &room=CODE
  const queryMatch = trimmed.match(/[?&]room=([A-Za-z0-9]{4,6})/i);
  if (queryMatch) return queryMatch[1].toUpperCase();

  // 2. URL or path with /room/CODE or /table/CODE
  const pathMatch = trimmed.match(/(?:\/room\/|\/table\/)([A-Za-z0-9]{4,6})/i);
  if (pathMatch) return pathMatch[1].toUpperCase();

  // 3. Prefixed code: "room: CODE", "table CODE", "join table CODE", "join CODE"
  const prefixMatch = trimmed.match(/(?:join|table|room|code|in|at)\s+(?:table|room|code|in|at\s+)*[:#-]?\s*([A-Za-z0-9]{4,6})/i) 
    || trimmed.match(/(?:room|table|code|join)\s*[:#-]?\s*([A-Za-z0-9]{4,6})/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].toUpperCase();
    if (!PREFIX_KEYWORDS.has(candidate) && candidate !== 'TABLE') {
      return candidate;
    }
  }

  // 4. Standalone code stripped of punctuation/brackets/quotes
  const cleaned = trimmed.replace(/^[#:[\]()"'`]+|[.,!?;:[\]()"'`]+$/g, '').toUpperCase();
  if (/^[A-Z0-9]{4,6}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

const PREFIX_KEYWORDS = new Set(['ROOM', 'ROOM:', 'TABLE', 'TABLE:', 'CODE', 'CODE:', 'JOIN', 'AT', '#']);

/**
 * Parses a chat message into text tokens and clickable room tokens.
 * Accurately detects:
 * - URLs containing room=CODE or /room/CODE
 * - Codes with digits (e.g. Y9B8, 7XKP)
 * - All-letter codes when preceded by keywords (e.g. "room FKLP", "join XKRP")
 * - Standalone messages that are just the room code
 * - Prevents false positives on normal English 4-letter words (PLAY, THAT, WANT, etc.)
 */
export function parseChatMessage(text: string): ChatToken[] {
  if (!text) return [];

  const trimmed = text.trim();

  // If the entire message is just a room code or room URL
  const standaloneCode = extractRoomCode(trimmed);
  if (standaloneCode && (trimmed.length <= 8 || trimmed.startsWith('http') || trimmed.startsWith('?'))) {
    return [
      {
        type: 'room',
        content: `Join Room ${standaloneCode}`,
        roomCode: standaloneCode,
      },
    ];
  }

  const parts = text.split(/(\s+)/);
  const tokens: ChatToken[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || /^\s+$/.test(part)) {
      tokens.push({ type: 'text', content: part });
      continue;
    }

    // 1. Check if this part is a URL containing a room code
    const urlMatch = part.match(/(?:[?&]room=|\/(?:room|table)\/)([A-Za-z0-9]{4,6})/i);
    if (urlMatch) {
      const code = urlMatch[1].toUpperCase();
      tokens.push({
        type: 'room',
        content: `Join Room ${code}`,
        roomCode: code,
      });
      continue;
    }

    // 2. Clean surrounding punctuation
    const cleaned = part.replace(/^[#:[\]()"'`]+|[.,!?;:[\]()"'`]+$/g, '').toUpperCase();

    if (/^[A-Z0-9]{4,6}$/.test(cleaned)) {
      const hasDigit = /\d/.test(cleaned);

      // Check if previous non-whitespace token was a prefix keyword like "room", "table", "join"
      let prevKeyword = false;
      for (let j = i - 1; j >= 0; j--) {
        const p = parts[j].trim().toUpperCase();
        if (p) {
          if (PREFIX_KEYWORDS.has(p)) {
            prevKeyword = true;
          }
          break;
        }
      }

      // If it contains a digit (like Y9B8, 7XKP) or was explicitly prefixed with "room"/"join"
      if (!PREFIX_KEYWORDS.has(cleaned) && (hasDigit || prevKeyword)) {
        const leadMatch = part.match(/^[#:[\]()"'`]+/);
        const trailMatch = part.match(/[.,!?;:[\]()"'`]+$/);
        const lead = leadMatch ? leadMatch[0] : '';
        const trail = trailMatch ? trailMatch[0] : '';

        if (lead) tokens.push({ type: 'text', content: lead });
        tokens.push({
          type: 'room',
          content: `Join ${cleaned}`,
          roomCode: cleaned,
        });
        if (trail) tokens.push({ type: 'text', content: trail });
        continue;
      }
    }

    tokens.push({ type: 'text', content: part });
  }

  return tokens;
}
