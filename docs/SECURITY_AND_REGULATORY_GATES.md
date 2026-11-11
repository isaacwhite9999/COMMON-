# SECURITY + REGULATORY RELEASE GATES

This is product engineering guidance, **not legal advice**. Obtain specialist US securities, corporate, housing, tax and financial-services counsel before accepting funds, giving regulated advice or facilitating proxy voting.

## Public-source starting points (review on launch date)

- SEC investment club bulletin, updated October 20, 2026: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-33
- SEC group beneficial-ownership reporting interpretation: https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/exchange-act-sections-13d-13g-regulation-13d-g-beneficial-ownership-reporting
- SEC proxy rules interpretative guidance: https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/proxy-rules-schedules-14a14c
- Investor.gov general resources: https://www.investor.gov/

## Release gate checklist

### Before public community beta

- [ ] Trademark and rights review for platform name/branding.
- [ ] Threat model and privacy impact assessment; children's access policies.
- [ ] Harden authentication with MFA/passkeys, verified email, password reset, account-deletion handling.
- [ ] Rate limits and anti-bot/anti-enumeration, abuse moderation/appeals, explicit conflicts-of-interest policy.
- [ ] Legal review of moderation and shareholder engagement language.
- [ ] PostgreSQL migrations, backup/PITR and restore test, monitoring and signed structured audit logs.
- [ ] Pen test, dependency scans, CSP and HSTS, secrets rotation, no public debug routes.
- [ ] Financial promotions review and prominent risk disclosure everywhere relevant.
- [ ] Accessibility (WCAG) and mobile usability test.

### Before offering account linking or showing group positions

- [ ] Signed partner agreements and approved OAuth/SDK integration.
- [ ] Consent minimization, data residency and vendor security review.
- [ ] Beneficial vs. registered ownership definitions and corporate-action adjustments.
- [ ] Exact source/date of positions; stale feed warnings; corporate action adjustments.
- [ ] Personal holdings private by default; allow opt-in aggregated statistics only with privacy thresholds.
- [ ] Counsel review of group coordination and potential Section 13 reporting obligations.

### Before proxy vote integration

- [ ] Authorized brokers, transfer agents, or proxy processors and valid API integration.
- [ ] Verify record date, share class, eligibility, applicable issuer rights.
- [ ] Support actual resolution IDs and signed attestation, submission status, retries and receipts.
- [ ] No platform-level claims of voting authority absent enforceable authorization.
- [ ] Separate social sentiment poll database events from legal proxy votes.
- [ ] Legal review of proxy solicitation, communications and beneficial ownership implications.

### Before any fund deposit or pooled investment club

- [ ] Analyze pooled club legal status, active/passive members, adviser and fund exemptions or registrations at federal and state levels.
- [ ] Appropriate regulated entity brokerage/custodial accounts, AML/KYC, OFAC screening.
- [ ] Client funds never pass through an unlicensed app operating account.
- [ ] Double-entry capital ledger, signed cash reconciliations, dual approval and immutable audit events.
- [ ] Legal agreements, transfer and redemption rules, performance reports, tax forms, chargeback and failed-payment controls.
- [ ] Independent security, financial and legal reviews before enabling production toggles.

### Before housing or business offerings

- [ ] Decide lawful offering type (e.g. properly registered/exempt investment offering through an authorized intermediary where needed), investor eligibility, disclosures.
- [ ] Asset diligence, title, financing, construction/maintenance risk, cash reserves and valuation.
- [ ] Conflict-of-interest controls, sponsor compensation, property management agreements.
- [ ] Resident and shareholder governance rights defined in binding agreements.
- [ ] Distinguish pledged funding vs. escrowed/settled funds and signed commitments.
- [ ] Ongoing investor reporting, tax, transfer restrictions, applicable tenant/landlord laws.

## Current prototype limitations

The implemented application contains no order/trade, funds-movement, real proxy, market data or investments API. SQLite, limited seed users, no email verification/MFA and no anti-abuse controls make it **unsafe to deploy publicly** as a financial community. Use this locally, in development environments, or with synthetic data only.
