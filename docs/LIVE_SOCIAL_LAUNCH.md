# COMMON — Live Community Launch Gate

> **Current status (November 11, 2026): NOT LIVE FOR REAL USERS.**
> The published GitHub Pages homepage at \`/\` remains an educational showcase.
> \`/live/\` contains a separate Supabase-backed member application that fails closed
> while \`communityBackendReady\` is false. It never substitutes browser demo data.

## Core behavior implemented in real-member client

- Supabase Auth registration, sign-in, session refresh, password recovery, sign-out
- Auth-backed member profile and opt-in DM permission
- Shared public/private communities, auto-enrollment of creator, joining public groups
- Time-limited private invitation token creation/acceptance (RPC)
- Shared community discussions, replies, reactions
- Group chat persisted to Postgres, refreshing periodically
- Direct messages restricted to mutual community members, by opt-in and bilateral blocking
- Internal community proposals and nonbinding opinion votes
- Community ownership research projects (not investment offers)
- Persistent symbol watchlists (not positions or broker balances)
- Content reports stored for a future moderator dashboard

Each of these features depends on a live Supabase project with migrations applied. CI syntax success **does not prove** their end-to-end operation or production security.

## Required human approval and infrastructure

1. Install/connect Supabase in ChatGPT or create an authorized free Supabase project.
2. Configure site URL \`https://isaacwhite9999.github.io/COMMON-/live/\` in Auth URL settings and email redirect allowlist.
3. Enable email confirmation and configure safe auth rate limits.
4. Review and apply migrations in order:
   - \`supabase/migrations/20261111000100_community_core.sql\`
   - \`supabase/migrations/20261111000200_social_interactions.sql\`
   - \`supabase/migrations/20261111000300_watchlists.sql\`
   - \`supabase/migrations/20261111000400_security_invariants.sql\`
5. Verify migration success on clean database, especially extension permissions and SECURITY DEFINER RPCs.
6. Test across **two actual accounts** (private group cannot be viewed by outsider; no cross-group posts; auth recovery; realtime/polling; invite expiry; blocking prevents messaging; own profile only; spam controls).
7. Add working moderator report queue, user deletion/export, backup and recovery procedures, logging/abuse controls and privacy disclosures before mass invitation.
8. Set \`docs/config.js\`: \`supabaseUrl\`, **publishable key** (not service-role key), and \`communityBackendReady:true\` **only after security tests**.
9. Redeploy via GitHub Pages workflow, test sign-up/link across devices.
10. Only then promote \`/live/\` as COMMON's default route for user acquisition.

### Hard boundaries
The community app does not accept debit cards, store funds, broker trades, hold treasury assets, or manage group-owned securities. Members may organize research and make independent investment decisions at their chosen licensed brokerages. Actual pooled investing through an external club/entity requires legal and financial arrangements separate from this application. Community opinion polls are not legal shareholder proxy votes.

### Unfinished launch tasks
- Moderator resolution UI and incident escalation, blocking and reporting UX polish
- Validate data-integrity triggers and policies against clean and adversarial test databases
- Account deletion/export, privacy policy and terms, monitoring and backups
- Independent accessibility, performance and mobile browser reviews
- End-to-end testing with two accounts and real persistent backend

Do not describe the member experience as deployed or publicly functional until each gate above is satisfied.
