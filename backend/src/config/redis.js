import { createClient } from 'redis';
import { env } from './env.js';

let client = null;

/** Optional Redis connection, used for distributed rate limiting. The API runs without it. */
export async function connectRedis() {
  if (!env.redisUrl || env.isTest) return null;
  try {
    client = createClient({ url: env.redisUrl, socket: { reconnectStrategy: (n) => (n > 5 ? false : 500) } });
    client.on('error', () => {});
    await client.connect();
    console.log('[redis] connected');
    return client;
  } catch (err) {
    console.warn('[redis] unavailable, falling back to in-memory rate limiting:', err.message);
    client = null;
    return null;
  }
}

export const getRedis = () => (client?.isReady ? client : null);
