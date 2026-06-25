"""Seed realistic mock property data modeled after ATTOM/CoreLogic + USPS vacancy + municipal tax data across 52 jurisdictions."""
import os
import random
import uuid
from datetime import datetime, timezone, timedelta

# BUG 2 FIX: sys.path.insert removed — path manipulation belongs in entrypoints.
# BUG 5 FIX: No module-level random.seed() — use a scoped Random instance
# so this module never contaminates the global RNG state of the host process.
_rng = random.Random(42)

DISTRESS_STATUSES = [
    "Tax Delinquent - 2 Years",
    "Tax Delinquent - 3+ Years",
    "Vacant/Neglected",
    "Pre-Foreclosure",
    "Notice of Default (NOD)",
    "Lis Pendens",
    "Code Violation",
    "Vacant - USPS Flagged",
]

CITIES = [
    {"city": "Birmingham",     "state": "AL", "lat": 33.5186,  "lng": -86.8104,  "zip_code": "35203"},
    {"city": "Anchorage",      "state": "AK", "lat": 61.2181,  "lng": -149.9003, "zip_code": "99501"},
    {"city": "Phoenix",        "state": "AZ", "lat": 33.4484,  "lng": -112.0740, "zip_code": "85003"},
    {"city": "Little Rock",    "state": "AR", "lat": 34.7465,  "lng": -92.2896,  "zip_code": "72201"},
    {"city": "Los Angeles",    "state": "CA", "lat": 34.0522,  "lng": -118.2437, "zip_code": "90012"},
    {"city": "Denver",         "state": "CO", "lat": 39.7392,  "lng": -104.9903, "zip_code": "80202"},
    {"city": "Hartford",       "state": "CT", "lat": 41.7637,  "lng": -72.6851,  "zip_code": "06103"},
    {"city": "Wilmington",     "state": "DE", "lat": 39.7391,  "lng": -75.5514,  "zip_code": "19801"},
    {"city": "Washington",     "state": "DC", "lat": 38.9072,  "lng": -77.0369,  "zip_code": "20001"},
    {"city": "Miami",          "state": "FL", "lat": 25.7617,  "lng": -80.1918,  "zip_code": "33128"},
    {"city": "Atlanta",        "state": "GA", "lat": 33.7490,  "lng": -84.3880,  "zip_code": "30303"},
    {"city": "Honolulu",       "state": "HI", "lat": 21.3069,  "lng": -157.8583, "zip_code": "96813"},
    {"city": "Boise",          "state": "ID", "lat": 43.6150,  "lng": -116.2023, "zip_code": "83702"},
    {"city": "Chicago",        "state": "IL", "lat": 41.8781,  "lng": -87.6298,  "zip_code": "60602"},
    {"city": "Indianapolis",   "state": "IN", "lat": 39.7684,  "lng": -86.1581,  "zip_code": "46204"},
    {"city": "Des Moines",     "state": "IA", "lat": 41.5868,  "lng": -93.6250,  "zip_code": "50309"},
    {"city": "Wichita",        "state": "KS", "lat": 37.6872,  "lng": -97.3301,  "zip_code": "67202"},
    {"city": "Louisville",     "state": "KY", "lat": 38.2527,  "lng": -85.7585,  "zip_code": "40202"},
    {"city": "New Orleans",    "state": "LA", "lat": 29.9511,  "lng": -90.0715,  "zip_code": "70112"},
    {"city": "Portland",       "state": "ME", "lat": 43.6591,  "lng": -70.2568,  "zip_code": "04101"},
    {"city": "Baltimore",      "state": "MD", "lat": 39.2904,  "lng": -76.6122,  "zip_code": "21201"},
    {"city": "Boston",         "state": "MA", "lat": 42.3601,  "lng": -71.0589,  "zip_code": "02108"},
    {"city": "Detroit",        "state": "MI", "lat": 42.3314,  "lng": -83.0458,  "zip_code": "48201"},
    {"city": "Minneapolis",    "state": "MN", "lat": 44.9778,  "lng": -93.2650,  "zip_code": "55401"},
    {"city": "Jackson",        "state": "MS", "lat": 32.2988,  "lng": -90.1848,  "zip_code": "39201"},
    {"city": "St. Louis",      "state": "MO", "lat": 38.6270,  "lng": -90.1994,  "zip_code": "63101"},
    {"city": "Billings",       "state": "MT", "lat": 45.7833,  "lng": -108.5007, "zip_code": "59101"},
    {"city": "Omaha",          "state": "NE", "lat": 41.2565,  "lng": -95.9345,  "zip_code": "68102"},
    {"city": "Las Vegas",      "state": "NV", "lat": 36.1716,  "lng": -115.1391, "zip_code": "89101"},
    {"city": "Manchester",     "state": "NH", "lat": 42.9956,  "lng": -71.4548,  "zip_code": "03101"},
    {"city": "Newark",         "state": "NJ", "lat": 40.7357,  "lng": -74.1724,  "zip_code": "07102"},
    {"city": "Albuquerque",    "state": "NM", "lat": 35.0844,  "lng": -106.6511, "zip_code": "87102"},
    {"city": "New York City",  "state": "NY", "lat": 40.7128,  "lng": -74.0060,  "zip_code": "10007"},
    {"city": "Charlotte",      "state": "NC", "lat": 35.2271,  "lng": -80.8431,  "zip_code": "28202"},
    {"city": "Fargo",          "state": "ND", "lat": 46.8772,  "lng": -96.7898,  "zip_code": "58102"},
    {"city": "Cleveland",      "state": "OH", "lat": 41.4993,  "lng": -81.6944,  "zip_code": "44114"},
    {"city": "Oklahoma City",  "state": "OK", "lat": 35.4676,  "lng": -97.5164,  "zip_code": "73102"},
    {"city": "Portland",       "state": "OR", "lat": 45.5152,  "lng": -122.6784, "zip_code": "97204"},
    {"city": "Philadelphia",   "state": "PA", "lat": 39.9526,  "lng": -75.1652,  "zip_code": "19107"},
    {"city": "San Juan",       "state": "PR", "lat": 18.4655,  "lng": -66.1057,  "zip_code": "00901"},
    {"city": "Providence",     "state": "RI", "lat": 41.8240,  "lng": -71.4128,  "zip_code": "02903"},
    {"city": "Charleston",     "state": "SC", "lat": 32.7765,  "lng": -79.9309,  "zip_code": "29401"},
    {"city": "Sioux Falls",    "state": "SD", "lat": 43.5460,  "lng": -96.7313,  "zip_code": "57102"},
    {"city": "Memphis",        "state": "TN", "lat": 35.1495,  "lng": -90.0490,  "zip_code": "38103"},
    {"city": "Houston",        "state": "TX", "lat": 29.7604,  "lng": -95.3698,  "zip_code": "77002"},
    {"city": "Salt Lake City", "state": "UT", "lat": 40.7608,  "lng": -111.8910, "zip_code": "84101"},
    {"city": "Burlington",     "state": "VT", "lat": 44.4756,  "lng": -73.2121,  "zip_code": "05401"},
    {"city": "Richmond",       "state": "VA", "lat": 37.5407,  "lng": -77.4360,  "zip_code": "23219"},
    {"city": "Seattle",        "state": "WA", "lat": 47.6062,  "lng": -122.3321, "zip_code": "98104"},
    {"city": "Charleston",     "state": "WV", "lat": 38.3498,  "lng": -81.6326,  "zip_code": "25301"},
    {"city": "Milwaukee",      "state": "WI", "lat": 43.0389,  "lng": -87.9065,  "zip_code": "53202"},
    {"city": "Cheyenne",       "state": "WY", "lat": 41.1400,  "lng": -104.8203, "zip_code": "82001"},
]

STREET_NAMES = [
    "Walnut", "Oak", "Maple", "Cedar", "Elm", "Pine", "Spruce",
    "Chestnut", "Market", "Vine", "Locust", "Spring Garden",
    "Girard", "Lehigh", "Diamond",
]
STREET_TYPES = ["St", "Ave", "Blvd", "Rd", "Ln", "Pl"]

FIRST_NAMES = [
    "Marcus", "James", "Linda", "Patricia", "Robert", "Karen",
    "Michael", "Susan", "David", "Barbara", "William", "Jennifer",
    "Carlos", "Aisha", "Trevor", "Maria",
]
LAST_NAMES = [
    "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson",
    "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson",
]
LLC_SUFFIXES = ["Holdings LLC", "Properties LLC", "Trust", "Investments LLC", "Capital Partners"]

FOUNDATIONS  = ["Slab", "Crawlspace", "Basement", "Pier & Beam"]
ROOF_TYPES   = ["Asphalt Shingle", "Metal", "Flat/Built-up", "Tile"]
HEAT_TYPES   = ["Forced Air", "Radiator", "Heat Pump", "None"]

CARRIERS     = ["Verizon", "T-Mobile", "AT&T", "Cricket", "Metro PCS"]
CONFIDENCE   = ["High", "High", "Medium", "Medium", "Low"]


def _gen_phone():
    area = _rng.choice([215, 267, 313, 216, 410, 901, 314, 484, 512, 305, 212])
    return f"({area}) {_rng.randint(200, 999)}-{_rng.randint(1000, 9999)}"


def _gen_email(name: str) -> str:
    parts = name.lower().split()
    sep    = _rng.choice(["", ".", "_"])
    handle = parts[0] + sep + (parts[-1] if len(parts) > 1 else "")
    domain = _rng.choice(["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "aol.com"])
    return f"{handle}{_rng.randint(1, 99)}@{domain}"


def _gen_history(years_owned: int, purchase_price: int) -> list:
    history = []
    base_date = datetime.now(timezone.utc) - timedelta(days=365 * years_owned)

    history.append({
        "date": base_date.isoformat(),
        "type": "Deed Transfer",
        "amount": purchase_price,
        "description": f"Warranty deed recorded, ${purchase_price:,} sale price",
    })
    if _rng.random() > 0.4:
        history.append({
            "date": (base_date + timedelta(days=30)).isoformat(),
            "type": "Mortgage Recording",
            "amount": int(purchase_price * 0.8),
            "description": f"First mortgage recorded with {_rng.choice(['Wells Fargo', 'Bank of America', 'Local Credit Union'])}",
        })
    if _rng.random() > 0.6:
        history.append({
            "date": (datetime.now(timezone.utc) - timedelta(days=_rng.randint(180, 720))).isoformat(),
            "type": "Tax Lien Filed",
            "amount": _rng.randint(2500, 18000),
            "description": "County tax lien recorded for unpaid property taxes",
        })
    if _rng.random() > 0.7:
        history.append({
            "date": (datetime.now(timezone.utc) - timedelta(days=_rng.randint(60, 365))).isoformat(),
            "type": "Code Violation",
            "amount": 0,
            "description": _rng.choice([
                "L&I citation: Unsafe structure",
                "Vacant property registration overdue",
                "Exterior maintenance violation",
            ]),
        })
    return history


def _gen_skip_trace_data(contact_name: str, owner_last: str) -> dict:
    """BUG 8 FIX: Generate skip trace data in the exact shape SkipTracePanel expects.
    Previously stored as flat _seed_phones_mobile / _seed_emails lists that nothing
    could read. Now matches: {mobile_lines, landlines, emails, relatives, provider}.
    """
    mobile_lines = [
        {
            "number":     _gen_phone(),
            "carrier":    _rng.choice(CARRIERS),
            "confidence": _rng.choice(CONFIDENCE),
            "type":       "Mobile",
        }
        for _ in range(_rng.randint(1, 3))
    ]
    landlines = [
        {
            "number":  _gen_phone(),
            "carrier": _rng.choice(CARRIERS),
        }
        for _ in range(_rng.randint(0, 2))
    ]
    emails    = [_gen_email(contact_name) for _ in range(_rng.randint(1, 3))]
    relatives = [
        f"{_rng.choice(FIRST_NAMES)} {owner_last}"
        for _ in range(_rng.randint(1, 3))
    ]
    return {
        "mobile_lines": mobile_lines,
        "landlines":    landlines,
        "emails":       emails,
        "relatives":    relatives,
        "owner_name":   contact_name,
        "mailing_address": None,  # populated from property record
        "provider":     "Seed Data / Endato Mock",
    }


def _generate_property() -> dict:
    city = _rng.choice(CITIES)

    apn         = f"{_rng.randint(10, 99)}-{_rng.randint(1000, 9999)}-{_rng.randint(100, 999)}"
    street_num  = _rng.randint(100, 9999)
    site_address = f"{street_num} {_rng.choice(STREET_NAMES)} {_rng.choice(STREET_TYPES)}"

    sqft        = _rng.randint(800, 3200)
    year_built  = _rng.randint(1890, 1995)
    beds        = _rng.choice([2, 3, 3, 4, 4, 5])
    # BUG 6 FIX: min 1.0 bath — previous formula could yield 0.5
    baths       = _rng.choice([1.0, 1.5, 2.0, 2.0, 2.5, 3.0, 3.5])
    lot_size    = _rng.randint(1500, 9500)

    market_value    = _rng.randint(45000, 320000)
    purchase_price  = int(market_value * _rng.uniform(0.4, 0.9))
    mortgage_balance = int(purchase_price * _rng.uniform(0, 0.85))
    annual_taxes    = int(market_value * _rng.uniform(0.012, 0.028))
    tax_owed        = int(annual_taxes * _rng.uniform(1.5, 4))
    years_owned     = _rng.randint(3, 25)

    is_llc = _rng.random() > 0.65
    owner_last = _rng.choice(LAST_NAMES)
    if is_llc:
        owner_name   = f"{owner_last} {_rng.choice(LLC_SUFFIXES)}"
        contact_name = f"{_rng.choice(FIRST_NAMES)} {_rng.choice(LAST_NAMES)}"
    else:
        contact_name = f"{_rng.choice(FIRST_NAMES)} {owner_last}"
        owner_name   = contact_name

    absentee = _rng.random() > 0.4
    if absentee:
        mailing_city = _rng.choice([c for c in CITIES if c["city"] != city["city"]])
        mailing_address = (
            f"{_rng.randint(100, 9999)} {_rng.choice(STREET_NAMES)} {_rng.choice(STREET_TYPES)}, "
            f"{mailing_city['city']}, {mailing_city['state']} {mailing_city['zip_code']}"
        )
    else:
        # BUG 1 FIX: zip_code not zip — matches data model used throughout codebase
        mailing_address = f"{site_address}, {city['city']}, {city['state']} {city['zip_code']}"

    distress_statuses = _rng.sample(DISTRESS_STATUSES, k=_rng.randint(1, 3))

    lat = city["lat"] + _rng.uniform(-0.05, 0.05)
    lng = city["lng"] + _rng.uniform(-0.05, 0.05)

    equity     = market_value - mortgage_balance
    # BUG 7 FIX: store as integer to match Math.round() usage in frontend
    equity_pct = round((equity / market_value) * 100) if market_value > 0 else 0

    # BUG 3+4 FIX: no sentinel string; None when no key so PropertyCard uses placeholder
    google_api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if google_api_key:
        fmt_addr  = f"{site_address}, {city['city']}, {city['state']} {city['zip_code']}"
        image_url = (
            f"https://maps.googleapis.com/maps/api/streetview"
            f"?size=600x400&location={fmt_addr.replace(' ', '+')}&key={google_api_key}"
        )
    else:
        image_url = None  # PropertyCard renders "//" placeholder for null

    # BUG 8 FIX: skip trace data in correct shape — not flat _seed_* fields
    skip_trace_data = _gen_skip_trace_data(contact_name, owner_last)
    skip_trace_data["mailing_address"] = mailing_address

    return {
        "id":              str(uuid.uuid4()),
        "apn":             apn,
        "opa_account":     f"OPA-{_rng.randint(100000, 999999)}",
        "site_address":    site_address,
        "city":            city["city"],
        "state":           city["state"],
        "zip_code":        city["zip_code"],   # BUG 1 FIX: was "zip"
        "lat":             lat,
        "lng":             lng,
        "beds":            beds,
        "baths":           baths,
        "sqft":            sqft,
        "lot_size":        lot_size,
        "year_built":      year_built,
        "foundation":      _rng.choice(FOUNDATIONS),
        "roof_type":       _rng.choice(ROOF_TYPES),
        "heat_type":       _rng.choice(HEAT_TYPES),
        "property_type":   _rng.choice(["Single Family", "Single Family", "Duplex", "Row Home", "Multi-Family 2-4"]),
        "stories":         _rng.choice([1, 2, 2, 3]),
        "vacant":          "Vacant" in " ".join(distress_statuses),
        "distress_statuses": distress_statuses,
        "primary_status":  distress_statuses[0],
        "market_value":    market_value,
        "purchase_price":  purchase_price,
        "mortgage_balance": mortgage_balance,
        "equity":          equity,
        "equity_pct":      equity_pct,
        "annual_taxes":    annual_taxes,
        "tax_owed":        tax_owed,
        "tax_delinquent_years": _rng.randint(1, 5) if "Tax" in " ".join(distress_statuses) else 0,
        "owner_name":      owner_name,
        "owner_is_llc":    is_llc,
        "owner_contact_name": contact_name,
        "owner_mailing_address": mailing_address,
        "owner_absentee":  absentee,
        "estimated_rent":  int(sqft * _rng.uniform(0.9, 2.2)),
        "image_url":       image_url,
        "history":         _gen_history(years_owned, purchase_price),
        # BUG 8 FIX: skip_trace_data now in correct shape for SkipTracePanel;
        # skip_traced pre-set to True so seeded records show contact data immediately
        "skip_traced":     True,
        "skip_trace_data": skip_trace_data,
        "created_at":      datetime.now(timezone.utc).isoformat(),
    }


def generate_properties(n: int = 60) -> list[dict]:
    return [_generate_property() for _ in range(n)]
