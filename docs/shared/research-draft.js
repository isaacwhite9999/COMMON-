/* A tab-local transfer of explicitly selected analytical evidence. */
(() => {
  'use strict';
  const key = 'common.research-draft.v1';
  const ttl = 60 * 60 * 1000;
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : 'Unavailable';
  const value = input => Number.isFinite(input) ? String(input) : 'Unavailable';
  const pct = input => Number.isFinite(input) ? (input * 100).toFixed(2) + '%' : 'Unavailable';

  const fingerprint = input => /^[a-f0-9]{64}$/i.test(input || '') ? input : 'Unavailable';

  function backtest(name, run, source = {}) {
    const p = run.params || {};
    const method = p.strategy === 'sma_crossover' ? 'Long-only SMA crossover' :
      p.strategy === 'buy_hold' ? 'Buy and hold' : 'Unavailable';
    const title = ('Backtest: ' + String(name || 'Research project').trim()).slice(0, 160);
    return { title, body: [
      'Historical simulation using member-supplied daily close data. Results are unverified and do not authorize financial activity.',
      'Source fingerprint (SHA-256): ' + fingerprint(source.sha256),
      'Sample: ' + date(source.first) + ' through ' + date(source.last),
      'Holdout starts: ' + date(run.testFrom),
      'Method: ' + method + (p.strategy === 'sma_crossover' ? ' (' + value(p.fast) + '/' + value(p.slow) + ' observations)' : ''),
      'Modeled trading cost: ' + value(p.costBps) + ' basis points per position change',
      'Holdout return: ' + pct(run.test?.totalReturn),
      'Buy-and-hold holdout return: ' + pct(run.baseline?.totalReturn),
      'Holdout maximum drawdown: ' + pct(run.test?.maxDrawdown),
      'Limitations: close-to-close simulation with a two-close information lag. Data gaps, adjustments and survivorship can distort results. Historical results do not predict returns.'
    ].join('\n') };
  }

  function portfolio(run) {
    return { title: 'Historical portfolio risk review', body: [
      'Hypothetical portfolio using member-supplied historical close data. This is research, not a statement of holdings or allocation authority.',
      'Sample: ' + date(run.dates?.[0]) + ' through ' + date(run.dates?.at(-1)),
      'Aligned return intervals: ' + value(run.observations),
      ...run.assets.map((asset, i) => 'Asset ' + (i + 1) + ': ' + pct(asset.weight) +
        ' target weight. Source fingerprint (SHA-256): ' + fingerprint(asset.id)),
      'Annualized volatility: ' + pct(run.annualVolatility),
      'Daily historical VaR (95%): ' + pct(run.var95),
      'Daily expected shortfall (95%): ' + pct(run.es95),
      'Limitations: risk is estimated from historical matched intervals. These estimates do not bound future losses.'
    ].join('\n') };
  }

  function python(run) {
    const version = /^\d+\.\d+\.\d+$/.test(run.version || '') ? run.version : 'Unavailable';
    const timestamp = new Date(run.at);
    return { title: 'Local Python execution review', body: [
      'Browser-local Python run on ' + (Number.isFinite(timestamp.valueOf()) ? timestamp.toISOString() : 'an unavailable date'),
      'Pyodide version: ' + version,
      'Execution status: ' + (run.ok ? 'Completed' : 'Failed or cancelled'),
      'Output status: ' + (run.truncated ? 'Truncated by the runtime' : 'Within the runtime output limit'),
      'Review notes: Add only the findings and methodology you intend to share.'
    ].join('\n') };
  }

  function read() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(key));
      if (draft && draft.expires < Date.now()) sessionStorage.removeItem(key);
      if (!draft || !uuid.test(draft.id) || !Number.isFinite(draft.expires) ||
          draft.expires < Date.now() || typeof draft.title !== 'string' || draft.title.length > 160 ||
          typeof draft.body !== 'string' || draft.body.length > 10000 ||
          (draft.owner !== null && !uuid.test(draft.owner))) return null;
      return draft;
    } catch {
      return null;
    }
  }

  function stage({ title, body }, owner = null) {
    if (read() && !window.confirm('Replace the existing unpublished research draft in this tab?')) return false;
    title = title.trim();
    body = body.trim();
    if (title.length < 8 || title.length > 160 || body.length < 3 || body.length > 10000 ||
        (owner !== null && !uuid.test(owner))) throw Error('Enter a valid research title and summary.');
    const draft = { id: crypto.randomUUID(), expires: Date.now() + ttl, owner, title, body };
    sessionStorage.setItem(key, JSON.stringify(draft));
    return true;
  }

  function forMember(owner) {
    const draft = read();
    return draft && (draft.owner === null || draft.owner === owner) ? draft : null;
  }

  function claim(owner) {
    const draft = forMember(owner);
    if (!draft || !uuid.test(owner)) return null;
    draft.owner = owner;
    sessionStorage.setItem(key, JSON.stringify(draft));
    return draft;
  }

  function update(owner, id, title, body) {
    const draft = forMember(owner);
    if (!draft || draft.id !== id || draft.owner !== owner) throw Error('The draft is no longer available.');
    sessionStorage.setItem(key, JSON.stringify({ ...draft, title, body }));
  }

  function clear(id) {
    if (read()?.id === id) sessionStorage.removeItem(key);
  }

  window.CommonResearchDraft = Object.freeze({ backtest, portfolio, python, stage, forMember, claim, update, clear });
})();
