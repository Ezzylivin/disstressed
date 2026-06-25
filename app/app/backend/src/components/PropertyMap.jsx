import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { fmtMoney } from "../lib/api"; // FIX 2: use shared money formatter
import "leaflet/dist/leaflet.css";
import "./PropertyMap.css";

// FIX 5: Semantic color logic corrected
//   lime   = positive / equity signal  → do NOT use for distress
//   red    = foreclosure / NOD / lis pendens
//   amber  = tax delinquent (warning, not opportunity)
//   blue   = vacant
//   neutral = no flags
const colorForStatus = (p) => {
  const statuses = p.distress_statuses?.join(" ") || "";
  if (statuses.includes("Pre-Foreclosure") || statuses.includes("NOD") || statuses.includes("Lis"))
    return "#FF4D4D";   // red   — foreclosure alert
  if (statuses.includes("Tax Delinquent"))
    return "#FAC775";   // amber — tax warning (was incorrectly lime)
  if (p.vacant)
    return "#00A3FF";   // blue  — vacancy signal
  return "#3a3a3a";     // neutral
};

// ── MAP CONTROLLER ──────────────────────────────────────────────────────────
// Manages two independent behaviors:
//   1. fitBounds when the property list changes (new search results)
//   2. flyTo when a specific property is selected
// Both effects are intentionally separate so they don't trigger each other.
const MapController = ({ properties, selectedId }) => {
  const map = useMap();

  useEffect(() => {
    if (!properties?.length) return;
    const lats = properties.map((p) => p.lat ?? p.latitude).filter(Boolean);
    const lngs = properties.map((p) => p.lng ?? p.longitude).filter(Boolean);
    if (!lats.length || !lngs.length) return;
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40], maxZoom: 14 }
    );
  }, [properties, map]);

  useEffect(() => {
    if (!selectedId || !properties) return;
    const target = properties.find((p) => p.id === selectedId);
    if (!target) return;
    const lat = target.lat ?? target.latitude;
    const lng = target.lng ?? target.longitude;
    if (lat && lng) map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
  }, [selectedId, properties, map]);

  return null;
};

// ── COMPONENT ────────────────────────────────────────────────────────────────
export const PropertyMap = ({ properties, selectedId, onSelect }) => {
  return (
    <div className="map-root" data-testid="property-map">
      <MapContainer
        center={[39.9526, -75.1652]}
        zoom={5}
        style={{ height: "100%", width: "100%", background: "#000000" }}
        scrollWheelZoom
        zoomControl={false}
      >
        {/* Dark CARTO tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapController properties={properties} selectedId={selectedId} />

        {properties.map((p) => {
          const lat = p.lat ?? p.latitude;
          const lng = p.lng ?? p.longitude;
          if (!lat || !lng) return null;

          const isSel = p.id === selectedId;
          const fill = isSel ? "#00A3FF" : colorForStatus(p);

          return (
            <CircleMarker
              key={p.id}
              center={[lat, lng]}
              radius={isSel ? 10 : 6}
              pathOptions={{
                color: isSel ? "#ffffff" : fill,
                weight: isSel ? 2 : 1,
                fillColor: fill,
                fillOpacity: isSel ? 0.95 : 0.75,
              }}
              eventHandlers={{ click: () => onSelect?.(p.id) }}
            >
              {/* FIX 3: Popup uses CSS class — no inline Tailwind */}
              <Popup className="map-popup">
                <div className="popup-inner">
                  <div className="popup-address">{p.site_address}</div>
                  <div className="popup-location">
                    {p.city || "Metro"}, {p.state}
                  </div>
                  <div className="popup-stats">
                    <div className="popup-stat">
                      <span className="popup-stat-label">Market AVM</span>
                      {/* FIX 2: fmtMoney instead of manual $ + toLocaleString */}
                      <span className="popup-stat-value">{fmtMoney(p.market_value)}</span>
                    </div>
                    <div className="popup-stat text-right">
                      <span className="popup-stat-label">Equity</span>
                      <span className="popup-stat-value lime">
                        {Math.round(p.equity_pct ?? 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Status overlay — FIX 4: font-mono-pi not font-mono */}
      <div className="map-overlay" aria-live="polite">
        Radar // Active: {properties?.length ?? 0}
      </div>
    </div>
  );
};

export default PropertyMap;
