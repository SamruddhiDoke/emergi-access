import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { forbidden } from '../utils/errors.js';
import { SESSION_COOKIE } from './auth.js';

export const CSRF_COOKIE = 'ea_csrf';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(res) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'strict', secure: env.cookieSecure, path: '/' });
  return token;
}

/**
 * Double-submit CSRF protection for cookie-authenticated requests. Clients authenticating with an
 * explicit Bearer token (and no session cookie) are not exposed to CSRF and are exempt.
 */
export function csrfProtection(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  const usesBearerOnly = req.get('authorization')?.startsWith('Bearer ') && !req.cookies?.[SESSION_COOKIE];
  if (usesBearerOnly) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    throw forbidden('Missing or invalid CSRF token', 'CSRF_INVALID');
  }
  next();
}
