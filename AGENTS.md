# COMMON — repository engineering instructions

## Mission
Build a single production-grade platform combining quantitative research, an evidence-first AI research environment, a trustworthy social network and legally authorized collective investment infrastructure. Users range from beginners to professional researchers. Research and community functions must work with real user data, not fabricated content. Simulations are expressly labeled and reserved for education, research, testing and previews. Real money, brokerage orders, custody and binding financial authorization remain disabled until the documented legal, provider and operational gates are satisfied.

## Start here
- Read docs/CODEX_BUILD_PLAN.md, docs/PRODUCT_ACCEPTANCE_BACKLOG.md and the relevant workstream before changing code. Preserve existing P capabilities; map changes and tests to acceptance IDs.
- Read docs/PRODUCT_SPEC.md, docs/OWNERSHIP_CHARTER.md, docs/SECURITY_AND_REGULATORY_GATES.md and docs/TRUST_AND_SAFETY_POLICY.md. For capital read docs/COLLECTIVE_CAPITAL.md. For research read docs/QUANT_DEVELOPMENT_ENVIRONMENT.md and docs/RESEARCH_AGENT.md.
- Current integration branch: common/unified-workspace. Do not assume main contains the latest work.
- Existing application: docs/workspace (browser-local research), docs/live (authenticated Supabase community), docs/lab (authenticated research studio), docs/terminal (market intelligence), backend (FastAPI), supabase (migrations/functions), tests and workflows. Inspect actual sources; avoid parallel replacement applications.
- This is a public repository. Never commit secret keys, tokens, real financial records, user exports, production database dumps or confidential datasets.

## Execution rules
- Work on a dedicated branch per workstream, based on the same integration baseline. Keep changes scoped; coordinate shared routing, schemas and UI contracts via the integration workstream. No force-push, production deployment, destructive migration or automatic merge to main.
- Prefer maintained, appropriately licensed dependencies, pinned versions and lockfiles. No paid dependency activation or provider signup without owner approval. Existing accounts/free tooling first. Keep provider adapters replaceable.
- Complete vertical slices: schema and authorization, service, UI, nested views, validation, persistence, empty/loading/error states, mobile and accessibility, tests. No decorative controls that do nothing; no invented prices or returns. Label missing integrations honestly.
- Quant: chronological and point-in-time correctness, adjusted-price provenance, explicit costs, benchmarks, annualization, units, uncertainty, no leakage or survivorship claims without data. Research results are not forecasts or execution authority.
- Security: deny by default, per-resource authorization, RLS, immutable audit records where appropriate, explicit consent for model/tool access, limits on agents and compute. Treat model output, external content and uploaded data as untrusted. Never run arbitrary Python on a shared API process. Browser runtime is experimental, not hardened multi-tenant isolation.
- Design: coherent institutional financial UI, restrained typography and colors, information density where appropriate, progressive disclosure for beginners, mobile navigation, real interactions and shared design tokens. Respect third-party intellectual property.
- Do not bypass financial regulatory gates, accept funds into COMMON's own account, enable real transfers, or use real user credentials in tests. No coordination to artificially move security prices.
- Check existing CI failures before adding features; preserve working paths. If a test cannot run, state why and do not mark verified.

## Verification
Inspect actual workflow commands and run affected checks locally before proposing a PR. Node 22; pinned Playwright browser test runner; Python requirements and pytest; Deno function tests; disposable PostgreSQL migration tests. Run full regression at integration boundaries. Record commands, results and limitations in the PR. At minimum syntax checks, relevant unit tests, authorization negative tests, integration/browser tests and git diff --check. Financial calculations require independent fixtures and edge cases, not only snapshots. Do not claim production-ready while required checks fail or providers are inactive.

## Review handoff
Report changed files, accepted requirements, tests with actual results, security/data handling, missing integrations, and rollback. Request review against common/unified-workspace; never imply a checked box proves deployment.
