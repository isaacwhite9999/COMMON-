import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
  assert.equal(stopped.environment.prepared, true);
  const beforePreparation = await page.evaluate(() => {
    const run = CommonPython.execute('print(1)', ['numpy']);
    run.cancel();
    return run.promise;
  });
  assert.equal(beforePreparation.environment.prepared, false);
  assert.deepEqual(beforePreparation.environment.requested, ['numpy']);
  await page.goto(new URL('workspace/#research',base).href);
  await page.getByLabel('Project name').fill('Local compute fixture');
  await page.getByRole('button',{name:'Create project'}).click();
  await page.getByRole('link',{name:'Python lab',exact:true}).click();
  await page.getByRole('textbox',{name:'Python source',exact:true}).fill('print("PRIVATE_WORKSPACE_OUTPUT")');
  await page.getByLabel(/Run my own reviewed code locally/).check();
  const stop=page.getByRole('button',{name:'Stop execution',exact:true});
  assert.equal(await stop.isDisabled(),true);
  await page.getByRole('button',{name:'Run Python',exact:true}).click();
  await page.getByRole('button',{name:'Prepare execution summary'}).click();
  assert.equal(await stop.isDisabled(),true);
  const evidence=await page.getByLabel('Research summary').inputValue();
  assert.match(evidence,/Pyodide version: 0\.27\.7/);
  assert.match(evidence,/Execution status: Completed/);
  assert.doesNotMatch(evidence,/PRIVATE_WORKSPACE_OUTPUT|print\(/);
  await page.locator('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByText('Environment manifest',{exact:true}).click();
  await page.getByText('Standard library only.',{exact:true}).waitFor();
  const labDownload = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export run',exact:true}).click();
  const labReport = JSON.parse(await readFile(await (await labDownload).path(),'utf8'));
  assert.equal(labReport.environment.prepared,true);
  assert.deepEqual(labReport.environment.dependencies,[]);

  await page.getByRole('link',{name:'Research notebook',exact:true}).click();
  await page.getByLabel('Cell title').fill('Notebook Python fixture');
  await page.getByLabel('Cell type').selectOption('python');
  assert.equal(await page.getByLabel('Cell dataset').isVisible(),false);
  const source = '\nimport numpy\nimport platform\nprint(numpy.__version__, platform.python_version())\nfor value in [42]:\n    print(value, "<b>literal output</b>")\n';
  await page.getByRole('textbox',{name:'Python source',exact:true}).fill(source);
  await page.getByRole('button',{name:'Save cell'}).click();
  const cell = page.locator('.notebook-cell').filter({hasText:'Notebook Python fixture'});
  const run = cell.getByRole('button',{name:'Run Python cell'});
  const stopCell = cell.getByRole('button',{name:'Stop execution'});
  const consent = page.getByLabel(/Run my own reviewed code locally/);
  const runReviewed = page.getByRole('button',{name:'Run reviewed Python'});
  assert.equal(await stopCell.isDisabled(),true);
  await run.click();
  await runReviewed.click();
  assert.equal(await page.locator('iframe[title="Isolated local Python execution"]').count(),0);
  assert.equal(await consent.isChecked(),false);
  await page.getByLabel('numpy 2.0.2',{exact:true}).check();
  await consent.check();
  await runReviewed.click();
  await cell.getByText(/42 <b>literal output<\/b>/).waitFor({timeout:95_000});
  assert.equal(await cell.locator('.notebook-result pre b').count(),0);
  assert.match(await cell.locator('.notebook-result pre').textContent(), /^2\.0\.2 3\.12\.7$/m);
  await page.reload();
  await cell.getByText(/42 <b>literal output<\/b>/).waitFor();
  assert.equal(await stopCell.isDisabled(),true);
  await cell.getByText('Environment manifest',{exact:true}).click();
  await cell.getByRole('row',{name:'numpy 2.0.2 Yes'}).waitFor();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export notebook'}).click();
  const download = await downloadPromise;
  const notebook = JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(notebook.cells[0].text, source);
  assert.equal(notebook.cells[0].output.ok,true);
  assert.equal(notebook.cells[0].output.version,'0.27.7');
  const manifest = notebook.cells[0].output.environment;
  assert.equal(manifest.prepared,true);
  assert.deepEqual(manifest.requested,['numpy']);
  assert.deepEqual(manifest.dependencies.map(pkg=>[pkg.name,pkg.version]),[['numpy','2.0.2']]);
  assert.match(manifest.lock.sha256,/^[a-f0-9]{64}$/);

  await cell.getByRole('link',{name:'Edit',exact:true}).click();
  const sourceEditor = page.getByRole('textbox',{name:'Python source',exact:true});
  assert.equal(await sourceEditor.inputValue(), source);
  await sourceEditor.fill('raise ValueError("NOTEBOOK_FIXTURE_ERROR")');
  await page.getByRole('button',{name:'Save cell'}).click();
  assert.equal(await cell.locator('.notebook-result').count(),0);
  await run.click();
  assert.equal(await consent.isChecked(),false);
  await consent.check();
  await runReviewed.click();
  await cell.locator('.notebook-result').getByText(/ValueError: NOTEBOOK_FIXTURE_ERROR/).waitFor({timeout:95_000});

  await cell.getByRole('link',{name:'Edit',exact:true}).click();
  await sourceEditor.fill('while True: pass');
  await page.getByRole('button',{name:'Save cell'}).click();
  await run.click();
  await consent.check();
  await runReviewed.click();
  await stopCell.click();
  await cell.getByText('Execution cancelled.',{exact:true}).waitFor();
  assert.equal(await stopCell.isDisabled(),true);
  console.log('PASS notebook Python review, success, reload, export, failure, edit and stop');
  console.log('PASS browser Python, blocked application-origin access, cancellation and reviewed evidence');
} finally {
  await browser.close();
}
