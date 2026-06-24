import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fmtMoney, fmtNum } from "../lib/api";
import { AppShell } from "../components/AppShell";
import { SkipTracePanel } from "../components/SkipTracePanel";
import { UnderwriteCalculator } from "../components/UnderwriteCalculator";
import { toast } from "sonner";
import { ArrowLeft, FileSpreadsheet, Plus, Home, Building2, History, MapPin } from "lucide-react";

const Spec = ({ label, value, testid }) => (
  <div className="p-3 border-r border-b border-neutral-300" data-testid={testid}>
    <div className="label-xs">{label}</div>
    <div className="font-mono-pi text-sm font-semibold mt-1">{value}</div>
  </div>
);

export default function PropertyDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [property, setProperty] = useState(null);
  const [lists, setLists] = useState([]);
  const [tab, setTab] = useState("overview");

  const load = async () => {
    const { data } = await api.get(`/properties/${id}`);
    setProperty(data);
    const r = await api.get("/lists");
    setLists(r.data.items || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const exportThis = async () => {
    try {
      const res = await api.post("/export/properties", { property_ids: [id] }, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `propintel_${property.apn}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported to Excel");
    } catch { toast.error("Export failed"); }
  };

  const addToList = async (lid) => {
    await api.post(`/lists/${lid}/add/${id}`);
    toast.success("Added to list");
  };

  const createList = async () => {
    const name = prompt("List name?");
    if (!name) return;
    await api.post("/lists", { name, property_ids: [id] });
    toast.success(`Created list "${name}"`);
    load();
  };

  if (!property) return (
    <AppShell><div className="p-8 text-sm">Loading...</div></AppShell>
  );

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        {/* Top toolbar */}
        <div className="border-b border-black bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button data-testid="back-btn" onClick={() => nav("/dashboard")} className="flex items-center gap-1 text-xs uppercase tracking-[0.1em] font-bold border border-black px-2.5 py-1.5 hover:bg-black hover:text-white">
                <ArrowLeft className="w-3.5 h-3.5"/> Back
              </button>
              <div className="min-w-0">
                <div className="font-display font-black uppercase text-lg truncate" data-testid="detail-address">{property.site_address}</div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <MapPin className="w-3 h-3"/>{property.city}, {property.state} {property.zip}
                  <span className="font-mono-pi border-l border-neutral-300 pl-2">APN {property.apn}</span>
                  <span className="font-mono-pi">· {property.opa_account}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button data-testid="action-add-spreadsheet" onClick={exportThis}
                className="flex items-center gap-1.5 bg-[#002fa7] text-white hover:bg-blue-900 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em]">
                <FileSpreadsheet className="w-3.5 h-3.5"/> Add to Spreadsheet
              </button>
              <div className="relative group">
                <button data-testid="action-add-list-btn" className="flex items-center gap-1.5 bg-black text-white hover:bg-neutral-800 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em]">
                  <Plus className="w-3.5 h-3.5"/> Add to List
                </button>
                <div className="absolute right-0 top-full mt-0 w-56 border border-black bg-white shadow-lg hidden group-hover:block z-20">
                  {lists.length === 0 && <div className="p-3 text-xs text-neutral-500">No lists yet</div>}
                  {lists.map((l) => (
                    <button key={l.id} onClick={() => addToList(l.id)} data-testid={`add-list-option-${l.id}`}
                      className="block w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 border-b border-neutral-200">{l.name}</button>
                  ))}
                  <button onClick={createList} data-testid="action-create-list-btn"
                    className="block w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide bg-neutral-100 hover:bg-neutral-200">+ New List</button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-neutral-300">
            {["overview", "underwrite", "skip-trace", "history"].map((t) => (
              <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] border-r border-neutral-300 ${tab === t ? "bg-black text-white" : "hover:bg-neutral-100"}`}>
                {t.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* MAIN col */}
          <div className="lg:col-span-2 border-r border-neutral-300">
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <img src={property.image_url} alt="" className="w-full h-64 object-cover border-r border-b border-neutral-300"/>
                  <div className="grid grid-cols-2">
                    <Spec testid="spec-beds" label="Beds" value={property.beds}/>
                    <Spec testid="spec-baths" label="Baths" value={property.baths}/>
                    <Spec testid="spec-sqft" label="Sq Ft" value={fmtNum(property.sqft)}/>
                    <Spec testid="spec-lot" label="Lot Sq Ft" value={fmtNum(property.lot_size)}/>
                    <Spec testid="spec-year" label="Year Built" value={property.year_built}/>
                    <Spec testid="spec-stories" label="Stories" value={property.stories}/>
                    <Spec testid="spec-foundation" label="Foundation" value={property.foundation}/>
                    <Spec testid="spec-roof" label="Roof" value={property.roof_type}/>
                  </div>
                </div>

                {/* Distress flags */}
                <div className="p-4 border-b border-neutral-300">
                  <div className="label-xs mb-2">Distress Flags</div>
                  <div className="flex flex-wrap gap-2">
                    {property.distress_statuses?.map((s) => (
                      <span key={s} className="text-[10px] uppercase tracking-[0.1em] font-bold border border-black px-2 py-1 bg-yellow-50">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Financial summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-neutral-300">
                  <Spec testid="fin-market" label="Market Value" value={fmtMoney(property.market_value)}/>
                  <Spec testid="fin-mortgage" label="Mortgage Balance" value={fmtMoney(property.mortgage_balance)}/>
                  <Spec testid="fin-equity" label={`Equity (${property.equity_pct}%)`} value={fmtMoney(property.equity)}/>
                  <Spec testid="fin-rent" label="Est. Monthly Rent" value={fmtMoney(property.estimated_rent)}/>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3">
                  <Spec testid="fin-taxes" label="Annual Taxes" value={fmtMoney(property.annual_taxes)}/>
                  <Spec testid="fin-tax-owed" label="Tax Owed" value={fmtMoney(property.tax_owed)}/>
                  <Spec testid="fin-tax-years" label="Years Delinquent" value={property.tax_delinquent_years}/>
                </div>

                {/* Owner */}
                <div className="p-4 border-t border-neutral-300 bg-neutral-50">
                  <div className="label-xs mb-2">Owner of Record</div>
                  <div className="text-base font-semibold font-mono-pi">{property.owner_name}</div>
                  <div className="text-xs text-neutral-600 mt-1">
                    {property.owner_is_llc && <span className="border border-black px-1.5 py-0.5 mr-2 text-[10px] uppercase font-bold">LLC</span>}
                    {property.owner_absentee && <span className="border border-[#002fa7] text-[#002fa7] px-1.5 py-0.5 mr-2 text-[10px] uppercase font-bold">Absentee</span>}
                  </div>
                  <div className="text-xs text-neutral-600 mt-2">Mailing: {property.owner_mailing_address}</div>
                </div>
              </>
            )}

            {tab === "underwrite" && (
              <div className="p-4">
                <UnderwriteCalculator property={property}/>
              </div>
            )}

            {tab === "skip-trace" && (
              <div className="p-4">
                <SkipTracePanel property={property} onUpdate={setProperty}/>
              </div>
            )}

            {tab === "history" && (
              <div className="p-4">
                <div className="border border-neutral-300">
                  <div className="px-3 py-2 border-b border-neutral-300 flex items-center gap-2 bg-neutral-50">
                    <History className="w-4 h-4" strokeWidth={1.5}/>
                    <span className="font-display font-bold uppercase text-xs tracking-wide">Transaction & Title History</span>
                  </div>
                  <table className="w-full text-xs" data-testid="history-table">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="text-left p-2 label-xs">Date</th>
                        <th className="text-left p-2 label-xs">Type</th>
                        <th className="text-right p-2 label-xs">Amount</th>
                        <th className="text-left p-2 label-xs">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(property.history || [])].sort((a,b) => new Date(b.date) - new Date(a.date)).map((h, i) => (
                        <tr key={i} className="border-t border-neutral-200">
                          <td className="p-2 font-mono-pi">{new Date(h.date).toLocaleDateString()}</td>
                          <td className="p-2 font-bold">{h.type}</td>
                          <td className="p-2 font-mono-pi text-right">{h.amount ? fmtMoney(h.amount) : "—"}</td>
                          <td className="p-2 text-neutral-600">{h.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="bg-neutral-50">
            <div className="p-4">
              <SkipTracePanel property={property} onUpdate={setProperty}/>
            </div>
            <div className="p-4 border-t border-neutral-300">
              <div className="label-xs mb-2">Quick Underwrite</div>
              <UnderwriteCalculator property={property}/>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

