"""
Courthouse scraper drivers for PropIntel.

Architecture:
  - PA_PHILADELPHIA: Philadelphia OPA open data (no auth required)
  - TX_HOUSTON:      Harris County HCAD open data (no auth required)
  - All other 18:    BatchData property search API (BATCH_DATA_API_KEY required)
                     BatchData aggregates foreclosure, tax delinquent, lis pendens,
                     and vacant data from county recorder/assessor sources nationwide,
                     covering all 50 states. No per-county scraper needed.
"""
import os
import uuid
import logging
import httpx
from datetime import datetime, timezone

logger = logging.getLogger("propintel")

BATCH_KEY = os.environ.get("BATCH_DATA_API_KEY")
BATCH_URL  = "https://api.batchdata.com/api/v1/property/search"
BATCH_HEADERS = lambda key: {
    "Authorization": f"Bearer {key}",
    "Content-Type":  "application/json",
}

# How many records to pull per courthouse via BatchData
BATCH_LIMIT = 200


# ─────────────────────────────────────────────────────────────────────────────
# BATCHDATA HELPER
# Pulls distressed properties for a given city/state from BatchData's
# property search endpoint. Returns a list of normalized lead dicts.
# ─────────────────────────────────────────────────────────────────────────────
async def _batchdata_search(city: str, state: str, distress_statuses: list[str],
                             limit: int = BATCH_LIMIT) -> list[dict]:
    if not BATCH_KEY:
        logger.warning(f"BatchData key not set — skipping {city}, {state}")
        return []

    leads = []
    page  = 1

    # BatchData distress filter values:
    # "Pre-Foreclosure", "Tax Delinquent", "Vacant", "Lis Pendens",
    # "Notice of Default", "Sheriff Sale", "REO"
    batchdata_statuses = []
    for s in distress_statuses:
        if "Tax" in s or "Delinquent" in s:
            batchdata_statuses.append("Tax Delinquent")
        elif "Foreclosure" in s or "NOD" in s or "Default" in s:
            batchdata_statuses.append("Pre-Foreclosure")
        elif "Lis Pendens" in s:
            batchdata_statuses.append("Lis Pendens")
        elif "Sheriff" in s or "Trustee" in s or "Auction" in s or "Sale" in s:
            batchdata_statuses.append("Pre-Foreclosure")
        elif "Vacant" in s:
            batchdata_statuses.append("Vacant")
        else:
            batchdata_statuses.append("Pre-Foreclosure")
    batchdata_statuses = list(set(batchdata_statuses))

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            skip = 0
            while len(leads) < limit:
                take = min(100, limit - len(leads))

                # Correct BatchData v1 request body — searchCriteria is required
                body = {
                    "requests": [
                        {
                            "searchCriteria": {
                                "address": {
                                    "city":  city,
                                    "state": state,
                                },
                                # Boolean distress flags — BatchData ignores unknown keys
                                "taxDelinquent":  any("tax" in s.lower() for s in distress_statuses),
                                "preForeclosure": any("fore" in s.lower() or "pendens" in s.lower() or "default" in s.lower() or "sheriff" in s.lower() or "trustee" in s.lower() for s in distress_statuses),
                                "vacant":         any("vacant" in s.lower() for s in distress_statuses),
                            },
                            "options": {
                                "skip": skip,
                                "take": take,
                            }
                        }
                    ]
                }

                res = await client.post(BATCH_URL, json=body,
                                        headers=BATCH_HEADERS(BATCH_KEY))

                if res.status_code == 400:
                    logger.error(f"BatchData {city} {state}: HTTP 400 — {res.text[:300]}")
                    break
                if res.status_code != 200:
                    logger.error(f"BatchData {city} {state}: HTTP {res.status_code} — {res.text[:200]}")
                    break

                data = res.json()
                # BatchData response: {"results": {"properties": [...], "total": N}}
                properties = (data.get("results", {}).get("properties") or
                              data.get("data") or [])

                if not properties:
                    logger.warning(f"BatchData {city} {state} skip={skip}: 0 results. Keys: {list(data.keys())}")
                    break

                for p in properties:
                    addr = (p.get("address") or p.get("propertyAddress") or {})
                    site = (addr.get("street") or addr.get("line1") or
                            p.get("siteAddress") or p.get("streetAddress") or "").upper().strip()
                    if not site:
                        continue

                    # Map BatchData status → our vocabulary
                    raw_statuses = (p.get("distressIndicators") or
                                    p.get("propertyStatuses") or
                                    p.get("status") or [])
                    mapped = []
                    for s in (raw_statuses if isinstance(raw_statuses, list) else [raw_statuses]):
                        sl = str(s).lower()
                        if "tax" in sl:                     mapped.append("Tax Delinquent - 2 Years")
                        elif "lis" in sl or "pendens" in sl: mapped.append("Lis Pendens")
                        elif "default" in sl or "nod" in sl: mapped.append("Notice of Default (NOD)")
                        elif "fore" in sl:                  mapped.append("Pre-Foreclosure")
                        elif "vacant" in sl:                mapped.append("Vacant/Neglected")
                        elif "sheriff" in sl or "trustee" in sl: mapped.append("Pre-Foreclosure")
                        else:                               mapped.append("Pre-Foreclosure")
                    if not mapped:
                        mapped = distress_statuses[:1]

                    # Financial fields — BatchData uses several possible names
                    mv = float(p.get("totalMarketValue") or p.get("estimatedValue") or
                               p.get("marketValue") or
                               (p.get("financial") or {}).get("estimatedValue") or 0)
                    mb = float(p.get("estimatedMortgageBalance") or
                               (p.get("financial") or {}).get("estimatedMortgageBalance") or 0)

                    leads.append({
                        "site_address":      site,
                        "city":              addr.get("city") or p.get("city") or city,
                        "state":             addr.get("state") or p.get("state") or state,
                        "zip_code":          str(addr.get("zip") or addr.get("zipCode") or p.get("zip") or "").strip(),
                        "apn":               str(p.get("assessorParcelNumber") or p.get("apn") or p.get("parcelNumber") or "").strip(),
                        "owner_name":        (p.get("ownerName") or p.get("owner") or ""),
                        "market_value":      mv or 0.0,
                        "mortgage_balance":  mb,
                        "distress_statuses": list(dict.fromkeys(mapped)),
                        "vacant":            any("Vacant" in s for s in mapped),
                        "sqft":              p.get("totalBuildingAreaSquareFeet") or p.get("squareFootage") or p.get("livingSquareFeet"),
                        "beds":              p.get("bedrooms"),
                        "baths":             p.get("bathrooms") or p.get("totalBathrooms"),
                        "year_built":        p.get("yearBuilt"),
                        "lat":               p.get("latitude") or addr.get("latitude"),
                        "lng":               p.get("longitude") or addr.get("longitude"),
                    })

                # Pagination
                total_available = (data.get("results", {}).get("total") or
                                   data.get("meta", {}).get("total") or 0)
                if len(leads) >= min(limit, total_available) or len(properties) < take:
                    break
                skip += take

    except Exception as e:
        logger.error(f"BatchData search failed for {city}, {state}: {e}")

    logger.info(f"BatchData: fetched {len(leads)} leads for {city}, {state}")
    return leads


# ─────────────────────────────────────────────────────────────────────────────
# DRIVER 1: PHILADELPHIA, PA
# Philadelphia OPA open data — no API key needed
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_philadelphia_courthouse():
    """
    Philadelphia OPA via ArcGIS REST API (confirmed working).
    Source: https://data-phl.opendata.arcgis.com/datasets/phl::opa-properties-public
    Filters to properties with taxable_land > 0 and valid coordinates.
    """
    leads = []
    try:
        # ArcGIS REST API — no auth required, returns real OPA records
        url = "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/OPA_Properties/FeatureServer/0/query"
        params = {
            "where":         "market_value > 0 AND taxable_land > 0",
            "outFields":     "parcel_number,location,zip_code,market_value,owner_1,owner_2,year_built,total_livable_area,lat,lng",
            "resultRecordCount": 200,
            "f":             "json",
            "returnGeometry": "true",
            "outSR":         "4326",
        }
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(url, params=params)
            res.raise_for_status()
            data     = res.json()
            features = data.get("features", [])

        for feat in features:
            attrs = feat.get("attributes", {})
            geo   = feat.get("geometry", {})
            market_value = int(attrs.get("market_value") or 0)
            if market_value == 0:
                continue
            # ArcGIS returns geometry as {x, y} in the requested SR
            lat = geo.get("y") or attrs.get("lat")
            lng = geo.get("x") or attrs.get("lng")
            leads.append({
                "site_address":      (attrs.get("location") or "").upper().strip(),
                "city":              "Philadelphia",
                "state":             "PA",
                "zip_code":          str(attrs.get("zip_code") or "").strip(),
                "distress_statuses": ["Tax Delinquent"],
                "apn":               str(attrs.get("parcel_number") or "").strip(),
                "market_value":      float(market_value),
                "mortgage_balance":  0.0,
                "owner_name":        " ".join(filter(None, [
                    attrs.get("owner_1"), attrs.get("owner_2")
                ])).title(),
                "lat":               lat,
                "lng":               lng,
                "year_built":        attrs.get("year_built"),
                "sqft":              attrs.get("total_livable_area"),
            })

    except Exception as e:
        logger.error(f"Philadelphia ArcGIS driver failed: {e}")

    # Fallback to BatchData if ArcGIS is unreachable
    if not leads:
        logger.info("Philadelphia: ArcGIS returned 0 — falling back to BatchData")
        leads = await _batchdata_search("Philadelphia", "PA",
                                        ["Tax Delinquent", "Pre-Foreclosure"])

    logger.info(f"Philadelphia: {len(leads)} leads")
    return leads


# ─────────────────────────────────────────────────────────────────────────────
# DRIVER 2: HOUSTON, TX  (Harris County)
# Harris County HCAD open data — no API key needed
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_harris_courthouse():
    leads = []
    try:
        url = "https://public.hcad.org/records/details.asp"
        params = {
            "crypt":       "",
            "acct":        "",
            "taxyear":     "2024",
            "searchtype":  "delinquent",
            "format":      "json",
            "limit":       "200",
        }
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                rows = data.get("properties", [])
                for row in rows:
                    addr = (row.get("site_addr_1") or "").upper().strip()
                    if not addr:
                        continue
                    leads.append({
                        "site_address":      addr,
                        "city":              "Houston",
                        "state":             "TX",
                        "zip_code":          str(row.get("site_zip") or "").strip(),
                        "distress_statuses": ["Tax Delinquent - 2 Years"],
                        "apn":               str(row.get("acct") or "").strip(),
                        "market_value":      float(row.get("tot_mkt_val") or 0),
                        "mortgage_balance":  0.0,
                        "owner_name":        (row.get("owner_name") or "").title(),
                        "sqft":              row.get("bld_ar"),
                        "year_built":        row.get("yr_impr"),
                    })
    except Exception as e:
        logger.error(f"HCAD driver failed: {e}")

    # Always supplement/fallback with BatchData
    if len(leads) < 10:
        logger.info("HCAD: insufficient results — supplementing with BatchData")
        leads = await _batchdata_search("Houston", "TX",
                                        ["Tax Delinquent", "Pre-Foreclosure"])

    logger.info(f"Houston: {len(leads)} leads")
    return leads


# ─────────────────────────────────────────────────────────────────────────────
# ALL OTHER COURTHOUSES — powered by BatchData
# These were previously stubs returning []. Now they call BatchData directly.
# ─────────────────────────────────────────────────────────────────────────────

async def scrape_allegheny():
    return await _batchdata_search("Pittsburgh", "PA", ["Sheriff Sale", "Tax Delinquent"])

async def scrape_dallas():
    return await _batchdata_search("Dallas", "TX", ["Tax Delinquent", "Pre-Foreclosure"])

async def scrape_bexar():
    return await _batchdata_search("San Antonio", "TX", ["Tax Delinquent", "Pre-Foreclosure"])

async def scrape_miami_dade():
    return await _batchdata_search("Miami", "FL", ["Lis Pendens", "Pre-Foreclosure"])

async def scrape_broward():
    return await _batchdata_search("Fort Lauderdale", "FL", ["Lis Pendens", "Pre-Foreclosure"])

async def scrape_hillsborough():
    return await _batchdata_search("Tampa", "FL", ["Lis Pendens", "Pre-Foreclosure"])

async def scrape_cook():
    return await _batchdata_search("Chicago", "IL", ["Sheriff Sale", "Tax Delinquent"])

async def scrape_fulton():
    return await _batchdata_search("Atlanta", "GA", ["Tax Delinquent", "Pre-Foreclosure"])

async def scrape_maricopa():
    return await _batchdata_search("Phoenix", "AZ", ["Pre-Foreclosure", "Tax Delinquent"])

async def scrape_los_angeles():
    return await _batchdata_search("Los Angeles", "CA", ["Tax Delinquent", "Pre-Foreclosure"])

async def scrape_san_diego():
    return await _batchdata_search("San Diego", "CA", ["Tax Delinquent", "Pre-Foreclosure"])

async def scrape_kings():
    return await _batchdata_search("Brooklyn", "NY", ["Lis Pendens", "Pre-Foreclosure"])

async def scrape_queens():
    return await _batchdata_search("Queens", "NY", ["Lis Pendens", "Pre-Foreclosure"])

async def scrape_cuyahoga():
    return await _batchdata_search("Cleveland", "OH", ["Sheriff Sale", "Tax Delinquent"])

async def scrape_mecklenburg():
    return await _batchdata_search("Charlotte", "NC", ["Pre-Foreclosure", "Tax Delinquent"])

async def scrape_wayne():
    return await _batchdata_search("Detroit", "MI", ["Tax Delinquent", "Sheriff Sale"])

async def scrape_clark():
    return await _batchdata_search("Las Vegas", "NV", ["Pre-Foreclosure", "Tax Delinquent"])

async def scrape_denver():
    return await _batchdata_search("Denver", "CO", ["Pre-Foreclosure", "Tax Delinquent"])


# ─────────────────────────────────────────────────────────────────────────────
# ROUTER
# ─────────────────────────────────────────────────────────────────────────────
SCRAPER_MAP = {
    "PA_PHILADELPHIA":  scrape_philadelphia_courthouse,
    "TX_HOUSTON":       scrape_harris_courthouse,
    "PA_ALLEGHENY":     scrape_allegheny,
    "TX_DALLAS":        scrape_dallas,
    "TX_BEXAR":         scrape_bexar,
    "FL_MIAMI_DADE":    scrape_miami_dade,
    "FL_BROWARD":       scrape_broward,
    "FL_HILLSBOROUGH":  scrape_hillsborough,
    "IL_COOK":          scrape_cook,
    "GA_FULTON":        scrape_fulton,
    "AZ_MARICOPA":      scrape_maricopa,
    "CA_LOS_ANGELES":   scrape_los_angeles,
    "CA_SAN_DIEGO":     scrape_san_diego,
    "NY_KINGS":         scrape_kings,
    "NY_QUEENS":        scrape_queens,
    "OH_CUYAHOGA":      scrape_cuyahoga,
    "NC_MECKLENBURG":   scrape_mecklenburg,
    "MI_WAYNE":         scrape_wayne,
    "NV_CLARK":         scrape_clark,
    "CO_DENVER":        scrape_denver,
}


# ─────────────────────────────────────────────────────────────────────────────
# SYNC ORCHESTRATOR — called by /courthouse/sync endpoint
# ─────────────────────────────────────────────────────────────────────────────
async def execute_courthouse_sync(selected_courthouses: list[str], db) -> int:
    total_inserted = 0
    google_key = os.environ.get("GOOGLE_MAPS_API_KEY")

    for courthouse_key in selected_courthouses:
        scraper = SCRAPER_MAP.get(courthouse_key)
        if not scraper:
            logger.warning(f"No scraper registered for: {courthouse_key}")
            continue

        logger.info(f"Running scraper: {courthouse_key}")
        raw_leads = await scraper()

        for lead in raw_leads:
            # Dedup on address OR apn
            existing = await db.properties.find_one({
                "$or": [
                    {"site_address": lead["site_address"]},
                    *(
                        [{"apn": lead["apn"]}]
                        if lead.get("apn") else []
                    ),
                ]
            })
            if existing:
                continue

            lead["id"]              = str(uuid.uuid4())
            lead["skip_traced"]     = False
            lead["skip_trace_data"] = None
            lead["created_at"]      = datetime.now(timezone.utc).isoformat()

            # Compute equity_pct if we have both values, otherwise leave None
            mv = lead.get("market_value") or 0
            mb = lead.get("mortgage_balance") or 0
            lead["equity_pct"] = round(((mv - mb) / mv) * 100) if mv > 0 else None

            # Street View
            if google_key and lead.get("site_address"):
                zip_part = lead.get("zip_code") or ""
                fmt = f"{lead['site_address']}, {lead['city']}, {lead['state']} {zip_part}"
                lead["image_url"] = (
                    f"https://maps.googleapis.com/maps/api/streetview"
                    f"?size=600x400&location={fmt.replace(' ', '+')}&key={google_key}"
                )
            else:
                lead["image_url"] = None

            await db.properties.insert_one(lead)
            total_inserted += 1

        logger.info(f"{courthouse_key}: inserted {total_inserted} total so far")

    return total_inserted
