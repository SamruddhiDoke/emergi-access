import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function generateOtpCode() {
  if (env.demoMode && env.demoOtp) return env.demoOtp;
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** OTPs are stored only as keyed hashes (HMAC-SHA256). */
export function hashOtp(code, salt) {
  return crypto.createHmac('sha256', env.otpSecret).update(`${salt}:${code}`).digest('hex');
}

export function verifyOtpHash(code, salt, hash) {
  const candidate = Buffer.from(hashOtp(String(code), salt), 'hex');
  const stored = Buffer.from(hash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}
