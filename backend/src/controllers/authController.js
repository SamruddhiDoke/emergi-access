import * as authService from '../services/authService.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { authenticate } from '../middleware/auth.js';

export async function csrf(req, res) {
  res.json({ csrfToken: issueCsrfToken(res) });
}

export async function registerPatient(req, res) {
  const user = await authService.registerPatient(req.body, req, res);
  res.status(201).json({ user });
}

export async function registerProfessional(req, res) {
  const user = await authService.registerProfessional(req.body, req);
  res.status(201).json({
    user,
    message: 'Registration received. An administrator must verify your professional credentials before emergency access is enabled.',
  });
}

export async function login(req, res) {
  res.json(await authService.login(req.body, req, res));
}

export async function verifyOtp(req, res) {
  res.json({ user: await authService.verifyLoginOtp(req.body, req, res) });
}

export async function logout(req, res) {
  await authService.logout(req, res);
  res.status(204).end();
}

/**
 * Session probe used when the app boots. Unlike /auth/me it answers 200 with `user: null` for
 * signed-out visitors, so anonymous page loads don't produce an error response.
 */
export async function session(req, res) {
  try {
    await authenticate(req, res, () => {});
  } catch {
    return res.json({ user: null });
  }
  res.json({ user: authService.serializeUser(req.auth.user), sessionExpiresAt: req.auth.session.expiresAt });
}

export async function me(req, res) {
  res.json({ user: authService.serializeUser(req.auth.user), sessionExpiresAt: req.auth.session.expiresAt });
}

export async function changePassword(req, res) {
  await authService.changePassword(req, req.body);
  res.json({ message: 'Password updated. Other sessions have been signed out.' });
}
