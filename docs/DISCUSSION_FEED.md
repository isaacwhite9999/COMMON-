# Discussion feed

The member network reads chronological My circles, Discover, circle, member, and Saved feeds through `public.discussion_feed_v1`. Opening a discussion loads its replies independently. The client renders one feed page and, when open, one reply page. Saved research remains a browser-local list of post IDs checked against current database visibility.

## Page contract

The authenticated RPC accepts a scope, the required scope identifier or saved IDs when applicable, and an optional cursor pair. The default page size is 25 and the maximum is 50. Saved requests accept at most 500 IDs. The scope values are `mine`, `discover`, `circle`, `member`, `saved`, and `replies`. The result contains ordered `items` and either a `next` cursor or `null`. Cursor timestamps must be retained verbatim because JavaScript date conversion would truncate PostgreSQL microseconds. The cursor describes a position and every read reevaluates permissions. Changing membership, moderation, or deletions can alter a later page.

The function runs with caller privileges under the existing discussion, community, reaction, and membership policies. It checks public visibility for Discover and current membership for My circles, and it applies reciprocal blocking to feed results and replies. Reply reads require access to the parent discussion as well. The function provides author, circle, and bounded reaction/reply summaries for each page. Counts above 99 render as “99+”. It does not send reaction identities or fetch all reply bodies in advance.

The browser refreshes only the active feed, open replies, or current circle chat while the page is visible. It reloads the feed when returning to a hidden tab, supports explicit retry, and discards obsolete responses after a scope or session change. This replaces the full member bootstrap timer. Subscription-based invalidation, cursor catch-up after reconnect, membership cache invalidation across other community surfaces, and feed distribution beyond indexed fan-out-on-read are still open.

## Verification and rollout

Local PostgreSQL 16 smoke tests exercise anonymous denial, private-circle access and revocation, block checks, moderation, timestamp ties, cursor validation, and aggregate projection. A synthetic 20,000-post fixture across 40 circles exercised a deep circle-page read as an authenticated account. A single warm `EXPLAIN (ANALYZE, BUFFERS)` run used `discussions_circle_timeline_v1_idx` at 0.749 ms for the raw seek. The complete authorized RPC took 3.211 ms. These are fixture timings with no concurrent sessions and no production throughput inference. Discover and cross-circle selectivity, cache churn, and long-running feed traffic remain unmeasured.

CI runs the SQL suite against PostgreSQL 16 and the mobile browser flow against a disposable SDK fixture. The browser verifies exact timestamp cursor transport, saving older posts, opening replies, retrying errors, and confirming that page refreshes avoid the bootstrap read.

Apply and verify the additive SQL migration before releasing the static member UI. Measure index creation on the target staging table before applying it to a busy system. Releasing the previous static UI reverts the client behavior while leaving the additive database objects available. The migration and test suite do not change financial provider gates.

Acceptance evidence covers SOCIAL-033 and SOCIAL-035 for chronological and discovery pages, SOCIAL-043 and SOCIAL-044 for existing reactions and comments through the new reader, and scoped enforcement relevant to SOCIAL-028, SOCIAL-055 and SOCIAL-112. Persistent server-side bookmarks, following relationships and feeds, and richer threaded publishing remain tracked separately.
