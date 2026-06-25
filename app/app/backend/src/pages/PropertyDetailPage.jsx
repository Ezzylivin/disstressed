import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fmtMoney, fmtNum } from "../lib/api";
import { AppShell } from "../components/AppShell";
import { SkipTracePanel } from "../components/SkipTracePanel";
import { UnderwriteCalculator } from "../components/UnderwriteCalculator";
import { toast } from "sonner";
import {
  ArrowLeft, FileSpreadsheet, Plus, History, MapPin, ChevronDown,
} from "lucide-react";
import "./PropertyDetailPage.css";

/* ─── Spec cell: reused in the property data grid ─── */
const Spec = ({ label, value, testid, accent }) => (
  <div className="spec-cell" data-testid={testid}>
    <span className="spec-label">{label}</span>
    <span className={`spec-value ${accent || ""}`}>{value ?? "—"}</span>
  </div>
);

/* ─── Section header ─── */
const SectionHead = ({ children }) => (
  <div className="section-head">{children}</div>
);

export default function PropertyDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [property, setProperty] = useState(null);
  const [lists, setLists] = useState([]);
  const [tab, setTab] = useState("overview");
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/properties/${id}`);
      setProperty(data);
      const r = await api.get("/lists");
      setLists(r.data.items || []);
    } catch {
      toast.error("Failed to load property record");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* Close list dropdown when clicking outside */
  useEffect(() => {
    if (!listMenuOpen) return;
    const close = () => setListMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [listMenuOpen]);

  const exportThis = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.post(
        "/export/properties",
        { property_ids: [id] },
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `propintel_${property.apn}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Exported to Excel");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const addToList = async (lid) => {
    setListMenuOpen(false);
    try {
      await api.post(`/lists/${lid}/add/${id}`);
      toast.success("Added to list");
    } catch {
      toast.error("Failed to add to list");
    }
  };

  const createList = async () => {
    setListMenuOpen(false);
    const name = prompt("List name?");
    if (!name) return;
    try {
      await api.post("/lists", { name, property_ids: [id] });
      toast.success(`Created list "${name}"`);
      load();
    } catch {
      toast.error("Failed to create list");
    }
  };

  if (!property) return (
    <AppShell>
      <div className="detail-loading">
        <span className="detail-loading-text">// LOADING DOSSIER...</span>
      </div>
    </AppShell>
  );

  const TABS = ["overview", "underwrite", "skip-trace", "history"];
  const equityGhost = Math.round(property.equity_pct || 0);

  return (
    <AppShell>
      <div className="detail-root">

        {/* ── IDENTITY BAR ── */}
        <div className="identity-bar">
          {/* Ghost equity number — the signature element */}
          <span className="identity-ghost" aria-hidden="true">{equityGhost}%</span>

          <div className="identity-inner">
            <button
              data-testid="back-btn"
              onClick={() => nav("/dashboard")}
              className="back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </button>

            <div className="identity-address-block">
              <h1 className="identity-address" data-testid="detail-address">
                {property.site_address}
              </h1>
              <div className="identity-meta">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{property.city}, {property.state} {property.zip}</span>
                <span className="identity-meta-divider" />
                <span>APN {property.apn}</span>
                {property.opa_account && (
                  <>
                    <span className="identity-meta-divider" />
                    <span>{property.opa_account}</span>
                  </>
                )}
              </div>
            </div>

            <div className="identity-actions">
              <button
                data-testid="action-add-spreadsheet"
                onClick={exportThis}
                disabled={exporting}
                className="btn-export"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting ? "Exporting..." : "Export (.xlsx)"}
              </button>

              {/* List dropdown */}
              <div className="list-dropdown-root" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  data-testid="action-add-list-btn"
                  onClick={() => setListMenuOpen((v) => !v)}
                  className="btn-list"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to List
                  <ChevronDown className={`w-3 h-3 list-chevron ${listMenuOpen ? "open" : ""}`} />
                </button>
                {listMenuOpen && (
                  <div className="list-menu">
                    {lists.length === 0 && (
                      <div className="list-menu-empty">No lists yet</div>
                    )}
                    {lists.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => addToList(l.id)}
                        data-testid={`add-list-option-${l.id}`}
                        className="list-menu-item"
                      >
                        {l.name}
                      </button>
                    ))}
                    <button
                      onClick={createList}
                      data-testid="action-create-list-btn"
                      className="list-menu-new"
                    >
                      <Plus className="w-3 h-3" /> New List
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`tab-btn ${tab === t ? "active" : ""}`}
            >
              {t.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <div className="detail-body">

          {/* ── MAIN COLUMN ── */}
          <main className="detail-main">

            {tab === "overview" && (
              <>
                {/* Property image + key specs side by side */}
                <div className="overview-top-grid">
                  <div className="overview-image-wrap">
                    {property.image_url
                      ? <img src={property.image_url} alt="Property" className="overview-image" />
                      : <div className="overview-image-placeholder">// NO IMAGE ON FILE</div>
                    }
                  </div>

                  <div className="spec-grid">
                    <Spec testid="spec-beds"       label="Beds"         value={property.beds} />
                    <Spec testid="spec-baths"      label="Baths"        value={property.baths} />
                    <Spec testid="spec-sqft"       label="Sq Ft"        value={fmtNum(property.sqft)} />
                    <Spec testid="spec-lot"        label="Lot Sq Ft"    value={fmtNum(property.lot_size)} />
                    <Spec testid="spec-year"       label="Year Built"   value={property.year_built} />
                    <Spec testid="spec-stories"    label="Stories"      value={property.stories} />
                    <Spec testid="spec-foundation" label="Foundation"   value={property.foundation} />
                    <Spec testid="spec-roof"       label="Roof"         value={property.roof_type} />
                  </div>
                </div>

                {/* Distress flags */}
                {property.distress_statuses?.length > 0 && (
                  <div className="distress-strip">
                    <SectionHead>Distress Flags</SectionHead>
                    <div className="distress-tags">
                      {property.distress_statuses.map((s) => (
                        <span key={s} className="distress-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial grid */}
                <SectionHead>Financial Summary</SectionHead>
                <div className="fin-grid">
                  <Spec testid="fin-market"   label="Market Value"     value={fmtMoney(property.market_value)}    accent="pop-lime" />
                  <Spec testid="fin-mortgage" label="Mortgage Balance" value={fmtMoney(property.mortgage_balance)} />
                  <Spec testid="fin-equity"   label={`Equity (${equityGhost}%)`} value={fmtMoney(property.equity)} accent="pop-lime" />
                  <Spec testid="fin-rent"     label="Est. Monthly Rent" value={fmtMoney(property.estimated_rent)} accent="pop-blue" />
                  <Spec testid="fin-taxes"    label="Annual Taxes"     value={fmtMoney(property.annual_taxes)} />
                  <Spec testid="fin-tax-owed" label="Tax Owed"         value={fmtMoney(property.tax_owed)}        accent="pop-red" />
                  <Spec testid="fin-tax-years" label="Years Delinquent" value={property.tax_delinquent_years}     accent={property.tax_delinquent_years > 0 ? "pop-red" : ""} />
                </div>

                {/* Owner of record */}
                <div className="owner-block">
                  <SectionHead>Owner of Record</SectionHead>
                  <div className="owner-name">{property.owner_name}</div>
                  <div className="owner-tags">
                    {property.owner_is_llc && <span className="owner-tag llc">LLC</span>}
                    {property.owner_absentee && <span className="owner-tag absentee">Absentee</span>}
                  </div>
                  {property.owner_mailing_address && (
                    <div className="owner-mailing">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {property.owner_mailing_address}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "underwrite" && (
              <div className="tab-panel">
                <UnderwriteCalculator property={property} />
              </div>
            )}

            {tab === "skip-trace" && (
              <div className="tab-panel">
                <SkipTracePanel property={property} onUpdate={setProperty} />
              </div>
            )}

            {tab === "history" && (
              <div className="tab-panel">
                <div className="history-table-wrap">
                  <div className="history-table-header">
                    <History className="w-4 h-4" strokeWidth={1.5} />
                    Transaction &amp; Title History
                  </div>
                  <table className="history-table" data-testid="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th className="text-right">Amount</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(property.history || [])]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((h, i) => (
                          <tr key={i}>
                            <td className="mono">{new Date(h.date).toLocaleDateString()}</td>
                            <td className="type-cell">{h.type}</td>
                            <td className="mono text-right">{h.amount ? fmtMoney(h.amount) : "—"}</td>
                            <td className="desc-cell">{h.description}</td>
                          </tr>
                        ))}
                      {!property.history?.length && (
                        <tr>
                          <td colSpan={4} className="history-empty">// No transaction history on file</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="detail-sidebar">
            <div className="sidebar-section">
              <SectionHead>Skip Trace</SectionHead>
              <SkipTracePanel property={property} onUpdate={setProperty} />
            </div>
            <div className="sidebar-section">
              <SectionHead>Quick Underwrite</SectionHead>
              <UnderwriteCalculator property={property} />
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
