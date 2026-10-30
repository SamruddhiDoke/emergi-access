// End-to-end walkthrough of the hackathon demo scenario against the running dev stack.
// Prerequisite: reseed first (cd backend && npm run db:seed) so no authorization from a previous run is active.
import { chromium } from 'playwright';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = path.resolve('shots');
await import('node:fs').then((fs) => fs.mkdirSync(OUT, { recursive: true }));
const PW = 'Demo@12345';
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
const log = (...a) => console.log('[e2e]', ...a);

const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
const errors = [];
const newPage = async (ctx) => {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && !/401|403|404|410/.test(m.text()) && errors.push(`console: ${m.text()}`));
  return p;
};

async function proLogin(page, email) {
  await page.goto(`${BASE}/pro/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', PW);
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Autofill")');
  await page.waitForURL(/\/(pro|admin)$/);
}

try {
  // 0. Public landing
  const pub = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  let page = await newPage(pub);
  await page.goto(BASE);
  await page.waitForTimeout(1600);
  await shot(page, '01-landing');
  await shot(page, '01-landing-full', true);

  // 1-4. Patient: dashboard, QR, download
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', 'ananya.rao@demo.emergi.in');
  await page.fill('input[type=password]', PW);
  await page.click('button[type=submit]');
  await page.waitForURL('**/patient');
  await page.waitForSelector('text=Critical allergy alerts');
  await page.waitForTimeout(800);
  await shot(page, '02-patient-dashboard', true);
  await page.goto(`${BASE}/patient/qr`);
  await page.waitForSelector('img[alt^="QR code"]');
  const payload = await page.textContent('text=payload');
  log('QR payload shown to patient:', payload?.trim());
  await shot(page, '03-patient-qr');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download QR")')]);
  const qrPath = path.join(OUT, 'patient-qr.png');
  await dl.saveAs(qrPath);
  log('QR downloaded', qrPath);
  await page.goto(`${BASE}/patient/profile`);
  await page.waitForSelector('text=Current medications');
  await shot(page, '04-patient-profile', true);
  await pub.close();

  // 6-17. Paramedic: login + MFA, scan QR image, break-glass, view
  const paraCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const para = await newPage(paraCtx);
  await proLogin(para, 'sameer.patil@demo.emergi.in');
  await para.waitForSelector('text=Scan a patient');
  await para.waitForTimeout(600);
  await shot(para, '05-pro-dashboard');
  await para.goto(`${BASE}/pro/scan`);
  await para.setInputFiles('input[type=file]', qrPath);
  await para.waitForURL(/access\/new/);
  await para.waitForSelector('text=Confirm patient identity');
  await para.waitForTimeout(500); await shot(para, '06-identify');
  const identText = await para.textContent('main');
  log('Identification leaks medical data?', /Penicillin|Insulin|O\+/.test(identText));
  await para.click('button:has-text("Request emergency access")');
  await para.click('button:has-text("Patient unconscious")');
  await shot(para, '07-reason');
  await para.click('button:has-text("Continue")');
  await para.fill('textarea', 'Found unresponsive at a bus stop, no family present. Need allergy status.');
  await para.click('button:has-text("Continue")');
  await para.check('input[type=checkbox]');
  await shot(para, '08-confirm');
  await para.click('button:has-text("Break glass")');
  await para.waitForSelector('text=Verify this emergency access');
  await shot(para, '09-otp');
  await para.click('button:has-text("Autofill")');
  await para.waitForURL(/access\/[0-9a-f-]{36}$/);
  await para.waitForSelector('text=Emergency contacts');
  await para.waitForTimeout(1200);
  await shot(para, '10-paramedic-view', true);
  const authId = para.url().split('/').pop();
  const paraText = await para.textContent('main');
  log('Paramedic sees contacts:', paraText.includes('Vikram Rao'), '| sees Levothyroxine (should be false):', paraText.includes('Levothyroxine'), '| sees Latex (should be false):', paraText.includes('Latex'));

  // 19-22. Admin: audit + revoke
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await newPage(adminCtx);
  await proLogin(admin, 'admin@demo.emergi.in');
  await admin.waitForSelector('text=Emergency access activity');
  await admin.waitForTimeout(1500);
  await shot(admin, '11-admin-dashboard', true);
  await admin.goto(`${BASE}/admin/audit?authorizationId=${authId}`);
  await admin.waitForSelector('td:has-text("Emergency access granted")');
  await shot(admin, '12-audit');
  await admin.click('tr:has-text("Emergency access granted")');
  await admin.waitForSelector('text=Authorization timeline');
  await admin.waitForTimeout(500);
  await shot(admin, '13-audit-event');
  await admin.click('button:has-text("Revoke authorization")');
  await admin.fill('textarea', 'Patient handed over to hospital emergency department');
  await admin.click('button:has-text("Revoke now")');
  await admin.waitForSelector('[role=status]:has-text("Authorization revoked")');
  log('Admin revoked', authId);
  await admin.goto(`${BASE}/admin/security`);
  await admin.waitForSelector('text=Detection rules');
  await admin.waitForTimeout(500);
  await shot(admin, '14-suspicious');
  await admin.goto(`${BASE}/admin/analytics`);
  await admin.waitForSelector('text=Daily activity');
  await admin.waitForTimeout(1200);
  await shot(admin, '15-analytics', true);

  // 23-25. Paramedic retries
  const refreshBtn = para.locator('button:has-text("Refresh record")'); if (await refreshBtn.count()) { log('Clicking Refresh record'); await refreshBtn.click(); } else log('Poller already closed the session (revocation detected automatically)');
  await para.waitForSelector('h1:has-text("Authorization revoked")', { timeout: 10000 });
  await shot(para, '16-revoked');
  const leaked = (await para.textContent('main')).includes('Penicillin');
  log('Revoked screen still shows medical data?', leaked);

  // Doctor comparison
  const docCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const doc = await newPage(docCtx);
  await proLogin(doc, 'neha.joshi@demo.emergi.in');
  await doc.goto(`${BASE}/pro/access/new?eid=EA-7KQ2-M9XD-4TPR-H3VB`);
  await doc.click('button:has-text("Request emergency access")');
  await doc.click('button:has-text("Critical emergency")');
  await doc.click('button:has-text("Continue")');
  await doc.fill('textarea', 'Collapsed in the emergency department waiting area, need medication history.');
  await doc.click('button:has-text("Continue")');
  await doc.check('input[type=checkbox]');
  await doc.click('button:has-text("Break glass")');
  await doc.click('button:has-text("Autofill")');
  await doc.waitForSelector('text=Current medications');
  await doc.waitForTimeout(800);
  await shot(doc, '17-doctor-view', true);
  const docText = await doc.textContent('main');
  log('Doctor sees Levothyroxine:', docText.includes('Levothyroxine'), '| sees contacts (should be false):', docText.includes('Vikram Rao'));

  // Unverified professional
  const unvCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const unv = await newPage(unvCtx);
  await proLogin(unv, 'aditi.kale@demo.emergi.in');
  await unv.goto(`${BASE}/pro/access/new?eid=EA-7KQ2-M9XD-4TPR-H3VB`);
  await unv.waitForSelector('text=Emergency access denied');
  await shot(unv, '18-unverified-denied');

  // Patient sees access
  const patCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pat = await newPage(patCtx);
  await pat.goto(`${BASE}/login`);
  await pat.fill('input[type=email]', 'ananya.rao@demo.emergi.in');
  await pat.fill('input[type=password]', PW);
  await pat.click('button[type=submit]');
  await pat.waitForSelector('text=Your record is being accessed');
  await pat.waitForTimeout(600);
  await shot(pat, '19-patient-sees-access');
  await pat.goto(`${BASE}/patient/access-history`);
  await pat.waitForSelector('text=Activity timeline');
  await shot(pat, '20-patient-history');

  // Registration wizard + mobile
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const m = await newPage(mob);
  await m.goto(BASE);
  await m.waitForTimeout(1500);
  await shot(m, '21-mobile-landing');
  await m.goto(`${BASE}/register`);
  await shot(m, '22-mobile-register');
  const reg = await newPage(pub.browser ? await browser.newContext({ viewport: { width: 1440, height: 900 } }) : mob);
  await reg.goto(`${BASE}/register`);
  await shot(reg, '23-register');

  log('Console/page errors:', errors.length ? errors : 'none');
} catch (e) {
  console.error('[e2e] FAILED', e); for (const c of browser.contexts()) for (const p of c.pages()) await p.screenshot({ path: path.join(OUT, 'fail-' + Math.random().toString(36).slice(2,6) + '.png') }).catch(()=>{});
  errors.length && console.error(errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
