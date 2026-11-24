# COMMON quantitative development environment
## Implemented in the development branch
- Project-relative text file paths, a monospace source editor, four previous revisions, restore, export and deletion. Python source is stored as text, not executed. No remote file system.
- Daily CSV import, SMA crossover candidate grid, up to 60 valid parameter pairs, fixed rolling train/test windows, and training-only parameter selection by Sharpe. Each out-of-sample block is disjoint; simulated positions carry between folds. Flat transaction costs; buy-and-hold benchmark.
- Browser Web Worker with 60-second timeout and cancellation for validation. This is an isolated computation thread, not a sandbox for arbitrary code.
- Separate performance, fold, parameter grid, regime, trade log and reproducibility views. SHA-256 identifies the uploaded text; it does not establish authenticity or licensing. The original CSV is not retained.
- Regime classification from the trailing 20 observed daily returns ending two bars before the evaluated return. Threshold: 25% annualized volatility. Descriptive conditional mean returns, not regime forecasts. Position changes record simulated preceding close and signal date, not brokerage orders.
- Browser-local storage, max five validation reports per project; export/delete to make room. No financial or user credentials stored in these files. Storage is subject to browser quota.
## Not yet implemented
Monaco-class editor, isolated Python compute and package installation, notebooks, server-side project storage, agent tool execution, custom agent commands, research memory, Pine Script, licensed market data, order books, institutional APIs, MCP, and full multi-asset research. Keep real trading, brokerage and custody disabled.
## Verification
Run node tests/workspace-quant.test.cjs and the Chromium workspace browser test. Synthetic fixtures are for tests only; user analytics require uploaded data. Historical results are not forecasts, and selection bias remains possible if users repeatedly tune using holdout results.

## Structured notebook increment
Project notebooks provide ordered editable note, dataset-profile, distribution, drawdown and SMA backtest cells, with saved dataset selection, outputs, export, and source fingerprints. Editing inputs invalidates prior output. This is a fixed-function analytical notebook, not Jupyter or an arbitrary-code execution environment. Cloud compute, Python kernels and autonomous agents remain outstanding.
