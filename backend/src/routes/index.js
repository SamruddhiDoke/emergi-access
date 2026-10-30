import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, requireVerifiedProfessional } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as patient from '../controllers/patientController.js';
import * as emergency from '../controllers/emergencyController.js';
import * as admin from '../controllers/adminController.js';

const uuidParam = validate(z.object({ id: z.string().uuid('Invalid identifier') }), 'params');

export function buildRouter(limits) {
  const api = Router();

  // ── Authentication ──────────────────────────────────────────────────────────
  api.get('/auth/csrf', auth.csrf);
  api.post('/auth/register', limits.auth, validate(S.patientRegisterSchema), auth.registerPatient);
  api.post('/auth/register/professional', limits.auth, validate(S.professionalRegisterSchema), auth.registerProfessional);
  api.post('/auth/login', limits.auth, validate(S.loginSchema), auth.login);
  api.post('/auth/verify-otp', limits.otp, validate(S.otpSchema), auth.verifyOtp);
  api.post('/auth/logout', authenticate, auth.logout);
  api.get('/auth/session', auth.session);
  api.get('/auth/me', authenticate, auth.me);
  api.post('/auth/change-password', authenticate, validate(S.changePasswordSchema), auth.changePassword);

  // ── Patient (identity always derived from the session; no patient IDs accepted) ──
  const p = Router();
  p.use(authenticate, requireRole('PATIENT'));
  p.get('/me', patient.getProfile);
  p.put('/me', validate(S.updatePatientSchema), patient.updateProfile);
  p.get('/me/dashboard', patient.dashboard);
  p.get('/me/emergency-id', patient.emergencyId);
  p.post('/me/emergency-id/regenerate', patient.regenerateEmergencyId);
  p.get('/me/qr', patient.qr);
  p.get('/me/qr.png', patient.qrPng);
  p.get('/me/summary.pdf', patient.summaryPdf);
  p.get('/me/access-history', patient.accessHistory);
  p.get('/me/authorizations', patient.authorizations);
  p.post('/me/revoke-access', validate(S.revokeSchema), patient.revoke);
  api.use('/patients', p);

  // ── Emergency (verified clinical professionals only) ────────────────────────
  const e = Router();
  e.use(authenticate, requireRole('PARAMEDIC', 'DOCTOR', 'SPECIALIST'));
  e.get('/dashboard', emergency.dashboard);
  e.get('/history', emergency.history);
  e.use(requireVerifiedProfessional);
  e.post('/identify', limits.identify, validate(S.identifySchema), emergency.identify);
  e.post('/request-access', validate(S.requestAccessSchema), emergency.requestAccess);
  e.post('/verify-otp', limits.otp, validate(S.breakGlassOtpSchema), emergency.verifyOtp);
  e.get('/authorization/:id', uuidParam, emergency.status);
  e.get('/medical-information/:id', uuidParam, emergency.medicalInformation);
  e.get('/medical-information/:id/summary.pdf', uuidParam, emergency.summaryPdf);
  e.post('/revoke/:id', uuidParam, validate(S.endAccessSchema), emergency.endAccess);
  api.use('/emergency', e);

  // ── Administration (metadata and audit only — no clinical record access) ────
  const a = Router();
  a.use(authenticate, requireRole('ADMIN'));
  a.get('/dashboard', admin.dashboard);
  a.get('/patients', admin.patients);
  a.get('/professionals', admin.professionals);
  a.post('/verify-professional', validate(S.verifyProfessionalSchema), admin.verifyProfessional);
  a.post('/account-status', validate(S.accountStatusSchema), admin.accountStatus);
  a.get('/authorizations', admin.authorizations);
  a.post('/revoke-access', validate(S.adminRevokeSchema), admin.revoke);
  a.get('/audit-logs', admin.auditLogs);
  a.get('/audit-logs/export.csv', admin.exportAudit);
  a.get('/audit-logs/:id', uuidParam, admin.auditLog);
  a.get('/suspicious-activity', admin.suspicious);
  a.get('/analytics', admin.analytics);
  a.get('/settings', admin.getSettings);
  a.put('/settings', validate(S.settingsSchema), admin.updateSettings);
  api.use('/admin', a);

  return api;
}
