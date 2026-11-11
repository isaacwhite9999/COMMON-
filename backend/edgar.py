"""Optional, rate-conscious SEC EDGAR read-only research with no trading data.

Activate only with SEC_USER_AGENT set to organization and monitored contact email.
Every number is source-identified and tagged with its filing date and period.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
import json
import os
from threading import Lock
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

COMPANIES = {
    "TSLA": (1318605, "Tesla, Inc."),
    "AAPL": (320193, "Apple Inc."),
    "MSFT": (789019, "Microsoft Corporation"),
    "NVDA": (1045810, "NVIDIA Corporation"),
    "AMZN": (1018724, "Amazon.com, Inc."),
}
_FRESH = timedelta(hours=6)
_cache: dict[str, tuple[datetime, dict]] = {}
_lock = Lock()
FACT_TAGS = {
    "net_income": ["NetIncomeLoss"],
    "total_assets": ["Assets"],
    "revenue": ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
}


def pick_fact(usgaap: dict, tags: list[str]):
    for tag in tags:
        values = usgaap.get(tag, {}).get("units", {}).get("USD", [])
        # Only 10-K / 10-Q, exclude obsolete amendments and duplicate datasets.
        rows = [v for v in values if v.get("form") in ("10-K", "10-Q") and v.get("filed") and v.get("end") and isinstance(v.get("val"), int | float)]
        if not rows:
            continue
        rows.sort(key=lambda r: (r["filed"], r["end"]), reverse=True)
        d = rows[0]
        return {"value": d["val"], "period_end": d["end"], "filed": d["filed"], "form": d["form"], "accession": d.get("accn"), "taxonomy_tag": tag, "unit": "USD"}
    return None


def company_snapshot(symbol: str) -> dict:
    if symbol not in COMPANIES:
        raise ValueError("Supported tickers: " + ", ".join(COMPANIES))
    cik, name = COMPANIES[symbol]
    filing_page = f"https://www.sec.gov/edgar/browse/?CIK={cik}&owner=exclude"
    source = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"
    base = {"symbol": symbol, "company_name": name, "source": source, "filing_page": filing_page,
            "source_type": "SEC_EDGAR", "live_stock_quote": False, "not_investment_advice": True}
    agent = os.getenv("SEC_USER_AGENT", "").strip()
    if not agent or "@" not in agent:
        return {**base, "status": "not_configured", "facts": {}, "message": "The SEC research feed needs a declared organization and contact email. Use the issuer's official filing page meanwhile."}
    with _lock:
        cached = _cache.get(symbol)
        if cached and cached[0] > datetime.now(timezone.utc):
            return cached[1]
    try:
        req = Request(source, headers={"User-Agent": agent, "Accept": "application/json", "Accept-Encoding": "identity"})
        with urlopen(req, timeout=7) as response:
            # Prevent a malicious or anomalous upstream response from exhausting application memory.
            payload = response.read(12_000_001)
            if len(payload) > 12_000_000:
                raise ValueError("SEC response larger than allowed")
        doc = json.loads(payload.decode("utf-8"))
        data = doc.get("facts", {}).get("us-gaap", {})
        facts = {label: value for label, tags in FACT_TAGS.items() if (value := pick_fact(data, tags))}
        snapshot = {**base, "status": "ok", "facts": facts, "as_of_request": datetime.now(timezone.utc).isoformat(),
                    "message": "SEC filing data, not live quotes. Compare fiscal periods before drawing conclusions."}
        with _lock:
            _cache[symbol] = (datetime.now(timezone.utc) + _FRESH, snapshot)
        return snapshot
    except (HTTPError, URLError, OSError, ValueError, json.JSONDecodeError) as exc:
        return {**base, "status": "unavailable", "facts": {}, "message": "SEC data temporarily unavailable. Open the official filings link instead."}
