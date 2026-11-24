import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  // A same-origin HTML document without workspace initialization.
  await page.route(new URL('dataset-storage-test', base).href, route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Dataset storage test</title>'
  }));
  await page.goto(new URL('dataset-storage-test', base).href);
  await page.addScriptTag({ url: new URL('workspace/datasets.js', base).href });

  const sample = await page.evaluate(async () => {
    const dbName = 'common-research-data-v1';
    const open = indexedDB.open(dbName, 1);
    open.onupgradeneeded = () => {
      const store = open.result.createObjectStore('datasets', { keyPath: 'id' });
      for (let index = 0; index < 8; index++) {
        store.add({
          id: `legacy-${index}`, name: `legacy-${index}.csv`, bytes: 1_000_000,
          created: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
          source: 'x'.repeat(1_000_000)
        });
      }
    };
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const started = performance.now();
    const legacyTransaction = db.transaction('datasets');
    const request = legacyTransaction.objectStore('datasets').getAll();
    const before = await new Promise((resolve, reject) => {
      legacyTransaction.oncomplete = () => resolve(request.result);
      legacyTransaction.onabort = () => reject(legacyTransaction.error);
    });
    const legacyMs = performance.now() - started;
    db.close();

    const upgraded = await CommonData.all();
    const accessed = [];
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args) {
      accessed.push(this.name);
      return getAll.apply(this, args);
    };
    const afterUpgrade = performance.now();
    const metadata = await CommonData.all();
    const catalogMs = performance.now() - afterUpgrade;
    const raw = await CommonData.get('legacy-0');
    const row = { id: 'new', name: 'new.csv', source: 'data', bytes: 4, created: '2024-02-01T00:00:00Z' };
    const inserts = await Promise.all([CommonData.put(row), CommonData.put(row)]);
    let rejected;
    try {
      await CommonData.put({ ...row, id: 'oversized', bytes: CommonData.MAX_TOTAL });
    } catch (error) {
      rejected = error.message;
    }
    const oversized = await CommonData.get('oversized');
    const beforeRemove = await CommonData.all();
    await CommonData.remove(row.id);
    const removed = await CommonData.get(row.id);
    const afterRemove = await CommonData.all();
    await CommonData.clear();
    return {
      legacyMs, catalogMs, legacyPayloadBytes: before.reduce((size, item) => size + item.source.length, 0),
      catalogBytes: new TextEncoder().encode(JSON.stringify(metadata)).length,
      upgraded, metadata, accessed, rawSize: raw.source.length, inserts, rejected, oversized, beforeRemove,
      removed, afterRemove, finalList: await CommonData.all(), finalRaw: await CommonData.get('legacy-0')
    };
  });

  assert.equal(sample.upgraded.length, 8);
  assert.deepEqual(sample.upgraded, sample.metadata);
  assert.equal(sample.metadata[0].id, 'legacy-7');
  assert.equal(sample.rawSize, 1_000_000);
  assert.ok(sample.metadata.every(row => !Object.hasOwn(row, 'source')));
  assert.deepEqual([...new Set(sample.accessed)], ['dataset_metadata']);
  assert.deepEqual(sample.inserts.map(outcome => outcome.duplicate).sort(), [false, true]);
  assert.match(sample.rejected, /library is full/);
  assert.equal(sample.oversized, null);
  assert.equal(sample.beforeRemove.length, 9);
  assert.equal(sample.removed, null);
  assert.equal(sample.afterRemove.length, 8);
  assert.deepEqual(sample.finalList, []);
  assert.equal(sample.finalRaw, null);
  console.log(JSON.stringify({
    legacyPayloadBytes: sample.legacyPayloadBytes, catalogBytes: sample.catalogBytes,
    legacyMs: sample.legacyMs, catalogMs: sample.catalogMs
  }));
  console.log('PASS dataset catalog upgrade, scoped reads, duplicate imports, quotas and atomic removals');
} finally {
  await browser.close();
}
