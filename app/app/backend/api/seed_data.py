"""Seed realistic mock property data modeled after ATTOM/CoreLogic + USPS vacancy + municipal tax data across 52 jurisdictions."""
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

# Comprehensive 52-Jurisdiction Geographic Grid
CITIES = [
    {"city": "Birmingham", "state": "AL", "lat": 33.5186, "lng": -86.8104, "zip": "35203"},
    {"city": "Anchorage", "state": "AK", "lat": 61.2181, "lng": -149.9003, "zip": "99501"},
    {"city": "Phoenix", "state": "AZ", "lat": 33.4484, "lng": -112.0740, "zip": "85003"},
    {"city": "Little Rock", "state": "AR", "lat": 34.7465, "lng": -92.2896, "zip": "72201"},
    {"city": "Los Angeles", "state": "CA", "lat": 34.0522, "lng": -118.2437, "zip": "90012"},
    {"city": "Denver", "state": "CO", "lat": 39.7392, "lng": -104.9903, "zip": "80202"},
    {"city": "Hartford", "state": "CT", "lat": 41.7637, "lng": -72.6851, "zip": "06103"},
    {"city": "Wilmington", "state": "DE", "lat": 39.7391, "lng": -75.5514, "zip": "19801"},
    {"city": "Washington", "state": "DC", "lat": 38.9072, "lng": -77.0369, "zip": "20001"},
    {"city": "Miami", "state": "FL", "lat": 25.7617, "lng": -80.1918, "zip": "33128"},
    {"city": "Atlanta", "state": "GA", "lat": 33.7490, "lng": -84.3880, "zip": "30303"},
    {"city": "Honolulu", "state": "HI", "lat": 21.3069, "lng": -157.8583, "zip": "96813"},
    {"city": "Boise", "state": "ID", "lat": 43.6150, "lng": -116.2023, "zip": "83702"},
    {"city": "Chicago", "state": "IL", "lat": 41.8781, "lng": -87.6298, "zip": "60602"},
    {"city": "Indianapolis", "state": "IN", "lat": 39.7684, "lng": -86.1581, "zip": "46204"},
    {"city": "Des Moines", "state": "IA", "lat": 41.5868, "lng": -93.6250, "zip": "50309"},
    {"city": "Wichita", "state": "KS", "lat": 37.6872, "lng": -97.3301, "zip": "67202"},
    {"city": "Louisville", "state": "KY", "lat": 38.2527, "lng": -85.7585, "zip": "40202"},
    {"city": "New Orleans", "state": "LA", "lat": 29.9511, "lng": -90.0715, "zip": "70112"},
    {"city": "Portland", "state": "ME", "lat": 43.6591, "lng": -70.2568, "zip": "04101"},
    {"city": "Baltimore", "state": "MD", "lat": 39.2904, "lng": -76.6122, "zip": "21201"},
    {"city": "Boston", "state": "MA", "lat": 42.3601, "lng": -71.0589, "zip": "02108"},
    {"city": "Detroit", "state": "MI", "lat": 42.3314, "lng": -83.0458, "zip": "48201"},
    {"city": "Minneapolis", "state": "MN", "lat": 44.9778, "lng": -93.2650, "zip": "55401"},
    {"city": "Jackson", "state": "MS", "lat": 32.2988, "lng": -90.1848, "zip": "39201"},
    {"city": "St. Louis", "state": "MO", "lat": 38.6270, "lng": -90.1994, "zip": "63101"},
    {"city": "Billings", "state": "MT", "lat": 45.7833, "lng": -108.5007, "zip": "59101"},
    {"city": "Omaha", "state": "NE", "lat": 41.2565, "lng": -95.9345, "zip": "68102"},
    {"city": "Las Vegas", "state": "NV", "lat": 36.1716, "lng": -115.1391, "zip": "89101"},
    {"city": "Manchester", "state": "NH", "lat": 42.9956, "lng": -71.4548, "zip": "03101"},
    {"city": "Newark", "state": "NJ", "lat": 40.7357, "lng": -74.1724, "zip": "07102"},
    {"city": "Albuquerque", "state": "NM", "lat": 35.0844, "lng": -106.6511, "zip": "87102"},
    {"city": "New York City", "state": "NY", "lat": 40.7128, "lng": -74.0060, "zip": "10007"},
    {"city": "Charlotte", "state": "NC", "lat": 35.2271, "lng": -80.8431, "zip": "28202"},
    {"city": "Fargo", "state": "ND", "lat": 46.8772, "lng": -96.7898, "zip": "58102"},
    {"city": "Cleveland", "state": "OH", "lat": 41.4993, "lng": -81.6944, "zip": "44114"},
    {"city": "Oklahoma City", "state": "OK", "lat": 35.4676, "lng": -97.5164, "zip": "73102"},
    {"city": "Portland", "state": "OR", "lat": 45.5152, "lng": -122.6784, "zip": "97204"},
    {"city": "Philadelphia", "state": "PA", "lat": 39.9526, "lng": -75.1652, "zip": "19107"},
    {"city": "San Juan", "state": "PR", "lat": 18.4655, "lng": -66.1057, "zip": "00901"},
    {"city": "Providence", "state": "RI", "lat": 41.8240, "lng": -71.4128, "zip": "02903"},
    {"city": "Charleston", "state": "SC", "lat": 32.7765, "lng": -79.9309, "zip": "29401"},
    {"city": "Sioux Falls", "state": "SD", "lat": 43.5460, "lng": -96.7313, "zip": "57102"},
    {"city": "Memphis", "state": "TN", "lat": 35.1495, "lng": -90.0490, "zip": "38103"},
    {"city": "Houston", "state": "TX", "lat": 29.7604, "lng": -95.3698, "zip": "77002"},
    {"city": "Salt Lake City", "state": "UT", "lat": 40.7608, "lng": -111.8910, "zip": "84101"},
    {"city": "Burlington", "state": "VT", "lat": 44.4756, "lng": -73.2121, "zip": "05401"},
    {"city": "Richmond", "state": "VA", "lat": 37.5407, "lng": -77.4360, "zip": "23219"},
    {"city": "Seattle", "state": "WA", "lat": 47.6062, "lng": -122.3321, "zip": "98104"},
    {"city": "Charleston", "state": "WV", "lat": 38.3498, "lng": -81.6326, "zip": "25301"},
    {"city": "Milwaukee", "state": "WI", "lat": 43.0389, "lng": -87.9065, "zip": "53202"},
    {"city": "Cheyenne", "state": "WY", "lat": 41.1400, "lng": -104.8203, "zip": "82001"}
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
    area = random.choice([215, 267, 313, 216, 410, 901, 314, 484, 512, 305, 212])
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

    # lat/lng jitter within city bounds
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
