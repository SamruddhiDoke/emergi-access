import { prisma } from '../config/prisma.js';
import { AuditAction } from '../audit/actions.js';

/**
 * Rule-based anomaly detection over the audit trail. Each rule groups recent events by actor and
 * flags actors over a threshold. Rules are deliberately transparent so administrators can explain
 * why an alert fired.
 */
const RULES = [
  {
    id: 'REPEATED_DENIALS',
    title: 'Repeated denied access attempts',
    severity: 'HIGH',
    threshold: 3,
    where: { outcome: 'DENIED' },
    describe: (n) => `${n} denied access attempts`,
  },
  {
    id: 'EMERGENCY_ID_ENUMERATION',
    title: 'Possible Emergency ID enumeration',
    severity: 'HIGH',
    threshold: 3,
    where: { action: AuditAction.IDENTIFY_FAILED },
    describe: (n) => `${n} unrecognised Emergency IDs submitted`,
  },
  {
    id: 'OTP_FAILURES',
    title: 'Repeated verification failures',
    severity: 'MEDIUM',
    threshold: 3,
    where: { action: { in: [AuditAction.OTP_FAILED, AuditAction.LOGIN_OTP_FAILED] } },
    describe: (n) => `${n} failed one-time-code verifications`,
  },
  {
    id: 'HIGH_REQUEST_VOLUME',
    title: 'Unusually high emergency access volume',
    severity: 'MEDIUM',
    threshold: 5,
    where: { action: AuditAction.ACCESS_REQUESTED },
    describe: (n) => `${n} break-glass requests`,
  },
  {
    id: 'FAILED_LOGINS',
    title: 'Repeated failed sign-ins',
    severity: 'LOW',
    threshold: 4,
    where: { action: AuditAction.LOGIN_FAILED, actorUserId: { not: null } },
    describe: (n) => `${n} failed sign-in attempts`,
  },
];

export async function detectSuspiciousActivity({ windowHours = 24 } = {}) {
  const since = new Date(Date.now() - windowHours * 3600_000);
  const alerts = [];

  for (const rule of RULES) {
    const groups = await prisma.auditLog.groupBy({
      by: ['actorUserId', 'actorName', 'actorRole', 'professionalId', 'organization'],
      where: { ...rule.where, createdAt: { gte: since }, actorUserId: rule.where.actorUserId ?? { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
    });
    for (const g of groups) {
      const count = g._count._all;
      if (count < rule.threshold) continue;
      alerts.push({
        id: `${rule.id}:${g.actorUserId}`,
        rule: rule.id,
        title: rule.title,
        severity: rule.severity,
        description: `${rule.describe(count)} in the last ${windowHours} hours`,
        count,
        actor: { userId: g.actorUserId, name: g.actorName, role: g.actorRole, professionalId: g.professionalId, organization: g.organization },
        firstSeen: g._min.createdAt,
        lastSeen: g._max.createdAt,
      });
    }
  }

  // Distinct patients accessed per professional — breadth can indicate browsing rather than care.
  const breadth = await prisma.$queryRaw`
    SELECT "actorUserId", MAX("actorName") AS "actorName", MAX("actorRole"::text) AS "actorRole",
           MAX("professionalId") AS "professionalId", MAX("organization") AS "organization",
           COUNT(DISTINCT "patientEmergencyId")::int AS patients, MIN("createdAt") AS "firstSeen", MAX("createdAt") AS "lastSeen"
    FROM "AuditLog"
    WHERE "action" = ${AuditAction.ACCESS_GRANTED} AND "createdAt" >= ${since} AND "actorUserId" IS NOT NULL
    GROUP BY "actorUserId"
    HAVING COUNT(DISTINCT "patientEmergencyId") >= 4`;
  for (const b of breadth) {
    alerts.push({
      id: `MULTI_PATIENT_ACCESS:${b.actorUserId}`,
      rule: 'MULTI_PATIENT_ACCESS',
      title: 'Access across many patient records',
      severity: 'MEDIUM',
      description: `Emergency access granted for ${b.patients} different patients in the last ${windowHours} hours`,
      count: b.patients,
      actor: { userId: b.actorUserId, name: b.actorName, role: b.actorRole, professionalId: b.professionalId, organization: b.organization },
      firstSeen: b.firstSeen,
      lastSeen: b.lastSeen,
    });
  }

  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || new Date(b.lastSeen) - new Date(a.lastSeen));
}
