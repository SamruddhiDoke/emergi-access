import { prisma, dbNow } from '../config/prisma.js';
import { audit } from '../audit/auditService.js';
import { AuditAction } from '../audit/actions.js';
import { AppError, notFound } from '../utils/errors.js';
import { pageMeta, paginate } from '../utils/request.js';
import { expireDueAuthorizations, revokeAuthorization, serializeAuthorization } from './emergencyService.js';
import { detectSuspiciousActivity } from './suspiciousActivity.js';
import { profileCompletion } from './patientService.js';

const DAY = 86400_000;

/** Daily counts for the last `days` days, zero-filled, bucketed in IST. */
async function dailySeries(days) {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.$queryRaw`
    SELECT to_char(date_trunc('day', "requestedAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day,
           "status"::text AS status, COUNT(*)::int AS count
    FROM "EmergencyAuthorization"
    WHERE "requestedAt" >= ${since}
    GROUP BY 1, 2`;
  const denials = await prisma.$queryRaw`
    SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "AuditLog" WHERE "outcome" = 'DENIED' AND "createdAt" >= ${since} GROUP BY 1`;

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * DAY);
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    const day = rows.filter((r) => r.day === key);
    const byStatus = Object.fromEntries(day.map((r) => [r.status, r.count]));
    series.push({
      date: key,
      requests: day.reduce((s, r) => s + r.count, 0),
      granted: (byStatus.ACTIVE ?? 0) + (byStatus.EXPIRED ?? 0) + (byStatus.REVOKED ?? 0),
      denied: denials.find((r) => r.day === key)?.count ?? 0,
    });
  }
  return series;
}

export async function dashboard() {
  await expireDueAuthorizations();
  const now = await dbNow();
  const [patients, professionals, verified, pending, active, byStatus, byRole, deniedAttempts, totalRequests, recentAudit, series, alerts] =
    await Promise.all([
      prisma.patientProfile.count(),
      prisma.healthcareProfessional.count(),
      prisma.healthcareProfessional.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.healthcareProfessional.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.emergencyAuthorization.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      prisma.emergencyAuthorization.groupBy({ by: ['status'], _count: true }),
      prisma.emergencyAuthorization.groupBy({ by: ['professionalRole'], _count: true }),
      prisma.auditLog.count({ where: { outcome: 'DENIED' } }),
      prisma.emergencyAuthorization.count(),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      dailySeries(14),
      detectSuspiciousActivity(),
    ]);
  const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  return {
    metrics: {
      totalPatients: patients,
      totalProfessionals: professionals,
      verifiedProfessionals: verified,
      pendingVerification: pending,
      activeSessions: active,
      expiredAuthorizations: statusCounts.EXPIRED ?? 0,
      revokedAuthorizations: statusCounts.REVOKED ?? 0,
      deniedAuthorizations: statusCounts.DENIED ?? 0,
      deniedAttempts,
      totalRequests,
    },
    statusDistribution: ['ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED', 'DENIED'].map((s) => ({ status: s, count: statusCounts[s] ?? 0 })),
    roleDistribution: ['PARAMEDIC', 'DOCTOR', 'SPECIALIST'].map((r) => ({
      role: r,
      count: byRole.find((x) => x.professionalRole === r)?._count ?? 0,
    })),
    activity: series,
    recentAudit,
    alerts: alerts.slice(0, 5),
    alertCount: alerts.length,
    serverTime: now,
  };
}

export async function listPatients(query) {
  const { page, pageSize, skip, take } = paginate(query);
  const q = query.q?.trim();
  const where = q
    ? {
        OR: [
          { emergencyId: { contains: q.toUpperCase() } },
          { user: { fullName: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
        ],
      }
    : {};
  // Administrators see account metadata and completeness only — no clinical values.
  const [rows, total] = await Promise.all([
    prisma.patientProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        contacts: { select: { id: true } },
        medical: { include: { allergies: { select: { id: true } }, conditions: { select: { id: true } }, medications: { select: { id: true } }, history: { select: { id: true } } } },
        _count: { select: { authorizations: true } },
      },
    }),
    prisma.patientProfile.count({ where }),
  ]);
  return {
    items: rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      fullName: p.user.fullName,
      email: p.user.email,
      status: p.user.status,
      emergencyId: p.emergencyId,
      registeredAt: p.createdAt,
      lastUpdated: p.updatedAt,
      profileCompletion: profileCompletion(p).percent,
      authorizationCount: p._count.authorizations,
    })),
    meta: pageMeta(page, pageSize, total),
  };
}

export async function listProfessionals(query) {
  const { page, pageSize, skip, take } = paginate(query);
  const q = query.q?.trim();
  const where = {
    ...(query.verification && { verificationStatus: query.verification }),
    ...(query.role && { user: { role: query.role } }),
    ...(q && {
      OR: [
        { professionalId: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.healthcareProfessional.findMany({
      where,
      skip,
      take,
      orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
      include: { user: true, _count: { select: { authorizations: true } } },
    }),
    prisma.healthcareProfessional.count({ where }),
  ]);
  return {
    items: rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      fullName: p.user.fullName,
      email: p.user.email,
      role: p.user.role,
      status: p.user.status,
      professionalId: p.professionalId,
      organization: p.organization,
      specialty: p.specialty,
      verificationStatus: p.verificationStatus,
      verifiedAt: p.verifiedAt,
      registeredAt: p.createdAt,
      lastLoginAt: p.user.lastLoginAt,
      authorizationCount: p._count.authorizations,
    })),
    meta: pageMeta(page, pageSize, total),
  };
}

export async function setVerification(req, { professionalId, decision }) {
  const pro = await prisma.healthcareProfessional.findUnique({ where: { id: professionalId }, include: { user: true } });
  if (!pro) throw notFound('Professional not found');
  const verificationStatus = decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
  const updated = await prisma.healthcareProfessional.update({
    where: { id: pro.id },
    data: { verificationStatus, verifiedAt: decision === 'VERIFY' ? new Date() : null, verifiedById: req.auth.user.id },
  });
  await audit(
    {
      action: decision === 'VERIFY' ? AuditAction.PROFESSIONAL_VERIFIED : AuditAction.PROFESSIONAL_REJECTED,
      metadata: { subjectProfessionalId: pro.professionalId, subjectName: pro.user.fullName, subjectRole: pro.user.role, organization: pro.organization },
    },
    req,
  );
  return { id: updated.id, verificationStatus: updated.verificationStatus, verifiedAt: updated.verifiedAt };
}

export async function setAccountStatus(req, { userId, status }) {
  if (userId === req.auth.user.id) throw new AppError(400, 'SELF_SUSPEND', 'You cannot change the status of your own account');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status } }),
    ...(status === 'SUSPENDED' ? [prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })] : []),
  ]);
  await audit({ action: AuditAction.ACCOUNT_STATUS_CHANGED, metadata: { subjectUserId: userId, subjectName: user.fullName, status } }, req);
  return { userId, status };
}

export async function listAuthorizations(query) {
  await expireDueAuthorizations();
  const { page, pageSize, skip, take } = paginate(query);
  const now = await dbNow();
  const q = query.q?.trim();
  const where = {
    ...(query.status && { status: query.status }),
    ...(query.role && { professionalRole: query.role }),
    ...(query.status === 'ACTIVE' && { expiresAt: { gt: now } }),
    ...(q && {
      OR: [
        { patientEmergencyId: { contains: q.toUpperCase() } },
        { professionalId: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
        { id: q.length === 36 ? q : undefined },
      ].filter((c) => Object.values(c)[0] !== undefined),
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.emergencyAuthorization.findMany({
      where,
      skip,
      take,
      orderBy: { requestedAt: 'desc' },
      include: { professional: { include: { user: { select: { fullName: true } } } }, patient: { include: { user: { select: { fullName: true } } } } },
    }),
    prisma.emergencyAuthorization.count({ where }),
  ]);
  return { items: rows.map((a) => serializeAuthorization(a, now)), meta: pageMeta(page, pageSize, total), serverTime: now };
}

export async function revoke(req, { authorizationId, reason }) {
  return revokeAuthorization(req, authorizationId, { reason });
}

function auditWhere(query) {
  const q = query.q?.trim();
  const createdAt = {};
  if (query.from) createdAt.gte = new Date(query.from);
  if (query.to) {
    const to = new Date(query.to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) to.setUTCHours(23, 59, 59, 999);
    createdAt.lte = to;
  }
  return {
    ...(Object.keys(createdAt).length && { createdAt }),
    ...(query.role && { actorRole: query.role }),
    ...(query.outcome && { outcome: query.outcome }),
    ...(query.action && { action: query.action }),
    ...(query.emergencyId && { patientEmergencyId: { contains: query.emergencyId.trim().toUpperCase() } }),
    ...(query.organization && { organization: { contains: query.organization, mode: 'insensitive' } }),
    ...(query.authorizationId && { authorizationId: query.authorizationId }),
    ...(q && {
      OR: [
        { actorName: { contains: q, mode: 'insensitive' } },
        { professionalId: { contains: q, mode: 'insensitive' } },
        { patientEmergencyId: { contains: q.toUpperCase() } },
        { action: { contains: q.toUpperCase().replace(/\s+/g, '_') } },
        { organization: { contains: q, mode: 'insensitive' } },
        { authorizationId: { contains: q } },
      ],
    }),
  };
}

export async function listAuditLogs(query) {
  const { page, pageSize, skip, take } = paginate(query, { defaultSize: 25 });
  const where = auditWhere(query);
  const [items, total, actions] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
  ]);
  return { items, meta: pageMeta(page, pageSize, total), actions: actions.map((a) => a.action) };
}

export async function getAuditLog(id) {
  const event = await prisma.auditLog.findUnique({ where: { id } });
  if (!event) throw notFound('Audit event not found');
  // Related events for the same authorization form the activity timeline.
  const timeline = event.authorizationId
    ? await prisma.auditLog.findMany({ where: { authorizationId: event.authorizationId }, orderBy: { createdAt: 'asc' } })
    : [];
  const authorization = event.authorizationId
    ? await prisma.emergencyAuthorization.findUnique({
        where: { id: event.authorizationId },
        include: { professional: { include: { user: { select: { fullName: true } } } }, patient: { include: { user: { select: { fullName: true } } } } },
      })
    : null;
  return { event, timeline, authorization: authorization ? serializeAuthorization(authorization, await dbNow()) : null };
}

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  let s = Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportAuditCsv(query) {
  const rows = await prisma.auditLog.findMany({ where: auditWhere(query), orderBy: { createdAt: 'desc' }, take: 10000 });
  const columns = [
    'createdAt', 'action', 'outcome', 'actorName', 'actorRole', 'professionalId', 'organization', 'patientEmergencyId',
    'authorizationId', 'reason', 'justification', 'categoriesAccessed', 'accessDurationSec', 'expiryStatus', 'denialReason', 'ipAddress',
  ];
  return [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n');
}

export async function analytics({ days = 30 } = {}) {
  await expireDueAuthorizations();
  const since = new Date(Date.now() - days * DAY);
  const [series, byReason, byOrg, denialReasons, byRole, durations, hourly] = await Promise.all([
    dailySeries(days),
    prisma.emergencyAuthorization.groupBy({ by: ['reason'], where: { requestedAt: { gte: since } }, _count: true }),
    prisma.emergencyAuthorization.groupBy({ by: ['organization'], where: { requestedAt: { gte: since } }, _count: true, orderBy: { _count: { organization: 'desc' } }, take: 6 }),
    prisma.auditLog.groupBy({ by: ['denialReason'], where: { outcome: 'DENIED', createdAt: { gte: since }, denialReason: { not: null } }, _count: true }),
    prisma.emergencyAuthorization.groupBy({ by: ['professionalRole', 'status'], where: { requestedAt: { gte: since } }, _count: true }),
    prisma.$queryRaw`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("endedAt" - "grantedAt"))), 0)::float AS avg_seconds,
             COUNT(*)::int AS completed
      FROM "EmergencyAuthorization" WHERE "grantedAt" IS NOT NULL AND "endedAt" IS NOT NULL AND "requestedAt" >= ${since}`,
    prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM "requestedAt" AT TIME ZONE 'Asia/Kolkata')::int AS hour, COUNT(*)::int AS count
      FROM "EmergencyAuthorization" WHERE "requestedAt" >= ${since} GROUP BY 1 ORDER BY 1`,
  ]);
  const roles = ['PARAMEDIC', 'DOCTOR', 'SPECIALIST'];
  return {
    days,
    activity: series,
    byReason: byReason.map((r) => ({ reason: r.reason, count: r._count })).sort((a, b) => b.count - a.count),
    byOrganization: byOrg.map((o) => ({ organization: o.organization, count: o._count })),
    denialReasons: denialReasons.map((d) => ({ reason: d.denialReason, count: d._count })).sort((a, b) => b.count - a.count),
    byRole: roles.map((role) => {
      const r = byRole.filter((x) => x.professionalRole === role);
      const get = (s) => r.find((x) => x.status === s)?._count ?? 0;
      return { role, granted: get('ACTIVE') + get('EXPIRED') + get('REVOKED'), denied: get('DENIED'), revoked: get('REVOKED') };
    }),
    averageAccessSeconds: Math.round(durations[0]?.avg_seconds ?? 0),
    completedSessions: durations[0]?.completed ?? 0,
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourly.find((x) => x.hour === h)?.count ?? 0 })),
  };
}
