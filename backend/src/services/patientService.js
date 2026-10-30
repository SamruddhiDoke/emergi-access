import QRCode from 'qrcode';
import { prisma, dbNow } from '../config/prisma.js';
import { audit } from '../audit/auditService.js';
import { AuditAction } from '../audit/actions.js';
import { AppError, notFound } from '../utils/errors.js';
import { generateEmergencyId } from '../utils/emergencyId.js';
import { pageMeta, paginate } from '../utils/request.js';
import { serializeUser, medicalCreateData, verifyPassword } from './authService.js';
import { expireDueAuthorizations, revokeAuthorization, serializeAuthorization } from './emergencyService.js';

const PROFILE_INCLUDE = {
  user: { include: { professional: true, patient: true } },
  contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
  medical: { include: { allergies: true, conditions: true, medications: true, alerts: true, history: true } },
};

async function loadProfile(userId) {
  const profile = await prisma.patientProfile.findUnique({ where: { userId }, include: PROFILE_INCLUDE });
  if (!profile) throw notFound('Patient profile not found');
  return profile;
}

/** Weighted completeness of the emergency profile — what a clinician would actually need. */
export function profileCompletion(profile) {
  const m = profile.medical;
  const checks = [
    { key: 'personal', label: 'Personal details', weight: 15, done: Boolean(profile.dateOfBirth && profile.user.phone) },
    { key: 'bloodGroup', label: 'Blood group', weight: 20, done: Boolean(m?.bloodGroup) },
    { key: 'allergies', label: 'Allergies', weight: 15, done: (m?.allergies.length ?? 0) > 0 },
    { key: 'conditions', label: 'Chronic conditions', weight: 15, done: (m?.conditions.length ?? 0) > 0 },
    { key: 'medications', label: 'Current medications', weight: 10, done: (m?.medications.length ?? 0) > 0 },
    { key: 'contacts', label: 'Emergency contacts', weight: 20, done: profile.contacts.length > 0 },
    { key: 'history', label: 'Medical history', weight: 5, done: (m?.history.length ?? 0) > 0 },
  ];
  const percent = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
  return { percent, checks };
}

function serializeProfile(profile) {
  const m = profile.medical;
  const strip = (rows, keys) => rows.map((r) => Object.fromEntries(['id', ...keys].map((k) => [k, r[k] ?? null])));
  return {
    user: serializeUser(profile.user),
    emergencyId: profile.emergencyId,
    emergencyIdIssuedAt: profile.emergencyIdIssuedAt,
    dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
    gender: profile.gender,
    medical: {
      bloodGroup: m?.bloodGroup ?? null,
      allergies: strip(m?.allergies ?? [], ['allergen', 'reaction', 'severity']),
      conditions: strip(m?.conditions ?? [], ['name', 'severity', 'category', 'diagnosedYear', 'notes']),
      medications: strip(m?.medications ?? [], ['name', 'dosage', 'frequency', 'category', 'isCritical', 'alertNote']),
      alerts: strip(m?.alerts ?? [], ['title', 'details']),
      history: strip(m?.history ?? [], ['title', 'category', 'year', 'notes']),
      updatedAt: m?.updatedAt ?? null,
    },
    contacts: strip(profile.contacts, ['name', 'relationship', 'phone', 'isPrimary']),
    completion: profileCompletion(profile),
    updatedAt: [profile.updatedAt, profile.user.updatedAt, m?.updatedAt].filter(Boolean).sort((a, b) => b - a)[0],
  };
}

export async function getProfile(req) {
  return serializeProfile(await loadProfile(req.auth.user.id));
}

/** Medical sections and contacts use replace semantics: the submitted list becomes the record. */
export async function updateProfile(req, input) {
  const profile = await loadProfile(req.auth.user.id);
  const sections = [];

  await prisma.$transaction(async (tx) => {
    if (input.fullName !== undefined || input.phone !== undefined) {
      await tx.user.update({
        where: { id: profile.userId },
        data: { ...(input.fullName !== undefined && { fullName: input.fullName }), ...(input.phone !== undefined && { phone: input.phone }) },
      });
      sections.push('personal');
    }
    if (input.dateOfBirth !== undefined || input.gender !== undefined) {
      await tx.patientProfile.update({
        where: { id: profile.id },
        data: {
          ...(input.dateOfBirth !== undefined && { dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00Z`) }),
          ...(input.gender !== undefined && { gender: input.gender }),
        },
      });
      if (!sections.includes('personal')) sections.push('personal');
    }
    if (input.medical) {
      if (profile.medical) await tx.medicalProfile.delete({ where: { id: profile.medical.id } });
      await tx.medicalProfile.create({ data: { patientId: profile.id, ...medicalCreateData(input.medical) } });
      sections.push('medical');
    }
    if (input.contacts) {
      await tx.emergencyContact.deleteMany({ where: { patientId: profile.id } });
      const contacts = input.contacts.map((c, i) => ({ ...c, patientId: profile.id, isPrimary: c.isPrimary || (i === 0 && !input.contacts.some((x) => x.isPrimary)) }));
      await tx.emergencyContact.createMany({ data: contacts });
      sections.push('contacts');
    }
    // Always bump the profile timestamp so "last updated" reflects any change.
    await tx.patientProfile.update({ where: { id: profile.id }, data: { updatedAt: new Date() } });
  });

  // Audit records which sections changed — never the values themselves.
  await audit({ action: AuditAction.PROFILE_UPDATED, patientEmergencyId: profile.emergencyId, metadata: { sections } }, req);
  return getProfile(req);
}

export async function getEmergencyId(req) {
  const { emergencyId, emergencyIdIssuedAt } = req.auth.patient;
  return { emergencyId, issuedAt: emergencyIdIssuedAt };
}

const QR_OPTIONS = { errorCorrectionLevel: 'M', margin: 2, width: 640, color: { dark: '#142B45', light: '#FFFFFF' } };

/** The QR payload is the opaque Emergency ID and nothing else. */
export async function getQr(req) {
  const { emergencyId } = req.auth.patient;
  return { emergencyId, payload: emergencyId, dataUrl: await QRCode.toDataURL(emergencyId, QR_OPTIONS) };
}

export async function getQrPng(req) {
  return QRCode.toBuffer(req.auth.patient.emergencyId, QR_OPTIONS);
}

export async function regenerateEmergencyId(req, password) {
  if (!(await verifyPassword(req.auth.user.id, password ?? ''))) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Confirm your password to regenerate your Emergency ID');
  }
  const previous = req.auth.patient.emergencyId;
  let next = generateEmergencyId();
  while (await prisma.patientProfile.findUnique({ where: { emergencyId: next }, select: { id: true } })) next = generateEmergencyId();
  await prisma.patientProfile.update({ where: { id: req.auth.patient.id }, data: { emergencyId: next, emergencyIdIssuedAt: new Date() } });
  await audit(
    { action: AuditAction.EMERGENCY_ID_REGENERATED, patientEmergencyId: next, metadata: { previousEmergencyId: previous } },
    req,
  );
  return { emergencyId: next };
}

const PATIENT_VISIBLE_ACTIONS = [
  AuditAction.PATIENT_IDENTIFIED,
  AuditAction.IDENTIFY_FAILED,
  AuditAction.ACCESS_REQUESTED,
  AuditAction.ACCESS_GRANTED,
  AuditAction.ACCESS_DENIED,
  AuditAction.MEDICAL_INFO_VIEWED,
  AuditAction.MEDICAL_INFO_DENIED,
  AuditAction.SUMMARY_EXPORTED,
  AuditAction.ACCESS_EXPIRED,
  AuditAction.ACCESS_REVOKED,
  AuditAction.ACCESS_ENDED,
];

/** Who has looked at my record: authorizations plus the underlying event trail. */
export async function accessHistory(req, query) {
  await expireDueAuthorizations();
  const patientId = req.auth.patient.id;
  const { page, pageSize, skip, take } = paginate(query, { defaultSize: 10 });
  const now = await dbNow();
  const authIds = (await prisma.emergencyAuthorization.findMany({ where: { patientId }, select: { id: true } })).map((a) => a.id);

  const [items, total, events] = await Promise.all([
    prisma.emergencyAuthorization.findMany({
      where: { patientId },
      orderBy: { requestedAt: 'desc' },
      skip,
      take,
      include: { professional: { include: { user: { select: { fullName: true } } } } },
    }),
    prisma.emergencyAuthorization.count({ where: { patientId } }),
    prisma.auditLog.findMany({
      where: {
        action: { in: PATIENT_VISIBLE_ACTIONS },
        OR: [{ authorizationId: { in: authIds } }, { patientEmergencyId: req.auth.patient.emergencyId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, createdAt: true, action: true, outcome: true, actorRole: true, actorName: true,
        organization: true, authorizationId: true, categoriesAccessed: true, denialReason: true,
      },
    }),
  ]);
  return { items: items.map((a) => serializeAuthorization(a, now)), events, meta: pageMeta(page, pageSize, total) };
}

export async function activeAuthorizations(req) {
  await expireDueAuthorizations();
  const now = await dbNow();
  const items = await prisma.emergencyAuthorization.findMany({
    where: { patientId: req.auth.patient.id, OR: [{ status: 'ACTIVE', expiresAt: { gt: now } }, { status: 'PENDING' }] },
    orderBy: { requestedAt: 'desc' },
    include: { professional: { include: { user: { select: { fullName: true } } } } },
  });
  return { items: items.map((a) => serializeAuthorization(a, now)), serverTime: now };
}

export async function revokeOwnAuthorization(req, { authorizationId, reason }) {
  return revokeAuthorization(req, authorizationId, {
    reason: reason || 'Revoked by patient',
    scope: { patientId: req.auth.patient.id },
  });
}

export async function dashboard(req) {
  await expireDueAuthorizations();
  const profile = await loadProfile(req.auth.user.id);
  const now = await dbNow();
  const include = { professional: { include: { user: { select: { fullName: true } } } } };
  const [active, recent, totals] = await Promise.all([
    prisma.emergencyAuthorization.findMany({ where: { patientId: profile.id, status: 'ACTIVE', expiresAt: { gt: now } }, include }),
    prisma.emergencyAuthorization.findMany({ where: { patientId: profile.id }, orderBy: { requestedAt: 'desc' }, take: 5, include }),
    prisma.emergencyAuthorization.groupBy({ by: ['status'], where: { patientId: profile.id }, _count: true }),
  ]);
  return {
    profile: serializeProfile(profile),
    active: active.map((a) => serializeAuthorization(a, now)),
    recent: recent.map((a) => serializeAuthorization(a, now)),
    totals: Object.fromEntries(totals.map((t) => [t.status, t._count])),
    serverTime: now,
  };
}

export async function fullRecordForPdf(req) {
  return loadProfile(req.auth.user.id);
}
