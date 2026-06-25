import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { getCourthousesForState } from "../lib/courthouses";
import "./FilterSidebar.css";

const AVAILABLE_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "D.C." }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

// FIX 1: Defined outside component — no re-creation on every render
const ToggleRow = ({ filterKey, label, count, checked, onChange }) => (
  <label className="toggle-row" data-testid={`filter-${filterKey}`}>
    <span className="toggle-row-left">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="toggle-checkbox"
      />
      <span className="toggle-label">{label}</span>
    </span>
    {count != null && (
      <span className="toggle-count">{count}</span>
    )}
  </label>
);

// FIX 2: Courthouse toggle also outside component
const CourthouseRow = ({ id, label, checked, onChange }) => (
  <label className="courthouse-row">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="toggle-checkbox"
    />
    <span className="toggle-label">{label}</span>
  </label>
);

export const FilterSidebar = ({ filters, setFilters, stats }) => {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const [syncing, setSyncing] = useState(false);
  const [selectedCourthouses, setSelectedCourthouses] = useState([]);

  // When the state filter changes, reset courthouse selection to all courthouses
  // for the newly selected state so the user starts with a clean slate
  const activeState = filters.state ?? null;
  useEffect(() => {
    if (!activeState) {
      setSelectedCourthouses([]);
      return;
    }
    const available = getCourthousesForState(activeState);
    // Pre-select all courthouses for the chosen state
    setSelectedCourthouses(available.map((c) => c.key));
  }, [activeState]);

  const availableCourthouses = activeState
    ? getCourthousesForState(activeState)
    : [];

  const toggleCourthouse = (id) => {
    setSelectedCourthouses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCourthouseSync = async () => {
    // FIX 5: Guard against empty selection
    if (selectedCourthouses.length === 0) {
      toast.error("Select at least one courthouse to sync");
      return;
    }
    if (syncing) return;
    setSyncing(true);
    try {
      const { data } = await api.post("/courthouse/sync", { courthouses: selectedCourthouses });
      toast.success(`Pulled ${data.inserted_records} live courthouse leads`);
    } catch {
      toast.error("Failed to connect to courthouse servers");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <aside className="filter-sidebar" data-testid="filter-sidebar">

      {/* ── HEADER ── */}
      <div className="sidebar-header">
        <Filter className="w-3.5 h-3.5 sidebar-header-icon" strokeWidth={2} aria-hidden="true" />
        <span className="sidebar-header-label">// Criteria Matrix</span>
      </div>

      <div className="sidebar-scroll">

        {/* ── DISTRESS TYPE ── */}
        <div className="sidebar-section">
          <div className="section-label">Distress Type</div>
          <ToggleRow
            filterKey="vacant_only"
            label="Vacant / USPS Flag"
            count={stats?.vacant}
            checked={!!filters.vacant_only}
            onChange={(e) => set("vacant_only", e.target.checked || undefined)}
          />
          <ToggleRow
            filterKey="tax_delinquent_only"
            label="Tax Delinquent"
            count={stats?.tax_delinquent}
            checked={!!filters.tax_delinquent_only}
            onChange={(e) => set("tax_delinquent_only", e.target.checked || undefined)}
          />
          <ToggleRow
            filterKey="pre_foreclosure_only"
            label="Pre-Foreclosure"
            checked={!!filters.pre_foreclosure_only}
            onChange={(e) => set("pre_foreclosure_only", e.target.checked || undefined)}
          />
          <ToggleRow
            filterKey="absentee_only"
            label="Absentee Owner"
            count={stats?.absentee}
            checked={!!filters.absentee_only}
            onChange={(e) => set("absentee_only", e.target.checked || undefined)}
          />
          <ToggleRow
            filterKey="skip_traced_only"
            label="Skip-Traced Only"
            count={stats?.skip_traced}
            checked={!!filters.skip_traced_only}
            onChange={(e) => set("skip_traced_only", e.target.checked || undefined)}
          />
        </div>

        {/* ── SEARCH ── */}
        <div className="sidebar-section">
          <div className="section-label">Search</div>
          <div className="section-body">
            <input
              data-testid="filter-search-input"
              placeholder="Address, owner, APN..."
              value={filters.search || ""}
              onChange={(e) => set("search", e.target.value || undefined)}
              className="sidebar-input"
            />
          </div>
        </div>

        {/* ── GEOGRAPHY ── */}
        <div className="sidebar-section">
          <div className="section-label">Geography</div>
          <div className="section-body">
            <select
              data-testid="filter-state-select"
              value={filters.state || ""}
              onChange={(e) => set("state", e.target.value || undefined)}
              className="sidebar-select"
            >
              <option value="">All States</option>
              {AVAILABLE_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.code} — {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── UNDERWRITING ── */}
        <div className="sidebar-section">
          <div className="section-label">Underwriting</div>
          <div className="section-body">

            {/* Equity floor */}
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Min Equity</span>
                {/* FIX 4: Store as number, don't coerce 0 to undefined */}
                <span className="slider-value lime">{filters.min_equity_pct ?? 0}%</span>
              </div>
              <input
                data-testid="filter-equity-slider"
                type="range"
                min="0" max="100" step="5"
                value={filters.min_equity_pct ?? 0}
                onChange={(e) => set("min_equity_pct", Number(e.target.value))}
                className="sidebar-range"
              />
            </div>

            {/* Max price */}
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Max Price</span>
                <span className="slider-value blue">
                  ${(filters.max_price ?? 500000).toLocaleString()}
                </span>
              </div>
              <input
                data-testid="filter-price-slider"
                type="range"
                min="50000" max="500000" step="10000"
                value={filters.max_price ?? 500000}
                onChange={(e) => set("max_price", Number(e.target.value))}
                className="sidebar-range"
              />
            </div>

            {/* Bedrooms */}
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Min Bedrooms</span>
              </div>
              <select
                data-testid="filter-beds-select"
                value={filters.min_beds ?? ""}
                onChange={(e) => set("min_beds", e.target.value ? parseInt(e.target.value) : undefined)}
                className="sidebar-select"
              >
                <option value="">Any</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── COURTHOUSE GATEWAYS ── */}
        <div className="sidebar-section">
          <div className="section-label">Courthouse Gateways</div>
          <div className="section-body">

            {/* No state selected — prompt the user */}
            {!activeState && (
              <div className="courthouse-prompt">
                Select a state above to see available courthouse feeds
              </div>
            )}

            {/* State selected but no courthouses registered for it */}
            {activeState && availableCourthouses.length === 0 && (
              <div className="courthouse-prompt">
                No courthouse feeds registered for {activeState} yet
              </div>
            )}

            {/* Registered courthouses for the active state */}
            {availableCourthouses.map((courthouse) => (
              <CourthouseRow
                key={courthouse.key}
                id={courthouse.key}
                label={courthouse.label}
                checked={selectedCourthouses.includes(courthouse.key)}
                onChange={() => toggleCourthouse(courthouse.key)}
              />
            ))}

            {availableCourthouses.length > 0 && (
              <button
                onClick={handleCourthouseSync}
                disabled={syncing || selectedCourthouses.length === 0}
                className="btn-sync"
              >
                {syncing ? "// Syncing..." : "Sync Courthouses"}
              </button>
            )}
          </div>
        </div>

      </div>{/* end sidebar-scroll */}

      {/* ── RESET FOOTER ── */}
      <div className="sidebar-footer">
        <button
          data-testid="filter-clear-btn"
          onClick={() => setFilters({})}
          className="btn-reset"
        >
          Reset All Filters
        </button>
      </div>

    </aside>
  );
};

export default FilterSidebar;
