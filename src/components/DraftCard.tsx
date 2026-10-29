import type { ChatMessage } from '../types';
import { orDash } from '../utils';
import { CheckIcon, PencilIcon } from './Icons';

interface DraftCardProps {
  message: Extract<ChatMessage, { kind: 'draft' }>;
  /** Only the newest draft can still be sent; older ones are read-only. */
  isLatest: boolean;
  onApprove: () => void;
  onRequestChange: () => void;
}

export function DraftCard({ message, isLatest, onApprove, onRequestChange }: DraftCardProps) {
  const { draft, status, poNumber, imageUrl } = message;
  const sent = status === 'sent';
  const sending = status === 'sending';
  const superseded = !isLatest && !sent;
  // Sending the email is irreversible, so the buttons go dead the moment
  // the first click lands and never come back for this card.
  const locked = sent || sending || superseded;

  const titleId = `draft-${message.id}-title`;

  return (
    <article
      className={`draft${sent ? ' draft--sent' : ''}${superseded ? ' draft--superseded' : ''}`}
      aria-labelledby={titleId}
    >
      <header className="draft__header">
        <span className={`badge ${sent ? 'badge--sent' : 'badge--draft'}`}>
          {sent ? 'SENT' : 'DRAFT'}
        </span>
        <h3 className="draft__title" id={titleId}>
          {sent ? 'Изпратен имейл' : 'Чернова на имейл'}
        </h3>
      </header>

      <dl className="draft__rows">
        <div className="draft__row">
          <dt className="draft__key">До</dt>
          <dd className="draft__value mono draft__value--address">{orDash(draft.to)}</dd>
        </div>

        <div className="draft__row">
          <dt className="draft__key">Доставчик</dt>
          <dd className="draft__value">
            {orDash(draft.company)}
            {draft.contactPerson?.trim() && (
              <span className="draft__contact"> · {draft.contactPerson.trim()}</span>
            )}
          </dd>
        </div>

        <div className="draft__row">
          <dt className="draft__key">Тема</dt>
          <dd className="draft__value mono">{orDash(draft.subject)}</dd>
        </div>

        <div className="draft__row draft__row--body">
          <dt className="draft__key">Текст</dt>
          <dd className="draft__value draft__body">{orDash(draft.body)}</dd>
        </div>

        {imageUrl && (
          <div className="draft__row">
            <dt className="draft__key">Прикачен файл</dt>
            <dd className="draft__value">
              <img className="draft__attachment" src={imageUrl} alt="Прикачена снимка на артикула" />
            </dd>
          </div>
        )}
      </dl>

      {sent ? (
        <p className="draft__status draft__status--sent">
          <CheckIcon size={18} />
          <span>
            Имейлът е изпратен
            {poNumber && <> · <span className="mono">{poNumber}</span></>}
          </span>
        </p>
      ) : superseded ? (
        <p className="draft__status draft__status--superseded">Заменена от по-нова чернова</p>
      ) : (
        <>
          <div className="draft__actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={onApprove}
              disabled={locked}
              aria-busy={sending}
            >
              {sending ? 'Изпраща се…' : 'Изпрати имейла'}
            </button>
            <button
              className="btn btn--secondary"
              type="button"
              onClick={onRequestChange}
              disabled={locked}
            >
              <PencilIcon size={18} />
              Поискай корекция
            </button>
          </div>
          <p className="draft__hint">
            Имейлът тръгва само след натискане на „Изпрати имейла“.
          </p>
        </>
      )}
    </article>
  );
}
