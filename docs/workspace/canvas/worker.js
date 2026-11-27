'use strict';
importScripts('engine.js');

let data;
self.onmessage = async ({ data: message }) => {
  const { id, operation } = message;
  try {
    let result;
    if (operation === 'load') {
      data = null;
      const parsed = CommonCanvas.csv(message.source);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message.source));
      data = parsed;
      result = { columns: data.columns, count: data.rows.length,
        digest: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
        sample: data.rows.slice(0, 20).map(row => row.map(value => value.slice(0, 200))) };
    } else if (operation === 'plot' && data) {
      result = CommonCanvas.compile(message.spec, data);
    } else {
      throw Error('Load an eligible CSV first.');
    }
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
