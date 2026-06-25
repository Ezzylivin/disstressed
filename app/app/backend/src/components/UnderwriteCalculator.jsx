import { useState, useEffect, useCallback } from "react";
import { api, fmtMoney } from "../lib/api";
import { toast } from "sonner";
import { Calculator, TrendingUp } from "lucide-react";
import "./UnderwriteCalculator.css";

// FIX 6: mono conditional removed — all metrics use mono; dead branch deleted
const Metric = ({ label, value, accent, testid }) => (
  <div className="uw-metric" data-testid={testid}>
    <span className="uw-metric-label">{label}</span>
    <span className={`uw-metric-value ${accent || ""}`}>{value ?? "—"}</span>
  </div>
);

export const UnderwriteCalculator = ({ property }) => {
  const [scope,    setScope]    = useState("moderate");
  const [capRate,  setCapRate]  = useState(0.08);
  const [vacancy,  setVacancy]  = useState(0.08);
  const [expRatio, setExpRatio] = useState(0.40);
  const [compsPsf, setCompsPsf] = useState("");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  // FIX 7: wrapped in useCallback so useEffect dep is stable — no eslint-disable needed
  const run = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/properties/${property.id}/underwrite`, {
        scope,
        cap_rate:      capRate,
        vacancy_rate:  vacancy,
        expense_ratio: expRatio,
        comps_psf:     compsPsf ? parseFloat(compsPsf) : null,
      });
      setResult(data);
    } catch {
      // FIX 1: errors were silently swallowed — now surfaced
      toast.error("Underwrite calculation failed");
    } finally {
      setLoading(false);
    }
  }, [property.id, scope, capRate, vacancy, expRatio, compsPsf]);

  // Run once on mount with initial defaults
  // Effect dep is `run` (stable per useCallback) — fires when property or any
  // input param changes, exactly matching the intent of the original effect.
  useEffect(() => { run(); }, [run]);

  // FIX 2: safe numeric parser — returns fallback on NaN/empty
  const safeFloat = (val, fallback) => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  return (
    <div className="uw-root" data-testid="underwrite-calc">

      {/* ── HEADER ── */}
      <div className="uw-header">
        <div className="uw-header-left">
          <Calculator className="w-3.5 h-3.5 uw-header-icon" strokeWidth={1.5} aria-hidden="true" />
          <span className="uw-title">Underwriting Engine</span>
        </div>
        <span className="uw-source">RSMeans · ATTOM AVM</span>
      </div>

      {/* ── CONTROLS ── */}
      <div className="uw-controls">

        <div className="uw-control-group">
          <label className="uw-control-label" htmlFor="uw-scope">Rehab Scope</label>
          <select
            id="uw-scope"
            data-testid="scope-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="uw-select"
          >
            <option value="cosmetic">Cosmetic</option>
            <option value="moderate">Moderate</option>
            <option value="full_gut">Full Gut</option>
          </select>
        </div>

        <div className="uw-control-group">
          <label className="uw-control-label" htmlFor="uw-cap">Cap Rate</label>
          <input
            id="uw-cap"
            data-testid="cap-rate-input"
            type="number" step="0.005"
            value={capRate}
            // FIX 2: NaN guard on all numeric inputs
            onChange={(e) => setCapRate(safeFloat(e.target.value, capRate))}
            className="uw-input"
          />
        </div>

        <div className="uw-control-group">
          <label className="uw-control-label" htmlFor="uw-vac">Vacancy %</label>
          <input
            id="uw-vac"
            data-testid="vacancy-input"
            type="number" step="0.01"
            value={vacancy}
            onChange={(e) => setVacancy(safeFloat(e.target.value, vacancy))}
            className="uw-input"
          />
        </div>

        <div className="uw-control-group">
          <label className="uw-control-label" htmlFor="uw-opex">Op-Ex Ratio</label>
          <input
            id="uw-opex"
            data-testid="opex-input"
            type="number" step="0.01"
            value={expRatio}
            onChange={(e) => setExpRatio(safeFloat(e.target.value, expRatio))}
            className="uw-input"
          />
        </div>

        <div className="uw-control-group">
          <label className="uw-control-label" htmlFor="uw-comps">Comps $/SqFt</label>
          <input
            id="uw-comps"
            data-testid="comps-psf-input"
            type="number" step="5"
            placeholder="Auto"
            value={compsPsf}
            onChange={(e) => setCompsPsf(e.target.value)}
            className="uw-input"
          />
        </div>
      </div>

      {/* ── RECALCULATE BAR ── */}
      <div className="uw-action-bar">
        <span className="uw-action-hint">Adjust parameters then recalculate</span>
        <button
          data-testid="run-underwrite-btn"
          onClick={run}
          disabled={loading}
          className="uw-run-btn"
        >
          {loading ? "Computing..." : "Recalculate"}
        </button>
      </div>

      {/* ── RESULTS ── */}
      {result && (
        <>
          {/* Headline metrics row 1 */}
          <div className="uw-metrics-grid">
            <Metric
              testid="metric-repair"
              label="Repair Cost"
              value={fmtMoney(result.repair.total_repair_cost)}
              accent="pop-red"
            />
            <Metric
              testid="metric-arv"
              label="ARV"
              value={fmtMoney(result.arv.arv)}
              accent="pop-lime"
            />
            {/* FIX 4: GRM guarded and rounded */}
            <Metric
              testid="metric-grm"
              label="GRM"
              value={result.grm != null ? Math.round(result.grm * 100) / 100 : "—"}
            />
            <Metric
              testid="metric-cap-value"
              label="Cap Value (NOI/R)"
              value={fmtMoney(result.cap_value)}
              accent="pop-lime"
            />
          </div>

          {/* Headline metrics row 2 */}
          <div className="uw-metrics-grid">
            <Metric
              testid="metric-noi"
              label="NOI (annual)"
              value={fmtMoney(result.noi)}
            />
            <Metric
              testid="metric-max-offer"
              label="Max Offer (70%)"
              value={fmtMoney(result.max_offer_70_rule)}
              accent="pop-blue"
            />
            <Metric
              testid="metric-profit"
              label="Projected Profit"
              value={fmtMoney(result.projected_profit)}
              accent={result.projected_profit > 0 ? "pop-lime" : "pop-red"}
            />
            {/* FIX 3: roi_pct rounded, no raw float */}
            <Metric
              testid="metric-roi"
              label="ROI"
              value={result.roi_pct != null ? `${Math.round(result.roi_pct)}%` : "—"}
              accent={result.roi_pct > 0 ? "pop-lime" : "pop-red"}
            />
          </div>

          {/* Repair breakdown */}
          <div className="uw-breakdown">
            <div className="uw-breakdown-header">
              <TrendingUp className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              Repair Breakdown · {result.repair.scope?.toUpperCase()} ·{" "}
              ${result.repair.psf_effective}/sqft effective
            </div>
            <div className="uw-breakdown-grid">
              <div className="uw-breakdown-cell">
                <span className="uw-breakdown-label">Structural</span>
                <span className="uw-breakdown-value">{fmtMoney(result.repair.structural)}</span>
              </div>
              <div className="uw-breakdown-cell">
                <span className="uw-breakdown-label">Foundation</span>
                <span className="uw-breakdown-value">{fmtMoney(result.repair.foundation)}</span>
              </div>
              <div className="uw-breakdown-cell">
                <span className="uw-breakdown-label">Roof</span>
                <span className="uw-breakdown-value">{fmtMoney(result.repair.roof)}</span>
              </div>
              <div className="uw-breakdown-cell">
                <span className="uw-breakdown-label">Contingency (10%)</span>
                <span className="uw-breakdown-value">{fmtMoney(result.repair.contingency)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UnderwriteCalculator;
