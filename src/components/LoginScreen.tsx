import { useRef, useState, type FormEvent } from 'react';
import { RequestError, UnauthorizedError, sendToAgent } from '../api';
import { MOCK_MODE } from '../config';
import type { Credentials } from '../types';
import { Logo } from './Logo';
import { AlertIcon } from './Icons';

interface LoginScreenProps {
  /** Called once n8n has answered "pong" for these credentials. */
  onAuthenticated: (credentials: Credentials) => void;
  /** A one-off message carried over from the chat screen, e.g. an expired session. */
  notice?: string | null;
  /** A fresh sessionId is needed for the ping so n8n logs it like any other run. */
  sessionId: string;
}

type FieldState = 'pristine' | 'touched';

export function LoginScreen({ onAuthenticated, notice, sessionId }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameState, setUsernameState] = useState<FieldState>('pristine');
  const [passwordState, setPasswordState] = useState<FieldState>('pristine');
  const [formError, setFormError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // A field only counts as invalid after it has been left once, so nothing
  // turns red while the first character is still being typed.
  const usernameError = usernameState === 'touched' && username.trim() === ''
    ? 'Въведи потребителско име.'
    : null;
  const passwordError = passwordState === 'touched' && password === ''
    ? 'Въведи парола.'
    : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    // The submit button is never disabled, so an incomplete form is caught here
    // and the first empty field is focused instead of the click doing nothing.
    setUsernameState('touched');
    setPasswordState('touched');
    if (username.trim() === '') {
      usernameRef.current?.focus();
      return;
    }
    if (password === '') {
      passwordRef.current?.focus();
      return;
    }

    const credentials: Credentials = { username: username.trim(), password };
    setBusy(true);
    setFormError(null);

    try {
      const response = await sendToAgent({ action: 'ping', credentials, sessionId });
      if (response.type === 'pong') {
        onAuthenticated(credentials);
        return;
      }
      setFormError('Сървърът отговори неочаквано. Опитай отново.');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        // The username stays, so only the password has to be retyped.
        setPassword('');
        setPasswordState('pristine');
        setFormError('Грешно потребителско име или парола.');
        passwordRef.current?.focus();
      } else if (error instanceof RequestError) {
        setFormError(error.message);
      } else {
        setFormError('Няма връзка със сървъра. Опитай отново.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login" id="main">
      <section className="login__card" aria-labelledby="login-title">
        <div className="login__brand">
          <Logo variant="stack" />
        </div>

        <p className="eyebrow login__eyebrow">ORDERS PROCESSOR</p>
        <h1 className="login__title" id="login-title">Вход</h1>
        <p className="login__lede">
          Заявки към доставчици, написани и изпратени от едно място.
        </p>

        {formError && (
          <p className="notice notice--error" role="alert">
            <AlertIcon size={18} />
            <span>{formError}</span>
          </p>
        )}

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="username">Потребителско име</label>
            <input
              className={`input${usernameError ? ' input--invalid' : ''}`}
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              ref={usernameRef}
              value={username}
              aria-invalid={usernameError ? true : undefined}
              aria-describedby={usernameError ? 'username-error' : undefined}
              onChange={(event) => {
                setUsername(event.target.value);
                // Correcting a field clears its error straight away.
                if (usernameError) setUsernameState('pristine');
              }}
              onFocus={() => { if (usernameError) setUsernameState('pristine'); }}
              onBlur={() => setUsernameState('touched')}
            />
            {usernameError && (
              <p className="field__error" id="username-error" role="alert">{usernameError}</p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">Парола</label>
            <input
              className={`input${passwordError ? ' input--invalid' : ''}`}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              ref={passwordRef}
              value={password}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordState('pristine');
              }}
              onFocus={() => { if (passwordError) setPasswordState('pristine'); }}
              onBlur={() => setPasswordState('touched')}
            />
            {passwordError && (
              <p className="field__error" id="password-error" role="alert">{passwordError}</p>
            )}
          </div>

          <button className="btn btn--primary btn--block" type="submit" aria-busy={busy}>
            {busy ? 'Проверява се…' : 'Влез'}
          </button>
        </form>

        {MOCK_MODE && (
          <p className="login__mock">
            <span className="badge badge--mock">MOCK</span>
            Демо режим: всяко име и парола работят, освен паролата <code>wrong</code>.
          </p>
        )}
      </section>

      <p className="footer footer--login">
        <span className="mono">samkobuilds.hardware · Orders Processor</span>
      </p>
    </main>
  );
}
