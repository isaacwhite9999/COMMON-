import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(12_000);
  if (process.env.COMMON_PLOTLY_FILE) {
    await page.route('https://cdn.plot.ly/plotly-3.3.1.min.js', route => route.fulfill({
      path: process.env.COMMON_PLOTLY_FILE, contentType: 'application/javascript',
      headers: { 'Access-Control-Allow-Origin': '*' }
    }));
  }
  const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
  await page.goto(new URL('workspace/#research', base).href);
  await page.getByRole('link', { name: /Open COMMON Canvas/ }).click();
  await page.waitForFunction(() => !document.querySelector('#upload')?.disabled);
  const fixture = 'Date,Close\n2025-01-01,3\n2025-01-02,4\n';
  async function upload(source) {
    await page.getByLabel('Upload CSV').setInputFiles({ name: 'test-fixture.csv', mimeType: 'text/csv', buffer: Buffer.from(source) });
    await page.getByRole('status').filter({ hasText: 'Map the fields' }).waitFor();
  }
  await upload(fixture);
  await page.getByLabel('Chart title').fill('Close history');
  await page.getByLabel('X column', { exact: true }).selectOption('Date');
  await page.getByLabel('Y column', { exact: true }).selectOption('Close');
  await page.getByRole('button', { name: 'Render chart', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Rendered line' }).waitFor();
  assert.equal(await page.locator('#figure .main-svg').count() > 0, true);
  await page.getByRole('button', { name: 'Save revision' }).click();
  await page.getByText('Draft from a text instruction').click();
  await page.getByLabel('Chart instruction').fill('histogram Close');
  await page.getByRole('button', { name: 'Draft chart' }).click();
  await page.getByRole('status').filter({ hasText: 'Draft ready' }).waitFor();
  await page.getByRole('button', { name: 'Render chart', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Rendered histogram' }).waitFor();
  await page.getByRole('button', { name: 'Save revision' }).click();
  assert.equal(await page.getByLabel('Revision for Close history').locator('option').count(), 2);
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await page.getByLabel('Revision for histogram Close (copy)').waitFor();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const portable = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  assert.deepEqual(Object.keys(portable).sort(), ['digest', 'spec']);
  assert.equal(portable.spec.chart, 'histogram');
  assert.match(portable.digest, /^[a-f0-9]{64}$/);
  await page.reload();
  await upload(fixture.replace(',4', ',9'));
  const reopen = page.getByLabel('Revision for Close history', { exact: true }).locator('..').getByRole('button', { name: 'Open revision' });
  await reopen.click();
  await page.getByRole('status').filter({ hasText: 'Load the original source' }).waitFor();
  await upload(fixture);
  await page.getByLabel('Revision for Close history').selectOption('1');
  await reopen.click();
  await page.getByRole('status').filter({ hasText: 'Rendered line' }).waitFor();
  await page.route(url => url.hostname === 'api.fiscaldata.treasury.gov', route => route.fulfill({
    json: { data: [{ record_date: '2025-01-31', security_desc: 'Treasury Bills', avg_interest_rate_amt: '4.2' }] },
    headers: { 'Access-Control-Allow-Origin': '*' }
  }));
  await page.getByRole('button', { name: 'Load public Treasury bill rates' }).click();
  await page.getByRole('link', { name: 'Official series' }).waitFor();
  assert.match(await page.locator('#source').textContent(), /historical monthly observations/);
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflows, false);
  console.log('Canvas mobile routing, pinned Plotly, manual/text chart, persistence, duplicate, export and digest checks passed.');
} finally {
  await browser.close();
}
