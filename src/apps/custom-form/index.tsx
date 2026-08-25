/**
  Custom Form App Example Implementation

  Demonstrates capturing form submissions without Duda's native Form widget.
  Duda never stores or sees this data. Submits to your own backend
  (worker/src/routes/custom-form.ts), which relays to a separate
  form-capture-backend service after honeypot/timing/validation checks.

  Expected props (passed by DM via init()):
    apiBaseUrl        {string}  URL of your hosted backend e.g. 'https://my-worker.example.com'
                                 Falls back to VITE_API_BASE_URL if unset (see src/lib/api.ts)
    submitButtonLabel {string}  optional, default 'Send'
    successMessage    {string}  optional, default 'Thanks, we got your message.'
    onError           {function} optional, called when the submission fetch fails
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import api, { setBaseURL } from 'src/lib/api';
import styles from './app.module.css';
import ErrorBoundary from './ErrorBoundary';

// Mirrored (not shared) in worker/src/routes/custom-form.ts and
// form-capture-backend's src/routes/submissions.ts — this copy is
// client-side UX only, not a security boundary.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// No human fills a 3-field form this fast. Treated as a bot, same as the honeypot tripping.
const MIN_ELAPSED_MS = 1500;

interface CustomFormAppProps {
  apiBaseUrl?: string;
  submitButtonLabel?: string;
  successMessage?: string;
  onError?: (err: unknown) => void;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

function CustomFormAppInner({
  apiBaseUrl,
  submitButtonLabel = 'Send',
  successMessage = 'Thanks, we got your message.',
  onError,
}: CustomFormAppProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot, real users never see or fill this
  const [status, setStatus] = useState<Status>('idle');
  const [fieldError, setFieldError] = useState<string | null>(null);
  // useState's lazy initializer runs Date.now() exactly once. useRef's
  // argument would re-run it every render.
  const [mountedAt] = useState(() => Date.now());
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    try {
      const { protocol } = new URL(apiBaseUrl);
      if (protocol === 'http:' || protocol === 'https:') {
        setBaseURL(apiBaseUrl);
      }
    } catch {
      // invalid URL, fall back to build-time VITE_API_BASE_URL
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  function validate(): string | null {
    if (!name.trim()) return 'Please enter your name.';
    if (!EMAIL_PATTERN.test(email.trim())) return 'Please enter a valid email address.';
    if (message.trim().length < 10) return 'Please enter a message of at least 10 characters.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError(null);

    // Honeypot/timing check, client-side only, purely cosmetic — the server
    // never sees these fields. Real enforcement is rate limiting and field
    // validation in worker/src/routes/custom-form.ts.
    const elapsedMs = Date.now() - mountedAt;
    if (company.trim() || elapsedMs < MIN_ELAPSED_MS) {
      setStatus('success');
      return;
    }

    setStatus('submitting');
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      await api.post(
        '/custom-form/submit',
        { name: name.trim(), email: email.trim(), message: message.trim() },
        { signal: controller.signal }
      );
      setStatus('success');
    } catch (err) {
      if ((err instanceof Error || err instanceof DOMException) && err.name === 'AbortError') return;
      console.error(err);
      onError?.(err);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.app}>
        <p role="status">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="cf-name">Name</label>
          <input
            id="cf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'submitting'}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="cf-email">Email</label>
          <input
            id="cf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="cf-message">Message</label>
          <textarea
            id="cf-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'submitting'}
          />
        </div>

        {/* Honeypot, hidden off-screen rather than display:none since some bots skip that. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="cf-company">Company website</label>
          <input
            id="cf-company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        {fieldError && <p role="alert">{fieldError}</p>}
        {status === 'error' && <p role="alert">Something went wrong. Please try again.</p>}

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : submitButtonLabel}
        </button>
      </form>
    </div>
  );
}

export default function CustomFormApp(props: CustomFormAppProps) {
  return (
    <ErrorBoundary onError={props.onError}>
      <CustomFormAppInner {...props} />
    </ErrorBoundary>
  );
}
