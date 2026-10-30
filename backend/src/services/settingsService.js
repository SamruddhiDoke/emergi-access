import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const AUTH_DURATION_KEY = 'authorizationDurationSeconds';

export async function getAuthorizationDuration() {
  const row = await prisma.systemSetting.findUnique({ where: { key: AUTH_DURATION_KEY } });
  const value = Number(row?.value);
  return Number.isInteger(value) && value >= 60 ? value : env.defaultAuthDurationSeconds;
}

export async function getSettings() {
  return {
    authorizationDurationSeconds: await getAuthorizationDuration(),
    demoMode: env.demoMode,
    sessionTtlHours: env.sessionTtlHours,
    otpTtlSeconds: env.otpTtlSeconds,
    rateLimiting: !env.disableRateLimit,
    environment: env.nodeEnv,
  };
}

export async function updateSettings({ authorizationDurationSeconds }, actorUserId) {
  await prisma.systemSetting.upsert({
    where: { key: AUTH_DURATION_KEY },
    create: { key: AUTH_DURATION_KEY, value: authorizationDurationSeconds, updatedById: actorUserId },
    update: { value: authorizationDurationSeconds, updatedById: actorUserId },
  });
  return getSettings();
}
