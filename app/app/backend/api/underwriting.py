"""Underwriting math engine: Repair Estimator + GRM + Cap Value + ARV."""
from datetime import datetime, timezone

# BUG 1 FIX: sys.path.insert removed — belongs in entrypoints, not library modules.

# ─────────────────────────────────────────────────────────────────────────────
# REPAIR COST MATRIX
# Localized $/sqft baselines modeled after RSMeans regional data.
# ─────────────────────────────────────────────────────────────────────────────
SCOPE_BASE_PSF = {
    "cosmetic":  18,   # paint, floors, fixtures
    "moderate":  42,   # kitchens, baths, mechanicals
    "full_gut":  95,   # studs-out, structural, MEP, code uplift
}

# BUG 4 FIX: All 52 jurisdictions covered with regional baselines.
# States not listed explicitly fall back to the DEFAULT values below.
# Labor index: multiplier on base PSF to reflect regional construction costs.
# Source: RSMeans City Cost Index / BLS regional construction data.
STATE_LABOR_INDEX = {
    "AL": 0.87, "AK": 1.25, "AZ": 1.02, "AR": 0.85,
    "CA": 1.45, "CO": 1.08, "CT": 1.15, "DE": 1.05,
    "DC": 1.20, "FL": 0.97, "GA": 0.92, "HI": 1.40,
    "ID": 0.95, "IL": 1.12, "IN": 0.93, "IA": 0.91,
    "KS": 0.89, "KY": 0.90, "LA": 0.88, "ME": 1.00,
    "MD": 1.10, "MA": 1.22, "MI": 0.92, "MN": 1.05,
    "MS": 0.84, "MO": 0.91, "MT": 0.96, "NE": 0.92,
    "NV": 1.05, "NH": 1.08, "NJ": 1.25, "NM": 0.93,
    "NY": 1.40, "NC": 0.90, "ND": 0.95, "OH": 0.90,
    "OK": 0.87, "OR": 1.10, "PA": 1.05, "PR": 0.80,
    "RI": 1.12, "SC": 0.88, "SD": 0.91, "TN": 0.88,
    "TX": 0.96, "UT": 1.03, "VT": 1.05, "VA": 1.00,
    "WA": 1.15, "WV": 0.88, "WI": 1.00, "WY": 0.94,
}
_DEFAULT_LABOR_INDEX = 1.0  # fallback for any unlisted state

# ARV comps baseline ($/sqft) by state when no market comps are provided.
# Derived from Zillow/ATTOM median price-per-sqft by metro, 2024 baseline.
STATE_ARV_PSF = {
    "AL":  95,  "AK": 185, "AZ": 195, "AR":  90,
    "CA": 450,  "CO": 280, "CT": 195, "DE": 175,
    "DC": 520,  "FL": 210, "GA": 165, "HI": 550,
    "ID": 210,  "IL": 155, "IN": 130, "IA": 120,
    "KS": 115,  "KY": 120, "LA": 130, "ME": 175,
    "MD": 195,  "MA": 330, "MI": 110, "MN": 170,
    "MS":  90,  "MO": 140, "MT": 220, "NE": 145,
    "NV": 220,  "NH": 230, "NJ": 280, "NM": 155,
    "NY": 290,  "NC": 175, "ND": 140, "OH": 125,
    "OK": 110,  "OR": 275, "PA": 165, "PR":  90,
    "RI": 255,  "SC": 175, "SD": 150, "TN": 175,
    "TX": 175,  "UT": 270, "VT": 210, "VA": 235,
    "WA": 340,  "WV":  95, "WI": 155, "WY": 190,
}
_DEFAULT_ARV_PSF = 150  # fallback for any unlisted state

FOUNDATION_ADDERS = {
    "Slab":       0,
    "Crawlspace": 2500,
    "Basement":   6500,
    "Pier & Beam":4000,
}

ROOF_PSF = {
    "Asphalt Shingle": 4.5,
    "Metal":           9.0,
    "Flat/Built-up":   6.5,
    "Tile":           12.0,
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def age_multiplier(year_built: int) -> float:
    # BUG 2 FIX: use timezone.utc — consistent with the rest of the codebase
    age = datetime.now(timezone.utc).year - year_built
    if age >= 100: return 1.35
    if age >= 60:  return 1.20
    if age >= 30:  return 1.10
    return 1.0


# ─────────────────────────────────────────────────────────────────────────────
# REPAIR COST ESTIMATOR
# ─────────────────────────────────────────────────────────────────────────────
def estimate_repair_cost(prop: dict, scope: str = "moderate") -> dict:
    sqft       = prop.get("sqft", 0) or 0
    year_built = prop.get("year_built", 1980)
    foundation = prop.get("foundation", "Slab")
    roof       = prop.get("roof_type", "Asphalt Shingle")
    state      = prop.get("state", "PA")
    stories    = prop.get("stories", 1) or 1

    base_psf       = SCOPE_BASE_PSF.get(scope, 42)
    age_mult       = age_multiplier(year_built)
    # BUG 4 FIX: explicit fallback constant instead of silent .get(state, 1.0)
    labor_mult     = STATE_LABOR_INDEX.get(state, _DEFAULT_LABOR_INDEX)

    structural      = sqft * base_psf * age_mult * labor_mult
    foundation_cost = FOUNDATION_ADDERS.get(foundation, 0)
    footprint       = sqft / stories
    roof_cost       = footprint * ROOF_PSF.get(roof, 4.5)

    subtotal    = structural + foundation_cost + roof_cost
    contingency = subtotal * 0.10
    total       = subtotal + contingency

    return {
        "scope":            scope,
        "structural":       round(structural),
        "foundation":       round(foundation_cost),
        "roof":             round(roof_cost),
        "contingency":      round(contingency),
        "total_repair_cost":round(total),
        "psf_effective":    round(total / sqft, 2) if sqft else 0,
        "assumptions": {
            "base_psf":       base_psf,
            "age_multiplier": age_mult,
            "labor_index":    labor_mult,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# ARV
# ─────────────────────────────────────────────────────────────────────────────
def calc_arv(prop: dict, comps_psf: float = None) -> dict:
    """After-Repair Value from regional comps PSF or state baseline."""
    sqft  = prop.get("sqft", 0) or 0
    state = prop.get("state", "PA")
    # BUG 4 FIX: full 52-state table instead of 6-state dict
    default_psf = STATE_ARV_PSF.get(state, _DEFAULT_ARV_PSF)
    psf         = comps_psf or default_psf
    return {
        "arv":       round(sqft * psf),
        "comps_psf": psf,
        "sqft":      sqft,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GRM  (Gross Rent Multiplier)
# ─────────────────────────────────────────────────────────────────────────────
def calc_grm(offer_price: float, gross_annual_rent: float) -> float:
    """GRM = Offer Price / Gross Annual Rent.
    BUG 6 FIX: accepts offer_price explicitly — using historic purchase_price
    (what the prior owner paid) makes GRM meaningless for a new acquisition.
    The caller passes max_offer_70 or a user-supplied price.
    """
    if gross_annual_rent <= 0:
        return 0.0
    return round(offer_price / gross_annual_rent, 2)


# ─────────────────────────────────────────────────────────────────────────────
# CAP VALUE  (V = NOI / R)
# ─────────────────────────────────────────────────────────────────────────────
def calc_cap_value(noi: float, cap_rate: float) -> float:
    if cap_rate <= 0:
        return 0.0
    return round(noi / cap_rate, 2)


# ─────────────────────────────────────────────────────────────────────────────
# FULL UNDERWRITE BUNDLE
# ─────────────────────────────────────────────────────────────────────────────
def underwrite(
    prop:          dict,
    scope:         str   = "moderate",
    cap_rate:      float = 0.08,
    vacancy_rate:  float = 0.08,
    expense_ratio: float = 0.40,
    comps_psf:     float = None,
) -> dict:
    """Full underwriting bundle for a single property."""
    repair   = estimate_repair_cost(prop, scope)
    arv_data = calc_arv(prop, comps_psf)

    gross_annual_rent  = (prop.get("estimated_rent") or 0) * 12
    effective_gross    = gross_annual_rent * (1 - vacancy_rate)
    operating_expenses = effective_gross * expense_ratio
    noi                = effective_gross - operating_expenses
    cap_value          = calc_cap_value(noi, cap_rate)

    # 70% rule: Max Offer = (ARV × 0.70) − Repair Cost
    max_offer_70 = arv_data["arv"] * 0.70 - repair["total_repair_cost"]
    # BUG 5 FIX: negative max offer means deal doesn't pencil — clamp and flag
    deal_viable  = max_offer_70 > 0
    max_offer_70 = max(round(max_offer_70), 0)

    # BUG 6 FIX: GRM calculated on max_offer_70 (investor's offer price),
    # not the property's historic purchase_price
    grm = calc_grm(
        offer_price       = max_offer_70,
        gross_annual_rent = gross_annual_rent,
    )

    purchase_price    = prop.get("purchase_price") or 0
    projected_profit  = arv_data["arv"] - purchase_price - repair["total_repair_cost"]
    total_invested    = purchase_price + repair["total_repair_cost"]

    # BUG 3 FIX: integer ROI — matches Math.round() in UnderwriteCalculator
    # BUG 7 NOTE: guard covers total_invested == 0 (acquisition + repair both zero)
    roi_pct = round((projected_profit / total_invested) * 100) if total_invested > 0 else 0

    return {
        "repair":               repair,
        "arv":                  arv_data,
        "gross_annual_rent":    round(gross_annual_rent),
        "effective_gross_income": round(effective_gross),
        "operating_expenses":   round(operating_expenses),
        "noi":                  round(noi),
        "cap_rate":             cap_rate,
        "cap_value":            cap_value,
        "grm":                  grm,
        "max_offer_70_rule":    max_offer_70,
        "deal_viable":          deal_viable,   # False when repair > 70% of ARV
        "projected_profit":     round(projected_profit),
        "roi_pct":              roi_pct,
        "assumptions": {
            "scope":           scope,
            "cap_rate":        cap_rate,
            "vacancy_rate":    vacancy_rate,
            "expense_ratio":   expense_ratio,
            "comps_psf_used":  arv_data["comps_psf"],
        },
    }
