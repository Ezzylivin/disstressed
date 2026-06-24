""""Underwriting math engine: Repair Estimator + GRM + Cap Value + ARV."""
from datetime import datetime
import sys
from pathlib import Path
# Directs Python to search the parent root folder for local modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# Localized repair cost matrix ($/sqft) — modeled after RSMeans/regional baselines
# scope levels: cosmetic, moderate, full_gut
SCOPE_BASE_PSF = {
    "cosmetic": 18,    # paint, floors, fixtures
    "moderate": 42,    # kitchens, baths, mechanicals
    "full_gut": 95,    # studs-out, structural, MEP, code uplift
}

# Age multiplier — older homes need more work
def age_multiplier(year_built: int) -> float:
    age = datetime.now().year - year_built
    if age >= 100:
        return 1.35
    if age >= 60:
        return 1.20
    if age >= 30:
        return 1.10
    return 1.0

# Foundation cost adders (flat $)
FOUNDATION_ADDERS = {
    "Slab": 0,
    "Crawlspace": 2500,
    "Basement": 6500,
    "Pier & Beam": 4000,
}

# Roof type cost ($/sqft of footprint)
ROOF_PSF = {
    "Asphalt Shingle": 4.5,
    "Metal": 9.0,
    "Flat/Built-up": 6.5,
    "Tile": 12.0,
}

# Localized labor index by state — multiplier on base PSF
STATE_LABOR_INDEX = {
    "PA": 1.05, "MI": 0.92, "OH": 0.90, "MD": 1.10,
    "TN": 0.88, "MO": 0.91, "CA": 1.45, "NY": 1.40,
}


def estimate_repair_cost(prop: dict, scope: str = "moderate") -> dict:
    sqft = prop.get("sqft", 0)
    year_built = prop.get("year_built", 1980)
    foundation = prop.get("foundation", "Slab")
    roof = prop.get("roof_type", "Asphalt Shingle")
    state = prop.get("state", "PA")
    stories = prop.get("stories", 1)

    base_psf = SCOPE_BASE_PSF.get(scope, 42)
    age_mult = age_multiplier(year_built)
    labor_mult = STATE_LABOR_INDEX.get(state, 1.0)

    structural = sqft * base_psf * age_mult * labor_mult
    foundation_cost = FOUNDATION_ADDERS.get(foundation, 0)
    footprint = sqft / max(stories, 1)
    roof_cost = footprint * ROOF_PSF.get(roof, 4.5)

    subtotal = structural + foundation_cost + roof_cost
    contingency = subtotal * 0.10
    total = subtotal + contingency

    return {
        "scope": scope,
        "structural": round(structural),
        "foundation": round(foundation_cost),
        "roof": round(roof_cost),
        "contingency": round(contingency),
        "total_repair_cost": round(total),
        "psf_effective": round(total / sqft, 2) if sqft else 0,
        "assumptions": {
            "base_psf": base_psf,
            "age_multiplier": age_mult,
            "labor_index": labor_mult,
        },
    }


def calc_grm(purchase_price: float, gross_annual_rent: float) -> float:
    if gross_annual_rent <= 0:
        return 0
    return round(purchase_price / gross_annual_rent, 2)


def calc_cap_value(noi: float, cap_rate: float) -> float:
    """V = NOI / R"""
    if cap_rate <= 0:
        return 0
    return round(noi / cap_rate, 2)


def calc_arv(prop: dict, comps_psf: float = None) -> dict:
    """After-Repair Value from regional comps PSF. Defaults to a localized baseline."""
    sqft = prop.get("sqft", 0)
    state = prop.get("state", "PA")
    # baseline ARV PSF by metro
    default_psf = {
        "PA": 165, "MI": 110, "OH": 125, "MD": 195,
        "TN": 175, "MO": 140,
    }.get(state, 150)
    psf = comps_psf or default_psf
    arv = sqft * psf
    return {
        "arv": round(arv),
        "comps_psf": psf,
        "sqft": sqft,
    }


def underwrite(prop: dict, scope: str = "moderate", cap_rate: float = 0.08,
               vacancy_rate: float = 0.08, expense_ratio: float = 0.40,
               comps_psf: float = None) -> dict:
    """Full underwriting bundle for a single property."""
    repair = estimate_repair_cost(prop, scope)
    arv_data = calc_arv(prop, comps_psf)
    gross_annual_rent = (prop.get("estimated_rent", 0) or 0) * 12
    effective_gross = gross_annual_rent * (1 - vacancy_rate)
    operating_expenses = effective_gross * expense_ratio
    noi = effective_gross - operating_expenses
    cap_value = calc_cap_value(noi, cap_rate)
    purchase_price = prop.get("purchase_price", 0) or 0
    grm = calc_grm(purchase_price, gross_annual_rent)

    # 70% rule: Max Offer = ARV * 0.70 - Repair Cost
    max_offer_70 = arv_data["arv"] * 0.70 - repair["total_repair_cost"]
    projected_profit = arv_data["arv"] - purchase_price - repair["total_repair_cost"]
    roi = (projected_profit / (purchase_price + repair["total_repair_cost"])) if (purchase_price + repair["total_repair_cost"]) > 0 else 0

    return {
        "repair": repair,
        "arv": arv_data,
        "gross_annual_rent": round(gross_annual_rent),
        "effective_gross_income": round(effective_gross),
        "operating_expenses": round(operating_expenses),
        "noi": round(noi),
        "cap_rate": cap_rate,
        "cap_value": cap_value,
        "grm": grm,
        "max_offer_70_rule": round(max_offer_70),
        "projected_profit": round(projected_profit),
        "roi_pct": round(roi * 100, 1),
        "assumptions": {
            "scope": scope,
            "cap_rate": cap_rate,
            "vacancy_rate": vacancy_rate,
            "expense_ratio": expense_ratio,
            "comps_psf_used": arv_data["comps_psf"],
        },
    }
"
