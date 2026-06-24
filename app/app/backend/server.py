""""Off-Market Property Intelligence Platform — FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated
from io import BytesIO

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from seed_data import generate_properties
from underwriting import underwrite as run_underwrite, estimate_repair_cost
from excel_export import build_export


# ============ Setup ============
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("propintel")

app = FastAPI(title="PropIntel API")
api = APIRouter(prefix="/api")


# ============ Models ============
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "user"


class PropertyFilters(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    vacant_only: bool = False
    tax_delinquent_only: bool = False
    pre_foreclosure_only: bool = False
    absentee_only: bool = False
    min_equity_pct: Optional[float] = None
    max_price: Optional[float] = None
    min_sqft: Optional[int] = None
    max_sqft: Optional[int] = None
    min_beds: Optional[int] = None
    statuses: List[str] = []
    search: Optional[str] = None


class UnderwriteIn(BaseModel):
    scope: str = "moderate"
    cap_rate: float = 0.08
    vacancy_rate: float = 0.08
    expense_ratio: float = 0.40
    comps_psf: Optional[float] = None


class ListCreateIn(BaseModel):
    name: str
    property_ids: List[str] = []


class ListUpdateIn(BaseModel):
    name: Optional[str] = None
    property_ids: Optional[List[str]] = None


# ============ Auth helpers ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_access_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
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
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Startup ============
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.properties.create_index("id", unique=True)
    await db.properties.create_index("city")
    await db.properties.create_index("state")
    await db.lists.create_index("id", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@propintel.io").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Demo2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "password_hash": hash_password(admin_pw),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_pw, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pw)}})

    # Seed properties
    count = await db.properties.count_documents({})
    if count == 0:
        props = generate_properties(60)
        await db.properties.insert_many(props)
        logger.info(f"Seeded {len(props)} properties")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ============ Auth routes ============
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "name": payload.name or email.split("@")[0],
        "role": "user",
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_access_token(uid, email)
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax",
                        max_age=43200, path="/")
    return {"id": uid, "email": email, "name": doc["name"], "role": "user", "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax",
                        max_age=43200, path="/")
    return {"id": user["id"], "email": email, "name": user.get("name"), "role": user.get("role", "user"), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role", "user")}


# ============ Properties ============
def _clean(p: dict) -> dict:
    """Strip internal seed fields and Mongo _id."""
    out = {k: v for k, v in p.items() if not k.startswith("_seed_") and k != "_id"}
    return out


@api.get("/properties")
async def list_properties(
    user: dict = Depends(get_current_user),
    city: Optional[str] = None,
    state: Optional[str] = None,
    vacant_only: bool = False,
    tax_delinquent_only: bool = False,
    pre_foreclosure_only: bool = False,
    absentee_only: bool = False,
    skip_traced_only: bool = False,
    min_equity_pct: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqft: Optional[int] = None,
    max_sqft: Optional[int] = None,
    min_beds: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 200,
):
    q: dict = {}
    if city:
        q["city"] = city
    if state:
        q["state"] = state
    if vacant_only:
        q["vacant"] = True
    if absentee_only:
        q["owner_absentee"] = True
    if skip_traced_only:
        q["skip_traced"] = True
    if min_equity_pct is not None:
        q["equity_pct"] = {"$gte": min_equity_pct}
    if max_price is not None:
        q["market_value"] = {"$lte": max_price}
    if min_sqft is not None or max_sqft is not None:
        sq = {}
        if min_sqft is not None:
            sq["$gte"] = min_sqft
        if max_sqft is not None:
            sq["$lte"] = max_sqft
        q["sqft"] = sq
    if min_beds is not None:
        q["beds"] = {"$gte": min_beds}
    if tax_delinquent_only:
        q["distress_statuses"] = {"$regex": "Tax Delinquent"}
    if pre_foreclosure_only:
        q["distress_statuses"] = {"$in": ["Pre-Foreclosure", "Notice of Default (NOD)", "Lis Pendens"]}
    if search:
        q["$or"] = [
            {"site_address": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"owner_name": {"$regex": search, "$options": "i"}},
            {"apn": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.properties.find(q).limit(limit)
    items = [_clean(p) async for p in cursor]
    return {"items": items, "total": len(items)}


@api.get("/properties/stats")
async def property_stats(user: dict = Depends(get_current_user)):
    total = await db.properties.count_documents({})
    vacant = await db.properties.count_documents({"vacant": True})
    tax_del = await db.properties.count_documents({"distress_statuses": {"$regex": "Tax Delinquent"}})
    absentee = await db.properties.count_documents({"owner_absentee": True})
    skip = await db.properties.count_documents({"skip_traced": True})
    return {"total": total, "vacant": vacant, "tax_delinquent": tax_del,
            "absentee": absentee, "skip_traced": skip}


@api.get("/properties/{pid}")
async def get_property(pid: str, user: dict = Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    return _clean(p)


@api.post("/properties/{pid}/underwrite")
async def underwrite_property(pid: str, payload: UnderwriteIn, user: dict = Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    result = run_underwrite(p, scope=payload.scope, cap_rate=payload.cap_rate,
                            vacancy_rate=payload.vacancy_rate,
                            expense_ratio=payload.expense_ratio,
                            comps_psf=payload.comps_psf)
    await db.properties.update_one({"id": pid}, {"$set": {"underwrite": result}})
    return result


@api.post("/properties/{pid}/skip-trace")
async def skip_trace(pid: str, user: dict = Depends(get_current_user)):
    """Simulated skip-trace modeled on Endato/BatchSkipTracing payload schema."""
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")

    # Build response from seeded synthetic data
    mobiles = []
    carriers = ["Verizon Wireless", "T-Mobile", "AT&T Mobility", "US Cellular"]
    for i, num in enumerate(p.get("_seed_phones_mobile", [])):
        mobiles.append({
            "number": num,
            "type": "Mobile",
            "carrier": random.choice(carriers),
            "last_seen": (datetime.now(timezone.utc) - timedelta(days=random.randint(7, 240))).isoformat(),
            "confidence": random.choice(["High", "High", "Medium"]),
        })
    landlines = []
    for num in p.get("_seed_phones_land", []):
        landlines.append({
            "number": num,
            "type": "Landline",
            "carrier": "Comcast / Local Exchange",
            "last_seen": (datetime.now(timezone.utc) - timedelta(days=random.randint(60, 720))).isoformat(),
            "confidence": "Medium",
        })

    data = {
        "owner_name": p.get("owner_name"),
        "contact_name": p.get("owner_contact_name"),
        "mailing_address": p.get("owner_mailing_address"),
        "apn": p.get("apn"),
        "mobile_lines": mobiles,
        "landlines": landlines,
        "emails": p.get("_seed_emails", []),
        "relatives": p.get("_seed_relatives", []),
        "traced_at": datetime.now(timezone.utc).isoformat(),
        "provider": "Endato / EnformionGO (simulated)",
    }
    await db.properties.update_one({"id": pid}, {"$set": {"skip_traced": True, "skip_trace_data": data}})
    return data


@api.post("/properties/repair-estimate")
async def repair_estimate(payload: dict, user: dict = Depends(get_current_user)):
    """Standalone repair calc — accepts ad-hoc property attributes."""
    scope = payload.pop("scope", "moderate")
    return estimate_repair_cost(payload, scope=scope)


# ============ Lists ============
@api.get("/lists")
async def get_lists(user: dict = Depends(get_current_user)):
    cursor = db.lists.find({"owner_id": user["id"]}, {"_id": 0})
    items = [item async for item in cursor]
    return {"items": items}


@api.post("/lists")
async def create_list(payload: ListCreateIn, user: dict = Depends(get_current_user)):
    lid = str(uuid.uuid4())
    doc = {
        "id": lid,
        "owner_id": user["id"],
        "name": payload.name,
        "property_ids": payload.property_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.lists.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.patch("/lists/{lid}")
async def update_list(lid: str, payload: ListUpdateIn, user: dict = Depends(get_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    update = {}
    if payload.name is not None:
        update["name"] = payload.name
    if payload.property_ids is not None:
        update["property_ids"] = payload.property_ids
    if update:
        await db.lists.update_one({"id": lid}, {"$set": update})
    updated = await db.lists.find_one({"id": lid}, {"_id": 0})
    return updated


@api.delete("/lists/{lid}")
async def delete_list(lid: str, user: dict = Depends(get_current_user)):
    res = await db.lists.delete_one({"id": lid, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="List not found")
    return {"ok": True}


@api.post("/lists/{lid}/add/{pid}")
async def add_to_list(lid: str, pid: str, user: dict = Depends(get_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    pids = lst.get("property_ids", [])
    if pid not in pids:
        pids.append(pid)
        await db.lists.update_one({"id": lid}, {"$set": {"property_ids": pids}})
    return {"ok": True, "property_ids": pids}


@api.post("/lists/{lid}/remove/{pid}")
async def remove_from_list(lid: str, pid: str, user: dict = Depends(get_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    pids = [x for x in lst.get("property_ids", []) if x != pid]
    await db.lists.update_one({"id": lid}, {"$set": {"property_ids": pids}})
    return {"ok": True, "property_ids": pids}


@api.get("/lists/{lid}/export")
async def export_list(lid: str, user: dict = Depends(get_current_user)):
    lst = await db.lists.find_one({"id": lid, "owner_id": user["id"]})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    pids = lst.get("property_ids", [])
    props = [_clean(p) async for p in db.properties.find({"id": {"$in": pids}})]

    # Auto-underwrite any property that hasn't been underwritten so D/E columns are populated
    for p in props:
        if not p.get("underwrite"):
            p["underwrite"] = run_underwrite(p)

    xlsx_bytes = build_export(props)
    filename = f"propintel_{lst['name'].replace(' ', '_')}.xlsx"
    return StreamingResponse(
        BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api.post("/export/properties")
async def export_arbitrary(payload: dict, user: dict = Depends(get_current_user)):
    """Export an ad-hoc set of property_ids without saving a list."""
    pids = payload.get("property_ids", [])
    if not pids:
        raise HTTPException(status_code=400, detail="property_ids required")
    props = [_clean(p) async for p in db.properties.find({"id": {"$in": pids}})]
    for p in props:
        if not p.get("underwrite"):
            p["underwrite"] = run_underwrite(p)
    xlsx_bytes = build_export(props)
    return StreamingResponse(
        BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="propintel_export.xlsx"'},
    )


@api.get("/")
async def root():
    return {"service": "PropIntel API", "status": "ok"}


# Register router and CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
