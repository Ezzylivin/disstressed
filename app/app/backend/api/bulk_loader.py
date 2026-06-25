"""
bulk_loader.py — PropIntel bulk property importer

Pulls real distressed properties from BatchData across 20 target metros
and writes directly to MongoDB Atlas — bypassing the Vercel HTTP endpoint
entirely. This is 50-100x faster and avoids Vercel's 30s function timeout.

Requirements:
    pip install httpx motor pymongo python-dotenv

Usage:
    Create a .env file with:
        BATCH_DATA_API_KEY=xxx
        MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
        DB_NAME=propintel

    Then run:
        python bulk_loader.py

Options (set as env vars):
    TARGET_COUNT   Total properties to load (default: 50000)
    PER_METRO      Max per metro (default: 2500)
    DRY_RUN=1      Print records without writing to DB
    CLEAR_SEED=1   Delete synthetic seed data before loading
"""
import asyncio
import os
import sys
import uuid
import logging
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("bulk_loader")

# ── Required config ───────────────────────────────────────────────────────────
BATCH_KEY  = os.environ.get("BATCH_DATA_API_KEY", "")
MONGO_URL  = os.environ.get("MONGO_URL", "")
DB_NAME    = os.environ.get("DB_NAME", "propintel")

if not BATCH_KEY:
    sys.exit("ERROR: BATCH_DATA_API_KEY is not set. Add it to your .env file.")
if not MONGO_URL:
    sys.exit("ERROR: MONGO_URL is not set. Add your MongoDB Atlas connection string to .env.")

# ── Optional config ───────────────────────────────────────────────────────────
TARGET_COUNT = int(os.environ.get("TARGET_COUNT", "50000"))
PER_METRO    = int(os.environ.get("PER_METRO", "2500"))
DRY_RUN      = os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes")
CLEAR_SEED   = os.environ.get("CLEAR_SEED", "").lower() in ("1", "true", "yes")
GOOGLE_KEY   = os.environ.get("GOOGLE_MAPS_API_KEY", "")

BATCH_URL = "https://api.batchdata.com/api/v1/property/search"

# 20 metros — covers all 18 previously-stubbed courthouses plus the two live ones
METROS = [
    ("Philadelphia",  "PA", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Houston",       "TX", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Pittsburgh",    "PA", ["Tax Delinquent", "Sheriff Sale"]),
    ("Dallas",        "TX", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("San Antonio",   "TX", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Miami",         "FL", ["Lis Pendens",    "Pre-Foreclosure"]),
    ("Tampa",         "FL", ["Lis Pendens",    "Pre-Foreclosure"]),
    ("Chicago",       "IL", ["Tax Delinquent", "Sheriff Sale"]),
    ("Atlanta",       "GA", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Phoenix",       "AZ", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Los Angeles",   "CA", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Brooklyn",      "NY", ["Lis Pendens",    "Pre-Foreclosure"]),
    ("Cleveland",     "OH", ["Tax Delinquent", "Sheriff Sale"]),
    ("Detroit",       "MI", ["Tax Delinquent", "Sheriff Sale"]),
    ("Las Vegas",     "NV", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Denver",        "CO", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Charlotte",     "NC", ["Pre-Foreclosure","Tax Delinquent"]),
    ("Baltimore",     "MD", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("Memphis",       "TN", ["Tax Delinquent", "Pre-Foreclosure"]),
    ("St. Louis",     "MO", ["Tax Delinquent", "Sheriff Sale"]),
]


# ── BatchData fetch — paginated ───────────────────────────────────────────────
async def fetch_metro(client: httpx.AsyncClient, city: str, state: str,
                       statuses: list[str], limit: int) -> list[dict]:
    headers = {
        "Authorization": f"Bearer {BATCH_KEY}",
        "Content-Type":  "application/json",
    }
    results = []
    page    = 1

    while len(results) < limit:
        body = {
            "city":         city,
            "state":        state,
            "status":       statuses,
            "page":         page,
            "perPage":      min(100, limit - len(results)),
            "propertyType": ["Single Family", "Multi-Family", "Duplex", "Townhouse"],
        }
        try:
            res = await client.post(BATCH_URL, json=body, headers=headers, timeout=20)

            if res.status_code == 429:
                wait = int(res.headers.get("Retry-After", "10"))
                log.warning(f"  Rate limited — waiting {wait}s")
                await asyncio.sleep(wait)
                continue

            if res.status_code == 401:
                log.error("  BATCH_DATA_API_KEY is invalid or expired")
                return results

            if res.status_code != 200:
                log.error(f"  BatchData {city}: HTTP {res.status_code} — {res.text[:150]}")
                break

            data  = res.json()
            props = data.get("results", {}).get("properties", [])
            if not props:
                break

            results.extend(props)

            total_available = data.get("results", {}).get("total", 0)
            log.info(f"  {city} page {page}: got {len(props)}, "
                     f"total so far {len(results)}/{total_available}")

            if len(results) >= min(limit, total_available) or len(props) < 100:
                break
            page += 1

        except httpx.TimeoutException:
            log.warning(f"  {city} page {page}: timeout — stopping pagination")
            break
        except Exception as e:
            log.error(f"  {city} fetch error: {e}")
            break

    return results[:limit]


# ── Map BatchData record → MongoDB document ───────────────────────────────────
def map_to_doc(p: dict, city: str, state: str,
               distress_statuses: list[str]) -> dict | None:
    addr = p.get("address", {}) or {}
    street = (addr.get("street") or "").strip().upper()
    if not street:
        return None

    # Map BatchData status values to our distress vocabulary
    raw = p.get("status", []) or []
    mapped = []
    for s in raw:
        sl = s.lower()
        if "tax" in sl:                           mapped.append("Tax Delinquent - 2 Years")
        elif "lis pendens" in sl:                 mapped.append("Lis Pendens")
        elif "notice of default" in sl or "nod" in sl: mapped.append("Notice of Default (NOD)")
        elif "foreclosure" in sl:                 mapped.append("Pre-Foreclosure")
        elif "vacant" in sl:                      mapped.append("Vacant/Neglected")
        elif "sheriff" in sl or "trustee" in sl:  mapped.append("Pre-Foreclosure")
        elif "code" in sl:                        mapped.append("Code Violation")
        else:                                     mapped.append("Pre-Foreclosure")
    if not mapped:
        mapped = distress_statuses[:1]
    mapped = list(dict.fromkeys(mapped))  # deduplicate preserving order

    fin = p.get("financial", {}) or {}
    mv  = float(fin.get("estimatedValue") or fin.get("assessedValue") or 0)
    mb  = float(fin.get("estimatedMortgageBalance") or 0)
    eq  = round(((mv - mb) / mv) * 100) if mv > 0 else None

    city_name  = addr.get("city")  or city
    state_code = addr.get("state") or state
    zip_code   = str(addr.get("zip") or "").strip()

    # Street View image
    if GOOGLE_KEY and street:
        fmt = f"{street}, {city_name}, {state_code} {zip_code}".replace(" ", "+")
        image_url = (f"https://maps.googleapis.com/maps/api/streetview"
                     f"?size=600x400&location={fmt}&key={GOOGLE_KEY}")
    else:
        image_url = None

    return {
        "id":                str(uuid.uuid4()),
        "apn":               str(p.get("apn") or p.get("attomId") or "").strip(),
        "site_address":      street,
        "city":              city_name,
        "state":             state_code,
        "zip_code":          zip_code,
        "lat":               p.get("latitude"),
        "lng":               p.get("longitude"),
        "beds":              p.get("bedrooms"),
        "baths":             p.get("bathrooms"),
        "sqft":              p.get("squareFootage") or p.get("livingSquareFeet"),
        "year_built":        p.get("yearBuilt"),
        "property_type":     p.get("propertyType") or "Single Family",
        "owner_name":        (p.get("ownerName") or "").title() or None,
        "owner_is_llc":      False,
        "owner_absentee":    p.get("absenteeOwner", False),
        "market_value":      mv or None,
        "mortgage_balance":  mb or None,
        "equity":            round(mv - mb) if mv > 0 else None,
        "equity_pct":        eq,
        "distress_statuses": mapped,
        "primary_status":    mapped[0],
        "vacant":            any("Vacant" in s for s in mapped),
        "estimated_rent":    None,  # populated by RentCast on demand
        "image_url":         image_url,
        "skip_traced":       False,
        "skip_trace_data":   None,
        "underwrite":        None,
        "created_at":        datetime.now(timezone.utc).isoformat(),
        "_source":           "batchdata_bulk",
    }


# ── Write one metro to MongoDB ────────────────────────────────────────────────
async def load_metro(city: str, state: str, statuses: list[str],
                      collection, semaphore: asyncio.Semaphore,
                      client: httpx.AsyncClient) -> int:
    async with semaphore:
        log.info(f"\n→ {city}, {state} — fetching up to {PER_METRO:,} records")
        raw = await fetch_metro(client, city, state, statuses, PER_METRO)

        docs     = [d for r in raw if (d := map_to_doc(r, city, state, statuses))]
        inserted = 0
        skipped  = 0

        if DRY_RUN:
            log.info(f"  [DRY RUN] {city}: would insert {len(docs)} documents")
            return len(docs)

        # Batch insert with dedup check
        for doc in docs:
            # Check for existing record by address or APN
            query = {"$or": [{"site_address": doc["site_address"]}]}
            if doc.get("apn"):
                query["$or"].append({"apn": doc["apn"]})

            if await collection.find_one(query, {"_id": 1}):
                skipped += 1
                continue

            await collection.insert_one(doc)
            inserted += 1

            if inserted % 100 == 0:
                log.info(f"  {city}: {inserted} inserted, {skipped} skipped (duplicates)")

        log.info(f"✓ {city}, {state}: {inserted} inserted, {skipped} skipped")
        return inserted


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    mongo  = AsyncIOMotorClient(MONGO_URL)
    db     = mongo[DB_NAME]
    col    = db.properties

    log.info("=" * 65)
    log.info("  PropIntel Bulk Loader")
    log.info(f"  Target:    {TARGET_COUNT:,} properties across {len(METROS)} metros")
    log.info(f"  Per metro: {PER_METRO:,}")
    log.info(f"  Database:  {DB_NAME}")
    log.info(f"  Dry run:   {DRY_RUN}")
    log.info("=" * 65)

    # Optionally clear synthetic seed data first
    if CLEAR_SEED and not DRY_RUN:
        result = await col.delete_many({"_source": {"$exists": False}})
        log.info(f"  Cleared {result.deleted_count} synthetic seed records")

    existing_count = await col.count_documents({})
    log.info(f"  Current DB count: {existing_count:,}")

    semaphore = asyncio.Semaphore(3)  # 3 metros fetching simultaneously
    start     = datetime.now()

    async with httpx.AsyncClient(timeout=30) as client:
        tasks = [
            load_metro(city, state, statuses, col, semaphore, client)
            for city, state, statuses in METROS
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    total = 0
    for i, res in enumerate(results):
        city = METROS[i][0]
        if isinstance(res, Exception):
            log.error(f"  {city} failed: {res}")
        else:
            total += res

    final_count = await col.count_documents({})
    elapsed     = round((datetime.now() - start).total_seconds())

    log.info("\n" + "=" * 65)
    log.info(f"  DONE in {elapsed}s")
    log.info(f"  Properties inserted this run: {total:,}")
    log.info(f"  Total in database now:        {final_count:,}")
    log.info("=" * 65)

    mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
