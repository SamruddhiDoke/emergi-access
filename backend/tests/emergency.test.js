import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { signIn, grantAccess, resetDatabase, prisma, EMAILS, IDS } from './helpers.js';

let paramedic, doctor, cardiologist, admin, ananya;

beforeAll(async () => {
  await resetDatabase();
  [paramedic, doctor, cardiologist, admin, ananya] = await Promise.all([
    signIn(EMAILS.paramedic),
    signIn(EMAILS.doctor),
    signIn(EMAILS.cardiologist),
    signIn(EMAILS.admin),
    signIn(EMAILS.ananya),
  ]);
});
afterAll(() => prisma.$disconnect());

describe('QR identification', () => {
  it('confirms identity without disclosing any medical information', async () => {
    const res = await paramedic.post('/api/emergency/identify').send({ emergencyId: IDS.ananya });
    expect(res.status).toBe(200);
    expect(res.body.patient).toMatchObject({ emergencyId: IDS.ananya, displayName: 'Ananya R.' });
    const text = JSON.stringify(res.body);
    for (const secret of ['Penicillin', 'O+', 'Insulin', 'diabetes', 'Vikram', '+91', 'Rao']) expect(text).not.toContain(secret);
  });

  it('tolerates scanner formatting (case, spaces, URI prefix)', async () => {
    const res = await paramedic.post('/api/emergency/identify').send({ emergencyId: ` emergi-access://id/${IDS.ananya.toLowerCase()} ` });
    expect(res.status).toBe(200);
  });

  it('rejects unknown and malformed Emergency IDs and audits the attempt', async () => {
    const unknown = await paramedic.post('/api/emergency/identify').send({ emergencyId: 'EA-0000-0000-0000-0000' });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('INVALID_EMERGENCY_ID');
    const malformed = await paramedic.post('/api/emergency/identify').send({ emergencyId: "'; DROP TABLE users; --" });
    expect(malformed.status).toBe(404);
    const logs = await prisma.auditLog.findMany({ where: { action: 'IDENTIFY_FAILED' } });
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs.every((l) => l.outcome === 'DENIED')).toBe(true);
  });

  it('blocks patients and administrators from the emergency workflow', async () => {
    expect((await ananya.post('/api/emergency/identify').send({ emergencyId: IDS.ananya })).status).toBe(403);
    expect((await admin.post('/api/emergency/identify').send({ emergencyId: IDS.ananya })).status).toBe(403);
  });

  it('denies unverified professionals and records the denial', async () => {
    const unverified = await signIn(EMAILS.unverifiedDoctor);
    const res = await unverified.post('/api/emergency/identify').send({ emergencyId: IDS.ananya });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROFESSIONAL_NOT_VERIFIED');
    const log = await prisma.auditLog.findFirst({ where: { denialReason: 'PROFESSIONAL_NOT_VERIFIED' }, orderBy: { createdAt: 'desc' } });
    expect(log.outcome).toBe('DENIED');
    expect(log.professionalId).toBe('MH-DOC-21002');
  });
});

describe('Break-glass request validation', () => {
  it('requires a reason, a real justification and explicit acknowledgement', async () => {
    const base = { emergencyId: IDS.ananya, reason: 'PATIENT_UNCONSCIOUS', justification: 'Patient found unresponsive at scene.', acknowledged: true };
    expect((await paramedic.post('/api/emergency/request-access').send({ ...base, justification: 'short' })).status).toBe(400);
    expect((await paramedic.post('/api/emergency/request-access').send({ ...base, acknowledged: false })).status).toBe(400);
    expect((await paramedic.post('/api/emergency/request-access').send({ ...base, reason: 'CURIOSITY' })).status).toBe(400);
    expect((await paramedic.post('/api/emergency/request-access').send({ ...base, emergencyId: 'EA-0000-0000-0000-0000' })).status).toBe(404);
  });

  it('does not release information before OTP verification', async () => {
    const req = await paramedic.post('/api/emergency/request-access').send({
      emergencyId: IDS.rohan, reason: 'CRITICAL_EMERGENCY', justification: 'Chest pain and collapse in public place.', acknowledged: true,
    });
    expect(req.status).toBe(201);
    expect(req.body.authorization.status).toBe('PENDING');
    const info = await paramedic.get(`/api/emergency/medical-information/${req.body.authorization.id}`);
    expect(info.status).toBe(403);
    expect(info.body.error.code).toBe('VERIFICATION_REQUIRED');
  });

  it('denies the request after too many wrong OTP codes', async () => {
    const req = await paramedic.post('/api/emergency/request-access').send({
      emergencyId: IDS.rohan, reason: 'CRITICAL_EMERGENCY', justification: 'Chest pain and collapse in public place.', acknowledged: true,
    });
    const id = req.body.authorization.id;
    const wrong = req.body.otp.demoCode === '000000' ? '999999' : '000000';
    let last;
    for (let i = 0; i < 5; i++) last = await paramedic.post('/api/emergency/verify-otp').send({ authorizationId: id, code: wrong });
    expect(last.status).toBe(403);
    expect(last.body.error.code).toBe('AUTHORIZATION_DENIED');
    // Even the right code no longer works.
    const late = await paramedic.post('/api/emergency/verify-otp').send({ authorizationId: id, code: req.body.otp.demoCode });
    expect(late.status).toBe(409);
    const a = await prisma.emergencyAuthorization.findUnique({ where: { id } });
    expect(a.status).toBe('DENIED');
    expect(a.denialReason).toBe('OTP_ATTEMPTS_EXCEEDED');
  });
});

describe('Minimum-necessary disclosure', () => {
  it('paramedic receives emergency essentials and contacts, not full medication list or history', async () => {
    const auth = await grantAccess(paramedic, IDS.ananya);
    expect(auth.status).toBe('ACTIVE');
    expect(auth.remainingSeconds).toBeGreaterThan(200);

    const res = await paramedic.get(`/api/emergency/medical-information/${auth.id}`);
    expect(res.status).toBe(200);
    const d = res.body.disclosure;
    expect(d.bloodGroup).toBe('O+');
    expect(d.severeAllergies.map((a) => a.allergen).sort()).toEqual(['Peanuts', 'Penicillin']);
    expect(d.majorConditions.map((c) => c.name)).toEqual(expect.arrayContaining(['Type 1 diabetes mellitus', 'Asthma']));
    expect(d.medicationAlerts.length).toBe(2);
    expect(d.emergencyContacts[0].name).toBe('Vikram Rao');

    expect(d).not.toHaveProperty('currentMedications');
    expect(d).not.toHaveProperty('medicalHistory');
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('Latex'); // mild allergy
    expect(text).not.toContain('Hypothyroidism'); // minor condition
    expect(text).not.toContain('Levothyroxine'); // non-critical medication
    expect(text).not.toContain('appendectomy');
  });

  it('doctor receives medications and history, but not emergency contacts', async () => {
    const auth = await grantAccess(doctor, IDS.ananya);
    const res = await doctor.get(`/api/emergency/medical-information/${auth.id}`);
    expect(res.status).toBe(200);
    const d = res.body.disclosure;
    expect(d.currentMedications.map((m) => m.name)).toContain('Levothyroxine');
    expect(d.medicalHistory.length).toBe(3);
    expect(d).not.toHaveProperty('emergencyContacts');
    expect(JSON.stringify(res.body)).not.toContain('Vikram Rao');
  });

  it('specialist sees only records within their registered specialty', async () => {
    const auth = await grantAccess(cardiologist, IDS.rohan, { treatmentPurpose: 'Urgent cardiology review for chest pain' });
    expect(auth.specialtyScope).toBe('CARDIOLOGY');
    const res = await cardiologist.get(`/api/emergency/medical-information/${auth.id}`);
    const d = res.body.disclosure;
    expect(d.specialtyConditions.every((c) => c.category === 'CARDIOLOGY')).toBe(true);
    expect(d.specialtyConditions.length).toBe(3);
    expect(JSON.stringify(res.body)).not.toContain('kidney'); // nephrology condition
    expect(JSON.stringify(res.body)).not.toContain('Ramipril'); // nephrology medication
  });

  it('specialists must state a treatment purpose', async () => {
    const res = await cardiologist.post('/api/emergency/request-access').send({
      emergencyId: IDS.ananya, reason: 'CRITICAL_EMERGENCY', justification: 'Arrhythmia on monitor, needs review.', acknowledged: true,
    });
    expect(res.status).toBe(400);
  });

  it('records which information categories were accessed — never the values', async () => {
    const log = await prisma.auditLog.findFirst({ where: { action: 'MEDICAL_INFORMATION_VIEWED', actorRole: 'PARAMEDIC' }, orderBy: { createdAt: 'desc' } });
    expect(log.categoriesAccessed).toEqual(expect.arrayContaining(['SEVERE_ALLERGIES', 'EMERGENCY_CONTACTS']));
    expect(log.patientEmergencyId).toBe(IDS.ananya);
    expect(log.reason).toBe('PATIENT_UNCONSCIOUS');
    const text = JSON.stringify(log);
    expect(text).not.toContain('Penicillin');
    expect(text).not.toContain('O+');
  });
});

describe('Authorization ownership, expiry and revocation', () => {
  it('another professional cannot use someone else’s authorization (IDOR)', async () => {
    const auth = (await prisma.emergencyAuthorization.findFirst({ where: { professionalId: 'MH-PARA-10231', status: 'ACTIVE' } }));
    const other = await signIn(EMAILS.paramedic2);
    const res = await other.get(`/api/emergency/medical-information/${auth.id}`);
    expect(res.status).toBe(404);
    const log = await prisma.auditLog.findFirst({ where: { denialReason: 'NOT_AUTHORIZATION_OWNER' } });
    expect(log).not.toBeNull();
  });

  it('rejects access after the database expiry time, regardless of the client', async () => {
    const auth = await grantAccess(paramedic, IDS.rohan);
    await prisma.emergencyAuthorization.update({ where: { id: auth.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await paramedic.get(`/api/emergency/medical-information/${auth.id}`);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('AUTHORIZATION_EXPIRED');
    const stored = await prisma.emergencyAuthorization.findUnique({ where: { id: auth.id } });
    expect(stored.status).toBe('EXPIRED');
    expect(await prisma.auditLog.count({ where: { authorizationId: auth.id, action: 'EMERGENCY_ACCESS_EXPIRED' } })).toBe(1);
  });

  it('administrator revocation takes effect immediately for the existing session', async () => {
    const auth = (await prisma.emergencyAuthorization.findFirst({ where: { professionalId: 'MH-PARA-10231', status: 'ACTIVE' } }));
    expect((await paramedic.get(`/api/emergency/medical-information/${auth.id}`)).status).toBe(200);

    const revoke = await admin.post('/api/admin/revoke-access').send({ authorizationId: auth.id, reason: 'Patient handed over to hospital' });
    expect(revoke.status).toBe(200);
    expect(revoke.body.authorization.status).toBe('REVOKED');

    const res = await paramedic.get(`/api/emergency/medical-information/${auth.id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_REVOKED');
    expect(res.body.error.details.revokedByRole).toBe('ADMIN');

    // PDF export goes through the same gate.
    expect((await paramedic.get(`/api/emergency/medical-information/${auth.id}/summary.pdf`)).status).toBe(403);
    // Revoked access cannot be revoked (or reused) again.
    expect((await admin.post('/api/admin/revoke-access').send({ authorizationId: auth.id, reason: 'again' })).status).toBe(409);
  });

  it('patients can revoke access to their own record but not to anyone else’s', async () => {
    const auth = (await prisma.emergencyAuthorization.findFirst({ where: { professionalId: 'MH-DOC-20431', status: 'ACTIVE' } }));
    const active = await ananya.get('/api/patients/me/authorizations');
    expect(active.body.items.map((a) => a.id)).toContain(auth.id);

    const rohanAuth = await prisma.emergencyAuthorization.findFirst({ where: { patientEmergencyId: IDS.rohan, status: 'ACTIVE' } });
    const foreign = await ananya.post('/api/patients/me/revoke-access').send({ authorizationId: rohanAuth.id });
    expect(foreign.status).toBe(404);

    const res = await ananya.post('/api/patients/me/revoke-access').send({ authorizationId: auth.id });
    expect(res.status).toBe(200);
    expect((await doctor.get(`/api/emergency/medical-information/${auth.id}`)).body.error.code).toBe('AUTHORIZATION_REVOKED');
  });

  it('shows the patient a complete access history', async () => {
    const res = await ananya.get('/api/patients/me/access-history');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.events.some((e) => e.action === 'MEDICAL_INFORMATION_VIEWED')).toBe(true);
  });

  it('professionals can end their own access early', async () => {
    const auth = await grantAccess(doctor, IDS.rohan);
    const res = await doctor.post(`/api/emergency/revoke/${auth.id}`).send({});
    expect(res.status).toBe(200);
    expect((await doctor.get(`/api/emergency/medical-information/${auth.id}`)).status).toBe(403);
  });

  it('uses the administrator-configured authorization duration', async () => {
    expect((await admin.put('/api/admin/settings').send({ authorizationDurationSeconds: 120 })).status).toBe(200);
    const auth = await grantAccess(paramedic, IDS.ananya);
    expect(auth.durationSeconds).toBe(120);
    expect(auth.remainingSeconds).toBeLessThanOrEqual(120);
    await admin.put('/api/admin/settings').send({ authorizationDurationSeconds: 300 });
  });
});

describe('Audit log integrity', () => {
  it('cannot be modified or deleted, even through the ORM', async () => {
    const log = await prisma.auditLog.findFirst();
    await expect(prisma.auditLog.update({ where: { id: log.id }, data: { outcome: 'SUCCESS' } })).rejects.toThrow(/append-only/);
    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/append-only/);
  });

  it('exposes no API for editing audit events', async () => {
    const log = await prisma.auditLog.findFirst();
    expect((await admin.put(`/api/admin/audit-logs/${log.id}`).send({})).status).toBe(404);
    expect((await admin.delete(`/api/admin/audit-logs/${log.id}`)).status).toBe(404);
  });
});
