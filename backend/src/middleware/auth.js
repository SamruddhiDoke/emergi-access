import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { audit } from '../audit/auditService.js';
import { AuditAction } from '../audit/actions.js';

export const SESSION_COOKIE = 'ea_session';
export const CLINICAL_ROLES = ['PARAMEDIC', 'DOCTOR', 'SPECIALIST'];

function extractToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[SESSION_COOKIE] || null;
}

/**
 * Verifies the JWT *and* the server-side session on every request, then loads the user fresh from
 * the database. Role and account status always come from the database, never from token claims,
 * so a logout, suspension or role change takes effect immediately.
 */
export async function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) throw unauthorized();

  let claims;
  try {
    claims = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], issuer: 'emergi-access' });
  } catch {
    throw unauthorized('Your session is invalid or has expired', 'SESSION_INVALID');
  }

  const session = await prisma.session.findUnique({
    where: { id: claims.sid },
    include: { user: { include: { professional: true, patient: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.userId !== claims.sub) {
    throw unauthorized('Your session has ended. Please sign in again.', 'SESSION_INVALID');
  }
  if (session.user.status !== 'ACTIVE') {
    throw forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');
  }

  req.auth = {
    user: session.user,
    session,
    professional: session.user.professional,
    patient: session.user.patient,
  };
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.auth || !roles.includes(req.auth.user.role)) {
    throw forbidden('Your role is not permitted to access this resource', 'ROLE_FORBIDDEN');
  }
  next();
};

/** Clinical roles must be administrator-verified before they can touch any emergency workflow. */
export async function requireVerifiedProfessional(req, _res, next) {
  const { user, professional } = req.auth || {};
  if (!user || !CLINICAL_ROLES.includes(user.role) || !professional) {
    throw forbidden('Only healthcare professionals can use emergency access', 'ROLE_FORBIDDEN');
  }
  if (professional.verificationStatus !== 'VERIFIED') {
    await audit(
      {
        action: AuditAction.ACCESS_DENIED,
        outcome: 'DENIED',
        denialReason: 'PROFESSIONAL_NOT_VERIFIED',
        patientEmergencyId: typeof req.body?.emergencyId === 'string' ? req.body.emergencyId.slice(0, 40) : null,
        metadata: { path: req.originalUrl },
      },
      req,
    );
    throw forbidden(
      'Your professional account has not been verified by an administrator. Emergency access is unavailable.',
      'PROFESSIONAL_NOT_VERIFIED',
    );
  }
  next();
}
