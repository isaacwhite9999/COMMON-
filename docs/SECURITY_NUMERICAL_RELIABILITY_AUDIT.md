# Security, numerical accuracy, and reliability audit

Candidate baseline `3b31617` from [PR #9](https://github.com/isaacwhite9999/COMMON-/pull/9), including the proposed integration and design work. Evidence comes from source inspection, known-answer fixtures, Chromium, provider stubs and disposable PostgreSQL 16. Browser SDK availability and dependency advisory results reflect the versions checked. Production remains subject to its own release gates.

## Findings and remediation

| Finding | Impact | Remediation and evidence |
| --- | --- | --- |
| Member block helper could disclose an unrelated pair's private block status | Authenticated privacy exposure | Make the security-definer helper derive caller scope from `auth.uid()`. Preserve feed and messaging policy behavior for participants. SQL regression asserts an existing block is visible to a participant and hidden from an unrelated member. [Migration](../supabase/migrations/20261125053057_scope_member_block_status.sql) · [Feed and privacy regression](../tests/pg_discussion_feed_smoke.sql) |
| Price selection followed CSV column order | Raw closes could mask adjusted closes and introduce a false split return | Explicitly prefer the adjusted series when present and retain its provenance indicator. A split fixture has zero adjusted return. Invalid or overflowing arithmetic now fails explicitly in the audited paths instead of reaching report curves. Updated model version labels distinguish calculations from earlier records. [Known-answer tests](../tests/quant-assurance.test.cjs) |
| Bootstrap accepted an invalid block size and unbounded work | A non-advancing sampling loop or excessive work could block the browser | Require a valid block and unsigned seed, finite returns, and limit sample work to 20 million draws. Calculate terminal outcomes without allocating path curves. A constant-loss fixture verifies all percentiles and loss probability independently. [Engine](lab/research-engine.js) |
| Option tail prices and zero-value DCF presentation | Approximation and a zero denominator could yield invalid outputs | Price the cheaper option leg with a nonnegative time-value floor, reconstruct from discounted parity, and represent the zero enterprise-value weight as unavailable. Analytical fixtures cover nonnegative tails, parity, perpetuity valuation, zero cash flow and zero-coupon risk. [Terminal models](terminal/analytics.js) |
| Agent body reads lacked a deadline and upstream requests followed redirects | Stalled callers could retain resources after session verification, and a redirect could move configured requests outside the declared boundary | Bound body reads and decoded bytes, reject malformed input and disconnects, and reject upstream redirects. Tests confirm stalled, interrupted and oversized uploads do not reach the quota or model service. The provider request has no tools, grants no financial capability, and handles evidence as untrusted text. This constrains side effects. Live model behavior against prompt injection remains unverified. [Agent handler](../supabase/functions/common-research-agent/handler.ts) · [Agent tests](../supabase/functions/common-research-agent/handler_test.ts) |
| Member pages selected a floating CDN major release | Executable dependency could change independently of reviewed code | Pin the two browser entry points to the exact resolved Supabase SDK version, 2.119.2. npm audit reported zero advisories for its resolved package graph. pip-audit reported zero known advisories for the resolved local Python environment. This does not cover hosted images, CDN integrity, every deployment lockfile or advisories absent from the databases. |

## Independent calculations and transaction checks

- The new known-answer suite covers lagged SMA timing, first allocation cost, holdout boundary, bootstrap distribution, sample covariance, annualized volatility, historical VaR and expected shortfall, variance contribution, compounded return, DCF, option parity, bond duration and convexity, and exact-minor-unit accounting.
- Existing suites independently reran checks on chronological folds, future-data perturbation, regime attribution inputs, portfolio alignment, seeded statistics, option prices and Greeks, ownership dilution, capital scenario allocations, journal validity and reversals. Statistical conclusions retain the original limits of daily, historical, user-supplied observations and modeled costs. The evidence does not establish execution realism, liquidity, instrument entitlements or independent production model validation.
- Two concurrent journal writers using the same source reference produced one committed row. Two concurrent reversal attempts using different references recorded one inverse entry. The debit/credit delta and both individual account deltas returned to zero. This tests the gated manual-journal draft. Provider reconciliation, financial state machines, holdings ownership, settlement and duplicate payments remain outside the implemented path. [Recovery drill](../tests/recovery-drill.py)
- The security regression covered private resource authorization and revocation, account restrictions, CSRF and origin rejection, input redaction, malformed requests, pool exhaustion, and rejection of a disconnected body before mutation. Actual Chromium tests confirmed the experimental Python sandbox can run and cancel a job and blocks the tested application-origin request. Remote arbitrary-code isolation is still open.

## Reliability evidence and rollback

Run `python tests/recovery-drill.py --postgres-bin /usr/lib/postgresql/16/bin` with the project's Python dependencies. The drill creates a temporary Unix-socket-only cluster and never accepts a database URL. It applies the current migrations and the gated journal draft, then:

1. Verifies concurrent journal uniqueness and exact balances.
2. Leaves a committed job claim without a worker, takes a stopped-cluster backup, and interrupts an uncommitted journal insertion with immediate PostgreSQL shutdown.
3. Restarts the original cluster and checks that committed records survived while the interrupted transaction disappeared.
4. Starts the backup copy, checks the journal again, recovers the expired lease and rejects the stale completion token.

The local drill passed. It establishes recovery for the disposable cold-copy fixture. Hosted restore access, encrypted backups, recovery-point and recovery-time objectives, WAL archiving, and point-in-time recovery still need a staged drill.

The SQL remediation replaces the block helper in place. If an integration conflict requires rollback, retain participant scoping and restore compatible caller behavior with a reviewed forward change. Revert the browser or Edge code separately if needed. Existing reports keep their version and data; rerun selected analyses to get corrected price selection. No hosted migrations, model provider activation, or financial operation ran during the audit.

## Test results

- 15 Node CommonJS suites, two Deno tests, 18 pytest tests with disposable PostgreSQL, all 13 migrations, seven community and journal SQL smoke suites, and the independent recovery drill passed.
- Chromium passed the responsive, workspace, Studio, terminal, dataset, research-to-circle, and real Python suites locally. Hosted sign-in credentials and production financial integrations were outside this audit.
- Related acceptance IDs include Q03.02, Q04.01, Q05.01–02, Q06.01–02, S01.01, S04.03, S05.01, X01.05–06 and PLATFORM-018, 022, 029, 034–035 and 038. Broader production acceptance remains governed by the existing checklist.
