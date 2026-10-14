/*
 * "Continue with Google" — server-side verification of a Google ID token.
 *
 * The browser gets an ID token from Google Identity Services; the server must
 * verify it before creating a session (never trust the client's word).
 *
 * We verify against Google's own tokeninfo endpoint, which checks the signature
 * on Google's side, then we enforce the two things that matter locally:
 *   - `aud` is OUR client id (a token minted for another app is rejected), and
 *   - the address is verified and the token is not expired.
 *
 * Configure with GOOGLE_CLIENT_ID (server) and VITE_GOOGLE_CLIENT_ID (browser).
 * Until it is set, sign-in with Google reports "not configured" instead of
 * silently failing.
 */

function clientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

function configured() {
  return Boolean(clientId());
}

async function verifyIdToken(idToken) {
  if (!configured()) {
    return {
      ok: false,
      code: 503,
      error:
        "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID to .env.",
    };
  }
  const token = String(idToken || "").trim();
  if (!token || token.length > 4096) {
    return { ok: false, code: 400, error: "Missing Google credential." };
  }

  let info;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" } }
    );
    info = await res.json();
    if (!res.ok) {
      return { ok: false, code: 401, error: "Google could not verify this sign-in." };
    }
  } catch {
    return { ok: false, code: 502, error: "Could not reach Google to verify the sign-in." };
  }

  if (String(info.aud || "") !== clientId()) {
    return { ok: false, code: 401, error: "This Google token was issued for another app." };
  }
  if (String(info.email_verified) !== "true") {
    return { ok: false, code: 401, error: "Your Google email is not verified." };
  }
  const email = String(info.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: 401, error: "Google did not return a usable email address." };
  }

  return {
    ok: true,
    profile: {
      email,
      name: String(info.name || "").slice(0, 80),
      picture: String(info.picture || "").slice(0, 400),
      sub: String(info.sub || "").slice(0, 60),
    },
  };
}

module.exports = { verifyIdToken, configured, clientId };
