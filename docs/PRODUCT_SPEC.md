# COMMON — Full Product Vision & Functional Specification

Working name: **COMMON**. Branding and trademark clearance are not complete.

## Mission

Give ordinary people understandable tools to save, research, organize, invest independently or through properly structured collective vehicles, and influence the governance of assets they own. Build wealth without treating shareholders and tenants as two separate classes of people.

A member who works as a plumber, teacher, bartender or carpenter should be able to understand what they own, what they risk, what they pay, what they can vote on, and how to leave.

## Product operating principles

1. Plain-language first. Display ownership rights, liquidity, risk, costs and conflicts before numbers or hype.
2. Individual agency. No hidden trade copying, forced purchases, guaranteed returns, or implied group obligations.
3. Separate community **opinion**, bona fide shareholder **proxy voting**, and legal **entity-level governance**. They are not interchangeable.
4. Distinguish sourced facts, AI summarization, community opinion, and regulated investment recommendations.
5. Never misstate synthetic sample assets as verified group holdings, and never treat connected brokerage holdings as held by the platform.
6. Real ownership has legal and financial consequences: specify counterparty, beneficial owner, cap table and record-keeper for every asset class.
7. Design housing affordability and investor returns as explicit, disclosed constraints that must be negotiated honestly.

## Personas

- **Joe — Beginner investor:** limited free time, seeks safety and clarity, wants to learn and start with small sums.
- **Maya — Existing retail shareholder:** holds stock at a brokerage, wants to research proxy materials and vote effectively.
- **Lena — Self-directed club organizer:** manages a small group, agendas and proposals; every member trades independently.
- **Dev — Pooled investment club organizer:** needs legal structure, contributions, accounting, entity governance, KYC and a regulated brokerage partner.
- **Sam — Tenant and community organizer:** explores community land trust models, affordable housing and resident governance.
- **Asha — Business owner:** explores employee succession and community ownership without disguising private securities offerings.
- **Trust and compliance:** reviews content, conflicts, possible manipulative coordination, privacy and legal suitability.

## Product modules and progression

### 1. Identity, consent & profile

**Current prototype:** registration, login, demo, hashed passwords, opaque sessions.

**Production:** passkeys and MFA, verification emails and recovery, single-use invitations, profile privacy, account deletion/portability, accessibility, consent ledger, connected brokerage scopes and revoke flows, anti-abuse, teen/minor restrictions as applicable, device/session management, RBAC and ABAC.

### 2. Discovery and community research

**Current prototype:** curated sample communities, member-created public/private research groups with expiring invitations, join and leave, topic discussions, watchlists, nonbinding opinion polls, sample learn articles.

**Production:** community creation, explicit membership rules, public/private visibility, invitations, teams, moderated discussion threads, citations and references, conflict-of-interest labels, revision history, document uploads and malware scans, author verification, follows, notifications, moderation queue, reputation based on sourced research quality not return promises, anti-spam and anti-pump controls.

### 3. AI research copilot

Retrieval-backed agent for EDGAR filings, proxies, earnings transcripts licensed to the platform, audited financial statements, independent source comparison, fund fees, dilution and governance rights. Every material claim has timestamp, issuer, source, and confidence. Sensitive prompts have redaction. No generation of unlicensed personalized investment recommendations or undisclosed automated trading until approved as a regulated service, if ever. Preserve source rights and attribution.

### 4. Independent investments and verified shareholder participation

Members keep assets with their own broker. Connect via a vetted OAuth-based aggregator/partner. Import holdings with least-privilege scopes and minimal storage. Show own holdings only by default; aggregated group holdings require explicit informed consent, anti-reidentification thresholds, clear currency and record dates, and no claims of voting power unless legally validated. Portfolio performance is source-labelled and reconciled.

Retail shareholder dashboard: issuer action calendar, record date vs. ownership date, proxy statement summaries, precise proposal wording, pros/cons with sources, broker routing for eligible beneficial owners, acknowledgement and reconciliation where supplied. Never treat in-app opinion polls as ballots.

### 5. Self-directed investment clubs

A workspace for research, agendas, documents and nonbinding opinions where every member independently decides if/when/what to buy. No pooled deposits or central trade instruction. Make group conditions and conflict disclosures clear. Beware possible coordinated beneficial ownership, solicitation, and market manipulation rules.

### 6. Pooled investment clubs / entity accounts

**Regulatory-gated feature:** legal entity formation and review, operating agreement, active vs. passive member analysis, adviser/fund and state registration/exemption analysis, entity EIN and tax reporting, regulated entity brokerage account, payment rails and AML checks, contribution ledgers, accounting and capital accounts, withdrawal gates, formal governing votes, expenses, valuation, tax documents, signatories and dual control, conflicts, independent reconciliation, auditability. Do not launch simply by replacing a poll with a 'Buy' button.

### 7. Housing and neighborhood asset ownership

**Regulatory-gated feature:** project qualification, property diligence, title, inspections, underwriting, environmental risks, appraisals, capex/reserves, financing and leverage, investor qualification, governing entity/ownership rights, affordability covenants, tenant rights, resident governance and transfers, property management contracts, project cash waterfall, tax, distributions, ongoing reporting, exit and disposition governance. Consider community land trusts, housing cooperatives, REIT or SPV approaches only after counsel and lender review.

### 8. Small-business ownership

**Regulatory-gated feature:** owner-sponsored sale listings, audited/quality-of-earnings diligence, valuations, debt and lender consents, worker/employee ownership variants, restricted securities analysis, offering and tax documentation, voting, distributions and reporting. Avoid depicting an illiquid minority interest as a freely tradable stock.

### 9. Institutional-grade safeguards

- Enforcement of licenses, entity boundaries, KYC/AML, securities eligibility, appropriate exemptions and disclosures.
- Social surveillance for manipulation patterns, spam, misleading earnings claims, undisclosed paid promotion and false verified ownership; human escalations with appeals.
- No coordinated price/volume manipulation features; no auto-execute community signals.
- Per-action event log, immutable broker events, reconciliation, idempotency, alerts, incident response, encrypted PII, retention policy.
- SOC 2 readiness, penetration tests, data flow mapping, PII segregation, vendor risk management and backups.
- Fair access, accessibility, abuse support and privacy-safe public metrics.

## Core journeys / acceptance criteria

**Joe (first-run):** understands in less than 3 minutes what a stock is, what voting means, and what community discussion is; can join a club, create a learning watchlist and leave safely without adding money.

**Maya (governance):** can open a sourced proposal summary with record date, broker-verified eligibility, issuer resolution, votes available (if authorized provider permits), legal route to cast a proxy, and submission confirmation. A failed or unconfirmed vote is never shown as successful.

**Lena (self-directed group):** creates a private group and invites 40 friends; the platform records meetings/opinions and never claims members' holdings are pooled or obligates purchases.

**Dev (pooled entity):** cannot accept a dollar until legal, broker, KYC, custody and reporting gates pass. Each contribution/distribution uses reconciled double-entry ledger, maker-checker approvals, auditable receipts, entity-level signatories and restrictions.

**Sam (housing):** understands the property legal ownership, financing leverage, resident affordability restrictions, distributions, expenses, transfer restrictions and who controls rent policy before any investment request.

**Compliance:** can review who posted what, citations, disclosure flags, suspicious activity, decision history, and how a given trade/vote came to be authorized.

## Model & system boundaries

Separate bounded contexts: identity, social/research, market data, issuer disclosures, brokerage connections, verified positions, proxy actions, entities, offerings, payments/ledger, property management, notification and compliance. Every external API has versioned adapters, retries with idempotency and explicit failure states. Maintain audit and authorization independently of the UI.

**Never merge** (1) social votes, (2) shareholder proxy votes, (3) investment club entity voting, and (4) order execution into a single generic Vote model. They have different participants, rules, provenance, and effects.

## Monetization hypotheses

- Free learning/community tier.
- Paid research workspace tools with clear limits on advisory implications.
- Group administrative software and compliance/document fees when lawful.
- B2B tools for community organizations, co-ops or independent advisers.
- Fees on regulated offerings or real estate, if lawful, disclosed and appropriately licensed.

Do not fund the platform through undisclosed payment for order flow, deceptive referral arrangements, or product recommendations biased by compensation. Models need legal and commercial analysis.

## Metrics and product quality

Onboarding comprehension (quiz pass rates, not deposits), WAU/MAU, research contributions with credible citations, community retention, legitimate proxy votes submitted/confirmed by partners, verified beneficial owner participation, housing affordability outcomes, net member investment returns **after** fees with appropriate benchmark and risk context, complaint rates, security incidents and regulatory issues.

## Rollout order

1. Working education + community discussions (this prototype).
2. Production identity, permissions, moderation, research sources and issuer calendars.
3. Partner-linked read-only holdings verification and **authorized** proxy voting.
4. Self-directed private club tooling.
5. Regulated pooled-club and private investment offerings pilot (subject to legal review).
6. Housing and local-business acquisition vehicle platforms (subject to separate legal/operational review).

Do not confuse staged launch with an incomplete ultimate product: build the architecture for the full scope, but gate each regulated capability until objectively safe and lawful.

## Group fund-builder and teaching demos (November 2026)

- Groups start as research communities, not legal investment vehicles.
- The Fund Lab holds only hypothetical scenario inputs, recomputes with observed group member count, and displays $0 collected. Owner-only edits, invitation-gated read access for private groups.
- Growth milestone labels ($100K/$1M/$10M/$100M) are nonregulatory educational examples and must not be used to imply a licensed fund or real AUM.
- Separate, clickable preview paths describe stock trading, community housing, buying a local business, and shareholder proxy voting without submitting real transactions, investment offers or voting instructions.
- SEC EDGAR companyfacts integration is optional with a contact-identified bot header and six-hour cache; reveal only dated, sourced filing figures, never fabricated quote data.
- Lessons define AUM, hedge funds, private equity, risk and member governance in everyday language.
- Any implementation of actual pooled money, passive outside investors, performance fees or coordinated securities holdings requires appropriately qualified legal/compliance review, entity structures, custody, eligibility and disclosures. SEC references: https://www.sec.gov/files/investor/pubs/invclub.htm and https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/private-funds.
