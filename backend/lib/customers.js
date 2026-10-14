/*
 * Customer accounts, saved addresses and boutique orders.
 *
 * Storage: two JSON files under backend/data (customers.json, orders.json).
 * Every read/write goes through the small helpers below, so swapping the file
 * store for MongoDB later means rewriting only this module — nothing else in
 * the server touches the data directly.
 *
 * Security notes:
 *   - passwords are scrypt hashes with a per-account random salt (see ./auth),
 *     never plain text;
 *   - the session cookie is HttpOnly + SameSite=Lax and the token is random;
 *   - mutations require the `x-tct-customer: 1` header (same-origin guard);
 *   - a customer can only ever read back their OWN orders.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { hashPassword, verifyPassword } = require("./auth");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_PATH = path.join(DATA_DIR, "customers.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");
const COOKIE_NAME = "tct_customer";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* Returns are a one-day promise: size trouble or a damaged piece only. */
const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;
const RETURN_REASONS = {
  size_issue: "Size / fitting issue",
  damaged: "Received damaged or defective",
};

/* Order journey, in the order the customer sees it. */
const ORDER_STATUSES = [
  { id: "placed", label: "Order placed", note: "We received your order." },
  { id: "confirmed", label: "Confirmed", note: "Studio confirmed the fabric and measurements." },
  { id: "packed", label: "Packed", note: "Your outfit is stitched, checked and packed." },
  { id: "shipped", label: "Shipped", note: "Handed to our delivery partner." },
  { id: "out_for_delivery", label: "Out for delivery", note: "Arriving today." },
  { id: "delivered", label: "Delivered", note: "Delivered — enjoy your outfit!" },
];
const STATUS_IDS = ORDER_STATUSES.map((s) => s.id);
const RETURN_END_STATUSES = ["return_requested", "returned"];

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

function clean(value, max = 120) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/* ------------------------------------------------------------------ users */
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
    picture: user.picture || "",
    provider: user.google_id ? "google" : "password",
    addresses: Array.isArray(user.addresses) ? user.addresses : [],
    created_at: user.created_at,
    last_login_at: user.last_login_at || "",
  };
}

function validateRegistration(input) {
  const name = clean(input?.name, 80);
  const email = normalizeEmail(input?.email);
  const phone = clean(input?.phone, 20);
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
    phone: input.phone || "",
    picture: "",
    google_id: "",
    addresses: [],
    ...hashPassword(input.password || crypto.randomBytes(18).toString("hex")),
    created_at: new Date().toISOString(),
    last_login_at: "",
  };
  writeUsers([...readUsers(), user]);
  return user;
}

/**
 * Sign-in with Google.
 * The caller has ALREADY verified the Google ID token; here we only
 * create-or-link the local account. An existing password account with the
 * same email is linked (Google proves the address), never duplicated.
 */
function upsertGoogleUser({ email, name, picture, sub }) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalized);
  if (index === -1) {
    const user = {
      id: `c-${crypto.randomBytes(8).toString("hex")}`,
      name: clean(name, 80) || normalized.split("@")[0],
      email: normalized,
      phone: "",
      picture: String(picture || "").slice(0, 400),
      google_id: clean(sub, 60),
      addresses: [],
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    };
    writeUsers([...users, user]);
    return user;
  }
  users[index] = {
    ...users[index],
    google_id: users[index].google_id || clean(sub, 60),
    picture: users[index].picture || String(picture || "").slice(0, 400),
    name: users[index].name || clean(name, 80),
    last_login_at: new Date().toISOString(),
  };
  writeUsers(users);
  return users[index];
}

function touchLastLogin(email) {
  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalizeEmail(email));
  if (index === -1) return null;
  users[index] = { ...users[index], last_login_at: new Date().toISOString() };
  writeUsers(users);
  return users[index];
}

function updateUser(email, patch) {
  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalizeEmail(email));
  if (index === -1) return null;
  users[index] = { ...users[index], ...patch };
  writeUsers(users);
  return users[index];
}

/* --------------------------------------------------------------- sessions */
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

/* -------------------------------------------------------------- addresses */
function validateAddress(input = {}) {
  const address = {
    name: clean(input.name, 80),
    phone: clean(input.phone, 20),
    pincode: clean(input.pincode, 10),
    line1: clean(input.line1, 180),
    line2: clean(input.line2, 180),
    city: clean(input.city, 60),
    state: clean(input.state, 60),
    landmark: clean(input.landmark, 80),
    type: ["home", "work", "other"].includes(String(input.type)) ? String(input.type) : "home",
  };
  const errors = {};
  if (address.name.length < 2) errors.name = "Enter the receiver's name.";
  if (!/^[0-9+\-\s()]{10,15}$/.test(address.phone)) errors.phone = "Enter a 10-digit phone number.";
  if (!/^[1-9][0-9]{5}$/.test(address.pincode)) errors.pincode = "Enter a valid 6-digit pincode.";
  if (address.line1.length < 5) errors.line1 = "Enter the flat, house or street address.";
  if (!address.city) errors.city = "Enter your city or town.";
  if (!address.state) errors.state = "Enter your state.";
  return { ok: Object.keys(errors).length === 0, errors, data: address };
}

function addAddress(user, address) {
  const record = {
    id: `ad-${crypto.randomBytes(4).toString("hex")}`,
    ...address,
    created_at: new Date().toISOString(),
  };
  const addresses = [record, ...(Array.isArray(user.addresses) ? user.addresses : [])].slice(0, 10);
  updateUser(user.email, { addresses });
  return { record, addresses };
}

function removeAddress(user, id) {
  const addresses = (Array.isArray(user.addresses) ? user.addresses : []).filter(
    (a) => a.id !== id
  );
  updateUser(user.email, { addresses });
  return addresses;
}

/* ------------------------------------------------------------------ orders */
function readOrders() {
  const raw = readJson(ORDERS_PATH, { orders: [] });
  return Array.isArray(raw.orders) ? raw.orders : [];
}

function writeOrders(orders) {
  writeJson(ORDERS_PATH, { orders });
}

function newOrderId() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

/**
 * Public shape of an order. Everything the tracking UI needs, and nothing
 * about other customers.
 */
function publicOrder(order) {
  if (!order) return null;
  const windowEnds =
    order.return_window_ends_at ||
    new Date(new Date(order.created_at).getTime() + RETURN_WINDOW_MS).toISOString();
  return {
    id: order.id,
    items: order.items || [],
    subtotal: order.subtotal ?? order.total,
    shipping: order.shipping ?? 0,
    total: order.total,
    payment: order.payment || { method: "cod", label: "Cash on Delivery", status: "pending" },
    address: order.address || null,
    status: order.status,
    status_label:
      (ORDER_STATUSES.find((s) => s.id === order.status) || {}).label ||
      (order.return ? "Return requested" : "Order placed"),
    timeline: order.timeline || [],
    return: order.return || null,
    return_window_ends_at: windowEnds,
    return_window_open:
      !order.return && Date.now() < new Date(windowEnds).getTime(),
    return_reasons: RETURN_REASONS,
    delivered_at: order.delivered_at || "",
    created_at: order.created_at,
  };
}

function createOrder(user, items, totals, { address, payment } = {}) {
  const now = new Date();
  const order = {
    id: newOrderId(),
    customer_id: user.id,
    customer_name: user.name,
    customer_email: user.email,
    customer_phone: address?.phone || user.phone || "",
    items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    payment: {
      method: "cod",
      label: "Cash on Delivery",
      status: "pending",
    },
    address,
    status: "placed",
    timeline: [
      { status: "placed", label: "Order placed", at: now.toISOString(), note: "We received your order." },
    ],
    return: null,
    return_window_ends_at: new Date(now.getTime() + RETURN_WINDOW_MS).toISOString(),
    delivered_at: "",
    created_at: now.toISOString(),
  };
  writeOrders([...readOrders(), order]);
  return publicOrder(order);
}

function listOrdersFor(userId) {
  return readOrders()
    .filter((order) => order.customer_id === userId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(publicOrder);
}

function getOrderFor(userId, id) {
  const order = readOrders().find((o) => o.id === id && o.customer_id === userId);
  return publicOrder(order);
}

/** Admin: move an order along the journey (also records the timeline). */
function setOrderStatus(id, status) {
  if (!STATUS_IDS.includes(status)) return null;
  const orders = readOrders();
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return null;
  const step = ORDER_STATUSES.find((s) => s.id === status);
  const already = (orders[index].timeline || []).some((t) => t.status === status);
  orders[index] = {
    ...orders[index],
    status,
    delivered_at: status === "delivered" ? new Date().toISOString() : orders[index].delivered_at,
    timeline: already
      ? orders[index].timeline
      : [...(orders[index].timeline || []), { status, label: step.label, at: new Date().toISOString(), note: step.note }],
  };
  writeOrders(orders);
  return publicOrder(orders[index]);
}

/**
 * Return request — allowed for ONE day after the order is placed, and only
 * for a size/fitting problem or a damaged piece. Both rules are enforced here
 * (the UI hides the button, but the server must not trust the UI).
 */
function requestReturn(userId, orderId, { reason, note } = {}) {
  const orders = readOrders();
  const index = orders.findIndex((o) => o.id === orderId && o.customer_id === userId);
  if (index === -1) return { ok: false, code: 404, error: "Order not found." };
  const order = orders[index];

  if (order.return) return { ok: false, code: 409, error: "A return is already requested for this order." };

  const endsAt = new Date(
    order.return_window_ends_at ||
      new Date(order.created_at).getTime() + RETURN_WINDOW_MS
  ).getTime();
  if (Date.now() > endsAt) {
    return {
      ok: false,
      code: 410,
      error: "The 1-day return window for this order has closed.",
    };
  }
  if (!RETURN_REASONS[reason]) {
    return {
      ok: false,
      code: 400,
      error: "Returns are accepted only for a size/fitting issue or a damaged item.",
    };
  }

  orders[index] = {
    ...order,
    return: {
      reason,
      label: RETURN_REASONS[reason],
      note: clean(note, 400),
      status: "requested",
      requested_at: new Date().toISOString(),
    },
    timeline: [
      ...(order.timeline || []),
      {
        status: "return_requested",
        label: "Return requested",
        at: new Date().toISOString(),
        note: RETURN_REASONS[reason],
      },
    ],
  };
  writeOrders(orders);
  return { ok: true, order: publicOrder(orders[index]) };
}

/** Admin: approve or reject a pending return. */
function resolveReturn(orderId, decision) {
  const orders = readOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1 || !orders[index].return) return null;
  const approved = decision === "approved";
  orders[index] = {
    ...orders[index],
    return: {
      ...orders[index].return,
      status: approved ? "approved" : "rejected",
      resolved_at: new Date().toISOString(),
    },
    status: approved ? "returned" : orders[index].status,
    timeline: [
      ...(orders[index].timeline || []),
      {
        status: approved ? "returned" : "return_rejected",
        label: approved ? "Return approved" : "Return declined",
        at: new Date().toISOString(),
        note: approved
          ? "Pickup scheduled — refund or exchange arranged."
          : "Please contact the studio for details.",
      },
    ],
  };
  writeOrders(orders);
  return publicOrder(orders[index]);
}

module.exports = {
  COOKIE_NAME,
  RETURN_WINDOW_MS,
  RETURN_REASONS,
  ORDER_STATUSES,
  STATUS_IDS,
  RETURN_END_STATUSES,
  validateRegistration,
  validateAddress,
  findUser,
  createUser,
  upsertGoogleUser,
  touchLastLogin,
  updateUser,
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
  addAddress,
  removeAddress,
  createOrder,
  listOrdersFor,
  getOrderFor,
  setOrderStatus,
  requestReturn,
  resolveReturn,
  publicOrder,
};
