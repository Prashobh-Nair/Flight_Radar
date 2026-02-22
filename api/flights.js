export default async function handler(req, res) {
  const response = await fetch(
    "https://airlabs.co/api/v9/flights?api_key=02f0e69e-ebf7-4c3b-bd30-101a94d800d3"
  );

  const data = await response.json();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(data);
}