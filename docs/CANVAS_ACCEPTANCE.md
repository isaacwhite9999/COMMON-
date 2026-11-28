# COMMON Canvas acceptance

These IDs extend the existing 450 granular requirements. The existing checklists retain their scope and statuses. A verified row describes the feature and the evidence available in this increment.

| ID | Requirement | Status | Evidence or remaining work |
| --- | --- | --- | --- |
| CANVAS-001 | Generic structured CSV input and workspace dataset selection | Verified | Chromium covers CSV upload and selecting a dataset persisted by the existing workspace library. |
| CANVAS-002 | Authorized market, financial, economic, portfolio and research adapters | Partial | The public Treasury bill rate adapter supplies source URL, receipt time and record date coverage. Broader adapters and permission/entitlement checks remain open. |
| CANVAS-003 | Manual field mapping and extensible versioned declarative chart specifications | Verified | Engine rejects unsupported fields. Manual mapping and compact specs render through a shared compiler. |
| CANVAS-004 | Line, scatter, histogram, box, violin, waterfall and candlestick charts | Partial | Allowlisted Plotly adapters exist. Chromium exercises line and histogram. OHLC invariants have deterministic fixtures. Other adapters need browser evidence. |
| CANVAS-005 | Heatmaps, contour and 3D surfaces | Partial | Numeric grid alignment, omissions and duplicate validation have fixtures. Browser evidence remains open. |
| CANVAS-006 | Correlation, regression, distributions, intervals and risk visualization | Partial | Histograms and distribution adapters exist. Statistical transformations and intervals remain open. |
| CANVAS-007 | Sankey, network and geographic visualization | Open | Add typed trace inputs, source metadata and coverage checks. |
| CANVAS-008 | Natural-language chart drafting | Partial | A bounded local grammar drafts charts with exact column mapping. Model-backed chart generation remains open. |
| CANVAS-009 | AI-generated analytical applications and validated linked panels | Open | Add a gated model contract, safe formulas, typed controls, table and layout links, and evaluation limits. |
| CANVAS-010 | Local specification revision history, duplication and export | Verified | Browser tests cover persisted versions and duplicates. Source fingerprint gates reopening. JSON exports contain no source rows. |
| CANVAS-011 | Share, fork, peer review and publish eligible artifacts | Open | Add account/circle authorization, license and consent checks, reproducibility and governance handoff. |
| CANVAS-012 | Live, delayed, historical and simulated market modes | Open | Add licensed source adapters, instrument identity and freshness contracts. CSV imports do not claim a market-data mode. |
| CANVAS-013 | Indicators, overlays and synchronized multi-instrument views | Open | Add bounded indicator transforms and data synchronization. |
| CANVAS-014 | Order-book reconstruction, liquidity, footprint, volume profile and CVD | Open | Requires eligible granular events with sequence and completeness checks. |
| CANVAS-015 | Trade and quote analysis, replay, streaming calculations and alerts | Open | Build bounded subscriptions, replay windows, deterministic reducers and alerts. |
| CANVAS-016 | Point-in-time fundamentals, earnings, SEC, insider, ownership and corporate actions | Open | Integrate publication timestamps, restatements, identity and entitlements. Existing independent terminal features remain available. |
| CANVAS-017 | Historical information cutoff and event time machine | Partial | Explicit ISO UTC availability filter rejects invalid timestamps and excludes later observations. Chromium verifies the rendered cutoff result and hides the unfiltered preview. Real historical event adapters, session playback and effective-vintage resolution remain open. |
| CANVAS-018 | Independent research adversary | Partial | A future-value perturbation fixture verifies cutoff invariance. Survivorship, leakage beyond available timestamps, multiple testing, significance, costs, reproducibility and contradictory-evidence workflow remain open. |
| CANVAS-019 | Versioned pipelines, monitoring and authorized schedules | Open | Add durable rerun state, approved data triggers, drift detection, budgets and notifications. |
| CANVAS-020 | Multi-asset and corporate scenario laboratory | Open | Add hypothetical inputs, constrained calculations and independently tested outputs. |
| CANVAS-021 | Versioned research tool library and dependency review | Open | Add permission manifests, search, attribution, version pinning and removal. |
| CANVAS-022 | Bounded browser computation and reproducible performance | Partial | CSV parsing and chart compilation run in a worker with time and size limits. Local benchmark below. Streaming, virtualization, intentional accuracy-preserving downsampling and durable jobs remain open. |
| CANVAS-023 | Account authorization, cloud persistence and sharing | Partial | Private account documents support consented save, retained revisions, duplicate-as-new, restore with matching source and deletion. PostgreSQL validates the payload and enforces ownership, revision conflict checks and quotas. Circle sharing and hosted rollout remain open. |

## Reproduction and operating limits

Open Research → Open COMMON Canvas. Map columns, paste a version 1 JSON specification, or draft an instruction such as “line Close by Date”. The preview displays at most 20 rows. A render accepts up to 4,000 rows or grid cells, while histograms accept up to 30,000 input observations. CSV inputs have a 2 MB, 30,000-row, 32-column limit. There is no silent numeric downsampling. Line charts preserve the order of the source rows. The exact decoded CSV text is fingerprinted. Publication timestamps are user-supplied and do not independently establish data entitlement, release availability or point-in-time accuracy.

Plotly.js 3.3.1 is MIT-licensed and loads on first render using a pinned CDN URL and SHA-384 integrity metadata. The declarative specification does not accept scripts, arbitrary options, URLs or callable transforms. Users can select device-local inputs or retrieve a fixed public Treasury series. No device-local file or value is submitted to the Treasury service or an AI provider. The device storage is origin-local, with no account-level separation on a shared browser profile.

Run `node --test tests/canvas-engine.test.cjs`, `node tests/canvas-browser.test.mjs` against the project preview, and `node scripts/benchmark_canvas.cjs`. In a local Node 22.23.5 run, parsing and compiling a synthetic 30,000-row, 312,904-byte histogram fixture measured p50 15.18 ms and p95 30.32 ms over 25 trials after warm-up. This excludes worker startup, browser rendering, CDN delivery, and market data streaming. A live Treasury adapter smoke normalized 72 public observations with record dates from 2020-11-30 through 2026-10-31. This coverage is a retrieval sample, and the adapter does not infer publication timestamps from record dates.

Rollback removes the Canvas entry, static files, and package allowlist additions. Existing research datasets remain untouched. Canvas specifications use their own local storage key.

## Private Canvas library

When a member account is available, the Canvas library can store the rendered chart specification and its source fingerprint after explicit confirmation. Files, filenames, source preview rows and private provider data remain on the device. The member can read their own documents and open matching historical revisions. A compare-and-swap revision prevents one tab or device from silently overwriting a newer version. Account changes clear account-derived chart state. The private library uses the existing member auth client and remains disabled in the public research package.

The database limits each owner to 30 account documents and retains 10 revisions per document. An account deletion cascades to its library. Authorization and bounds are tested independently in [the PostgreSQL smoke suite](../tests/pg_canvas_library_smoke.sql). [The mobile Chromium flow](../tests/canvas-account-browser.test.mjs) exercises consent, request fields, revisions, stale writes, owner changes and deletion with the member service mocked. Apply the additive migration before enabling the new account UI on a hosted member deployment.
