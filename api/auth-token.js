// Firebase custom token generator using Web Crypto API
// No npm dependencies needed — works in Vercel Edge/Node environments

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "Missing uid" });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return res.status(500).json({ error: "Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY" });
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: now,
      exp: now + 3600,
      uid
    };

    // Import RSA private key
    const pemBody = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");

    const derBuffer = Buffer.from(pemBody, "base64");

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      derBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Build JWT
    const b64u = (obj) => Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const headerB64  = b64u({ alg: "RS256", typ: "JWT" });
    const payloadB64 = b64u(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      Buffer.from(signingInput)
    );

    const sigB64 = Buffer.from(signature)
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const token = `${signingInput}.${sigB64}`;

    return res.status(200).json({ token });

  } catch (err) {
    console.error("Custom token error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
