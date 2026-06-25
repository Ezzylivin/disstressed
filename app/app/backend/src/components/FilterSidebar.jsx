import { Filter } from "lucide-react";

// True Nationwide Geographic Matrix Frame
const AVAILABLE_STATES = [
  { code: "AL", name: "Alabama (AL)" }, { code: "AK", name: "Alaska (AK)" },
  { code: "AZ", name: "Arizona (AZ)" }, { code: "AR", name: "Arkansas (AR)" },
  { code: "CA", name: "California (CA)" }, { code: "CO", name: "Colorado (CO)" },
  { code: "CT", name: "Connecticut (CT)" }, { code: "DE", name: "Delaware (DE)" },
  { code: "DC", name: "District of Columbia (DC)" }, { code: "FL", name: "Florida (FL)" },
  { code: "GA", name: "Georgia (GA)" }, { code: "HI", name: "Hawaii (HI)" },
  { code: "ID", name: "Idaho (ID)" }, { code: "IL", name: "Illinois (IL)" },
  { code: "IN", name: "Indiana (IN)" }, { code: "IA", name: "Iowa (IA)" },
  { code: "KS", name: "Kansas (KS)" }, { code: "KY", name: "Kentucky (KY)" },
  { code: "LA", name: "Louisiana (LA)" }, { code: "ME", name: "Maine (ME)" },
  { code: "MD", name: "Maryland (MD)" }, { code: "MA", name: "Massachusetts (MA)" },
  { code: "MI", name: "Michigan (MI)" }, { code: "MN", name: "Minnesota (MN)" },
  { code: "MS", name: "Mississippi (MS)" }, { code: "MO", name: "Missouri (MO)" },
  { code: "MT", name: "Montana (MT)" }, { code: "NE", name: "Nebraska (NE)" },
  { code: "NV", name: "Nevada (NV)" }, { code: "NH", name: "New Hampshire (NH)" },
  { code: "NJ", name: "New Jersey (NJ)" }, { code: "NM", name: "New Mexico (NM)" },
  { code: "NY", name: "New York (NY)" }, { code: "NC", name: "North Carolina (NC)" },
  { code: "ND", name: "North Dakota (ND)" }, { code: "OH", name: "Ohio (OH)" },
  { code: "OK", name: "Oklahoma (OK)" }, { code: "OR", name: "Oregon (OR)" },
  { code: "PA", name: "Pennsylvania (PA)" }, { code: "PR", name: "Puerto Rico (PR)" },
  { code: "RI", name: "Rhode Island (RI)" }, { code: "SC", name: "South Carolina (SC)" },
  { code: "SD", name: "South Dakota (SD)" }, { code: "TN", name: "Tennessee (TN)" },
  { code: "TX", name: "Texas (TX)" }, { code: "UT", name: "Utah (UT)" },
  { code: "VT", name: "Vermont (VT)" }, { code: "VA", name: "Virginia (VA)" },
  { code: "WA", name: "Washington (WA)" }, { code: "WV", name: "West Virginia (WV)" },
  { code: "WI", name: "Wisconsin (WI)" }, { code: "WY", name: "Wyoming (WY)" }
];

// Add this selection handler near the top of FilterSidebar.jsx:
const [syncing, setSyncing] = useState(false);
const [selectedCourthouses, setSelectedCourthouses] = useState(["PA_PHILADELPHIA"]);

const handleLiveCourthouseSync = async () => {
  setSyncing(true);
  try {
    const { data } = await api.post("/courthouse/sync", { courthouses: selectedCourthouses });
    toast.success(`Success! Pulled ${data.inserted_records} live courthouse leads directly into database.`);
  } catch (e) {
    toast.error("Failed to connect to municipal courthouse servers.");
  } finally {
    setSyncing(false);
  }
};

// Paste this HTML block right inside the sidebar JSX markup panel:
<div className="border-t border-neutral-900 pt-4 px-3 mb-4">
  <div className="text-[10px] font-mono-pi uppercase text-neutral-600 mb-2 tracking-widest">// Courthouse Gateways</div>
  <label className="flex items-center gap-2 text-xs text-neutral-300 py-1.5 cursor-pointer">
    <input type="checkbox" checked={selectedCourthouses.includes("PA_PHILADELPHIA")} onChange={() => {}} />
    Philadelphia County Civil Court
  </label>
  <label className="flex items-center gap-2 text-xs text-neutral-300 py-1.5 cursor-pointer">
    <input type="checkbox" checked={selectedCourthouses.includes("TX_HOUSTON")} onChange={() => {}} />
    Harris County Foreclosure Registry
  </label>
  <button 
    onClick={handleLiveCourthouseSync} 
    disabled={syncing}
    className="btn-action-lime w-full mt-3 text-center py-2 text-[10px]"
  >
    {syncing ? "Scraping Portals..." : "Sync Selected Courthouses"}
  </button>
</div>

export const FilterSidebar = ({ filters, setFilters, stats }) => {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const ToggleRow = ({ k, label, count }) => (
    <label 
      className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-[#111] border-b border-neutral-900 transition-colors" 
      data-testid={`filter-${k}`}
    >
      <span className="flex items-center gap-2">
        <input 
          type="checkbox" 
          checked={!!filters[k]} 
          onChange={(e) => set(k, e.target.checked)}
          className="w-3.5 h-3.5 border-neutral-800 bg-black" 
        />
        <span className="text-xs font-mono-pi text-neutral-300">{label}</span>
      </span>
      {count != null && (
        <span className="font-mono-pi text-[11px] text-neutral-500 bg-neutral-900/50 px-1.5 py-0.5 border border-neutral-900">
          {count}
        </span>
      )}
    </label>
  );

  return (
    <aside className="w-72 border-r border-neutral-900 bg-black h-full overflow-y-auto shrink-0 flex flex-col justify-between" data-testid="filter-sidebar">
      <div>
        {/* HEADER PANEL HEADER CONTROL */}
        <div className="px-4 py-3 border-b border-neutral-900 flex items-center gap-2 bg-[#050505] text-[#DEFF9A]">
          <Filter className="w-4 h-4 text-[#DEFF9A]" strokeWidth={2}/>
          <span className="font-mono-pi font-bold uppercase text-xs tracking-wider">// Filter Pillars</span>
        </div>

        {/* DISTRESS MARKERS BLOCK */}
        <div>
          <div className="text-[10px] font-mono-pi uppercase text-neutral-600 px-3 pt-4 pb-2 tracking-widest">Distress Type</div>
          <ToggleRow k="vacant_only" label="Vacant / USPS Flag" count={stats?.vacant} />
          <ToggleRow k="tax_delinquent_only" label="Tax Delinquent" count={stats?.tax_delinquent} />
          <ToggleRow k="pre_foreclosure_only" label="Pre-Foreclosure Matrix" />
          <ToggleRow k="absentee_only" label="Absentee Owner" count={stats?.absentee} />
          <ToggleRow k="skip_traced_only" label="Skip-Traced Only" count={stats?.skip_traced} />
        </div>

        {/* INPUT LOOKUP TEXT SEARCH */}
        <div>
          <div className="text-[10px] font-mono-pi uppercase text-neutral-600 px-3 pt-4 pb-2 tracking-widest">Search Core</div>
          <div className="px-3 pb-3">
            <input
              data-testid="filter-search-input"
              placeholder="Address, owner name, APN..."
              value={filters.search || ""}
              onChange={(e) => set("search", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-neutral-800 text-neutral-200 px-3 py-2 text-xs font-mono-pi focus:outline-none focus:border-[#DEFF9A] transition-colors" 
            />
          </div>
        </div>

        {/* NATIONWIDE GEOGRAPHIC DROPDOWN MATRIX */}
        <div>
          <div className="text-[10px] font-mono-pi uppercase text-neutral-600 px-3 pt-4 pb-2 tracking-widest">Geography</div>
          <div className="px-3 pb-3">
            <select 
              data-testid="filter-state-select" 
              value={filters.state || ""} 
              onChange={(e) => set("state", e.target.value || undefined)}
              className="w-full bg-[#0d0d0d] border border-neutral-800 text-neutral-200 py-2 px-2 text-xs font-mono-pi focus:outline-none focus:border-[#DEFF9A] transition-colors"
            >
              <option value="">All States Matrix</option>
              {AVAILABLE_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* COMPREHENSIVE UNDERWRITING RUNNERS */}
        <div>
          <div className="text-[10px] font-mono-pi uppercase text-neutral-600 px-3 pt-4 pb-2 tracking-widest">Underwriting</div>
          <div className="px-3 pb-3 space-y-3 font-mono-pi">
            <div>
              <div className="text-[10px] text-neutral-400 mb-1 flex justify-between">
                <span>Min Equity Base</span>
                <span className="text-[#DEFF9A] font-bold">{filters.min_equity_pct ?? 0}%</span>
              </div>
              <input 
                data-testid="filter-equity-slider" 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={filters.min_equity_pct ?? 0}
                onChange={(e) => set("min_equity_pct", parseFloat(e.target.value) || undefined)}
                className="w-full cursor-pointer" 
              />
            </div>
            
            <div>
              <div className="text-[10px] text-neutral-400 mb-1 flex justify-between">
                <span>Max Target Price</span>
                <span className="text-[#00A3FF] font-bold">${(filters.max_price ?? 500000).toLocaleString()}</span>
              </div>
              <input 
                data-testid="filter-price-slider" 
                type="range" 
                min="50000" 
                max="500000" 
                step="10000"
                value={filters.max_price ?? 500000}
                onChange={(e) => set("max_price", parseFloat(e.target.value))}
                className="w-full cursor-pointer" 
              />
            </div>
            
            <div>
              <div className="text-[10px] text-neutral-400 mb-1 uppercase tracking-tight">Minimum Bedroom Density</div>
              <select 
                data-testid="filter-beds-select" 
                value={filters.min_beds ?? ""} 
                onChange={(e) => set("min_beds", e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full bg-[#0d0d0d] border border-neutral-800 text-neutral-200 py-2 px-2 text-xs font-mono-pi focus:outline-none focus:border-[#DEFF9A] transition-colors"
              >
                <option value="">Any Layout</option>
                <option value="2">2+ Beds</option>
                <option value="3">3+ Beds</option>
                <option value="4">4+ Beds</option>
                <option value="5">5+ Beds</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CORE ERASE SAFETIES TRIGGER */}
      <div className="border-t border-neutral-900 p-3 bg-[#020202]">
        <button 
          data-testid="filter-clear-btn"
          onClick={() => setFilters({})}
          className="w-full text-[11px] uppercase tracking-[0.1em] font-mono-pi font-bold border border-neutral-800 py-2 hover:border-[#FF4D4D] hover:text-[#FF4D4D] bg-black text-neutral-400 transition-all"
        >
          Reset Filters
        </button>
      </div>
    </aside>
  );
};

export default FilterSidebar;
