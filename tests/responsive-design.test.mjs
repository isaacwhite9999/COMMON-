import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 820, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin
      ? route.continue() : route.abort());

    async function checkWidth(path) {
      await page.goto(new URL(path, base).href);
      await page.getByRole('navigation',{name:'COMMON departments'}).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        path + ' overflows at ' + width + 'px');
    }

    await checkWidth('');
    await page.keyboard.press('Alt+k');
    await page.getByRole('dialog',{name:'Find a tool'}).getByRole('searchbox').fill('settings density');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.textContent),'Appearance');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/settings/appearance/');
    await page.getByLabel('Default explanations').selectOption('advanced');
    const widthControl = page.getByLabel('Research navigation width');
    await widthControl.focus();
    await page.keyboard.press('End');
    assert.equal(await widthControl.inputValue(), '320');
    await checkWidth('workspace/#research');
    if (width > 900) {
      assert.equal(await page.locator('.side').evaluate(node => node.getBoundingClientRect().width), 320);
    }
    for (const route of ['home','markets','datasets','portfolio','risk','ownership','collectives','social','venture','settings']) {
      await checkWidth('workspace/#'+route);
      await page.locator('main h1').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'Research '+route+' overflows at '+width+'px');
    }
    await checkWidth('terminal/');
    assert.equal(await page.locator('html').getAttribute('data-common-guidance'),'advanced');
    await checkWidth('live/');
    await checkWidth('lab/');
    await checkWidth('settings/appearance/');
    assert.equal(await page.getByLabel('Default explanations').inputValue(),'advanced');
    assert.equal(await page.getByLabel('Research navigation width').inputValue(),'320');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS departments and settings at 1440, 820, 390 and 320 pixels');
} finally {
  await browser.close();
}
