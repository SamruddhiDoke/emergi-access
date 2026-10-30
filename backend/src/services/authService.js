import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { SESSION_COOKIE } from '../middleware/auth.js';
import { CSRF_COOKIE, issueCsrfToken } from '../middleware/csrf.js';
import { audit } from '../audit/auditService.js';
import { AuditAction } from '../audit/actions.js';
import { AppError, badRequest, forbidden, unauthorized } from '../utils/errors.js';
import { generateEmergencyId } from '../utils/emergencyId.js';
import { requestContext } from '../utils/request.js';
import { issueOtp, checkOtp } from './otpService.js';

const BCRYPT_ROUNDS = env.isTest ? 4 : 12;
// Compared against when the email is unknown, so response time does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', BCRYPT_ROUNDS);

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    professional: user.professional
      ? {
          id: user.professional.id,
          professionalId: user.professional.professionalId,
          organization: user.professional.organization,
          specialty: user.professional.specialty,
          verificationStatus: user.professional.verificationStatus,
          verifiedAt: user.professional.verifiedAt,
        }
      : null,
    patient: user.patient ? { emergencyId: user.patient.emergencyId } : null,
  };
}

async function startSession(user, req, res) {
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 3600_000);
  const session = await prisma.session.create({ data: { userId: user.id, expiresAt, ...requestContext(req) } });
  const token = jwt.sign({ sub: user.id, sid: session.id, role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    issuer: 'emergi-access',
    expiresIn: env.sessionTtlHours * 3600,
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.cookieSecure,
    path: '/',
    maxAge: env.sessionTtlHours * 3600_000,
  });
  // Rotate the CSRF token on privilege change (login).
  issueCsrfToken(res);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { session, expiresAt };
}

export function clearSessionCookies(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

async function createUniqueEmergencyId(client) {
  for (let i = 0; i < 5; i++) {
    const id = generateEmergencyId();
    const exists = await client.patientProfile.findUnique({ where: { emergencyId: id }, select: { id: true } });
    if (!exists) return id;
  }
  throw new AppError(500, 'ID_GENERATION_FAILED', 'Could not allocate an Emergency ID');
}

export function medicalCreateData(medical) {
  return {
    bloodGroup: medical.bloodGroup ?? null,
    allergies: { create: medical.allergies ?? [] },
    conditions: { create: medical.conditions ?? [] },
    medications: { create: medical.medications ?? [] },
    alerts: { create: medical.alerts ?? [] },
    history: { create: medical.history ?? [] },
  };
}

export async function registerPatient(input, req, res) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const emergencyId = await createUniqueEmergencyId(tx);
    return tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'PATIENT',
        fullName: input.fullName,
        phone: input.phone,
        patient: {
          create: {
            emergencyId,
            dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00Z`),
            gender: input.gender ?? null,
            medical: { create: medicalCreateData(input.medical ?? {}) },
            contacts: { create: input.contacts },
          },
        },
      },
      include: { patient: true, professional: true },
    });
  });

  await audit({ action: AuditAction.REGISTER, actorUserId: user.id, actorRole: 'PATIENT', actorName: user.fullName, patientEmergencyId: user.patient.emergencyId }, req);
  await startSession(user, req, res);
  return serializeUser(user);
}

export async function registerProfessional(input, req) {
  const [emailTaken, idTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.healthcareProfessional.findUnique({ where: { professionalId: input.professionalId } }),
  ]);
  if (emailTaken) throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  if (idTaken) throw new AppError(409, 'PROFESSIONAL_ID_IN_USE', 'This professional ID is already registered');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      fullName: input.fullName,
      professional: {
        create: {
          professionalId: input.professionalId,
          organization: input.organization,
          specialty: input.role === 'SPECIALIST' ? input.specialty : null,
          verificationStatus: 'PENDING',
        },
      },
    },
    include: { professional: true, patient: true },
  });
  await audit(
    {
      action: AuditAction.REGISTER,
      actorUserId: user.id,
      actorRole: user.role,
      actorName: user.fullName,
      professionalId: user.professional.professionalId,
      organization: user.professional.organization,
      metadata: { verificationStatus: 'PENDING' },
    },
    req,
  );
  return serializeUser(user);
}

export async function login({ email, password, portal }, req, res) {
  const user = await prisma.user.findUnique({ where: { email }, include: { professional: true, patient: true } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    await audit(
      {
        action: AuditAction.LOGIN_FAILED,
        outcome: 'FAILURE',
        actorUserId: user?.id ?? null,
        actorRole: user?.role ?? null,
        actorName: user?.fullName ?? null,
        professionalId: user?.professional?.professionalId ?? null,
        organization: user?.professional?.organization ?? null,
        denialReason: 'INVALID_CREDENTIALS',
        metadata: { portal },
      },
      req,
    );
    throw unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVE') throw forbidden('This account is suspended. Contact your administrator.', 'ACCOUNT_SUSPENDED');

  const isPatient = user.role === 'PATIENT';
  if (portal === 'patient' && !isPatient) {
    throw forbidden('This is a healthcare professional account. Please use the professional sign-in.', 'WRONG_PORTAL');
  }
  if (portal === 'professional' && isPatient) {
    throw forbidden('This is a patient account. Please use the patient sign-in.', 'WRONG_PORTAL');
  }

  if (isPatient) {
    await startSession(user, req, res);
    await audit({ action: AuditAction.LOGIN_SUCCESS, actorUserId: user.id, actorRole: user.role, actorName: user.fullName }, req);
    return { mfaRequired: false, user: serializeUser(user) };
  }

  // Professionals and administrators complete a second factor (simulated in the demo environment).
  const challenge = await issueOtp({ userId: user.id, purpose: 'LOGIN' });
  await audit(
    {
      action: AuditAction.LOGIN_OTP_ISSUED,
      actorUserId: user.id,
      actorRole: user.role,
      actorName: user.fullName,
      professionalId: user.professional?.professionalId ?? null,
      organization: user.professional?.organization ?? null,
    },
    req,
  );
  return { mfaRequired: true, challenge, maskedEmail: user.email.replace(/^(.).*(@.*)$/, '$1•••$2') };
}

export async function verifyLoginOtp({ challengeId, code }, req, res) {
  const otp = await prisma.otpVerification.findUnique({ where: { id: challengeId } });
  if (!otp || otp.purpose !== 'LOGIN') throw badRequest('This verification code has expired. Please sign in again.');

  const result = await checkOtp({ where: { id: challengeId, purpose: 'LOGIN' }, code });
  const user = await prisma.user.findUnique({ where: { id: otp.userId }, include: { professional: true, patient: true } });

  if (!result.ok) {
    await audit(
      {
        action: AuditAction.LOGIN_OTP_FAILED,
        outcome: 'FAILURE',
        actorUserId: user.id,
        actorRole: user.role,
        actorName: user.fullName,
        professionalId: user.professional?.professionalId ?? null,
        organization: user.professional?.organization ?? null,
        denialReason: `OTP_${result.reason}`,
      },
      req,
    );
    if (result.reason === 'INVALID') {
      throw new AppError(400, 'OTP_INVALID', 'Incorrect code', { remainingAttempts: result.remainingAttempts });
    }
    throw new AppError(400, 'OTP_EXPIRED', 'This verification code is no longer valid. Please sign in again.');
  }

  await startSession(user, req, res);
  await audit(
    {
      action: AuditAction.LOGIN_SUCCESS,
      actorUserId: user.id,
      actorRole: user.role,
      actorName: user.fullName,
      professionalId: user.professional?.professionalId ?? null,
      organization: user.professional?.organization ?? null,
      metadata: { mfa: 'SIMULATED_OTP' },
    },
    req,
  );
  return serializeUser(user);
}

export async function logout(req, res) {
  if (req.auth?.session) {
    await prisma.session.update({ where: { id: req.auth.session.id }, data: { revokedAt: new Date() } });
    await audit({ action: AuditAction.LOGOUT }, req);
  }
  clearSessionCookies(res);
}

export async function changePassword(req, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: req.auth.user.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Your current password is incorrect');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    // Sign out every other session for this account.
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null, NOT: { id: req.auth.session.id } },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function verifyPassword(userId, plain) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return Boolean(user) && bcrypt.compare(plain, user.passwordHash);
}
