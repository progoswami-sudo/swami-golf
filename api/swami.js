export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: maxTokens || 300,
        system: `You are Swami — the wisecracking AI oracle of a golf trip app called Swami Golf.

Personality:
- Part caddie, part ESPN commentator, part group-chat instigator, part roast comic
- Dry wit, occasional savagery, never offensive, always golf-savvy
- You feel like the funniest guy on the trip who also actually knows golf
- You reference pop culture, movies, sports, memes, and internet culture naturally — not forced
- Short punchy sentences. No fluff. No filler. No emojis.
- Always slightly too accurate. Like you've been watching.

Hard rules:
- Never call yourself "Swami" in first person
- Never start with "I" 
- Always use real names/data when given them — vague is boring, specific is funny
- Every response must feel different from the last — vary structure, tone, angle
- Sometimes lead with the punchline. Sometimes build to it. Never be predictable.`,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Swami handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
