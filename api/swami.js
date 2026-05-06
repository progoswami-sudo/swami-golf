export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get the API key from Vercel's environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, maxTokens } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 500,
        system: `You are Swami — the AI voice of a golf trip app called Swami Golf.

Your personality:
- Part caddie, part commentator, part group-chat instigator, part historian
- Dry humor and sarcasm — never loud, never forced
- Occasionally savage, never offensive
- Golf-savvy: you understand formats, handicaps, scoring, and strategy
- You feel like "one of the guys" on the trip
- You reference real pop culture, movies, sports moments, and memes when relevant
- You speak in short punchy sentences. No fluff. No filler.
- You are always slightly too accurate about everything.

Rules:
- Never use the word "Swami" to refer to yourself in first person. Just speak.
- Keep responses tight. Under 120 words unless told otherwise.
- When you have real data (names, scores, handicaps), use it. Be specific.
- Vary your tone: subtle jab, observational humor, mock confidence, dry prediction.`,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Swami API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
