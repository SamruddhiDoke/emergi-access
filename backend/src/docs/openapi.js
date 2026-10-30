import { ACCESS_MATRIX } from '../services/disclosurePolicy.js';

const json = (schema) => ({ content: { 'application/json': { schema } } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const ok = (description, schema = { type: 'object' }) => ({ description, ...json(schema) });
const err = (description) => ({ description, ...json(ref('Error')) });
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }];
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
];

const op = (tag, summary, extra = {}) => ({ tags: [tag], summary, ...extra });

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Emergi-Access API',
    version: '1.0.0',
    description: [
      'Privacy-preserving emergency medical information access. **Hackathon prototype — synthetic data only, not certified for clinical use.**',
      '',
      '**Authentication.** Browser clients use an HttpOnly `ea_session` cookie plus double-submit CSRF (`GET /api/auth/csrf`, then send the `ea_csrf` cookie value in `X-CSRF-Token` on every mutating request).',
      'Professionals and administrators complete a simulated OTP step at sign-in. In DEMO_MODE the code is returned in the response as `challenge.demoCode`.',
      '',
      '**Minimum-necessary disclosure** (enforced server-side by `disclosurePolicy.js`):',
      ...Object.entries(ACCESS_MATRIX).map(([role, cats]) => `- ${role}: ${cats.join(', ')}`),
    ].join('\n'),
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'ea_session' },
      csrf: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } } },
      },
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string' }, password: { type: 'string' }, portal: { type: 'string', enum: ['patient', 'professional'] } },
      },
      Otp: { type: 'object', required: ['challengeId', 'code'], properties: { challengeId: { type: 'string', format: 'uuid' }, code: { type: 'string', example: '123456' } } },
      Identify: { type: 'object', required: ['emergencyId'], properties: { emergencyId: { type: 'string', example: 'EA-7KQ2-M9XD-4TPL-H3VB' } } },
      RequestAccess: {
        type: 'object',
        required: ['emergencyId', 'reason', 'justification', 'acknowledged'],
        properties: {
          emergencyId: { type: 'string' },
          reason: { type: 'string', enum: ['PATIENT_UNCONSCIOUS', 'UNABLE_TO_COMMUNICATE', 'CRITICAL_EMERGENCY', 'UNKNOWN_MEDICAL_HISTORY', 'IMMEDIATE_TREATMENT_REQUIRED'] },
          justification: { type: 'string', minLength: 15, maxLength: 500 },
          treatmentPurpose: { type: 'string', description: 'Required for specialists' },
          acknowledged: { type: 'boolean', enum: [true] },
        },
      },
      BreakGlassOtp: { type: 'object', required: ['authorizationId', 'code'], properties: { authorizationId: { type: 'string', format: 'uuid' }, code: { type: 'string' } } },
      Authorization: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'DENIED'] },
          patientEmergencyId: { type: 'string' },
          professionalId: { type: 'string' },
          professionalRole: { type: 'string' },
          organization: { type: 'string' },
          reason: { type: 'string' },
          justification: { type: 'string' },
          grantedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          remainingSeconds: { type: 'integer' },
          categories: { type: 'array', items: { type: 'string' } },
        },
      },
      Revoke: { type: 'object', required: ['authorizationId'], properties: { authorizationId: { type: 'string', format: 'uuid' }, reason: { type: 'string' } } },
    },
  },
  security: [{ cookieAuth: [], csrf: [] }],
  paths: {
    '/api/health': { get: op('System', 'Health check', { security: [], responses: { 200: ok('API and database are up') } }) },
    '/api/auth/csrf': { get: op('Authentication', 'Issue CSRF token', { security: [], responses: { 200: ok('Token issued and set as ea_csrf cookie') } }) },
    '/api/auth/register': {
      post: op('Authentication', 'Register a patient (creates Emergency ID and signs in)', {
        security: [{ csrf: [] }],
        requestBody: json({ type: 'object' }),
        responses: { 201: ok('Patient registered'), 400: err('Validation error'), 409: err('Email already registered') },
      }),
    },
    '/api/auth/register/professional': {
      post: op('Authentication', 'Register a healthcare professional (pending administrator verification)', {
        security: [{ csrf: [] }],
        requestBody: json({ type: 'object' }),
        responses: { 201: ok('Registered, pending verification'), 409: err('Email or professional ID in use') },
      }),
    },
    '/api/auth/login': {
      post: op('Authentication', 'Sign in. Patients receive a session; professionals receive an OTP challenge.', {
        security: [{ csrf: [] }],
        requestBody: json(ref('Login')),
        responses: { 200: ok('Signed in or MFA challenge issued'), 401: err('Invalid credentials'), 403: err('Wrong portal or suspended') },
      }),
    },
    '/api/auth/verify-otp': {
      post: op('Authentication', 'Complete simulated sign-in OTP', {
        security: [{ csrf: [] }],
        requestBody: json(ref('Otp')),
        responses: { 200: ok('Session started'), 400: err('Invalid or expired code') },
      }),
    },
    '/api/auth/logout': { post: op('Authentication', 'Sign out and revoke the server-side session', { responses: { 204: { description: 'Signed out' } } }) },
    '/api/auth/me': { get: op('Authentication', 'Current user', { responses: { 200: ok('Current user'), 401: err('Not signed in') } }) },
    '/api/auth/change-password': { post: op('Authentication', 'Change password (signs out other sessions)', { responses: { 200: ok('Updated') } }) },

    '/api/patients/me': {
      get: op('Patient', 'Own complete medical profile', { responses: { 200: ok('Profile') } }),
      put: op('Patient', 'Update own profile (medical sections and contacts use replace semantics)', { responses: { 200: ok('Updated profile') } }),
    },
    '/api/patients/me/dashboard': { get: op('Patient', 'Dashboard summary', { responses: { 200: ok('Dashboard') } }) },
    '/api/patients/me/emergency-id': { get: op('Patient', 'Own Emergency ID', { responses: { 200: ok('Emergency ID') } }) },
    '/api/patients/me/emergency-id/regenerate': { post: op('Patient', 'Regenerate Emergency ID (password required, old QR stops working)', { responses: { 200: ok('New ID') } }) },
    '/api/patients/me/qr': { get: op('Patient', 'QR code (payload is only the opaque Emergency ID)', { responses: { 200: ok('QR data URL') } }) },
    '/api/patients/me/qr.png': { get: op('Patient', 'Download QR as PNG', { responses: { 200: { description: 'PNG image' } } }) },
    '/api/patients/me/summary.pdf': { get: op('Patient', 'Download own complete emergency summary as PDF', { responses: { 200: { description: 'PDF' } } }) },
    '/api/patients/me/access-history': { get: op('Patient', 'Who accessed my record', { parameters: pageParams, responses: { 200: ok('History') } }) },
    '/api/patients/me/authorizations': { get: op('Patient', 'Active and pending authorizations on my record', { responses: { 200: ok('Authorizations') } }) },
    '/api/patients/me/revoke-access': {
      post: op('Patient', 'Revoke an active authorization on my record', { requestBody: json(ref('Revoke')), responses: { 200: ok('Revoked'), 404: err('Not found or not yours'), 409: err('Not revocable') } }),
    },

    '/api/emergency/dashboard': { get: op('Emergency', 'Professional dashboard', { responses: { 200: ok('Dashboard') } }) },
    '/api/emergency/history': { get: op('Emergency', 'Own emergency access history', { parameters: pageParams, responses: { 200: ok('History') } }) },
    '/api/emergency/identify': {
      post: op('Emergency', 'Step 1 — identify patient from QR/Emergency ID (no medical data returned)', {
        requestBody: json(ref('Identify')),
        responses: { 200: ok('Minimal identity confirmation'), 403: err('Professional not verified'), 404: err('Invalid Emergency ID') },
      }),
    },
    '/api/emergency/request-access': {
      post: op('Emergency', 'Steps 3–5 — break-glass request with reason, justification and acknowledgement', {
        requestBody: json(ref('RequestAccess')),
        responses: { 201: ok('Pending authorization and OTP challenge'), 403: err('Not verified'), 404: err('Invalid Emergency ID'), 409: err('Active authorization exists') },
      }),
    },
    '/api/emergency/verify-otp': {
      post: op('Emergency', 'Steps 6–8 — verify simulated OTP and activate time-limited authorization', {
        requestBody: json(ref('BreakGlassOtp')),
        responses: { 200: ok('Active authorization', { type: 'object', properties: { authorization: ref('Authorization') } }), 400: err('Wrong code'), 403: err('Denied') },
      }),
    },
    '/api/emergency/authorization/{id}': { get: op('Emergency', 'Authorization status and server time (for countdown sync)', { parameters: idParam, responses: { 200: ok('Status'), 404: err('Not found') } }) },
    '/api/emergency/medical-information/{id}': {
      get: op('Emergency', 'Role-filtered medical information. Re-validates authorization against the database on every call.', {
        parameters: idParam,
        responses: { 200: ok('Disclosure'), 403: err('Revoked / pending / denied'), 404: err('Not found or not owner'), 410: err('Expired') },
      }),
    },
    '/api/emergency/medical-information/{id}/summary.pdf': { get: op('Emergency', 'Role-filtered PDF summary (audited export)', { parameters: idParam, responses: { 200: { description: 'PDF' } } }) },
    '/api/emergency/revoke/{id}': { post: op('Emergency', 'End own authorization early', { parameters: idParam, responses: { 200: ok('Ended') } }) },

    '/api/admin/dashboard': { get: op('Admin', 'Command centre metrics (live from PostgreSQL)', { responses: { 200: ok('Metrics') } }) },
    '/api/admin/patients': { get: op('Admin', 'Patient accounts (metadata only, no clinical data)', { parameters: [...pageParams, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { 200: ok('Patients') } }) },
    '/api/admin/professionals': { get: op('Admin', 'Healthcare professionals', { parameters: pageParams, responses: { 200: ok('Professionals') } }) },
    '/api/admin/verify-professional': { post: op('Admin', 'Verify or reject a professional (demonstration verification)', { responses: { 200: ok('Updated') } }) },
    '/api/admin/account-status': { post: op('Admin', 'Suspend or reactivate an account', { responses: { 200: ok('Updated') } }) },
    '/api/admin/authorizations': { get: op('Admin', 'Emergency authorizations', { parameters: [...pageParams, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: ok('Authorizations') } }) },
    '/api/admin/revoke-access': { post: op('Admin', 'Revoke an authorization', { requestBody: json(ref('Revoke')), responses: { 200: ok('Revoked'), 409: err('Not revocable') } }) },
    '/api/admin/audit-logs': {
      get: op('Admin', 'Search audit log (read-only; audit events cannot be modified)', {
        parameters: [...pageParams, ...['q', 'from', 'to', 'role', 'outcome', 'action', 'emergencyId', 'organization'].map((name) => ({ name, in: 'query', schema: { type: 'string' } }))],
        responses: { 200: ok('Audit events') },
      }),
    },
    '/api/admin/audit-logs/export.csv': { get: op('Admin', 'Export filtered audit log as CSV', { responses: { 200: { description: 'CSV' } } }) },
    '/api/admin/audit-logs/{id}': { get: op('Admin', 'Audit event with related timeline', { parameters: idParam, responses: { 200: ok('Event') } }) },
    '/api/admin/suspicious-activity': { get: op('Admin', 'Rule-based suspicious activity alerts', { responses: { 200: ok('Alerts') } }) },
    '/api/admin/analytics': { get: op('Admin', 'Access analytics', { responses: { 200: ok('Analytics') } }) },
    '/api/admin/settings': {
      get: op('Admin', 'System settings', { responses: { 200: ok('Settings') } }),
      put: op('Admin', 'Update authorization duration', { responses: { 200: ok('Settings') } }),
    },
  },
};
