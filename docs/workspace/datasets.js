(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CommonData = api;
})(globalThis, function () {
'use strict';

const MAX_BYTES = 16_000_000;
const MAX_DATASETS = 20;
const MAX_TOTAL = 64_000_000;

async function inspect(source, name, symbol, engine) {
  if (typeof source !== 'string' || source.length > MAX_BYTES) throw Error('CSV exceeds 16 MB.');
  const bytes = new TextEncoder().encode(source);
  if (bytes.length > MAX_BYTES) throw Error('CSV exceeds 16 MB.');
  const ticker = String(symbol || '').trim().toUpperCase();
  if (ticker && !/^[A-Z0-9][A-Z0-9.-]{0,11}$/.test(ticker)) throw Error('Invalid ticker label.');
  const parsed = engine.parseCsv(source);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  return {
    id: sha256, sha256, name: String(name || 'dataset.csv').slice(0, 200), symbol: ticker,
    bytes: bytes.length, created: new Date().toISOString(), diagnostics: parsed.diagnostics, source
  };
}

function metadata(row) {
  const { source, ...rest } = row;
  return rest;
}

const DATABASE = 'common-research-data-v1';
const RECORDS = 'datasets';
const METADATA = 'dataset_metadata';

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    let blocked = false;
    request.onupgradeneeded = event => {
      const db = request.result;
      if (event.oldVersion === 0) db.createObjectStore(RECORDS, { keyPath: 'id' });
      const catalog = db.createObjectStore(METADATA, { keyPath: 'id' });
      if (event.oldVersion === 0) return;

      // The upgrade transaction copies only the metadata and leaves original records
      // intact. A failed catalog write aborts the entire version upgrade.
      const records = request.transaction.objectStore(RECORDS).openCursor();
      records.onsuccess = () => {
        const cursor = records.result;
        if (!cursor) return;
        catalog.add(metadata(cursor.value));
        cursor.continue();
      };
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close();
      else resolve(db);
    };
    request.onerror = () => reject(Error('Dataset storage unavailable.'));
    request.onblocked = () => {
      blocked = true;
      reject(Error('Dataset storage is blocked by another tab.'));
    };
  });
}

async function transaction(stores, mode, action) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || Error('Dataset operation aborted.'));
      const setResult = value => { result = value; };
      const abort = error => {
        failure = error;
        tx.abort();
      };
      try {
        action(tx, setResult, abort);
      } catch (error) {
        abort(error);
      }
    });
  } finally {
    db.close();
  }
}

function get(id) {
  return transaction(RECORDS, 'readonly', (tx, setResult) => {
    const request = tx.objectStore(RECORDS).get(id);
    request.onsuccess = () => setResult(request.result || null);
  });
}

function all() {
  return transaction(METADATA, 'readonly', (tx, setResult) => {
    const request = tx.objectStore(METADATA).getAll();
    request.onsuccess = () => setResult(request.result.sort((a, b) => b.created.localeCompare(a.created)));
  });
}

function put(row) {
  return transaction([RECORDS, METADATA], 'readwrite', (tx, setResult, abort) => {
    const catalog = tx.objectStore(METADATA);
    const request = catalog.getAll();
    request.onsuccess = () => {
      const rows = request.result;
      if (rows.some(item => item.id === row.id)) {
        setResult({ duplicate: true, id: row.id });
        return;
      }
      const usedBytes = rows.reduce((total, item) => total + item.bytes, 0);
      if (rows.length >= MAX_DATASETS || usedBytes + row.bytes > MAX_TOTAL) {
        abort(Error('Dataset library is full. Remove a dataset before importing another.'));
        return;
      }
      tx.objectStore(RECORDS).add(row);
      catalog.add(metadata(row));
      setResult({ duplicate: false, id: row.id });
    };
  });
}

function remove(id) {
  return transaction([RECORDS, METADATA], 'readwrite', tx => {
    tx.objectStore(RECORDS).delete(id);
    tx.objectStore(METADATA).delete(id);
  });
}

function clear() {
  return transaction([RECORDS, METADATA], 'readwrite', tx => {
    tx.objectStore(RECORDS).clear();
    tx.objectStore(METADATA).clear();
  });
}

return { inspect, metadata, get, all, put, remove, clear, MAX_BYTES, MAX_DATASETS, MAX_TOTAL };
});
