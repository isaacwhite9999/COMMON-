(() => {
  'use strict';
  const E = CommonCanvas;
  const key = 'common-canvas-specs-v1';
  const get = id => document.getElementById(id);
  const builder = get('builder');
  const figure = get('figure');
  const status = get('status');
  let worker, metadata, active, selected, busy = false, plotLibrary;

  function report(text) { status.textContent = text; }
  function option(text, value = text) { return new Option(text, value); }
  for (const chart of Object.keys(E.CONFIG)) builder.elements.chart.add(option(chart));
  function fields(mapping = {}) {
    const root = get('fields');
    root.replaceChildren();
    for (const key of E.CONFIG[builder.elements.chart.value]) {
      const label = document.createElement('label');
      label.textContent = key.toUpperCase() + ' column';
      const select = document.createElement('select');
      select.name = key;
      select.id = 'channel-' + key;
      label.htmlFor = select.id;
      select.required = true;
      select.add(option('Choose a column', ''));
      for (const name of metadata?.columns || []) select.add(option(name));
      select.value = mapping[key] || '';
      root.append(label, select);
    }
  }
  function availability(filter) {
    const field = get('availability');
    field.replaceChildren(option('No cutoff', ''), ...(metadata?.columns || []).map(name => option(name)));
    field.value = filter?.field || '';
    get('cutoff').value = filter?.asOf || '';
    if (filter) get('cutoff-controls').open = true;
  }
  fields();
  availability();
  function showSpec(spec) {
    builder.elements.title.value = spec.title;
    builder.elements.chart.value = spec.chart;
    fields(spec);
    availability(spec.availability);
    get('spec').value = JSON.stringify(spec, null, 2);
  }
  builder.elements.chart.addEventListener('change', () => fields());

  function workerCall(operation, extra) {
    if (!worker) worker = new Worker('worker.js');
    const current = worker;
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      function finish(error, result) {
        clearTimeout(timer);
        current.onmessage = current.onerror = null;
        if (error) reject(Error(error));
        else resolve(result);
      }
      const timer = setTimeout(() => {
        current.terminate();
        worker = null;
        metadata = null;
        active = null;
        selected = null;
        get('source').textContent = 'Reload the data source after a timeout.';
        get('sample').hidden = true;
        window.Plotly?.purge(figure);
        finish('Canvas computation timed out. Reload the source.');
      }, 10_000);
      current.onmessage = ({ data }) => {
        if (data.id === id) finish(data.error, data.result);
      };
      current.onerror = () => finish('Canvas computation failed.');
      current.postMessage({ id, operation, ...extra });
    });
  }
  function library() {
    if (!plotLibrary) plotLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.plot.ly/plotly-3.3.1.min.js';
      script.integrity = 'sha384-SsOMajmLeeY81sOzGCn88NjTdDwa+nz3Lb1ZNouSdXAz5TBsvD+Pwgf1Iqtxns6c';
      script.crossOrigin = 'anonymous';
      script.onload = () => window.Plotly ? resolve(window.Plotly) : reject(Error('Chart renderer could not initialize.'));
      script.onerror = () => reject(Error('Chart renderer unavailable. You can still preview data and edit specifications.'));
      document.head.append(script);
    }).catch(error => { plotLibrary = null; throw error; });
    return plotLibrary;
  }
  async function run(task) {
    if (busy) return;
    busy = true;
    try { await task(); }
    catch (error) { report(error.message); }
    finally { busy = false; }
  }
  function preview(data) {
    const table = document.createElement('table');
    const heading = table.createTHead().insertRow();
    for (const value of data.columns) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = value;
      heading.append(cell);
    }
    const body = table.createTBody();
    for (const row of data.sample) {
      const target = body.insertRow();
      for (const value of row) target.insertCell().textContent = value;
    }
    get('rows').replaceChildren(table);
    get('sample').hidden = false;
  }
  async function load(source, name, provenance) {
    get('provenance').hidden = true;
    active = selected = metadata = null;
    get('sample').hidden = true;
    get('source').textContent = 'Reading source…';
    window.Plotly?.purge(figure);
    fields();
    availability();
    try {
      metadata = { ...await workerCall('load', { source }), name, provenance };
      fields();
      availability();
      preview(metadata);
      get('source').textContent = name + ' · ' + metadata.count + ' rows · SHA-256 ' + metadata.digest;
      if (provenance) {
        const link = document.createElement('a');
        link.href = provenance.url;
        link.textContent = 'Official series';
        get('provenance').replaceChildren('Record dates ' + provenance.first + ' to ' + provenance.last +
          ' · Retrieved ' + provenance.retrievedAt + ' · ', link);
        get('provenance').hidden = false;
      }
      report('Map the fields for this source or open a matching saved revision.');
    } catch (error) {
      get('source').textContent = 'No source loaded.';
      throw error;
    }
  }
  async function plot(spec) {
    if (!metadata) throw Error('Load a CSV or workspace dataset first.');
    const { trace, labels, count, excluded, spec: checked } = await workerCall('plot', { spec });
    const Plotly = await library();
    const theme = getComputedStyle(document.documentElement);
    const background = theme.getPropertyValue('--panel').trim();
    await Plotly.react(figure, [{ ...trace, hoverlabel: { namelength: 0 } }], {
      title: { text: labels.title }, autosize: true, height: 400, paper_bgcolor: background, plot_bgcolor: background,
      font: { color: theme.getPropertyValue('--ink').trim() },
      xaxis: { title: { text: labels.x } }, yaxis: { title: { text: labels.y } },
      ...(checked.chart === 'surface' ? { scene: { xaxis: { title: labels.x }, yaxis: { title: labels.y },
        zaxis: { title: labels.z } } } : {}),
      margin: { l: 58, r: 14, t: 60, b: 60 }
    }, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud'] });
    active = { spec: checked, digest: metadata.digest,
      ...(metadata.provenance ? { provenance: metadata.provenance } : {}) };
    showSpec(checked);
    get('sample').hidden = Boolean(checked.availability);
    report('Rendered ' + checked.chart + ' using ' + count + ' source rows.' +
      (checked.availability ? ' Excluded ' + excluded + ' rows after the declared UTC cutoff.' : ''));
  }

  async function catalog() {
    const entries = await CommonData.all();
    const select = get('library');
    for (const entry of entries) select.add(option(entry.name, entry.id));
    if (!entries.length) {
      select.add(option('No workspace datasets saved', ''));
      get('load-library').disabled = true;
    }
  }
  get('upload').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    void run(async () => {
      if (file.size > E.MAX_BYTES) throw Error('CSV files are limited to 2 MB.');
      await load(await file.text(), file.name);
    });
  });
  get('library-form').addEventListener('submit', event => {
    event.preventDefault();
    void run(async () => {
      const dataset = await CommonData.get(get('library').value);
      if (!dataset) throw Error('The selected dataset is unavailable.');
      await load(dataset.source, dataset.name);
    });
  });
  get('treasury').addEventListener('click', () => void run(async () => {
    report('Requesting public Treasury observations…');
    const entry = await CommonCanvasSources.loadTreasuryBills();
    await load(entry.source, entry.name, entry.provenance);
  }));
  builder.addEventListener('submit', event => {
    event.preventDefault();
    const field = get('availability').value;
    const spec = { version: 1, ...Object.fromEntries(new FormData(builder)) };
    if (field) spec.availability = { field, asOf: get('cutoff').value.trim() };
    void run(() => plot(spec));
  });
  get('apply').addEventListener('click', () => void run(async () => {
    const raw = get('spec').value;
    if (raw.length > 3000) throw Error('Specifications must be 3,000 characters or less.');
    await plot(JSON.parse(raw));
  }));
  get('intent-form').addEventListener('submit', event => {
    event.preventDefault();
    void run(async () => {
      showSpec(E.draft(event.target.elements.intent.value, metadata?.columns || []));
      report('Draft ready. Review the title and field mappings.');
    });
  });

  function saved() {
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(items)) throw Error('Saved specifications could not be read.');
    return items;
  }
  function renderSaved() {
    const list = get('saved');
    list.replaceChildren();
    for (const entry of saved()) {
      const item = document.createElement('div');
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Revision for ' + entry.name);
      entry.revisions.forEach((rev, i) => select.add(option(new Date(rev.at).toLocaleString(), String(i))));
      const heading = document.createElement('strong');
      heading.textContent = entry.name;
      const open = document.createElement('button');
      open.textContent = 'Open revision';
      open.addEventListener('click', () => void run(async () => {
        const version = entry.revisions[Number(select.value)];
        if (!metadata || version.digest !== metadata.digest) throw Error('Load the original source CSV before opening this revision.');
        await plot(version.spec);
        selected = entry.id;
      }));
      item.append(heading, select, open);
      list.append(item);
    }
  }
  function save(duplicate) {
    if (!active) throw Error('Render a chart before saving.');
    const items = saved();
    const at = new Date().toISOString();
    let entry = duplicate ? undefined : items.find(item => item.id === selected);
    if (!entry) {
      if (items.length >= 30) throw Error('This browser holds up to 30 Canvas specifications.');
      entry = { id: crypto.randomUUID(), name: active.spec.title + (duplicate ? ' (copy)' : ''), revisions: [] };
      items.unshift(entry);
    }
    entry.revisions = [{ ...active, at }, ...entry.revisions].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(items));
    selected = entry.id;
    renderSaved();
    report(duplicate ? 'Specification duplicated on this device.' : 'Revision saved on this device.');
  }
  get('save').addEventListener('click', () => void run(async () => save(false)));
  get('duplicate').addEventListener('click', () => void run(async () => save(true)));
  get('export').addEventListener('click', () => void run(async () => {
    if (!active) throw Error('Render a chart before exporting.');
    const url = URL.createObjectURL(new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'common-canvas.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  get('upload').disabled = false;
  void catalog().catch(() => { get('load-library').disabled = true; });
  try { renderSaved(); } catch (error) { report(error.message); }
})();
