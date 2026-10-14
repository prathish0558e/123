// Admin authentication for TCT Fashion Hub.
//
// Passwords are NEVER stored in plain text: every admin record keeps a random
// 16-byte salt + a scrypt-derived key (Node's built-in scrypt, no dependency).
// Login verification re-derives the key from the submitted password with the
// SAME salt and compares with crypto.timingSafeEqual (constant time).
//
// Sessions are opaque 32-byte random tokens kept server-side (persisted to
// backend/data/sessions.json so a dev-server restart does not log you out) and
// handed to the browser as an HttpOnly + SameSite=Lax cookie.
//
// Nothing here is exported to the client — /api/admin/* never returns a hash,
// a salt or a token in a JSON body (the token only travels in the cookie).

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_PATH = path.join(DATA_DIR, "admins.json");
const SESSIONS_PATH = path.join(DATA_DIR, "sessions.json");

const COOKIE_NAME = "tct_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// Default seeded credentials. Used only on the very first boot (no admin store
// yet). The panel keeps warning until the password is changed, and ADMIN_USER /
// ADMIN_PASSWORD in .env override these defaults.
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "Tct@Admin2026";

// ---------------------------------------------------------------------------
// tiny fs helpers
// ---------------------------------------------------------------------------
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// password hashing (scrypt + per-user salt)
// ---------------------------------------------------------------------------
function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(String(password), useSalt, SCRYPT.keylen, {
      N: SCRYPT.N,
      r: SCRYPT.r,
      p: SCRYPT.p,
    })
    .toString("hex");
  return {
    salt: useSalt,
    hash,
    algo: "scrypt",
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    keylen: SCRYPT.keylen,
    updated_at: new Date().toISOString(),
  };
}

function verifyPassword(password, user) {
  if (!password || !user || !user.salt || !user.hash) return false;
  const derived = crypto
    .scryptSync(String(password), user.salt, user.keylen || SCRYPT.keylen, {
      N: user.N || SCRYPT.N,
      r: user.r || SCRYPT.r,
      p: user.p || SCRYPT.p,
    })
    .toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(user.hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// user store
// ---------------------------------------------------------------------------
function readUsers() {
  const raw = readJson(USERS_PATH, { users: [] });
  return Array.isArray(raw.users) ? raw.users : [];
}

function writeUsers(users) {
  writeJson(USERS_PATH, { users });
}

function findUser(username) {
  const uname = String(username || "").trim().toLowerCase();
  return readUsers().find((u) => u.username.toLowerCase() === uname);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role || "owner",
    is_default_password: Boolean(user.is_default_password),
    last_login_at: user.last_login_at || "",
    created_at: user.created_at || "",
    updated_at: user.updated_at || "",
  };
}

/** Create the first admin on boot. Returns info when it seeded a new account. */
function ensureDefaultAdmin() {
  const users = readUsers();
  if (users.length) return null;
  const now = new Date().toISOString();
  const record = {
    id: "u-" + crypto.randomBytes(4).toString("hex"),
    username: DEFAULT_USERNAME,
    ...hashPassword(DEFAULT_PASSWORD),
    role: "owner",
    is_default_password: true,
    last_login_at: "",
    created_at: now,
  };
  writeUsers([record]);
  return { username: record.username, password: DEFAULT_PASSWORD };
}

/** Remember when an admin last signed in (shown in the panel footer). */
function touchLastLogin(username) {
  const users = readUsers();
  const idx = users.findIndex(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
  if (idx === -1) return null;
  users[idx] = { ...users[idx], last_login_at: new Date().toISOString() };
  writeUsers(users);
  return users[idx];
}

/** Change a password (also used for the "change my password" admin action). */
function setPassword(username, newPassword) {
  const users = readUsers();
  const idx = users.findIndex(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
  if (idx === -1) return null;
  users[idx] = {
    ...users[idx],
    ...hashPassword(newPassword),
    is_default_password: false,
  };
  writeUsers(users);
  // any other session for that user is no longer trustworthy
  destroyUserSessions(users[idx].username);
  return publicUser(users[idx]);
}

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
function readSessions() {
  const raw = readJson(SESSIONS_PATH, { sessions: [] });
  return Array.isArray(raw.sessions) ? raw.sessions : [];
}

function writeSessions(sessions) {
  writeJson(SESSIONS_PATH, { sessions });
}

function prune(sessions) {
  const now = Date.now();
  return sessions.filter((s) => s && s.expires_at > now);
}

function createSession(user, meta = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const sessions = prune(readSessions());
  sessions.push({
    token,
    username: user.username,
    created_at: now,
    expires_at: now + SESSION_TTL_MS,
    ip: meta.ip || "",
    user_agent: String(meta.userAgent || "").slice(0, 180),
  });
  // keep the store small: newest 50 sessions only
  writeSessions(sessions.slice(-50));
  return token;
}

function getSession(token) {
  if (!token) return null;
  const sessions = prune(readSessions());
  const found = sessions.find((s) => s.token === token);
  return found || null;
}

function destroySession(token) {
  if (!token) return;
  const sessions = readSessions().filter((s) => s.token !== token);
  writeSessions(sessions);
}

function destroyUserSessions(username) {
  const sessions = readSessions().filter(
    (s) => s.username.toLowerCase() !== String(username).toLowerCase()
  );
  writeSessions(sessions);
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
  secure: false, // set true behind HTTPS in production
};

function cookieHeader(token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${COOKIE_OPTS.maxAge}`,
  ];
  if (COOKIE_OPTS.secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  String(header || "")
    .split(";")
    .forEach((pair) => {
      const i = pair.indexOf("=");
      if (i === -1) return;
      const k = pair.slice(0, i).trim();
      if (k) out[k] = decodeURIComponent(pair.slice(i + 1).trim());
    });
  return out;
}

function tokenFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const auth = String(req.headers?.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

// ---------------------------------------------------------------------------
// login throttling (per IP + username, in memory)
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function attemptKey(req, username) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `${ip}|${String(username || "").toLowerCase()}`;
}

function loginAllowed(req, username) {
  const key = attemptKey(req, username);
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, list);
  if (attempts.size > 1000) attempts.clear();
  return { ok: list.length < MAX_ATTEMPTS, retryIn: list.length ? WINDOW_MS - (now - list[0]) : 0 };
}

function noteLoginFailure(req, username) {
  const key = attemptKey(req, username);
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  attempts.set(key, list);
}

function clearLoginFailures(req, username) {
  attempts.delete(attemptKey(req, username));
}

// ---------------------------------------------------------------------------
// express middleware
// ---------------------------------------------------------------------------
/** Attach req.admin when a valid session cookie/bearer token is present. */
function attachAdmin(req, _res, next) {
  const session = getSession(tokenFromRequest(req));
  if (session) req.admin = { username: session.username };
  next();
}

/** 401 unless the request carries a valid admin session. */
function requireAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({ ok: false, error: "Sign in required." });
  }
  next();
}

/**
 * CSRF guard for state-changing admin calls: browsers send the HttpOnly
 * session cookie automatically, so mutations additionally require the custom
 * header the admin SPA always sets. Cross-site forms cannot set it.
 */
function requireSameSiteHeader(req, res, next) {
  if (req.get("x-tct-admin") !== "1") {
    return res
      .status(403)
      .json({ ok: false, error: "Blocked: missing same-origin admin header." });
  }
  next();
}

module.exports = {
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD,
  hashPassword,
  verifyPassword,
  ensureDefaultAdmin,
  findUser,
  publicUser,
  touchLastLogin,
  setPassword,
  createSession,
  getSession,
  destroySession,
  destroyUserSessions,
  cookieHeader,
  clearCookieHeader,
  tokenFromRequest,
  loginAllowed,
  noteLoginFailure,
  clearLoginFailures,
  attachAdmin,
  requireAdmin,
  requireSameSiteHeader,
  COOKIE_NAME,
};
