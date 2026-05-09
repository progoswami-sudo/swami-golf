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

    // Use claude-sonnet-4-5 for vision (confirmed vision support), haiku for Swami
    const model = isScorecardScan ? "claude-sonnet-4-5" : "claude-haiku-4-5";

    const systemPrompt = isScorecardScan
      ? "You are a precise OCR assistant. Extract golf scorecard data exactly as instructed and return only valid JSON with no markdown formatting, no backticks, no explanation — just the raw JSON object."
      : `You are Swami — the resident oracle and instigator of a golf trip app called Swami Golf.
Personality: dry wit, surgical accuracy, occasionally savage. Short punchy sentences. No fluff.
Hard rules: Never call yourself "Swami" in first person. Never start with "I". Be specific and funny.`;

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    };

    // Only add web search beta header when actually using search
    if (useSearch) {
      headers["anthropic-beta"] = "web-search-2025-03-05";
    }

    const body = {
      model: model,
      max_tokens: maxTokens || 300,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }]
    };

    if (useSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    console.log("Swami request: model=" + model + " scan=" + isScorecardScan + " imageLen=" + (imageBase64 ? imageBase64.length : 0));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log("API status:", response.status);
    console.log("API response preview:", responseText.slice(0, 300));

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, responseText);
      return res.status(response.status).json({ error: responseText });
    }

    const data = JSON.parse(responseText);

    // Extract text blocks from content array
    var text = "";
    if (data.content && Array.isArray(data.content)) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === "text") {
          text += data.content[i].text;
        }
      }
    }

    console.log("Extracted text length:", text.length);
    if (isScorecardScan) {
      console.log("OCR text:", text.slice(0, 500));
    }

    return res.status(200).json({ text: text });

  } catch (err) {
    console.error("Swami handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
