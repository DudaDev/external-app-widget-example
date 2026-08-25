import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// APP import your app's routes and mount them below
import { createSpotifyRouter } from './routes/spotify';
import placeholderRoutes       from './routes/placeholder';
import { TokenManager }        from './lib/tokenManager';
import config from './config';

const app = express();

app.use(helmet());

// In production, ALLOWED_ORIGINS must be explicitly set. No silent fallback.
if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error('ALLOWED_ORIGINS env var must be set in production');
}
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors(
    process.env.NODE_ENV === 'production'
      ? {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
          },
        }
      : { origin: '*' }
  )
);

app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/spotify', rateLimit({ windowMs: 60_000, max: 30 }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const tokenManager = new TokenManager(
  config.externalApi.clientId,
  config.externalApi.clientSecret,
  'https://accounts.spotify.com/api/token'
);

app.use('/spotify',     createSpotifyRouter(tokenManager, config.externalApi.baseUrl));
app.use('/placeholder', placeholderRoutes);

// APP add your app's routes here

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

export default app;
