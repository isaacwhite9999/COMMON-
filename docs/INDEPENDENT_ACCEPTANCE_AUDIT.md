# Independent acceptance audit

Original audit baseline `aa0f89a` (design branch including integration), plus the messaging and Python control corrections in this audit. This is a source and disposable-test audit. Hosted identity, staging integrations, actual provider credentials, assistive technology, and live money were outside the verification environment.

**Candidate granular totals** 69 verified, 3 unverified, 168 partial, 189 missing, 0 broken, 21 external gate.

Verified = fully implemented and verified within the stated feature scope. Unverified = implemented but unverified. Partial = partially implemented. Missing = no matching working path found in the inspected domain. Broken = an existing path demonstrably fails. External gate = blocked by an external dependency or regulatory requirement. A prerequisite or numerical engine alone does not establish feature acceptance.

## Implementation candidate

The integration branch `codex/common-implementation-next` starts at `4208e37`. Git ancestry confirmed that this commit contains the tips of PRs #1–10 as listed when work began. The candidate adds focused feature commits without replaying that history. The granular tables below retain the original audit's classifications outside the work validated here. Product-level acceptance still includes multi-department and hosted gates.

**Verification boundary.** Chromium exercised local workspace persistence and actual Pyodide. Member-facing browser tests used controlled service fixtures. PostgreSQL permissions and invariants were tested independently on disposable databases. No hosted migration, live provider call, actual financial operation or production deployment was performed.

## Evidence sources

- **A** [agent-desk.js](agent-desk.js), [handler.ts](../supabase/functions/common-research-agent/handler.ts), [agent-desk.test.cjs](../tests/agent-desk.test.cjs), [handler_test.ts](../supabase/functions/common-research-agent/handler_test.ts)
- **I** [app.js](workspace/app.js), [files.js](workspace/files.js), [editor.js](workspace/editor.js), [lab.js](lab/lab.js), [workspace-browser.test.mjs](../tests/workspace-browser.test.mjs)
- **C** [python-runtime.js](workspace/python-runtime.js), [notebook.js](workspace/notebook.js), [app.js](workspace/app.js), [workspace-python-browser.test.mjs](../tests/workspace-python-browser.test.mjs)
- **J** [20261124064924_durable_job_queue.sql](../supabase/migrations/20261124064924_durable_job_queue.sql), [pg_jobs_integration.py](../tests/pg_jobs_integration.py)
- **D** [datasets.js](workspace/datasets.js), [research-engine.js](lab/research-engine.js), [edgar.py](../backend/edgar.py), [terminal.js](terminal/terminal.js), [workspace-dataset-storage.test.mjs](../tests/workspace-dataset-storage.test.mjs)
- **Q** [research-engine.js](lab/research-engine.js), [quant.js](workspace/quant.js), [report.js](workspace/report.js), [research-engine.test.cjs](../tests/research-engine.test.cjs), [workspace-quant.test.cjs](../tests/workspace-quant.test.cjs)
- **R** [risk.js](workspace/risk.js), [analytics.js](terminal/analytics.js), [workspace-risk.test.cjs](../tests/workspace-risk.test.cjs), [finance-terminal.test.cjs](../tests/finance-terminal.test.cjs)
- **T** [terminal.js](terminal/terminal.js), [analytics.js](terminal/analytics.js), [edgar.py](../backend/edgar.py), [terminal-browser.test.mjs](../tests/terminal-browser.test.mjs)
- **API** [app.py](../backend/app.py), [operations.py](../backend/operations.py), [test_api.py](../tests/test_api.py), [test_api_postgres.py](../tests/test_api_postgres.py)
- **S** [live-community.js](live-community.js), [session.js](shared/session.js), [20261111000100_community_core.sql](../supabase/migrations/20261111000100_community_core.sql), [pg_rls_smoke.sql](../tests/pg_rls_smoke.sql)
- **F** [live-community.js](live-community.js), [20261124064757_bounded_discussion_feed.sql](../supabase/migrations/20261124064757_bounded_discussion_feed.sql), [pg_discussion_feed_smoke.sql](../tests/pg_discussion_feed_smoke.sql), [discussion-feed-browser.test.mjs](../tests/discussion-feed-browser.test.mjs)
- **MSG** [live-community.js](live-community.js), [20261111000400_security_invariants.sql](../supabase/migrations/20261111000400_security_invariants.sql), [pg_moderation_smoke.sql](../tests/pg_moderation_smoke.sql), [research-journey.test.mjs](../tests/research-journey.test.mjs)
- **H** [research-draft.js](shared/research-draft.js), [live-community.js](live-community.js), [20261124070559_research_circle_handoff.sql](../supabase/migrations/20261124070559_research_circle_handoff.sql), [pg_research_handoff_smoke.sql](../tests/pg_research_handoff_smoke.sql), [research-journey.test.mjs](../tests/research-journey.test.mjs)
- **G** [live-community.js](live-community.js), [capital-model.js](capital-model.js), [20261111000100_community_core.sql](../supabase/migrations/20261111000100_community_core.sql), [pg_research_handoff_smoke.sql](../tests/pg_research_handoff_smoke.sql), [research-journey.test.mjs](../tests/research-journey.test.mjs)
- **FIN** [config.js](config.js), [capital-ledger.js](capital-ledger.js), [external-journal.sql](../supabase/schema-drafts/external-journal.sql), [SECURITY_AND_REGULATORY_GATES.md](SECURITY_AND_REGULATORY_GATES.md), [pg_external_journal_smoke.sql](../tests/pg_external_journal_smoke.sql)
- **MOD** [live-community.js](live-community.js), [20261111000600_meme_coin_fraud_review.sql](../supabase/migrations/20261111000600_meme_coin_fraud_review.sql), [20261111000700_fraud_appeals_account_enforcement.sql](../supabase/migrations/20261111000700_fraud_appeals_account_enforcement.sql), [pg_moderation_smoke.sql](../tests/pg_moderation_smoke.sql), [pg_enforcement_smoke.sql](../tests/pg_enforcement_smoke.sql)
- **LEARN** [lab.js](lab/lab.js), [live-community.js](live-community.js), [lab-browser.test.mjs](../tests/lab-browser.test.mjs), [pg_research_smoke.sql](../tests/pg_research_smoke.sql)
- **UX** [shell.js](shared/shell.js), [departments.css](shared/departments.css), [report-controls.js](workspace/report-controls.js), [responsive-design.test.mjs](../tests/responsive-design.test.mjs), [PAGE_AND_UX_SPEC.md](PAGE_AND_UX_SPEC.md)
- **OPS** [database.py](../backend/database.py), [operations.py](../backend/operations.py), [workflows](../.github/workflows), [load_api.py](../scripts/load_api.py), [test_api_postgres.py](../tests/test_api_postgres.py)

- **I1** [Workspace project library](workspace/app.js), [portable source bundle](workspace/project-bundle.js), [bundle tests](../tests/project-bundle.test.cjs), [Chromium project lifecycle](../tests/project-portability.test.mjs)
- **C1** [Notebook model](workspace/notebook.js), [real Pyodide Chromium suite](../tests/workspace-python-browser.test.mjs)
- **F1** [Discussion publisher](live-community.js), [draft Chromium suite](../tests/publishing-draft-browser.test.mjs)
- **L1** [Scored exercise catalog](lab/exercises.js), [Studio Chromium suite](../tests/lab-browser.test.mjs), [exercise persistence and authorization](../tests/pg_research_smoke.sql)
- **OPS1** [Launch readiness](LAUNCH_READINESS.md), [artifact validation](../tests/test_release_candidate.py), [disposable recovery drill](../tests/recovery-drill.py)

## Individual requirements

### Quant

| ID | Requirement | Classification | Evidence | Assessment |
| --- | --- | --- | --- | --- |
| QUANT-001 | Goal-based research agent | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-002 | Persistent project-scoped sessions | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-003 | Write strategy code | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-004 | Run approved code | Partial | C | Local execution, inspection, consent, cancel or queue primitives exist; assistant has no corresponding execution integration. |
| QUANT-005 | Inspect execution outputs | Partial | C | Local execution, inspection, consent, cancel or queue primitives exist; assistant has no corresponding execution integration. |
| QUANT-006 | Debug and propose corrections | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-007 | Multi-agent orchestration | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-008 | Fundamental research specialist | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-009 | Technical research specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-010 | Quantitative research specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-011 | Portfolio specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-012 | Macro specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-013 | SEC filings specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-014 | Risk specialist | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-015 | Financial modeling specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-016 | Data retrieval specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-017 | Independent verification specialist | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-018 | Structured tool definitions | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-019 | Per-tool permission controls | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-020 | Explicit execution approvals | Partial | C | Local execution, inspection, consent, cancel or queue primitives exist; assistant has no corresponding execution integration. |
| QUANT-021 | Streaming responses | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-022 | Tool execution traces | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-023 | Durable long-running sessions | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-024 | Pause and resume | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-025 | Cancel active job | Partial | C | Local execution, inspection, consent, cancel or queue primitives exist; assistant has no corresponding execution integration. |
| QUANT-026 | Custom commands | Verified | A | Create and apply local command templates; validation and context unit suite passed. |
| QUANT-027 | Project memory | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-028 | Account memory with consent | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-029 | Conversation history | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-030 | Context compaction | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-031 | Model selection | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-032 | Token and cost usage accounting | Missing | A | One-shot assist and local desk; no matching agent/session/tool pipeline |
| QUANT-033 | Citations and uncertainty | Partial | A | Prompt-based drafting/review or local notes/history exist; scoped orchestration and verification are absent. |
| QUANT-034 | Bounded retries and failure recovery | Partial | C | Local execution, inspection, consent, cancel or queue primitives exist; assistant has no corresponding execution integration. |
| QUANT-035 | Project creation | Verified | I | Local project/file operations and revisions implemented; model/editor and workspace browser passed. |
| QUANT-036 | Project list and search | Verified | I1 | Workspace library filters by name and notes and distinguishes active and archived projects. |
| QUANT-037 | Rename archive restore delete projects | Verified | I1 | Workspace rename and delete, plus non-destructive archive and restore across reload, passed Chromium. |
| QUANT-038 | File creation and editing | Verified | I | Local project/file operations and revisions implemented; model/editor and workspace browser passed. |
| QUANT-039 | Nested folders | Partial | I | Existing local route/list, path-based file view, output, width or shortcuts cover only part of the named requirement. |
| QUANT-040 | File move rename delete | Verified | I | Local project/file operations and revisions implemented; model/editor and workspace browser passed. |
| QUANT-041 | Syntax highlighting | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-042 | Language-aware autocomplete | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-043 | Linting and diagnostics | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-044 | AI inline edits | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-045 | Diff review and acceptance | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-046 | Editor tabs and tab persistence | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-047 | Resizable panels | Partial | I | Existing local route/list, path-based file view, output, width or shortcuts cover only part of the named requirement. |
| QUANT-048 | Terminal and output console | Partial | I | Existing local route/list, path-based file view, output, width or shortcuts cover only part of the named requirement. |
| QUANT-049 | Cross-file search and replace | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-050 | File revision history and restore | Verified | I | Local project/file operations and revisions implemented; model/editor and workspace browser passed. |
| QUANT-051 | Git integration | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-052 | Collaborative editing | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-053 | Project templates | Verified | I1 | Blank, strategy evaluation and portfolio risk templates initialize a local research project. |
| QUANT-054 | Project duplication | Verified | I1 | An independent local project copy preserves research data with its own project ID. |
| QUANT-055 | Project import | Partial | I1 | Project source bundle imports notes and bounded file revision history. Full project reports, data, notebooks and account-project imports remain open. |
| QUANT-056 | Project export | Verified | I1 | Chromium downloads the full local project JSON and the versioned portable sources bundle. |
| QUANT-057 | Project sharing and permission management | Partial | H | Share reviewed evidence to a circle; project permissions and collaboration absent. |
| QUANT-058 | Keyboard shortcuts | Partial | I | Existing local route/list, path-based file view, output, width or shortcuts cover only part of the named requirement. |
| QUANT-059 | Autosave and unsaved changes protection | Missing | I | Local text workspace and separate private Studio; no matching IDE/project workflow |
| QUANT-060 | Browser Python runtime | Verified | C | Pinned Python runtime in a fresh worker iframe; actual Chromium run/cancel/probe passed. |
| QUANT-061 | Executable Python notebook cells | Verified | C1 | Reviewed Python notebook cells execute in the browser sandbox. Output persists across reload, and edits, failures, cancellation and export are covered. |
| QUANT-062 | Markdown notebook cells | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-063 | Kernel lifecycle and restart | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-064 | Scientific package management | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-065 | NumPy SciPy pandas environments | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-066 | Statistical and ML packages where supported | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-067 | Isolated remote execution adapter | Missing | C | Browser sandbox and internal queue; no matching notebook/remote worker workflow |
| QUANT-068 | Project runtime environments | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-069 | Environment and dependency manifests | Missing | C | Browser sandbox and internal queue; no matching notebook/remote worker workflow |
| QUANT-070 | Secrets scoped to approved providers | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-071 | CPU memory and time quotas | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-072 | Per-user concurrent job limits | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-073 | Durable queue | Verified | J | Internal SQL lease queue with retries and fencing; dedicated disposable PostgreSQL suite passed. |
| QUANT-074 | Parallel compute execution | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-075 | Job progress and logs | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-076 | Artifacts and result storage | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-077 | Cancel and suspend | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-078 | Resume and failure recovery | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-079 | Network deny by default | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-080 | Resource monitoring and usage accounting | Partial | C | Fixed notebook or bounded browser/SQL primitive exists; full project/runtime orchestration and isolation are absent. |
| QUANT-081 | Historical CSV ingestion | Verified | D | Chronological CSV validation, hashes and IndexedDB catalog; unit and browser migration/reuse tests passed. |
| QUANT-082 | Dataset catalog and reuse | Verified | D | Chronological CSV validation, hashes and IndexedDB catalog; unit and browser migration/reuse tests passed. |
| QUANT-083 | Dataset provenance and source hashes | Verified | D | Chronological CSV validation, hashes and IndexedDB catalog; unit and browser migration/reuse tests passed. |
| QUANT-084 | Data quality checks | Verified | D | Chronological CSV validation, hashes and IndexedDB catalog; unit and browser migration/reuse tests passed. |
| QUANT-085 | Equity historical data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-086 | ETF data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-087 | International security coverage | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-088 | Futures data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-089 | Options data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-090 | Fixed income data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-091 | FX data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-092 | Economic series and FRED-compatible sources | Partial | D | Limited Treasury, CSV normalization, declared adjusted close, symbol registry or process cache; broader contract absent. |
| QUANT-093 | Official SEC filing data | External gate | D | EDGAR adapter requires identified SEC contact and network/provider verification; tests cover disabled mode and fact selection. |
| QUANT-094 | OHLCV normalization | Partial | D | Limited Treasury, CSV normalization, declared adjusted close, symbol registry or process cache; broader contract absent. |
| QUANT-095 | Trade and quote data adapter | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-096 | Level 1 market data | External gate | D | Live depth and quote products require licensed feeds; provider and normalization work also remains. |
| QUANT-097 | Level 2 market data | External gate | D | Live depth and quote products require licensed feeds; provider and normalization work also remains. |
| QUANT-098 | Order book snapshots | External gate | D | Live depth and quote products require licensed feeds; provider and normalization work also remains. |
| QUANT-099 | Corporate actions | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-100 | Adjusted prices and dividends | Partial | D | Limited Treasury, CSV normalization, declared adjusted close, symbol registry or process cache; broader contract absent. |
| QUANT-101 | Symbol and instrument resolution | Partial | D | Limited Treasury, CSV normalization, declared adjusted close, symbol registry or process cache; broader contract absent. |
| QUANT-102 | Exchange calendars and sessions | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-103 | Continuous futures and roll methodology | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-104 | Point-in-time data and revisions | Partial | D | Limited Treasury, CSV normalization, declared adjusted close, symbol registry or process cache; broader contract absent. |
| QUANT-105 | Data licensing entitlements | Missing | D | CSV and limited public-source adapters; no matching feed, reference-data or entitlement path |
| QUANT-106 | Caching and deduplicated ingestion | Partial | D | Limited Treasury, CSV normalization, declared adjusted close, symbol registry or process cache; broader contract absent. |
| QUANT-107 | SMA strategies | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-108 | Buy and hold benchmark | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-109 | Custom Python strategies | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-110 | Trading-language support where permitted | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-111 | Event-driven backtest engine | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-112 | Multi-asset backtests | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-113 | Intraday backtests | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-114 | Options backtests | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-115 | Futures backtests | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-116 | Transaction commissions | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-117 | Slippage | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-118 | Market impact assumptions | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-119 | Liquidity and volume constraints | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-120 | Stop-loss and target rules | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-121 | Position sizing | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-122 | Leverage and margin accounting | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-123 | Signal versus execution timing | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-124 | Trade logs | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-125 | Performance attribution | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-126 | Benchmark comparison | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-127 | Run comparisons and reproducibility | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-128 | Chronological train/test split | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-129 | Walk-forward optimization | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-130 | Parameter grid sweeps | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-131 | Monte Carlo and bootstrap | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-132 | Market regime classification | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-133 | Regime-conditioned simulations | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-134 | Sensitivity analysis | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-135 | Parameter stability | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-136 | Time-series cross-validation | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-137 | Overfitting diagnostics | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-138 | Multiple-testing correction | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-139 | Lookahead tests | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-140 | Survivorship-bias limitations and checks | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-141 | Statistical significance and uncertainty | Partial | Q | Python sandbox or daily historical engine supplies a limited baseline; no complete workflow for the named scope. |
| QUANT-142 | Factor diagnostics | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-143 | Strategy grading with transparent methodology | Missing | Q | Chronological daily research engines; no matching simulation or validation method |
| QUANT-144 | Seeded reproducible research | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-145 | Independent numerical fixtures | Verified | Q | Bounded daily research workflows; chronological, perturbation, numerical and browser tests passed. |
| QUANT-146 | Prop-firm rule scenario simulation | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-147 | Pass-probability estimation with assumptions | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-148 | Prop-firm account economics | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-149 | Order-flow analysis | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-150 | Volume profiles | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-151 | Footprint charts | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-152 | Bid/ask imbalance | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-153 | Cumulative volume delta | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-154 | Depth heatmap | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-155 | Execution analysis | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-156 | Trading session analysis | Missing | T | Options and bond calculators only in this family; no matching execution or market-depth workflow |
| QUANT-157 | Options payoff builder | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-158 | Black-Scholes valuation | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-159 | Greeks | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-160 | Implied volatility surfaces | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-161 | Volatility term structure | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-162 | Options exposure and scenario analysis | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-163 | Multi-asset portfolios | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-164 | Correlation matrices | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-165 | Covariance estimation | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-166 | Historical and model-based VaR | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-167 | Expected shortfall | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-168 | Risk contribution and attribution | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-169 | Portfolio optimization | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-170 | Efficient frontier | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-171 | Risk parity | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-172 | Factor exposure | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-173 | Portfolio rebalancing | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-174 | Benchmark attribution | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-175 | Stress testing | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-176 | Scenario analysis | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-177 | Liquidity risk | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-178 | Concentration limits | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-179 | Allocation constraints | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-180 | Transaction-cost-aware optimization | Missing | R | Historical portfolio risk and calculators; no matching optimizer or analytics workflow |
| QUANT-181 | Bond valuation | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-182 | Duration convexity and DV01 | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-183 | Versioned REST APIs | Partial | API | Prototype API, limited auth/abuse guards, exports or examples exist; no supported developer product. |
| QUANT-184 | Python SDK | Missing | API | Prototype REST and operational probes; no matching developer product surface |
| QUANT-185 | MCP interfaces | Missing | API | Prototype REST and operational probes; no matching developer product surface |
| QUANT-186 | Developer documentation | Partial | API | Prototype API, limited auth/abuse guards, exports or examples exist; no supported developer product. |
| QUANT-187 | API key creation | Missing | API | Prototype REST and operational probes; no matching developer product surface |
| QUANT-188 | Scoped API permissions | Partial | API | Prototype API, limited auth/abuse guards, exports or examples exist; no supported developer product. |
| QUANT-189 | Key rotation and revocation | Missing | API | Prototype REST and operational probes; no matching developer product surface |
| QUANT-190 | Rate limits | Partial | API | Prototype API, limited auth/abuse guards, exports or examples exist; no supported developer product. |
| QUANT-191 | API usage analytics | Missing | API | Prototype REST and operational probes; no matching developer product surface |
| QUANT-192 | Bulk exports | Partial | API | Prototype API, limited auth/abuse guards, exports or examples exist; no supported developer product. |
| QUANT-193 | Webhooks with verification | Missing | API | Prototype REST and operational probes; no matching developer product surface |
| QUANT-194 | Tutorials and runnable examples | Partial | API | Prototype API, limited auth/abuse guards, exports or examples exist; no supported developer product. |
| QUANT-195 | Corporate ownership map | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-196 | Institutional holdings | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-197 | 13F changes and reporting lags | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-198 | Insider transaction research | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-199 | Beneficial ownership | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-200 | Ownership concentration | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-201 | Shareholder governance | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-202 | Board and voting rights research | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-203 | Proxy and record-date research | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-204 | Issuer filing viewer | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-205 | Financial statement analysis | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-206 | DCF valuation | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-207 | WACC and terminal value sensitivity | Verified | R | Existing analytical workflow within calculator/risk scope; numerical fixtures and Chromium workflows passed. |
| QUANT-208 | Comparable company valuation | Missing | T | Issuer links and calculators; no matching institutional ownership or diligence product |
| QUANT-209 | Private equity and acquisition modeling | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-210 | Capital structure analysis | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |
| QUANT-211 | Venture cap tables | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-212 | Dilution and runway modeling | Partial | R | Hypothetical model, single analysis or constrained simulation; production breadth and independent validation remain. |
| QUANT-213 | Investment memorandum builder | Partial | T | Primary-source links, limited fact extraction, educational model or local memo exists; institutional depth absent. |

### Social

| ID | Requirement | Classification | Evidence | Assessment |
| --- | --- | --- | --- | --- |
| SOCIAL-001 | Registration | External gate | S | Frontend and SDK paths exist; hosted email/provider configuration and real account verification remain external. |
| SOCIAL-002 | Login and logout | Unverified | S | SDK identity or profile persistence is wired; real hosted account lifecycle or profile CRUD not independently run. |
| SOCIAL-003 | Email verification | External gate | S | Frontend and SDK paths exist; hosted email/provider configuration and real account verification remain external. |
| SOCIAL-004 | Google sign-in integration | External gate | S | Frontend and SDK paths exist; hosted email/provider configuration and real account verification remain external. |
| SOCIAL-005 | Account recovery | External gate | S | Frontend and SDK paths exist; hosted email/provider configuration and real account verification remain external. |
| SOCIAL-006 | Profile photos | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-007 | Cover photos | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-008 | Unique usernames | Unverified | S | SDK identity or profile persistence is wired; real hosted account lifecycle or profile CRUD not independently run. |
| SOCIAL-009 | Biography | Unverified | S | SDK identity or profile persistence is wired; real hosted account lifecycle or profile CRUD not independently run. |
| SOCIAL-010 | Experience | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-011 | Interests | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-012 | Investment philosophy | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-013 | Research publications | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-014 | Optional credential verification | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-015 | MFA and passkeys | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-016 | Session and device management | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-017 | Account deletion | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-018 | Personal data export | Missing | S | Basic member account and profile; no matching identity or account controls |
| SOCIAL-019 | Follow and unfollow | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-020 | Friend requests | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-021 | Accept and decline requests | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-022 | Mutual connections | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-023 | Suggested connections | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-024 | Interest discovery | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-025 | Follower lists | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-026 | Following lists | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-027 | Profile visibility | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-028 | Block users | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-029 | Mute users | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-030 | Restricted users | Partial | MOD | Account enforcement and sanctions exist; no full user or scoped circle suspension workflow. |
| SOCIAL-031 | Consent-based contact discovery | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-032 | Custom connection lists | Missing | S | Shared-circle directory and block rules; no matching relationship or discovery graph |
| SOCIAL-033 | Chronological feed | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-034 | Following feed | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-035 | Discovery feed | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-036 | Text posts | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-037 | Media posts | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-038 | Document attachments | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-039 | Research articles | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-040 | Chart sharing | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-041 | Report sharing | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-042 | Poll posts | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-043 | Likes and reactions | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-044 | Comments | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-045 | Threaded replies | Partial | F | Single-level discussion replies or author update policy present; full reply threading or edit UI absent. |
| SOCIAL-046 | Reposts | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-047 | Quote posts | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-048 | Persistent bookmarks | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-049 | Mentions | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-050 | Hashtags and ticker tags | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-051 | Post editing | Partial | F | Single-level discussion replies or author update policy present; full reply threading or edit UI absent. |
| SOCIAL-052 | Revision history | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-053 | Drafts | Partial | F1 | One discussion draft per account on the device persists through reload and failed publication, with explicit discard. Cross-device, multi-draft and other publishing surfaces remain open. |
| SOCIAL-054 | Scheduled publishing | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-055 | Post visibility | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-056 | Recommendation controls | Missing | F | Circle discussion, likes, local bookmarks and summary handoff; no matching publishing workflow |
| SOCIAL-057 | Evidence and credibility displays | Partial | F | Existing feed, opinions, summaries, likes or local drafts cover a subset; richer/persistent publication contract absent. |
| SOCIAL-058 | Public circles | Verified | S | Public/discoverable and private invite membership verified using disposable PostgreSQL access tests. |
| SOCIAL-059 | Private circles | Verified | S | Public/discoverable and private invite membership verified using disposable PostgreSQL access tests. |
| SOCIAL-060 | Invite-only circles | Verified | S | Public/discoverable and private invite membership verified using disposable PostgreSQL access tests. |
| SOCIAL-061 | Membership applications | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-062 | Membership approval | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-063 | Circle directory | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-064 | Circle search | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-065 | Categories | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-066 | Branding | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-067 | Investment and research mandate | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-068 | Versioned community rules | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-069 | Custom roles | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-070 | Granular permissions | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-071 | Subgroups | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-072 | Committees | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-073 | Channels | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-074 | Pinned messages and resources | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-075 | Member removal | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-076 | Member suspension | Partial | MOD | Account enforcement and sanctions exist; no full user or scoped circle suspension workflow. |
| SOCIAL-077 | Ownership transfer | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-078 | Activity audit | Partial | S | Current fixed-role directory, mandate or audit behavior covers a subset of the requirement. |
| SOCIAL-079 | Archive and restore | Missing | S | Public/private circles and fixed roles; no matching membership or administration workflow |
| SOCIAL-080 | Direct messages | Verified | MSG | Scoped one-to-one read/send policies tested; browser fixture verifies manual retrieval and preserves unsent text. |
| SOCIAL-081 | Realtime messaging | Partial | MSG | Manual refresh added; no scoped subscription, reconnect catch-up or realtime delivery. |
| SOCIAL-082 | Group DMs | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-083 | Message replies | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-084 | Reactions | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-085 | Read receipts | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-086 | Typing indicators | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-087 | Presence | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-088 | Message search | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-089 | Validated attachments | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-090 | Voice messages | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-091 | Edit messages | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-092 | Delete messages | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-093 | Archive conversations | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-094 | Unread counts | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-095 | Notification preferences | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-096 | Push notifications | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-097 | Email notifications | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-098 | In-app notification center | Missing | MSG | Scoped group chat and opt-in one-to-one DMs; no matching communications workflow |
| SOCIAL-099 | Optional voice and video integration with approved provider | External gate | MSG | Approved provider and infrastructure for voice/video absent, along with application integration. |
| SOCIAL-100 | Joint research projects | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-101 | Shared workspaces | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-102 | Shared files | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-103 | Contributor permissions | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-104 | Shared notebooks | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-105 | Shared AI sessions with consent | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-106 | Task assignments | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-107 | Peer review | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-108 | Research citations | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-109 | Review approvals | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-110 | Version history | Missing | H | Linked research records and summary handoff; no matching collaborative workflow |
| SOCIAL-111 | Research methodology | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-112 | Discussion threads | Verified | F | Feed, visibility, replies and block behavior exercised with browser fixtures and PostgreSQL policies. |
| SOCIAL-113 | Strategy reuse | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-114 | Conflict and position disclosures | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-115 | Research-to-feed publication approval | Partial | H | Circle ownership project, evidence summary or user review exists; collaborative authorization/approval workflow absent. |
| SOCIAL-116 | Member opinion polls | Verified | G | Nonbinding member poll flow and abstention verified by research journey and handoff SQL tests. |
| SOCIAL-117 | Committee voting | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-118 | Investment proposals | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-119 | Proposal amendments | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-120 | Due diligence | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-121 | Investment memo approvals | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-122 | Versioned charters | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-123 | Voter eligibility snapshots | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-124 | Quorum | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-125 | Voting thresholds | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-126 | Conflict disclosures | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-127 | Abstention | Verified | G | Nonbinding member poll flow and abstention verified by research journey and handoff SQL tests. |
| SOCIAL-128 | Binding approval only with legal authority | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-129 | Independent signoff | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-130 | Meeting minutes | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-131 | Decision and execution tracking | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-132 | Governance audit | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-133 | Exit rights | Missing | G | Nonbinding opinions and scenario rules; no matching governance workflow |
| SOCIAL-134 | Official proxy eligibility and ballot records with approved partners | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-135 | Financial account lifecycle | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-136 | Legal entity onboarding | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-137 | Financial partner interface | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-138 | Partner KYC/AML eligibility state | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-139 | Member capital accounts | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-140 | Deposit intents | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-141 | Withdrawal intents | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-142 | Recurring contribution intents | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-143 | Pooled treasury | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-144 | Reconciliation | Partial | FIN | Journal draft and disabled financial dispatch/front-end gates; full provider reconciliation, integrity and activation controls absent. |
| SOCIAL-145 | Exact double-entry ledger | Partial | FIN | Journal draft and disabled financial dispatch/front-end gates; full provider reconciliation, integrity and activation controls absent. |
| SOCIAL-146 | Verified provider events | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-147 | Member ownership accounting | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-148 | Portfolio positions | Partial | G | Educational poll, scenario assumptions, ownership research or simulation covers a subset; binding lifecycle absent. |
| SOCIAL-149 | Authorized execution interface | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-150 | NAV calculation | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-151 | Profit distributions | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-152 | Redemptions | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-153 | Statements | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-154 | Tax records | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-155 | Bank and broker connectivity | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-156 | Settlement tracking | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-157 | Financial disputes | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-158 | Concurrent transaction protection | Partial | FIN | Journal draft and disabled financial dispatch/front-end gates; full provider reconciliation, integrity and activation controls absent. |
| SOCIAL-159 | Independent financial approval | Missing | FIN | Gated external journal and simulation; no matching regulated accounting workflow |
| SOCIAL-160 | Read-only holdings provenance and consent | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-161 | Live activation gates for custody and transactions | Partial | FIN | Journal draft and disabled financial dispatch/front-end gates; full provider reconciliation, integrity and activation controls absent. |
| SOCIAL-162 | Member reporting | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-163 | Moderation review | Verified | MOD | Moderation, appeals, explicit rule policy and independent review exercised by disposable SQL suites. |
| SOCIAL-164 | Appeals | Verified | MOD | Moderation, appeals, explicit rule policy and independent review exercised by disposable SQL suites. |
| SOCIAL-165 | Fraud detection | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-166 | Scam prevention | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-167 | Rug-pull and predatory meme-coin policy | Verified | MOD | Moderation, appeals, explicit rule policy and independent review exercised by disposable SQL suites. |
| SOCIAL-168 | Sanctions and restrictions | Verified | MOD | Moderation, appeals, explicit rule policy and independent review exercised by disposable SQL suites. |
| SOCIAL-169 | Conflict disclosures | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-170 | Undisclosed promotion detection | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-171 | Market manipulation defenses | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-172 | Impersonation detection | Missing | MOD | Rule-based moderation and appeals; no matching trust control |
| SOCIAL-173 | Spam and bot controls | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-174 | Evidence preservation | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-175 | Moderator dashboard | Verified | MOD | Moderation, appeals, explicit rule policy and independent review exercised by disposable SQL suites. |
| SOCIAL-176 | Independent review | Verified | MOD | Moderation, appeals, explicit rule policy and independent review exercised by disposable SQL suites. |
| SOCIAL-177 | Misinformation review | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-178 | Credibility indicators | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-179 | Transparent reputation | Missing | MOD | Rule-based moderation and appeals; no matching trust control |
| SOCIAL-180 | Privacy controls | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-181 | Consent management | Partial | MOD | Existing reporting/rules/consent cover limited scope; broader controls and operational coverage absent. |
| SOCIAL-182 | Financial monitoring under authorized partner rules | External gate | FIN | Legal/provider approval and operational controls required for live use; implementation and staged verification also remain. |
| SOCIAL-183 | Account security alerts | Missing | MOD | Rule-based moderation and appeals; no matching trust control |
| SOCIAL-184 | Member search | Partial | S | Scoped circle search/directory or research browsing; missing global discovery and member/research search. |
| SOCIAL-185 | Circle search | Partial | S | Scoped circle search/directory or research browsing; missing global discovery and member/research search. |
| SOCIAL-186 | Research search | Partial | S | Scoped circle search/directory or research browsing; missing global discovery and member/research search. |
| SOCIAL-187 | Trending topics with real activity | Missing | LEARN | Circle browsing and Studio lessons; no matching discovery or education workflow |
| SOCIAL-188 | Topic and instrument discovery | Partial | S | Scoped circle search/directory or research browsing; missing global discovery and member/research search. |
| SOCIAL-189 | Personalized discovery controls | Missing | LEARN | Circle browsing and Studio lessons; no matching discovery or education workflow |
| SOCIAL-190 | Beginner lessons | Verified | LEARN | Studio lessons and progress workflow present; browser plus research RLS suites passed. |
| SOCIAL-191 | Technical lessons | Verified | LEARN | Studio lessons and progress workflow present; browser plus research RLS suites passed. |
| SOCIAL-192 | Learning progress | Verified | LEARN | Browser completion action passed with a fixture. Disposable SQL verifies persistence and account isolation. |
| SOCIAL-193 | AI tutor | Missing | LEARN | Circle browsing and Studio lessons; no matching discovery or education workflow |
| SOCIAL-194 | Risk education | Partial | LEARN | Contextual content and calculators exist; dedicated curriculum/glossary or diligence pipeline incomplete. |
| SOCIAL-195 | Interactive exercises | Verified | L1 | Eight scored exercises include explanations and separate private completion. Browser reload, idempotency and cross-account policies were verified. |
| SOCIAL-196 | Mentorship workflows | Missing | LEARN | Circle browsing and Studio lessons; no matching discovery or education workflow |
| SOCIAL-197 | Financial glossary and contextual definitions | Partial | LEARN | Contextual content and calculators exist; dedicated curriculum/glossary or diligence pipeline incomplete. |
| SOCIAL-198 | Venture discovery and research | Partial | LEARN | Contextual content and calculators exist; dedicated curriculum/glossary or diligence pipeline incomplete. |
| SOCIAL-199 | Housing and local-business ownership research | Partial | LEARN | Contextual content and calculators exist; dedicated curriculum/glossary or diligence pipeline incomplete. |

### Platform

| ID | Requirement | Classification | Evidence | Assessment |
| --- | --- | --- | --- | --- |
| PLATFORM-001 | Unified app shell | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-002 | Shared session and navigation | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-003 | Nested detail routes | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-004 | Responsive desktop layouts | Verified | UX | Chromium viewport matrix and workflow regression passed at 1440/820/390/320 CSS pixels. |
| PLATFORM-005 | Mobile app strategy | Missing | UX | Current static departments and shared chrome; no matching platform workflow |
| PLATFORM-006 | Progressive complexity levels | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-007 | Search and command palette | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-008 | Shared design system | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-009 | Interactive chart controls | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-010 | Configurable financial tables | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-011 | Persistent layouts and panels | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-012 | Settings for account security privacy appearance AI data compute portfolio circles integrations notifications billing | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-013 | Accessibility | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-014 | Loading empty error and retry states | Partial | UX | Shared shell and responsive presentation are wired; department-specific gaps remain in routes, controls or settings. |
| PLATFORM-015 | End-to-end research to circle governance workflow | Partial | H | Browser research to discussion/chat/nonbinding poll verified; legal workflow remains gated. |
| PLATFORM-016 | Typed service contracts | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-017 | PostgreSQL and migrations | Verified | OPS | Migration chain, PR workflows and unit/integration regression verified for the candidate. |
| PLATFORM-018 | Resource-level authorization and RLS | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-019 | Keyset pagination | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-020 | Database query plans and indexes | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-021 | Object storage | Missing | OPS | Current API, database and validation tooling; no matching operational mechanism |
| PLATFORM-022 | Durable jobs | Verified | J | Durable queue and dedicated PostgreSQL lifecycle/concurrency verification. |
| PLATFORM-023 | Transactional outbox | Partial | J | Enqueue can join producer transactions; no transactional event delivery and external acknowledgement workflow. |
| PLATFORM-024 | Realtime scoped subscriptions | Missing | OPS | Current API, database and validation tooling; no matching operational mechanism |
| PLATFORM-025 | Rate limits and quotas | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-026 | Cost controls | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-027 | Observability and monitoring | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-028 | Secrets management | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-029 | Backups and recovery | Partial | OPS1 | Disposable PostgreSQL crash recovery and cold-backup restore passed. Hosted backup cadence, independently tested restore and point-in-time recovery remain open. |
| PLATFORM-030 | Staging and production separation | Partial | OPS1 | Isolated public candidate has a generated disabled configuration. A connected hosted staging environment and provider fixture are open. |
| PLATFORM-031 | CI/CD | Verified | OPS | Migration chain, PR workflows and unit/integration regression verified for the candidate. |
| PLATFORM-032 | Unit and integration tests | Verified | OPS | Migration chain, PR workflows and unit/integration regression verified for the candidate. |
| PLATFORM-033 | Browser and mobile tests | Verified | UX | Chromium viewport matrix and workflow regression passed at 1440/820/390/320 CSS pixels. |
| PLATFORM-034 | Numerical validation | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-035 | Security and adversarial authorization tests | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-036 | Visual and accessibility tests | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-037 | Load testing with measured capacity | Partial | OPS | Bounded implementation and test evidence exist; full product and hosted operational assurance remain open. |
| PLATFORM-038 | Controlled rollout and rollback | Partial | OPS1 | Manual exact-commit and digest promotion and source-revert rollback path implemented for public research. Hosted reviewer and bypass settings block promotion. A hosted rollback rehearsal and member deployment remain open. |
## Product backlog cross-check

These are separate grouped requirements from the granular counts above. An item remains partial when any material part is missing, even where one child requirement passed. Route and interaction criteria were checked against [PAGE_AND_UX_SPEC.md](PAGE_AND_UX_SPEC.md). Its logical future routes do not create implementation evidence.

| Backlog ID | Classification | Evidence | Remaining work |
| --- | --- | --- | --- |
| Q01.01 | Partial | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Authenticated, opt-in research assistant; six modes (review/explain/plan/code/fundamentals/risk), bounded server quota and provider gate |
| Q01.02 | Partial | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Local custom slash-command templates, explicitly selected research notes and saved analysis history |
| Q01.03 | Missing | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Goal-based persistent project-scoped agent sessions, conversation history and context compaction |
| Q01.04 | Missing | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Plan/tool/execute/observe/validate state machine with bounded retries, debugging and code corrections |
| Q01.05 | Missing | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Fundamental, technical, quant, portfolio, macro, SEC, risk, modeling, data retrieval and verification agents |
| Q01.06 | Missing | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Multi-agent orchestration, streaming responses, tool traces, model selection and cost tracking |
| Q01.07 | Partial | A | Agent workflow beyond local commands and one-shot prompts. Requirement scope: Long-running jobs, pause/resume/cancel, per-project permissions, approval gates and evidence citations |
| Q02.01 | Partial | I | Persistent collaborative IDE, authoring tools and project lifecycle. Requirement scope: Browser-local research project CRUD, notes and export; existing authenticated research studio is separate |
| Q02.02 | Partial | I | Persistent collaborative IDE, authoring tools and project lifecycle. Requirement scope: Text file explorer, relative paths, revision history and restore; basic source editor with line numbers, find, go-to-line and indentation; verify editor browser regression |
| Q02.03 | Missing | I | Persistent collaborative IDE, authoring tools and project lifecycle. Requirement scope: Professional syntax highlighting, language services, autocomplete, linting and diagnostics |
| Q02.04 | Partial | I | Persistent collaborative IDE, authoring tools and project lifecycle. Requirement scope: AI inline edits, diff review, tabs, nested folders, cross-file search, terminal, resizable panels and keyboard shortcuts |
| Q02.05 | Partial | I | Persistent collaborative IDE, authoring tools and project lifecycle. Requirement scope: Project templates, duplication, complete import/export, Git integration, sharing, persistent storage and collaborative editing |
| Q03.01 | Partial | C | Kernel, remote sandbox, worker and package lifecycle. Requirement scope: Fixed-function notebook cells: notes, data profile, return distribution, drawdown, SMA backtest, ordered cells, provenance, export and persistence |
| Q03.02 | Partial | C | Kernel, remote sandbox, worker and package lifecycle. Requirement scope: Experimental browser Python: pinned Pyodide, opt-in source, worker/opaque iframe, package selection (numpy/pandas/scipy/statsmodels), output cap, cancel and history; actual isolation/runtime tests need to pass |
| Q03.03 | Missing | C | Kernel, remote sandbox, worker and package lifecycle. Requirement scope: Executable Python notebook cells, persistent kernels, project data access, artifact storage and package management |
| Q03.04 | Partial | C | Kernel, remote sandbox, worker and package lifecycle. Requirement scope: Scikit-learn/PyTorch where appropriate, pinned environment manifests, secret handling and resource monitoring |
| Q03.05 | Partial | C | Kernel, remote sandbox, worker and package lifecycle. Requirement scope: Separate isolated cloud compute, CPU/memory/time limits, network deny by default, queued jobs, parallelism, suspension and recovery |
| Q04.01 | Partial | D | Provider adapters, instrument/time data, developer platform. Requirement scope: Historical CSV import, IndexedDB dataset library, provenance hashes, quality checks and reusable inputs; user-uploaded daily close data |
| Q04.02 | Partial | D | Provider adapters, instrument/time data, developer platform. Requirement scope: Existing SEC EDGAR/fundamentals and official economic-data integrations; audit availability and source correctness |
| Q04.03 | Missing | D | Provider adapters, instrument/time data, developer platform. Requirement scope: Equity, ETF, international, futures, options, FX, fixed income, trade/quote and depth provider adapters; entitlements |
| Q04.04 | Partial | D | Provider adapters, instrument/time data, developer platform. Requirement scope: Security master, symbol resolution, corporate actions, adjusted OHLCV, dividends, calendar/time zone, continuous futures, point-in-time data and caching |
| Q04.05 | Partial | D | Provider adapters, instrument/time data, developer platform. Requirement scope: Versioned REST, Python SDK, MCP, scoped API keys, rotation/revocation, rate limits, usage analytics, bulk exports, webhooks, developer docs and examples (coordinate 10) |
| Q05.01 | Partial | Q | Broader strategy execution models, diagnostics and market depth. Requirement scope: Chronological SMA/buy-hold backtest, fee modeling, benchmark, holdout reports, trade logs and comparison |
| Q05.02 | Partial | Q | Broader strategy execution models, diagnostics and market depth. Requirement scope: Seeded block bootstrap, bounded walk-forward parameter sweep, OOS folds, training-only selection, regime diagnostics and source hashes |
| Q05.03 | Missing | Q | Broader strategy execution models, diagnostics and market depth. Requirement scope: Custom Python strategies, Pine-compatible tooling only where permitted, event-driven multi-asset/intraday/options/futures backtests |
| Q05.04 | Partial | Q | Broader strategy execution models, diagnostics and market depth. Requirement scope: Execution assumptions, slippage, market impact, liquidity, stops/targets, sizing, leverage, margin and attribution |
| Q05.05 | Partial | Q | Broader strategy execution models, diagnostics and market depth. Requirement scope: Regime-conditioned simulations, sensitivity and stability, cross-validation, overfit and multiple-testing corrections, significance, survivorship and lookahead audits, independent reproduction |
| Q05.06 | Missing | Q | Broader strategy execution models, diagnostics and market depth. Requirement scope: Prop-firm scenario rules and pass probabilities, order flow, volume profile, footprint, bid/ask imbalance, CVD, heatmaps and session analysis on eligible data |
| Q06.01 | Partial | R | Optimizer, derivative surfaces, issuer and private-market diligence. Requirement scope: Multi-asset covariance/correlation, historical VaR/ES, risk contributions, historical drawdown and simulated rebalancing; local risk reports |
| Q06.02 | Partial | R | Optimizer, derivative surfaces, issuer and private-market diligence. Requirement scope: Existing terminal financial calculators, DCF and options payoff/Greeks; audit existing coverage |
| Q06.03 | Missing | R | Optimizer, derivative surfaces, issuer and private-market diligence. Requirement scope: Optimization (efficient frontier, risk parity), factor models, constrained allocation, rebalancing, benchmark attribution, stress scenarios, liquidity and concentration |
| Q06.04 | Partial | R | Optimizer, derivative surfaces, issuer and private-market diligence. Requirement scope: Options IV surfaces, term structures, exposure and strategy research |
| Q06.05 | Partial | R | Optimizer, derivative surfaces, issuer and private-market diligence. Requirement scope: Corporate ownership mapping, 13F comparisons, beneficial owners, insiders, shareholder concentration, boards, proxies, governance and corporate-action intelligence |
| Q06.06 | Partial | R | Optimizer, derivative surfaces, issuer and private-market diligence. Requirement scope: Statement analysis, comparable valuation, acquisition/PE modeling, capital structures, venture cap tables/runway/dilution and investment memos |
| S01.01 | Partial | S | Hosted auth configuration, profile depth, social graph and account lifecycle. Requirement scope: Supabase authentication/profile, registration/recovery, display names/biographies, DM preference, member profiles, shared-group member directory and block/unblock |
| S01.02 | External gate | S | Hosted auth configuration, profile depth, social graph and account lifecycle. Requirement scope: Public signup SMTP and Google provider setup not established; verify existing auth and permissions |
| S01.03 | Partial | S | Hosted auth configuration, profile depth, social graph and account lifecycle. Requirement scope: Profile avatar/cover, experience, interests, philosophy, published research, optional verified credentials |
| S01.04 | Missing | S | Hosted auth configuration, profile depth, social graph and account lifecycle. Requirement scope: Follow/unfollow, friend requests/accept/decline, mutuals, suggestions, followers/following, privacy, mute, custom lists and safe contact discovery |
| S01.05 | Partial | S | Hosted auth configuration, profile depth, social graph and account lifecycle. Requirement scope: Global member/research search, pagination, discovery/recommendations, MFA, devices/session management, privacy/export/deletion and recovery controls |
| S02.01 | Partial | F | Publishing and collaboration depth, governance around evidence and education. Requirement scope: Member/community research feed, public discovery, likes, replies, local bookmarks, shared research projects |
| S02.02 | Partial | F | Publishing and collaboration depth, governance around evidence and education. Requirement scope: Following feed, filters and ranking controls, real persistent bookmarks, mentions, hashtags/tickers, reposts/quotes, nested replies and editing/revisions |
| S02.03 | Partial | F | Publishing and collaboration depth, governance around evidence and education. Requirement scope: Validated media/document attachments, research articles, interactive charts, model/run artifacts, drafts, scheduled publishing, visibility, citations and disclosures |
| S02.04 | Partial | F | Publishing and collaboration depth, governance around evidence and education. Requirement scope: Collaborative workspaces, shared files/notebooks, contributor permissions, assignments, peer review, evidence versioning, publication approval and reusable strategies |
| S02.05 | Partial | F | Publishing and collaboration depth, governance around evidence and education. Requirement scope: Existing financial education and lessons; audit learning progress |
| S02.06 | Partial | F | Publishing and collaboration depth, governance around evidence and education. Requirement scope: Interactive risk education, beginner onboarding, mentorship and accessible explanations |
| S03.01 | Partial | MSG | Scoped realtime and delivery state, membership administration and notifications. Requirement scope: Public/private circles, membership/invites, research library, mandate/trust, member directory, group chat and mutual-member opt-in DMs; current polling rather than real-time |
| S03.02 | Missing | MSG | Scoped realtime and delivery state, membership administration and notifications. Requirement scope: Requests, custom roles and granular permissions, committees, subgroups, private/discussion/research/announcement channels, pinned resources |
| S03.03 | Missing | MSG | Scoped realtime and delivery state, membership administration and notifications. Requirement scope: Member removal/suspension, ownership transfer, archive/restore, audit trail and circle branding |
| S03.04 | Partial | MSG | Scoped realtime and delivery state, membership administration and notifications. Requirement scope: Real-time delivery, group DMs, unread counters, read receipts, replies, reactions, presence/typing, search, edit/delete, archives, attachments and notification settings |
| S03.05 | Missing | MSG | Scoped realtime and delivery state, membership administration and notifications. Requirement scope: In-app/email/push notifications, secure mobile messaging, optional voice/video via appropriately reviewed integrations |
| S04.01 | Partial | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Nonbinding polls, voting and result details; not corporate proxy or legally binding investment authority |
| S04.02 | Partial | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Circle capital scenario planner with acquisition budget/reserves/costs/stress/quorum illustration; educational only |
| S04.03 | Partial | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: External recordkeeping schema draft and UI: balanced USD entries, exact reversals, private-circle authorization, audit/export; feature disabled, not verified balances |
| S04.04 | Missing | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Legal entity onboarding, separate eligible members and ownership rights, versioned mandates/charters, investment committees, due diligence, memos and amendments |
| S04.05 | Missing | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Eligibility snapshots, quorum, approval thresholds, conflicts, abstentions, independent sign-off, revocation, meeting minutes, decision audit and execution tracking |
| S04.06 | Partial | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Member capital accounts, provider-neutral deposit/withdrawal/recurring contribution intents, pooled treasury, immutable double-entry ledger, verified idempotent webhooks and reconciliations |
| S04.07 | Missing | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Authorized brokerage orders, position and settlement tracking, NAV, distributions, redemptions/exits, fees, statements, tax records and disputes |
| S04.08 | External gate | FIN | Legal entity and decision lifecycle, provider-backed ledger and external activation. Requirement scope: Live money movement, custody, investment offers and securities execution: requires approved legal structure, authorized financial partners and operational controls; no live activation before gates |
| S05.01 | Partial | MOD | Broader abuse controls and authorized financial monitoring. Requirement scope: Reporting/moderation, fraud quarantine rules, appeal/account restrictions, user block and private membership enforcement; existing RLS tests |
| S05.02 | Partial | MOD | Broader abuse controls and authorized financial monitoring. Requirement scope: Scam, impersonation, spam/bot, misinformation, undisclosed promotion, manipulation and abuse defenses with review and appeal |
| S05.03 | Partial | MOD | Broader abuse controls and authorized financial monitoring. Requirement scope: Evidence credibility and conflict disclosures, transparent reputation methodology, moderator queue, incident operations and member consent |
| S05.04 | External gate | MOD | Broader abuse controls and authorized financial monitoring. Requirement scope: Financial security alerts and suspicious-transaction controls for eligible activated integrations |
| X01.01 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: Separate static research, terminal, studio and community entrypoints; FastAPI prototype and Supabase auth/community backend; draft PR, not unified deployment |
| X01.02 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: Unified session, navigation, shared component system and responsive institutional UX; accessible dense data and beginner progressive disclosure |
| X01.03 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: Deep nested settings: account/security/privacy, appearance/density, AI/model/memory/commands, data/entitlements, compute, portfolio, circles/governance, integrations/API, notifications, billing/usage |
| X01.04 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: Mobile iOS/Android strategy, offline/recovery where appropriate, notification permissions |
| X01.05 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: Typed service boundaries, queues, persistence, storage, pagination, cache, migration strategy, monitoring, backups, disaster recovery, secrets, audit, environment separation and cost limits |
| X01.06 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: Unit/integration/browser/mobile/security/financial verification, accessibility, load and visual tests; staging smoke and deployment/rollback gates |
| X01.07 | Partial | OPS | Unified and hosted production paths, stage evidence, complete settings and legally authorized journeys. Requirement scope: End-to-end flow: individual research -> evidence artifact -> permitted sharing -> circle discussion -> decision -> legally authorized financial workflow -> accounting/audit; preserve individual choice |

## Disconnected paths and controls

| Surface | Audit finding | Disposition |
| --- | --- | --- |
| Workspace projects and Studio | The same member cannot seamlessly reopen a browser-local project in Studio. Studio owns private account projects; local workspace projects and files live in browser storage. | QUANT-055/057 and SOCIAL-101/102 remain open. Reviewed summaries are the implemented handoff. |
| Research assistant and compute | The assistant can receive explicitly selected text. It has no project tool binding or connection to the SQL job queue; browser Python runs separately. | QUANT-002/004/018/067 remain open. No provider secret or delegated execution added. |
| Market and ownership routes | Several issuer, technical, and ownership paths lead to public filing sources or modeled calculators. A link is useful source navigation. A normalized issuer, market data or filing subject view is separate. | QUANT-085–106 and QUANT-195–213 identify the applicable gaps. |
| Local and member publishing | Reviewed summaries can reach a private discussion and nonbinding poll. Source artifacts, versioned articles, shared notebooks and contributor review are absent. | SOCIAL-037–054 and SOCIAL-100–115 record partial and missing steps. |
| Direct messaging | An open conversation had no way to fetch incoming messages in place. | Added scoped manual refresh with draft preservation and an accessible input name. Realtime, unread and attachment work remain open. |
| Browser Python | Stop was offered when the project had no active job. | The control now reflects runtime state, with browser checks of idle state and completion. |
| Settings and accessibility | Account/profile and selected browser preferences are wired. Security, devices, data rights, notifications, integrations, compute, entitlements and billing remain incomplete. Layout checks and keyboard tests have narrower coverage than a full accessibility audit. | PLATFORM-011–014, PLATFORM-036 and individual social settings remain open. |
| Governance and financial accounting | Educational votes and modeled capital are implemented. The wallet's disabled controls and the external-journal gate represent unavailable operations. The queue also disables financial dispatch. | SOCIAL-128 and SOCIAL-134–161 distinguish missing internal functionality from regulated activation gates. No provider or financial controls activated. |
| Release and operations | Test CI, schema migrations and local load fixtures exist. No evidence of production restore drills, hosted authorizations, rollout approvals, or full-capacity verification. | PLATFORM-027–030 and PLATFORM-037–038 remain open. |

## Independently executed verification

- Node 22 ran all 14 CommonJS suites. Chromium ran foundation, responsive layout, local workspace, dataset migration, Studio, terminal scoped discussion pagination, and cross-department research/messaging browser tests. The data and member service fixtures represent explicitly synthetic tests.
- The real Chromium Pyodide run exercised successful execution, isolated application-origin access, cancellation, and reviewed execution evidence. The Deno research handler test exercised auth, consent, quotas and provider isolation with a fixture provider.
- Disposable PostgreSQL 16 applied all 12 migrations. Seven SQL regression suites passed, including feed visibility, research handoff, and draft journal controls. The separate SQL queue suite exercised leases, cancellation and concurrent claims. Seventeen pytest API tests passed with disposable PostgreSQL.
- Hosted account delivery and recovery, market feed licensing and coverage, production backup/restore, real AI providers, and financial activation were outside this verification. These environments require their own release evidence.

- The local prototype load harness completed 96 requests from eight concurrent sessions with 1,000 fixture users and zero errors. This measures that fixture and API path only.
