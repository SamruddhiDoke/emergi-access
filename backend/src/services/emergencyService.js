import { prisma, dbNow } from '../config/prisma.js';
import { audit } from '../audit/auditService.js';
import { AuditAction } from '../audit/actions.js';
import { AppError, forbidden, gone, notFound, badRequest } from '../utils/errors.js';
import { normalizeEmergencyId } from '../utils/emergencyId.js';
import { pageMeta, paginate } from '../utils/request.js';
import { ACCESS_MATRIX, discloseForRole } from './disclosurePolicy.js';
import { getAuthorizationDuration } from './settingsService.js';
import { issueOtp, checkOtp } from './otpService.js';

const FULL_RECORD_INCLUDE = {
  user: { select: { fullName: true } },
  contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
  medical: { include: { allergies: true, conditions: true, medications: true, alerts: true, history: true } },
};

function ageFrom(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

/** "Ananya Rao" → "Ananya R." — enough to confirm identity, not enough to profile someone. */
export function maskName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function serializeAuthorization(a, now = new Date()) {
  const remainingSeconds =
    a.status === 'ACTIVE' && a.expiresAt ? Math.max(0, Math.floor((new Date(a.expiresAt) - now) / 1000)) : 0;
  return {
    id: a.id,
    status: a.status,
    patientEmergencyId: a.patientEmergencyId,
    professionalId: a.professionalId,
    professionalRole: a.professionalRole,
    organization: a.organization,
    reason: a.reason,
    justification: a.justification,
    treatmentPurpose: a.treatmentPurpose,
    specialtyScope: a.specialtyScope,
    otpVerified: a.otpVerified,
    durationSeconds: a.durationSeconds,
    requestedAt: a.requestedAt,
    grantedAt: a.grantedAt,
    expiresAt: a.expiresAt,
    revokedAt: a.revokedAt,
    revokedByRole: a.revokedByRole,
    revocationReason: a.revocationReason,
    denialReason: a.denialReason,
    accessCount: a.accessCount,
    lastAccessedAt: a.lastAccessedAt,
    remainingSeconds,
    categories: ACCESS_MATRIX[a.professionalRole] ?? [],
    professionalName: a.professional?.user?.fullName,
    patientDisplayName: a.patient?.user?.fullName ? maskName(a.patient.user.fullName) : undefined,
  };
}

const elapsedSeconds = (a, end) => (a.grantedAt ? Math.max(0, Math.round((end - new Date(a.grantedAt)) / 1000)) : null);

/**
 * Marks every ACTIVE authorization whose database expiry has passed as EXPIRED and audits it.
 * Enforcement does not depend on this sweep — every protected read re-checks expiry itself — but the
 * sweep keeps stored statuses accurate for dashboards and history.
 */
export async function expireDueAuthorizations() {
  const now = await dbNow();
  const due = await prisma.emergencyAuthorization.findMany({ where: { status: 'ACTIVE', expiresAt: { lte: now } } });
  for (const a of due) {
    const { count } = await prisma.emergencyAuthorization.updateMany({
      where: { id: a.id, status: 'ACTIVE' },
      data: { status: 'EXPIRED', endedAt: a.expiresAt },
    });
    if (count === 1) {
      await audit({
        action: AuditAction.ACCESS_EXPIRED,
        actorRole: a.professionalRole,
        professionalId: a.professionalId,
        organization: a.organization,
        patientEmergencyId: a.patientEmergencyId,
        authorizationId: a.id,
        accessDurationSec: elapsedSeconds(a, a.expiresAt),
        expiryStatus: 'EXPIRED',
        metadata: { by: 'SYSTEM' },
      });
    }
  }
  return due.length;
}

/** Re-reads an authorization and applies expiry against the database clock. */
async function currentState(authorizationId) {
  const now = await dbNow();
  let a = await prisma.emergencyAuthorization.findUnique({
    where: { id: authorizationId },
    include: { professional: { include: { user: { select: { fullName: true } } } }, patient: { include: { user: { select: { fullName: true } } } } },
  });
  if (a && a.status === 'ACTIVE' && a.expiresAt <= now) {
    await expireDueAuthorizations();
    a = await prisma.emergencyAuthorization.findUnique({
      where: { id: authorizationId },
      include: { professional: { include: { user: { select: { fullName: true } } } }, patient: { include: { user: { select: { fullName: true } } } } },
    });
  }
  return { a, now };
}

async function findPatientByEmergencyId(raw) {
  const emergencyId = normalizeEmergencyId(raw);
  if (!emergencyId) return { emergencyId: null, patient: null };
  const patient = await prisma.patientProfile.findUnique({
    where: { emergencyId },
    include: { user: { select: { fullName: true, status: true } }, medical: { select: { id: true } } },
  });
  return { emergencyId, patient };
}

export async function identifyPatient(req, rawId) {
  const { emergencyId, patient } = await findPatientByEmergencyId(rawId);
  if (!patient || patient.user.status !== 'ACTIVE') {
    await audit(
      {
        action: AuditAction.IDENTIFY_FAILED,
        outcome: 'DENIED',
        patientEmergencyId: (emergencyId ?? String(rawId)).slice(0, 40),
        denialReason: emergencyId ? 'UNKNOWN_EMERGENCY_ID' : 'MALFORMED_EMERGENCY_ID',
      },
      req,
    );
    throw notFound('This Emergency ID is not recognised. Check the code and try again.', 'INVALID_EMERGENCY_ID');
  }

  await audit({ action: AuditAction.PATIENT_IDENTIFIED, patientEmergencyId: emergencyId }, req);

  const now = await dbNow();
  const existing = await prisma.emergencyAuthorization.findFirst({
    where: { patientId: patient.id, professionalRefId: req.auth.professional.id, status: 'ACTIVE', expiresAt: { gt: now } },
    select: { id: true, expiresAt: true },
  });

  // Deliberately minimal: no medical data, no contact details, no full name.
  return {
    emergencyId,
    displayName: maskName(patient.user.fullName),
    age: ageFrom(patient.dateOfBirth),
    gender: patient.gender,
    hasEmergencyProfile: Boolean(patient.medical),
    activeAuthorizationId: existing?.id ?? null,
  };
}

export async function requestAccess(req, body) {
  const { user, professional } = req.auth;
  const { emergencyId, patient } = await findPatientByEmergencyId(body.emergencyId);

  if (!patient || patient.user.status !== 'ACTIVE') {
    await audit(
      {
        action: AuditAction.ACCESS_DENIED,
        outcome: 'DENIED',
        patientEmergencyId: (emergencyId ?? body.emergencyId).slice(0, 40),
        reason: body.reason,
        justification: body.justification,
        denialReason: 'INVALID_EMERGENCY_ID',
      },
      req,
    );
    throw notFound('This Emergency ID is not recognised.', 'INVALID_EMERGENCY_ID');
  }

  // Specialist scope is derived from the verified professional record, never from the request.
  let specialtyScope = null;
  if (user.role === 'SPECIALIST') {
    if (!professional.specialty) throw forbidden('Your specialist profile has no registered specialty', 'SPECIALTY_MISSING');
    if (!body.treatmentPurpose) throw badRequest('Describe the treatment purpose for this specialist access');
    specialtyScope = professional.specialty;
  }

  const now = await dbNow();
  const existing = await prisma.emergencyAuthorization.findFirst({
    where: { patientId: patient.id, professionalRefId: professional.id, status: 'ACTIVE', expiresAt: { gt: now } },
  });
  if (existing) {
    throw new AppError(409, 'ACTIVE_AUTHORIZATION_EXISTS', 'You already hold an active authorization for this patient', {
      authorizationId: existing.id,
    });
  }

  // Abandon any earlier unfinished request from this professional for this patient.
  await prisma.emergencyAuthorization.updateMany({
    where: { patientId: patient.id, professionalRefId: professional.id, status: 'PENDING' },
    data: { status: 'DENIED', denialReason: 'SUPERSEDED_BY_NEW_REQUEST', endedAt: now },
  });

  const durationSeconds = await getAuthorizationDuration();
  const authorization = await prisma.emergencyAuthorization.create({
    data: {
      patientId: patient.id,
      patientEmergencyId: emergencyId,
      professionalRefId: professional.id,
      professionalId: professional.professionalId,
      professionalRole: user.role,
      organization: professional.organization,
      reason: body.reason,
      justification: body.justification,
      treatmentPurpose: body.treatmentPurpose ?? null,
      specialtyScope,
      durationSeconds,
    },
  });
  const otp = await issueOtp({ userId: user.id, purpose: 'BREAK_GLASS', authorizationId: authorization.id });

  await audit(
    {
      action: AuditAction.ACCESS_REQUESTED,
      patientEmergencyId: emergencyId,
      authorizationId: authorization.id,
      reason: body.reason,
      justification: body.justification,
      metadata: { specialtyScope, treatmentPurpose: body.treatmentPurpose ?? null },
    },
    req,
  );

  return { authorization: serializeAuthorization(authorization, now), otp };
}

async function denyAuthorization(req, a, denialReason) {
  await prisma.emergencyAuthorization.updateMany({
    where: { id: a.id, status: 'PENDING' },
    data: { status: 'DENIED', denialReason, endedAt: new Date() },
  });
  await audit(
    {
      action: AuditAction.ACCESS_DENIED,
      outcome: 'DENIED',
      patientEmergencyId: a.patientEmergencyId,
      authorizationId: a.id,
      reason: a.reason,
      justification: a.justification,
      denialReason,
    },
    req,
  );
}

export async function verifyBreakGlassOtp(req, { authorizationId, code }) {
  const { professional, user } = req.auth;
  const a = await prisma.emergencyAuthorization.findFirst({ where: { id: authorizationId, professionalRefId: professional.id } });
  if (!a) throw notFound('Authorization request not found', 'AUTHORIZATION_NOT_FOUND');
  if (a.status !== 'PENDING') {
    throw new AppError(409, 'AUTHORIZATION_NOT_PENDING', `This request is already ${a.status.toLowerCase()}`, { status: a.status });
  }
  if (a.professionalRole !== user.role) {
    await denyAuthorization(req, a, 'ROLE_MISMATCH');
    throw forbidden('Your role no longer matches this request', 'ROLE_MISMATCH');
  }

  const result = await checkOtp({ where: { authorizationId: a.id, purpose: 'BREAK_GLASS', userId: user.id }, code });
  if (!result.ok) {
    await audit(
      {
        action: AuditAction.OTP_FAILED,
        outcome: 'FAILURE',
        patientEmergencyId: a.patientEmergencyId,
        authorizationId: a.id,
        denialReason: `OTP_${result.reason}`,
      },
      req,
    );
    if (result.reason === 'INVALID') {
      throw new AppError(400, 'OTP_INVALID', 'Incorrect verification code', { remainingAttempts: result.remainingAttempts });
    }
    await denyAuthorization(req, a, result.reason === 'LOCKED' ? 'OTP_ATTEMPTS_EXCEEDED' : 'OTP_EXPIRED');
    throw new AppError(403, 'AUTHORIZATION_DENIED', 'Verification failed. This emergency access request has been denied.', {
      reason: result.reason,
    });
  }

  const now = await dbNow();
  const expiresAt = new Date(now.getTime() + a.durationSeconds * 1000);
  const { count } = await prisma.emergencyAuthorization.updateMany({
    where: { id: a.id, status: 'PENDING' },
    data: { status: 'ACTIVE', otpVerified: true, grantedAt: now, expiresAt },
  });
  if (count !== 1) throw new AppError(409, 'AUTHORIZATION_NOT_PENDING', 'This request is no longer pending');

  await audit(
    {
      action: AuditAction.ACCESS_GRANTED,
      patientEmergencyId: a.patientEmergencyId,
      authorizationId: a.id,
      reason: a.reason,
      justification: a.justification,
      categoriesAccessed: ACCESS_MATRIX[a.professionalRole],
      accessDurationSec: a.durationSeconds,
      expiryStatus: 'ACTIVE',
      metadata: { expiresAt: expiresAt.toISOString(), otp: 'SIMULATED' },
    },
    req,
  );

  const { a: fresh } = await currentState(a.id);
  return serializeAuthorization(fresh, now);
}

/** Loads an authorization the current professional owns. Others' authorizations look like 404s (no IDOR oracle). */
async function ownedAuthorization(req, id) {
  const { a, now } = await currentState(id);
  if (!a || a.professionalRefId !== req.auth.professional.id) return { a: null, now, exists: Boolean(a) };
  return { a, now, exists: true };
}

export async function getAuthorizationStatus(req, id) {
  const { a, now } = await ownedAuthorization(req, id);
  if (!a) throw notFound('Authorization not found', 'AUTHORIZATION_NOT_FOUND');
  return { authorization: serializeAuthorization(a, now), serverTime: now };
}

function stateError(a) {
  switch (a.status) {
    case 'REVOKED':
      return new AppError(403, 'AUTHORIZATION_REVOKED', 'This emergency authorization has been revoked.', {
        revokedAt: a.revokedAt,
        revokedByRole: a.revokedByRole,
        revocationReason: a.revocationReason,
      });
    case 'EXPIRED':
      return gone('This emergency authorization has expired.', 'AUTHORIZATION_EXPIRED');
    case 'PENDING':
      return forbidden('Verification has not been completed for this request.', 'VERIFICATION_REQUIRED');
    case 'DENIED':
      return forbidden('This emergency access request was denied.', 'AUTHORIZATION_DENIED');
    default:
      return null;
  }
}

/**
 * The only route through which a clinician receives medical data. Every call re-validates the
 * session, verification status, ownership, role and authorization state against the database.
 */
export async function getMedicalInformation(req, id, { action = AuditAction.MEDICAL_INFO_VIEWED } = {}) {
  const { user } = req.auth;
  const { a, now, exists } = await ownedAuthorization(req, id);

  const deny = async (denialReason, ctx = {}) =>
    audit(
      {
        action: AuditAction.MEDICAL_INFO_DENIED,
        outcome: 'DENIED',
        authorizationId: exists ? id : null,
        patientEmergencyId: ctx.patientEmergencyId ?? null,
        expiryStatus: ctx.expiryStatus ?? null,
        denialReason,
      },
      req,
    );

  if (!a) {
    await deny(exists ? 'NOT_AUTHORIZATION_OWNER' : 'AUTHORIZATION_NOT_FOUND');
    throw notFound('Authorization not found', 'AUTHORIZATION_NOT_FOUND');
  }
  if (a.professionalRole !== user.role) {
    await deny('ROLE_MISMATCH', { patientEmergencyId: a.patientEmergencyId });
    throw forbidden('Your role does not match this authorization', 'ROLE_MISMATCH');
  }
  const err = stateError(a);
  if (err) {
    await deny(`AUTHORIZATION_${a.status}`, { patientEmergencyId: a.patientEmergencyId, expiryStatus: a.status });
    throw err;
  }

  const patient = await prisma.patientProfile.findUnique({ where: { id: a.patientId }, include: FULL_RECORD_INCLUDE });
  const { data, categories } = discloseForRole(patient, a.professionalRole, { specialtyScope: a.specialtyScope });

  await prisma.emergencyAuthorization.update({
    where: { id: a.id },
    data: { accessCount: { increment: 1 }, lastAccessedAt: now },
  });
  await audit(
    {
      action,
      patientEmergencyId: a.patientEmergencyId,
      authorizationId: a.id,
      reason: a.reason,
      categoriesAccessed: categories,
      accessDurationSec: elapsedSeconds(a, now),
      expiryStatus: 'ACTIVE',
    },
    req,
  );

  return {
    authorization: serializeAuthorization({ ...a, accessCount: a.accessCount + 1, lastAccessedAt: now }, now),
    disclosure: data,
    categories,
    serverTime: now,
  };
}

/**
 * Revokes an ACTIVE or PENDING authorization. `scope` restricts which authorizations the actor may
 * revoke: a patient only their own record, a professional only their own grants, an admin any.
 */
export async function revokeAuthorization(req, id, { reason, scope = {}, action = AuditAction.ACCESS_REVOKED } = {}) {
  const { user } = req.auth;
  const { a, now } = await currentState(id);
  const inScope =
    a &&
    (scope.patientId === undefined || a.patientId === scope.patientId) &&
    (scope.professionalRefId === undefined || a.professionalRefId === scope.professionalRefId);
  if (!inScope) throw notFound('Authorization not found', 'AUTHORIZATION_NOT_FOUND');

  if (!['ACTIVE', 'PENDING'].includes(a.status)) {
    throw new AppError(409, 'AUTHORIZATION_NOT_REVOCABLE', `This authorization is already ${a.status.toLowerCase()}`, { status: a.status });
  }

  const { count } = await prisma.emergencyAuthorization.updateMany({
    where: { id: a.id, status: { in: ['ACTIVE', 'PENDING'] } },
    data: {
      status: 'REVOKED',
      revokedAt: now,
      endedAt: now,
      revokedByUserId: user.id,
      revokedByRole: user.role,
      revocationReason: reason || null,
    },
  });
  if (count !== 1) throw new AppError(409, 'AUTHORIZATION_NOT_REVOCABLE', 'This authorization is no longer active');

  await audit(
    {
      action,
      patientEmergencyId: a.patientEmergencyId,
      authorizationId: a.id,
      reason: a.reason,
      accessDurationSec: elapsedSeconds(a, now),
      expiryStatus: 'REVOKED',
      // The revoking actor is recorded as the actor; the affected professional goes in metadata.
      professionalId: req.auth.professional?.professionalId ?? null,
      organization: req.auth.professional?.organization ?? null,
      metadata: {
        revocationReason: reason || null,
        affectedProfessionalId: a.professionalId,
        affectedOrganization: a.organization,
        affectedRole: a.professionalRole,
      },
    },
    req,
  );

  const { a: fresh } = await currentState(a.id);
  return serializeAuthorization(fresh, now);
}

export async function professionalHistory(req, query) {
  await expireDueAuthorizations();
  const { page, pageSize, skip, take } = paginate(query);
  const where = { professionalRefId: req.auth.professional.id, ...(query.status ? { status: query.status } : {}) };
  const now = await dbNow();
  const [items, total] = await Promise.all([
    prisma.emergencyAuthorization.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take,
      include: { patient: { include: { user: { select: { fullName: true } } } } },
    }),
    prisma.emergencyAuthorization.count({ where }),
  ]);
  return { items: items.map((a) => serializeAuthorization(a, now)), meta: pageMeta(page, pageSize, total) };
}

export async function professionalDashboard(req) {
  await expireDueAuthorizations();
  const proId = req.auth.professional.id;
  const now = await dbNow();
  const since = new Date(now.getTime() - 30 * 86400_000);
  const include = { patient: { include: { user: { select: { fullName: true } } } } };
  const [active, recent, total, last30, byStatus] = await Promise.all([
    prisma.emergencyAuthorization.findMany({
      where: { professionalRefId: proId, status: 'ACTIVE', expiresAt: { gt: now } },
      orderBy: { expiresAt: 'asc' },
      include,
    }),
    prisma.emergencyAuthorization.findMany({ where: { professionalRefId: proId }, orderBy: { requestedAt: 'desc' }, take: 6, include }),
    prisma.emergencyAuthorization.count({ where: { professionalRefId: proId } }),
    prisma.emergencyAuthorization.count({ where: { professionalRefId: proId, requestedAt: { gte: since } } }),
    prisma.emergencyAuthorization.groupBy({ by: ['status'], where: { professionalRefId: proId }, _count: true }),
  ]);
  return {
    stats: {
      totalRequests: total,
      last30Days: last30,
      activeNow: active.length,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    },
    accessMatrix: ACCESS_MATRIX[req.auth.user.role] ?? [],
    active: active.map((a) => serializeAuthorization(a, now)),
    recent: recent.map((a) => serializeAuthorization(a, now)),
    serverTime: now,
  };
}
