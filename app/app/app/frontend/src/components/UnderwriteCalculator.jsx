"import { useState, useEffect } from \"react\";
import { api, fmtMoney } from \"@/lib/api\";
import { Calculator, TrendingUp } from \"lucide-react\";

const Metric = ({ label, value, accent, mono = true, testid }) => (
  <div className=\"border-r border-b border-neutral-300 p-3 flex flex-col gap-1 last:border-r-0\" data-testid={testid}>
    <div className=\"label-xs\">{label}</div>
    <div className={`${mono ? \"font-mono-pi\" : \"font-display\"} text-lg font-semibold tracking-tight ${accent || \"\"}`}>
      {value}
    </div>
  </div>
);

export const UnderwriteCalculator = ({ property }) => {
  const [scope, setScope] = useState(\"moderate\");
  const [capRate, setCapRate] = useState(0.08);
  const [vacancy, setVacancy] = useState(0.08);
  const [expRatio, setExpRatio] = useState(0.40);
  const [compsPsf, setCompsPsf] = useState(\"\");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/properties/${property.id}/underwrite`, {
        scope, cap_rate: capRate, vacancy_rate: vacancy, expense_ratio: expRatio,
        comps_psf: compsPsf ? parseFloat(compsPsf) : null,
      });
      setResult(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [property.id]);

  return (
    <div className=\"border border-neutral-300 bg-white\" data-testid=\"underwrite-calc\">
      <div className=\"px-4 py-3 border-b border-neutral-300 flex items-center justify-between bg-neutral-50\">
        <div className=\"flex items-center gap-2\">
          <Calculator className=\"w-4 h-4\" strokeWidth={1.5}/>
          <span className=\"font-display font-bold uppercase text-xs tracking-wide\">Underwriting Engine</span>
        </div>
        <span className=\"label-xs\">RSMeans · ATTOM AVM</span>
      </div>

      {/* Controls */}
      <div className=\"grid grid-cols-2 md:grid-cols-5 border-b border-neutral-300 divide-x divide-neutral-300\">
        <div className=\"p-3\">
          <label className=\"label-xs block mb-1\">Rehab Scope</label>
          <select data-testid=\"scope-select\" value={scope} onChange={(e)=>setScope(e.target.value)}
            className=\"w-full border border-black bg-white py-1.5 px-2 text-xs\">
            <option value=\"cosmetic\">Cosmetic</option>
            <option value=\"moderate\">Moderate</option>
            <option value=\"full_gut\">Full Gut</option>
          </select>
        </div>
        <div className=\"p-3\">
          <label className=\"label-xs block mb-1\">Cap Rate</label>
          <input data-testid=\"cap-rate-input\" type=\"number\" step=\"0.005\" value={capRate} onChange={(e)=>setCapRate(parseFloat(e.target.value))}
            className=\"w-full border border-black bg-white py-1.5 px-2 text-xs font-mono-pi\"/>
        </div>
        <div className=\"p-3\">
          <label className=\"label-xs block mb-1\">Vacancy %</label>
          <input data-testid=\"vacancy-input\" type=\"number\" step=\"0.01\" value={vacancy} onChange={(e)=>setVacancy(parseFloat(e.target.value))}
            className=\"w-full border border-black bg-white py-1.5 px-2 text-xs font-mono-pi\"/>
        </div>
        <div className=\"p-3\">
          <label className=\"label-xs block mb-1\">Op-Ex Ratio</label>
          <input data-testid=\"opex-input\" type=\"number\" step=\"0.01\" value={expRatio} onChange={(e)=>setExpRatio(parseFloat(e.target.value))}
            className=\"w-full border border-black bg-white py-1.5 px-2 text-xs font-mono-pi\"/>
        </div>
        <div className=\"p-3\">
          <label className=\"label-xs block mb-1\">Comps $/SqFt</label>
          <input data-testid=\"comps-psf-input\" type=\"number\" step=\"5\" placeholder=\"Auto\" value={compsPsf} onChange={(e)=>setCompsPsf(e.target.value)}
            className=\"w-full border border-black bg-white py-1.5 px-2 text-xs font-mono-pi\"/>
        </div>
      </div>

      <div className=\"p-3 border-b border-neutral-300 flex items-center justify-between bg-white\">
        <span className=\"label-xs\">Push parameters to recalculate the model</span>
        <button data-testid=\"run-underwrite-btn\" onClick={run} disabled={loading}
          className=\"bg-[#002fa7] text-white hover:bg-blue-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] disabled:opacity-50\">
          {loading ? \"Computing...\" : \"▶ Recalculate\"}
        </button>
      </div>

      {result && (
        <>
          {/* Headline metrics */}
          <div className=\"grid grid-cols-2 md:grid-cols-4 border-b border-neutral-300\">
            <Metric testid=\"metric-repair\" label=\"Repair Cost\" value={fmtMoney(result.repair.total_repair_cost)} accent=\"text-red-700\"/>
            <Metric testid=\"metric-arv\" label=\"ARV (After-Repair Value)\" value={fmtMoney(result.arv.arv)} accent=\"text-[#002fa7]\"/>
            <Metric testid=\"metric-grm\" label=\"GRM\" value={result.grm}/>
            <Metric testid=\"metric-cap-value\" label=\"Cap Value (V = NOI/R)\" value={fmtMoney(result.cap_value)} accent=\"text-[#002fa7]\"/>
          </div>

          {/* Yield row */}
          <div className=\"grid grid-cols-2 md:grid-cols-4 border-b border-neutral-300\">
            <Metric testid=\"metric-noi\" label=\"NOI (annual)\" value={fmtMoney(result.noi)}/>
            <Metric testid=\"metric-max-offer\" label=\"Max Offer (70% rule)\" value={fmtMoney(result.max_offer_70_rule)} accent=\"text-green-700\"/>
            <Metric testid=\"metric-profit\" label=\"Projected Profit\" value={fmtMoney(result.projected_profit)} accent={result.projected_profit > 0 ? \"text-green-700\" : \"text-red-700\"}/>
            <Metric testid=\"metric-roi\" label=\"ROI\" value={`${result.roi_pct}%`} accent={result.roi_pct > 0 ? \"text-green-700\" : \"text-red-700\"}/>
          </div>

          {/* Repair breakdown */}
          <div className=\"p-3 bg-neutral-50\">
            <div className=\"label-xs mb-2 flex items-center gap-2\"><TrendingUp className=\"w-3 h-3\"/> Repair Breakdown · {result.repair.scope.toUpperCase()} · ${result.repair.psf_effective}/sqft effective</div>
            <div className=\"grid grid-cols-4 gap-0 border border-neutral-300 divide-x divide-neutral-300 bg-white\">
              <div className=\"p-2\"><div className=\"label-xs text-[9px]\">Structural</div><div className=\"font-mono-pi text-sm\">{fmtMoney(result.repair.structural)}</div></div>
              <div className=\"p-2\"><div className=\"label-xs text-[9px]\">Foundation</div><div className=\"font-mono-pi text-sm\">{fmtMoney(result.repair.foundation)}</div></div>
              <div className=\"p-2\"><div className=\"label-xs text-[9px]\">Roof</div><div className=\"font-mono-pi text-sm\">{fmtMoney(result.repair.roof)}</div></div>
              <div className=\"p-2\"><div className=\"label-xs text-[9px]\">Contingency (10%)</div><div className=\"font-mono-pi text-sm\">{fmtMoney(result.repair.contingency)}</div></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UnderwriteCalculator;
"