import { useState } from 'react';
import { ChatScreen } from './components/ChatScreen';
import { LoginScreen } from './components/LoginScreen';
import type { Credentials } from './types';
import { newId } from './utils';

/**
 * Credentials live in sessionStorage, not localStorage: closing the tab logs
 * the employee out. n8n is what actually checks them — nothing is validated here.
 */
const STORAGE_KEY = 'samkobuilds.orders-processor.credentials';

function readStoredCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (typeof parsed.username === 'string' && typeof parsed.password === 'string') {
      return { username: parsed.username, password: parsed.password };
    }
  } catch {
    // Private-mode browsers can block sessionStorage; the login screen just reappears.
  }
  return null;
}

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(readStoredCredentials);
  const [sessionId, setSessionId] = useState<string>(newId);
  const [notice, setNotice] = useState<string | null>(null);

  function handleAuthenticated(next: Credentials) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sign-in still works for this tab even if storage is unavailable.
    }
    setNotice(null);
    setCredentials(next);
  }

  function clearCredentials() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
    setCredentials(null);
    // A fresh conversation id, so the next login is a new run in the n8n log.
    setSessionId(newId());
  }

  if (!credentials) {
    return (
      <LoginScreen
        onAuthenticated={handleAuthenticated}
        notice={notice}
        sessionId={sessionId}
      />
    );
  }

  return (
    <ChatScreen
      // Remounting on a new sessionId is what clears the transcript.
      key={sessionId}
      credentials={credentials}
      sessionId={sessionId}
      onNewOrder={() => setSessionId(newId())}
      onLogout={clearCredentials}
      onSessionExpired={() => {
        setNotice('Сесията изтече. Влез отново.');
        clearCredentials();
      }}
    />
  );
}
