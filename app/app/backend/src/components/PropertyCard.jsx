import { fmtMoney } from "../lib/api";
import { MapPin } from "lucide-react";
import "./PropertyCard.css";

// FIX 4: dark-system badge classes — no light-mode Tailwind color utilities
const distressBadgeClass = (s) => {
  if (s.includes("Pre-Foreclosure") || s.includes("NOD") || s.includes("Lis"))
    return "badge-foreclosure";
  if (s.includes("Tax Delinquent"))
    return "badge-tax";
  if (s.includes("Vacant"))
    return "badge-vacant";
  return "badge-default";
};

const distressLabel = (s) => s.replace("Tax Delinquent - ", "TD ");

export const PropertyCard = ({ p, selected, onClick }) => {
  const hasImage = !!p.image_url;

  return (
    <div
      data-testid={`property-card-${p.id}`}
      onClick={onClick}
      className={`property-card ${selected ? "selected" : ""}`}
    >
      <div className="card-inner">

        {/* Thumbnail — FIX 1: placeholder when image_url is null */}
        <div className="card-thumb">
          {hasImage ? (
            <img
              src={p.image_url}
              alt=""
              className="card-thumb-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="card-thumb-placeholder"
            style={{ display: hasImage ? "none" : "flex" }}
            aria-hidden="true"
          >
            //
          </div>
        </div>

        {/* Content */}
        <div className="card-content">
          <div className="card-address">{p.site_address}</div>

          <div className="card-location">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {p.city}, {p.state} {p.zip}
          </div>

          {/* Distress badges — max 2 */}
          {p.distress_statuses?.length > 0 && (
            <div className="card-badges">
              {p.distress_statuses.slice(0, 2).map((s) => (
                <span key={s} className={`distress-badge ${distressBadgeClass(s)}`}>
                  {distressLabel(s)}
                </span>
              ))}
            </div>
          )}

          {/* Stats footer */}
          <div className="card-stats">
            <div className="card-stat">
              <span className="card-stat-label">Market</span>
              {/* FIX 2: equity rounded; fmtMoney already handles market value */}
              <span className="card-stat-value">{fmtMoney(p.market_value)}</span>
            </div>
            <div className="card-stat">
              <span className="card-stat-label">Equity</span>
              <span className="card-stat-value lime">{Math.round(p.equity_pct ?? 0)}%</span>
            </div>
            <div className="card-stat text-right">
              <span className="card-stat-label">Sq Ft</span>
              {/* FIX 3: fallback dash when sqft is null */}
              <span className="card-stat-value">{p.sqft?.toLocaleString() ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
