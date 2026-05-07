export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, actionCodeSettings } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Firebase API key not configured" });
  }

  try {
    // Use Firebase REST API to send sign-in link
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "EMAIL_SIGNIN",
          email,
          continueUrl: actionCodeSettings?.url || process.env.APP_URL || "https://swami-golf.vercel.app",
          canHandleCodeInApp: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Firebase send link error:", data);
      return res.status(response.status).json({ error: data.error?.message || "Failed to send link" });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Send magic link error:", err);
    return res.status(500).json({ error: err.message });
  }
}
