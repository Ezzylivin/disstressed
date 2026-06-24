""""Excel export schema per Section 5 of spec (columns A-I)."""
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import sys
from pathlib import Path
# Directs Python to search the parent root folder for local modules
sys.path.insert(0, str(Path(__file__).parent.parent))


HEADERS = [
    ("A", "Account / Parcel ID", 22),
    ("B", "Site Address", 32),
    ("C", "Distressed Status", 28),
    ("D", "Estimated Repair Costs", 20),
    ("E", "After-Repair Value (ARV)", 22),
    ("F", "Owner Legal Name", 28),
    ("G", "Verified Mobile Line 1", 20),
    ("H", "Verified Mobile Line 2", 20),
    ("I", "Primary Active Email", 32),
]


def build_export(properties: list) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Off-Market Opportunities"

    header_font = Font(bold=True, color="FFFFFF", size=11, name="Calibri")
    header_fill = PatternFill("solid", fgColor="0A0A0A")
    border_thin = Side(border_style="thin", color="CCCCCC")
    cell_border = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    money = '"$"#,##0'

    # Title row
    ws.merge_cells("A1:I1")
    title = ws["A1"]
    title.value = "OFF-MARKET PROPERTY INTELLIGENCE — EXPORT"
    title.font = Font(bold=True, size=14, name="Calibri")
    title.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 26

    # Header row
    for idx, (col, name, width) in enumerate(HEADERS, start=1):
        cell = ws.cell(row=3, column=idx, value=name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = cell_border
        ws.column_dimensions[get_column_letter(idx)].width = width
    ws.row_dimensions[3].height = 36

    # Data rows
    for row_idx, p in enumerate(properties, start=4):
        underwrite = p.get("underwrite") or {}
        repair = (underwrite.get("repair") or {}).get("total_repair_cost", "")
        arv = (underwrite.get("arv") or {}).get("arv", "")
        skip = p.get("skip_trace_data") or {}
        mobiles = skip.get("mobile_lines", []) or []
        emails = skip.get("emails", []) or []

        mobile_1 = mobiles[0]["number"] if len(mobiles) > 0 else ""
        mobile_2 = mobiles[1]["number"] if len(mobiles) > 1 else ""
        email_1 = emails[0] if emails else ""

        values = [
            p.get("apn", ""),
            f"{p.get('site_address','')}, {p.get('city','')}, {p.get('state','')} {p.get('zip','')}",
            ", ".join(p.get("distress_statuses", [])) or p.get("primary_status", ""),
            repair,
            arv,
            p.get("owner_name", ""),
            mobile_1,
            mobile_2,
            email_1,
        ]
        for col_idx, val in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = cell_border
            cell.alignment = left_align
            if col_idx in (4, 5) and isinstance(val, (int, float)):
                cell.number_format = money

    # Freeze headers
    ws.freeze_panes = "A4"

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)
    return bio.read()

