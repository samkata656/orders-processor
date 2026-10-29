/** The email draft the n8n agent proposes. Any field may be missing, so all are optional. */
export interface Draft {
  to?: string;
  subject?: string;
  body?: string;
  company?: string;
  contactPerson?: string;
}

/** The shapes n8n can answer with. Anything else is treated as an error. */
export type AgentResponse =
  | { type: 'pong' }
  | { type: 'reply'; text: string }
  | { type: 'draft'; text: string; draft: Draft }
  | { type: 'blocked'; text: string }
  | { type: 'sent'; text: string; poNumber?: string }
  | { type: 'error'; text: string };

/** Username + password, kept in sessionStorage only for the life of the tab. */
export interface Credentials {
  username: string;
  password: string;
}

/** What the user asked for, kept so the "Опитай отново" button can repeat it. */
export type PendingRequest =
  | { action: 'message'; text: string; image: File | null }
  | { action: 'approve'; draft: Draft; image: File | null; draftMessageId: string };

/** One row in the chat transcript. */
export type ChatMessage =
  | {
      id: string;
      at: number;
      author: 'user';
      kind: 'text';
      text: string;
      /** Object URL for the attached image thumbnail, if any. */
      imageUrl?: string;
      imageName?: string;
    }
  | { id: string; at: number; author: 'agent'; kind: 'reply'; text: string }
  | { id: string; at: number; author: 'agent'; kind: 'blocked'; text: string }
  | {
      id: string;
      at: number;
      author: 'agent';
      kind: 'draft';
      text: string;
      draft: Draft;
      /** 'draft' = awaiting approval, 'sending' = approve in flight, 'sent' = email gone out. */
      status: 'draft' | 'sending' | 'sent';
      poNumber?: string;
      /** Thumbnail of the image attached to this session, re-sent on approval. */
      imageUrl?: string;
    }
  | {
      id: string;
      at: number;
      author: 'system';
      kind: 'error';
      text: string;
      /** The request to repeat when the user presses "Опитай отново". */
      retry: PendingRequest | null;
    };
