import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { app, signIn, grantAccess, resetDatabase, prisma, EMAILS, IDS } from './helpers.js';

let paramedic, admin, ananya, rohan;

beforeAll(async () => {
  await resetDatabase();
  [paramedic, admin, ananya, rohan] = await Promise.all([signIn(EMAILS.paramedic), signIn(EMAILS.admin), signIn(EMAILS.ananya), signIn(EMAILS.rohan)]);
});
afterAll(() => prisma.$disconnect());

describe('Role-based access control', () => {
  it('requires authentication for protected routes', async () => {
    for (const path of ['/api/patients/me', '/api/admin/dashboard', '/api/emergency/dashboard', '/api/auth/me']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
  });

  it('keeps each role inside its own portal', async () => {
    expect((await ananya.get('/api/admin/dashboard')).status).toBe(403);
    expect((await ananya.get('/api/emergency/dashboard')).status).toBe(403);
    expect((await paramedic.get('/api/patients/me')).status).toBe(403);
    expect((await paramedic.get('/api/admin/audit-logs')).status).toBe(403);
    expect((await admin.get('/api/patients/me')).status).toBe(403);
  });

  it('administrators cannot read clinical records', async () => {
    const auth = await grantAccess(paramedic, IDS.ananya);
    expect((await admin.get(`/api/emergency/medical-information/${auth.id}`)).status).toBe(403);
    const patients = await admin.get('/api/admin/patients');
    const text = JSON.stringify(patients.body);
    for (const secret of ['Penicillin', 'Insulin', 'O+', 'diabetes']) expect(text).not.toContain(secret);
  });
});

describe('Patient ownership', () => {
  it('derives the patient from the session and ignores injected identifiers', async () => {
    const res = await ananya.put('/api/patients/me').send({ fullName: 'Ananya Rao', userId: 'someone-else', patientId: 'x', role: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('PATIENT');
    expect(res.body.emergencyId).toBe(IDS.ananya);
    const rohanProfile = await rohan.get('/api/patients/me');
    expect(rohanProfile.body.emergencyId).toBe(IDS.rohan);
    expect(rohanProfile.body.user.fullName).toBe('Rohan Deshmukh');
  });

  it('records a last-updated timestamp on every change', async () => {
    const before = (await ananya.get('/api/patients/me')).body.updatedAt;
    await new Promise((r) => setTimeout(r, 20));
    const after = await ananya.put('/api/patients/me').send({
      medical: {
        bloodGroup: 'O+',
        allergies: [{ allergen: 'Penicillin', severity: 'LIFE_THREATENING', reaction: 'Anaphylaxis' }],
        conditions: [], medications: [], alerts: [], history: [],
      },
    });
    expect(after.status).toBe(200);
    expect(new Date(after.body.updatedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
    expect(after.body.medical.allergies).toHaveLength(1);
    const log = await prisma.auditLog.findFirst({ where: { action: 'PROFILE_UPDATED' }, orderBy: { createdAt: 'desc' } });
    expect(log.metadata.sections).toContain('medical');
    expect(JSON.stringify(log)).not.toContain('Penicillin');
  });

  it('requires the password to regenerate an Emergency ID, and the old ID stops working', async () => {
    expect((await rohan.post('/api/patients/me/emergency-id/regenerate').send({ password: 'nope' })).status).toBe(400);
    const res = await rohan.post('/api/patients/me/emergency-id/regenerate').send({ password: 'Demo@12345' });
    expect(res.status).toBe(200);
    expect(res.body.emergencyId).not.toBe(IDS.rohan);
    expect((await paramedic.post('/api/emergency/identify').send({ emergencyId: IDS.rohan })).status).toBe(404);
    expect((await paramedic.post('/api/emergency/identify').send({ emergencyId: res.body.emergencyId })).status).toBe(200);
  });
});

describe('Administrator command centre', () => {
  it('reports metrics that match the database', async () => {
    const res = await admin.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.metrics.totalPatients).toBe(await prisma.patientProfile.count());
    expect(res.body.metrics.verifiedProfessionals).toBe(await prisma.healthcareProfessional.count({ where: { verificationStatus: 'VERIFIED' } }));
    expect(res.body.metrics.totalRequests).toBe(await prisma.emergencyAuthorization.count());
    expect(res.body.metrics.deniedAttempts).toBe(await prisma.auditLog.count({ where: { outcome: 'DENIED' } }));
    expect(res.body.activity).toHaveLength(14);
  });

  it('verifies a professional, which unlocks emergency access', async () => {
    const pending = await admin.get('/api/admin/professionals?verification=PENDING');
    const aditi = pending.body.items.find((p) => p.professionalId === 'MH-DOC-21002');
    const doctor = await signIn(EMAILS.unverifiedDoctor);
    expect((await doctor.post('/api/emergency/identify').send({ emergencyId: IDS.ananya })).status).toBe(403);

    expect((await admin.post('/api/admin/verify-professional').send({ professionalId: aditi.id, decision: 'VERIFY' })).status).toBe(200);
    expect((await doctor.post('/api/emergency/identify').send({ emergencyId: IDS.ananya })).status).toBe(200);
  });

  it('suspending an account ends its sessions immediately', async () => {
    const kavita = await signIn(EMAILS.paramedic2);
    const list = await admin.get('/api/admin/professionals?q=MH-PARA-10877');
    const target = list.body.items[0];
    expect((await admin.post('/api/admin/account-status').send({ userId: target.userId, status: 'SUSPENDED' })).status).toBe(200);
    expect((await kavita.get('/api/emergency/dashboard')).status).toBe(401);
    await admin.post('/api/admin/account-status').send({ userId: target.userId, status: 'ACTIVE' });
  });

  it('filters and exports the audit log', async () => {
    const denied = await admin.get('/api/admin/audit-logs?outcome=DENIED');
    expect(denied.status).toBe(200);
    expect(denied.body.items.every((e) => e.outcome === 'DENIED')).toBe(true);

    const byId = await admin.get(`/api/admin/audit-logs?emergencyId=${IDS.ananya}&role=PARAMEDIC`);
    expect(byId.body.items.length).toBeGreaterThan(0);
    expect(byId.body.items.every((e) => e.patientEmergencyId === IDS.ananya && e.actorRole === 'PARAMEDIC')).toBe(true);

    const granted = byId.body.items.find((e) => e.action === 'EMERGENCY_ACCESS_GRANTED');
    const detail = await admin.get(`/api/admin/audit-logs/${granted.id}`);
    expect(detail.body.timeline.map((e) => e.action)).toEqual(expect.arrayContaining(['EMERGENCY_ACCESS_REQUESTED', 'EMERGENCY_ACCESS_GRANTED']));

    const csv = await admin.get('/api/admin/audit-logs/export.csv?outcome=DENIED');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toContain('createdAt,action,outcome');
  });

  it('flags suspicious patterns such as Emergency ID enumeration', async () => {
    for (let i = 0; i < 3; i++) await paramedic.post('/api/emergency/identify').send({ emergencyId: `EA-0000-0000-0000-000${i}` });
    const res = await admin.get('/api/admin/suspicious-activity');
    expect(res.status).toBe(200);
    const alert = res.body.alerts.find((a) => a.rule === 'EMERGENCY_ID_ENUMERATION');
    expect(alert.actor.professionalId).toBe('MH-PARA-10231');
  });

  it('provides analytics computed from stored data', async () => {
    const res = await admin.get('/api/admin/analytics?days=30');
    expect(res.status).toBe(200);
    expect(res.body.activity).toHaveLength(30);
    expect(res.body.byRole.find((r) => r.role === 'PARAMEDIC').granted).toBeGreaterThan(0);
  });
});
