/* Research Studio glossary. Lesson keys connect definitions to the existing curriculum. */
(() => {
'use strict';

const terms = [
  { name: 'Adjusted close', lesson: 'provenance', aliases: 'corporate actions total return splits dividends',
    definition: 'A historical closing price restated for corporate actions. Check your provider’s method to see whether it includes cash distributions in addition to share splits.' },
  { name: 'Annualized Sharpe ratio', lesson: 'sharpe', aliases: 'risk adjusted return volatility excess return',
    definition: 'Average periodic excess return divided by its sample standard deviation, scaled to a year. The Studio uses daily observations and multiplies by the square root of 252. A short or serially dependent sample can make this estimate unreliable.' },
  { name: 'Backtest', lesson: 'lookahead', aliases: 'historical simulation execution',
    definition: 'A simulation that applies a specified rule to historical data. Results depend on assumptions about the data available at each decision, fill timing, trading costs, and what assets the rule could have traded.' },
  { name: 'Basis point', lesson: 'costs', aliases: 'bps bp basis points',
    definition: 'One hundredth of a percentage point. A cost of 10 basis points on the full value traded is 0.10% of that amount.' },
  { name: 'Benchmark', lesson: 'holdout', aliases: 'baseline buy and hold',
    definition: 'A reference used to evaluate a strategy over a comparable period. In the Studio, buy-and-hold on the same asset is the reference; check assumptions about costs and reinvestment when comparing performance.' },
  { name: 'Block bootstrap', lesson: 'bootstrap', aliases: 'monte carlo simulation resampling losses',
    definition: 'A resampling method that draws groups of adjacent observations to preserve some short-range dependence. The resulting scenarios are conditional on the original sample and the chosen block size.' },
  { name: 'Chronological holdout', lesson: 'holdout', aliases: 'test period oos out of sample out-of-sample train test',
    definition: 'A later period reserved to evaluate a rule chosen using earlier observations. Selecting or retuning that rule after seeing holdout results turns the period into development data.' },
  { name: 'Data provenance', lesson: 'provenance', aliases: 'source origin revision vintage',
    definition: 'The record of where data came from and how it changed. For price histories, record the provider, extraction date, units, session timestamps, and the corporate-action adjustment policy.' },
  { name: 'Lookahead bias', lesson: 'lookahead', aliases: 'leakage lag signal future data',
    definition: 'Bias introduced by using information that was unavailable when a simulated decision was made. A rule calculated from a closing price becomes available only after that close.' },
  { name: 'Maximum drawdown', lesson: 'drawdown', aliases: 'mdd peak to trough equity curve max dd',
    definition: 'The largest percentage decline from a prior high to a subsequent low on an equity curve. Expressed as a magnitude, a decline from 125 to 100 is a 20% drawdown.' },
  { name: 'Null hypothesis', lesson: 'hypothesis', aliases: 'falsifiable statistical test significance',
    definition: 'The reference claim a test is designed to challenge, such as a rule having no advantage over its benchmark after costs. Failing to reject it can also reflect an insufficient sample.' },
  { name: 'Risk-free rate', lesson: 'sharpe', aliases: 'cash minimum return rf excess return',
    definition: 'The reference rate subtracted from portfolio returns to compute excess return. Match the reference currency and observation period to the analysis.' },
  { name: 'Slippage', lesson: 'costs', aliases: 'fees trading costs execution',
    definition: 'The difference between the expected and realized trade price. A fixed basis-point assumption simplifies an effect that varies with liquidity, order size, and timing.' },
  { name: 'Survivorship bias', lesson: 'provenance', aliases: 'delisting membership point in time',
    definition: 'Bias from studying only assets that survived to the end of the period. Historical membership and delisted assets matter when evaluating a strategy across a changing universe.' },
  { name: 'Turnover', lesson: 'costs', aliases: 'position change trading costs',
    definition: 'How much a strategy trades over a period. The Studio accumulates absolute changes in position weight, so moving from cash to fully invested adds one unit of turnover.' }
];

const byView = {
  data: ['Adjusted close', 'Data provenance', 'Survivorship bias'],
  strategy: ['Backtest', 'Basis point', 'Lookahead bias', 'Slippage', 'Turnover'],
  validate: ['Annualized Sharpe ratio', 'Benchmark', 'Block bootstrap', 'Chronological holdout', 'Maximum drawdown']
};

function search(query) {
  const tokens = query.toLowerCase().trim().split(/[\s-]+/).filter(Boolean);
  return terms.filter(term => {
    const index = (term.name + ' ' + term.aliases).toLowerCase();
    return tokens.every(token => index.includes(token));
  });
}

window.CommonResearchGlossary = { byView, search };
})();
