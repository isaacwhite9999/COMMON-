# Quantitative and institutional research — granular acceptance checklist

Expanded from the prior product discussions and the grouped acceptance backlog. This is a reconstructed granular inventory, not an exact transcript of an earlier checklist. Each item is an individual acceptance requirement; unchecked means not independently signed off, not necessarily absent from the source. Inspect code and tests and cite evidence before marking complete. Parent IDs refer to PRODUCT_ACCEPTANCE_BACKLOG.md. Provider-dependent features must remain gated pending authorization and verified availability; use permitted data and test fixtures. Do not spend money without explicit approval.

## AI research agents — workstream 02 / parent Q01

- [ ] QUANT-001 — Goal-based research agent
- [ ] QUANT-002 — Persistent project-scoped sessions
- [ ] QUANT-003 — Write strategy code
- [ ] QUANT-004 — Run approved code
- [ ] QUANT-005 — Inspect execution outputs
- [ ] QUANT-006 — Debug and propose corrections
- [ ] QUANT-007 — Multi-agent orchestration
- [ ] QUANT-008 — Fundamental research specialist
- [ ] QUANT-009 — Technical research specialist
- [ ] QUANT-010 — Quantitative research specialist
- [ ] QUANT-011 — Portfolio specialist
- [ ] QUANT-012 — Macro specialist
- [ ] QUANT-013 — SEC filings specialist
- [ ] QUANT-014 — Risk specialist
- [ ] QUANT-015 — Financial modeling specialist
- [ ] QUANT-016 — Data retrieval specialist
- [ ] QUANT-017 — Independent verification specialist
- [ ] QUANT-018 — Structured tool definitions
- [ ] QUANT-019 — Per-tool permission controls
- [ ] QUANT-020 — Explicit execution approvals
- [ ] QUANT-021 — Streaming responses
- [ ] QUANT-022 — Tool execution traces
- [ ] QUANT-023 — Durable long-running sessions
- [ ] QUANT-024 — Pause and resume
- [ ] QUANT-025 — Cancel active job
- [ ] QUANT-026 — Custom commands
- [ ] QUANT-027 — Project memory
- [ ] QUANT-028 — Account memory with consent
- [ ] QUANT-029 — Conversation history
- [ ] QUANT-030 — Context compaction
- [ ] QUANT-031 — Model selection
- [ ] QUANT-032 — Token and cost usage accounting
- [ ] QUANT-033 — Citations and uncertainty
- [ ] QUANT-034 — Bounded retries and failure recovery

## Professional IDE — workstream 03 / parent Q02

- [ ] QUANT-035 — Project creation
- [ ] QUANT-036 — Project list and search
- [ ] QUANT-037 — Rename archive restore delete projects
- [ ] QUANT-038 — File creation and editing
- [ ] QUANT-039 — Nested folders
- [ ] QUANT-040 — File move rename delete
- [ ] QUANT-041 — Syntax highlighting
- [ ] QUANT-042 — Language-aware autocomplete
- [ ] QUANT-043 — Linting and diagnostics
- [ ] QUANT-044 — AI inline edits
- [ ] QUANT-045 — Diff review and acceptance
- [ ] QUANT-046 — Editor tabs and tab persistence
- [ ] QUANT-047 — Resizable panels
- [ ] QUANT-048 — Terminal and output console
- [ ] QUANT-049 — Cross-file search and replace
- [ ] QUANT-050 — File revision history and restore
- [ ] QUANT-051 — Git integration
- [ ] QUANT-052 — Collaborative editing
- [ ] QUANT-053 — Project templates
- [ ] QUANT-054 — Project duplication
- [ ] QUANT-055 — Project import
- [ ] QUANT-056 — Project export
- [ ] QUANT-057 — Project sharing and permission management
- [ ] QUANT-058 — Keyboard shortcuts
- [ ] QUANT-059 — Autosave and unsaved changes protection

## Compute and notebooks — workstream 03 / parent Q03

- [ ] QUANT-060 — Browser Python runtime
- [ ] QUANT-061 — Executable Python notebook cells
- [ ] QUANT-062 — Markdown notebook cells
- [ ] QUANT-063 — Kernel lifecycle and restart
- [ ] QUANT-064 — Scientific package management
- [ ] QUANT-065 — NumPy SciPy pandas environments
- [ ] QUANT-066 — Statistical and ML packages where supported
- [ ] QUANT-067 — Isolated remote execution adapter
- [ ] QUANT-068 — Project runtime environments
- [ ] QUANT-069 — Environment and dependency manifests
- [ ] QUANT-070 — Secrets scoped to approved providers
- [ ] QUANT-071 — CPU memory and time quotas
- [ ] QUANT-072 — Per-user concurrent job limits
- [ ] QUANT-073 — Durable queue
- [ ] QUANT-074 — Parallel compute execution
- [ ] QUANT-075 — Job progress and logs
- [ ] QUANT-076 — Artifacts and result storage
- [ ] QUANT-077 — Cancel and suspend
- [ ] QUANT-078 — Resume and failure recovery
- [ ] QUANT-079 — Network deny by default
- [ ] QUANT-080 — Resource monitoring and usage accounting

## Market data — workstream 04 / parent Q04

- [ ] QUANT-081 — Historical CSV ingestion
- [ ] QUANT-082 — Dataset catalog and reuse
- [ ] QUANT-083 — Dataset provenance and source hashes
- [ ] QUANT-084 — Data quality checks
- [ ] QUANT-085 — Equity historical data adapter
- [ ] QUANT-086 — ETF data adapter
- [ ] QUANT-087 — International security coverage
- [ ] QUANT-088 — Futures data adapter
- [ ] QUANT-089 — Options data adapter
- [ ] QUANT-090 — Fixed income data adapter
- [ ] QUANT-091 — FX data adapter
- [ ] QUANT-092 — Economic series and FRED-compatible sources
- [ ] QUANT-093 — Official SEC filing data
- [ ] QUANT-094 — OHLCV normalization
- [ ] QUANT-095 — Trade and quote data adapter
- [ ] QUANT-096 — Level 1 market data
- [ ] QUANT-097 — Level 2 market data
- [ ] QUANT-098 — Order book snapshots
- [ ] QUANT-099 — Corporate actions
- [ ] QUANT-100 — Adjusted prices and dividends
- [ ] QUANT-101 — Symbol and instrument resolution
- [ ] QUANT-102 — Exchange calendars and sessions
- [ ] QUANT-103 — Continuous futures and roll methodology
- [ ] QUANT-104 — Point-in-time data and revisions
- [ ] QUANT-105 — Data licensing entitlements
- [ ] QUANT-106 — Caching and deduplicated ingestion

## Backtesting — workstream 05 / parent Q05

- [ ] QUANT-107 — SMA strategies
- [ ] QUANT-108 — Buy and hold benchmark
- [ ] QUANT-109 — Custom Python strategies
- [ ] QUANT-110 — Trading-language support where permitted
- [ ] QUANT-111 — Event-driven backtest engine
- [ ] QUANT-112 — Multi-asset backtests
- [ ] QUANT-113 — Intraday backtests
- [ ] QUANT-114 — Options backtests
- [ ] QUANT-115 — Futures backtests
- [ ] QUANT-116 — Transaction commissions
- [ ] QUANT-117 — Slippage
- [ ] QUANT-118 — Market impact assumptions
- [ ] QUANT-119 — Liquidity and volume constraints
- [ ] QUANT-120 — Stop-loss and target rules
- [ ] QUANT-121 — Position sizing
- [ ] QUANT-122 — Leverage and margin accounting
- [ ] QUANT-123 — Signal versus execution timing
- [ ] QUANT-124 — Trade logs
- [ ] QUANT-125 — Performance attribution
- [ ] QUANT-126 — Benchmark comparison
- [ ] QUANT-127 — Run comparisons and reproducibility

## Statistical validation — workstream 05 / parent Q05

- [ ] QUANT-128 — Chronological train/test split
- [ ] QUANT-129 — Walk-forward optimization
- [ ] QUANT-130 — Parameter grid sweeps
- [ ] QUANT-131 — Monte Carlo and bootstrap
- [ ] QUANT-132 — Market regime classification
- [ ] QUANT-133 — Regime-conditioned simulations
- [ ] QUANT-134 — Sensitivity analysis
- [ ] QUANT-135 — Parameter stability
- [ ] QUANT-136 — Time-series cross-validation
- [ ] QUANT-137 — Overfitting diagnostics
- [ ] QUANT-138 — Multiple-testing correction
- [ ] QUANT-139 — Lookahead tests
- [ ] QUANT-140 — Survivorship-bias limitations and checks
- [ ] QUANT-141 — Statistical significance and uncertainty
- [ ] QUANT-142 — Factor diagnostics
- [ ] QUANT-143 — Strategy grading with transparent methodology
- [ ] QUANT-144 — Seeded reproducible research
- [ ] QUANT-145 — Independent numerical fixtures

## Trading research and derivatives — workstream 05 / parent Q05/Q06

- [ ] QUANT-146 — Prop-firm rule scenario simulation
- [ ] QUANT-147 — Pass-probability estimation with assumptions
- [ ] QUANT-148 — Prop-firm account economics
- [ ] QUANT-149 — Order-flow analysis
- [ ] QUANT-150 — Volume profiles
- [ ] QUANT-151 — Footprint charts
- [ ] QUANT-152 — Bid/ask imbalance
- [ ] QUANT-153 — Cumulative volume delta
- [ ] QUANT-154 — Depth heatmap
- [ ] QUANT-155 — Execution analysis
- [ ] QUANT-156 — Trading session analysis
- [ ] QUANT-157 — Options payoff builder
- [ ] QUANT-158 — Black-Scholes valuation
- [ ] QUANT-159 — Greeks
- [ ] QUANT-160 — Implied volatility surfaces
- [ ] QUANT-161 — Volatility term structure
- [ ] QUANT-162 — Options exposure and scenario analysis

## Portfolio engineering — workstream 05 / parent Q06

- [ ] QUANT-163 — Multi-asset portfolios
- [ ] QUANT-164 — Correlation matrices
- [ ] QUANT-165 — Covariance estimation
- [ ] QUANT-166 — Historical and model-based VaR
- [ ] QUANT-167 — Expected shortfall
- [ ] QUANT-168 — Risk contribution and attribution
- [ ] QUANT-169 — Portfolio optimization
- [ ] QUANT-170 — Efficient frontier
- [ ] QUANT-171 — Risk parity
- [ ] QUANT-172 — Factor exposure
- [ ] QUANT-173 — Portfolio rebalancing
- [ ] QUANT-174 — Benchmark attribution
- [ ] QUANT-175 — Stress testing
- [ ] QUANT-176 — Scenario analysis
- [ ] QUANT-177 — Liquidity risk
- [ ] QUANT-178 — Concentration limits
- [ ] QUANT-179 — Allocation constraints
- [ ] QUANT-180 — Transaction-cost-aware optimization
- [ ] QUANT-181 — Bond valuation
- [ ] QUANT-182 — Duration convexity and DV01

## Developer platform — workstream 04/10 / parent Q04

- [ ] QUANT-183 — Versioned REST APIs
- [ ] QUANT-184 — Python SDK
- [ ] QUANT-185 — MCP interfaces
- [ ] QUANT-186 — Developer documentation
- [ ] QUANT-187 — API key creation
- [ ] QUANT-188 — Scoped API permissions
- [ ] QUANT-189 — Key rotation and revocation
- [ ] QUANT-190 — Rate limits
- [ ] QUANT-191 — API usage analytics
- [ ] QUANT-192 — Bulk exports
- [ ] QUANT-193 — Webhooks with verification
- [ ] QUANT-194 — Tutorials and runnable examples

## Institutional intelligence — workstream 04 / parent Q06

- [ ] QUANT-195 — Corporate ownership map
- [ ] QUANT-196 — Institutional holdings
- [ ] QUANT-197 — 13F changes and reporting lags
- [ ] QUANT-198 — Insider transaction research
- [ ] QUANT-199 — Beneficial ownership
- [ ] QUANT-200 — Ownership concentration
- [ ] QUANT-201 — Shareholder governance
- [ ] QUANT-202 — Board and voting rights research
- [ ] QUANT-203 — Proxy and record-date research
- [ ] QUANT-204 — Issuer filing viewer
- [ ] QUANT-205 — Financial statement analysis
- [ ] QUANT-206 — DCF valuation
- [ ] QUANT-207 — WACC and terminal value sensitivity
- [ ] QUANT-208 — Comparable company valuation
- [ ] QUANT-209 — Private equity and acquisition modeling
- [ ] QUANT-210 — Capital structure analysis
- [ ] QUANT-211 — Venture cap tables
- [ ] QUANT-212 — Dilution and runway modeling
- [ ] QUANT-213 — Investment memorandum builder

## Acceptance evidence
For each ID record PR, source path, route or API, data persistence, permissions, relevant test commands and results, limitations and provider activation status. Check off only after independent review; retain all remaining IDs. Financial features are development-only until the documented legal and partner gates are met.
