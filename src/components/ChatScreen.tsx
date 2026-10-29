import { useEffect, useRef, useState } from 'react';
import { RequestError, UnauthorizedError, sendToAgent } from '../api';
import { MOCK_MODE } from '../config';
import type { AgentResponse, ChatMessage, Credentials, PendingRequest } from '../types';
import { newId } from '../utils';
import { Composer } from './Composer';
import { DraftCard } from './DraftCard';
import { AgentFrame, Message, TypingIndicator } from './Message';
import { LogOutIcon, PlusIcon } from './Icons';
import { Logo } from './Logo';

interface ChatScreenProps {
  credentials: Credentials;
  sessionId: string;
  /** Clears the transcript and hands back a brand new sessionId. */
  onNewOrder: () => void;
  onLogout: () => void;
  /** Called on HTTP 401 so the app returns to the login screen. */
  onSessionExpired: () => void;
}

const EXAMPLE_PROMPTS = [
  'Напиши имейл на Филип и заяви 20 SSD диска 1TB с доставка в петък. Искай писмено потвърждение.',
  'Поръчай 100 химикалки от ОфисПлюс с доставка утре.',
  'Заяви 5 броя от артикула на снимката към ПериферияБГ, доставка следващия понеделник.',
];

const DEFAULT_PLACEHOLDER = 'Опиши поръчката…';
const CORRECTION_PLACEHOLDER = 'Какво да променя?';

export function ChatScreen({
  credentials,
  sessionId,
  onNewOrder,
  onLogout,
  onSessionExpired,
}: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);

  // The last image attached in this session. n8n needs it again on approval,
  // so it outlives the message it was sent with.
  const lastImageRef = useRef<File | null>(null);
  const lastImageUrlRef = useRef<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  function append(message: ChatMessage) {
    setMessages((current) => [...current, message]);
  }

  function pushError(text: string, retry: PendingRequest | null) {
    append({ id: newId(), at: Date.now(), author: 'system', kind: 'error', text, retry });
  }

  function setMessageStatus(id: string, status: 'draft' | 'sending' | 'sent') {
    setMessages((current) =>
      current.map((message) =>
        message.id === id && message.kind === 'draft' ? { ...message, status } : message,
      ),
    );
  }

  /** Turns one agent answer into chat rows. Shared by send and retry. */
  function applyResponse(response: AgentResponse, retry: PendingRequest) {
    const at = Date.now();
    switch (response.type) {
      case 'reply':
        append({ id: newId(), at, author: 'agent', kind: 'reply', text: response.text });
        break;
      case 'blocked':
        append({ id: newId(), at, author: 'agent', kind: 'blocked', text: response.text });
        break;
      case 'draft':
        append({
          id: newId(),
          at,
          author: 'agent',
          kind: 'draft',
          text: response.text,
          draft: response.draft,
          status: 'draft',
          imageUrl: lastImageUrlRef.current ?? undefined,
        });
        break;
      case 'error':
        pushError(response.text, retry);
        break;
      default:
        pushError('Сървърът върна непознат отговор. Опитай отново.', retry);
    }
  }

  async function runMessage(text: string, image: File | null, echo: boolean) {
    const retry: PendingRequest = { action: 'message', text, image };

    if (image) {
      // The session keeps the newest image; the old preview URL is released.
      if (lastImageUrlRef.current) URL.revokeObjectURL(lastImageUrlRef.current);
      lastImageRef.current = image;
      lastImageUrlRef.current = URL.createObjectURL(image);
    }

    if (echo) {
      append({
        id: newId(),
        at: Date.now(),
        author: 'user',
        kind: 'text',
        text,
        imageUrl: image ? (lastImageUrlRef.current ?? undefined) : undefined,
        imageName: image?.name,
      });
    }

    setBusy(true);
    setPlaceholder(DEFAULT_PLACEHOLDER);
    try {
      const response = await sendToAgent({
        action: 'message',
        credentials,
        sessionId,
        message: text,
        image,
      });
      applyResponse(response, retry);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        onSessionExpired();
        return;
      }
      pushError(
        error instanceof RequestError ? error.message : 'Нещо се обърка. Опитай отново.',
        retry,
      );
    } finally {
      setBusy(false);
    }
  }

  async function runApprove(draftMessageId: string) {
    // The session image goes along again; the draft itself does not, because
    // n8n loads the approved draft from its own database.
    const image = lastImageRef.current;
    const retry: PendingRequest = { action: 'approve', draftMessageId };

    setMessageStatus(draftMessageId, 'sending');
    setBusy(true);
    try {
      const response = await sendToAgent({
        action: 'approve',
        credentials,
        sessionId,
        image,
      });

      if (response.type === 'sent') {
        setMessages((current) =>
          current.map((message) =>
            message.id === draftMessageId && message.kind === 'draft'
              ? { ...message, status: 'sent', poNumber: response.poNumber }
              : message,
          ),
        );
        append({
          id: newId(),
          at: Date.now(),
          author: 'agent',
          kind: 'reply',
          text: response.poNumber
            ? `${response.text}\nНомер на поръчката: ${response.poNumber}`
            : response.text,
        });
        return;
      }

      // Anything other than "sent" means the email did not go out.
      setMessageStatus(draftMessageId, 'draft');
      applyResponse(response, retry);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        onSessionExpired();
        return;
      }
      setMessageStatus(draftMessageId, 'draft');
      pushError(
        error instanceof RequestError
          ? `${error.message} Имейлът не е изпратен.`
          : 'Имейлът не беше изпратен. Опитай отново.',
        retry,
      );
    } finally {
      setBusy(false);
    }
  }

  function handleRetry(errorMessage: Extract<ChatMessage, { kind: 'error' }>) {
    const retry = errorMessage.retry;
    if (!retry || busy) return;
    // Drop the failed attempt so the transcript does not fill up with dead ends.
    setMessages((current) => current.filter((message) => message.id !== errorMessage.id));
    if (retry.action === 'message') {
      void runMessage(retry.text, retry.image, false);
    } else {
      void runApprove(retry.draftMessageId);
    }
  }

  function requestCorrection() {
    setPlaceholder(CORRECTION_PLACEHOLDER);
    textareaRef.current?.focus();
  }

  function useExample(prompt: string) {
    const node = textareaRef.current;
    if (!node) return;
    // Fill the composer instead of sending, so the text can still be edited.
    // React tracks the textarea value itself, so the native setter is used and
    // an input event is dispatched to keep React's state in sync.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    setter?.call(node, prompt);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.focus();
  }

  // Only the newest draft keeps live buttons.
  const latestDraftId = [...messages].reverse().find((message) => message.kind === 'draft')?.id;

  return (
    <div className="app">
      <header className="appbar">
        <a className="skip-link" href="#main">Към разговора</a>
        <div className="appbar__brand">
          <Logo variant="row" />
          {MOCK_MODE && <span className="badge badge--mock">MOCK</span>}
        </div>
        <div className="appbar__actions">
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={onNewOrder}
            title="Нова поръчка"
          >
            <PlusIcon size={18} />
            <span className="btn__label">Нова поръчка</span>
          </button>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={onLogout}
            title="Изход"
          >
            <LogOutIcon size={18} />
            <span className="btn__label">Изход</span>
          </button>
        </div>
      </header>

      <main className="chat" id="main">
        <h1 className="sr-only">Заявки към доставчици</h1>
        <div className={`chat__scroll${messages.length === 0 && !busy ? ' chat__scroll--empty' : ''}`}>
          <div className="chat__column">
            {messages.length === 0 && !busy && (
              <section className="empty" aria-labelledby="empty-title">
                <h2 className="empty__title" id="empty-title">Опиши поръчката с думи</h2>
                <p className="empty__lede">
                  Напиши какво трябва да се заяви и от кого. Агентът намира доставчика,
                  пита, ако нещо липсва, и връща готова чернова на имейл. Нищо не се
                  изпраща, преди да я одобриш.
                </p>
                <p className="empty__label">Примери</p>
                <ul className="empty__examples">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <li key={prompt}>
                      <button className="example" type="button" onClick={() => useExample(prompt)}>
                        {prompt}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* The list is always in the DOM, so a screen reader announces each
                new answer as it arrives rather than only after the first one. */}
            <div className="chat__messages" aria-live="polite">
              {messages.map((message) =>
                  message.kind === 'draft' ? (
                    <AgentFrame key={message.id} at={message.at}>
                      {message.text && <p className="msg__text">{message.text}</p>}
                      <DraftCard
                        message={message}
                        isLatest={message.id === latestDraftId}
                        onApprove={() => void runApprove(message.id)}
                        onRequestChange={requestCorrection}
                      />
                    </AgentFrame>
                  ) : (
                    <Message key={message.id} message={message} onRetry={handleRetry} />
                  ),
              )}
              {busy && <TypingIndicator />}
            </div>
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="chat__dock">
          <div className="chat__column">
            <Composer
              busy={busy}
              onSend={(text, image) => void runMessage(text, image, true)}
              textareaRef={textareaRef}
              placeholder={placeholder}
            />
            <p className="footer">
              <span className="mono">samkobuilds.hardware · Orders Processor</span>
              <span className="mono footer__session" title="ID на сесията в n8n">
                {sessionId.slice(0, 8)}
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
