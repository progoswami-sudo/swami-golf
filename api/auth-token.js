import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "Missing uid" });
  }

  try {
    const customToken = await getAuth().createCustomToken(uid);
    return res.status(200).json({ token: customToken });
  } catch (err) {
    console.error("Custom token error:", err);
    return res.status(500).json({ error: err.message });
  }
}
