import { useState, useEffect, useCallback, useRef } from 'react';

// Region definitions for the UI
export const REGIONS = {
    india: { label: '🇮🇳 India', bbox: { lamin: 6.5, lomin: 68.0, lamax: 35.7, lomax: 97.5 } },
    world: { label: '🌎 World', bbox: null },
    asia: { label: '🌏 Asia', bbox: { lamin: 0, lomin: 60, lamax: 55, lomax: 145 } },
    europe: { label: '🌍 Europe', bbox: { lamin: 35, lomin: -10, lamax: 71, lomax: 40 } },
    north_america: { label: '🌎 North America', bbox: { lamin: 15, lomin: -130, lamax: 72, lomax: -52 } },
};

const TRAIL_LENGTH = 10;
const POLL_INTERVAL = 15000; // 15 seconds

export default function useFlightData(region = 'india') {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const historyRef = useRef({}); // Memory of past positions: { icao: [[lat, lon], ...] }

    const fetchFlights = useCallback(async (isPolling = false) => {
        try {
            if (!isPolling) {
                setLoading(true);
            }

            const bbox = REGIONS[region]?.bbox;
            let query = '';
            if (bbox) {
                query = `?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;
            }

            const resp = await fetch(`/api/flights${query}`);

            if (!resp.ok) {
                throw new Error(`Flight service error (${resp.status}): ${resp.statusText}`);
            }

            const data = await resp.json();

            let rawList = [];
            if (Array.isArray(data.response)) {
                rawList = data.response;
            } else if (Array.isArray(data.states)) {
                // OpenSky raw array format
                rawList = data.states
                    .filter(s => s && s[5] != null && s[6] != null)
                    .map(s => {
                        const icao = (s[0] || '').toLowerCase().trim();
                        const callsign = (s[1] || s[0] || 'N/A').trim();
                        return {
                            icao24: icao,
                            callsign: callsign,
                            country: s[2] || 'Unknown',
                            longitude: s[5],
                            latitude: s[6],
                            altitude: Math.round(s[7] ?? s[13] ?? 0),
                            onGround: Boolean(s[8]),
                            velocity: Math.round((s[9] || 0) * 3.6),
                            heading: Math.round(s[10] || 0),
                            verticalRate: s[11] != null ? Math.round(s[11] * 10) / 10 : 0,
                            squawk: s[14] || 'N/A'
                        };
                    });
            }

            const processed = rawList.map(ac => {
                const icao = (ac.icao24 || ac.hex || '').toLowerCase().trim();
                if (!icao) return null;

                const lat = Number(ac.latitude ?? ac.lat);
                const lng = Number(ac.longitude ?? ac.lng);
                if (isNaN(lat) || isNaN(lng)) return null;

                const pos = [lat, lng];

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

                const callsign = (ac.callsign || ac.flight_icao || ac.flight_iata || ac.hex || ac.icao24 || 'N/A').trim();
                const country = ac.country || ac.flag || (region === 'india' ? 'India' : 'Unknown');

                return {
                    icao24: icao,
                    callsign: callsign,
                    registration: ac.registration || ac.reg_number || icao.toUpperCase(),
                    typeCode: ac.typeCode || ac.aircraft_icao || 'N/A',
                    latitude: lat,
                    longitude: lng,
                    altitude: Number(ac.altitude ?? ac.alt ?? 0),
                    velocity: Number(ac.velocity ?? ac.speed ?? 0),
                    heading: Number(ac.heading ?? ac.dir ?? 0),
                    verticalRate: Number(ac.verticalRate ?? ac.v_speed ?? 0),
                    onGround: Boolean(ac.onGround ?? ac.on_ground ?? false),
                    country: country,
                    squawk: ac.squawk || 'N/A',
                    trail: [...hist]
                };
            }).filter(f => f !== null && f.latitude != null && f.longitude != null);

            setFlights(processed);
            setError(null);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Fetch flights error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [region]);

    // Fetch immediately on mount or region change
    useEffect(() => {
        fetchFlights(false);

        // Auto polling every 15s
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchFlights(true);
            }
        }, POLL_INTERVAL);

        return () => clearInterval(timer);
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
            const c = f.country === 'IN' ? 'India' : (f.country || 'Unknown');
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {})
    };

    return { flights, loading, error, lastUpdate, stats, refresh: () => fetchFlights(false) };
}
