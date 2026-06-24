"import { fmtMoney } from \"@/lib/api\";
import { AlertTriangle, Home, MapPin } from \"lucide-react\";

const tagColor = (s) => {
  if (s.includes(\"Pre-Foreclosure\") || s.includes(\"NOD\") || s.includes(\"Lis\")) return \"bg-red-50 text-red-700 border-red-300\";
  if (s.includes(\"Tax Delinquent\")) return \"bg-yellow-50 text-yellow-800 border-yellow-400\";
  if (s.includes(\"Vacant\")) return \"bg-blue-50 text-blue-800 border-blue-300\";
  return \"bg-neutral-100 text-neutral-700 border-neutral-300\";
};

export const PropertyCard = ({ p, selected, onClick }) => {
  return (
    <div
      data-testid={`property-card-${p.id}`}
      onClick={onClick}
      className={`border-b border-neutral-300 p-3 cursor-pointer transition-colors ${selected ? \"bg-neutral-100 border-l-4 border-l-black\" : \"bg-white hover:bg-neutral-50\"}`}
    >
      <div className=\"flex items-start gap-3\">
        <img src={p.image_url} alt={p.site_address} className=\"w-16 h-16 object-cover border border-neutral-300 shrink-0\" />
        <div className=\"min-w-0 flex-1\">
          <div className=\"text-sm font-semibold truncate\">{p.site_address}</div>
          <div className=\"flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5\">
            <MapPin className=\"w-3 h-3\" strokeWidth={1.5}/>
            {p.city}, {p.state} {p.zip}
          </div>
          <div className=\"flex flex-wrap gap-1 mt-1.5\">
            {p.distress_statuses?.slice(0, 2).map((s) => (
              <span key={s} className={`text-[9px] uppercase tracking-wide font-bold border px-1.5 py-0.5 ${tagColor(s)}`}>
                {s.replace(\"Tax Delinquent - \", \"TD \")}
              </span>
            ))}
          </div>
          <div className=\"flex items-center justify-between mt-2 pt-2 border-t border-neutral-200\">
            <div>
              <div className=\"label-xs text-[9px]\">Market</div>
              <div className=\"font-mono-pi text-sm font-semibold\">{fmtMoney(p.market_value)}</div>
            </div>
            <div className=\"text-right\">
              <div className=\"label-xs text-[9px]\">Equity</div>
              <div className=\"font-mono-pi text-sm font-semibold\">{p.equity_pct}%</div>
            </div>
            <div className=\"text-right\">
              <div className=\"label-xs text-[9px]\">SqFt</div>
              <div className=\"font-mono-pi text-sm font-semibold\">{p.sqft?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
"
