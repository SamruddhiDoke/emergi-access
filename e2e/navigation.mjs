// Navigation regression check for the "Get Started → blank screen" bug.
// Usage: BASE=http://localhost:8088 node navigation.mjs   (runs in Chromium, and in Edge when installed)
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
let failures = 0;

async function suite(channel) {
  let browser;
  try {
    browser = await chromium.launch(channel ? { channel } : {});
  } catch {
    console.log(`\n[${channel}] not installed — skipped`);
    return;
  }
  const label = channel || `chromium ${browser.version()}`;
  console.log(`\n=== ${label} @ ${BASE}`);
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`));

  const check = async (name, fn) => {
    const before = problems.length;
    try {
      await fn();
      const fresh = problems.slice(before);
      if (fresh.length) throw new Error(fresh.join(' | '));
      console.log(`  PASS  ${name}`);
    } catch (e) {
      failures++;
      console.log(`  FAIL  ${name} — ${e.message.split('\n')[0]}`);
    }
  };
  const registerVisible = () => page.getByRole('heading', { name: 'Patient registration' }).waitFor({ timeout: 5000 });

  await check('landing renders', async () => {
    await page.goto(BASE);
    await page.getByRole('heading', { name: /Critical medical information/ }).waitFor();
  });
  await check('hero "Get Started" → registration page renders', async () => {
    await page.locator('main').getByRole('link', { name: 'Get Started', exact: true }).click();
    await page.waitForURL('**/register');
    await registerVisible();
  });
  await check('browser Back returns to landing', async () => {
    await page.goBack();
    await page.getByRole('heading', { name: /Critical medical information/ }).waitFor();
  });
  await check('header "Get started" → registration page renders', async () => {
    await page.locator('header').getByRole('link', { name: 'Get started', exact: true }).click();
    await registerVisible();
  });
  await check('refresh on /register renders', async () => {
    await page.reload();
    await registerVisible();
  });
  await check('direct navigation to /register renders', async () => {
    await page.goto(`${BASE}/register`);
    await registerVisible();
  });
  await check('registration → "Sign in" → patient login', async () => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.waitForURL('**/login');
    await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  });
  await check('patient login → "Create your Emergency ID" → registration', async () => {
    await page.getByRole('link', { name: 'Create your Emergency ID' }).click();
    await registerVisible();
  });
  await check('landing → "Patient sign in" (client-side) renders', async () => {
    await page.goto(BASE);
    await page.locator('header').getByRole('link', { name: 'Patient sign in' }).click();
    await page.getByRole('heading', { name: 'Welcome back' }).waitFor({ timeout: 5000 });
  });
  await check('landing → "Professional sign in" (client-side) renders', async () => {
    await page.goto(BASE);
    await page.locator('header').getByRole('link', { name: 'Professional sign in' }).click();
    await page.getByRole('heading', { name: 'Professional sign in' }).waitFor({ timeout: 5000 });
  });
  await check('landing → footer "Request verification" (client-side) renders', async () => {
    await page.goto(BASE);
    await page.locator('footer').getByRole('link', { name: 'Request verification' }).click();
    await page.getByRole('heading', { name: 'Request professional access' }).waitFor({ timeout: 5000 });
  });
  await check('unknown route shows 404 page', async () => {
    await page.goto(`${BASE}/definitely-not-a-page`);
    await page.getByRole('heading', { name: 'This page doesn’t exist' }).waitFor();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await page.getByRole('heading', { name: /Critical medical information/ }).waitFor();
  });
  await check('wrong password shows a meaningful error', async () => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type=email]', 'ananya.rao@demo.emergi.in');
    await page.fill('input[type=password]', 'wrong-password-1');
    // A 401 here is the expected server response; filter it from the console check below.
    const before = problems.length;
    await page.click('button[type=submit]');
    await page.getByRole('alert').filter({ hasText: 'Incorrect email or password' }).waitFor();
    problems.splice(before);
  });
  await check('unreachable API shows a meaningful error (not a blank page)', async () => {
    await page.route('**/api/auth/login', (r) => r.abort('connectionrefused'));
    const before = problems.length;
    await page.click('button[type=submit]');
    await page.getByRole('alert').filter({ hasText: 'Unable to reach the Emergi-Access service' }).waitFor();
    problems.splice(before);
    await page.unroute('**/api/auth/login');
  });
  await check('anonymous page loads produce no console errors', async () => {
    for (const p of ['/', '/how-it-works', '/security', '/about', '/register', '/login', '/pro/login']) {
      await page.goto(`${BASE}${p}`);
      await page.waitForTimeout(400);
    }
  });
  await browser.close();
}

await suite('msedge');
await suite(null);
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll navigation checks passed');
process.exitCode = failures ? 1 : 0;
