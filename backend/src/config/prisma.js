import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/** Current time according to the database — the source of truth for authorization expiry. */
export async function dbNow() {
  const [{ now }] = await prisma.$queryRaw`SELECT now() AS now`;
  return new Date(now);
}
