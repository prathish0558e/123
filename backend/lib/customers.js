const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { hashPassword, verifyPassword } = require("./auth");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_PATH = path.join(DATA_DIR, "customers.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");
const COOKIE_NAME = "tct_customer";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const attempts = new Map();

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

function readUsers() {
  const raw = readJson(USERS_PATH, { users: [] });
  return Array.isArray(raw.users) ? raw.users : [];
}

function writeUsers(users) {
  writeJson(USERS_PATH, { users });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function findUser(email) {
  const normalized = normalizeEmail(email);
  return readUsers().find((user) => user.email === normalized) || null;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    created_at: user.created_at,
    last_login_at: user.last_login_at || "",
  };
}

function validateRegistration(input) {
  const name = String(input?.name || "").trim();
  const email = normalizeEmail(input?.email);
  const phone = String(input?.phone || "").trim();
  const password = String(input?.password || "");
  const errors = {};
  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email.";
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) errors.phone = "Enter a valid phone number.";
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Password must be 8+ characters with letters and numbers.";
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { name, email, phone, password },
  };
}

function createUser(input) {
  const user = {
    id: `c-${crypto.randomBytes(8).toString("hex")}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    ...hashPassword(input.password),
    created_at: new Date().toISOString(),
    last_login_at: "",
  };
  writeUsers([...readUsers(), user]);
  return user;
}

function touchLastLogin(email) {
  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalizeEmail(email));
  if (index === -1) return null;
  users[index] = { ...users[index], last_login_at: new Date().toISOString() };
  writeUsers(users);
  return users[index];
}

function attemptKey(req, email) {
  return `${req.ip || "unknown"}|${normalizeEmail(email)}`;
}

function loginAllowed(req, email) {
  const key = attemptKey(req, email);
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  attempts.set(key, list);
  return { ok: list.length < 5, retryIn: list.length ? 15 * 60 * 1000 - (now - list[0]) : 0 };
}

function noteLoginFailure(req, email) {
  const key = attemptKey(req, email);
  attempts.set(key, [...(attempts.get(key) || []), Date.now()]);
}

function clearLoginFailures(req, email) {
  attempts.delete(attemptKey(req, email));
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { email: user.email, expires_at: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session || session.expires_at <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function parseCookies(header) {
  return String(header || "").split(";").reduce((out, pair) => {
    const index = pair.indexOf("=");
    if (index === -1) return out;
    out[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
    return out;
  }, {});
}

function tokenFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[COOKIE_NAME] || "";
}

function cookieHeader(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000
  )}`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function attachCustomer(req, _res, next) {
  const session = getSession(tokenFromRequest(req));
  if (session) req.customer = findUser(session.email);
  next();
}

function requireCustomer(req, res, next) {
  if (!req.customer) return res.status(401).json({ ok: false, error: "Login required." });
  next();
}

function requireSameSiteHeader(req, res, next) {
  if (req.get("x-tct-customer") !== "1") {
    return res.status(403).json({ ok: false, error: "Blocked: missing same-origin customer header." });
  }
  next();
}

function readOrders() {
  const raw = readJson(ORDERS_PATH, { orders: [] });
  return Array.isArray(raw.orders) ? raw.orders : [];
}

function createOrder(user, items, total) {
  const order = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    customer_id: user.id,
    customer_name: user.name,
    customer_email: user.email,
    items,
    total,
    status: "pending_payment",
    created_at: new Date().toISOString(),
  };
  writeJson(ORDERS_PATH, { orders: [...readOrders(), order] });
  return order;
}

module.exports = {
  COOKIE_NAME,
  validateRegistration,
  findUser,
  createUser,
  touchLastLogin,
  publicUser,
  verifyPassword,
  loginAllowed,
  noteLoginFailure,
  clearLoginFailures,
  createSession,
  getSession,
  destroySession,
  tokenFromRequest,
  cookieHeader,
  clearCookieHeader,
  attachCustomer,
  requireCustomer,
  requireSameSiteHeader,
  readUsers,
  readOrders,
  createOrder,
};
