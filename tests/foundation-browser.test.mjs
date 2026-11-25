import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  const outbound = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin) return route.continue();
    outbound.push(url.hostname);
    return route.abort();
  });
  await page.goto(base);
  const nav = page.getByRole('navigation', { name: 'COMMON departments' });
  await page.getByRole('heading', { name: 'Research and ownership' }).waitFor();

  const openSearch = page.getByRole('button', { name: 'Find a tool' });
  await openSearch.click();
  const search = page.getByRole('searchbox', { name: 'Search destinations' });
  assert.equal(await search.evaluate(input => input === document.activeElement), true);
  await search.fill('missing tool');
  await page.getByText('No matching destinations.').waitFor();
  await search.fill('');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement.getAttribute('aria-label') === 'Find a tool');
  await openSearch.click();
  await search.fill('settings density');
  await page.getByRole('dialog').getByRole('link', { name: 'Appearance' }).click();
  await page.waitForURL('**/settings/appearance/');
  await page.getByLabel('Display density').selectOption('compact');
  await page.getByText('Appearance saved on this browser.').waitFor();
  await page.reload();
  assert.equal(await page.getByLabel('Display density').inputValue(), 'compact');

  await nav.getByRole('link', { name: 'Research', exact: true }).click();
  await page.getByLabel('Project name').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-common-density'), 'compact');
  assert.equal(await nav.locator('[aria-current="location"]').innerText(), 'Research');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  await page.getByRole('button', { name: 'Navigation', exact: true }).click();
  await page.getByRole('link', { name: 'Dataset library', exact: true }).click();
  await page.waitForURL('**/workspace/#datasets');
  await nav.getByRole('link', { name: 'Appearance', exact: true }).click();
  await nav.getByRole('link', { name: 'Research', exact: true }).click();
  await page.waitForURL('**/workspace/#datasets');

  for (const [name, path] of [['Research Studio', 'lab/'], ['Community', 'live/']]) {
    await nav.getByRole('link', { name, exact: true }).click();
    await page.waitForURL(new URL(path, base).href);
    assert.equal(await nav.locator('[aria-current="location"]').innerText(), name);
    assert.equal(await page.evaluate(() => CommonSession.memberClient()), null);
    assert.equal(await page.evaluate(() => COMMON_CONFIG.communityBackendReady), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.ok(outbound.every(host => ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(host)), outbound.join(', '));
  assert.deepEqual(errors, []);
  console.log('PASS shared navigation, keyboard search, persisted appearance and isolated preview');
} finally {
  await browser.close();
}
