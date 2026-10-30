import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { csrfProtection } from './middleware/csrf.js';
import { buildRateLimiters } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { buildRouter } from './routes/index.js';
import { openApiSpec } from './docs/openapi.js';

export function createApp() {
  const app = express();
  const limits = buildRateLimiters();

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Swagger UI needs inline styles; everything else is same-origin.
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', limits.global);

  // Reports liveness and database reachability only — never configuration values or credentials.
  const health = async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up', demoMode: env.demoMode, uptimeSeconds: Math.round(process.uptime()), time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down', time: new Date().toISOString() });
    }
  };
  app.get('/health', health);
  app.get('/api/health', health);
  app.get('/api/docs.json', (_req, res) => res.json(openApiSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'Emergi-Access API' }));

  app.use('/api', csrfProtection, buildRouter(limits));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
