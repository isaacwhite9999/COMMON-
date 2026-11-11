# COMMON — Production System Architecture (Community First)

**Status:** Architecture baseline, not a declaration of production readiness.  
**Product principle:** A community can organize real members and create real research without COMMON taking custody of any funds.

## 1. Experience model (not a brokerage dashboard)

COMMON is organized as a civic-financial workspace:

1. **The Front Page** — editorial discovery: member-written theses, sourced ownership stories, assemblies and projects.
2. **Assemblies** — permanent member communities with identity, bylaws, role-based access, discussions and nonbinding votes.
3. **The Workshop** — research workflow: hypothesis → evidence → peer review → proposal → documented group position.
4. **The Registry** — real projects for housing, local businesses, cooperatives and public-company shareholder advocacy. Each project explicitly records legal and execution stage without soliciting investment commitments.
5. **The Library** — beginner-first financial education attached to the actual interface.
6. **The Record** — transparent record of community decisions, moderation actions, and research changes. Never imply an internal poll is a shareholder proxy vote.
7. **The Vault (future)** — regulated money accounts and transaction execution isolated behind partner APIs. Not part of Community Core.

### Visual language
An independent financial newspaper meets the reading rooms and assembly halls of a public library:
- generous editorial typography, striking serif display headlines, crisp small-caps labels
- ivory newsprint, ink navy, copper for emphasis and cobalt for meaningful interaction
- asymmetric editorial columns, not endless KPI tiles or left-side product-navigation rails
- human-scale writing: "Join an assembly", "Present a case", "Examine evidence"
- lightweight motion, accessible focus, high contrast, mobile-first reading experience
- real examples use sources and dates; simulated activity explicitly marked

## 2. Boundaries and service design

\`\`\`
                        COMMON CLIENTS
                Web/PWA • future iOS & Android
                             |
                       CDN / TLS / WAF
                             |
               AUTH + COMMUNITY API (Supabase)
                  /           |           \
       Identity + roles    Assemblies    Research
          (Auth/RLS)         (RLS)       (RLS + sources)
                 \            |            /
                   Postgres + migrations
                      |         |
             Realtime channels  audit/metrics
                      |
            content moderation, rate limits
                      
    =========== HARD REGULATORY BOUNDARY ===========
    FINANCIAL OPERATIONS (DISABLED UNTIL PARTNER)
     wallet custody • broker execution • property offerings
          -> contracted regulated providers
          -> separate legal terms, onboarding, AML/KYC
          -> reconciled double-entry ledger and audit controls
    =================================================
\`\`\`

Initially use Supabase Auth, hosted PostgreSQL, row level security, and realtime. The browser uses a **publishable/anon key only**, never the service-role key. Identity, authorization, and mutation validation are enforced in the database (not by hiding frontend controls). All data belongs to a named user and, where applicable, a named assembly.

Eventually, split services on measurable scaling needs, not aesthetics: identity provider, community service, research/filing ingestion workers, governance service, notification service, regulated execution adapter. Each has an explicit owner, contract and audit boundary. Do not split into distributed microservices before there is operational evidence.

## 3. Domain model

- **Person**: auth subject, handle, display name, educational preferences, abuse reports.
- **Assembly**: community, scope, visibility, creator, policies; member roles owner/moderator/member.
- **Discussion**: sources, replies, edits, moderation status; private groups scoped to members.
- **Proposal**: educational/governance question, rationales, open/closed status and deadline.
- **Opinion**: one vote per person/proposal, amendable until closure. Never called a legal shareholder vote.
- **Ownership project**: publicly traded company, cooperative housing, community land or business research with stage and source registry.
- **Interest**: follow/research/volunteer; NOT a pledge, dollar commitment or subscription to securities.
- **External-entity link (future)**: member-directed record pointing to an independently established legal entity's official resources. Do not accept bank credentials or claim to verify balances.

### Governance invariants
- The platform owner is never the operator of a member investment pool by default.
- Community membership does not mean equity ownership.
- Interest/following does not mean investment commitment.
- Quorum for internal polls does not create corporate voting rights.
- Official proxy votes remain with shareholders and authorized service providers.
- No member may coerce group votes or advertise guaranteed returns.

## 4. Production security and trust

1. Verified email/passkey authentication and secure recovery. Enable MFA for moderators.
2. RLS for every row of user/group data with adversarial cross-user tests.
3. Rate limits on invitations, profile creation, content posting, reports and auth attempts.
4. Safe content rendering: escape user text; links must be allowlisted and visibly external.
5. Content moderation queue + reviewer logs, appeals and member block controls.
6. Minimal analytics, privacy notices, retention rules, export/deletion controls.
7. Backups + regularly tested restores. Supabase Free **does not include automatic backups**.
8. GitHub Actions CI: type checks, migrations lint, RLS isolation tests, security scanners, accessibility smoke tests.
9. Availability/uptime + abuse monitoring; free services may pause or throttle.
10. SEC/issuer data must retain as-of dates, filing links and confidence; no fabricated market quotes.

**Production launch gates:** deployed database, email verification, real group isolation tests, invite abuse controls, moderation process, privacy/terms, observability, backup strategy, safe mobile UX, and an end-to-end test across two separate accounts.

## 5. Real-money architecture (future / disabled)

A wallet UX is not a ledger or a bank. An eventual financial module must have:
- externally held funds at a contracted licensed institution
- customer and/or club KYC/KYB performed by authorized parties
- partner-approved funding methods and payment orchestration
- immutable double-entry journals with idempotent funding and transfer messages
- balance available vs pending vs reserved, ledger reconciliation and disputes
- withdrawal and frozen-account policies
- distinct per-vehicle accounts, entitlements, beneficial ownership and taxes
- approvals, compliance reviews and contract gates for securities transactions
- processing/incident operations, partner SLAs and legally reviewed disclosures

Never model deposits as rows in a "wallet_balances" table with no backing bank records. Never use a personal Stripe account or ordinary card checkout to silently pool investment money.

## 6. Delivery sequence

**Community Core — build fully, not a toy MVP:** real identity, profile management, assemblies, discovery, invitations, discussions, research, source linking, polls, projects, reporting and moderation, education, search, notifications, audit, mobile UX.

**External ownership workflow:** for independently incorporated clubs, communities can maintain bylaws, meeting notes, external service/provider links and external-document references, with no money transmitted through COMMON.

**Financial integration:** only after partner agreements and legal review, connect a wallet/custody adapter and authorized broker rails. UI explicitly distinguishes expected contributions, confirmed external ownership and hypothetical calculations.

## 7. Current code status

- \`supabase/migrations/20261111000100_community_core.sql\`: database model and access-control foundation; **has not been run or integration-tested against a live Supabase project**.
- Existing GitHub Pages showcase remains a local educational simulation.
- No working shared accounts, no funded wallet, no broker or investment crowdfunding service.
- Next required action: authorize a Supabase project so the schema can be applied and tested, followed by UI implementation and end-to-end review.
