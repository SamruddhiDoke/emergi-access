import 'dotenv/config';

const bool = (v, fallback = false) => (v === undefined || v === '' ? fallback : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));
const int = (v, fallback) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));

const nodeEnv = process.env.NODE_ENV || 'development';

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (nodeEnv === 'production') throw new Error(`Missing required environment variable ${name}`);
  return devFallback;
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: int(process.env.PORT, 4000),
  host: process.env.HOST || '0.0.0.0',
  // Number of reverse proxies in front of the API (Vercel rewrite + Render load balancer = 2).
  // Determines which X-Forwarded-For entry is the real client IP used for rate limiting and audit.
  trustProxy: int(process.env.TRUST_PROXY, 1),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: required('JWT_SECRET', 'dev-only-jwt-secret-do-not-use-in-production'),
  otpSecret: required('OTP_SECRET', 'dev-only-otp-secret-do-not-use-in-production'),
  sessionTtlHours: int(process.env.SESSION_TTL_HOURS, 8),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  cookieSecure: bool(process.env.COOKIE_SECURE, nodeEnv === 'production'),
  // DEMO_MODE exposes simulated OTP codes in API responses. Never enable against real users.
  demoMode: bool(process.env.DEMO_MODE, nodeEnv !== 'production'),
  demoOtp: process.env.DEMO_OTP || '',
  defaultAuthDurationSeconds: int(process.env.AUTH_DURATION_SECONDS, 300),
  otpTtlSeconds: int(process.env.OTP_TTL_SECONDS, 300),
  disableRateLimit: bool(process.env.DISABLE_RATE_LIMIT, nodeEnv === 'test'),
  seedOnStart: bool(process.env.SEED_ON_START, false),
};
