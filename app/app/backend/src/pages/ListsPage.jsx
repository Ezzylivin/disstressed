import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, fmtMoney } from "../lib/api";
import { AppShell } from "../components/AppShell";
import { toast } from "sonner";
import { FileSpreadsheet, Trash2, Plus, ChevronRight } from "lucide-react";
import "./ListsPage.css";

export default function ListsPage() {
  const [lists, setLists] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [allProps, setAllProps] = useState({});
  const [loadingProps, setLoadingProps] = useState({}); // per-list loading state
  const [exportingId, setExportingId] = useState(null); // per-list export guard
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/lists");
      setLists(data.items || []);
    } catch {
      toast.error("Failed to load lists");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadProps = async (list) => {
    if (allProps[list.id] || loadingProps[list.id]) return;
    if (!list.property_ids?.length) {
      setAllProps((s) => ({ ...s, [list.id]: [] }));
      return;
    }
    setLoadingProps((s) => ({ ...s, [list.id]: true }));
    try {
      const items = await Promise.all(
        list.property_ids.map((pid) =>
          api.get(`/properties/${pid}`).then((r) => r.data).catch(() => null)
        )
      );
      setAllProps((s) => ({ ...s, [list.id]: items.filter(Boolean) }));
    } catch {
      toast.error("Failed to load list properties");
    } finally {
      setLoadingProps((s) => ({ ...s, [list.id]: false }));
    }
  };

  const toggle = (l) => {
    setExpanded((s) => {
      const next = !s[l.id];
      if (next) loadProps(l);
      return { ...s, [l.id]: next };
    });
  };

  const createNew = async () => {
    if (creating) return;
    const name = prompt("Name for new list?");
    if (!name) return;
    setCreating(true);
    try {
      await api.post("/lists", { name, property_ids: [] });
      toast.success(`Created "${name}"`);
      load();
    } catch {
      toast.error("Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const removeList = async (l) => {
    if (!window.confirm(`Delete list "${l.name}"?`)) return;
    try {
      await api.delete(`/lists/${l.id}`);
      toast.success("List deleted");
      load();
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const removeProp = async (lid, pid) => {
    try {
      await api.post(`/lists/${lid}/remove/${pid}`);
      // Invalidate cached props for this list so it reloads fresh on next expand
      setAllProps((s) => { const n = { ...s }; delete n[lid]; return n; });
      load();
      toast.success("Property removed");
    } catch {
      toast.error("Failed to remove property");
    }
  };

  // FIX: per-list export guard + deferred blob revoke
  const exportList = async (l) => {
    if (!l.property_ids?.length) { toast.error("List is empty"); return; }
    if (exportingId === l.id) return;
    setExportingId(l.id);
    try {
      const res = await api.get(`/lists/${l.id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `propintel_${l.name.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(`Exported "${l.name}"`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <AppShell>
      <div className="lists-root">

        {/* ── PAGE HEADER ── */}
        <div className="lists-header">
          {/* Ghost count — same signature technique as detail page equity ghost */}
          <span className="lists-ghost" aria-hidden="true">{lists.length}</span>
          <div className="lists-header-inner">
            <div className="lists-header-text">
              <div className="lists-eyebrow">// Saved Selections</div>
              <h1 className="lists-title">Target Lists</h1>
              <p className="lists-subtitle">
                Curate filtered, skip-traced opportunities. Each list exports to a 9-column Excel sheet
                matching the PropIntel schema — Account ID → Repair Cost → ARV → Verified Mobile → Email.
              </p>
            </div>
            <button
              data-testid="new-list-btn"
              onClick={createNew}
              disabled={creating}
              className="btn-new-list"
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? "Creating..." : "New List"}
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="lists-content">

          {/* Empty state */}
          {lists.length === 0 && (
            <div className="lists-empty" data-testid="empty-lists">
              <div className="lists-empty-icon" aria-hidden="true">[ ]</div>
              <div className="lists-empty-title">No Lists On File</div>
              <p className="lists-empty-body">
                Build a list from the Intelligence dashboard — select properties and click "+ Save to CRM List".
              </p>
              <Link to="/dashboard" className="btn-goto-dashboard">
                Go to Dashboard <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* List rows */}
          {lists.length > 0 && (
            <div className="list-table-wrap">
              {lists.map((l, idx) => (
                <div
                  key={l.id}
                  className={`list-row ${expanded[l.id] ? "expanded" : ""}`}
                  data-testid={`list-row-${l.id}`}
                >
                  {/* Row header */}
                  <div
                    className="list-row-header"
                    onClick={() => toggle(l)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && toggle(l)}
                    aria-expanded={!!expanded[l.id]}
                  >
                    <div className="list-row-left">
                      <span className="list-index" aria-hidden="true">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <ChevronRight
                        className={`list-chevron ${expanded[l.id] ? "open" : ""}`}
                        strokeWidth={1.5}
                      />
                      <div className="list-meta">
                        <span className="list-name">{l.name}</span>
                        <span className="list-details">
                          {l.property_ids?.length || 0} properties
                          <span className="list-details-sep" />
                          {new Date(l.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions — stop propagation so row toggle doesn't fire */}
                    <div className="list-row-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        data-testid={`export-list-${l.id}`}
                        onClick={() => exportList(l)}
                        disabled={exportingId === l.id}
                        className="btn-export-list"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        {exportingId === l.id ? "Exporting..." : "Export (.xlsx)"}
                      </button>
                      <button
                        data-testid={`delete-list-${l.id}`}
                        onClick={() => removeList(l)}
                        className="btn-delete-list"
                        aria-label={`Delete list ${l.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded property table */}
                  {expanded[l.id] && (
                    <div className="list-props-panel">
                      {loadingProps[l.id] && (
                        <div className="list-props-loading">// Loading records...</div>
                      )}

                      {!loadingProps[l.id] && allProps[l.id]?.length === 0 && (
                        <div className="list-props-empty">
                          // Empty list — add properties from the dashboard.
                        </div>
                      )}

                      {!loadingProps[l.id] && allProps[l.id]?.length > 0 && (
                        <table className="props-table">
                          <thead>
                            <tr>
                              <th>APN</th>
                              <th>Address</th>
                              <th>Status</th>
                              <th className="text-right">Market Value</th>
                              <th>Owner</th>
                              <th className="text-center">Skip Trace</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {allProps[l.id].map((p) => (
                              <tr key={p.id}>
                                <td className="cell-mono">{p.apn}</td>
                                <td className="cell-address">
                                  <Link
                                    to={`/property/${p.id}`}
                                    className="prop-link"
                                  >
                                    {p.site_address}, {p.city}
                                  </Link>
                                </td>
                                <td className="cell-status">{p.primary_status}</td>
                                <td className="cell-mono text-right">{fmtMoney(p.market_value)}</td>
                                <td className="cell-owner">{p.owner_name}</td>
                                <td className="text-center">
                                  {p.skip_traced
                                    ? <span className="badge-traced">Traced</span>
                                    : <span className="badge-pending">Pending</span>}
                                </td>
                                <td className="text-right">
                                  <button
                                    onClick={() => removeProp(l.id, p.id)}
                                    data-testid={`remove-${l.id}-${p.id}`}
                                    className="btn-remove-prop"
                                    aria-label="Remove from list"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
