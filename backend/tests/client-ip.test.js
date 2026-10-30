import { afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

afterAll(() => vi.unstubAllEnvs());

describe('CLIENT_IP_HEADER', () => {
  it('records the visitor IP reported by the front proxy in the audit log', async () => {
    vi.stubEnv('CLIENT_IP_HEADER', 'x-vercel-forwarded-for');
    vi.resetModules();
    const { createApp } = await import('../src/app.js');
    const { prisma } = await import('../src/config/prisma.js');
    const app = createApp();
    const agent = request.agent(app);
    const { body } = await agent.get('/api/auth/csrf');
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', body.csrfToken)
      .set('X-Vercel-Forwarded-For', '203.0.113.77')
      .send({ email: 'nobody@example.com', password: 'wrong-pass-1', portal: 'patient' });
    const log = await prisma.auditLog.findFirst({ where: { action: 'LOGIN_FAILED' }, orderBy: { createdAt: 'desc' } });
    expect(log.ipAddress).toBe('203.0.113.77');
    await prisma.$disconnect();
  });

  it('ignores values that are not IP addresses', async () => {
    vi.stubEnv('CLIENT_IP_HEADER', 'x-vercel-forwarded-for');
    vi.resetModules();
    const { createApp } = await import('../src/app.js');
    const { prisma } = await import('../src/config/prisma.js');
    const agent = request.agent(createApp());
    const { body } = await agent.get('/api/auth/csrf');
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', body.csrfToken)
      .set('X-Vercel-Forwarded-For', '<script>')
      .send({ email: 'nobody@example.com', password: 'wrong-pass-1', portal: 'patient' });
    const log = await prisma.auditLog.findFirst({ where: { action: 'LOGIN_FAILED' }, orderBy: { createdAt: 'desc' } });
    expect(log.ipAddress).not.toBe('<script>');
    await prisma.$disconnect();
  });
});
