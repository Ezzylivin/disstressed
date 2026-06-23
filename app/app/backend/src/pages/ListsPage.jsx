"import { useEffect, useState } from \"react\";
import { Link } from \"react-router-dom\";
import { api, fmtMoney } from \"@/lib/api\";
import { AppShell } from \"@/components/AppShell\";
import { toast } from \"sonner\";
import { FileSpreadsheet, Trash2, Plus, ListChecks, ChevronRight } from \"lucide-react\";

export default function ListsPage() {
  const [lists, setLists] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [allProps, setAllProps] = useState({});

  const load = async () => {
    const { data } = await api.get(\"/lists\");
    setLists(data.items || []);
  };
  useEffect(() => { load(); }, []);

  const loadProps = async (list) => {
    if (allProps[list.id]) return;
    const promises = list.property_ids.map((pid) => api.get(`/properties/${pid}`).then(r => r.data).catch(() => null));
    const items = (await Promise.all(promises)).filter(Boolean);
    setAllProps((s) => ({ ...s, [list.id]: items }));
  };

  const toggle = (l) => {
    setExpanded((s) => ({ ...s, [l.id]: !s[l.id] }));
    loadProps(l);
  };

  const createNew = async () => {
    const name = prompt(\"Name for new list?\");
    if (!name) return;
    await api.post(\"/lists\", { name, property_ids: [] });
    toast.success(\"List created\");
    load();
  };

  const removeList = async (l) => {
    if (!window.confirm(`Delete list \"${l.name}\"?`)) return;
    await api.delete(`/lists/${l.id}`);
    toast.success(\"List deleted\");
    load();
  };

  const removeProp = async (lid, pid) => {
    await api.post(`/lists/${lid}/remove/${pid}`);
    setAllProps((s) => { const n = {...s}; delete n[lid]; return n; });
    load();
    toast.success(\"Removed\");
  };

  const exportList = async (l) => {
    if (!l.property_ids?.length) { toast.error(\"Empty list\"); return; }
    try {
      const res = await api.get(`/lists/${l.id}/export`, { responseType: \"blob\" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement(\"a\");
      a.href = url; a.download = `propintel_${l.name}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success(\"Exported\");
    } catch { toast.error(\"Export failed\"); }
  };

  return (
    <AppShell>
      <div className=\"h-full overflow-y-auto p-6 bg-neutral-50\">
        <div className=\"max-w-6xl mx-auto\">
          <div className=\"flex items-end justify-between mb-6 pb-4 border-b border-black\">
            <div>
              <div className=\"label-xs\">/ saved selections</div>
              <h1 className=\"font-display font-black uppercase text-3xl tracking-tight\">Lists & Excel Export</h1>
              <p className=\"text-xs text-neutral-600 mt-2 max-w-xl\">Curate filtered, skip-traced opportunities. Each list exports to a 9-column Excel sheet matching the PropIntel schema (Account ID → Repair Cost → ARV → Verified Mobile Lines → Email).</p>
            </div>
            <button data-testid=\"new-list-btn\" onClick={createNew}
              className=\"flex items-center gap-2 bg-black text-white hover:bg-neutral-800 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]\">
              <Plus className=\"w-3.5 h-3.5\"/> New List
            </button>
          </div>

          {lists.length === 0 && (
            <div className=\"border border-neutral-300 bg-white p-12 text-center\" data-testid=\"empty-lists\">
              <ListChecks className=\"w-10 h-10 mx-auto text-neutral-400\" strokeWidth={1.5}/>
              <div className=\"font-display font-bold uppercase text-base mt-4\">No Lists Yet</div>
              <p className=\"text-xs text-neutral-500 mt-2 max-w-sm mx-auto\">Build a list from the Intelligence dashboard by selecting properties and clicking \"+ List\".</p>
              <Link to=\"/dashboard\" className=\"inline-block mt-4 bg-[#002fa7] text-white hover:bg-blue-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]\">
                Go to Dashboard <ChevronRight className=\"inline w-3 h-3\"/>
              </Link>
            </div>
          )}

          <div className=\"space-y-0 border border-neutral-300 bg-white\">
            {lists.map((l) => (
              <div key={l.id} className=\"border-b border-neutral-300 last:border-b-0\" data-testid={`list-row-${l.id}`}>
                <div className=\"flex items-center justify-between px-4 py-3 hover:bg-neutral-50 cursor-pointer\" onClick={() => toggle(l)}>
                  <div className=\"flex items-center gap-3\">
                    <ChevronRight className={`w-4 h-4 transition-transform ${expanded[l.id] ? \"rotate-90\" : \"\"}`} strokeWidth={1.5}/>
                    <div>
                      <div className=\"font-display font-bold uppercase text-sm\">{l.name}</div>
                      <div className=\"label-xs\">{l.property_ids?.length || 0} properties · created {new Date(l.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className=\"flex items-center gap-2\" onClick={(e)=>e.stopPropagation()}>
                    <button data-testid={`export-list-${l.id}`} onClick={() => exportList(l)}
                      className=\"flex items-center gap-1.5 bg-[#002fa7] text-white hover:bg-blue-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em]\">
                      <FileSpreadsheet className=\"w-3 h-3\"/> Export Excel
                    </button>
                    <button data-testid={`delete-list-${l.id}`} onClick={() => removeList(l)}
                      className=\"border border-red-600 text-red-600 hover:bg-red-600 hover:text-white p-1.5\">
                      <Trash2 className=\"w-3 h-3\"/>
                    </button>
                  </div>
                </div>
                {expanded[l.id] && (
                  <div className=\"border-t border-neutral-200 bg-neutral-50\">
                    {allProps[l.id]?.length === 0 && <div className=\"p-4 text-xs text-neutral-500\">Empty list — add properties from the dashboard.</div>}
                    <table className=\"w-full text-xs\">
                      <thead className=\"bg-neutral-100 border-b border-neutral-300\">
                        <tr>
                          <th className=\"text-left p-2 label-xs\">APN</th>
                          <th className=\"text-left p-2 label-xs\">Address</th>
                          <th className=\"text-left p-2 label-xs\">Status</th>
                          <th className=\"text-right p-2 label-xs\">Market Value</th>
                          <th className=\"text-left p-2 label-xs\">Owner</th>
                          <th className=\"text-right p-2 label-xs\">Skip Trace</th>
                          <th className=\"p-2\"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(allProps[l.id] || []).map((p) => (
                          <tr key={p.id} className=\"border-b border-neutral-200 hover:bg-white\">
                            <td className=\"p-2 font-mono-pi\">{p.apn}</td>
                            <td className=\"p-2\"><Link to={`/property/${p.id}`} className=\"hover:underline\">{p.site_address}, {p.city}</Link></td>
                            <td className=\"p-2 text-[10px] uppercase tracking-wide\">{p.primary_status}</td>
                            <td className=\"p-2 text-right font-mono-pi\">{fmtMoney(p.market_value)}</td>
                            <td className=\"p-2\">{p.owner_name}</td>
                            <td className=\"p-2 text-right\">
                              {p.skip_traced
                                ? <span className=\"text-[10px] uppercase font-bold bg-[#39ff14] text-black px-1.5 py-0.5\">Traced</span>
                                : <span className=\"text-[10px] uppercase font-bold border border-neutral-400 text-neutral-500 px-1.5 py-0.5\">Pending</span>}
                            </td>
                            <td className=\"p-2 text-right\">
                              <button onClick={() => removeProp(l.id, p.id)} data-testid={`remove-${l.id}-${p.id}`} className=\"text-red-600 hover:text-red-800\">
                                <Trash2 className=\"w-3 h-3\"/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
"
