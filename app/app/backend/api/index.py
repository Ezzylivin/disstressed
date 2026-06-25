"""Off-Market Property Intelligence Platform — FastAPI backend."""
import os
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from io import BytesIO

# BUG 3 FIX: sys.path.insert removed throughout
import bcrypt
import httpx          # BUG 2 FIX: replaces synchronous requests everywhere
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from api.courthouse_orchestrator import execute_courthouse_sync
from seed_data import generate_properties
from underwriting import underwrite as run_underwrite, estimate_repair_cost
from excel_export import build_export

# ─────────────────────────────────────────────────────────────────────────────
# ENVIRONMENT & STARTUP VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("propintel")

MONGO_URL  = os.environ.get("MONGO_URL")
DB_NAME    = os.environ.get("DB_NAME", "propintel")
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALG    = "HS256"

if not MONGO_URL:
    raise RuntimeError("MONGO_URL environment variable is not set.")

# BUG 4 FIX: no hardcoded fallback — fail loudly in production
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

# BUG 5 FIX: admin key also required explicitly — no hardcoded default
INTERNAL_KEY = os.environ.get("INTERNAL_SYSTEM_KEY")
if not INTERNAL_KEY:
    raise RuntimeError("INTERNAL_SYSTEM_KEY environment variable is not set.")

client = AsyncIOMotorClient(MONGO_URL)
db     = client[DB_NAME]

# ─────────────────────────────────────────────────────────────────────────────
# LIFESPAN  (BUG 10 FIX: replaces deprecated @app.on_event)
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ──────────────────────────────────────────────────────────────
    try:
        logger.info("Connecting to MongoDB...")
        await client.admin.command("ping")

        await db.users.create_index("email", unique=True)
        await db.properties.create_index("id", unique=True)
        await db.properties.create_index("city")
        await db.properties.create_index("state")
        await db.lists.create_index("id", unique=True)

        # Seed admin user
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@propintel.io").lower()
        admin_pw    = os.environ.get("ADMIN_PASSWORD", "Demo2026!")
        existing    = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "id":            str(uuid.uuid4()),
                "email":         admin_email,
                "name":          "Admin",
                "role":          "admin",
                "password_hash": _hash_password(admin_pw),
                "created_at":    datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Admin user seeded.")
        elif not _verify_password(admin_pw, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": _hash_password(admin_pw)}},
            )

        # BUG 1 FIX: seed 200 properties, not 50000 — prevents blocking the
        # event loop for 30-60s and triggering a Render/Vercel startup timeout.
        # Increase via SEED_COUNT env var if needed; insert in batches.
        count = await db.properties.count_documents({})
        if count == 0:
            seed_n = int(os.environ.get("SEED_COUNT", "200"))
            props  = generate_properties(seed_n)
            # Insert in batches of 100 to avoid a single oversized write
            batch_size = 100
            for i in range(0, len(props), batch_size):
                await db.properties.insert_many(props[i : i + batch_size])
            logger.info(f"Seeded {len(props)} properties.")

    except Exception as err:
        logger.critical(f"Startup error: {err}", exc_info=True)
        raise

    yield  # ── application running ──────────────────────────────────────────

    # ── shutdown ─────────────────────────────────────────────────────────────
    client.close()
    logger.info("MongoDB connection closed.")


app = FastAPI(title="PropIntel API", lifespan=lifespan)
api = APIRouter(prefix="/api")

# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    email:    EmailStr
    password: str
    name:     Optional[str] = None

class LoginIn(BaseModel):
    email:    EmailStr
    password: str

class UnderwriteIn(BaseModel):
    scope:         str   = "moderate"
    cap_rate:      float = 0.08
    vacancy_rate:  float = 0.08
    expense_ratio: float = 0.40
    comps_psf:     Optional[float] = None

class ListCreateIn(BaseModel):
    name:         str
    property_ids: List[str] = []

class ListUpdateIn(BaseModel):
    name:         Optional[str]       = None
    property_ids: Optional[List[str]] = None

class RealPropertyIn(BaseModel):
    id:                str       = Field(default_factory=lambda: str(uuid.uuid4()))
    site_address:      str
    city:              str
    state:             str
    zip_code:          Optional[str] = None
    apn:               Optional[str] = None
    owner_name:        Optional[str] = None
    market_value:      float
    equity_pct:        float
    distress_statuses: List[str] = []
    vacant:            bool = False
    owner_absentee:    bool = False

class LocalCountyInput(BaseModel):
    site_address:      str
    city:              str
    state:             str
    distress_statuses: List[str]
    vacant:            bool = False

class CourthouseSyncIn(BaseModel):
    courthouses: List[str]

# ─────────────────────────────────────────────────────────────────────────────
# AUTH HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def _make_token(uid: str, email: str) -> str:
    payload = {
        "sub":   uid,
        "email": email,
        "type":  "access",
        "exp":   datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def _current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one(
            {"id": payload["sub"]}, {"_id": 0, "password_hash": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─────────────────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────────────────
def _clean(p: dict) -> dict:
    """Strip internal/Mongo fields before returning to client."""
    return {k: v for k, v in p.items() if not k.startswith("_") and k != "_id"}

def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        "access_token", token,
        httponly=True, secure=True, samesite="none",
        max_age=43200, path="/",
    )

# ─────────────────────────────────────────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id":            uid,
        "email":         email,
        "name":          payload.name or email.split("@")[0],
        "role":          "user",
        "password_hash": _hash_password(payload.password),
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = _make_token(uid, email)
    _set_auth_cookie(response, token)
    return {"id": uid, "email": email, "name": doc["name"], "role": "user", "token": token}

@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user  = await db.users.find_one({"email": email})
    if not user or not _verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _make_token(user["id"], email)
    _set_auth_cookie(response, token)
    return {
        "id": user["id"], "email": email,
        "name": user.get("name"), "role": user.get("role", "user"),
        "token": token,
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(_current_user)):
    return {"id": user["id"], "email": user["email"],
            "name": user.get("name"), "role": user.get("role", "user")}

# ─────────────────────────────────────────────────────────────────────────────
# PROPERTIES
# ─────────────────────────────────────────────────────────────────────────────
@api.get("/properties")
async def list_properties(
    user:                dict  = Depends(_current_user),
    city:                Optional[str]   = None,
    state:               Optional[str]   = None,
    vacant_only:         bool  = False,
    tax_delinquent_only: bool  = False,
    pre_foreclosure_only:bool  = False,
    absentee_only:       bool  = False,
    skip_traced_only:    bool  = False,
    min_equity_pct:      Optional[float] = None,
    max_price:           Optional[float] = None,
    min_sqft:            Optional[int]   = None,
    max_sqft:            Optional[int]   = None,
    min_beds:            Optional[int]   = None,
    search:              Optional[str]   = None,
    limit:               int   = 200,
):
    q: dict = {}
    if city:             q["city"]          = city
    if state:            q["state"]         = state
    if vacant_only:      q["vacant"]        = True
    if absentee_only:    q["owner_absentee"]= True
    if skip_traced_only: q["skip_traced"]   = True
    if min_equity_pct is not None:
        q["equity_pct"] = {"$gte": min_equity_pct}
    if max_price is not None:
        q["market_value"] = {"$lte": max_price}
    if min_sqft is not None or max_sqft is not None:
        sq: dict = {}
        if min_sqft is not None: sq["$gte"] = min_sqft
        if max_sqft is not None: sq["$lte"] = max_sqft
        q["sqft"] = sq
    if min_beds is not None:
        q["beds"] = {"$gte": min_beds}

    # BUG 7 FIX: tax_delinquent and pre_foreclosure can both be active —
    # build conditions list and merge with $and instead of overwriting q["distress_statuses"]
    distress_conditions = []
    if tax_delinquent_only:
        distress_conditions.append({"distress_statuses": {"$regex": "Tax Delinquent"}})
    if pre_foreclosure_only:
        distress_conditions.append({
            "distress_statuses": {"$in": ["Pre-Foreclosure", "Notice of Default (NOD)", "Lis Pendens"]}
        })
    if distress_conditions:
        q.setdefault("$and", []).extend(distress_conditions)

    if search:
        q["$or"] = [
            {"site_address": {"$regex": search, "$options": "i"}},
            {"city":         {"$regex": search, "$options": "i"}},
            {"owner_name":   {"$regex": search, "$options": "i"}},
            {"apn":          {"$regex": search, "$options": "i"}},
        ]

    cursor = db.properties.find(q).limit(limit)
    items  = [_clean(p) async for p in cursor]
    return {"items": items, "total": len(items)}

@api.get("/properties/stats")
async def property_stats(user: dict = Depends(_current_user)):
    total    = await db.properties.count_documents({})
    vacant   = await db.properties.count_documents({"vacant": True})
    tax_del  = await db.properties.count_documents({"distress_statuses": {"$regex": "Tax Delinquent"}})
    absentee = await db.properties.count_documents({"owner_absentee": True})
    skip     = await db.properties.count_documents({"skip_traced": True})
    return {"total": total, "vacant": vacant, "tax_delinquent": tax_del,
            "absentee": absentee, "skip_traced": skip}

@api.get("/properties/{pid}")
async def get_property(pid: str, user: dict = Depends(_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    return _clean(p)

@api.post("/properties/{pid}/underwrite")
async def underwrite_property(pid: str, payload: UnderwriteIn,
                              user: dict = Depends(_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    result = run_underwrite(
        p, scope=payload.scope, cap_rate=payload.cap_rate,
        vacancy_rate=payload.vacancy_rate, expense_ratio=payload.expense_ratio,
        comps_psf=payload.comps_psf,
    )
    await db.properties.update_one({"id": pid}, {"$set": {"underwrite": result}})
    return result

@api.post("/properties/{pid}/skip-trace")
async def skip_trace(pid: str, user: dict = Depends(_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")

    mobiles   = []
    landlines = []
    emails    = []
    relatives = []
    provider  = "No API key configured"

    batch_key = os.environ.get("BATCH_DATA_API_KEY")
    if batch_key:
        try:
            # BUG 2 FIX: httpx.AsyncClient instead of synchronous requests.post
            async with httpx.AsyncClient(timeout=10) as client_http:
                res = await client_http.post(
                    "https://api.batchdata.com/api/v1/skiptrace/single",
                    headers={
                        "Authorization": f"Bearer {batch_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "propertyAddress": {
                            "street": p.get("site_address"),
                            "city":   p.get("city"),
                            "state":  p.get("state"),
                            "zip":    p.get("zip_code", ""),
                        },
                        "searchType": "property",
                    },
                )
            provider = "BatchData"
            if res.status_code == 200:
                persons = res.json().get("results", {}).get("persons", [])
                if persons:
                    owner = persons[0]
                    for phone in owner.get("phones", []):
                        node = {
                            "number":     phone.get("number"),
                            "type":       phone.get("type", "Mobile").capitalize(),
                            "carrier":    phone.get("carrier", "Unknown"),
                            "confidence": phone.get("score", "High"),
                        }
                        if "landline" in node["type"].lower():
                            landlines.append(node)
                        else:
                            mobiles.append(node)
                    emails    = [e.get("address") for e in owner.get("emails", []) if e.get("address")]
                    relatives = [r.get("name") for r in owner.get("relatives", []) if r.get("name")]
        except Exception as e:
            logger.error(f"Skip-trace error for {pid}: {e}")
            provider = "BatchData (error)"

    # BUG 6 FIX: don't write fake placeholder phone number to DB —
    # return empty lists and let the frontend show the "no results" state
    data = {
        "owner_name":      p.get("owner_name", ""),
        "contact_name":    p.get("owner_contact_name", ""),
        "mailing_address": p.get("owner_mailing_address") or f"{p.get('site_address')}, {p.get('city')}, {p.get('state')}",
        "apn":             p.get("apn"),
        "mobile_lines":    mobiles,
        "landlines":       landlines,
        "emails":          emails,
        "relatives":       relatives[:4],
        "traced_at":       datetime.now(timezone.utc).isoformat(),
        "provider":        provider,
    }
    await db.properties.update_one(
        {"id": pid},
        {"$set": {"skip_traced": True, "skip_trace_data": data}},
    )
    return data

@api.post("/properties/repair-estimate")
async def repair_estimate(payload: dict, user: dict = Depends(_current_user)):
    scope = payload.pop("scope", "moderate")
    return estimate_repair_cost(payload, scope=scope)

# ─────────────────────────────────────────────────────────────────────────────
# LISTS
# ─────────────────────────────────────────────────────────────────────────────
@api.get("/lists")
async def get_lists(user: dict = Depends(_current_user)):
    cursor = db.lists.find({"owner_id": user["id"]}, {"_id": 0})
    return {"items": [item async for item in cursor]}

@api.post("/lists")
async def create_list(payload: ListCreateIn, user: dict = Depends(_current_user)):
    lid = str(uuid.uuid4())
    doc = {
        "id":           lid,
        "owner_id":     user["id"],
        "name":         payload.name,
        "property_ids": payload.property_ids,
        "created_at":   datetime.now(timezone.utc).isoformat(),
    }
    await db.lists.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.patch("/lists/{lid}")
async def update_list(lid: str, payload: ListUpdateIn, user: dict = Depends(_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    update = {}
    if payload.name is not None:         update["name"]         = payload.name
    if payload.property_ids is not None: update["property_ids"] = payload.property_ids
    if update:
        await db.lists.update_one({"id": lid}, {"$set": update})
    return await db.lists.find_one({"id": lid}, {"_id": 0})

@api.delete("/lists/{lid}")
async def delete_list(lid: str, user: dict = Depends(_current_user)):
    res = await db.lists.delete_one({"id": lid, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="List not found")
    return {"ok": True}

@api.post("/lists/{lid}/add/{pid}")
async def add_to_list(lid: str, pid: str, user: dict = Depends(_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    pids = lst.get("property_ids", [])
    if pid not in pids:
        pids.append(pid)
        await db.lists.update_one({"id": lid}, {"$set": {"property_ids": pids}})
    return {"ok": True, "property_ids": pids}

@api.post("/lists/{lid}/remove/{pid}")
async def remove_from_list(lid: str, pid: str, user: dict = Depends(_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    pids = [x for x in lst.get("property_ids", []) if x != pid]
    await db.lists.update_one({"id": lid}, {"$set": {"property_ids": pids}})
    return {"ok": True, "property_ids": pids}

@api.get("/lists/{lid}/export")
async def export_list(lid: str, user: dict = Depends(_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    props = [_clean(p) async for p in db.properties.find(
        {"id": {"$in": lst.get("property_ids", [])}}
    )]
    for p in props:
        if not p.get("underwrite"):
            p["underwrite"] = run_underwrite(p)
    xlsx = build_export(props)
    filename = f"propintel_{lst['name'].replace(' ', '_')}.xlsx"
    return StreamingResponse(
        BytesIO(xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@api.post("/export/properties")
async def export_arbitrary(payload: dict, user: dict = Depends(_current_user)):
    pids = payload.get("property_ids", [])
    if not pids:
        raise HTTPException(status_code=400, detail="property_ids required")
    props = [_clean(p) async for p in db.properties.find({"id": {"$in": pids}})]
    for p in props:
        if not p.get("underwrite"):
            p["underwrite"] = run_underwrite(p)
    xlsx = build_export(props)
    return StreamingResponse(
        BytesIO(xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="propintel_export.xlsx"'},
    )

# ─────────────────────────────────────────────────────────────────────────────
# COURTHOUSE SYNC
# ─────────────────────────────────────────────────────────────────────────────
@api.post("/courthouse/sync")
async def sync_courthouses(payload: CourthouseSyncIn, user: dict = Depends(_current_user)):
    if not payload.courthouses:
        raise HTTPException(status_code=400, detail="No courthouses selected")
    inserted = await execute_courthouse_sync(payload.courthouses, db)
    return {"status": "success", "inserted_records": inserted}

# ─────────────────────────────────────────────────────────────────────────────
# ADMIN INGESTION
# ─────────────────────────────────────────────────────────────────────────────
def _verify_internal_key(request: Request) -> None:
    """Raises 401 if the X-PropIntel-Key header doesn't match INTERNAL_SYSTEM_KEY."""
    if request.headers.get("X-PropIntel-Key") != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@api.post("/admin/ingest-lead")
async def ingest_lead(payload: RealPropertyIn, request: Request):
    _verify_internal_key(request)
    existing = await db.properties.find_one({"site_address": payload.site_address.upper()})
    if existing:
        merged = list(set(existing.get("distress_statuses", []) + payload.distress_statuses))
        await db.properties.update_one(
            {"id": existing["id"]},
            {"$set": {"distress_statuses": merged}},
        )
        return {"status": "updated", "id": existing["id"]}
    doc = payload.model_dump()
    doc["site_address"] = doc["site_address"].upper()
    doc["created_at"]   = datetime.now(timezone.utc).isoformat()
    await db.properties.insert_one(doc)
    return {"status": "ingested", "id": doc["id"]}

@api.post("/admin/ingest-hybrid")
async def ingest_hybrid(payload: LocalCountyInput, request: Request):
    """Receives lean courthouse record, enriches via RentCast + BatchData, seeds DB."""
    _verify_internal_key(request)
    normalized = payload.site_address.strip().upper()

    existing = await db.properties.find_one({"site_address": normalized})
    if existing:
        merged = list(set(existing.get("distress_statuses", []) + payload.distress_statuses))
        await db.properties.update_one(
            {"id": existing["id"]},
            {"$set": {
                "distress_statuses": merged,
                "vacant": payload.vacant or existing.get("vacant", False),
            }},
        )
        return {"status": "updated", "id": existing["id"]}

    # Enrichment defaults — overwritten by API responses below
    market_value = 185000.0
    mortgage_balance = 0.0
    sqft  = 1650
    beds  = 3
    apn   = None

    # BUG 2 FIX: httpx.AsyncClient for both enrichment calls
    async with httpx.AsyncClient(timeout=8) as http:

        rentcast_key = os.environ.get("RENTCAST_API_KEY")
        if rentcast_key:
            try:
                rc = await http.get(
                    "https://api.rentcast.io/v1/properties",
                    headers={"X-Api-Key": rentcast_key},
                    params={"address": normalized, "city": payload.city, "state": payload.state},
                )
                if rc.status_code == 200 and rc.json():
                    d = rc.json()
                    if isinstance(d, list): d = d[0]
                    market_value = d.get("estimatedValue") or d.get("price") or market_value
                    sqft         = d.get("squareFootage") or sqft
                    beds         = d.get("bedrooms") or beds
                    apn          = d.get("parcelNumber")
            except Exception as e:
                logger.error(f"RentCast error: {e}")

        batch_key = os.environ.get("BATCH_DATA_API_KEY")
        if batch_key:
            try:
                br = await http.post(
                    "https://api.batchdata.com/api/v1/property/enrich",
                    headers={"Authorization": f"Bearer {batch_key}", "Content-Type": "application/json"},
                    json={"address": {"street": normalized, "city": payload.city, "state": payload.state}},
                )
                if br.status_code == 200:
                    fin = br.json().get("results", {}).get("financial", {})
                    mortgage_balance = fin.get("estimatedMortgageBalance") or 0
            except Exception as e:
                logger.error(f"BatchData enrich error: {e}")

    # BUG 8 FIX: equity_pct stored as integer to match frontend Math.round() usage
    equity_pct = round(
        ((market_value - mortgage_balance) / market_value * 100)
        if market_value > 0 else 0
    )

    doc = {
        "id":                str(uuid.uuid4()),
        "site_address":      normalized,
        "city":              payload.city.strip(),
        "state":             payload.state.strip().upper(),
        "zip_code":          None,
        "apn":               apn,
        "owner_name":        None,  # populated by skip-trace
        "market_value":      float(market_value),
        "mortgage_balance":  float(mortgage_balance),
        "equity_pct":        equity_pct,
        "sqft":              int(sqft),
        "beds":              int(beds),
        "distress_statuses": payload.distress_statuses,
        "vacant":            payload.vacant,
        # BUG 9 FIX: absentee not inferred from equity — default False,
        # let skip-trace or explicit import data set this correctly
        "owner_absentee":    False,
        "skip_traced":       False,
        "skip_trace_data":   None,
        "created_at":        datetime.now(timezone.utc).isoformat(),
    }
    await db.properties.insert_one(doc)
    return {"status": "ingested", "id": doc["id"]}

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────
@api.get("/")
async def root():
    return {"service": "PropIntel API", "status": "ok"}

# ─────────────────────────────────────────────────────────────────────────────
# MOUNT ROUTER + CORS
# BUG 11 FIX: wildcard origin with credentials=True is rejected by browsers.
# CORS_ORIGINS must be an explicit comma-separated list in the env var.
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(api)

_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
