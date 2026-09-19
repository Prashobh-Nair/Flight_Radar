export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { lamin, lomin, lamax, lomax } = req.query || {};

    let url = "https://opensky-network.org/api/states/all";
    if (lamin && lomin && lamax && lomax) {
      url += `?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    } else {
      // Default to India airspace bounding box
      url += "?lamin=6.5&lomin=68.0&lamax=35.7&lomax=97.5";
    }

    const apiKey = process.env.OPENSKY_API_KEY || "fc80037952ed29300a20e2a59f66d7bc";
    const headers = {
      "User-Agent": "FlightTrackerApp/1.0",
      "Accept": "application/json"
    };

    if (apiKey) {
      headers["Authorization"] = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
    }

    let response = await fetch(url, { headers });

    // If authenticated request gets 401/403, retry anonymously
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      response = await fetch(url, {
        headers: { "User-Agent": "FlightTrackerApp/1.0", "Accept": "application/json" }
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`OpenSky error (${response.status}):`, errText);
      return res.status(response.status).json({
        error: `OpenSky API error: ${response.status}`,
        response: []
      });
    }

    const data = await response.json();
    const states = data.states || [];

    // Transform OpenSky state vectors into structured flight objects
    const flights = states
      .filter(s => s && s[5] != null && s[6] != null)
      .map(s => {
        const icao = (s[0] || "").toLowerCase().trim();
        const callsign = (s[1] || s[0] || "N/A").trim();
        const country = s[2] || "Unknown";
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
          callsign: callsign,
          reg_number: icao.toUpperCase(),
          registration: icao.toUpperCase(),
          aircraft_icao: "N/A",
          typeCode: "N/A",
          lat: lat,
          latitude: lat,
          lng: lon,
          longitude: lon,
          alt: Math.round(baroAlt ?? geoAlt ?? 0),
          altitude: Math.round(baroAlt ?? geoAlt ?? 0),
          speed: Math.round((velocityMs || 0) * 3.6), // m/s to km/h
          velocity: Math.round((velocityMs || 0) * 3.6),
          dir: Math.round(heading || 0),
          heading: Math.round(heading || 0),
          v_speed: vertRate != null ? Math.round(vertRate * 10) / 10 : 0,
          verticalRate: vertRate != null ? Math.round(vertRate * 10) / 10 : 0,
          flag: country,
          country: country,
          on_ground: onGround,
          onGround: onGround,
          squawk: squawk || "N/A"
        };
      });

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=5");
    return res.status(200).json({
      response: flights,
      time: data.time || Math.floor(Date.now() / 1000),
      count: flights.length
    });

  } catch (error) {
    console.error("Flights API error:", error);
    return res.status(500).json({ error: error.message || "Server error", response: [] });
  }
}