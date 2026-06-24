import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtMoney } from "../lib/api";
import { AppShell } from "../components/AppShell";
import { FilterSidebar } from "../components/FilterSidebar";
import { PropertyMap } from "../components/PropertyMap";
import { PropertyCard } from "../components/PropertyCard";
import { toast } from "sonner";
import { ChevronRight, FileSpreadsheet, Plus } from "lucide-react";
import "./DashboardPage.css"; // Core Stylesheet Matrix Connected

export default function DashboardPage() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
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
    // eslint-disable-next-line
  }, [JSON.stringify(filters)]);

  const toggleSel = (id) => {
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

  const addToList = async (lid) => {
    if (selected.size === 0) { toast.error("Select at least one property"); return; }
    for (const pid of selected) {
      await api.post(`/lists/${lid}/add/${pid}`);
    }
    toast.success(`Added ${selected.size} properties to list`);
    setSelected(new Set());
    fetchLists();
  };

  const createListWithSelection = async () => {
    const name = prompt("List name?");
    if (!name) return;
    const { data } = await api.post("/lists", { name, property_ids: Array.from(selected) });
    toast.success(`Created list "${data.name}"`);
    setSelected(new Set());
    fetchLists();
  };

  const selectedProperty = useMemo(() => {
    return properties?.find((p) => p.id === selectedId);
  }, [properties, selectedId]);

  return (
    <AppShell>
      <div className="dashboard-container">
        
        {/* LEFT COLUMN: Fixed Filters Sidebar Wrapper */}
        <div className="filter-sidebar-wrapper">
          <FilterSidebar filters={filters} setFilters={setFilters} stats={stats}/>
        </div>

        {/* CENTER PANEL: KPIs + Map Element Canvas */}
        <section className="center-panel">
          <div className="kpi-strip-grid">
            <KPI label="Total Records" value={stats?.total} testid="kpi-total"/>
            <KPI label="Vacant" value={stats?.vacant} accent="text-[#002fa7]" testid="kpi-vacant"/>
            <KPI label="Tax Delinquent" value={stats?.tax_delinquent} accent="text-yellow-700" testid="kpi-taxdel"/>
            <KPI label="Absentee Owner" value={stats?.absentee} testid="kpi-absentee"/>
            <KPI label="Skip Traced" value={stats?.skip_traced} accent="text-green-700" testid="kpi-skiptraced"/>
          </div>
          <div className="map-viewport-container">
            <PropertyMap properties={properties} selectedId={selectedId} onSelect={setSelectedId} />
            {loading && <div className="absolute top-2 left-2 bg-white border border-black px-3 py-1 text-xs font-mono-pi" data-testid="map-loading">Loading...</div>}
          </div>
        </section>

        {/* RIGHT COLUMN: Scrolling Property Feed Drawer */}
        <aside className="property-feed-aside" data-testid="property-feed">
          <div className="feed-header-controls">
            <div>
              <div className="feed-title">Property Feed</div>
              <div className="label-xs">{properties.length} results · {selected.size} selected</div>
            </div>
            <div className="action-button-group">
              <button data-testid="export-selected-btn" onClick={exportSelection} className="panel-action-btn btn-blue">
                <FileSpreadsheet className="w-3 h-3"/> Export
              </button>
              <button data-testid="create-list-btn" onClick={createListWithSelection} className="panel-action-btn btn-black">
                <Plus className="w-3 h-3"/> List
              </button>
            </div>
          </div>

          {lists.length > 0 && selected.size > 0 && (
            <div className="border-b border-neutral-300 p-2 bg-neutral-50 shrink-0">
              <div className="label-xs mb-1">Add Selection To:</div>
              <div className="flex flex-wrap gap-1">
                {lists.map((l) => (
                  <button key={l.id} data-testid={`add-to-list-${l.id}`} onClick={() => addToList(l.id)}
                    className="text-[10px] uppercase tracking-wide border border-black px-2 py-1 hover:bg-black hover:text-white font-bold">
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="feed-scroll-container">
            {properties.map((p) => (
              <div key={p.id} className="feed-row-item" data-testid={`feed-row-${p.id}`}>
                <label className="feed-row-checkbox-anchor">
                  <input type="checkbox" data-testid={`select-${p.id}`} checked={selected.has(p.id)} onChange={() => toggleSel(p.id)}
                    className="w-3.5 h-3.5 border-black accent-[#002fa7]"/>
                </label>
                <div className="feed-card-target">
                  <PropertyCard p={p} selected={selectedId === p.id} onClick={() => setSelectedId(p.id)}/>
                </div>
              </div>
            ))}
            {!loading && properties.length === 0 && (
              <div className="p-8 text-center text-xs text-neutral-500" data-testid="no-results">
                No properties match these filters.
              </div>
            )}
          </div>

          {selectedProperty && (
            <div className="bottom-dossier-tray">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-display font-bold uppercase text-xs truncate">{selectedProperty.site_address}</div>
                  <div className="label-xs">{selectedProperty.primary_status}</div>
                </div>
                <button data-testid="open-detail-btn"
                  onClick={() => nav(`/property/${selectedProperty.id}`)}
                  className="flex items-center gap-1 bg-black text-white hover:bg-neutral-800 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em]">
                  Open Dossier <ChevronRight className="w-3 h-3"/>
                </button>
              </div>
            </div>
          )}
        </aside>

      </div>
    </AppShell>
  );
}

// Clean Component Layout for KPIs
const KPI = ({ label, value, accent, testid }) => (
  <div className="kpi-block" data-testid={testid}>
    <div className="label-xs">{label}</div>
    <div className={`kpi-value ${accent || ""}`}>{value ?? "—"}</div>
  </div>
);
