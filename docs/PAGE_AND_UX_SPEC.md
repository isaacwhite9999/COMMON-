# COMMON — page architecture, interaction contracts and design specification

## Product intent and non-negotiables
One identity and profile across independent circles, quantitative research, market intelligence, private-capital discovery, financial education and collective ownership. The guiding principle is to broaden ownership and participation, not to promise financial returns or coordinate artificial price movement. Build the complete product, not a collection of base screens. All pages need real navigation, meaningful detail views, menus, settings, permissions, validation, state and error handling. Preserve working functionality in the repository. No childish placeholders, invented metrics, fake activity, or simulated production balances. Real financial operations require the legal and provider gates in SECURITY_AND_REGULATORY_GATES.md; design those workflows fully but keep execution inactive until authorized. Zero incremental spending without approval.

## Visual and interaction direction
Institutional-grade financial software meets consumer banking clarity. Use public interaction patterns from QuantPad, Bloomberg, Koyfin, TradingView, QuantConnect, IBKR, Mercury, Linear, Revolut, Cash App, Venmo and established social products as references; independently implement workflows without copying proprietary assets, names, code or designs. QuantPad's public capabilities are a functional baseline, not evidence that every authenticated screen has been inspected. Graphite/neutral surfaces, restrained green and red for actual financial semantics, off-white light mode, consistent typography, compact rows, thoughtful spacing and accessible contrast. Charts and financial data should dominate the research workspace, not oversized headings, decorative cards, gradients, emojis or generic AI-generated UI. No fabricated names, prices, returns or transactions in live surfaces.

One app shell: left navigation with collapsible department trees, top command/search bar, breadcrumbs, workspace tabs, account/notification controls and optional contextual right-side research assistant. Wide desktop split panels with resize and persistence; on mobile progressively disclose depth using navigable detail pages, sheets and bottom navigation with accessible overflow. Keep market watch, research, circles, feed and profile reachable; preserve current context when changing views. Offer Essential, Advanced and Professional complexity levels as presentation controls, not automatic paid tiers. Explain financial language in place with definitions, worked examples, methodology, provenance and risks. Expert explanations must not claim verification or credentials that do not exist.

## Logical route map (implement progressively; names below are contracts, not claims that routes exist)
### Home / onboarding
- /auth: sign in, registration, verification, recovery, MFA and session errors; /onboarding: identity, experience, financial literacy, interests, privacy, terms, optional circles and guided tour.
- /home: personalized research and circle activity, watchlists, recent projects, alerts, actionable onboarding; /search: grouped results (instruments, members, circles, research, commands), filters, history, keyboard navigation.
- /notifications: unread/all, mentions, messages, research, proposals, security, per-type preferences, read/archive/mute.
### Markets / instruments
- /markets: overview, equity/ETF screens, macro/rates, options, futures, fixed income, FX, economic calendar, watchlists, saved screens and data sources.
- /markets/equities/:symbol: overview, financials, valuation, ownership, earnings, technicals, derivatives, risk, filings, research, news, scenarios. Company header carries exchange, currency, identifier, timestamp and source/coverage.
- Financials: annual/quarterly, period selection, currency/unit controls, reported vs restated, growth and common-size, compare peers, export; metric click opens time series, source filing, definition and calculation.
- Ownership: institutional holdings, 13F changes, beneficial owners, insider activity, concentration, voting rights, board and proxy research. Show reporting lags and coverage.
- Options: contract chain, expirations, strikes, bid/ask/OI/volume/Greeks and IV, payoff builder, scenarios and risk; distinguish missing/delayed/licensed data. Futures: contract and roll methodology, sessions, volume/open interest and curve.
- Macro: policy rates, yield curves, inflation, labor, calendar, release history, revisions, country filters and comparison. Screens: composable filters, formulas, saved views, column presets, sorting, export and alert rules.
### Research projects / quantitative workspace
- /research: project list, search, tags, folders, create from template, import, duplicate, share, archive/restore, permissions.
- /research/:id: overview/thesis, explorer, editor, notebook, terminal/output, assistant, variables, artifacts, data, experiments, versions, settings and access. Keep selected project and file context.
- /research/:id/files/:file: editor tabs, pin/reorder/close/reopen, syntax and diagnostics, search/replace, go-to-line, autocomplete, diff/revision/restore, save/autosave indicator, dirty-state prompt, file rename/move/upload/delete.
- /research/:id/notebooks/:notebook: ordered cells, code/markdown, run/stop/restart, run-all, outputs, errors, variables, history, artifact export and reproducibility metadata.
- /research/:id/agent: goal, plan, model/commands, selected context, permissions, tool calls, logs, pending approvals, pause/resume/cancel, results, citations, proposed edits and diff review.
- /research/:id/backtests/new: strategy, instrument/data, date range, benchmark, costs, capital, sizing, execution assumptions and validation parameters; review before run.
- /research/:id/runs/:run: summary, performance, equity/drawdown, trade log, benchmark, attribution, parameters, validation, sensitivity, regimes, source data, methods and export; compare comparable runs.
- /research/:id/validation: walk-forward folds, parameter grid/stability, bootstrap/Monte Carlo, significance, robustness and independent replication.
- /datasets/:id: overview, quality, coverage, schema, provenance, transformations, usage history, permissions and exports. Identify source/entitlements, missing intervals, corporate actions and exact version.
- /compute: environments, packages, resource allocation, storage, job queue/history, logs, cancellation and usage. No untrusted arbitrary execution in shared backend.
### Portfolios / risk
- /portfolios: list, create/import, base currency, visibility and benchmark.
- /portfolios/:id: overview, holdings, transactions, lots/cost basis, realized/unrealized P&L, performance, attribution, allocation, exposures, correlations, risk, scenarios, optimization, rebalance and settings.
- Risk: volatility, drawdown, VaR/ES, concentration, liquidity, stress cases, assumptions and confidence/limitations. Optimizer: objectives, constraints, covariance, frontier, allocation comparison, rebalance preview. Distinguish personal self-reported holdings, hypothetical research and provider-verified accounts.
### Network / profiles / publishing
- /feed: following, circle, discovery and saved tabs, chronological/ranking control, filters, search and compose. Real content only; loading and empty states direct users to relevant action.
- /members/:id: profile, research publications, interests, experience, connections, circles where visible; follow, connection requests, message where permitted, mute/block/report.
- /connections: requests, accepted, following/followers, suggested, lists and privacy.
- /posts/:id: rich research text, disclosure, citations, artifacts/charts, threaded comments, reactions, bookmark, repost/quote, report, revision history and visibility. /publish: editor, attachment validation, preview, drafts, approval, scheduling and delete/restore rules.
- /messages: inbox, direct/group threads, search, unread, archive/mute, message composer, reactions/replies, attachments, delivery/read state, permissions and blocks. Do not expose private conversations in discovery.
### Circles / collaborative work
- /circles: joined, discover, invite-only, invitations, requests, create and search.
- /circles/:id: overview, mandate, discussions, research library, channels, chat, members, committees, governance, capital/treasury, portfolio, activity and settings. Visibility and membership gates precede data fetching and action rendering.
- /circles/:id/members: roles, invitations, requests, approval/removal, permissions, ownership transfer, blocks and audit. /channels/:id: topic, pinned items, threaded discussion, visibility, notification settings and management.
- /circles/:id/research: shared projects, files, notes, contributor permissions, assignments, evidence, peer review, version history and publishing approval.
### Governance and collective capital
- /circles/:id/governance: charter/version history, mandate, committees, proposals, meetings/minutes, voting rules, eligibility, disclosures/conflicts and audit.
- /proposals/:id: investment thesis, due diligence, financial model/risk, evidence/attachments, discussion, amendments, eligibility snapshot, quorum, votes/abstentions, decision, independent approval, execution status and history. Distinguish nonbinding polls from legal authority.
- /circles/:id/treasury: financial entity status, account overview, cash/reserves, contributions, withdrawals, member capital accounts, transaction history, ledger, reconciliations, approvals, statements, distributions, member exit and controls. Show provider connection, source, timestamp and actual eligibility; no real balance or action unless verified.
- /circles/:id/portfolio: holdings, acquisition proposals, exposures, performance, risk, valuations and settlement. /money: individual account onboarding, funding/withdrawal, payment methods and transactions only after authorized integrations. Educational scenarios remain clearly separate.
### Venture / real assets / ownership
- /venture: discovery of companies/sectors/rounds, saved opportunities, founder profiles, research and eligibility. /venture/:id: overview, founders, financials, documents, diligence, risks, capitalization, valuation/dilution/runway/scenarios, investment memo, committee discussion and decision history. No unapproved offerings or solicitations.
- /ownership: shareholder research, stewardship, corporate ownership, governance, real assets, housing and local business research. Explain rights, cost, liquidity, exit and verification.
### Learn
- /learn: experience-based tracks, glossary, beginner through technical lessons, exercises, progress, methodology, risk and AI tutor. Contextual help throughout every financial view, not only a separate course.
### Settings and operations
- /settings/account: identity/profile, email/contact, locale/region, currency, account lifecycle.
- /settings/security: password, MFA/passkeys, sessions/devices, login history, alerts and recovery.
- /settings/privacy: visibility, communications, blocks/mutes, consent, data export/deletion and retention.
- /settings/appearance: theme, density, typography, chart defaults, workspace layout, panels and keyboard.
- /settings/research-ai: model, instructions, account/project memory, custom commands, context, tools, permissions, approval policy and history.
- /settings/data: providers, entitlements, exchanges, history/coverage, benchmarks, data usage and exports.
- /settings/compute: environments, dependencies, CPU/memory, storage, jobs, env vars/secrets and limits.
- /settings/portfolios: currencies, benchmarks, risk, accounting assumptions and visibility.
- /settings/circles: membership, roles, permissions, governance, voting, approvals and communication.
- /settings/integrations: API keys/scopes/rotation, developer docs, webhooks/logs, applications and MCP.
- /settings/notifications: message/research/price/proposal/security, push/email/in-app, quiet hours and frequency.
- /settings/billing: plan, usage, AI/compute budgets, payment/invoices where configured, caps; no paid service activation without authorization.
- /admin: moderation/report/appeal queues, audit, account sanctions, trust operations, feature/provider readiness, monitoring and incident workflows. Enforce admin scopes server-side, never expose financial controls to ordinary moderators.

## Required microinteractions (applies to all relevant screens)
Tables: sortable/filterable columns, resize/reorder/visibility, pagination, grouping, keyboard focus, export with explicit scope. Charts: time interval, crosshair/tooltips, compare, zoom/reset, indicators/drawings where relevant, data-quality notice, accessible summary. Forms: validation, inline errors, drafts, autosave indicators, review/confirmation, unsaved warning, retry and idempotency on writes. Dialogs/sheets: focus trap, keyboard escape, clear cancel, return focus; destructive actions require explicit confirmation. Context menus: item-specific real actions and permission states. Files: upload progress, size/type controls, revision restore, safe paths. Lists: empty/loading/error/skeleton, pagination, stale/offline states. Notifications: unread count, read/archive/mute. Layout: resizing, fullscreen, saved presets, consistent breadcrumbs and deep links. No actions hidden behind dead controls or fake toasts.

## Cross-feature acceptance journeys
1. Beginner joins one account, learns in context, discovers a circle and shares a research question, while controlling privacy.
2. Researcher creates project, obtains permitted source data, develops strategy in IDE/notebook, asks AI to review or run within approved boundaries, validates chronologically, exports reproducible evidence and explicitly publishes to a circle.
3. Circle invites members, delegates scoped permissions, reviews research, creates investment proposal, debates, votes under documented rules, records outcome and audit. Binding approval and transactions are unavailable until legally authorized.
4. Eligible legal circle eventually onboards with approved partners, sees verified funds and member interests, approves a transaction through authorized workflow, tracks settlement and reconciles ledger/statement, distributes or processes exit with audit. Every gate and failure case is visible; no real money activation in development.
5. Member can manage settings and security, locate past work, block/report abuse, export/delete eligible data and recover from failures without leaking unrelated data.

## Screen completion criteria
Each logical route needs working data/service binding, access control, responsive desktop/mobile views, real interactive controls, nested detail/configuration views, loading/empty/error/retry states, accessibility, explicit assumptions/provenance where financial, and end-to-end tests. Track routes and backlog IDs in PRs; no placeholder route counts as complete. Do not conflate design target with implemented state.
