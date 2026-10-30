// Registers a brand-new patient through the UI wizard, then edits the profile and checks the QR.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('shots', { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(`${BASE}/register`);
  await page.getByLabel(/Full name/).fill('Meera Kulkarni');
  await page.locator('input[type=email]').fill(`meera.${Date.now()}@example.com`);
  await page.locator('input[placeholder^="+91"]').fill('+91 90000 12345');
  await page.locator('input[type=date]').fill('1994-02-14');
  await page.locator('input[autocomplete=new-password]').nth(0).fill('Secure2026pass');
  await page.locator('input[autocomplete=new-password]').nth(1).fill('Secure2026pass');
  await page.click('button:has-text("Continue")');
  await page.selectOption('select', 'B+');
  await page.click('button:has-text("Add allergy")');
  await page.fill('input[aria-label="Allergen"]', 'Sulfa drugs');
  await page.click('button:has-text("Add condition")');
  await page.fill('input[aria-label="Condition"]', 'Asthma');
  await page.fill('input[aria-label="Year diagnosed"]', '2010');
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Add medication")');
  await page.fill('input[aria-label="Medication"]', 'Budesonide inhaler');
  await page.click('button:has-text("Continue")');
  await page.fill('input[aria-label="Contact name"]', 'Arun Kulkarni');
  await page.fill('input[aria-label="Relationship"]', 'Brother');
  await page.fill('input[aria-label="Mobile number"]', '+91 90000 54321');
  await page.check('text=I understand how my information is shared');
  await page.click('button:has-text("Create Emergency ID")');
  await page.waitForURL('**/patient/qr');
  await page.waitForSelector('img[alt^="QR code"]');
  const id = (await page.textContent('p.font-mono')).trim();
  console.log('[reg] registered; Emergency ID', id);
  await page.screenshot({ path: 'shots/24-registered-qr.png' });
  await page.goto(`${BASE}/patient/profile/edit`);
  await page.click('button:has-text("Add alert")');
  await page.fill('input[aria-label="Alert"]', 'Carries rescue inhaler');
  await page.click('button[type=submit]:has-text("Save changes") >> nth=0');
  await page.waitForURL('**/patient/profile');
  await page.waitForSelector('text=Carries rescue inhaler');
  console.log('[reg] profile edit persisted');
  await page.goto(`${BASE}/patient`);
  await page.waitForSelector('text=Profile completeness');
  console.log('[reg] completeness:', (await page.textContent('text=/\\d+%/')).trim());
  console.log('[reg] errors:', errors.length ? errors : 'none');
} catch (e) {
  console.error('[reg] FAILED', e.message);
  await page.screenshot({ path: 'shots/reg-fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
