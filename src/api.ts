/**
 * The only place the app talks to n8n.
 * One endpoint, one POST, multipart/form-data (so an image can ride along).
 */
import { MOCK_MODE, REQUEST_TIMEOUT_MS, WEBHOOK_URL } from './config';
import { MockUnauthorized, mockRequest } from './mock';
import type { AgentResponse, Credentials, Draft } from './types';
import { encodeBasicAuth } from './utils';

/** Wrong or expired credentials. The app logs the user out when it sees this. */
export class UnauthorizedError extends Error {}

/** Anything the user can act on: no connection, timeout, bad answer from n8n. */
export class RequestError extends Error {}

interface SendOptions {
  action: 'ping' | 'message' | 'approve';
  credentials: Credentials;
  sessionId: string;
  message?: string;
  draft?: Draft;
  image?: File | null;
}

export async function sendToAgent(options: SendOptions): Promise<AgentResponse> {
  const { action, credentials, sessionId, message, draft, image } = options;

  if (MOCK_MODE) {
    try {
      return await mockRequest(action, credentials.password, message ?? '');
    } catch (error) {
      if (error instanceof MockUnauthorized) throw new UnauthorizedError();
      throw error;
    }
  }

  const body = new FormData();
  body.append('action', action);
  body.append('sessionId', sessionId);
  if (action === 'message') body.append('message', message ?? '');
  if (action === 'approve') body.append('draft', JSON.stringify(draft ?? {}));
  if (image) body.append('image', image, image.name);

  // The agent can take 10-40 s, so the request is aborted only after the configured ceiling.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        // Content-Type is deliberately left out: the browser adds the
        // multipart boundary itself, and setting it by hand breaks the upload.
        Authorization: `Basic ${encodeBasicAuth(credentials.username, credentials.password)}`,
      },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RequestError('Агентът не отговори навреме. Опитай отново.');
    }
    throw new RequestError('Няма връзка със сървъра. Провери интернета и опитай отново.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) {
    throw new RequestError('Сървърът върна грешка. Опитай отново след момент.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new RequestError('Отговорът от сървъра не можа да се прочете. Опитай отново.');
  }

  return normalise(data);
}

/** Guards against a malformed answer so a bad payload never crashes the chat. */
function normalise(data: unknown): AgentResponse {
  if (typeof data !== 'object' || data === null) {
    throw new RequestError('Отговорът от сървъра не можа да се прочете. Опитай отново.');
  }

  const payload = data as Record<string, unknown>;
  const type = payload.type;
  const text = typeof payload.text === 'string' ? payload.text : '';

  switch (type) {
    case 'pong':
      return { type: 'pong' };
    case 'reply':
      return { type: 'reply', text };
    case 'blocked':
      return { type: 'blocked', text: text || 'Заявката беше спряна.' };
    case 'sent':
      return {
        type: 'sent',
        text: text || 'Имейлът е изпратен.',
        poNumber: typeof payload.poNumber === 'string' ? payload.poNumber : undefined,
      };
    case 'draft': {
      // The draft is kept exactly as n8n sent it — extra fields and all —
      // because approving sends the same object straight back. Picking out
      // only the five contract fields here would silently drop the rest.
      const raw = payload.draft;
      const isPlainObject = typeof raw === 'object' && raw !== null && !Array.isArray(raw);
      return {
        type: 'draft',
        text: text || 'Ето черновата.',
        draft: isPlainObject ? (raw as Draft) : {},
      };
    }
    case 'error':
      return { type: 'error', text: text || 'Нещо се обърка. Опитай отново.' };
    default:
      throw new RequestError('Сървърът върна непознат отговор. Опитай отново.');
  }
}
