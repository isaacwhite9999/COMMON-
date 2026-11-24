# Department integration

This change combines the reviewed foundation, API operations, job queue, discussion feed and dataset catalog work from PRs #2–#6. The site root connects Markets, browser Research, Research Studio and Community. The existing local analytics, Python runtime, portfolio simulator, authenticated member features and educational preview keep their normal entry points.

## Evidence to a private circle

1. Use a tracked symbol in Community or open Studio directly. The tracked symbol pre-fills the new project form. It is an instrument label and carries no price, entitlement, or holding. Studio and Community share the existing Supabase member session on the same origin.
2. Run a backtest in Research or Studio, or open a historical portfolio risk report or completed browser Python run in Research. Choose to prepare a summary. The selected evidence contains dated samples, hashes and calculated statistics. Source CSVs, filenames, source code, Python output, notes, and browser-local holdings stay in their existing stores. The Python draft includes runtime metadata and a place to enter reviewed findings. Review the editable text before submitting. A single unpublished draft lives in the tab for up to an hour and is scoped to the Studio account or the Community account that opens it.
3. Sign in to Community if needed, open the draft, and explicitly choose a private circle. Publish uses `publish_research_draft_v1`, which derives the author from the authenticated session, requires current private-circle membership and inserts through existing discussion RLS and moderation. A retry with identical content and the same draft ID reuses the discussion. A conflicting replay fails.
4. Review the resulting discussion in the circle feed and use its existing replies and moderation controls. From a circle discussion, open a nonbinding poll draft with the discussion reference and its evidence. Publishing uses the existing proposal controls. Replies, polling, messaging and the shared research library retain their existing permissions.
5. When the existing research assistant is enabled, the review screen can open its editor with the selected text. Opening the editor sends no request. The separate provider gate and explicit model consent still apply. Browser Python stays opt-in and isolated from account credentials. The durable queue supplies internal job primitives and has no active research worker integration.
6. The circle's existing capital model is hypothetical. The external journal remains behind its existing disabled flag and independent schema review. A discussion, research draft, poll, or assistant output creates no legal authority, orders, transfers or accounting entries.

## Verification and rollout

`tests/research-journey.test.mjs` runs a real browser backtest from synthetic CSV, then uses a fixture member backend for the auth screens, membership error and retry, discussion publication, nonbinding poll and journal gate. `tests/pg_research_handoff_smoke.sql` exercises the real PostgreSQL publication contract and checks anonymous execution, outsider visibility, revoked membership, public-circle rejection and retry behavior. Existing SQL, browser, API, agent and queue tests cover the integrated foundations.

Apply additive migrations before releasing the static UI. If rollback is needed, revert the UI before removing API entry points and preserve existing discussions and queue records. The browser catalog upgrade requires a version-compatible code rollback. No hosted migration, provider activation, or live financial action was performed.

Partial acceptance evidence covers X01.01–02, X01.05–07, Q04.01, S02.01 and S04.01, including PLATFORM-002, 015–019, 022, 032–035 and 038. Hosted multi-account testing, real-time subscriptions, remote workers and legally authorized financial operations remain separate release requirements.
