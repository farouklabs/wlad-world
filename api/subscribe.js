const RESEND_CONTACTS_URL = "https://api.resend.com/contacts";

function sendJson(res, status, body) {
  res
    .status(status)
    .setHeader("Content-Type", "application/json; charset=utf-8");

  return res.end(JSON.stringify(body));
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  }

  // Read the secret securely from Vercel
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");

    return sendJson(res, 500, {
      error: "Signup is temporarily unavailable.",
    });
  }

  // Read request body
  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJson(res, 400, {
        error: "Invalid request.",
      });
    }
  }

  // Clean up email
  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  // Validate email
  if (!validEmail(email)) {
    return sendJson(res, 400, {
      error: "Enter a valid email address.",
    });
  }

  try {
    // Add the visitor to WLAD's Resend contacts
    const response = await fetch(RESEND_CONTACTS_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Keep Resend/API details private from visitors
      console.error(
        "Resend contact creation failed:",
        response.status,
        data
      );

      return sendJson(res, 502, {
        error: "Could not register email.",
      });
    }

    // Success
    return sendJson(res, 200, {
      ok: true,
    });
  } catch (error) {
    console.error("Resend request failed:", error);

    return sendJson(res, 502, {
      error: "Could not register email.",
    });
  }
}
