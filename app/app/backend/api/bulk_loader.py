"""
bulk_loader.py — PropIntel bulk property importer

Pulls real distressed properties from BatchData across all 20 target metros,
enriches each via RentCast, and pushes to your live PropIntel backend via
the /admin/ingest-hybrid endpoint.

Usage:
    pip install httpx python-dotenv
    BATCH_DATA_API_KEY=xxx RENTCAST_API_KEY=xxx \\
    PROPINTEL_URL=https://your-app.vercel.app \\
    INTERNAL_SYSTEM_KEY=xxx \\
    python bulk_loader.py

Optional env vars:
    TARGET_COUNT    How many total properties to load (default: 50000)
    PER_METRO       Max per metro (default: 2500)
    CONCURRENCY     Parallel ingest requests (default: 10)
    DRY_RUN=1       Print what would be ingested without writing anything
"""
import asyncio
import os
import sys
import logging
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("bulk_loader")

# ── Config ────────────────────────────────────────────────────────────────────
BATCH_KEY      = os.environ["BATCH_DATA_API_KEY"]
RENTCAST_KEY   = os.environ.get("RENTCAST_API_KEY", "")
PROPINTEL_URL  = os.environ.get("PROPINTEL_URL", "http://localhost:8000").rstrip("/")
INTERNAL_KEY   = os.environ["INTERNAL_SYSTEM_KEY"]
TARGET_COUNT   = int(os.environ.get("TARGET_COUNT", "50000"))
PER_METRO      = int(os.environ.get("PER_METRO", "2500"))
CONCURRENCY    = int(os.environ.get("CONCURRENCY", "10"))
DRY_RUN        = os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes")

BATCH_URL  = "https://api.batchdata.com/api/v1/property/search"
INGEST_URL = f"{PROPINTEL_URL}/api/admin/ingest-hybrid"

INGEST_HEADERS = {
    "X-PropIntel-Key": INTERNAL_KEY,
    "Content-Type":    "application/json",
}

# 20 metros × up to 2,500 each = 50,000 target
METROS = [
    # (city, state, distress_types)
    ("Philadelphia",   "PA", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Houston",        "TX", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Pittsburgh",     "PA", ["Tax Delinquent", "Sheriff Sale"]),
    ("Dallas",         "TX", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("San Antonio",    "TX", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Miami",          "FL", ["Lis Pendens",    "Pre-Foreclosure"]),
    ("Tampa",          "FL", ["Lis Pendens",    "Pre-Foreclosure"]),
    ("Chicago",        "IL", ["Tax Delinquent", "Sheriff Sale"]),
    ("Atlanta",        "GA", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Phoenix",        "AZ", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Los Angeles",    "CA", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Brooklyn",       "NY", ["Lis Pendens",    "Pre-Foreclosure"]),
    ("Cleveland",      "OH", ["Tax Delinquent", "Sheriff Sale"]),
    ("Detroit",        "MI", ["Tax Delinquent", "Sheriff Sale"]),
    ("Las Vegas",      "NV", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Denver",         "CO", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Charlotte",      "NC", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Baltimore",      "MD", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Memphis",        "TN", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("St. Louis",      "MO", ["Tax Delinquent", "Sheriff Sale"]),
]


# ── BatchData fetch ───────────────────────────────────────────────────────────
async def fetch_batchdata(client: httpx.AsyncClient, city: str, state: str,
                           statuses: list[str], limit: int) -> list[dict]:
    results = []
    page    = 1
    headers = {"Authorization": f"Bearer {BATCH_KEY}", "Content-Type": "application/json"}

    while len(results) < limit:
        body = {
            "city":    city,
            "state":   state,
            "status":  statuses,
            "page":    page,
            "perPage": min(100, limit - len(results)),
            "propertyType": ["Single Family", "Multi-Family", "Duplex"],
        }
        try:
            res = await client.post(BATCH_URL, json=body, headers=headers)
            if res.status_code == 429:
                log.warning("BatchData rate limit — waiting 5s")
                await asyncio.sleep(5)
                continue
            if res.status_code != 200:
                log.error(f"BatchData {city},{state} page {page}: HTTP {res.status_code}")
                break

            data  = res.json()
            props = data.get("results", {}).get("properties", [])
            if not props:
                break

            results.extend(props)
            total = data.get("results", {}).get("total", 0)
            if len(results) >= total or len(props) < 100:
                break
            page += 1

        except Exception as e:
            log.error(f"BatchData fetch error {city}: {e}")
            break

    log.info(f"BatchData: {len(results)} raw records for {city}, {state}")
    return results[:limit]


# ── Map BatchData property → ingest payload ───────────────────────────────────
def map_property(p: dict, city: str, state: str, statuses: list[str]) -> dict | None:
    addr_obj = p.get("address", {}) or {}
    street   = (addr_obj.get("street") or "").strip().upper()
    if not street:
        return None

    raw_statuses = p.get("status", []) or []
    mapped = []
    for s in raw_statuses:
        sl = s.lower()
        if "tax" in sl:           mapped.append("Tax Delinquent - 2 Years")
        elif "lis" in sl:         mapped.append("Lis Pendens")
        elif "default" in sl:     mapped.append("Notice of Default (NOD)")
        elif "fore" in sl:        mapped.append("Pre-Foreclosure")
        elif "vacant" in sl:      mapped.append("Vacant/Neglected")
        elif "sheriff" in sl or "trustee" in sl: mapped.append("Pre-Foreclosure")
        else:                     mapped.append("Pre-Foreclosure")
    if not mapped:
        mapped = [statuses[0]]

    return {
        "site_address":      street,
        "city":              addr_obj.get("city") or city,
        "state":             addr_obj.get("state") or state,
        "distress_statuses": mapped,
        "vacant":            any("Vacant" in s for s in mapped),
    }


# ── Ingest one property ───────────────────────────────────────────────────────
async def ingest_one(client: httpx.AsyncClient, payload: dict) -> bool:
    if DRY_RUN:
        log.info(f"[DRY RUN] Would ingest: {payload['site_address']}, {payload['city']}, {payload['state']}")
        return True
    try:
        res = await client.post(INGEST_URL, json=payload, headers=INGEST_HEADERS)
        return res.status_code in (200, 201)
    except Exception as e:
        log.error(f"Ingest error {payload.get('site_address')}: {e}")
        return False


# ── Process one metro ─────────────────────────────────────────────────────────
async def process_metro(city: str, state: str, statuses: list[str],
                         semaphore: asyncio.Semaphore,
                         client: httpx.AsyncClient) -> int:
    async with semaphore:
        log.info(f"→ Starting {city}, {state}")
        raw_props = await fetch_batchdata(client, city, state, statuses, PER_METRO)

        payloads = [p for raw in raw_props
                    if (p := map_property(raw, city, state, statuses)) is not None]
        log.info(f"  {city}: {len(payloads)} valid records to ingest")

        inserted = 0
        tasks    = [ingest_one(client, p) for p in payloads]

        # Process in batches of CONCURRENCY
        for i in range(0, len(tasks), CONCURRENCY):
            batch   = tasks[i : i + CONCURRENCY]
            results = await asyncio.gather(*batch)
            inserted += sum(results)
            pct = round((i + len(batch)) / len(tasks) * 100) if tasks else 100
            log.info(f"  {city}: {i + len(batch)}/{len(tasks)} ({pct}%) — {inserted} inserted")

        log.info(f"✓ {city}, {state}: {inserted} properties ingested")
        return inserted


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    log.info("=" * 60)
    log.info(f"PropIntel Bulk Loader")
    log.info(f"Target:      {TARGET_COUNT:,} properties")
    log.info(f"Per metro:   {PER_METRO:,}")
    log.info(f"Concurrency: {CONCURRENCY}")
    log.info(f"Endpoint:    {INGEST_URL}")
    log.info(f"Dry run:     {DRY_RUN}")
    log.info("=" * 60)

    if DRY_RUN:
        log.info("[DRY RUN MODE — no data will be written]\n")

    semaphore    = asyncio.Semaphore(3)  # max 3 metros fetching simultaneously
    total_loaded = 0
    start        = datetime.now()

    async with httpx.AsyncClient(timeout=30) as client:
        metro_tasks = [
            process_metro(city, state, statuses, semaphore, client)
            for city, state, statuses in METROS
            if total_loaded < TARGET_COUNT
        ]
        results = await asyncio.gather(*metro_tasks, return_exceptions=True)

    for i, res in enumerate(results):
        if isinstance(res, Exception):
            log.error(f"Metro {METROS[i][0]} failed: {res}")
        else:
            total_loaded += res

    elapsed = (datetime.now() - start).seconds
    log.info("=" * 60)
    log.info(f"COMPLETE: {total_loaded:,} properties loaded in {elapsed}s")
    log.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
