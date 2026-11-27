(function (root, factory) {
  const sources = factory();
  if (typeof module === 'object' && module.exports) module.exports = sources;
  else root.CommonCanvasSources = sources;
})(globalThis, function () {
  'use strict';

  const series = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates';
  const url = series + '?fields=record_date,security_desc,avg_interest_rate_amt&filter=security_desc:eq:Treasury%20Bills&sort=-record_date&page%5Bsize%5D=72';

  function treasuryBills(payload) {
    if (!Array.isArray(payload?.data) || !payload.data.length || payload.data.length > 72) {
      throw Error('Treasury returned an unexpected coverage window.');
    }
    const observations = new Map();
    for (const item of payload.data) {
      const date = item?.record_date;
      const rate = item?.avg_interest_rate_amt;
      if (item?.security_desc !== 'Treasury Bills' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
          typeof rate !== 'string' || !/^-?\d{1,4}(?:\.\d{1,12})?$/.test(rate) || observations.has(date)) {
        throw Error('Treasury returned an invalid or duplicate observation.');
      }
      observations.set(date, rate);
    }
    const dates = [...observations.keys()].sort();
    return {
      source: 'Record date,Average rate (%)\n' + dates.map(date => date + ',' + observations.get(date)).join('\n') + '\n',
      name: 'U.S. Treasury Fiscal Data · Treasury Bills · historical monthly observations',
      provenance: { url, retrievedAt: new Date().toISOString(), first: dates[0], last: dates.at(-1) }
    };
  }

  async function loadTreasuryBills(fetchSource = fetch) {
    const response = await fetchSource(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error('Treasury data is unavailable.');
    return treasuryBills(await response.json());
  }

  return { treasuryBills, loadTreasuryBills };
});
