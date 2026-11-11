"""Tests for isolation, membership guards, CSRF, polls, and side-effect boundaries."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend import app as backend


@pytest.fixture
def client(tmp_path, monkeypatch):
    url = "sqlite:///" + str(tmp_path / "tests.sqlite3")
    test_engine = create_engine(url, connect_args={"check_same_thread": False})
    monkeypatch.setattr(backend, "engine", test_engine)
    monkeypatch.setattr(backend, "SessionLocal", sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False))
    with TestClient(backend.app) as c:
        yield c
    test_engine.dispose()


def demo(client):
    r=client.post('/api/auth/demo')
    assert r.status_code==200, r.text
    assert r.json()['user']['demo'] is True
    return {'X-CSRF-Token': r.json()['user']['csrf']}


def test_website_and_health(client):
    r=client.get('/')
    assert r.status_code==200
    assert 'COMMON' in r.text
    status=client.get('/api/health').json()
    assert status['real_money_enabled'] is False
    assert client.get('/api/safety').json()['status']=='prototype'


def test_private_endpoints_require_session(client):
    assert client.get('/api/communities').status_code==401
    assert client.get('/api/proposals').status_code==401
    assert client.post('/api/auth/logout').status_code==401


def test_demo_end_to_end(client):
    h=demo(client)
    me=client.get('/api/me')
    assert me.status_code==200
    assert me.json()['user']['csrf']==h['X-CSRF-Token']
    comms=client.get('/api/communities').json()['items']
    assert len(comms)==4
    assert next(c for c in comms if c['slug']=='tesla-shareholders')['joined']
    # Posts require CSRF token and joined membership.
    proposal={'title':'Research Tesla corporate governance', 'body':'Please review the latest proxy statement and compare the governance proposals and potential risks carefully.', 'topic':'GOVERNANCE'}
    assert client.post('/api/communities/tesla-shareholders/proposals',json=proposal).status_code==403
    r=client.post('/api/communities/tesla-shareholders/proposals',json=proposal,headers=h)
    assert r.status_code==201, r.text
    p=r.json()['proposal']
    assert p['sample'] is False
    assert p['poll_counts']['SUPPORT']==0
    voting=client.post(f"/api/proposals/{p['id']}/vote",json={'choice':'SUPPORT'},headers=h)
    assert voting.status_code==200, voting.text
    assert voting.json()['proposal']['poll_counts']['SUPPORT']==1
    assert 'not an actual proxy' in voting.json()['notice'].lower()
    # Updating choice must not create multiple votes.
    voting=client.post(f"/api/proposals/{p['id']}/vote",json={'choice':'OPPOSE'},headers=h)
    assert voting.status_code==200
    assert voting.json()['proposal']['poll_counts']['SUPPORT']==0
    assert voting.json()['proposal']['poll_counts']['OPPOSE']==1
    assert len(client.get('/api/activity').json()['items'])>=3
    # Watchlist does not submit any orders.
    r=client.post('/api/watchlist',json={'symbol':'tsla'},headers=h)
    assert r.status_code==201 and r.json()['tracking_only'] is True
    assert client.get('/api/watchlist').json()['symbols']==['TSLA']
    assert client.delete('/api/watchlist/TSLA',headers=h).status_code==200
    assert client.get('/api/watchlist').json()['symbols']==[]
    assert client.post('/api/auth/logout',headers=h).status_code==200
    assert client.get('/api/me').status_code==401


def test_membership_gate_and_input_validation(client):
    h=demo(client)
    sample=next(p for p in client.get('/api/proposals').json()['items'] if p['community_slug']=='neighborhood-housing')
    assert client.post(f"/api/proposals/{sample['id']}/vote",json={'choice':'SUPPORT'},headers=h).status_code==403
    assert client.post('/api/communities/neighborhood-housing/join',headers=h).status_code==200
    assert client.post(f"/api/proposals/{sample['id']}/vote",json={'choice':'SUPPORT'},headers=h).status_code==200
    assert client.post(f"/api/proposals/{sample['id']}/vote",json={'choice':'BUY'},headers=h).status_code==422
    assert client.post('/api/watchlist',json={'symbol':'FOO<script>'},headers=h).status_code==422
    assert client.post('/api/communities/neighborhood-housing/leave',headers=h).status_code==200
    assert client.post(f"/api/proposals/{sample['id']}/vote",json={'choice':'SUPPORT'},headers=h).status_code==403


def test_password_auth_and_bad_credentials(client):
    body={'name':'Test Member','email':'TEST@EXAMPLE.COM','password':'long-password-2026'}
    r=client.post('/api/auth/register',json=body)
    assert r.status_code==201, r.text
    assert r.json()['user']['email']=='test@example.com'
    assert client.post('/api/auth/register',json=body).status_code==409
    assert client.post('/api/auth/logout',headers={'X-CSRF-Token':r.json()['user']['csrf']}).status_code==200
    assert client.post('/api/auth/login',json={'email':'test@example.com','password':'bad-password'}).status_code==401
    r=client.post('/api/auth/login',json={'email':'test@example.com','password':body['password']})
    assert r.status_code==200


def test_origin_rejected(client):
    assert client.post('/api/auth/demo',headers={'Origin':'https://evil.example'}).status_code==403


def test_unauthenticated_user_cannot_change_votes(client):
    h=demo(client)
    p=client.get('/api/proposals').json()['items'][0]
    client.post('/api/auth/logout',headers=h)
    assert client.post(f"/api/proposals/{p['id']}/vote",headers=h,json={'choice':'SUPPORT'}).status_code==401


def test_private_group_invites_are_authorized_and_isolated(client):
    owner_h=demo(client)
    create={"name":"The Local Forty","description":"A private group of friends who study listed companies and ownership rights without pooling funds.","category":"PUBLIC_EQUITY","visibility":"PRIVATE"}
    r=client.post('/api/communities',headers=owner_h,json=create)
    assert r.status_code==201, r.text
    c=r.json()['community'];slug=c['slug']
    assert c['owner'] and c['visibility']=='PRIVATE' and c['joined']
    inv=client.post(f'/api/communities/{slug}/invites',headers=owner_h)
    assert inv.status_code==201
    code=inv.json()['code']
    # A different member must not be able to enumerate, post into or freely join a private group.
    client.post('/api/auth/logout',headers=owner_h)
    member_h=demo(client)
    assert slug not in [g['slug'] for g in client.get('/api/communities').json()['items']]
    assert client.get(f'/api/communities/{slug}').status_code==404
    assert client.post(f'/api/communities/{slug}/join',headers=member_h).status_code==403
    assert client.post(f'/api/communities/{slug}/invites',headers=member_h).status_code==403
    accepted=client.post(f'/api/invites/{code}/accept',headers=member_h)
    assert accepted.status_code==200
    assert accepted.json()['community']['joined']
    assert client.get(f'/api/communities/{slug}').status_code==200
    assert slug in [g['slug'] for g in client.get('/api/communities').json()['items']]
    assert client.post(f'/api/invites/{code}/accept',headers=member_h).status_code==200
    # Distinct community members can leave while the owner cannot.
    assert client.post(f'/api/communities/{slug}/leave',headers=member_h).status_code==200
    assert client.get(f'/api/communities/{slug}').status_code==404
    assert client.post('/api/invites/not-a-real-code/accept',headers=member_h).status_code==404


def test_private_proposals_do_not_leak_to_nonmembers(client):
    h=demo(client)
    payload={"name":"Private Housing Ideas","description":"A gated community for educational conversations about local housing cooperatives.","category":"HOUSING","visibility":"PRIVATE"}
    c=client.post('/api/communities',headers=h,json=payload).json()['community']
    post={"title":"Private report on the local housing opportunity","body":"We will compare resident control, upkeep costs and different affordable housing trust structures.","topic":"OWNERSHIP"}
    r=client.post(f"/api/communities/{c['slug']}/proposals",headers=h,json=post)
    assert r.status_code==201
    p_id=r.json()['proposal']['id']
    client.post('/api/auth/logout',headers=h)
    other=demo(client)
    assert p_id not in [p['id'] for p in client.get('/api/proposals').json()['items']]
    assert client.post(f'/api/proposals/{p_id}/vote',headers=other,json={'choice':'SUPPORT'}).status_code==403


def test_fund_lab_is_hypothetical_owner_editable_and_persistent(client):
    h = demo(client)
    payload={"name":"Our Fifty Friends Lab","description":"We study local businesses and public shares as a research group, with no real fundraising.","category":"PUBLIC_EQUITY","visibility":"PRIVATE"}
    c=client.post('/api/communities', headers=h, json=payload).json()['community']
    slug=c['slug']
    initial=client.get(f'/api/communities/{slug}/fund-lab')
    assert initial.status_code==200
    p=initial.json()['plan']
    assert p['group_members']==1 and p['real_money_collected']==0
    assert p['mode']=='EDUCATIONAL_SIMULATION'
    updated=client.put(f'/api/communities/{slug}/fund-lab', headers=h,
        json={'contribution_example':200,'new_members_example':4,'months_example':10})
    assert updated.status_code==200, updated.text
    updated_plan=updated.json()['plan']
    assert updated_plan['hypothetical_members']==41
    assert updated_plan['hypothetical_capital']==8200
    assert client.get(f'/api/communities/{slug}/fund-lab').json()['plan']==updated_plan
    assert client.put(f'/api/communities/{slug}/fund-lab', headers=h,
        json={'contribution_example':-50,'new_members_example':4,'months_example':10}).status_code==422
    invite=client.post(f'/api/communities/{slug}/invites',headers=h).json()['code']
    client.post('/api/auth/logout',headers=h)
    other_h=demo(client)
    assert client.get(f'/api/communities/{slug}/fund-lab').status_code==404
    assert client.put(f'/api/communities/{slug}/fund-lab',headers=other_h,
        json={'contribution_example':1,'new_members_example':1,'months_example':1}).status_code==404
    assert client.post(f'/api/invites/{invite}/accept',headers=other_h).status_code==200
    assert client.get(f'/api/communities/{slug}/fund-lab').json()['plan']['group_members']==2
    assert client.put(f'/api/communities/{slug}/fund-lab',headers=other_h,
        json={'contribution_example':1,'new_members_example':1,'months_example':1}).status_code==403
    assert client.get(f'/api/communities/{slug}/fund-lab').json()['plan']['hypothetical_capital']==(2+40)*200



def test_sec_research_is_primary_source_not_market_price(client, monkeypatch):
    from backend.edgar import pick_fact
    assert client.get('/api/research/companies').status_code == 200
    h = demo(client)
    monkeypatch.delenv('SEC_USER_AGENT', raising=False)
    r = client.get('/api/research/companies/TSLA')
    assert r.status_code == 200
    data = r.json()
    assert data['status'] == 'not_configured'
    assert data['live_stock_quote'] is False
    assert 'sec.gov' in data['filing_page']
    assert client.get('/api/research/companies/BAD').status_code == 404
    fact=pick_fact({'NetIncomeLoss':{'units':{'USD':[
        {'form':'10-K','filed':'2025-02-01','end':'2024-12-31','val':100},
        {'form':'10-Q','filed':'2026-05-01','end':'2026-03-31','val':200}
    ]}}}, ['NetIncomeLoss'])
    assert fact['value']==200 and fact['period_end']=='2026-03-31'
