import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { generateOtpCode, hashOtp, verifyOtpHash } from '../utils/otp.js';

/**
 * Issues a simulated one-time code. In the hackathon environment there is no SMS/email gateway, so
 * when DEMO_MODE is on the code is returned to the caller (and labelled as simulated in the UI).
 */
export async function issueOtp({ userId, purpose, authorizationId = null }, client = prisma) {
  const code = generateOtpCode();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.otpTtlSeconds * 1000);
  await client.otpVerification.create({
    data: { id, userId, purpose, authorizationId, codeHash: hashOtp(code, id), expiresAt },
  });
  return {
    challengeId: id,
    expiresAt,
    delivery: 'SIMULATED',
    ...(env.demoMode ? { demoCode: code } : {}),
  };
}

/**
 * @returns {{ ok: true, otp } | { ok: false, reason: 'NOT_FOUND'|'EXPIRED'|'LOCKED'|'INVALID', remainingAttempts?: number }}
 */
export async function checkOtp({ where, code }) {
  const otp = await prisma.otpVerification.findFirst({ where: { ...where, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!otp) return { ok: false, reason: 'NOT_FOUND' };
  if (otp.expiresAt <= new Date()) return { ok: false, reason: 'EXPIRED', otp };
  if (otp.attempts >= otp.maxAttempts) return { ok: false, reason: 'LOCKED', otp };

  if (!verifyOtpHash(code, otp.id, otp.codeHash)) {
    const updated = await prisma.otpVerification.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const remainingAttempts = Math.max(0, updated.maxAttempts - updated.attempts);
    return { ok: false, reason: remainingAttempts === 0 ? 'LOCKED' : 'INVALID', remainingAttempts, otp: updated };
  }

  // Conditional consume prevents the same code being redeemed twice by concurrent requests.
  const consumed = await prisma.otpVerification.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date(), attempts: { increment: 1 } },
  });
  if (consumed.count !== 1) return { ok: false, reason: 'NOT_FOUND' };
  return { ok: true, otp };
}
