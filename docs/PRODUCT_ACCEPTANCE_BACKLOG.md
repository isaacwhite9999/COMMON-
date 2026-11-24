# COMMON — canonical product inventory and acceptance backlog

Baseline: development branch `common/unified-workspace` at d5b4e100a600f0b9565cd0d46cad4bf3d8d15768. This is a conservative engineering inventory, not a declaration of completion or live availability. P includes working code and partially implemented workflows; even P items require regression, integration and permission checks. M includes unimplemented or unverified depth. G requires external approval and is not unlocked by code alone. Inspect source and tests before updating statuses. This inventory expands the workstreams in CODEX_BUILD_PLAN.md; the larger product vision remains in PRODUCT_SPEC.md and OWNERSHIP_CHARTER.md.

## Existing implementation map

| Area | Source of truth |
|---|---|
| Browser-local workspace | `docs/workspace/` (model, app, files, reports, quant worker, datasets, risk, notebook, Python runtime, editor) |
| Member network | `docs/live-community.js`, `docs/live/`, `docs/agent-desk.js`, `docs/capital-model.js`, `docs/capital-ledger.js` |
| Existing research/market tools | `docs/lab/`, `docs/terminal/`, `backend/` |
| Database and AI | `supabase/migrations/`, `supabase/schema-drafts/`, `supabase/functions/common-research-agent/` |
| Verification | `tests/`, `.github/workflows/` |

## Status and known blockers

- Workstream 01 foundation evidence and remaining coverage are tracked in [Foundation contracts](FOUNDATION_CONTRACTS.md). Existing product-level acceptance remains subject to review.

- Latest known frontend/API and disposable database checks passed at d5b4e10. Full workspace checks were still running for that head at inventory creation. Prior workspace runs failed. Inspect fresh job logs, particularly editor browser and Python runtime smoke tests, before claiming readiness.
- AI provider and external journal flags remain disabled unless independently configured and verified; no paid activation authorized.
- No actual pooled money, deposit, withdrawal, securities execution or legally binding vote is active. No production merge or deployment is authorized by this inventory.
- $0 incremental development budget: use existing services, free limits and licensed open-source dependencies; external requirements are explicit gates, not fake implementations.

## Detailed acceptance requirements

### Q01 — AI agents (workstream 02)

- [ ] Q01.01 **Partial / implemented in branch** — Authenticated, opt-in research assistant; six modes (review/explain/plan/code/fundamentals/risk), bounded server quota and provider gate
- [ ] Q01.02 **Partial / implemented in branch** — Local custom slash-command templates, explicitly selected research notes and saved analysis history
- [ ] Q01.03 **Remaining** — Goal-based persistent project-scoped agent sessions, conversation history and context compaction
- [ ] Q01.04 **Remaining** — Plan/tool/execute/observe/validate state machine with bounded retries, debugging and code corrections
- [ ] Q01.05 **Remaining** — Fundamental, technical, quant, portfolio, macro, SEC, risk, modeling, data retrieval and verification agents
- [ ] Q01.06 **Remaining** — Multi-agent orchestration, streaming responses, tool traces, model selection and cost tracking
- [ ] Q01.07 **Remaining** — Long-running jobs, pause/resume/cancel, per-project permissions, approval gates and evidence citations

### Q02 — Research IDE (workstream 03)

- [ ] Q02.01 **Partial / implemented in branch** — Browser-local research project CRUD, notes and export; existing authenticated research studio is separate
- [ ] Q02.02 **Partial / implemented in branch** — Text file explorer, relative paths, revision history and restore; basic source editor with line numbers, find, go-to-line and indentation; verify editor browser regression
- [ ] Q02.03 **Remaining** — Professional syntax highlighting, language services, autocomplete, linting and diagnostics
- [ ] Q02.04 **Remaining** — AI inline edits, diff review, tabs, nested folders, cross-file search, terminal, resizable panels and keyboard shortcuts
- [ ] Q02.05 **Remaining** — Project templates, duplication, complete import/export, Git integration, sharing, persistent storage and collaborative editing

### Q03 — Compute and notebooks (workstream 03)

- [ ] Q03.01 **Partial / implemented in branch** — Fixed-function notebook cells: notes, data profile, return distribution, drawdown, SMA backtest, ordered cells, provenance, export and persistence
- [ ] Q03.02 **Partial / implemented in branch** — Experimental browser Python: pinned Pyodide, opt-in source, worker/opaque iframe, package selection (numpy/pandas/scipy/statsmodels), output cap, cancel and history; actual isolation/runtime tests need to pass
- [ ] Q03.03 **Remaining** — Executable Python notebook cells, persistent kernels, project data access, artifact storage and package management
- [ ] Q03.04 **Remaining** — Scikit-learn/PyTorch where appropriate, pinned environment manifests, secret handling and resource monitoring
- [ ] Q03.05 **Remaining** — Separate isolated cloud compute, CPU/memory/time limits, network deny by default, queued jobs, parallelism, suspension and recovery

### Q04 — Market data and APIs (workstream 04)

Q04.01 browser metadata, source isolation, and upgrade evidence are recorded in [Browser dataset catalog](DATASET_STORAGE.md).

- [ ] Q04.01 **Partial / implemented in branch** — Historical CSV import, IndexedDB dataset library, provenance hashes, quality checks and reusable inputs; user-uploaded daily close data
- [ ] Q04.02 **Partial / implemented in branch** — Existing SEC EDGAR/fundamentals and official economic-data integrations; audit availability and source correctness
- [ ] Q04.03 **Remaining** — Equity, ETF, international, futures, options, FX, fixed income, trade/quote and depth provider adapters; entitlements
- [ ] Q04.04 **Remaining** — Security master, symbol resolution, corporate actions, adjusted OHLCV, dividends, calendar/time zone, continuous futures, point-in-time data and caching
- [ ] Q04.05 **Remaining** — Versioned REST, Python SDK, MCP, scoped API keys, rotation/revocation, rate limits, usage analytics, bulk exports, webhooks, developer docs and examples (coordinate 10)

### Q05 — Backtests and scientific validation (workstream 05)

- [ ] Q05.01 **Partial / implemented in branch** — Chronological SMA/buy-hold backtest, fee modeling, benchmark, holdout reports, trade logs and comparison
- [ ] Q05.02 **Partial / implemented in branch** — Seeded block bootstrap, bounded walk-forward parameter sweep, OOS folds, training-only selection, regime diagnostics and source hashes
- [ ] Q05.03 **Remaining** — Custom Python strategies, Pine-compatible tooling only where permitted, event-driven multi-asset/intraday/options/futures backtests
- [ ] Q05.04 **Remaining** — Execution assumptions, slippage, market impact, liquidity, stops/targets, sizing, leverage, margin and attribution
- [ ] Q05.05 **Remaining** — Regime-conditioned simulations, sensitivity and stability, cross-validation, overfit and multiple-testing corrections, significance, survivorship and lookahead audits, independent reproduction
- [ ] Q05.06 **Remaining** — Prop-firm scenario rules and pass probabilities, order flow, volume profile, footprint, bid/ask imbalance, CVD, heatmaps and session analysis on eligible data

### Q06 — Portfolio and fundamental intelligence (workstream 04/05)

- [ ] Q06.01 **Partial / implemented in branch** — Multi-asset covariance/correlation, historical VaR/ES, risk contributions, historical drawdown and simulated rebalancing; local risk reports
- [ ] Q06.02 **Partial / implemented in branch** — Existing terminal financial calculators, DCF and options payoff/Greeks; audit existing coverage
- [ ] Q06.03 **Remaining** — Optimization (efficient frontier, risk parity), factor models, constrained allocation, rebalancing, benchmark attribution, stress scenarios, liquidity and concentration
- [ ] Q06.04 **Remaining** — Options IV surfaces, term structures, exposure and strategy research
- [ ] Q06.05 **Remaining** — Corporate ownership mapping, 13F comparisons, beneficial owners, insiders, shareholder concentration, boards, proxies, governance and corporate-action intelligence
- [ ] Q06.06 **Remaining** — Statement analysis, comparable valuation, acquisition/PE modeling, capital structures, venture cap tables/runway/dilution and investment memos

### S01 — Identity, connections and discovery (workstream 06)

- [ ] S01.01 **Partial / implemented in branch** — Supabase authentication/profile, registration/recovery, display names/biographies, DM preference, member profiles, shared-group member directory and block/unblock
- [ ] S01.02 **Partial / implemented in branch** — Public signup SMTP and Google provider setup not established; verify existing auth and permissions
- [ ] S01.03 **Remaining** — Profile avatar/cover, experience, interests, philosophy, published research, optional verified credentials
- [ ] S01.04 **Remaining** — Follow/unfollow, friend requests/accept/decline, mutuals, suggestions, followers/following, privacy, mute, custom lists and safe contact discovery
- [ ] S01.05 **Remaining** — Global member/research search, pagination, discovery/recommendations, MFA, devices/session management, privacy/export/deletion and recovery controls

### S02 — Social publishing and education (workstream 07)

- [ ] S02.01 **Partial / implemented in branch** — Member/community research feed, public discovery, likes, replies, local bookmarks, shared research projects
- [ ] S02.02 **Remaining** — Following feed, filters and ranking controls, real persistent bookmarks, mentions, hashtags/tickers, reposts/quotes, nested replies and editing/revisions
- [ ] S02.03 **Remaining** — Validated media/document attachments, research articles, interactive charts, model/run artifacts, drafts, scheduled publishing, visibility, citations and disclosures
- [ ] S02.04 **Remaining** — Collaborative workspaces, shared files/notebooks, contributor permissions, assignments, peer review, evidence versioning, publication approval and reusable strategies
- [ ] S02.05 **Partial / implemented in branch** — Existing financial education and lessons; audit learning progress
- [ ] S02.06 **Remaining** — Interactive risk education, beginner onboarding, mentorship and accessible explanations

### S03 — Circles and messaging (workstream 08)

- [ ] S03.01 **Partial / implemented in branch** — Public/private circles, membership/invites, research library, mandate/trust, member directory, group chat and mutual-member opt-in DMs; current polling rather than real-time
- [ ] S03.02 **Remaining** — Requests, custom roles and granular permissions, committees, subgroups, private/discussion/research/announcement channels, pinned resources
- [ ] S03.03 **Remaining** — Member removal/suspension, ownership transfer, archive/restore, audit trail and circle branding
- [ ] S03.04 **Remaining** — Real-time delivery, group DMs, unread counters, read receipts, replies, reactions, presence/typing, search, edit/delete, archives, attachments and notification settings
- [ ] S03.05 **Remaining** — In-app/email/push notifications, secure mobile messaging, optional voice/video via appropriately reviewed integrations

### S04 — Governance and financial operations (workstream 09)

- [ ] S04.01 **Partial / implemented in branch** — Nonbinding polls, voting and result details; not corporate proxy or legally binding investment authority
- [ ] S04.02 **Partial / implemented in branch** — Circle capital scenario planner with acquisition budget/reserves/costs/stress/quorum illustration; educational only
- [ ] S04.03 **Partial / implemented in branch** — External recordkeeping schema draft and UI: balanced USD entries, exact reversals, private-circle authorization, audit/export; feature disabled, not verified balances
- [ ] S04.04 **Remaining** — Legal entity onboarding, separate eligible members and ownership rights, versioned mandates/charters, investment committees, due diligence, memos and amendments
- [ ] S04.05 **Remaining** — Eligibility snapshots, quorum, approval thresholds, conflicts, abstentions, independent sign-off, revocation, meeting minutes, decision audit and execution tracking
- [ ] S04.06 **Remaining** — Member capital accounts, provider-neutral deposit/withdrawal/recurring contribution intents, pooled treasury, immutable double-entry ledger, verified idempotent webhooks and reconciliations
- [ ] S04.07 **Remaining** — Authorized brokerage orders, position and settlement tracking, NAV, distributions, redemptions/exits, fees, statements, tax records and disputes
- [ ] S04.08 **External activation gate** — Live money movement, custody, investment offers and securities execution: requires approved legal structure, authorized financial partners and operational controls; no live activation before gates

### S05 — Trust and safety (workstream 10)

- [ ] S05.01 **Partial / implemented in branch** — Reporting/moderation, fraud quarantine rules, appeal/account restrictions, user block and private membership enforcement; existing RLS tests
- [ ] S05.02 **Remaining** — Scam, impersonation, spam/bot, misinformation, undisclosed promotion, manipulation and abuse defenses with review and appeal
- [ ] S05.03 **Remaining** — Evidence credibility and conflict disclosures, transparent reputation methodology, moderator queue, incident operations and member consent
- [ ] S05.04 **Remaining** — Financial security alerts and suspicious-transaction controls for eligible activated integrations

### X01 — Unified product and release infrastructure (workstream 01/10)

API operations evidence for X01.05 and X01.06 is recorded in [isolated API staging and performance results](API_OPERATIONS.md). Production member identity and full-workload capacity remain open.

- [ ] X01.01 **Partial / implemented in branch** — Separate static research, terminal, studio and community entrypoints; FastAPI prototype and Supabase auth/community backend; draft PR, not unified deployment
- [ ] X01.02 **Remaining** — Unified session, navigation, shared component system and responsive institutional UX; accessible dense data and beginner progressive disclosure
- [ ] X01.03 **Remaining** — Deep nested settings: account/security/privacy, appearance/density, AI/model/memory/commands, data/entitlements, compute, portfolio, circles/governance, integrations/API, notifications, billing/usage
- [ ] X01.04 **Remaining** — Mobile iOS/Android strategy, offline/recovery where appropriate, notification permissions
- [ ] X01.05 **Remaining** — Typed service boundaries, queues, persistence, storage, pagination, cache, migration strategy, monitoring, backups, disaster recovery, secrets, audit, environment separation and cost limits
- [ ] X01.06 **Remaining** — Unit/integration/browser/mobile/security/financial verification, accessibility, load and visual tests; staging smoke and deployment/rollback gates
- [ ] X01.07 **Remaining** — End-to-end flow: individual research -> evidence artifact -> permitted sharing -> circle discussion -> decision -> legally authorized financial workflow -> accounting/audit; preserve individual choice

## Definition of done for each ID

Record the PR, exact files/routes, persistence and authorization, empty/loading/error/recovery states, desktop/mobile accessibility, unit/integration/security and numerical tests with actual results, limitations, and dependency/activation status. Check off only after review of working evidence. Never silently remove a requirement or replace it with placeholders; split into smaller acceptance IDs if useful. Preserve previous functionality. See AGENTS.md for engineering standards.

### Durable queue evidence

X01.05, X01.06, Q01.07 and Q03.05 have tested infrastructure coverage for durable job scheduling, scoped database roles, admission caps, concurrency and crash recovery. See [Durable PostgreSQL jobs](DURABLE_JOB_QUEUE.md) for interfaces, query-plan evidence and remaining handler, isolation and rollout gates.
