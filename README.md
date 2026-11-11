# COMMON — Ownership Network

A working, zero-brokerage prototype for a member-driven financial education and collective ownership platform.

**What works:** account signup/login with hashed passwords; private demo users; HTTP-only session cookies and CSRF protection; community browsing and membership; creating public/private research groups and time-limited invitation links; creating research discussions; nonbinding community opinion polls; ticker watchlists; activity audit records; clickable stock, housing, business and shareholder-voting learning demos; a group growth simulator with persisted owner-controlled hypothetical assumptions and privacy protection; free-source SEC company research (optional, contact-identified integration); expanded beginner lessons including AUM and fund types. Desktop and mobile interfaces.

**What is intentionally NOT implemented:** live orders, deposits, fund pooling, brokerage account linking, real-money balances, securities offerings, shareholder proxy vote execution, verification of shareholdings, market-price data, AI investment advice, or real-estate acquisition workflows. This is a functional product prototype, not a brokerage or production-ready regulated platform.

## Run locally

Requires Python 3.11+ and the dependencies in `requirements.txt`.

```bash
cd common-platform
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Open **http://localhost:8000**. Click **Explore interactive demo as Joe** or create an account. Each demo creates its own local user. Default SQLite database is created at `common_dev.sqlite3` on first run.

To run tests:

```bash
pytest -q
```

## Future production stack

- **Client:** migrate this tested interaction prototype to Next.js App Router + TypeScript, deployment on Vercel.
- **API:** FastAPI + SQLAlchemy, deployment on Render behind HTTPS with strict allowed origins.
- **Database:** managed PostgreSQL with Alembic migrations, encrypted backups, PITR, and least-privilege DB accounts.
- **Identity:** vetted identity provider (passkeys/MFA, recovery, reauthentication) rather than exposing this prototype authentication layer to real investors.
- **Accounts/brokerage:** licensed broker API provider with OAuth/account linking, appropriate approvals, and partner-run KYC/AML. No routing credentials through the frontend.
- **Actual proxy voting:** authorized voting integrations / broker-provided mechanisms, distinguished from community sentiment polling.
- **Real-world property/private business:** regulated offering workflows, legal entities, investor eligibility, disclosures, signed documents, capital calls, tax reporting, and custody with approved partners.
- **AI research:** retrieval from issuer filings and licensed data sources, citations and dates, confidence/uncertainty labeling, human moderation, documented content provenance, prohibition on unapproved personalized advice.

See `docs/PRODUCT_SPEC.md`, `docs/SECURITY_AND_REGULATORY_GATES.md`, and `docs/CURSOR_HANDOFF.md` for architecture, functional requirements and the next engineering tasks.

## Security note

Prototype defaults (SQLite + locally seeded data, basic auth, no rate limits/MFA/email verification) are suitable for development only. **Do not deploy to the public with real user data without a security review and production hardening.** Passwords use scrypt, authenticated mutating endpoints require CSRF token, origin checks apply, votes require membership, and no private banking credentials are accepted. For production hardening you must add email verification, login abuse controls, MFA, database migrations, observability, privacy controls, secrets management, DR tests, and professional pen testing.

## API examples

- `GET /api/health`
- `POST /api/auth/demo`
- `POST /api/auth/register` / `POST /api/auth/login` / `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/communities` / `GET /api/communities/{slug}` / `POST /api/communities`
- `POST /api/communities/{slug}/invites` (owner only) / `POST /api/invites/{code}/accept`
- `POST /api/communities/{slug}/join` / `.../leave`
- `GET /api/proposals` / `POST /api/communities/{slug}/proposals`
- `POST /api/proposals/{proposal_id}/vote` (**nonbinding community opinion only**)
- `GET /api/watchlist` / `POST /api/watchlist` / `DELETE /api/watchlist/{ticker}`
- `GET /api/activity` / `GET /api/safety`

Authenticated write requests include the CSRF token returned by `/api/me` or login in the `X-CSRF-Token` header.

## Group growth lab (new)

Choose **Fund builder** after demo login, or open a community and choose **Explore group fund lab**. Group creators can adjust three **hypothetical** assumptions: a one-time example amount per member, example new members per month, and simulation months. The server stores each group's scenario and recalculates it using the actual number of members in that research community. The results do **not** indicate actual assets under management (AUM), legal investors, funds raised, returns, performance, deposits, commitments, securities or ownership percentages. Market returns are deliberately **zero**. Private-group scenarios are visible only to invited group members.

**Why:** A founder can see a small group grow toward hypothetical $100K / $1M / $10M / $100M educational scale milestones, alongside explanations of why each stage requires more governance and, when money becomes real, legal and regulatory work. These tiers are **not statutory thresholds**.

Endpoints: `GET /api/communities/{slug}/fund-lab` (members or public-community visitors), `PUT /api/communities/{slug}/fund-lab` (owner only, CSRF required).

## Primary-source company research (new)

The stock demo optionally retrieves SEC EDGAR company facts for TSLA, AAPL, MSFT, NVDA and AMZN. It does **not** retrieve stock prices. Facts contain accession, SEC filing form, date filed, reporting-period end, unit, and SEC XBRL taxonomy tag. Periods can differ, so numbers are not treated as directly comparable across companies or fiscal windows. SEC says this data is available without API keys, but automated retrieval requires a declared company/user-agent contact and moderate requests; here snapshots cache for 6 hours.

For optional live SEC research, set an environment variable with an organization and **your own monitored contact email**:

```bash
export SEC_USER_AGENT='COMMON Research contact@your-domain.example'
```

Do not use the example address verbatim. Without this configuration, the app links to official SEC filings and declines to invent financial figures. See <https://www.sec.gov/search-filings/edgar-application-programming-interfaces> and <https://www.sec.gov/about/webmaster-frequently-asked-questions>.

## Before any public beta

The original starter's authentication is a development prototype (no verified-email registration, MFA, abuse-resistant login, privacy-management workflow or professional security review). Do not expose it as a public app holding real user accounts until those gaps, permanent data storage, legal notices and moderation are addressed. No live investment operations are included.
