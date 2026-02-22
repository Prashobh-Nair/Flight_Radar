import { useState, useEffect, useCallback, useRef } from 'react';

// Region definitions for the UI
export const REGIONS = {
    india: { label: '🇮🇳 India', bbox: { lamin: 6.5, lomin: 68.0, lamax: 35.7, lomax: 97.5 } },
    world: { label: '🌎 World', bbox: null },
    asia: { label: '🌏 Asia', bbox: { lamin: 0, lomin: 60, lamax: 55, lomax: 145 } },
    europe: { label: '🌍 Europe', bbox: { lamin: 35, lomin: -10, lamax: 71, lomax: 40 } },
    north_america: { label: '🌎 North America', bbox: { lamin: 15, lomin: -130, lamax: 72, lomax: -52 } },
};

// AirLabs API Configuration
const TRAIL_LENGTH = 10;

// India bounding box for AirLabs

export default function useFlightData(region = 'india') {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const historyRef = useRef({}); // Memory of past positions: { icao: [[lat, lon], ...] }

    const fetchFlights = useCallback(async () => {
        try {
            setLoading(true);

            // Try a different, more robust CORS proxy
            // corsproxy.io is often better than allorigins for large JSON responses

            const resp = await fetch("/api/flights");

            if (!resp.ok) {
                throw new Error(`Proxy error: ${resp.status} - ${resp.statusText}`);
            }

            const data = await resp.json();

            // AirLabs specific: error message can be inside the JSON

            const rawAc = data.response || []; // AirLabs uses 'response' field

            const processed = rawAc.map(ac => {
                const icao = (ac.hex || '').toLowerCase();
                if (!icao) return null;

                const pos = [ac.lat, ac.lng];

                // ── Manage Trail History ──
                if (!historyRef.current[icao]) {
                    historyRef.current[icao] = [];
                }
                const hist = historyRef.current[icao];
                const lastPos = hist[hist.length - 1];

                // Add pos if it's new or moved significantly
                if (!lastPos || lastPos[0] !== pos[0] || lastPos[1] !== pos[1]) {
                    hist.push(pos);
                    if (hist.length > TRAIL_LENGTH) hist.shift();
                }

                return {
                    icao24: icao,
                    callsign: (ac.flight_icao || ac.flight_iata || ac.hex || 'N/A').trim(),
                    registration: ac.reg_number || 'N/A',
                    typeCode: ac.aircraft_icao || 'N/A',
                    latitude: ac.lat,
                    longitude: ac.lng,
                    altitude: ac.alt || 0,        // AirLabs uses meters
                    velocity: ac.speed || 0,      // AirLabs uses km/h
                    heading: ac.dir || 0,        // AirLabs uses degrees
                    verticalRate: ac.v_speed || 0,    // AirLabs uses m/s
                    onGround: ac.alt != null && ac.alt < 300,
                    country: ac.flag || 'India', // Flag is country code (e.g., "IN")
                    trail: [...hist]
                };
            }).filter(f => f !== null && f.latitude != null && f.longitude != null);

            setFlights(processed);
            setError(null);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch immediately on mount or region change - NO AUTO POLL
    useEffect(() => {
        fetchFlights();
    }, [fetchFlights, region]);

    // Derived stats for StatsWidget
    const stats = {
        total: flights.length,
        avgAltitude: flights.length > 0
            ? Math.round(flights.reduce((acc, f) => acc + (f.altitude || 0), 0) / flights.length)
            : 0,
        maxSpeed: flights.length > 0
            ? Math.max(...flights.map(f => f.velocity || 0))
            : 0,
        byCountry: flights.reduce((acc, f) => {
            const c = f.country === 'IN' ? 'India' : f.country;
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {})
    };

    return { flights, loading, error, lastUpdate, stats, refresh: fetchFlights };
}
