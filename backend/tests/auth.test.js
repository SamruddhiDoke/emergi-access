import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { client, signIn, resetDatabase, prisma, EMAILS, DEMO_PASSWORD } from './helpers.js';

const newPatient = (overrides = {}) => ({
  fullName: 'Test Patient',
  email: `test.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`,
  phone: '+91 90000 00000',
  password: 'Sup3rSecure!pass',
  dateOfBirth: '1990-05-05',
  gender: 'PREFER_NOT_TO_SAY',
  medical: {
    bloodGroup: 'A+',
    allergies: [{ allergen: 'Penicillin', severity: 'SEVERE', reaction: 'Rash' }],
    conditions: [],
    medications: [],
    alerts: [],
    history: [],
  },
  contacts: [{ name: 'Contact Person', relationship: 'Friend', phone: '+91 90000 00001' }],
  ...overrides,
});

beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('Patient registration', () => {
  it('registers a patient, issues an opaque Emergency ID and starts a session', async () => {
    const c = await client();
    const body = newPatient();
    const res = await c.post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('PATIENT');
    expect(res.body.user.patient.emergencyId).toMatch(/^EA-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const me = await c.get('/api/patients/me');
    expect(me.status).toBe(200);
    expect(me.body.medical.bloodGroup).toBe('A+');

    const stored = await prisma.user.findUnique({ where: { email: body.email } });
    expect(stored.passwordHash).not.toContain(body.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('generates a QR code whose payload is only the Emergency ID', async () => {
    const c = await client();
    await c.post('/api/auth/register').send(newPatient({ fullName: 'Qr Privacy Check' }));
    const qr = await c.get('/api/patients/me/qr');
    expect(qr.status).toBe(200);
    expect(qr.body.payload).toBe(qr.body.emergencyId);
    expect(qr.body.payload).not.toMatch(/Qr|Privacy|Penicillin|A\+/);
    expect(qr.body.dataUrl).toMatch(/^data:image\/png;base64,/);

    const png = await c.get('/api/patients/me/qr.png');
    expect(png.status).toBe(200);
    expect(png.headers['content-type']).toBe('image/png');
  });

  it('rejects duplicate emails, weak passwords and missing contacts', async () => {
    const c = await client();
    expect((await c.post('/api/auth/register').send(newPatient({ email: EMAILS.ananya }))).status).toBe(409);
    const weak = await c.post('/api/auth/register').send(newPatient({ password: 'short' }));
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('BAD_REQUEST');
    expect((await c.post('/api/auth/register').send(newPatient({ contacts: [] }))).status).toBe(400);
  });

  it('registers professionals as pending verification', async () => {
    const c = await client();
    const res = await c.post('/api/auth/register/professional').send({
      professionalId: 'MH-DOC-99001',
      fullName: 'Dr. Pending Person',
      email: `pending.${Date.now()}@example.com`,
      password: 'Pr0fessional!pw',
      role: 'DOCTOR',
      organization: 'Test Hospital',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.professional.verificationStatus).toBe('PENDING');
  });
});

describe('Login, MFA and sessions', () => {
  it('rejects wrong passwords and audits the failure', async () => {
    const c = await client();
    const res = await c.post('/api/auth/login').send({ email: EMAILS.ananya, password: 'wrong-password-1', portal: 'patient' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    const log = await prisma.auditLog.findFirst({ where: { action: 'LOGIN_FAILED' }, orderBy: { createdAt: 'desc' } });
    expect(log.outcome).toBe('FAILURE');
    // Passwords never end up in the audit trail.
    expect(JSON.stringify(log)).not.toContain('wrong-password-1');
  });

  it('keeps patients and professionals on their own portals', async () => {
    const c = await client();
    const a = await c.post('/api/auth/login').send({ email: EMAILS.paramedic, password: DEMO_PASSWORD, portal: 'patient' });
    expect(a.status).toBe(403);
    expect(a.body.error.code).toBe('WRONG_PORTAL');
  });

  it('requires a one-time code for professionals and rejects wrong codes', async () => {
    const c = await client();
    const res = await c.post('/api/auth/login').send({ email: EMAILS.doctor, password: DEMO_PASSWORD, portal: 'professional' });
    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.challenge.delivery).toBe('SIMULATED');
    // No session before the second factor.
    expect((await c.get('/api/auth/me')).status).toBe(401);

    const wrongCode = res.body.challenge.demoCode === '000000' ? '111111' : '000000';
    const bad = await c.post('/api/auth/verify-otp').send({ challengeId: res.body.challenge.challengeId, code: wrongCode });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('OTP_INVALID');

    const good = await c.post('/api/auth/verify-otp').send({ challengeId: res.body.challenge.challengeId, code: res.body.challenge.demoCode });
    expect(good.status).toBe(200);
    expect((await c.get('/api/auth/me')).body.user.role).toBe('DOCTOR');

    // A consumed code cannot be replayed.
    const replay = await c.post('/api/auth/verify-otp').send({ challengeId: res.body.challenge.challengeId, code: res.body.challenge.demoCode });
    expect(replay.status).toBe(400);
  });

  it('stores OTPs only as hashes', async () => {
    const c = await client();
    const res = await c.post('/api/auth/login').send({ email: EMAILS.admin, password: DEMO_PASSWORD, portal: 'professional' });
    const otp = await prisma.otpVerification.findUnique({ where: { id: res.body.challenge.challengeId } });
    expect(otp.codeHash).not.toBe(res.body.challenge.demoCode);
    expect(otp.codeHash).toHaveLength(64);
  });

  it('invalidates the session server-side on logout, even if the old token is replayed', async () => {
    const c = await signIn(EMAILS.ananya);
    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(200);
    const session = await prisma.session.findFirst({ where: { userId: me.body.user.id, revokedAt: null }, orderBy: { createdAt: 'desc' } });
    // Reconstruct a token-bearing request after logout using a Bearer header with the same session.
    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('../src/config/env.js');
    const token = jwt.sign({ sub: me.body.user.id, sid: session.id, role: 'PATIENT' }, env.jwtSecret, { algorithm: 'HS256', issuer: 'emergi-access', expiresIn: 3600 });

    expect((await c.post('/api/auth/logout')).status).toBe(204);
    expect((await c.get('/api/auth/me')).status).toBe(401);

    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    const replay = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('SESSION_INVALID');
  });

  it('session probe reports signed-out visitors without an error status', async () => {
    const anon = await client();
    const res = await anon.get('/api/auth/session');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    const signedIn = await signIn(EMAILS.ananya);
    expect((await signedIn.get('/api/auth/session')).body.user.role).toBe('PATIENT');
  });

  it('rejects forged and tampered tokens', async () => {
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    const jwt = (await import('jsonwebtoken')).default;
    const forged = jwt.sign({ sub: 'x', sid: 'y', role: 'ADMIN' }, 'not-the-secret', { issuer: 'emergi-access' });
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('enforces CSRF protection on cookie-authenticated mutations', async () => {
    const c = await signIn(EMAILS.ananya);
    const res = await c.raw.put('/api/patients/me').set('X-CSRF-Token', 'bogus').send({ fullName: 'Hacked Name' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });
});
