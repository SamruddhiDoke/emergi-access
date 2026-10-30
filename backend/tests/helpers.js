import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { seed, DEMO_PASSWORD } from '../prisma/seed.js';

export const app = createApp();
export { prisma, DEMO_PASSWORD };

export const IDS = {
  ananya: 'EA-7KQ2-M9XD-4TPR-H3VB',
  rohan: 'EA-3NWB-8RFZ-K2MA-T6QD',
};

export const EMAILS = {
  ananya: 'ananya.rao@demo.emergi.in',
  rohan: 'rohan.deshmukh@demo.emergi.in',
  paramedic: 'sameer.patil@demo.emergi.in',
  paramedic2: 'kavita.jadhav@demo.emergi.in',
  doctor: 'neha.joshi@demo.emergi.in',
  unverifiedDoctor: 'aditi.kale@demo.emergi.in',
  cardiologist: 'vikram.sathe@demo.emergi.in',
  admin: 'admin@demo.emergi.in',
};

export const resetDatabase = () => seed({ withHistory: false });

function csrfFrom(res) {
  const cookies = res.headers['set-cookie'] || [];
  const c = cookies.find((x) => x.startsWith('ea_csrf='));
  return c ? decodeURIComponent(c.split(';')[0].slice('ea_csrf='.length)) : null;
}

/**
 * A cookie-carrying client that keeps its X-CSRF-Token header in sync with the ea_csrf cookie,
 * exactly as the browser frontend does.
 */
export async function client() {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/csrf');
  let token = res.body.csrfToken;
  const wrap = (method) => (url) => {
    const req = agent[method](url).set('X-CSRF-Token', token);
    const then = req.then.bind(req);
    req.then = (ok, fail) =>
      then((r) => {
        token = csrfFrom(r) || token;
        return r;
      }).then(ok, fail);
    return req;
  };
  return { agent, get: wrap('get'), post: wrap('post'), put: wrap('put'), delete: wrap('delete'), raw: agent };
}

/** Signs in through the real API, completing the simulated OTP step for professionals. */
export async function signIn(email, portal) {
  const c = await client();
  const resolvedPortal = portal || ([EMAILS.ananya, EMAILS.rohan].includes(email) ? 'patient' : 'professional');
  const res = await c.post('/api/auth/login').send({ email, password: DEMO_PASSWORD, portal: resolvedPortal });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  if (res.body.mfaRequired) {
    const v = await c.post('/api/auth/verify-otp').send({ challengeId: res.body.challenge.challengeId, code: res.body.challenge.demoCode });
    if (v.status !== 200) throw new Error(`otp failed: ${JSON.stringify(v.body)}`);
  }
  return c;
}

/** Runs the complete break-glass flow and returns the active authorization. */
export async function grantAccess(c, emergencyId, overrides = {}) {
  const req = await c.post('/api/emergency/request-access').send({
    emergencyId,
    reason: 'PATIENT_UNCONSCIOUS',
    justification: 'Patient found unresponsive at the scene, no history available.',
    acknowledged: true,
    ...overrides,
  });
  if (req.status !== 201) throw new Error(`request-access failed: ${req.status} ${JSON.stringify(req.body)}`);
  const v = await c.post('/api/emergency/verify-otp').send({ authorizationId: req.body.authorization.id, code: req.body.otp.demoCode });
  if (v.status !== 200) throw new Error(`verify failed: ${JSON.stringify(v.body)}`);
  return v.body.authorization;
}
