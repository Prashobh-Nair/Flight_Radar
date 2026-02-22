export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://airlabs.co/api/v9/flights?api_key=02f0e69e-ebf7-4c3b-bd30-101a94d800d3"
    );

    const data = await response.json();

    // 🇮🇳 India Airspace Filter
    const indiaFlights = (data.response || []).filter(flight => {
      return (
        flight.lat >= 6.5 &&
        flight.lat <= 35.7 &&
        flight.lng >= 68.0 &&
        flight.lng <= 97.5
      );
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ response: indiaFlights });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}