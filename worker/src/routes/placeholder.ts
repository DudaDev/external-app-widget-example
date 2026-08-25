import { Hono } from 'hono';
import type { Env } from '../env';

// Placeholder routes. Copy this file to worker/src/routes/my-app.ts.
// Add routes here to proxy requests to your external API, keeping
// credentials server-side and out of the browser bundle. Mount in
// worker/src/index.ts:
//   import myAppRoutes from './routes/my-app';
//   app.route('/my-app', myAppRoutes);

const app = new Hono<{ Bindings: Env }>();

app.get('/:id', (c) => {
  // APP replace with your actual API proxy logic
  return c.json({ id: c.req.param('id'), message: 'Replace this with your API proxy logic.' });
});

export default app;
