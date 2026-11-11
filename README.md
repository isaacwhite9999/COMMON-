# COMMON — The Ownership Network

COMMON is a community-first financial education and research platform designed to help everyday people form investment research groups, understand public companies, explore shareholder rights, and imagine collective ownership of housing and businesses.

## Demo features

- Public and private communities, invitations, research posts, and nonbinding discussion polls
- Stock watchlists and SEC EDGAR research connection (when configured)
- Educational fund-growth scenarios with transparent assumptions and sample data
- Guided previews of investing, collective housing ownership, business acquisitions, and shareholder governance
- Plain-English explanations for investors new to financial markets

**Important:** This is an educational software prototype—not a live brokerage, investment adviser, crowdfunding portal, securities offering, or regulated investment fund. No real money, trading, custody, verified share ownership, or binding proxy votes. Demo returns and capital figures are hypothetical.

## Local development

Install Python 3.11+ then:

```bash
pip install -r requirements.txt
uvicorn backend.app:app --reload
pytest -q
```

Visit http://localhost:8000. Never expose the development SQLite database to the public. Review security and compliance gates before deploying live user accounts.

## Stack

FastAPI, SQLAlchemy, vanilla JS and CSS, HTML, Python test suite.

## Production caveats

The app needs persistent PostgreSQL, verified accounts, email delivery, backup/restore, rate limiting, secure session management, security audit, moderation, and operational monitoring before inviting public users. Read docs/SECURITY_AND_REGULATORY_GATES.md.

All source code belongs to the COMMON project. No open-source license has been granted yet.
