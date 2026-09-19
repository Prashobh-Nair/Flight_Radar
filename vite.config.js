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
            const lamin = url.searchParams.get('lamin') || '6.5';
            const lomin = url.searchParams.get('lomin') || '68.0';
            const lamax = url.searchParams.get('lamax') || '35.7';
            const lomax = url.searchParams.get('lomax') || '97.5';

            const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
            const apiKey = process.env.OPENSKY_API_KEY || 'fc80037952ed29300a20e2a59f66d7bc';

            const headers = {
              'User-Agent': 'FlightTrackerApp/1.0',
              'Accept': 'application/json'
            };

            if (apiKey) {
              headers['Authorization'] = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
            }

            let openSkyRes = await fetch(openSkyUrl, { headers });
            if (!openSkyRes.ok && (openSkyRes.status === 401 || openSkyRes.status === 403)) {
              openSkyRes = await fetch(openSkyUrl, {
                headers: { 'User-Agent': 'FlightTrackerApp/1.0', 'Accept': 'application/json' }
              });
            }

            if (!openSkyRes.ok) {
              res.statusCode = openSkyRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `OpenSky error: ${openSkyRes.status}`, response: [] }));
              return;
            }

            const data = await openSkyRes.json();
            const states = data.states || [];

            const flights = states
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
                  callsign: callsign,
                  reg_number: icao.toUpperCase(),
                  registration: icao.toUpperCase(),
                  aircraft_icao: 'N/A',
                  typeCode: 'N/A',
                  lat: lat,
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
                  country: country,
                  on_ground: onGround,
                  onGround: onGround,
                  squawk: squawk || 'N/A'
                };
              });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ response: flights, count: flights.length }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message, response: [] }));
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
