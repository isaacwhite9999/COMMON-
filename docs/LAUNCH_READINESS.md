# COMMON public research release candidate

## Delivery status

This release packages the static market terminal, browser-local research workspace, legacy preview route, navigation, and preferences. It retains the Research Studio and Community entry points with their existing unavailable states. The generated profile has an empty account endpoint and publishable key, and disables community, AI, ledger, and financial operations. The source tree and checked-in member configuration are unchanged. Public Treasury data, the pinned browser Python runtime, and other existing public static resources retain their normal availability constraints.

## Review the candidate

The [candidate workflow](../.github/workflows/release-candidate.yml) builds a ZIP and SHA-256 from one Git commit. It has read-only repository permissions and runs on PRs, main updates, and manual candidate requests. The artifact includes a source commit, profile, and per-file SHA-256 manifest. It contains only allowlisted static files and a generated configuration. The packager rejects missing local HTML references, resources outside the site, nonregular source entries, and recognizable provider credential markers. Code review and repository secret scanning are still necessary.

A disposable local build requires Python 3.12 and Git. Run from the repository root with an unused output path.

```sh
python -m unittest discover -s tests -p test_release_candidate.py
python scripts/release_candidate.py build --commit "$(git rev-parse HEAD)" --output /tmp/common-public-research
python -m http.server 8765 --bind 127.0.0.1 --directory /tmp/common-public-research/site
```

Open the published directory structure in Chromium. CI runs the existing foundation browser suite against the actual packaged files. It verifies navigation, persisted settings, responsive layout, and the disabled member client. For release review, also record the existing workspace, terminal, numerical, authorization, and dependency results for the candidate commit.

## Controlled promotion and rollback

Only an authorized repository maintainer may manually dispatch the [Pages promotion workflow](../.github/workflows/publish-showcase.yml). Dispatch from `main` and supply its exact reviewed commit, the matching candidate ZIP SHA-256, and the explicit promotion acknowledgement. The workflow rebuilds and verifies the candidate before uploading a Pages artifact. An advancing main head makes a waiting release stale.

Before enabling promotion, the repository owner must verify Pages uses GitHub Actions as its source and configure the protected `github-pages` environment to allow only `main`, require an independent reviewer, prevent self-review, and disable bypass. After verifying those controls, the owner may set the environment variable `COMMON_PUBLIC_RESEARCH_PROMOTION_ENABLED=true`. An absent variable denies deployment. The promotion job verifies the actual main-only branch policy, required reviewers, self-review setting, and bypass setting through the read-only GitHub API. The current environment allows only main, has no required reviewers, and permits admin bypass. Promotion is blocked pending owner remediation. These settings are managed outside this repository.

For a rollback, revert the affected source through the normal review flow, generate the candidate digest for the resulting main commit, and repeat the same approvals. The release changes neither database data nor server configuration. This change has not dispatched production promotion, modified environment settings, or started any paid service.

## Verification and outstanding gates

| Area | Existing evidence | Applicable launch gate |
| --- | --- | --- |
| Packaging and delivery | Deterministic archive, content hash manifest, strict allowlist, inactive member/provider configuration, approval guard and Chromium candidate smoke | Owner-managed environment policy and a reviewed current-main candidate must be confirmed before the first promotion. |
| Public data and quant | Treasury/SEC source contracts and local known-answer, provenance, workspace, and terminal checks | Confirm public source availability for the exact release. No market-data entitlements or financial side effects are implied. |
| Member auth and data | PostgreSQL 16 policy and revocation tests, isolated browser flows, and pinned Supabase SDK | A proxy blocked the prior public Supabase settings check. Hosted auth provider status, real test-account flows, and production abuse defenses remain unverified. The candidate never connects to the member backend. |
| Rate controls and capacity | Prototype request bounds, pool backpressure, disposable traffic evidence and tested queue admission caps | Durable public/account rate limits, hosted saturation monitoring and broader workload tests remain open. Current prototype metrics establish no production capacity. |
| Recovery and security | Disposable PostgreSQL crash and cold-copy recovery, concurrent exact-minor-unit journal fixtures, repository dependency checks | Hosted restore and point-in-time recovery, production monitoring and external incident procedures still need verification. |
| AI and regulated finance | Provider and financial actions remain gated | Verify isolated workers and provider controls separately. Keep the legal, security, and operational gates in force before any live financial integration. |

Evidence and follow-up are recorded in [API operations](API_OPERATIONS.md), [durable jobs](DURABLE_JOB_QUEUE.md), [assurance audit](SECURITY_NUMERICAL_RELIABILITY_AUDIT.md), and [security and regulatory gates](SECURITY_AND_REGULATORY_GATES.md). This covers a portion of X01.01, X01.05–06, and PLATFORM-030–033 and PLATFORM-038. Broader production acceptance remains open.
