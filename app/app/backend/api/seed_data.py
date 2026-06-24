""""Seed realistic mock property data modeled after ATTOM/CoreLogic + USPS vacancy + municipal tax data."""
from datetime import datetime, timezone, timedelta
import random
import uuid
import sys
from pathlib import Path
# Directs Python to search the parent root folder for local modules
sys.path.insert(0, str(Path(__file__).parent.parent))

random.seed(42)

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
    {"city": "Philadelphia", "state": "PA", "lat": 39.9526, "lng": -75.1652, "zip": "19104"},
    {"city": "Detroit", "state": "MI", "lat": 42.3314, "lng": -83.0458, "zip": "48201"},
    {"city": "Cleveland", "state": "OH", "lat": 41.4993, "lng": -81.6944, "zip": "44114"},
    {"city": "Baltimore", "state": "MD", "lat": 39.2904, "lng": -76.6122, "zip": "21201"},
    {"city": "Memphis", "state": "TN", "lat": 35.1495, "lng": -90.0490, "zip": "38103"},
    {"city": "St. Louis", "state": "MO", "lat": 38.6270, "lng": -90.1994, "zip": "63101"},
]

STREET_NAMES = ["Walnut", "Oak", "Maple", "Cedar", "Elm", "Pine", "Spruce", "Chestnut", "Market", "Vine", "Locust", "Spring Garden", "Girard", "Lehigh", "Diamond"]
STREET_TYPES = ["St", "Ave", "Blvd", "Rd", "Ln", "Pl"]

FIRST_NAMES = ["Marcus", "James", "Linda", "Patricia", "Robert", "Karen", "Michael", "Susan", "David", "Barbara", "William", "Jennifer", "Carlos", "Aisha", "Trevor", "Maria"]
LAST_NAMES = ["Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson"]
LLC_SUFFIXES = ["Holdings LLC", "Properties LLC", "Trust", "Investments LLC", "Capital Partners"]

FOUNDATIONS = ["Slab", "Crawlspace", "Basement", "Pier & Beam"]
ROOF_TYPES = ["Asphalt Shingle", "Metal", "Flat/Built-up", "Tile"]
HEAT_TYPES = ["Forced Air", "Radiator", "Heat Pump", "None"]


def gen_phone(mobile=True):
    area = random.choice([215, 267, 313, 216, 410, 901, 314, 484])
    return f"({area}) {random.randint(200, 999)}-{random.randint(1000, 9999)}"


def gen_email(name):
    parts = name.lower().split()
    handle = parts[0] + random.choice(["", ".", "_"]) + (parts[-1] if len(parts) > 1 else "")
    domain = random.choice(["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "aol.com"])
    return f"{handle}{random.randint(1, 99)}@{domain}"


def gen_history(years_owned, purchase_price):
    """Generate realistic transaction history."""
    history = []
    base_date = datetime.now(timezone.utc) - timedelta(days=365 * years_owned)
    history.append({
        "date": base_date.isoformat(),
        "type": "Deed Transfer",
        "amount": purchase_price,
        "description": f"Warranty deed recorded, ${purchase_price:,} sale price",
    })
    if random.random() > 0.4:
        history.append({
            "date": (base_date + timedelta(days=30)).isoformat(),
            "type": "Mortgage Recording",
            "amount": int(purchase_price * 0.8),
            "description": f"First mortgage recorded with {random.choice(['Wells Fargo', 'Bank of America', 'Local Credit Union'])}",
        })
    if random.random() > 0.6:
        history.append({
            "date": (datetime.now(timezone.utc) - timedelta(days=random.randint(180, 720))).isoformat(),
            "type": "Tax Lien Filed",
            "amount": random.randint(2500, 18000),
            "description": "County tax lien recorded for unpaid property taxes",
        })
    if random.random() > 0.7:
        history.append({
            "date": (datetime.now(timezone.utc) - timedelta(days=random.randint(60, 365))).isoformat(),
            "type": "Code Violation",
            "amount": 0,
            "description": random.choice([
                "L&I citation: Unsafe structure",
                "Vacant property registration overdue",
                "Exterior maintenance violation",
            ]),
        })
    return history


def generate_property():
    city = random.choice(CITIES)
    pid = str(uuid.uuid4())
    apn = f"{random.randint(10, 99)}-{random.randint(1000, 9999)}-{random.randint(100, 999)}"
    street_num = random.randint(100, 9999)
    site_address = f"{street_num} {random.choice(STREET_NAMES)} {random.choice(STREET_TYPES)}"

    sqft = random.randint(800, 3200)
    year_built = random.randint(1890, 1995)
    beds = random.choice([2, 3, 3, 4, 4, 5])
    baths = round(random.uniform(1, 3.5) * 2) / 2
    lot_size = random.randint(1500, 9500)

    market_value = random.randint(45000, 320000)
    purchase_price = int(market_value * random.uniform(0.4, 0.9))
    mortgage_balance = int(purchase_price * random.uniform(0, 0.85))
    annual_taxes = int(market_value * random.uniform(0.012, 0.028))
    tax_owed = int(annual_taxes * random.uniform(1.5, 4))
    years_owned = random.randint(3, 25)

    # owner
    is_llc = random.random() > 0.65
    if is_llc:
        owner_name = f"{random.choice(LAST_NAMES)} {random.choice(LLC_SUFFIXES)}"
        owner_first = random.choice(FIRST_NAMES)
        owner_last = random.choice(LAST_NAMES)
        contact_name = f"{owner_first} {owner_last}"
    else:
        owner_first = random.choice(FIRST_NAMES)
        owner_last = random.choice(LAST_NAMES)
        owner_name = f"{owner_first} {owner_last}"
        contact_name = owner_name

    # absentee owner mailing address
    absentee = random.random() > 0.4
    if absentee:
        mailing_city = random.choice([c for c in CITIES if c["city"] != city["city"]])
        mailing_address = f"{random.randint(100, 9999)} {random.choice(STREET_NAMES)} {random.choice(STREET_TYPES)}, {mailing_city['city']}, {mailing_city['state']} {mailing_city['zip']}"
    else:
        mailing_address = f"{site_address}, {city['city']}, {city['state']} {city['zip']}"

    distress_statuses = random.sample(DISTRESS_STATUSES, k=random.randint(1, 3))

    # lat/lng jitter within city
    lat = city["lat"] + random.uniform(-0.05, 0.05)
    lng = city["lng"] + random.uniform(-0.05, 0.05)

    equity = market_value - mortgage_balance
    equity_pct = round((equity / market_value) * 100, 1) if market_value > 0 else 0

    return {
        "id": pid,
        "apn": apn,
        "opa_account": f"OPA-{random.randint(100000, 999999)}",
        "site_address": site_address,
        "city": city["city"],
        "state": city["state"],
        "zip": city["zip"],
        "lat": lat,
        "lng": lng,
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "lot_size": lot_size,
        "year_built": year_built,
        "foundation": random.choice(FOUNDATIONS),
        "roof_type": random.choice(ROOF_TYPES),
        "heat_type": random.choice(HEAT_TYPES),
        "property_type": random.choice(["Single Family", "Single Family", "Duplex", "Row Home", "Multi-Family 2-4"]),
        "stories": random.choice([1, 2, 2, 3]),
        "vacant": "Vacant" in " ".join(distress_statuses),
        "distress_statuses": distress_statuses,
        "primary_status": distress_statuses[0],
        "market_value": market_value,
        "purchase_price": purchase_price,
        "mortgage_balance": mortgage_balance,
        "equity": equity,
        "equity_pct": equity_pct,
        "annual_taxes": annual_taxes,
        "tax_owed": tax_owed,
        "tax_delinquent_years": random.randint(1, 5) if "Tax" in " ".join(distress_statuses) else 0,
        "owner_name": owner_name,
        "owner_is_llc": is_llc,
        "owner_contact_name": contact_name,
        "owner_mailing_address": mailing_address,
        "owner_absentee": absentee,
        "estimated_rent": int(sqft * random.uniform(0.9, 2.2)),
        "image_url": random.choice([
            "https://images.unsplash.com/photo-1722532851123-b07337a16bfa?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
            "https://images.pexels.com/photos/33350023/pexels-photo-33350023.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "https://images.pexels.com/photos/164558/pexels-photo-164558.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        ]),
        "history": gen_history(years_owned, purchase_price),
        "skip_traced": False,
        "skip_trace_data": None,
        "_seed_phones_mobile": [gen_phone(True) for _ in range(random.randint(1, 3))],
        "_seed_phones_land": [gen_phone(False) for _ in range(random.randint(0, 2))],
        "_seed_emails": [gen_email(contact_name) for _ in range(random.randint(1, 3))],
        "_seed_relatives": [f"{random.choice(FIRST_NAMES)} {owner_last}" for _ in range(random.randint(1, 3))],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def generate_properties(n=60):
    return [generate_property() for _ in range(n)]

