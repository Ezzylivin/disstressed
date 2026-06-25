import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtMoney } from "../lib/api";
import { AppShell } from "../components/AppShell";
import { FilterSidebar } from "../components/FilterSidebar";
import { toast } from "sonner";
import { ChevronRight, FileSpreadsheet, Plus, CheckSquare, Square, Radio } from "lucide-react";
import "./DashboardPage.css";
import { PropertyMap } from "../components/PropertyMap";

export default function DashboardPage() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [tracingId, setTracingId] = useState(null);   // FIX 1: per-property instead of global boolean
  const [exporting, setExporting] = useState(false);  // FIX 2: guard export against double-clicks
  const [savingList, setSavingList] = useState(false); // FIX 2: guard list-save against double-clicks
  const [lists, setLists] = useState([]);
  const nav = useNavigate();

  // FIX 3: stable filters string via useMemo to avoid spurious re-renders
  const filtersKey = useMemo(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== false) params[k] = v;
    });
    return JSON.stringify(Object.keys(params).sort().reduce((acc, k) => { acc[k] = params[k]; return acc; }, {}));
  }, [filters]);

  // FIX 4: useCallback so the effect dep is stable and fetchProps is never stale
  const fetchProps = useCallback(async () => {
    setLoading(true);
    try {
      const params = JSON.parse(filtersKey);
      const { data } = await api.get("/properties", { params });
      setProperties(data?.items || (Array.isArray(data) ? data : []));
    } catch {
      toast.error("Failed to load property stream");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/properties/stats");
      setStats(data);
    } catch {
      // stats are non-critical; fail silently
    }
  };

  const fetchLists = async () => {
    try {
      const { data } = await api.get("/lists");
      setLists(data.items || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => { fetchStats(); fetchLists(); }, []);

  useEffect(() => {
    const t = setTimeout(fetchProps, 200);
    return () => clearTimeout(t);
  }, [fetchProps]); // FIX 3+4: dep is the stable callback, not a raw stringify

  const toggleSel = (id, e) => {
    e.stopPropagation();
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // FIX 2: guard against double-clicks; FIX 5: revoke blob URL after a delay
  const exportSelection = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one property to export");
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.post(
        "/export/properties",
        { property_ids: Array.from(selected) },
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "propintel_export.xlsx";
      a.click();
      // FIX 5: defer revoke so browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(`Exported ${selected.size} properties to Excel`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // FIX 2: guard against double-clicks
  const createListWithSelection = async () => {
    if (selected.size === 0) {
      toast.error("Select properties first to generate a targeted list");
      return;
    }
    if (savingList) return;
    const name = prompt("List name?");
    if (!name) return;
    setSavingList(true);
    try {
      const { data } = await api.post("/lists", { name, property_ids: Array.from(selected) });
      toast.success(`Created list "${data.name}"`);
      setSelected(new Set());
      fetchLists();
    } catch {
      toast.error("Failed to create list");
    } finally {
      setSavingList(false);
    }
  };

  // FIX 1: track which property ID is being traced, not a global flag
  const handleLiveSkipTrace = async (pid) => {
    setTracingId(pid);
    toast.info("Querying live identity networks... please hold");
    try {
      const { data } = await api.post(`/properties/${pid}/skip-trace`);
      toast.success("Identity profile resolved successfully!");
      setProperties((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, skip_traced: true, skip_trace_data: data } : p))
      );
      fetchStats();
    } catch {
      toast.error("Identity lookup failed or timed out");
    } finally {
      setTracingId(null);
    }
  };

  const selectedProperty = useMemo(
    () => properties?.find((p) => p.id === selectedId),
    [properties, selectedId]
  );

  return (
    <AppShell>
      <div className="dashboard-container">

        {/* CRITERIA DRIVER SIDEBAR */}
        <div className="filter-sidebar-wrapper">
          <FilterSidebar filters={filters} setFilters={setFilters} stats={stats} lists={lists} />
        </div>

        {/* RE-ENGINEERED DATA CORE COMPONENT */}
        <section className="main-data-core">

          {/* HIGH CONTRAST KPI STRIP */}
          <div className="kpi-strip-grid">
            <KPI label="Total Records" value={stats?.total} />
            <KPI label="Vacant" value={stats?.vacant} accent="pop-lime" />
            <KPI label="Tax Delinquent" value={stats?.tax_delinquent} accent="pop-red" />
            <KPI label="Absentee Owner" value={stats?.absentee} />
            <KPI label="Skip Traced" value={stats?.skip_traced} accent="pop-blue" />
          </div>

          {/* BATCH PROCESSING COMMAND STRIP */}
          <div className="cmd-strip">
            <div className="cmd-strip-count">
              // Selection Active:{" "}
              <span className="pop-lime" style={{ fontWeight: 700 }}>{selected.size}</span>{" "}
              Nodes Targeted
            </div>
            {selected.size > 0 && (
              <div className="cmd-strip-actions">
                <button
                  onClick={exportSelection}
                  disabled={exporting}
                  className="cmd-btn"
                >
                  <FileSpreadsheet className="cmd-btn-icon lime" />
                  {exporting ? "Exporting..." : "Export Selection (.XLSX)"}
                </button>
                <button
                  onClick={createListWithSelection}
                  disabled={savingList}
                  className="cmd-btn"
                >
                  <Plus className="cmd-btn-icon blue" />
                  {savingList ? "Saving..." : "Save to CRM List"}
                </button>
              </div>
            )}
          </div>

          {/* GEOSPATIAL LAYER */}
          {selectedId && (
            <div className="map-viewport-wrapper">
              <PropertyMap
                properties={properties}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
              />
            </div>
          )}

          {/* CENTRAL MASTER FEED MATRIX */}
          <div className="grid-feed-container">
            {properties.map((p) => {
              const isDelinquent = p.distress_statuses?.length > 0;
              const isVacant = p.vacant;
              // FIX 6: "Clear Equity" badge removed — no badge for unflaged properties
              const badgeClass = isDelinquent
                ? "badge-distress"
                : isVacant
                ? "badge-vacant"
                : null;
              const statusLabel = isDelinquent
                ? p.distress_statuses[0]
                : isVacant
                ? "USPS Vacant"
                : null;

              return (
                <div
                  key={p.id}
                  className={`terminal-card ${selectedId === p.id ? "active-target" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="card-top-row">
                    {/* Only render badge when there is actually something to flag */}
                    {statusLabel ? (
                      <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={(e) => toggleSel(p.id, e)}
                      className="card-select-btn"
                      aria-label={selected.has(p.id) ? "Deselect property" : "Select property"}
                    >
                      {selected.has(p.id) ? (
                        <CheckSquare className="w-4 h-4 pop-lime" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="card-address">{p.site_address}</div>
                  <div className="card-city">{p.city}, {p.state}</div>

                  <div className="card-footer">
                    <div>
                      <span className="card-stat-label">Market Value</span>
                      <span className="card-stat-value">{fmtMoney(p.market_value)}</span>
                    </div>
                    <div className="text-right">
                      <span className="card-stat-label">Equity Pct</span>
                      <span className="card-stat-value pop-lime">
                        {Math.round(p.equity_pct || 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && properties.length === 0 && (
              <div className="empty-state">
                // NO LEADS MATCH SPECIFIED CRITERIA
              </div>
            )}
          </div>
        </section>

        {/* DOSSIER DRAWER */}
        {selectedProperty && (
          <aside className="dossier-right-drawer">
            <div className="dossier-header">
              <div>
                <div className="dossier-eyebrow">Active Target Dossier</div>
                <div className="dossier-address">{selectedProperty.site_address}</div>
              </div>
            </div>

            <div className="dossier-body">
              <div className="dossier-fields">
                <div className="dossier-field">
                  <span className="dossier-field-label">Owner Identity</span>
                  <span className="dossier-field-value">
                    {selectedProperty.owner_name || "Unknown Record"}
                  </span>
                </div>

                {/* CONTACT CHANNELS */}
                {selectedProperty.skip_traced && selectedProperty.skip_trace_data ? (
                  <div className="skip-result-box">
                    <div>
                      <span className="skip-section-label lime">// Verified Phone Channels</span>
                      {selectedProperty.skip_trace_data.mobile_lines?.map((m, idx) => (
                        <div key={idx} className="phone-row">
                          <span className="phone-number">{m.number}</span>
                          <span className="phone-carrier">{m.carrier}</span>
                        </div>
                      ))}
                      {selectedProperty.skip_trace_data.landlines?.map((l, idx) => (
                        <div key={idx} className="phone-row muted">
                          <span>{l.number}</span>
                          <span className="phone-carrier">Landline</span>
                        </div>
                      ))}
                    </div>
                    {selectedProperty.skip_trace_data.emails?.length > 0 && (
                      <div>
                        <span className="skip-section-label blue">// Electronic Mail Nodes</span>
                        {selectedProperty.skip_trace_data.emails.map((em, idx) => (
                          <div key={idx} className="email-entry">{em}</div>
                        ))}
                      </div>
                    )}
                    <div className="skip-source">
                      Source: {selectedProperty.skip_trace_data.provider || "BatchData Core Network"}
                    </div>
                  </div>
                ) : (
                  <div className="skip-offline-box">
                    <span className="skip-offline-label">// Contact Channels Offline</span>
                    <button
                      onClick={() => handleLiveSkipTrace(selectedProperty.id)}
                      disabled={tracingId === selectedProperty.id}  // FIX 1: only disable THIS card's button
                      className="btn-terminal"
                    >
                      <Radio
                        className={`w-3.5 h-3.5 ${
                          tracingId === selectedProperty.id
                            ? "animate-pulse pop-lime"
                            : ""
                        }`}
                      />
                      {tracingId === selectedProperty.id
                        ? "Querying Network..."
                        : "Execute Live Skip-Trace"}
                    </button>
                  </div>
                )}

                <div className="dossier-field">
                  <span className="dossier-field-label">APN Parcel Number</span>
                  <span className="dossier-field-value muted">{selectedProperty.apn || "—"}</span>
                </div>

                <div className="dossier-field">
                  <span className="dossier-field-label">Distress Flags</span>
                  <span className="dossier-field-value pop-red">
                    {selectedProperty.distress_statuses?.join(", ") || "None Detected"}
                  </span>
                </div>
              </div>

              <div className="dossier-footer">
                <button
                  onClick={() => nav(`/property/${selectedProperty.id}`)}
                  className="btn-action-lime w-full"
                >
                  Open Dossier <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </aside>
        )}

      </div>
    </AppShell>
  );
}

const KPI = ({ label, value, accent }) => (
  <div className="kpi-block">
    <div className="kpi-label">{label}</div>
    <div className={`kpi-value ${accent || ""}`}>{value ?? "—"}</div>
  </div>
);
