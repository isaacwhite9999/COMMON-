"""COMMON prototype API: no trading, custody, fundraising, or live proxy submission."""
from __future__ import annotations
import hashlib
import hmac
import os
import re
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession, sessionmaker

from .models import Base, User, Session, Community, Membership, Proposal, PollVote, Watch, AuditEvent, Invite, FundLabPlan
from .seed import seed
from .edgar import COMPANIES, company_snapshot

ROOT = Path(__file__).resolve().parent.parent
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///" + str(ROOT / "common_dev.sqlite3"))
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
SESSION_DAYS = 7
COOKIE = "common_session"


def public_preview_only() -> bool:
    """Read at request time so test deployments can control the preview gate."""
    return os.environ.get("PUBLIC_PREVIEW_ONLY", "false").strip().lower() == "true"

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield

app = FastAPI(title="COMMON Ownership Network", version="0.1.0", lifespan=lifespan,
    docs_url="/api/docs" if os.environ.get("ENABLE_API_DOCS", "true") == "true" else None,
    openapi_url="/api/openapi.json" if os.environ.get("ENABLE_API_DOCS", "true") == "true" else None)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        allowed = os.environ.get("PUBLIC_ORIGIN", str(request.base_url).rstrip("/"))
        if origin and origin.rstrip("/") != allowed.rstrip("/"):
            return Response("Cross-origin write requests are not allowed", status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    return response


def db_dep():
    with SessionLocal() as db:
        yield db

Db = Annotated[DbSession, Depends(db_dep)]


def sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = stored.split("$")
        if algorithm != "scrypt":
            return False
        candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=16384, r=8, p=1)
        return hmac.compare_digest(candidate, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


def login_user(response: Response, db: DbSession, user: User) -> str:
    token = secrets.token_urlsafe(48)
    csrf_token = secrets.token_urlsafe(36)
    db.add(Session(user_id=user.id, token_hash=sha(token), csrf_token=csrf_token,
                   expires_at=datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)))
    db.commit()
    response.set_cookie(key=COOKIE, value=token, httponly=True, samesite="lax",
                        secure=os.environ.get("SECURE_COOKIES", "false") == "true",
                        max_age=SESSION_DAYS * 86400, path="/")
    return csrf_token


def authenticated(request: Request, db: Db) -> tuple[User, Session]:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "Sign in to continue")
    session = db.scalar(select(Session).where(Session.token_hash == sha(token)))
    if not session or session.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Account unavailable")
    return user, session

Auth = Annotated[tuple[User, Session], Depends(authenticated)]


def require_write(request: Request, auth: Auth):
    if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), auth[1].csrf_token):
        raise HTTPException(403, "Missing or invalid CSRF token")
    return auth[0]

WriteUser = Annotated[User, Depends(require_write)]


def user_json(u: User, csrf: str):
    return {"id": u.id, "name": u.name, "email": u.email, "demo": u.demo, "csrf": csrf}


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProposalRequest(BaseModel):
    title: str = Field(min_length=12, max_length=160)
    body: str = Field(min_length=40, max_length=4000)
    topic: str
    @field_validator("topic")
    @classmethod
    def allowed_topic(cls, v):
        if v not in {"RESEARCH", "EDUCATION", "GOVERNANCE", "OWNERSHIP"}:
            raise ValueError("Invalid discussion topic")
        return v


class VoteRequest(BaseModel):
    choice: str
    @field_validator("choice")
    @classmethod
    def allowed_choice(cls, v):
        if v not in {"SUPPORT", "OPPOSE", "ABSTAIN"}:
            raise ValueError("Invalid poll choice")
        return v


class CommunityRequest(BaseModel):
    name: str = Field(min_length=4, max_length=80)
    description: str = Field(min_length=30, max_length=600)
    category: str
    visibility: str = "PRIVATE"
    symbol: str | None = Field(default=None, max_length=12)
    @field_validator("category")
    @classmethod
    def valid_category(cls, v):
        if v not in {"PUBLIC_EQUITY", "HOUSING", "BUSINESS"}:
            raise ValueError("Invalid category")
        return v
    @field_validator("visibility")
    @classmethod
    def valid_visibility(cls, v):
        if v not in {"PUBLIC", "PRIVATE"}:
            raise ValueError("Invalid visibility")
        return v
    @field_validator("symbol")
    @classmethod
    def valid_symbol(cls, v):
        if v is None or not v.strip():
            return None
        v = v.strip().upper()
        if not re.fullmatch(r"[A-Z][A-Z0-9.\-]{0,11}", v):
            raise ValueError("Invalid ticker symbol")
        return v


class WatchRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    @field_validator("symbol")
    @classmethod
    def safe_symbol(cls, v):
        v = v.strip().upper()
        if not re.fullmatch(r"[A-Z][A-Z0-9.\-]{0,11}", v):
            raise ValueError("Invalid ticker symbol")
        return v


class FundLabRequest(BaseModel):
    # These are hypothetical numbers for learning; never solicited commitments or balances.
    contribution_example: int = Field(ge=0, le=1000000)
    new_members_example: int = Field(ge=0, le=10000)
    months_example: int = Field(ge=1, le=120)


def fund_plan_json(community: Community, db: DbSession):
    member_count = db.scalar(select(func.count(Membership.id)).where(Membership.community_id == community.id)) or 0
    plan = db.scalar(select(FundLabPlan).where(FundLabPlan.community_id == community.id))
    contribution = plan.contribution_example if plan else 100
    recruits = plan.new_members_example if plan else 5
    months = plan.months_example if plan else 12
    # This projection deliberately excludes all market returns and trading activity.
    # No real member is assumed to have paid or promised anything.
    sample_total_members = member_count + recruits * months
    sample_total = sample_total_members * contribution
    return {
        "community_slug": community.slug,
        "group_members": member_count,
        "contribution_example": contribution,
        "new_members_example": recruits,
        "months_example": months,
        "hypothetical_members": sample_total_members,
        "hypothetical_capital": sample_total,
        "real_money_collected": 0,
        "mode": "EDUCATIONAL_SIMULATION",
        "notice": "All financial amounts are hypothetical examples only; no money, investment interests, commitments, performance or fund assets exist here. No returns are assumed."
    }


def visible_community(slug: str, user: User, db: DbSession):
    community = db.scalar(select(Community).where(Community.slug == slug))
    if not community:
        raise HTTPException(404, "Community not found")
    member = db.scalar(select(Membership.id).where(Membership.community_id == community.id, Membership.user_id == user.id))
    if community.visibility == "PRIVATE" and not member:
        raise HTTPException(404, "Community not found")
    return community


def audit(db: DbSession, user: User, action: str, entity_type: str, entity_id: str):
    db.add(AuditEvent(actor_id=user.id, action=action, entity_type=entity_type, entity_id=entity_id))


@app.get("/api/research/companies")
def list_research_companies():
    return {"items": [{"symbol": symbol, "company_name": name} for symbol, (_, name) in COMPANIES.items()],
            "source": "SEC EDGAR public filings", "price_quotes_included": False}


@app.get("/api/research/companies/{symbol}")
def research_company(symbol: str, auth: Auth):
    if symbol.upper() not in COMPANIES:
        raise HTTPException(404, "This research preview has not been configured for that company")
    return company_snapshot(symbol.upper())


@app.get("/api/config")
def public_config():
    return {"public_preview_only": public_preview_only(),
            "data_persistence": "temporary" if public_preview_only() else "deployment-dependent",
            "real_money_enabled": False}


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "research-and-community-only", "real_money_enabled": False}


@app.post("/api/auth/demo")
def demo_login(response: Response, db: Db):
    user = User(name="Joe", demo=True)
    db.add(user)
    db.flush()
    intro = db.scalar(select(Community).where(Community.slug == "tesla-shareholders"))
    if intro:
        db.add(Membership(user_id=user.id, community_id=intro.id))
    db.commit()
    csrf = login_user(response, db, user)
    return {"user": user_json(user, csrf)}


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest, response: Response, db: Db):
    if public_preview_only():
        raise HTTPException(403, "Public preview only: use Explore interactive demo. Real accounts are not enabled.")
    email = str(payload.email).lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), demo=False)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered")
    csrf = login_user(response, db, user)
    return {"user": user_json(user, csrf)}


@app.post("/api/auth/login")
def login(payload: LoginRequest, response: Response, db: Db):
    if public_preview_only():
        raise HTTPException(403, "Public preview only: use Explore interactive demo. Real accounts are not enabled.")
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    csrf = login_user(response, db, user)
    return {"user": user_json(user, csrf)}


@app.get("/api/me")
def me(auth: Auth):
    return {"user": user_json(auth[0], auth[1].csrf_token)}


@app.post("/api/auth/logout")
def logout(response: Response, auth: Auth, user: WriteUser, db: Db):
    db.delete(auth[1]); db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


def community_json(c: Community, db: DbSession, user_id: str | None = None):
    count = db.scalar(select(func.count()).select_from(Membership).where(Membership.community_id == c.id)) or 0
    joined = bool(user_id and db.scalar(select(Membership.id).where(Membership.community_id == c.id, Membership.user_id == user_id)))
    return {"id": c.id, "slug": c.slug, "name": c.name, "description": c.description, "category": c.category,
            "symbol": c.symbol, "icon": c.icon, "featured": c.featured, "sample": c.sample, "members": count, "joined": joined,
            "owner": bool(user_id and c.owner_id == user_id), "visibility": c.visibility}


def proposal_json(p: Proposal, db: DbSession, user_id: str | None = None):
    community = db.get(Community, p.community_id)
    author = db.get(User, p.author_id)
    votes = db.execute(select(PollVote.choice, func.count(PollVote.id)).where(PollVote.proposal_id == p.id).group_by(PollVote.choice)).all()
    mine = db.scalar(select(PollVote.choice).where(PollVote.proposal_id == p.id, PollVote.user_id == user_id)) if user_id else None
    return {"id": p.id, "title": p.title, "body": p.body, "topic": p.topic, "community_slug": community.slug,
            "community_name": community.name, "author": author.name, "created_at": p.created_at.isoformat(), "sample": p.sample,
            "poll_counts": {"SUPPORT": next((n for c,n in votes if c == "SUPPORT"), 0),
                            "OPPOSE": next((n for c,n in votes if c == "OPPOSE"), 0),
                            "ABSTAIN": next((n for c,n in votes if c == "ABSTAIN"), 0)}, "my_vote": mine}


@app.get("/api/communities")
def communities(db: Db, auth: Auth):
    user, _ = auth
    all_communities = db.scalars(select(Community).where(
        (Community.visibility == "PUBLIC") | (Community.id.in_(select(Membership.community_id).where(Membership.user_id == user.id)))
    ).order_by(Community.featured.desc(), Community.name)).all()
    return {"items": [community_json(c, db, user.id) for c in all_communities]}


@app.post("/api/communities", status_code=201)
def create_community(payload: CommunityRequest, user: WriteUser, db: Db):
    # Prototype abuse control: limit the number of groups one account can create.
    n = db.scalar(select(func.count()).select_from(Community).where(Community.owner_id == user.id)) or 0
    if n >= 10:
        raise HTTPException(429, "Maximum of 10 groups per account in this prototype")
    slug = re.sub(r"[^a-z0-9]+", "-", payload.name.lower()).strip("-")[:65] + "-" + uuid4().hex[:8]
    c = Community(slug=slug, name=payload.name.strip(), description=payload.description.strip(),
                  category=payload.category, symbol=payload.symbol, icon={"PUBLIC_EQUITY":"chart","HOUSING":"building","BUSINESS":"store"}[payload.category],
                  featured=False, sample=False, owner_id=user.id, visibility=payload.visibility)
    db.add(c); db.flush()
    db.add(Membership(community_id=c.id, user_id=user.id, role="OWNER"))
    audit(db, user, "COMMUNITY_CREATE", "community", c.id)
    db.commit()
    return {"community": community_json(c, db, user.id)}


@app.post("/api/communities/{slug}/invites", status_code=201)
def generate_invite(slug: str, user: WriteUser, db: Db):
    c = db.scalar(select(Community).where(Community.slug == slug))
    if not c or c.owner_id != user.id:
        raise HTTPException(403, "Only the community owner can invite members")
    code = secrets.token_urlsafe(32)
    invite = Invite(community_id=c.id, code_hash=sha(code),
                    expires_at=datetime.now(timezone.utc)+timedelta(days=30), max_uses=50, uses=0)
    db.add(invite); db.flush()
    audit(db, user, "INVITE_CREATE", "community", c.id)
    db.commit()
    return {"code":code, "expires_days":30, "max_uses":50, "notice":"This grants access to a discussion group only, never financial accounts or assets."}


@app.post("/api/invites/{code}/accept")
def accept_invite(code: str, user: WriteUser, db: Db):
    i = db.scalar(select(Invite).where(Invite.code_hash == sha(code)))
    if not i or i.revoked or i.uses >= i.max_uses or i.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(404, "Invitation invalid or expired")
    c = db.get(Community, i.community_id)
    exists = db.scalar(select(Membership.id).where(Membership.community_id == c.id, Membership.user_id == user.id))
    if not exists:
        db.add(Membership(community_id=c.id, user_id=user.id))
        i.uses += 1
        audit(db, user, "INVITE_ACCEPT", "community", c.id)
        db.commit()
    return {"community": community_json(c, db, user.id)}


@app.get("/api/communities/{slug}")
def community_detail(slug: str, db: Db, auth: Auth):
    user, _ = auth
    c = db.scalar(select(Community).where(Community.slug == slug))
    if not c or (c.visibility == "PRIVATE" and not db.scalar(select(Membership.id).where(
        Membership.community_id == c.id, Membership.user_id == user.id))):
        raise HTTPException(404, "Community not found")
    proposals = db.scalars(select(Proposal).where(Proposal.community_id == c.id).order_by(Proposal.created_at.desc())).all()
    return {"community": community_json(c, db, user.id), "proposals": [proposal_json(p, db, user.id) for p in proposals]}


@app.get("/api/communities/{slug}/fund-lab")
def get_fund_lab(slug: str, auth: Auth, db: Db):
    c = visible_community(slug, auth[0], db)
    return {"plan": fund_plan_json(c, db), "can_edit": c.owner_id == auth[0].id}


@app.put("/api/communities/{slug}/fund-lab")
def update_fund_lab(slug: str, payload: FundLabRequest, user: WriteUser, db: Db):
    c = visible_community(slug, user, db)
    if c.owner_id != user.id:
        raise HTTPException(403, "Only the group creator can change the hypothetical plan")
    plan = db.scalar(select(FundLabPlan).where(FundLabPlan.community_id == c.id))
    if plan is None:
        plan = FundLabPlan(community_id=c.id)
        db.add(plan)
    plan.contribution_example = payload.contribution_example
    plan.new_members_example = payload.new_members_example
    plan.months_example = payload.months_example
    plan.updated_at = datetime.now(timezone.utc)
    audit(db, user, "FUND_LAB_PLAN_UPDATE", "community", c.id)
    db.commit()
    return {"plan": fund_plan_json(c, db), "can_edit": True}


@app.post("/api/communities/{slug}/join")
def join(slug: str, user: WriteUser, db: Db):
    c = db.scalar(select(Community).where(Community.slug == slug))
    if not c:
        raise HTTPException(404, "Community not found")
    if c.visibility == "PRIVATE":
        raise HTTPException(403, "Private communities require an invitation")
    exists = db.scalar(select(Membership.id).where(Membership.community_id == c.id, Membership.user_id == user.id))
    if not exists:
        db.add(Membership(community_id=c.id, user_id=user.id))
        audit(db, user, "COMMUNITY_JOIN", "community", c.id)
        db.commit()
    return {"community": community_json(c, db, user.id)}


@app.post("/api/communities/{slug}/leave")
def leave(slug: str, user: WriteUser, db: Db):
    c = db.scalar(select(Community).where(Community.slug == slug))
    if not c:
        raise HTTPException(404, "Community not found")
    m = db.scalar(select(Membership).where(Membership.community_id == c.id, Membership.user_id == user.id))
    if c.owner_id == user.id:
        raise HTTPException(403, "Owner cannot leave until ownership is transferred")
    if m:
        db.delete(m)
        audit(db, user, "COMMUNITY_LEAVE", "community", c.id)
        db.commit()
    return {"community": community_json(c, db, user.id)}


@app.get("/api/proposals")
def proposals(db: Db, auth: Auth):
    user, _ = auth
    allowed = select(Community.id).where(
        (Community.visibility == "PUBLIC") | (Community.id.in_(select(Membership.community_id).where(Membership.user_id == user.id)))
    )
    rows = db.scalars(select(Proposal).where(Proposal.community_id.in_(allowed)).order_by(Proposal.created_at.desc()).limit(100)).all()
    return {"items": [proposal_json(p, db, user.id) for p in rows]}


@app.post("/api/communities/{slug}/proposals", status_code=201)
def create_proposal(slug: str, payload: ProposalRequest, user: WriteUser, db: Db):
    c = db.scalar(select(Community).where(Community.slug == slug))
    if not c:
        raise HTTPException(404, "Community not found")
    if not db.scalar(select(Membership.id).where(Membership.community_id == c.id, Membership.user_id == user.id)):
        raise HTTPException(403, "Join the community before posting")
    p = Proposal(community_id=c.id, author_id=user.id, title=payload.title.strip(), body=payload.body.strip(), topic=payload.topic)
    db.add(p); db.flush()
    audit(db, user, "PROPOSAL_CREATE", "proposal", p.id)
    db.commit()
    return {"proposal": proposal_json(p, db, user.id)}


@app.post("/api/proposals/{proposal_id}/vote")
def vote(proposal_id: str, payload: VoteRequest, user: WriteUser, db: Db):
    p = db.get(Proposal, proposal_id)
    if not p:
        raise HTTPException(404, "Discussion not found")
    if not db.scalar(select(Membership.id).where(Membership.community_id == p.community_id, Membership.user_id == user.id)):
        raise HTTPException(403, "Join the community to participate")
    v = db.scalar(select(PollVote).where(PollVote.proposal_id == p.id, PollVote.user_id == user.id))
    if v:
        v.choice = payload.choice
    else:
        db.add(PollVote(proposal_id=p.id, user_id=user.id, choice=payload.choice))
    audit(db, user, "DISCUSSION_POLL_VOTE", "proposal", p.id)
    db.commit()
    return {"proposal": proposal_json(p, db, user.id), "notice": "Community opinion only. Not an actual proxy vote or investment order."}


@app.get("/api/watchlist")
def get_watches(db: Db, auth: Auth):
    return {"symbols": [w.symbol for w in db.scalars(select(Watch).where(Watch.user_id == auth[0].id).order_by(Watch.symbol))]}


@app.post("/api/watchlist", status_code=201)
def add_watch(payload: WatchRequest, user: WriteUser, db: Db):
    exists = db.scalar(select(Watch.id).where(Watch.user_id == user.id, Watch.symbol == payload.symbol))
    if not exists:
        w = Watch(user_id=user.id, symbol=payload.symbol)
        db.add(w); db.flush(); audit(db, user, "WATCH_ADD", "watch", w.id); db.commit()
    return {"symbol": payload.symbol, "tracking_only": True}


@app.delete("/api/watchlist/{symbol}")
def delete_watch(symbol: str, user: WriteUser, db: Db):
    symbol = symbol.upper()
    w = db.scalar(select(Watch).where(Watch.user_id == user.id, Watch.symbol == symbol))
    if w:
        audit(db, user, "WATCH_REMOVE", "watch", w.id); db.delete(w); db.commit()
    return {"ok": True}


@app.get("/api/activity")
def activity(db: Db, auth: Auth):
    rows = db.scalars(select(AuditEvent).where(AuditEvent.actor_id == auth[0].id).order_by(AuditEvent.created_at.desc()).limit(20)).all()
    return {"items": [{"action": a.action, "entity_type": a.entity_type, "created_at": a.created_at.isoformat()} for a in rows]}


@app.get("/api/safety")
def safety():
    return {"status": "prototype", "enabled": ["education", "community membership", "nonbinding discussion polls", "watchlists", "research proposals"],
            "disabled": ["order entry", "account linking", "stock holdings verification", "pooled fund deposits", "custody", "proxy submission", "private offerings", "property acquisition"],
            "notice": "This prototype does not provide brokerage services, investment advice, funds custody, or shareholder proxy execution."}


app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

@app.get("/")
def home():
    return FileResponse(ROOT / "static" / "index.html")
