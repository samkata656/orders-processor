/** Small helpers shared across the app. */

/**
 * Base64 for the Authorization header.
 * btoa() throws on anything outside Latin-1, and Bulgarian passwords are UTF-8,
 * so the string is turned into bytes first and only then encoded.
 */
export function encodeBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** A random id. crypto.randomUUID needs HTTPS or localhost, so there is a fallback. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** 14:05 — used for message timestamps. */
export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('bg-BG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Renders a draft field as text, showing "—" when n8n leaves it out.
 * A draft now carries whatever fields n8n sends, so a value may not be a
 * string at all; anything unusable becomes a dash rather than a crash.
 */
export function orDash(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = typeof value === 'string' ? value : String(value);
  return text.trim() === '' ? '—' : text.trim();
}

/** Waits, used by mock mode to imitate the agent thinking. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
