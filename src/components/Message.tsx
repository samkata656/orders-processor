import type { ReactNode } from 'react';
import type { ChatMessage } from '../types';
import { formatTime } from '../utils';
import { Logo } from './Logo';
import { AlertIcon, RetryIcon, ShieldIcon } from './Icons';

interface MessageProps {
  message: ChatMessage;
  onRetry: (message: Extract<ChatMessage, { kind: 'error' }>) => void;
}

/**
 * Agent answers can contain line breaks and simple bullet lists. The text is
 * rendered as plain text (CSS keeps the line breaks), never as HTML, so nothing
 * coming back from n8n can inject markup into the page.
 */
export function Message({ message, onRetry }: MessageProps) {
  const time = formatTime(message.at);

  if (message.author === 'user') {
    return (
      <div className="msg msg--user">
        <div className="msg__bubble">
          {message.imageUrl && (
            <img
              className="msg__image"
              src={message.imageUrl}
              alt={message.imageName ? `Прикачена снимка: ${message.imageName}` : 'Прикачена снимка'}
            />
          )}
          {message.text && <p className="msg__text">{message.text}</p>}
        </div>
        <time className="msg__time mono" dateTime={new Date(message.at).toISOString()}>{time}</time>
      </div>
    );
  }

  if (message.author === 'system') {
    return (
      <div className="msg msg--system">
        <div className="notice notice--error notice--block" role="alert">
          <AlertIcon size={18} />
          <div className="notice__content">
            <p>{message.text}</p>
            {message.retry && (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => onRetry(message)}>
                <RetryIcon size={16} />
                Опитай отново
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const blocked = message.kind === 'blocked';

  return (
    <div className="msg msg--agent">
      <div className="msg__avatar" aria-hidden="true">
        <Logo variant="mark" />
      </div>
      <div className="msg__body">
        {blocked && (
          <p className="blocked__head">
            <span className="badge badge--blocked">BLOCKED</span>
            <ShieldIcon size={18} />
          </p>
        )}
        <p className={`msg__text${blocked ? ' msg__text--blocked' : ''}`}>{message.text}</p>
        {blocked && (
          <p className="blocked__note">
            Заявката не беше изпълнена. Опиши поръчката с обикновени думи и опитай пак.
          </p>
        )}
        <time className="msg__time mono" dateTime={new Date(message.at).toISOString()}>{time}</time>
      </div>
    </div>
  );
}

/**
 * The avatar-plus-body frame used by every agent row. Exported so the draft
 * card can sit in exactly the same column as ordinary agent replies.
 */
export function AgentFrame({ at, children }: { at: number; children: ReactNode }) {
  return (
    <div className="msg msg--agent">
      <div className="msg__avatar" aria-hidden="true">
        <Logo variant="mark" />
      </div>
      <div className="msg__body">
        {children}
        <time className="msg__time mono" dateTime={new Date(at).toISOString()}>{formatTime(at)}</time>
      </div>
    </div>
  );
}

/** Shown while the agent is working. Paired with text so it is not motion-only. */
export function TypingIndicator() {
  return (
    <div className="msg msg--agent">
      <div className="msg__avatar" aria-hidden="true">
        <Logo variant="mark" />
      </div>
      <div className="msg__body">
        <p className="typing">
          <span className="typing__dots" aria-hidden="true">
            <span /><span /><span />
          </span>
          Агентът мисли…
        </p>
        <div className="skeleton" aria-hidden="true">
          <span className="skeleton__line" />
          <span className="skeleton__line skeleton__line--short" />
        </div>
      </div>
    </div>
  );
}
