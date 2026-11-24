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
  await page.goto(new URL('workspace/#research',base).href);
  await page.getByLabel('Project name').fill('Local compute fixture');
  await page.getByRole('button',{name:'Create project'}).click();
  await page.getByRole('link',{name:'Python lab',exact:true}).click();
  await page.getByRole('textbox',{name:'Python source',exact:true}).fill('print("PRIVATE_WORKSPACE_OUTPUT")');
  await page.getByLabel(/Run my own reviewed code locally/).check();
  await page.getByRole('button',{name:'Run Python',exact:true}).click();
  await page.getByRole('button',{name:'Prepare execution summary'}).click();
  const evidence=await page.getByLabel('Research summary').inputValue();
  assert.match(evidence,/Pyodide version: 0\.27\.7/);
  assert.match(evidence,/Execution status: Completed/);
  assert.doesNotMatch(evidence,/PRIVATE_WORKSPACE_OUTPUT|print\(/);
  console.log('PASS browser Python, blocked application-origin access, cancellation and reviewed evidence');
} finally {
  await browser.close();
}
