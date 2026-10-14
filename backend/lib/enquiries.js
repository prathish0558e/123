// Enquiry storage for TCT Fashion Hub.
// The project has no SQL database yet, so this is a clean JSON-file store with
// the exact schema requested — swapping it for SQLite/PostgreSQL later only
// means reimplementing saveEnquiry/updateEnquiry/listEnquiries/getEnquiry.
//
// Schema per enquiry:
//   id, name, phone, whatsapp_number, email, service, message,
//   status, whatsapp_studio_message_status, whatsapp_customer_message_status,
//   created_at, updated_at

const fs = require("fs");
const path = require("path");

const DATA_DIR = __dirname;
const DB_PATH = path.join(DATA_DIR, "enquiries.json");

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, "[]\n", "utf8");
  }
}

function readAll() {
  ensureDb();
  try {
    const arr = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Text sanitizing helpers. Control characters (code < 32, except newline for
// messages, plus DEL 127) are stripped so nobody can smuggle escape sequences
// into the JSON store or into WhatsApp message bodies.
// ---------------------------------------------------------------------------
function stripControl(text, keepNewline) {
  return String(text ?? "")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 10) return Boolean(keepNewline);
      return code >= 32 && code !== 127;
    })
    .join("");
}

function sanitizeText(v, max = 1200) {
  return stripControl(v, false).replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeMessage(v, max = 2000) {
  return stripControl(v, true)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

// Validators ----------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = "91" + digits; // default India
  return digits;
}

// Validate + sanitize an enquiry payload. Returns { ok, errors, data }.
function validateEnquiry(body) {
  const errors = {};
  const name = sanitizeText(body.name, 80);
  const phone = sanitizeText(body.phone, 20);
  const whatsapp = sanitizeText(body.whatsapp_number || body.whatsapp, 20);
  const email = sanitizeText(body.email, 120);
  const service = sanitizeText(body.interest || body.service, 100);
  const message = sanitizeMessage(body.message);

  if (!name || name.length < 2) errors.name = "Name is required.";
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm || phoneNorm.length < 12) {
    errors.phone = "A valid 10-digit phone number is required.";
  }
  const waNorm = whatsapp ? normalizePhone(whatsapp) : phoneNorm;
  if (waNorm && waNorm.length < 12) {
    errors.whatsapp_number = "WhatsApp number looks invalid.";
  }
  if (email && !EMAIL_RE.test(email)) errors.email = "Email looks invalid.";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      phone: phoneNorm,
      whatsapp_number: waNorm || phoneNorm,
      email: email || "",
      service: service || "Not specified",
      message: message || "",
    },
  };
}

// CRUD ----------------------------------------------------------------------
let nextId = null;

function saveEnquiry(data, meta = {}) {
  const list = readAll();
  if (nextId === null) {
    nextId = list.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1;
  }
  const now = new Date().toISOString();
  const enquiry = {
    id: nextId++,
    name: data.name,
    phone: data.phone,
    whatsapp_number: data.whatsapp_number,
    email: data.email,
    service: data.service,
    message: data.message,
    status: "new",
    whatsapp_studio_message_status: "not_sent",
    whatsapp_customer_message_status: "not_sent",
    studio_message_id: "",
    customer_message_id: "",
    source: meta.source || "website",
    ip: meta.ip || "",
    created_at: now,
    updated_at: now,
  };
  list.push(enquiry);
  writeAll(list);
  return enquiry;
}

function listEnquiries() {
  return readAll();
}

function getEnquiry(id) {
  return readAll().find((e) => Number(e.id) === Number(id));
}

function updateEnquiry(id, patch) {
  const list = readAll();
  const idx = list.findIndex((e) => Number(e.id) === Number(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch, updated_at: new Date().toISOString() };
  writeAll(list);
  return list[idx];
}

// Rate limiting: max N enquiries per IP per hour (simple in-memory window).
const hits = new Map();
function rateLimit(ip, max = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const rec = hits.get(ip) || [];
  const fresh = rec.filter((t) => now - t < windowMs);
  fresh.push(now);
  hits.set(ip, fresh);
  if (hits.size > 500) hits.clear(); // safety
  return fresh.length <= max;
}

module.exports = {
  validateEnquiry,
  normalizePhone,
  sanitizeText,
  sanitizeMessage,
  saveEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
  rateLimit,
};
