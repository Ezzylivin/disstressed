import { Filter } from "lucide-react";

export const FilterSidebar = ({ filters, setFilters, stats }) => {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const ToggleRow = ({ k, label, count }) => (
    <label className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-neutral-100 border-b border-neutral-200" data-testid={`filter-${k}`}>
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={!!filters[k]} onChange={(e) => set(k, e.target.checked)}
          className="w-3.5 h-3.5 border-black accent-[#002fa7]" />
        <span className="text-xs">{label}</span>
      </span>
      {count != null && <span className="font-mono-pi text-[11px] text-neutral-500">{count}</span>}
    </label>
  );

  return (
    <aside className="w-72 border-r border-neutral-300 bg-neutral-50 overflow-y-auto shrink-0" data-testid="filter-sidebar">
      <div className="px-3 py-3 border-b border-black flex items-center gap-2 bg-white">
        <Filter className="w-4 h-4" strokeWidth={1.5}/>
        <span className="font-display font-bold uppercase text-xs tracking-wide">Filter Pillars</span>
      </div>

      <div>
        <div className="label-xs px-3 pt-4 pb-2">Distress Type</div>
        <ToggleRow k="vacant_only" label="Vacant / USPS Flag" count={stats?.vacant} />
        <ToggleRow k="tax_delinquent_only" label="Tax Delinquent" count={stats?.tax_delinquent} />
        <ToggleRow k="pre_foreclosure_only" label="Pre-Foreclosure / NOD / Lis Pendens" />
        <ToggleRow k="absentee_only" label="Absentee Owner" count={stats?.absentee} />
        <ToggleRow k="skip_traced_only" label="Skip-Traced Only" count={stats?.skip_traced} />
      </div>

      <div>
        <div className="label-xs px-3 pt-4 pb-2">Search</div>
        <div className="px-3 pb-3">
          <input
            data-testid="filter-search-input"
            placeholder="Address, owner, APN..."
            value={filters.search || ""}
            onChange={(e) => set("search", e.target.value)}
            className="w-full border-b border-black bg-transparent px-0 py-2 text-xs focus:outline-none focus:border-[#002fa7]" />
        </div>
      </div>

      <div>
        <div className="label-xs px-3 pt-4 pb-2">Geography</div>
        <div className="px-3 pb-3 space-y-2">
          <select data-testid="filter-state-select" value={filters.state || ""} onChange={(e)=>set("state", e.target.value || undefined)}
            className="w-full border border-black bg-white py-2 px-2 text-xs">
            <option value="">All States</option>
            <option value="PA">Pennsylvania (PA)</option>
            <option value="MI">Michigan (MI)</option>
            <option value="OH">Ohio (OH)</option>
            <option value="MD">Maryland (MD)</option>
            <option value="TN">Tennessee (TN)</option>
            <option value="MO">Missouri (MO)</option>
          </select>
        </div>
      </div>

      <div>
        <div className="label-xs px-3 pt-4 pb-2">Underwriting</div>
        <div className="px-3 pb-3 space-y-3">
          <div>
            <div className="text-[11px] text-neutral-600 mb-1">Min Equity %: <span className="font-mono-pi font-semibold">{filters.min_equity_pct ?? 0}%</span></div>
            <input data-testid="filter-equity-slider" type="range" min="0" max="100" step="5"
              value={filters.min_equity_pct ?? 0}
              onChange={(e) => set("min_equity_pct", parseFloat(e.target.value) || undefined)}
              className="w-full accent-[#002fa7]" />
          </div>
          <div>
            <div className="text-[11px] text-neutral-600 mb-1">Max Price: <span className="font-mono-pi font-semibold">${(filters.max_price ?? 500000).toLocaleString()}</span></div>
            <input data-testid="filter-price-slider" type="range" min="50000" max="500000" step="10000"
              value={filters.max_price ?? 500000}
              onChange={(e) => set("max_price", parseFloat(e.target.value))}
              className="w-full accent-[#002fa7]" />
          </div>
          <div>
            <div className="text-[11px] text-neutral-600 mb-1">Min Beds</div>
            <select data-testid="filter-beds-select" value={filters.min_beds ?? ""} onChange={(e)=>set("min_beds", e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full border border-black bg-white py-2 px-2 text-xs">
              <option value="">Any</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-300 px-3 py-3">
        <button data-testid="filter-clear-btn"
          onClick={() => setFilters({})}
          className="w-full text-[11px] uppercase tracking-[0.1em] font-bold border border-black py-2 hover:bg-black hover:text-white">
          Clear All
        </button>
      </div>
    </aside>
  );
};

export default FilterSidebar;

