# COMMON collective capital
## Product purpose
Enable voluntary trusted circles to acquire meaningful ownership through lawful collective investment arrangements, while preserving member independence and protecting against concentration of power.
## Development increment
The authenticated circle includes Capital & treasury: overview, equal-contribution scenario planner, acquisition budget and reserve model, fee assumptions, downside stress case, illustrative quorum and approval rules, JSON export and publication of a nonbinding research poll within private circles. No actual member financial details are entered. Scenario drafts live in memory until navigation away from the application; shared research polls use the existing community proposal database and membership checks. No pledge, subscription, offer, deposit, fund interest, actual balance or authorization is created. The UI is not an authorization boundary for financial activity; all actual financial activity remains absent.
## Target live architecture (not yet implemented)
- Legal entity per eligible circle with governing documents, jurisdiction, beneficial ownership and legal review; distinct from the social community.
- Account onboarding, eligibility checks, member agreements, identity verification and financial partner approval.
- Partner-held cash and securities; deposit/withdrawal intents, idempotency and verified webhooks; immutable double-entry journal, reconciliation, statements and exception queues.
- Member capital accounts, subscriptions/redemptions, valuation/NAV, unit or capital-account accounting, applicable tax records, fee disclosures and audit trail.
- Versioned mandate, risk limits, conflicts and abstention, voting eligibility snapshot, quorum, approval, revocation, independent sign-off, approved-order state machine; no execution until authorized by the legal entity and provider.
- Portfolio orders and settlement through a permitted broker; positions, corporate actions, dividends, transfers and reconciliation.
- Separate workflows for public securities, private offerings and real assets, with asset-specific eligibility, legal review and liquidity controls. No coordination intended to artificially move security prices.
- No admin override of provider gating. No actual deposits, withdrawals, trading or fundraising until legal and security review, partner agreements and integration tests are complete.
