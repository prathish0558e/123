const crypto = require("crypto");
const google = require("../../backend/lib/google");

const COOKIE_NAME = "tct_customer";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function sessionSecret() {
  return String(process.env.GOOGLE_SESSION_SECRET || process.env.GOOGLE_CLIENT_ID || "").trim();
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signature(value) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function sessionCookie(user) {
  const payload = encode({
    user,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
  return `${COOKIE_NAME}=${payload}.${signature(payload)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function requestCookie(req) {
  const cookies = String(req.headers.cookie || "").split(";").reduce((result, item) => {
    const separator = item.indexOf("=");
    if (separator === -1) return result;
    result[item.slice(0, separator).trim()] = decodeURIComponent(item.slice(separator + 1).trim());
    return result;
  }, {});
  const value = cookies[COOKIE_NAME] || "";
  const separator = value.lastIndexOf(".");
  if (!sessionSecret() || separator < 1) return null;

  const payload = value.slice(0, separator);
  const received = value.slice(separator + 1);
  const expected = signature(payload);
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = decode(payload);
    return session.expiresAt > Date.now() ? session.user : null;
  } catch {
    return null;
  }
}

function publicUser(profile) {
  return {
    id: `google-${profile.sub}`,
    name: profile.name,
    email: profile.email,
    phone: "",
    picture: profile.picture,
    provider: "google",
    addresses: [],
    created_at: "",
    last_login_at: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "");

  if (path === "config" && req.method === "GET") {
    return res.status(200).json({ ok: true, googleClientId: google.clientId() });
  }

  if (path === "session" && req.method === "GET") {
    const user = requestCookie(req);
    return res.status(200).json({ ok: Boolean(user), user });
  }

  if (path === "logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (path === "google" && req.method === "POST") {
    const verified = await google.verifyIdToken(req.body?.credential || req.body?.idToken);
    if (!verified.ok) {
      return res.status(verified.code).json({ ok: false, error: verified.error });
    }

    const user = publicUser(verified.profile);
    res.setHeader("Set-Cookie", sessionCookie(user));
    return res.status(200).json({ ok: true, user });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(404).json({ ok: false, error: "Customer endpoint not found." });
};
