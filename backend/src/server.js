import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { connectRedis } from './config/redis.js';
import { expireDueAuthorizations } from './services/emergencyService.js';

async function main() {
  await prisma.$connect();
  await connectRedis();

  // Imported after Redis connects so rate limiters can bind to the shared store.
  const { createApp } = await import('./app.js');
  const app = createApp();

  const server = app.listen(env.port, env.host, () => {
    console.log(`[api] Emergi-Access API listening on ${env.host}:${env.port} (${env.nodeEnv})`);
    console.log('[api] API docs at /api/docs · health at /health');
    if (env.demoMode) console.log('[api] DEMO_MODE is ON — simulated OTP codes are returned in API responses');
  });
  // Keep-alive must outlive the hosting load balancer's idle timeout (Render/Vercel use ~60 s);
  // requestTimeout bounds slow clients.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 30_000;

  // Housekeeping only: keeps stored statuses fresh. Expiry is enforced on every read regardless.
  const sweeper = setInterval(() => expireDueAuthorizations().catch((e) => console.error('[sweeper]', e.message)), 15_000);

  const shutdown = async () => {
    clearInterval(sweeper);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
