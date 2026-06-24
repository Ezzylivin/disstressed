"import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const colorForStatus = (p) => {
  if (p.distress_statuses?.some((s) => s.includes("Pre-Foreclosure") || s.includes("NOD") || s.includes("Lis"))) return "#ff3b30";
  if (p.distress_statuses?.some((s) => s.includes("Tax Delinquent"))) return "#ffcc00";
  if (p.vacant) return "#002fa7";
  return "#525252";
};

const FitBounds = ({ properties }) => {
  const map = useMap();
  useEffect(() => {
    if (!properties.length) return;
    const lats = properties.map((p) => p.lat);
    const lngs = properties.map((p) => p.lng);
    const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [properties.length]);
  return null;
};

export const PropertyMap = ({ properties, selectedId, onSelect }) => {
  return (
    <div className="h-full w-full" data-testid="property-map">
      <MapContainer center={[39.9526, -75.1652]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds properties={properties} />
        {properties.map((p) => {
          const isSel = p.id === selectedId;
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={isSel ? 11 : 7}
              pathOptions={{
                color: isSel ? "#000" : colorForStatus(p),
                weight: isSel ? 3 : 1.5,
                fillColor: colorForStatus(p),
                fillOpacity: 0.85,
              }}
              eventHandlers={{ click: () => onSelect && onSelect(p.id) }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{p.site_address}</div>
                  <div className="text-neutral-500">{p.city}, {p.state}</div>
                  <div className="mt-1 font-mono-pi">${p.market_value?.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">{p.primary_status}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default PropertyMap;
"
