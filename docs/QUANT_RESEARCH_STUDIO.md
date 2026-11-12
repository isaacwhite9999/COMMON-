# COMMON Research Studio — Competitive Capability Audit and Original Build Design
Last audited: November 12, 2026

## Mission
Deliver an original quantitative investing research environment embedded in COMMON's multi-user financial social network. Beginners receive contextual instruction rooted in professional financial mathematics, applied statistics and empirical research methodology. Experts have access to reproducible tools and provenance. Neither trading nor market manipulation is allowed through this module.

## Evidence and limits
Only *publicly described* QuantPad functionality was reviewed, including:
- https://quantpad.ai/
- https://quantpad.ai/subscribe
- https://quantpad.ai/data
- https://quantpad.ai/data/bars
- https://quantpad.ai/data/trades
- https://quantpad.ai/data/depth
Private/account-only pages, undocumented UX elements, private APIs, source code, internal prompts, licensed datasets and copyrighted educational text were **not** accessed or reproduced. Do not use their MCP server, SDK, API or paid subscription as a backend to compete, scrape content or bypass the vendor's licensing.

## Feature inventory — functional concepts rather than screen-for-screen imitation

| Public QuantPad capability | Independent COMMON module | Verification/dependency |
|---|---|---|
| Projects / research workspace | Account-owned Research Workspaces | Implement: Supabase RLS and persisted notes |
| Natural-language research agent | Guided analyst curriculum, contextual methods instructor | Implement deterministic expert guide first; LLM answer generation needs independent model hosting and retrieval |
| Futures research | Instrument coverage, research workspace | Requires historical futures feed and contracts/roll methods |
| US equities research | CSV-based OHLCV strategy research | Implement CSV import; live/large-scale history needs licensed data |
| Options chains: equity/futures | Derivatives explanatory module and contracts model | Paid market data and pricing/risk library needed |
| Bars by resolution: 1s to 1y | Data quality validator for imported daily/hourly OHLCV | Real from member's source; no invented quotes |
| Trade ticks | Trade/flow viewer | Paid feed, timestamping, trade classification, attribution |
| L1 quotes | Bid/ask analytics | Paid quote feed; respect exchange redistribution |
| L2 10-depth order book | Liquidity/depth analytics | Paid market data and compute; not secretly scraped |
| Continuous futures contracts | Rolls and adjustments curriculum | Requires contract metadata and volume/open-interest rolls |
| AI market-data questions | Guided interpretation and evidence-linked source panels | Factual research must cite timestamped data |
| Python notebooks and sandboxes | Strategy research workspace; eventual isolated job service | Current client runs fixed audited algorithms; no untrusted code execution |
| Backtests | CSV SMA and buy-hold cost-aware backtests | Implemented in browser; explicit data limitations |
| Strategy experiments | Persistent research runs with parameters/metrics | Supabase RLS, no shared unverified returns |
| Strategy validation / Verdict | Research integrity report and rubric | Implement clear gates and confidence checks, no proprietary scoring |
| Walk-forward / out-of-sample | Time-ordered train/test split and OOS metrics | Implemented; no forward-looking parameter adjustment |
| Regime analysis | Volatility regime education and regime segmentation | Implement simple realized-volatility segments; advanced macro overlays need sources |
| Monte Carlo | Seeded return-block bootstrap with declared assumptions | Implement exploratory paths and percentiles, never certainty |
| Prop-firm simulator | Prop rule evaluation curriculum + documented eventual simulator | Needs actual rule sets, drawdown rules, fills, funded-account terms |
| Trading language tooling (Pine, NinjaScript, EasyLanguage, PowerLanguage) | Independent language adapters | Compiler/run integration and licensing; do not copy templates |
| Custom slash workflows | Structured research protocol + reusable checklists | Implement guided tasks; command runner later |
| Project files | Workspace metadata, notes, reports and datasets | Current raw CSV remains on local device; secure object storage later |
| Usage/API controls | Admin usage and licensed-provider integration module | Requires provider accounting, quotas, access policy |
| REST/SDK/MCP | Public documented COMMON developer API and tool integrations | Needs managed API, auth scopes, data license |
| Cloud compute | Isolated reproducible job queues | Requires paid infrastructure, metering, artifacts |
| Agent memory/instructions | Member-controlled research methodology preferences | Must be opt-in, editable, deletable |
| Social publishing | Share research with groups and the wider community | Existing COMMON social network; publish audited summaries only, with provenance and disclosures |

QuantPad's published pricing references approximately $169.99/month at launch and $299.99/month standard for their package; this demonstrates why COMMON cannot truthfully promise free institutional market-data parity without exchange licensing and compute budget. Historical coverage differs by asset class and schema.

## Original product navigation and teaching design
1. **Overview:** methodology map, workspace status, checkpoint progress, recent research.
2. **Projects:** create, choose instrument/topic, state falsifiable hypothesis, save notes and purpose.
3. **Data desk:** import **your own** OHLCV CSV, validate dates/closing prices, diagnose missing or duplicate rows; preview chart and provenance.
4. **Strategy lab:** cost-aware SMA crossover / buy-and-hold; set lookbacks, slippage and fees, with visible assumptions.
5. **Validation:** time-ordered holdout (no random train/test shuffle), OOS equity curve, Sharpe, drawdown, volatility, turnover, stability checks; never mislabel training as OOS.
6. **Risk:** sensitivity and seeded block-bootstrap Monte Carlo; report distribution conditional on dataset and model assumptions. No outcome promises.
7. **Data & instruments:** real coverage status for options, futures, order flow, quotes, depth, SEC filings and FRED. No bogus quotes.
8. **Instructor:** contextual "what / why / how / common failure / next action" for each screen. Methods have accessible definitions and limitations.

### Teaching principles
- Explain each technical term in beginner language and graduate-level detail.
- Always distinguish observed data from assumptions and hypothetical scenarios.
- Show the math for log returns, Sharpe, volatility and max drawdown. Risk-free rate should be explicit, not silently set.
- Do not backtest using information that would not have been available when the signal fired. Use previous-day position to determine today's return.
- Include commission, slippage and trade frequency; costs can eliminate apparently attractive strategies.
- Compare models against a sensible benchmark and persist provenance: file fingerprint, parameters, date range, OOS fraction, calculation version.
- No personalized investment recommendations or execution; research is not a brokerage account.

## Regulatory and security gates
- Scope all research to the authenticated creator using Postgres RLS, never public by default.
- Do not save member-uploaded raw price files on the server before licensing/privacy review. Save metadata and computed diagnostics with provenance.
- User-produced performance results are not independently audited, and should never show as public "verified returns".
- Do not allow unaudited user-supplied Python/JS to execute on shared hosts.
- Meme-coin promotion and deceptive financial solicitation remain prohibited by the existing anti-fraud policy. A financial *stock* researched socially is not automatically a cryptocurrency.
- Before sharing strategies in communities, add disclosure workflow: instrument, time period, market-data source, known lookahead/survivorship issues, fees, funding, conflicts and limitations.

## Verified build status — November 12, 2026

**Now implemented in COMMON:**
- The /lab/ path is an original responsive Research Studio, linked from COMMON's signed-in Research navigation.
- Real per-user Supabase workspaces, hypotheses, private notes, immutable saved experiments and learning progress; research tables have RLS.
- Locally imported historical CSV with date and price validation, duplicate rejection, gap warnings and SHA-256 source fingerprints. Raw uploaded data stays in the member's browser.
- Two independent research strategies: long-only SMA crossover and buy-and-hold, with lagged signals, trading-cost assumptions and chronological holdout comparisons.
- Client-side analytics: returns, risk-free-adjusted Sharpe, annual volatility, maximum drawdown, benchmark comparisons and seeded block-bootstrap scenarios.
- Interactive teaching panels and eight persisted learning lessons, including beginner and advanced explanations.
- Node quantitative regression tests passed. GitHub Actions desktop/mobile browser tests completed the project-create → CSV import → backtest → risk scenario → save → instructor workflow, with a test-only mocked account.
- PostgreSQL research migration applied to the connected Supabase project; cross-user RLS tests passed in CI and hosted Supabase in an explicit rollback transaction.

**Not implemented or not verified for production:**
- Live customer OAuth/SMTP signup; there is no verified real customer onboarding yet.
- Licensed options, futures, tick/L1/L2 and streaming market data and market-data contracts.
- Nested walk-forward optimizers, full derivatives risk, prop-firm simulation and hosted arbitrary-code runners.
- An actual LLM-backed assistant; the current instructor is deterministic context-based education, not an autonomous AI PhD agent.
- Brokerage integrations, trade execution, verified performance and personalized investment advice.

**Revenue readiness:** Do not market the client-computed experiments as audited or predictive returns. Before charging retail members, verify real signup, payment, privacy, data licensing and actual users, not just mocked browser tests.
