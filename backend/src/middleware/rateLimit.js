import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env.js';
import { getRedis } from '../config/redis.js';

function store(prefix) {
  const redis = getRedis();
  if (!redis) return undefined;
  return new RedisStore({ prefix: `rl:${prefix}:`, sendCommand: (...args) => redis.sendCommand(args) });
}

function limiter(prefix, { windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.disableRateLimit,
    store: store(prefix),
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  });
}

/** Built after Redis connects so the limiters can use the shared store when it is available. */
export function buildRateLimiters() {
  return {
    global: limiter('global', { windowMs: 15 * 60_000, limit: 1000, message: 'Too many requests. Please slow down.' }),
    auth: limiter('auth', { windowMs: 15 * 60_000, limit: 30, message: 'Too many sign-in attempts. Try again in a few minutes.' }),
    otp: limiter('otp', { windowMs: 15 * 60_000, limit: 20, message: 'Too many verification attempts. Try again later.' }),
    identify: limiter('identify', { windowMs: 10 * 60_000, limit: 40, message: 'Too many identification attempts.' }),
  };
}
