export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  // Only allow fetching from known safe meme image domains
  const allowed = [
    "i.imgflip.com",
    "imgflip.com",
  ];

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!allowed.includes(parsed.hostname)) {
    return res.status(403).json({ error: "Domain not allowed: " + parsed.hostname });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SwamiGolf/1.0)",
        "Accept": "image/*"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Upstream fetch failed: " + response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return res.status(200).json({
      dataUrl: `data:${contentType};base64,${base64}`
    });

  } catch (err) {
    console.error("Meme proxy error:", err);
    return res.status(500).json({ error: err.message || "Proxy fetch failed" });
  }
}
