# COMMON foundation contracts

The static site root is the application home. The shared header and tool search are available on the four existing application surfaces. Routes are resolved relative to the shell script, so deployments under a path prefix keep the same links. The static HTML remains deployable on GitHub Pages and can run from a loopback preview server.

| Route | Owner and persistence | Access |
| --- | --- | --- |
| `/` | Foundation tool directory | Public |
| `/terminal/` | Markets and public-source research tools | Public, with separate source availability |
| `/workspace/#research` | Research workspace. Projects and settings use browser storage, and datasets use IndexedDB | Local to this browser origin. Members explicitly export or share evidence |
| `/lab/` | Research Studio. Member projects, experiments and lesson progress use the existing Supabase tables | Supabase session plus database authorization |
| `/live/` | Community, account, feed, circles and messaging | Supabase session plus per-resource database authorization |
| `/settings/appearance/` | Shell spacing choice saved to this browser origin | Public, device preference |
| `/preview.html` | Educational simulation | Public and explicitly simulated |

Keep the published paths and their existing fragments. Shared navigation remembers the last local research route within the current tab. Use the shared registry in `shared/shell.js` when adding a department. Each department owns its detail routes, state, loading and recovery. Register links when their destination works. Use the `--common-*` tokens from `shared/shell.css` for shared navigation, focus, and spacing. Department styles are loaded separately.

## Member session

`CommonSession.memberClient()` returns the existing Supabase client or `null` when member services or the SDK are unavailable. The client is shared per page. Both authenticated entrypoints use the same publishable configuration and SDK persistence, refresh and callback settings. On the same site origin and Supabase project, the SDK uses the same persisted session across pages. Keep sign-in, sign-out and recovery in Community. Schedule asynchronous reads outside SDK auth callbacks.

Use session state for UI and keep database RLS and RPC authorization authoritative for protected operations. Never pass access tokens in shell links, copy them into workspace storage, or log them. The prototype FastAPI cookie and CSRF session apply only to the separate prototype server. Browser-local project identity and member project identity are independent.

## Service contracts and ownership

FastAPI exposes machine-readable response models for `GET /api/config` and `GET /api/health` through its prototype OpenAPI document when enabled. Their JSON fields and values remain compatible with existing callers. The financial activation field only accepts `false`. The static app continues to call its existing adapters.

| Boundary | Contract and owner |
| --- | --- |
| Research data → quant engine | Dataset identity is the SHA-256 of the CSV source. Pass dataset metadata and validated chronological observations from `workspace/datasets.js` and `lab/research-engine.js`. Retain source, sample range, parameters, and units in run evidence. Workstreams 03–05 own the storage, provider, and numerical contracts respectively. |
| Agent → research context | The Edge Function handler validates scoped caller identity and consent. Use versioned request and result schemas before adding a new tool. Pass only explicitly selected context. Workstream 02 owns orchestration and coordinates provider contracts with 03. |
| Compute → evidence | `CommonPython.execute(source, packages, onState?)` returns a promise of `{ok, output, truncated, version, at}` and a cancellation function. Preserve timeout and output bounds. Workstream 03 owns isolated compute and durable artifacts. |
| Research → Community | Explicit export or review and copy is the current boundary. A later publishing adapter must authorize reads and writes separately, document visibility, and reference immutable evidence where available. Workstreams 06–08 own member, publishing, and circle scopes. |
| Circles → governance and capital | Community permissions and social polls carry no legal or transaction authority. Workstream 09 owns separate legal-entity and accounting contracts. Provider flags remain off pending the documented gates. |

## Local preview and staged integration

Run `python3 scripts/serve-preview.py` and open `http://127.0.0.1:8765/`. By default, member services, the research agent and the external ledger are disabled. The preview serves the static tree and a generated, non-cacheable public configuration at `/config.js`. The checked-in site config remains the published site's config.

For an isolated staging smoke test, use a separate origin and Supabase project. Set both `COMMON_PREVIEW_SUPABASE_URL` and `COMMON_PREVIEW_SUPABASE_PUBLISHABLE_KEY` before starting the loopback preview. Use an HTTPS project origin or a loopback HTTP origin and a publishable key. Register the exact callback origin with that project and use disposable test accounts. The agent and ledger stay disabled in this preview. Keep browser and database data isolated from production. For local FastAPI smoke, use a disposable SQLite database and `PUBLIC_PREVIEW_ONLY=true`.

Install browser checks with Node 22 using `npm install --no-save --no-package-lock playwright@1.56.1` and `npx playwright install chromium`. With the preview server running, execute `node tests/foundation-browser.test.mjs`, `node tests/workspace-browser.test.mjs`, `node tests/lab-browser.test.mjs`, `node tests/terminal-browser.test.mjs`, and `node tests/workspace-python-browser.test.mjs`. The Studio and market tests use fixtures. The Python test downloads and executes the pinned Pyodide runtime. When Chromium must use a development proxy, set `COMMON_BROWSER_PROXY` and optionally its certificate public-key hash in `COMMON_BROWSER_PROXY_SPKI`. Run `pytest -q` for the prototype API and `deno test supabase/functions/common-research-agent/handler_test.ts` for the agent handler. For database smoke, follow `.github/workflows/test-community-db.yml` against disposable PostgreSQL 16.

## Integration and acceptance

Review specialist changes against the same integration baseline. Resolve shared route and UI edits in the foundation PR and keep specialist feature edits within their modules. For each subsequent PR review routes, existing entrypoints, session transitions, access checks, browser and mobile flows, and any applicable database and financial invariants. Record requirements and exact evidence before marking acceptance. Rollback for Workstream 01 is a revert of the foundation merge. This slice adds no database migration.

| Acceptance | Delivered evidence | Remaining |
| --- | --- | --- |
| X01.01, X01.02 | Shared home, direct department routes, scoped member-client factory, keyboard tool search and mobile navigation | Shared account controls across public surfaces, member and market view restoration, workspace tabs and richer layout controls |
| X01.03 | Nested appearance page with saved shell density | Other nested settings surfaces |
| X01.05 | Typed prototype API metadata and isolated preview configuration | Hosted staging, durable worker and provider contracts, operational monitoring, backups and restore drills |
| X01.06, Q02.02, Q03.02 | PR browser workflow, explicit editor labels, workspace regression and real Python checks | Dedicated visual and load coverage, hosted staging verification and production compute isolation |
| X01.04, X01.07 | Existing browser workflows remain reachable | Native mobile and complete research-to-governance journey, subject to the legal and provider gates |
