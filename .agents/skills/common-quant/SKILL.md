---
name: common-quant
description: Implement or review COMMON quantitative finance, market data, backtesting, statistical validation, risk and portfolio analytics.
---
Read AGENTS.md and docs/QUANT_DEVELOPMENT_ENVIRONMENT.md. Inspect engine and tests before modifying. Define input units, timestamps, price adjustments, signal/execution chronology, cost and benchmark assumptions. Use known-answer fixtures and adverse data tests, including future-data perturbation for leakage. Expose reproducible assumptions, source hash, sample range, version, missing data and limitations. Verify numeric edge cases, no fabricated results and no implied forecast. Run affected unit/browser tests; report actual evidence.
