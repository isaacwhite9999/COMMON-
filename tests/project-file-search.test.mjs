import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
  await page.goto(new URL('workspace/#research', base).href);
  await page.getByLabel('Project name').fill('Research sources');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('link', { name: 'Project files', exact: true }).click();
  const open = () => page.getByRole('button', { name: 'Find and replace in project' }).click();
  const dialog = page.getByRole('dialog');
  async function create(path, source) {
    await page.getByRole('button', { name: 'New file', exact: true }).click();
    await dialog.getByLabel('Relative path').fill(path);
    await dialog.getByLabel('Source editor').fill(source);
    await dialog.getByRole('button', { name: 'Create file' }).click();
    await page.getByRole('link', { name: path, exact: true }).waitFor();
  }
  await create('models/first.py', 'x.* x.* X.*');
  await create('notes/second.md', 'x.*');
  await page.getByRole('link', { name: 'models/first.py', exact: true }).click();
  const editor = page.locator('main').getByLabel('Source editor');
  await page.waitForFunction(() => document.querySelector("main input[name=path]")?.value === "models/first.py");
  await editor.fill('unsaved');
  await open();
  await page.getByText('Save the current source revision before searching the project.').waitFor();
  assert.equal(await editor.inputValue(), 'unsaved');
  await editor.fill('x.* x.* X.*');
  await open();
  await dialog.getByLabel('Find text').fill('unknown');
  await dialog.getByRole('button', { name: 'Search saved files' }).click();
  await dialog.getByRole('status').filter({ hasText: 'No matching saved source files.' }).waitFor();
  await dialog.getByLabel('Find text').fill('x.*');
  await dialog.getByRole('button', { name: 'Search saved files' }).click();
  await dialog.getByRole('status').filter({ hasText: '3 matches in 2 files.' }).waitFor();
  assert.equal(await dialog.getByRole('button', { name: 'Replace in selected files' }).count(), 0);
  await dialog.getByLabel('Prepare replacements').check();
  await dialog.getByLabel('Replace with').fill('<script>$&</script>');
  await dialog.getByRole('button', { name: 'Search saved files' }).click();
  await dialog.getByLabel('Include models/first.py').check();
  assert.equal(await dialog.locator('script').count(), 0);
  await dialog.getByRole('button', { name: 'Replace in selected files' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.reload();
  assert.equal(await editor.inputValue(), '<script>$&</script> <script>$&</script> X.*');
  page.once('dialog', confirm => confirm.accept());
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  assert.equal(await editor.inputValue(), 'x.* x.* X.*');
  await page.getByRole('link', { name: 'notes/second.md', exact: true }).click();
  await page.waitForFunction(() => document.querySelector("main input[name=path]")?.value === "notes/second.md");
  assert.equal(await editor.inputValue(), 'x.*');
  assert.deepEqual(errors, []);
  console.log('Scoped mobile project search, unsaved edit protection, reviewed replacement, persistence and revision restore passed.');
} finally {
  await browser.close();
}
