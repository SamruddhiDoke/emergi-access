import * as adminService from '../services/adminService.js';
import * as settingsService from '../services/settingsService.js';
import { detectSuspiciousActivity } from '../services/suspiciousActivity.js';
import { audit } from '../audit/auditService.js';
import { AuditAction } from '../audit/actions.js';

export const dashboard = async (_req, res) => res.json(await adminService.dashboard());
export const patients = async (req, res) => res.json(await adminService.listPatients(req.query));
export const professionals = async (req, res) => res.json(await adminService.listProfessionals(req.query));
export const verifyProfessional = async (req, res) => res.json(await adminService.setVerification(req, req.body));
export const accountStatus = async (req, res) => res.json(await adminService.setAccountStatus(req, req.body));
export const authorizations = async (req, res) => res.json(await adminService.listAuthorizations(req.query));
export const revoke = async (req, res) => res.json({ authorization: await adminService.revoke(req, req.body) });
export const auditLogs = async (req, res) => res.json(await adminService.listAuditLogs(req.query));
export const auditLog = async (req, res) => res.json(await adminService.getAuditLog(req.params.id));
export const analytics = async (req, res) => res.json(await adminService.analytics({ days: Math.min(90, Math.max(7, Number(req.query.days) || 30)) }));

export async function suspicious(req, res) {
  const windowHours = Math.min(168, Math.max(1, Number(req.query.windowHours) || 24));
  res.json({ alerts: await detectSuspiciousActivity({ windowHours }), windowHours });
}

export async function exportAudit(req, res) {
  const csv = await adminService.exportAuditCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="emergi-access-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}

export const getSettings = async (_req, res) => res.json(await settingsService.getSettings());

export async function updateSettings(req, res) {
  const settings = await settingsService.updateSettings(req.body, req.auth.user.id);
  await audit({ action: AuditAction.SETTINGS_UPDATED, metadata: req.body }, req);
  res.json(settings);
}
