import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on("requestfailed", request => console.error(request.failure()?.errorText, request.url()));
  const workspace = new URL('workspace/', base);
  await page.goto(workspace.href);
  await page.waitForFunction(() => Boolean(window.CommonPython));

  const result = await page.evaluate(() => CommonPython.execute(
    'import statistics\nprint("COMMON_PYTHON_OK", statistics.mean([1, 2, 3]))', []
  ).promise);
  assert.equal(result.ok, true, result.output);
  assert.match(result.output, /^COMMON_PYTHON_OK 2$/m);

  const target = new URL('workspace/?sandbox-probe', base).href;
  assert.equal(await page.evaluate(async url => (await fetch(url)).ok, target), true);
  const access = await page.evaluate(url => CommonPython.execute(`
from js import Reflect, fetch, globalThis
print("DOCUMENT_PRESENT:", Reflect.has(globalThis, "document"))
try:
    await fetch(${JSON.stringify(url)})
except Exception:
    print("NETWORK_BLOCKED")
else:
    print("NETWORK_UNEXPECTED")
`, []).promise, target);
  assert.equal(access.ok, true, access.output);
  assert.match(access.output, /^DOCUMENT_PRESENT: False$/m);
  assert.match(access.output, /^NETWORK_BLOCKED$/m);
  assert.doesNotMatch(access.output, /NETWORK_UNEXPECTED/);

  const stopped = await page.evaluate(() => {
    const run = CommonPython.execute('while True: pass', [], state => {
      if (state === 'Executing Python…') run.cancel();
    });
    return run.promise;
  });
  assert.equal(stopped.ok, false);
  assert.match(stopped.output, /cancelled/);
  console.log('PASS browser Python, blocked application-origin access and cancellation');
} finally {
  await browser.close();
}
