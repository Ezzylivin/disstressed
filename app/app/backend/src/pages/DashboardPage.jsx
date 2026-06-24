import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtMoney } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { FilterSidebar } from "@/components/FilterSidebar";
import { PropertyMap } from "@/components/PropertyMap";
import { PropertyCard } from "@/components/PropertyCard";
import { toast } from "sonner";
import { ChevronRight, FileSpreadsheet, Radio, Plus } from "lucide-react";

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
      setProperties(data.items);
    } finally { setLoading(false); }
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

  const selectedProperty = useMemo(() => properties.find((p) => p.id === selectedId), [properties, selectedId]);

  return (
    <AppShell>
      <div className="h-full flex flex-row">
        <FilterSidebar filters={filters} setFilters={setFilters} stats={stats}/>

        {/* CENTER: Map + KPI strip */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-neutral-300">
          <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-neutral-300 shrink-0">
            <KPI label="Total Records" value={stats?.total} testid="kpi-total"/>
            <KPI label="Vacant" value={stats?.vacant} accent="text-[#002fa7]" testid="kpi-vacant"/>
            <KPI label="Tax Delinquent" value={stats?.tax_delinquent} accent="text-yellow-700" testid="kpi-taxdel"/>
            <KPI label="Absentee Owner" value={stats?.absentee} testid="kpi-absentee"/>
            <KPI label="Skip Traced" value={stats?.skip_traced} accent="text-green-700" testid="kpi-skiptraced"/>
          </div>
          <div className="flex-1 relative min-h-0">
            <PropertyMap properties={properties} selectedId={selectedId} onSelect={setSelectedId} />
            {loading && <div className="absolute top-2 left-2 bg-white border border-black px-3 py-1 text-xs font-mono-pi" data-testid="map-loading">Loading...</div>}
          </div>
        </section>

        {/* RIGHT: Property feed */}
        <aside className="w-[420px] flex flex-col shrink-0" data-testid="property-feed">
          <div className="border-b border-black px-3 py-2 bg-white flex items-center justify-between shrink-0">
            <div>
              <div className="font-display font-bold uppercase text-xs tracking-wide">Property Feed</div>
              <div className="label-xs">{properties.length} results · {selected.size} selected</div>
            </div>
            <div className="flex gap-1">
              <button data-testid="export-selected-btn" onClick={exportSelection}
                className="flex items-center gap-1 bg-[#002fa7] text-white hover:bg-blue-900 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]">
                <FileSpreadsheet className="w-3 h-3"/> Export
              </button>
              <button data-testid="create-list-btn" onClick={createListWithSelection}
                className="flex items-center gap-1 bg-black text-white hover:bg-neutral-800 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]">
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

          <div className="flex-1 overflow-y-auto">
            {properties.map((p) => (
              <div key={p.id} className="flex" data-testid={`feed-row-${p.id}`}>
                <label className="px-2 flex items-center justify-center border-r border-neutral-300 bg-neutral-50">
                  <input type="checkbox" data-testid={`select-${p.id}`} checked={selected.has(p.id)} onChange={() => toggleSel(p.id)}
                    className="w-3.5 h-3.5 border-black accent-[#002fa7]"/>
                </label>
                <div className="flex-1 min-w-0">
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
            <div className="border-t border-black p-3 bg-neutral-50 shrink-0">
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

const KPI = ({ label, value, accent, testid }) => (
  <div className="p-3 border-r border-neutral-300 last:border-r-0 bg-white" data-testid={testid}>
    <div className="label-xs">{label}</div>
    <div className={`font-mono-pi text-xl font-semibold ${accent || ""}`}>{value ?? "—"}</div>
  </div>
);

