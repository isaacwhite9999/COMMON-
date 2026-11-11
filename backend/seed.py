"""Fictional, clearly labeled sample data for local product exploration."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import User, Community, Proposal

SAMPLE_COMMUNITIES = [
    ("tesla-shareholders", "Tesla Shareholders", "PUBLIC_EQUITY", "TSLA", "zap", "Research the company, understand proxy materials, and discuss shareholder governance.", True),
    ("neighborhood-housing", "Neighborhood Housing", "HOUSING", None, "building", "Explore cooperative housing, community land trusts, and responsible ownership structures.", True),
    ("main-street-owners", "Main Street Owners", "BUSINESS", None, "store", "Learn about employee ownership, business acquisitions, and community investment.", False),
    ("index-fund-learners", "Long-Term Investors", "PUBLIC_EQUITY", None, "chart", "Compare diversification approaches, fees, time horizons, and market risks.", False),
]

SAMPLE_PROPOSALS = [
    ("tesla-shareholders", "What should retail shareholders know before the next proxy vote?", "GOVERNANCE", "Let's compare the actual proxy statement, board recommendations, and independent arguments. We should publish a neutral explanation of each resolution before discussing positions."),
    ("tesla-shareholders", "Create an easy-to-read earnings research brief", "RESEARCH", "A member-written primer covering revenue, cash flow, margins, and major risks. No coordinated trading recommendations or price targets."),
    ("neighborhood-housing", "Explore community land trusts for housing", "OWNERSHIP", "How could a community land trust keep property affordable while giving residents meaningful control? Compare financing structures, maintenance reserves, and resident governance."),
    ("main-street-owners", "How employee buyouts can preserve local businesses", "OWNERSHIP", "Research succession options when a neighborhood business owner plans to retire. What would a worker cooperative need to make an acquisition responsible?"),
    ("index-fund-learners", "What is the real cost of fund fees?", "EDUCATION", "Compare expense ratios using hypothetical examples and explain why risk tolerance and diversification matter."),
]


def seed(db: Session):
    if db.scalar(select(Community.id).limit(1)) is not None:
        return
    sample_author = User(name="Common Research Desk", email=None, demo=True)
    db.add(sample_author)
    db.flush()
    for slug, name, category, symbol, icon, description, featured in SAMPLE_COMMUNITIES:
        db.add(Community(slug=slug, name=name, category=category, symbol=symbol, icon=icon, description=description, featured=featured, sample=True))
    db.flush()
    by_slug = {c.slug: c for c in db.scalars(select(Community)).all()}
    for slug, title, topic, body in SAMPLE_PROPOSALS:
        db.add(Proposal(community_id=by_slug[slug].id, author_id=sample_author.id, title=title, topic=topic, body=body, sample=True))
    db.commit()
