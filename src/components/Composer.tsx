import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from 'react';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../config';
import { CloseIcon, PaperclipIcon, SendIcon } from './Icons';

interface ComposerProps {
  /** True while the agent is answering: sending is paused until it replies. */
  busy: boolean;
  onSend: (text: string, image: File | null) => void;
  /** Owned by the chat screen so "Поискай корекция" can move focus here. */
  textareaRef: RefObject<HTMLTextAreaElement>;
  placeholder: string;
}

const MAX_TEXTAREA_HEIGHT = 168;

export function Composer({ busy, onSend, textareaRef, placeholder }: ComposerProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The preview URL points at browser memory, so it is released whenever it changes.
  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  // The textarea grows with the text and stops at a fixed ceiling, after which it scrolls.
  function resize() {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  useEffect(resize, [text, textareaRef]);

  function clearImage() {
    setImage(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setFileError('Прикачи снимка във формат JPG, PNG или WEBP.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError('Снимката е над 5 MB. Прикачи по-малък файл.');
      event.target.value = '';
      return;
    }

    setFileError(null);
    setImage(file);
  }

  function submit() {
    const trimmed = text.trim();
    if (busy || (trimmed === '' && !image)) return;
    onSend(trimmed, image);
    setText('');
    clearImage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
      return;
    }
    // Esc drops the attached image without touching the typed text.
    if (event.key === 'Escape' && image) {
      event.preventDefault();
      clearImage();
    }
  }

  const nothingToSend = text.trim() === '' && !image;

  return (
    <div className="composer">
      {image && previewUrl && (
        <div className="chip">
          <img className="chip__thumb" src={previewUrl} alt="" />
          <span className="chip__name">{image.name}</span>
          <button
            className="icon-btn icon-btn--sm"
            type="button"
            onClick={clearImage}
            title="Премахни снимката (Esc)"
          >
            <CloseIcon size={16} />
            <span className="sr-only">Премахни снимката</span>
          </button>
        </div>
      )}

      {fileError && (
        <p className="notice notice--error notice--inline" role="alert">{fileError}</p>
      )}

      <form
        className="composer__bar"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {/* The field is named by the visible word "Съобщение" in the hint line
            below, so the name stays on screen instead of only in the markup. */}
        <textarea
          className="composer__input"
          id="composer-input"
          aria-labelledby="composer-name"
          ref={textareaRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
        />

        <input
          className="sr-only composer__file"
          ref={fileInputRef}
          id="composer-file"
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleFile}
          disabled={busy || image !== null}
        />
        <label
          className={`icon-btn composer__attach${busy || image ? ' is-disabled' : ''}`}
          htmlFor="composer-file"
          title={image ? 'Вече има прикачена снимка' : 'Прикачи снимка'}
        >
          <PaperclipIcon />
          <span className="sr-only">Прикачи снимка</span>
        </label>

        <button
          className="icon-btn icon-btn--send"
          type="submit"
          disabled={busy || nothingToSend}
          title="Изпрати (Enter)"
        >
          <SendIcon />
          <span className="sr-only">Изпрати</span>
        </button>
      </form>

      <p className="composer__hint">
        <span className="composer__name" id="composer-name">Съобщение</span>
        {' · '}
        <kbd>Enter</kbd> изпраща · <kbd>Shift</kbd>+<kbd>Enter</kbd> нов ред
      </p>
    </div>
  );
}
