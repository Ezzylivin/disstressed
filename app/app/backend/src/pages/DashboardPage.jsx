import { useEffect, useState, useMemo } from "react";
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
  const [tracing, setTracing] = useState(false); // Controls identity query loading states
  const [lists, setLists] = useState([]);
  const nav = useNavigate();

  const fetchProps = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== false) params[k] = v;
      });
      const { data } = await api.get("/properties", { params });
      setProperties(data?.items || (Array.isArray(data) ? data : []));
    } catch (e) {
      toast.error("Failed to load property stream");
      setProperties([]);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchStats = async () => {
    const { data } = await api.get("/properties/stats");
    setStats(data);
  };

  const fetchLists = async () => {
    const { data } = await api.get("/lists");
    setLists(data.items || []);
  };

  useEffect(() => { fetchStats(); fetchLists(); }, []);
  useEffect(() => {
    const t = setTimeout(fetchProps, 200);
    return () => clearTimeout(t);
  }, [JSON.stringify(filters)]);

  const toggleSel = (id, e) => {
    e.stopPropagation(); // Prevents targeting card details when checking box
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const exportSelection = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one property to export");
      return;
    }
    try {
      const res = await api.post("/export/properties", { property_ids: Array.from(selected) }, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = "propintel_export.xlsx"; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selected.size} properties to Excel`);
    } catch (e) { toast.error("Export failed"); }
  };

  const createListWithSelection = async () => {
    if (selected.size === 0) {
      toast.error("Select properties first to generate a targeted list");
      return;
    }
    const name = prompt("List name?");
    if (!name) return;
    const { data } = await api.post("/lists", { name, property_ids: Array.from(selected) });
    toast.success(`Created list "${data.name}"`);
    setSelected(new Set());
    fetchLists();
  };

  // SPRINT 3: LIVE IDENTITY SKIP-TRACING INTERFACE CONTROLLER
  const handleLiveSkipTrace = async (pid) => {
    setTracing(true);
    toast.info("Querying live identity networks... please hold");
    try {
      const { data } = await api.post(`/properties/${pid}/skip-trace`);
      toast.success("Identity profile resolved successfully!");
      
      // Patch state array immediately so changes reflect without an expensive database reload
      setProperties((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, skip_traced: true, skip_trace_data: data } : p))
      );
      
      // Update global dashboard statistics counters live
      fetchStats();
    } catch (e) {
      toast.error("Identity lookup failed or timed out");
    } finally {
      setTracing(false);
    }
  };

  const selectedProperty = useMemo(() => {
    return properties?.find((p) => p.id === selectedId);
  }, [properties, selectedId]);

  return (
    <AppShell>
      <div className="dashboard-container">
        
        {/* CRITERIA DRIVER SIDEBAR */}
        <div className="filter-sidebar-wrapper">
          <FilterSidebar filters={filters} setFilters={setFilters} stats={stats}/>
        </div>

        {/* RE-ENGINEERED DATA CORE COMPONENT */}
        <section className="main-data-core flex-1 flex flex-col min-width-0 h-full">
          
          {/* HIGH CONTRAST KPI STRIP */}
          <div className="kpi-strip-grid">
            <KPI label="Total Records" value={stats?.total} />
            <KPI label="Vacant" value={stats?.vacant} accent="pop-lime" />
            <KPI label="Tax Delinquent" value={stats?.tax_delinquent} accent="pop-red" />
            <KPI label="Absentee Owner" value={stats?.absentee} />
            <KPI label="Skip Traced" value={stats?.skip_traced} accent="pop-blue" />
          </div>

          {/* BATCH PROCESSING COMMAND STRIP */}
          <div className="bg-[#050505] border-b border-neutral-900 px-6 py-2 flex justify-between items-center shrink-0 font-mono-pi text-xs">
            <div className="text-neutral-500 uppercase text-[10px]">
              // Selection Active: <span className="text-[#DEFF9A] font-bold">{selected.size}</span> Nodes Targeted
            </div>
            {selected.size > 0 && (
              <div className="flex gap-4">
                <button onClick={exportSelection} className="text-neutral-400 hover:text-white uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition-colors">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#DEFF9A]" /> Export Selection (.XLSX)
                </button>
                <button onClick={createListWithSelection} className="text-neutral-400 hover:text-white uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition-colors">
                  <Plus className="w-3.5 h-3.5 text-[#00A3FF]" /> Save to CRM List
                </button>
              </div>
            )}
          </div>

          {/* GEOSPATIAL SPATIAL GRID LAYER */}
          <div className="map-viewport-wrapper">
            <PropertyMap 
              properties={properties} 
              selectedId={selectedId} 
              onSelect={(id) => setSelectedId(id)} 
            />
          </div>

          {/* CENTRAL MASTER FEED MATRIX */}
          <div className="grid-feed-container">
            {properties.map((p) => {
              const isVacant = p.vacant;
              const isDelinquent = p.distress_statuses?.length > 0;
              const badgeClass = isDelinquent ? "badge-distress" : (isVacant ? "badge-vacant" : "badge-normal");
              const statusLabel = isDelinquent ? p.distress_statuses[0] : (isVacant ? "USPS Vacant" : "Clear Equity");

              return (
                <div key={p.id} 
                  className={`terminal-card ${selectedId === p.id ? 'active-target' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="flex justify-between items-start">
                    <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
                    <button onClick={(e) => toggleSel(p.id, e)} className="text-neutral-500 hover:text-[#DEFF9A]">
                      {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-[#DEFF9A]" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="font-bold text-base tracking-tight text-white mb-1 uppercase">{p.site_address}</div>
                  <div className="text-xs text-neutral-400 font-mono-pi mb-3">{p.city}, {p.state}</div>
                  
                  <div className="flex justify-between border-t border-neutral-900 pt-2 mt-2 font-mono-pi text-xs">
                    <div>
                      <span className="text-neutral-600 block text-[9px] uppercase">Market Value</span>
                      <span className="text-white font-bold">{fmtMoney(p.market_value)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-600 block text-[9px] uppercase">Equity Pct</span>
                      <span className="pop-lime font-bold">{Math.round(p.equity_pct || 0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!loading && properties.length === 0 && (
              <div className="col-span-full p-12 text-center text-xs font-mono-pi text-neutral-500">
                // SYSTEM_MESSAGE: NO LEADS MATCH SPECIFIED CRITERIA CORE
              </div>
            )}
          </div>
        </section>

        {/* DETAILED DOSSIER HUD (slides into view when property is selected) */}
        {selectedProperty && (
          <aside className="dossier-right-drawer">
            <div className="dossier-header">
              <div>
                <div className="font-mono-pi text-[9px] uppercase text-neutral-500">Active Target Dossier</div>
                <div className="text-sm font-bold uppercase tracking-tight text-white">{selectedProperty.site_address}</div>
              </div>
            </div>
            
            <div className="dossier-body flex flex-col justify-between h-[calc(100%-60px)]">
              <div className="space-y-4 font-mono-pi text-xs overflow-y-auto pr-1">
                <div className="border-b border-neutral-900 pb-2">
                  <span className="text-neutral-600 block text-[9px] uppercase">Owner Identity</span>
                  <span className="text-white font-bold uppercase">{selectedProperty.owner_name || "Unknown Record"}</span>
                </div>

                {/* SPRINT 3: DYNAMIC DUAL-VENDOR CONTACT DISPLAY HUD */}
                {selectedProperty.skip_traced && selectedProperty.skip_trace_data ? (
                  <div className="space-y-3 bg-[#0a0a0a] p-3 border border-neutral-900">
                    <div>
                      <span className="text-[#DEFF9A] block text-[8px] uppercase font-bold tracking-wider mb-1">// Verified Phone Channels</span>
                      {selectedProperty.skip_trace_data.mobile_lines?.map((m, idx) => (
                        <div key={idx} className="text-white font-bold text-xs mt-1 flex justify-between">
                          <span>{m.number}</span>
                          <span className="text-[9px] text-neutral-600 font-normal uppercase tracking-tight">{m.carrier}</span>
                        </div>
                      ))}
                      {selectedProperty.skip_trace_data.landlines?.map((l, idx) => (
                        <div key={idx} className="text-neutral-400 text-xs mt-0.5 flex justify-between">
                          <span>{l.number}</span>
                          <span className="text-[9px] text-neutral-700 uppercase">Landline</span>
                        </div>
                      ))}
                    </div>
                    {selectedProperty.skip_trace_data.emails?.length > 0 && (
                      <div>
                        <span className="text-[#00A3FF] block text-[8px] uppercase font-bold tracking-wider mb-1">// Electronic Mail Nodes</span>
                        {selectedProperty.skip_trace_data.emails.map((em, idx) => (
                          <div key={idx} className="text-neutral-400 text-[11px] break-all select-all">{em}</div>
                        ))}
                      </div>
                    )}
                    <div className="text-[8px] text-neutral-700 border-t border-neutral-900 pt-1 mt-1 text-right italic">
                      Source: {selectedProperty.skip_trace_data.provider || "BatchData Core Network"}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#050505] p-4 text-center border border-neutral-900 border-dashed">
                    <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-3">// Contact Channels Offline</span>
                    <button 
                      onClick={() => handleLiveSkipTrace(selectedProperty.id)} 
                      disabled={tracing}
                      className="btn-terminal w-full text-center py-2 flex items-center justify-center gap-1.5"
                    >
                      <Radio className={`w-3.5 h-3.5 ${tracing ? 'animate-pulse text-[#DEFF9A]' : ''}`} />
                      {tracing ? "Querying Network..." : "Execute Live Skip-Trace"}
                    </button>
                  </div>
                )}

                <div className="border-b border-neutral-900 pb-2">
                  <span className="text-neutral-600 block text-[9px] uppercase">APN Parcel Number</span>
                  <span className="text-white">{selectedProperty.apn || "—"}</span>
                </div>
                
                <div className="border-b border-neutral-900 pb-2">
                  <span className="text-neutral-600 block text-[9px] uppercase">Distress Flags</span>
                  <span className="pop-red font-bold uppercase">{selectedProperty.distress_statuses?.join(", ") || "None Detected"}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-neutral-900 flex gap-2 shrink-0">
                <button onClick={() => nav(`/property/${selectedProperty.id}`)} className="btn-action-lime w-full flex items-center justify-center gap-1">
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
