import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

// ── Professional plane icon — navy blue body, gold outline ──────────────────
function makeIcon(heading, selected) {
    const sz = selected ? 36 : 26;
    const fill = selected ? '#e65100' : '#1565c0';   // orange when selected, navy blue otherwise
    const stroke = selected ? '#fff' : '#FFD700';   // white when selected, gold outline otherwise
    const sw = selected ? 1.2 : 0.9;
    const glow = selected
        ? 'drop-shadow(0 0 6px #FF6D00) drop-shadow(0 2px 5px rgba(0,0,0,0.4))'
        : 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))';

    // Full commercial jet silhouette — fuselage, swept wings, tail fins
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 80 80">
    <g transform="rotate(${heading ?? 0},40,40)">
      <ellipse cx="40" cy="40" rx="5" ry="30" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <path d="M40,28 L3,55 L3,62 L40,44 L77,62 L77,55 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <path d="M40,64 L20,74 L20,78 L40,71 L60,78 L60,74 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <ellipse cx="40" cy="12" rx="3.5" ry="5"
               fill="${selected ? '#ffe0b2' : '#90caf9'}" stroke="${stroke}" stroke-width="${sw * 0.6}"/>
    </g>
  </svg>`;

    return L.divIcon({
        html: `<div style="filter:${glow}">${svg}</div>`,
        className: '',
        iconSize: [sz, sz],
        iconAnchor: [sz / 2, sz / 2],
    });
}

// ── Aircraft layer ─────────────────────────────────────────────────────────
function AircraftLayer({ flights, selectedIcao, onSelect }) {
    const map = useMap();
    const markersRef = useRef({});
    const trailsRef = useRef({});
    const cbRef = useRef(onSelect);
    cbRef.current = onSelect;

    useEffect(() => {
        const cur = new Set(flights.map(f => f.icao24));

        Object.keys(markersRef.current).forEach(id => {
            if (!cur.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
        });
        Object.keys(trailsRef.current).forEach(id => {
            if (!cur.has(id)) { trailsRef.current[id].remove(); delete trailsRef.current[id]; }
        });

        flights.forEach(f => {
            const sel = f.icao24 === selectedIcao;
            const icon = makeIcon(f.heading, sel);
            const pos = [f.latitude, f.longitude];

            // Trail polyline
            const trail = f.trail || [pos];
            if (trail.length > 1) {
                const trailStyle = {
                    color: sel ? '#e65100' : '#1565c0',
                    weight: sel ? 2.5 : 1.5,
                    opacity: sel ? 0.85 : 0.35,
                    dashArray: sel ? null : '5 8',
                };
                if (trailsRef.current[f.icao24]) {
                    trailsRef.current[f.icao24].setLatLngs(trail).setStyle(trailStyle);
                } else {
                    trailsRef.current[f.icao24] = L.polyline(trail, trailStyle).addTo(map);
                }
            }

            // Marker
            if (markersRef.current[f.icao24]) {
                markersRef.current[f.icao24].setLatLng(pos).setIcon(icon);
            } else {
                const label = `<div style="
          background:#fff;color:#0d1e34;font-family:Inter,sans-serif;
          font-size:11px;font-weight:700;padding:2px 8px;
          border-radius:4px;border:1px solid rgba(0,0,0,0.18);
          white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);
          letter-spacing:0.5px;">${f.callsign}</div>`;

                const m = L.marker(pos, { icon, zIndexOffset: sel ? 1000 : 0 })
                    .addTo(map)
                    .bindTooltip(label, {
                        direction: 'top', offset: [0, -14],
                        opacity: 1, permanent: false, className: 'fr24-tip',
                    })
                    .on('click', () => cbRef.current(f));
                markersRef.current[f.icao24] = m;
            }
        });
    }, [flights, selectedIcao, map]);

    useEffect(() => () => {
        Object.values(markersRef.current).forEach(m => m.remove());
        Object.values(trailsRef.current).forEach(p => p.remove());
        markersRef.current = {};
        trailsRef.current = {};
    }, []);

    return null;
}

// ── MapView ────────────────────────────────────────────────────────────────
export default function MapView({ flights, selectedFlight, onSelectFlight }) {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

            {/* Flight count — top-right */}
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 800,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 13px',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(21,101,192,0.2)',
                borderRadius: 999, fontSize: 11, color: '#1565c0', fontWeight: 700,
                boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
                backdropFilter: 'blur(6px)',
            }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#43a047', boxShadow: '0 0 0 2px #a5d6a7' }} />
                ✈ {flights.length} aircraft · India Airspace
            </div>

            {/* Google Maps */}
            <MapContainer
                center={[22, 82]}
                zoom={5}
                minZoom={4}
                maxZoom={18}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                worldCopyJump
            >
                <TileLayer
                    url="https://mt{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
                    subdomains={['0', '1', '2', '3']}
                    attribution="&copy; Google Maps"
                    maxZoom={20}
                />

                <AircraftLayer
                    flights={flights}
                    selectedIcao={selectedFlight?.icao24}
                    onSelect={onSelectFlight}
                />
            </MapContainer>

            {/* Tooltip style override */}
            <style>{`
        .fr24-tip { background: transparent !important; border: none !important;
                    box-shadow: none !important; padding: 0 !important; }
        .fr24-tip::before { display: none !important; }
      `}</style>
        </div>
    );
}
