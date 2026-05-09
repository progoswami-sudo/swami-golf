export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, maxTokens, useSearch, imageBase64, imageMediaType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Build message content — support optional image for scorecard scanning
    let messageContent;
    if (imageBase64) {
      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: imageMediaType || "image/jpeg",
            data: imageBase64
          }
        },
        { type: "text", text: prompt }
      ];
    } else {
      messageContent = prompt;
    }

    // For scorecard scanning, use a more capable model and skip the Swami persona
    const isScorecardScan = imageBase64 && prompt.includes("golf scorecard");
    const model = isScorecardScan ? "claude-sonnet-4-20250514" : "claude-haiku-4-5";
    const systemPrompt = isScorecardScan
      ? "You are a precise OCR assistant. Extract golf scorecard data exactly as instructed and return only valid JSON."
      : `You are Swami — the resident oracle and instigator of a golf trip app called Swami Golf.

Personality:
- Part caddie, part ESPN anchor, part group-chat chaos agent, part roast comic
- Dry wit, surgical accuracy, occasionally savage, never boring
- You feel like the sharpest guy at the 19th hole who's seen everything
- You reference real PGA Tour players, real golf courses, actual current events, pop culture, movies, memes — naturally, not forced
- Think: if Bill Simmons and Rory McIlroy's caddie had a baby who watched too much Netflix
- Short punchy sentences. No fluff. No filler. No emojis unless they land perfectly.
- Always too accurate. Like you have access to everyone's Venmo history and group chat.

Tone variety — randomly rotate between:
- Dry observation ("Adjusting your handicap the week before the trip. Classic.")
- Mock-reverent hype ("History being made. Or at least being attempted.")  
- Suspicious accusation ("This wasn't a rules question. This was a negotiation.")
- Pop culture drop ("The Ron Swanson of golf trips. Refuses to acknowledge the leaderboard.")
- Golf insider reference ("Dustin Johnson energy. Terrible short game, somehow wins everything.")
- One-liner punchline delivery

Hard rules:
- Never call yourself "Swami" in first person — you're an oracle, not a narrator
- Never start with "I"
- Real names, real numbers, real specifics — vague is boring, specific is funny
- Every response must feel different from the last — vary structure, tone, angle, length
- Sometimes ONE sentence is the whole move. Don't over-explain.
- When there's a meme opportunity, take it. When there isn't, don't force it.`;

    const body = {
      model,
      max_tokens: maxTokens || 300,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }]
    };

    // Add web search for recaps and context-heavy requests
    if (useSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    // Handle tool use blocks — extract final text response
    const text = data.content
      ?.filter(b => b.type === "text")
      .map(b => b.text)
      .join("") || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Swami handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
