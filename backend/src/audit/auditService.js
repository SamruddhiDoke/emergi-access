import { prisma } from '../config/prisma.js';
import { requestContext } from '../utils/request.js';

/**
 * Writes an append-only audit event. Never pass passwords, tokens, OTP codes or medical values here —
 * only category names describing *what kind* of information was accessed.
 */
export async function audit(event, req, client = prisma) {
  const actor = req?.auth;
  const ctx = req ? requestContext(req) : {};
  return client.auditLog.create({
    data: {
      action: event.action,
      outcome: event.outcome || 'SUCCESS',
      actorUserId: event.actorUserId ?? actor?.user?.id ?? null,
      actorRole: event.actorRole ?? actor?.user?.role ?? null,
      actorName: event.actorName ?? actor?.user?.fullName ?? null,
      professionalId: event.professionalId ?? actor?.professional?.professionalId ?? null,
      organization: event.organization ?? actor?.professional?.organization ?? null,
      patientEmergencyId: event.patientEmergencyId ?? null,
      authorizationId: event.authorizationId ?? null,
      reason: event.reason ?? null,
      justification: event.justification ?? null,
      categoriesAccessed: event.categoriesAccessed ?? [],
      accessDurationSec: event.accessDurationSec ?? null,
      expiryStatus: event.expiryStatus ?? null,
      denialReason: event.denialReason ?? null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: event.metadata ?? undefined,
    },
  });
}
