import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom dev middleware to serve /api/flights directly during local development
function flightApiDevPlugin() {
  return {
    name: 'flight-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname === '/api/flights') {
          try {
            const minLat = parseFloat(url.searchParams.get('lamin')) || 6.5;
            const minLon = parseFloat(url.searchParams.get('lomin')) || 68.0;
            const maxLat = parseFloat(url.searchParams.get('lamax')) || 35.7;
            const maxLon = parseFloat(url.searchParams.get('lomax')) || 97.5;

            let flights = [];

            // Strategy 1: OpenSky Network
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3500);

              const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${minLat}&lomin=${minLon}&lamax=${maxLat}&lomax=${maxLon}`;
              const apiKey = process.env.OPENSKY_API_KEY || 'fc80037952ed29300a20e2a59f66d7bc';

              const headers = {
                'User-Agent': 'FlightRadarApp/1.0',
                'Accept': 'application/json'
              };

              if (apiKey) {
                headers['Authorization'] = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
              }

              const openSkyRes = await fetch(openSkyUrl, { headers, signal: controller.signal });
              clearTimeout(timeout);

              if (openSkyRes.ok) {
                const data = await openSkyRes.json();
                const states = data.states || [];
                if (states.length > 0) {
                  flights = states
                    .filter(s => s && s[5] != null && s[6] != null)
                    .map(s => {
                      const icao = (s[0] || '').toLowerCase().trim();
                      const callsign = (s[1] || s[0] || 'N/A').trim();
                      const country = s[2] || 'Unknown';
                      const lon = s[5];
                      const lat = s[6];
                      const baroAlt = s[7];
                      const onGround = Boolean(s[8]);
                      const velocityMs = s[9];
                      const heading = s[10];
                      const vertRate = s[11];
                      const geoAlt = s[13];
                      const squawk = s[14];

                      return {
                        hex: icao,
                        icao24: icao,
                        flight_icao: callsign,
                        flight_iata: callsign,
                        callsign,
                        reg_number: icao.toUpperCase(),
                        registration: icao.toUpperCase(),
                        aircraft_icao: 'N/A',
                        typeCode: 'N/A',
                        lat,
                        latitude: lat,
                        lng: lon,
                        longitude: lon,
                        alt: Math.round(baroAlt ?? geoAlt ?? 0),
                        altitude: Math.round(baroAlt ?? geoAlt ?? 0),
                        speed: Math.round((velocityMs || 0) * 3.6),
                        velocity: Math.round((velocityMs || 0) * 3.6),
                        dir: Math.round(heading || 0),
                        heading: Math.round(heading || 0),
                        v_speed: vertRate != null ? Math.round(vertRate * 10) / 10 : 0,
                        verticalRate: vertRate != null ? Math.round(vertRate * 10) / 10 : 0,
                        flag: country,
                        country,
                        on_ground: onGround,
                        onGround,
                        squawk: squawk || 'N/A'
                      };
                    });
                }
              }
            } catch (e) {
              // OpenSky fallback
            }

            // Strategy 2: Fallback to FR24
            if (flights.length === 0) {
              try {
                const fr24Url = `https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=${maxLat},${minLat},${minLon},${maxLon}`;
                const fr24Res = await fetch(fr24Url, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                  }
                });
                if (fr24Res.ok) {
                  const fr24Data = await fr24Res.json();
                  const keys = Object.keys(fr24Data).filter(k => k !== 'full_count' && k !== 'version');
                  flights = keys.map(k => {
                    const d = fr24Data[k];
                    if (!Array.isArray(d)) return null;
                    const hex = (d[0] || k).toLowerCase();
                    const lat = d[1];
                    const lng = d[2];
                    const heading = d[3] || 0;
                    const altFeet = d[4] || 0;
                    const speedKnots = d[5] || 0;
                    const typeCode = d[8] || 'N/A';
                    const reg = d[9] || hex.toUpperCase();
                    const flightNumber = d[13] || d[16] || hex.toUpperCase();
                    const onGround = Boolean(d[14]);
                    const vspeedFpm = d[15] || 0;
                    const callsign = (d[16] || d[13] || hex.toUpperCase()).trim();
                    const airline = d[18] || 'India';

                    return {
                      hex,
                      icao24: hex,
                      flight_icao: callsign,
                      flight_iata: flightNumber,
                      callsign,
                      reg_number: reg,
                      registration: reg,
                      aircraft_icao: typeCode,
                      typeCode,
                      lat,
                      latitude: lat,
                      lng,
                      longitude: lng,
                      alt: Math.round(altFeet * 0.3048),
                      altitude: Math.round(altFeet * 0.3048),
                      speed: Math.round(speedKnots * 1.852),
                      velocity: Math.round(speedKnots * 1.852),
                      dir: Math.round(heading),
                      heading: Math.round(heading),
                      v_speed: Math.round(vspeedFpm * 0.00508 * 10) / 10,
                      verticalRate: Math.round(vspeedFpm * 0.00508 * 10) / 10,
                      flag: airline,
                      country: airline,
                      on_ground: onGround,
                      onGround
                    };
                  }).filter(f => f && f.latitude != null && f.longitude != null);
                }
              } catch (e) {
                // FR24 fallback error
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ response: flights, count: flights.length }));
          } catch (err) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ response: [], error: err.message, count: 0 }));
          }
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), flightApiDevPlugin()],
})
