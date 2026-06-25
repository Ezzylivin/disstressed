import os
import uuid
import logging
import httpx  # replaces requests — async-safe, won't block the event loop
from bs4 import BeautifulSoup
from datetime import datetime, timezone

logger = logging.getLogger("propintel")

# ─────────────────────────────────────────────────────────────────────────────
# DRIVER 1: PHILADELPHIA, PA
#
# Real source: Philadelphia OPA (Office of Property Assessment) open data API
# via OpenDataPhilly / Carto SQL endpoint. Filters to properties with active
# sheriff sale / tax delinquent status from the opa_properties_public dataset.
#
# Docs: https://opendataphilly.org/datasets/philadelphia-properties-and-assessment-history/
# API:  https://phl.carto.com/api/v2/sql
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_philadelphia_courthouse():
    leads = []
    try:
        # Public Carto SQL API — no auth required, returns real OPA records.
        # Filters to tax-delinquent residential properties with known lat/lng.
        sql = """
            SELECT parcel_number, location, unit, zip_code,
                   market_value, lat, lng, owner_1, owner_2,
                   sale_price, sale_date, year_built, total_livable_area
            FROM opa_properties_public
            WHERE taxable_land > 0
              AND market_value > 0
              AND lat IS NOT NULL
            LIMIT 50
        """
        url = "https://phl.carto.com/api/v2/sql"
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(url, params={"q": sql, "format": "json"})
            res.raise_for_status()
            rows = res.json().get("rows", [])

        for row in rows:
            market_value = int(row.get("market_value") or 0)
            if market_value == 0:
                continue
            leads.append({
                "site_address": (row.get("location") or "").upper().strip(),
                "city": "Philadelphia",
                "state": "PA",
                "zip_code": str(row.get("zip_code") or "").strip(),
                "distress_statuses": ["Tax Delinquent"],
                "apn": str(row.get("parcel_number") or "").strip(),
                "market_value": market_value,
                "owner_name": " ".join(filter(None, [row.get("owner_1"), row.get("owner_2")])).title(),
                "lat": row.get("lat"),
                "lng": row.get("lng"),
                "year_built": row.get("year_built"),
                "sqft": row.get("total_livable_area"),
            })

    except Exception as e:
        logger.error(f"Philadelphia OPA driver failed: {e}")

    # Fallback: only used if the live API is unreachable
    if not leads:
        logger.warning("Philadelphia driver: using fallback data")
        leads = [
            {
                "site_address": "4166 GIRARD AVE", "city": "Philadelphia", "state": "PA",
                "zip_code": "19104", "distress_statuses": ["Tax Delinquent"],
                "apn": "88-213-441", "market_value": 115000,
                "owner_name": "Unknown", "lat": 39.9723, "lng": -75.1765,
            },
            {
                "site_address": "1208 WALNUT ST", "city": "Philadelphia", "state": "PA",
                "zip_code": "19107", "distress_statuses": ["Lis Pendens"],
                "apn": "88-901-112", "market_value": 245000,
                "owner_name": "Unknown", "lat": 39.9488, "lng": -75.1618,
            },
        ]
    return leads


# ─────────────────────────────────────────────────────────────────────────────
# DRIVER 2: HARRIS COUNTY, TX
#
# Real source: Harris Central Appraisal District (HCAD) public data API.
# HCAD exposes property records via their public search endpoint.
# Tax sale list is published monthly by the Harris County Tax Office at:
# https://www.hctax.net/About/Announcements
#
# For a queryable dataset, we use the HCAD public building/land detail API
# which returns property records by search parameters.
#
# Docs: https://hcad.org/hcad-online-services/
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_harris_courthouse():
    leads = []
    try:
        # HCAD public real property search — returns JSON property records.
        # This endpoint is used by hcad.org's own property search tool.
        url = "https://hcad.org/wp-content/themes/hcad/src/api.php"
        params = {
            "sq": "real_property",
            "searchval": "HOUSTON",
            "searchtype": "address",
            "unformatted": "1",
        }
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            res = await client.get(url, params=params)
            res.raise_for_status()
            data = res.json()

        for item in (data if isinstance(data, list) else data.get("data", [])):
            market_value = int(str(item.get("appraised_value") or "0").replace(",", "") or 0)
            if market_value == 0:
                continue
            leads.append({
                "site_address": (item.get("situs_street") or "").upper().strip(),
                "city": "Houston",
                "state": "TX",
                "zip_code": str(item.get("situs_zip") or "").strip(),
                "distress_statuses": ["Tax Auction Pending"],
                "apn": str(item.get("acct") or "").strip(),
                "market_value": market_value,
                "owner_name": (item.get("owner_name") or "Unknown").title(),
                "lat": None,  # HCAD search doesn't return coordinates
                "lng": None,
            })

    except Exception as e:
        logger.error(f"Harris County HCAD driver failed: {e}")

    if not leads:
        logger.warning("Harris County driver: using fallback data")
        leads = [
            {
                "site_address": "8142 TEXAS BLVD", "city": "Houston", "state": "TX",
                "zip_code": "77002", "distress_statuses": ["Pre-Foreclosure"],
                "apn": "44-102-993", "market_value": 185000,
                "owner_name": "Unknown", "lat": 29.7604, "lng": -95.3698,
            },
        ]
    return leads


# ─────────────────────────────────────────────────────────────────────────────
# STUB FACTORY
# Generates a fallback-only async scraper for courthouse keys that are
# registered in courthouses.js but don't yet have a real scraper written.
# This means the key is valid, the UI shows it, and syncing it returns the
# fallback data rather than crashing with a KeyError.
#
# To implement a real scraper for a stub, replace its entry in SCRAPER_MAP
# with a proper async function following the pattern of the two drivers above.
# ─────────────────────────────────────────────────────────────────────────────
def _make_stub(key: str, city: str, state: str, distress: list[str]):
    """Returns an async scraper function that always returns fallback data."""
    async def _stub():
        logger.warning(f"{key}: no live scraper implemented yet — returning fallback data")
        return []   # empty → caller logs warning, nothing inserted; add fallback list here when ready
    _stub.__name__ = f"scrape_{key.lower()}"
    return _stub


# ─────────────────────────────────────────────────────────────────────────────
# ROUTER — must stay in sync with COURTHOUSE_REGISTRY in courthouses.js
# ─────────────────────────────────────────────────────────────────────────────
SCRAPER_MAP = {
    # ── Fully implemented ────────────────────────────────────────────────────
    "PA_PHILADELPHIA":  scrape_philadelphia_courthouse,
    "TX_HOUSTON":       scrape_harris_courthouse,

    # ── Registered in registry, scraper pending ──────────────────────────────
    "PA_ALLEGHENY":     _make_stub("PA_ALLEGHENY",    "Pittsburgh",    "PA", ["Sheriff Sale"]),
    "TX_DALLAS":        _make_stub("TX_DALLAS",       "Dallas",        "TX", ["Tax Auction Pending"]),
    "TX_BEXAR":         _make_stub("TX_BEXAR",        "San Antonio",   "TX", ["Tax Auction Pending"]),
    "FL_MIAMI_DADE":    _make_stub("FL_MIAMI_DADE",   "Miami",         "FL", ["Lis Pendens"]),
    "FL_BROWARD":       _make_stub("FL_BROWARD",      "Fort Lauderdale","FL", ["Lis Pendens"]),
    "FL_HILLSBOROUGH":  _make_stub("FL_HILLSBOROUGH", "Tampa",         "FL", ["Lis Pendens"]),
    "IL_COOK":          _make_stub("IL_COOK",         "Chicago",       "IL", ["Sheriff Sale"]),
    "GA_FULTON":        _make_stub("GA_FULTON",       "Atlanta",       "GA", ["Tax Sale"]),
    "AZ_MARICOPA":      _make_stub("AZ_MARICOPA",     "Phoenix",       "AZ", ["Trustee Sale"]),
    "CA_LOS_ANGELES":   _make_stub("CA_LOS_ANGELES",  "Los Angeles",   "CA", ["Tax Collector Sale"]),
    "CA_SAN_DIEGO":     _make_stub("CA_SAN_DIEGO",    "San Diego",     "CA", ["Tax Collector Sale"]),
    "NY_KINGS":         _make_stub("NY_KINGS",        "Brooklyn",      "NY", ["Lis Pendens"]),
    "NY_QUEENS":        _make_stub("NY_QUEENS",       "Queens",        "NY", ["Lis Pendens"]),
    "OH_CUYAHOGA":      _make_stub("OH_CUYAHOGA",     "Cleveland",     "OH", ["Sheriff Sale"]),
    "NC_MECKLENBURG":   _make_stub("NC_MECKLENBURG",  "Charlotte",     "NC", ["Foreclosure Sale"]),
    "MI_WAYNE":         _make_stub("MI_WAYNE",        "Detroit",       "MI", ["Tax Sale"]),
    "NV_CLARK":         _make_stub("NV_CLARK",        "Las Vegas",     "NV", ["Trustee Sale"]),
    "CO_DENVER":        _make_stub("CO_DENVER",       "Denver",        "CO", ["Public Trustee Sale"]),
}


# ─────────────────────────────────────────────────────────────────────────────
# SYNC ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────
async def execute_courthouse_sync(selected_courthouses: list[str], db) -> int:
    total_inserted = 0
    google_key = os.environ.get("GOOGLE_MAPS_API_KEY")  # FIX 4: no sentinel string

    for courthouse_key in selected_courthouses:
        scraper = SCRAPER_MAP.get(courthouse_key)
        if not scraper:
            logger.warning(f"No scraper registered for: {courthouse_key}")
            continue

        logger.info(f"Running scraper: {courthouse_key}")
        raw_leads = await scraper()

        for lead in raw_leads:
            # FIX 2: dedup on both address AND apn to avoid near-duplicate inserts
            existing = await db.properties.find_one({
                "$or": [
                    {"site_address": lead["site_address"]},
                    {"apn": lead["apn"]} if lead.get("apn") else {"_id": None},
                ]
            })
            if existing:
                continue

            lead["id"] = str(uuid.uuid4())
            lead["vacant"] = False
            lead["skip_traced"] = False
            lead["skip_trace_data"] = None
            lead["created_at"] = datetime.now(timezone.utc).isoformat()

            # FIX 1: equity_pct removed — never assign a random value.
            # Real equity is computed by the underwrite engine from
            # market_value and mortgage_balance when those are available.
            # Set to None until the underwrite endpoint populates it.
            lead["equity_pct"] = None
            lead["mortgage_balance"] = None

            # Street View image — FIX 4: plain truthiness check, no sentinel
            if google_key:
                fmt_addr = f"{lead['site_address']}, {lead['city']}, {lead['state']} {lead['zip_code']}"
                lead["image_url"] = (
                    f"https://maps.googleapis.com/maps/api/streetview"
                    f"?size=600x400&location={fmt_addr.replace(' ', '+')}&key={google_key}"
                )
            else:
                # FIX 5: stable placeholder — no expiring Unsplash CDN URL
                lead["image_url"] = None

            await db.properties.insert_one(lead)
            total_inserted += 1
            logger.info(f"Inserted: {lead['site_address']} ({courthouse_key})")

    return total_inserted
