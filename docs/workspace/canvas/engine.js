(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.CommonCanvas = engine;
})(globalThis, function () {
  'use strict';
  const MAX_BYTES = 2_000_000;
  const MAX_ROWS = 30_000;
  const MAX_POINTS = 4_000;
  const MAX_COLUMNS = 32;
  const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const CONFIG = Object.freeze({
    line: ['x', 'y'], scatter: ['x', 'y'], histogram: ['y'], box: ['y'],
    violin: ['y'], waterfall: ['x', 'y'], heatmap: ['x', 'y', 'z'],
    contour: ['x', 'y', 'z'], surface: ['x', 'y', 'z'],
    candlestick: ['x', 'open', 'high', 'low', 'close']
  });
  const FIELDS = [...new Set(Object.values(CONFIG).flat())];

  function csv(source) {
    if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_BYTES) {
      throw Error('CSV files are limited to 2 MB.');
    }
    const rows = [];
    let row = [], cell = '', state = 'start';
    function endCell() {
      if (row.length >= MAX_COLUMNS) throw Error('CSV files are limited to 32 columns.');
      row.push(cell);
      cell = '';
      state = 'start';
    }
    function endRow() {
      endCell();
      if (row.some(value => value !== '')) rows.push(row);
      if (rows.length > MAX_ROWS + 1) throw Error('CSV files are limited to 30,000 data rows.');
      row = [];
    }
    for (let i = source.charCodeAt(0) === 0xfeff ? 1 : 0; i < source.length; i++) {
      const ch = source[i];
      if (state === 'quoted') {
        if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') state = 'closed';
        else cell += ch;
      } else if (ch === ',') {
        endCell();
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && source[i + 1] === '\n') i++;
        endRow();
      } else if (state === 'closed') {
        throw Error('Unexpected character after a quoted CSV value.');
      } else if (ch === '"') {
        if (state !== 'start') throw Error('Unexpected quote in CSV value.');
        state = 'quoted';
      } else {
        state = 'plain';
        cell += ch;
      }
    }
    if (state === 'quoted') throw Error('A CSV value has an unclosed quote.');
    if (row.length || state !== 'start') endRow();
    const columns = rows.shift()?.map(value => value.trim());
    if (!columns?.length || columns.some(value => !value || value.length > 100) ||
        new Set(columns).size !== columns.length || !rows.length) throw Error('Include distinct column names and data rows.');
    if (rows.some(values => values.length !== columns.length)) throw Error('All rows must match the CSV header width.');
    return { columns, rows };
  }

  function validate(spec, columns) {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec) || spec.version !== 1 ||
        typeof spec.chart !== 'string' || !Object.hasOwn(CONFIG, spec.chart) || typeof spec.title !== 'string' ||
        !spec.title.trim() || spec.title.length > 120) throw Error('Use a version 1 specification with a supported chart and title.');
    const required = CONFIG[spec.chart];
    if (Object.keys(spec).some(key => !['version', 'chart', 'title', 'availability', ...required].includes(key))) {
      throw Error('The specification includes unsupported properties.');
    }
    if (required.some(key => !columns.includes(spec[key]))) throw Error('Map every required field to a CSV column.');
    let availability;
    if (Object.hasOwn(spec, 'availability')) {
      const filter = spec.availability;
      if (!filter || Object.keys(filter).length !== 2 || !columns.includes(filter.field)) {
        throw Error('Select an availability timestamp column and UTC cutoff.');
      }
      timestamp(filter.asOf);
      availability = { field: filter.field, asOf: filter.asOf };
    }
    return { version: 1, chart: spec.chart, title: spec.title.trim(),
      ...Object.fromEntries(required.map(key => [key, spec[key]])), ...(availability ? { availability } : {}) };
  }

  function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
      throw Error('Use ISO UTC publication timestamps, for example 2025-01-31T15:00:00Z.');
    }
    const parsed = new Date(value);
    const normalized = value.length === 20 ? value.replace('Z', '.000Z') : value;
    if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== normalized) {
      throw Error('An availability timestamp is not a valid UTC date and time.');
    }
    return parsed.valueOf();
  }

  const safe = text => text.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function compile(spec, data) {
    const checked = validate(spec, data.columns);
    const { availability } = checked;
    const index = availability ? data.columns.indexOf(availability.field) : -1;
    const cutoff = availability ? timestamp(availability.asOf) : NaN;
    const rows = availability ? data.rows.filter(row => timestamp(row[index].trim()) <= cutoff) : data.rows;
    if (!rows.length) throw Error('No observations were available by the selected cutoff.');
    const count = rows.length, excluded = data.rows.length - count;
    if (count > MAX_POINTS && checked.chart !== 'histogram') {
      throw Error('This chart supports up to 4,000 input rows. Apply an explicit upstream filter.');
    }
    const grid = ['heatmap', 'contour', 'surface'].includes(checked.chart);
    const values = {};
    for (const field of CONFIG[checked.chart]) {
      const index = data.columns.indexOf(checked[field]);
      const cells = rows.map(row => row[index].trim());
      if ((field === 'x' || (grid && field === 'y')) && !cells.some(value => !value)) {
        const numeric = cells.every(value => NUMBER.test(value) && Number.isFinite(Number(value)));
        values[field] = numeric ? cells.map(Number) : cells.map(value => safe(value.slice(0, 160)));
      } else {
        const numbers = cells.map((value, index) => {
          if (!NUMBER.test(value) || !Number.isFinite(Number(value))) {
            throw Error('Field ' + field + ' requires finite numeric data (data row ' + (index + 1) + ').');
          }
          return Number(value);
        });
        values[field] = numbers;
      }
    }
    if (checked.chart === 'candlestick' && values.high.some((high, i) =>
      high < Math.max(values.open[i], values.close[i]) || values.low[i] > Math.min(values.open[i], values.close[i]))) {
      throw Error('Candlestick values must satisfy low ≤ open/close ≤ high.');
    }
    if (grid) {
      const axis = field => {
        const list = [...new Set(values[field])];
        if (list.every(value => typeof value === 'number')) return list.sort((a, b) => a - b);
        if (checked.chart !== 'heatmap') throw Error('Contour and surface charts require numeric X and Y coordinates.');
        return list;
      };
      const x = axis('x'), y = axis('y');
      if (x.length * y.length > MAX_POINTS) throw Error('The complete grid exceeds 4,000 cells.');
      if (x.length < 2 || y.length < 2) throw Error('A grid needs at least two distinct coordinates on each axis.');
      const xIndex = new Map(x.map((value, index) => [value, index]));
      const yIndex = new Map(y.map((value, index) => [value, index]));
      const z = y.map(() => x.map(() => null));
      values.z.forEach((value, row) => {
        const a = yIndex.get(values.y[row]), b = xIndex.get(values.x[row]);
        if (z[a][b] !== null) throw Error('Grid coordinates must be unique.');
        z[a][b] = value;
      });
      if (checked.chart !== 'heatmap' && z.some(row => row.includes(null))) {
        throw Error('Contour and surface charts require a complete grid.');
      }
      return { spec: checked, count, excluded, trace: { type: checked.chart, x, y, z, connectgaps: false },
        labels: { title: safe(checked.title), x: safe(checked.x), y: safe(checked.y), z: safe(checked.z) } };
    }
    const trace = checked.chart === 'histogram' ? { type: 'histogram', x: values.y } :
      checked.chart === 'line' || checked.chart === 'scatter' ?
        { type: 'scatter', mode: checked.chart === 'line' ? 'lines' : 'markers', ...values } :
        { type: checked.chart, ...values };
    return { spec: checked, count, excluded, trace, labels: { title: safe(checked.title),
      x: safe(checked.chart === 'histogram' ? checked.y : checked.x || ''),
      y: safe(checked.chart === 'histogram' ? 'Count' : checked.y || '') } };
  }

  function draft(intent, columns) {
    const text = intent.trim();
    const request = /^\s*(line|scatter(?:plot)?|histogram|box(?: plot)?|violin(?: plot)?|waterfall)\s+(.+?)\s*$/i.exec(text);
    if (!request) throw Error('Try “line Close by Date” or “histogram Return” using exact column names.');
    const chart = request[1].toLowerCase().replace(/plot| /g, '');
    const first = ['histogram', 'box', 'violin'].includes(chart);
    const terms = first ? [request[2]] : request[2].split(/\s+by\s+/i);
    if (terms.length !== (first ? 1 : 2)) throw Error('For two-axis charts use “chart Y by X”.');
    function resolve(name) {
      const options = columns.filter(column => column.toLowerCase() === name.trim().toLowerCase());
      if (options.length !== 1) throw Error('Use an unambiguous CSV column name.');
      return options[0];
    }
    return validate({ version: 1, chart, title: text, y: resolve(terms[0]),
      ...(first ? {} : { x: resolve(terms[1]) }) }, columns);
  }

  return { MAX_BYTES, MAX_ROWS, MAX_POINTS, CONFIG, FIELDS, csv, validate, compile, draft };
});
