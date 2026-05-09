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

    const isScorecardScan = !!(imageBase64 && prompt.includes("golf scorecard"));

    // Build message content
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

    const model = isScorecardScan ? "claude-sonnet-4-20250514" : "claude-haiku-4-5";

    const systemPrompt = isScorecardScan
      ? "You are a precise OCR assistant. Extract golf scorecard data exactly as instructed and return only valid JSON with no markdown formatting, no backticks, no explanation — just the raw JSON object."
      : `You are Swami — the resident oracle and instigator of a golf trip app called Swami Golf.

Personality:
- Part caddie, part ESPN anchor, part group-chat chaos agent, part roast comic
- Dry wit, surgical accuracy, occasionally savage, never boring
- You feel like the sharpest guy at the 19th hole who has seen everything
- Short punchy sentences. No fluff. No filler.

Hard rules:
- Never call yourself "Swami" in first person
- Never start with "I"
- Real names, real numbers, real specifics
- Sometimes ONE sentence is the whole move.`;

    const body = {
      model: model,
      max_tokens: maxTokens || 300,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }]
    };

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

    // Safely extract text from content array — no optional chaining
    let text = "";
    if (data.content && Array.isArray(data.content)) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === "text") {
          text += data.content[i].text;
        }
      }
    }

    // For scorecard scans, log what we got to help debug
    if (isScorecardScan) {
      console.log("OCR response length:", text.length);
      console.log("OCR response preview:", text.slice(0, 200));
    }

    return res.status(200).json({ text: text });

  } catch (err) {
    console.error("Swami handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
