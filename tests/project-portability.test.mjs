import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
  await page.goto(new URL('workspace/#research', base).href);
  await page.getByLabel('Project name').fill('Trend study');
  await page.getByLabel('Starting template').selectOption('strategy');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('heading', { name: 'Trend study', exact: true }).waitFor();
  const original = page.url();
  assert.match(await page.getByLabel('Hypothesis, sources, risk and falsification criteria').inputValue(), /Lock the training rules/);

  await page.getByRole('link', { name: 'Project files', exact: true }).click();
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Source editor').fill('Source from the research project');
  await page.getByRole('button', { name: 'Create file', exact: true }).click();

  const openSettings = () => page.getByRole('link', { name: 'Project settings', exact: true }).click();
  await openSettings();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export source bundle', exact: true }).click();
  const download = await downloadEvent;
  const contents = await readFile(await download.path());
  assert.equal(JSON.parse(contents).files[0].content, 'Source from the research project');

  await page.getByRole('button', { name: 'Duplicate project', exact: true }).click();
  await page.getByRole('heading', { name: 'Trend study (copy)', exact: true }).waitFor();
  assert.notEqual(page.url(), original);
  await openSettings();
  await page.getByRole('button', { name: 'Archive project', exact: true }).click();
  await page.getByLabel('Project status').selectOption('active');
  assert.equal(await page.getByRole('link', { name: 'Trend study (copy)', exact: true }).count(), 0);
  await page.reload();
  await page.getByLabel('Project status').selectOption('archived');
  await page.getByRole('link', { name: 'Trend study (copy)', exact: true }).click();
  await openSettings();
  await page.getByRole('button', { name: 'Restore project', exact: true }).click();
  await page.getByLabel('Search projects').fill('(copy)');
  await page.getByRole('link', { name: 'Trend study (copy)', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Trend study', exact: true }).count(), 0);

  await page.getByLabel('Project source bundle').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: contents });
  await page.getByRole('button', { name: 'Import source bundle', exact: true }).click();
  await page.getByRole('heading', { name: 'Trend study', exact: true }).waitFor();
  assert.notEqual(page.url(), original);
  await page.getByRole('link', { name: 'Project files', exact: true }).click();
  await page.getByRole('link', { name: 'research/notes.md', exact: true }).click();
  assert.equal(await page.locator('main').getByLabel('Source editor').inputValue(), 'Source from the research project');
  assert.deepEqual(errors, []);
  console.log('Project library template, duplication, archive, restore, search and source bundle round trip passed.');
} finally {
  await browser.close();
}
