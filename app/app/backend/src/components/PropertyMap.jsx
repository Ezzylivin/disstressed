import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// 2026 CYBER COLOR POP MATRIX
const colorForStatus = (p) => {
  const statuses = p.distress_statuses?.join(" ") || "";
  if (statuses.includes("Pre-Foreclosure") || statuses.includes("NOD") || statuses.includes("Lis")) {
    return "#FF4D4D"; // Distress Alert Neon Red
  }
  if (statuses.includes("Tax Delinquent")) {
    return "#DEFF9A"; // Success / Opportunity Neon Lime
  }
  if (p.vacant) {
    return "#00A3FF"; // Cyber Blue Vacancy Signal
  }
  return "#525252"; // Baseline Neutral
};

// UNIFIED CAMERA MATRIX CONTROLLER
const MapController = ({ properties, selectedId }) => {
  const map = useMap();

  // Handle dynamic bounding framework when search filters or datasets update
  useEffect(() => {
    if (!properties || properties.length === 0) return;

    const lats = properties.map((p) => p.lat || p.latitude).filter(Boolean);
    const lngs = properties.map((p) => p.lng || p.longitude).filter(Boolean);
    
    if (lats.length === 0 || lngs.length === 0) return;

    const bounds = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [properties, map]);

  // Handle sub-second camera fly-to translations upon list card focus
  useEffect(() => {
    if (!selectedId || !properties) return;
    
    const target = properties.find((p) => p.id === selectedId);
    if (!target) return;

    const lat = target.lat || target.latitude;
    const lng = target.lng || target.longitude;

    if (lat && lng) {
      map.flyTo([lat, lng], 15, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [selectedId, properties, map]);

  return null;
};

export const PropertyMap = ({ properties, selectedId, onSelect }) => {
  return (
    <div className="h-full w-full relative" data-testid="property-map">
      <MapContainer 
        center={[39.9526, -75.1652]} 
        zoom={5} 
        style={{ height: "100%", width: "100%", background: "#000000" }} 
        scrollWheelZoom
        zoomControl={false} // Removes default browser control artifacts
      >
        {/* NATIVE OBSIDIAN GEOSPATIAL MAP TILE ENGINE */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Active view port pipeline */}
        <MapController properties={properties} selectedId={selectedId} />

        {properties.map((p) => {
          const lat = p.lat || p.latitude;
          const lng = p.lng || p.longitude;
          
          // Fail-safe protection skip layer for coordinates that are corrupted or missing
          if (!lat || !lng) return null;

          const isSel = p.id === selectedId;
          const markerColor = isSel ? "#00A3FF" : colorForStatus(p);

          return (
            <CircleMarker
              key={p.id}
              center={[lat, lng]}
              radius={isSel ? 10 : 6}
              pathOptions={{
                color: isSel ? "#FFFFFF" : markerColor,
                weight: isSel ? 2 : 1,
                fillColor: markerColor,
                fillOpacity: isSel ? 0.95 : 0.75,
              }}
              eventHandlers={{
                click: () => onSelect && onSelect(p.id),
              }}
            >
              {/* CUSTOM TIMED BRUTALIST DETAILS HUD WINDOW */}
              <Popup className="brutalist-popup-enclosure">
                <div className="p-1 font-sans text-white bg-black select-none">
                  <div className="font-bold text-xs uppercase tracking-tight mb-0.5">{p.site_address}</div>
                  <div className="text-[10px] text-neutral-400 font-mono-pi mb-2">{p.city || "METRO"}, {p.state}</div>
                  
                  <div className="flex justify-between items-center border-t border-neutral-900 pt-1.5 font-mono-pi text-[11px]">
                    <div>
                      <span className="text-neutral-600 block text-[8px] uppercase">Market AVM</span>
                      <span className="font-bold">${p.market_value?.toLocaleString() || "—"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-600 block text-[8px] uppercase">Equity</span>
                      <span className="text-[#DEFF9A] font-bold">{Math.round(p.equity_pct || 0)}%</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* FIXED SYSTEM LAYOUT INDICATOR OVERLAY */}
      <div className="absolute bottom-3 left-3 bg-black/90 border border-neutral-800 px-2 py-1 font-mono text-[9px] text-[#DEFF9A] z-[1000] uppercase tracking-widest pointer-events-none">
        Radar Core // Active Nodes: {properties?.length || 0}
      </div>
    </div>
  );
};

export default PropertyMap;
