import { Hono } from 'hono';
import type { Env } from '../env';

// Relays to form-capture-backend, a separate repo. Duda never sees this data.
//
// No inbound auth on this route. A Content Editor field can't stay secret in
// a browser-rendered widget, so it wouldn't gate anything real.
//
// The widget's honeypot check is client-side only. Field validation and the
// rate limiter in index.ts are the real protection here.
const app = new Hono<{ Bindings: Env }>();

// Mirrored (not shared — separate repos) in form-capture-backend's
// src/routes/submissions.ts and this repo's src/apps/custom-form/index.tsx.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 320;
const MAX_MESSAGE_LENGTH = 2000;

interface SubmitBody {
  name?: string;
  email?: string;
  message?: string;
}

app.post('/submit', async (c) => {
  const body = await c.req.json<SubmitBody>().catch(() => ({}) as SubmitBody);

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email || !message) {
    return c.json({ error: 'name, email, and message are required' }, 400);
  }
  if (name.length > MAX_NAME_LENGTH) return c.json({ error: 'name is too long' }, 400);
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return c.json({ error: 'email is invalid' }, 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) return c.json({ error: 'message is too long' }, 400);

  // Origin doesn't survive the worker-to-worker relay. Derive it here from
  // the real browser Origin before forwarding.
  let siteHost = 'unknown';
  const origin = c.req.header('Origin') ?? c.req.header('Referer');
  if (origin) {
    try {
      siteHost = new URL(origin).hostname;
    } catch {
      // leave as 'unknown'
    }
  }

  try {
    const response = await fetch(`${c.env.FORM_BACKEND_URL}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.FORM_BACKEND_TOKEN}`,
        'Content-Type': 'application/json',
        // CF-Connecting-IP on form-capture-backend's side of this relay is
        // Cloudflare's own egress IP for the hop, not this visitor's. Forward
        // it explicitly so that repo's rate limiter and source_ip logging
        // reflect the real visitor.
        'X-Visitor-IP': c.req.header('CF-Connecting-IP') ?? 'unknown',
      },
      // Shape must match form-capture-backend's SubmissionBody
      // (src/routes/submissions.ts). A field renamed on either side without
      // the other drops silently, not an error.
      body: JSON.stringify({ formId: 'custom-form', name, email, message, siteHost }),
      // fetch() follows redirects by default. A misconfigured Access rule
      // could redirect to a login page and look like a successful relay.
      // Manual redirect handling surfaces that as a failure instead.
      redirect: 'manual',
    });
    if (!response.ok) {
      console.error('form-capture-backend responded', response.status);
      return c.json({ error: 'Failed to deliver submission' }, 502);
    }
  } catch (err) {
    console.error('form-capture-backend request failed', err);
    return c.json({ error: 'Failed to deliver submission' }, 502);
  }

  return c.json({ status: 'ok' });
});

export default app;
