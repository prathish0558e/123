// Catalog store for TCT Fashion Hub — dresses (the boutique) and the craft
// classes that used to live in backend/data/pricing.js.
//
// Everything the public site shows comes from ONE file, backend/data/catalog.json,
// which the admin panel edits at runtime. backend/data/dresses.js and
// backend/data/pricing.js are only the first-boot seed, so a fresh clone still
// renders a complete shop without any manual setup.
//
// Every mutation bumps `updatedAt`, which is what the public pages poll
// (/api/catalog/version) to refresh themselves within seconds of a change —
// no rebuild, no server restart.

const fs = require("fs");
const path = require("path");
const seedDresses = require("../data/dresses");
const seedPricing = require("../data/pricing");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "catalog.json");

const DRESS_CATEGORIES = [
  "Kurti & Tops",
  "Saree",
  "Lehenga",
  "Blouse",
  "Gown",
  "Kids Wear",
  "Dupatta",
  "Jewellery",
  "Other",
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function sanitizeText(value, max = 600) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function toNumber(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function toPrice(value) {
  const n = Math.round(toNumber(value, 0));
  return n > 0 ? n : 0;
}

function toStringArray(value, max = 20, itemMax = 60) {
  const arr = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[,\n]/);
  return arr
    .map((v) => sanitizeText(v, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

function slugify(value, fallback = "item") {
  const base = sanitizeText(value, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

function safeImage(value) {
  const raw = String(value ?? "").trim().slice(0, 400);
  if (!raw) return "";
  // Allow site-relative paths and http(s) URLs only — never javascript:/data
  // payloads smuggled into an <img src>.
  if (/^\/[^/]/.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

// ---------------------------------------------------------------------------
// store read / write
// ---------------------------------------------------------------------------
function buildSeed() {
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedAt: now,
    dresses: seedDresses.map((d, i) => normalizeDress(d, i, now)),
    singleClasses: seedPricing.singleClasses.map((c) => normalizeClass("single", c)),
    comboClasses: seedPricing.comboClasses.map((c) => normalizeClass("combo", c)),
  };
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(buildSeed(), null, 2), "utf8");
  }
}

function readCatalog() {
  ensureStore();
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    return {
      version: Number(raw.version) || 1,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      dresses: Array.isArray(raw.dresses) ? raw.dresses : [],
      singleClasses: Array.isArray(raw.singleClasses) ? raw.singleClasses : [],
      comboClasses: Array.isArray(raw.comboClasses) ? raw.comboClasses : [],
    };
  } catch {
    // A corrupted store must never take the shop down — fall back to the seed
    // and rewrite the file so the admin panel stays usable.
    const seed = buildSeed();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

function writeCatalog(catalog) {
  const next = {
    ...catalog,
    version: (Number(catalog.version) || 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

/** Cheap change token the public pages poll to know when to re-fetch. */
function getStoreVersion() {
  const c = readCatalog();
  return { version: c.version, updatedAt: c.updatedAt };
}

// ---------------------------------------------------------------------------
// normalisation (used for seeds AND for every admin save)
// ---------------------------------------------------------------------------
function normalizeDress(input = {}, index = 0, now = new Date().toISOString()) {
  const name = sanitizeText(input.name, 120) || "Untitled outfit";
  const category = DRESS_CATEGORIES.includes(sanitizeText(input.category, 40))
    ? sanitizeText(input.category, 40)
    : "Other";
  const startingPrice = toPrice(input.startingPrice ?? input.price);
  const priceMax = Math.max(startingPrice, toPrice(input.priceMax ?? input.total));
  const mrp = toPrice(input.mrp);
  const gallery = toStringArray(input.gallery, 8, 400)
    .map(safeImage)
    .filter(Boolean);

  return {
    id: sanitizeText(input.id, 60) || slugify(name, `dress-${index + 1}`),
    name,
    category,
    startingPrice,
    priceMax,
    mrp,
    image: safeImage(input.image) || gallery[0] || "/images/placeholder.svg",
    gallery,
    sizes: toStringArray(input.sizes, 12, 20),
    colors: toStringArray(input.colors, 12, 40),
    fabric: sanitizeText(input.fabric, 120),
    badge: sanitizeText(input.badge, 24),
    description: sanitizeText(input.description, 1200),
    featured: Boolean(input.featured),
    inStock: input.inStock === undefined ? true : Boolean(input.inStock),
    visible: input.visible === undefined ? true : Boolean(input.visible),
    sortOrder: Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : index,
    created_at: input.created_at || now,
    updated_at: now,
  };
}

function normalizeClass(kind, input = {}, now = new Date().toISOString()) {
  const name = sanitizeText(input.name, 120) || "Untitled class";
  const base = {
    id: sanitizeText(input.id, 60) || slugify(name, `class-${Date.now()}`),
    name,
    image: safeImage(input.image) || "/images/placeholder.svg",
    duration: sanitizeText(input.duration, 40) || "1 Month",
    level: sanitizeText(input.level, 40) || "All levels",
    gift: sanitizeText(input.gift, 200),
    updated_at: now,
    created_at: input.created_at || now,
  };
  if (kind === "combo") {
    return {
      ...base,
      badge: sanitizeText(input.badge, 24),
      featured: Boolean(input.featured),
      items: toStringArray(input.items, 12, 80),
      total: toPrice(input.total),
      visible: input.visible === undefined ? true : Boolean(input.visible),
    };
  }
  return {
    ...base,
    price: toPrice(input.price),
    visible: input.visible === undefined ? true : Boolean(input.visible),
  };
}

// ---------------------------------------------------------------------------
// dresses
// ---------------------------------------------------------------------------
function listDresses({ includeHidden = false } = {}) {
  return readCatalog()
    .dresses.filter((d) => includeHidden || d.visible !== false)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        String(a.name).localeCompare(String(b.name))
    );
}

function getDress(id) {
  return readCatalog().dresses.find((d) => d.id === id) || null;
}

function saveDress(payload = {}, id = null) {
  const catalog = readCatalog();
  const isUpdate = Boolean(id);
  const existing = isUpdate ? catalog.dresses.find((d) => d.id === id) : null;
  if (isUpdate && !existing) return null;

  const record = normalizeDress(
    { ...(existing || {}), ...payload, id: isUpdate ? id : payload.id },
    isUpdate ? catalog.dresses.indexOf(existing) : catalog.dresses.length
  );
  if (!isUpdate && catalog.dresses.some((d) => d.id === record.id)) {
    record.id = `${record.id}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const dresses = isUpdate
    ? catalog.dresses.map((d) => (d.id === id ? record : d))
    : [...catalog.dresses, record];
  const next = writeCatalog({ ...catalog, dresses });
  return { dress: record, version: next.version, updatedAt: next.updatedAt };
}

function deleteDress(id) {
  const catalog = readCatalog();
  const dresses = catalog.dresses.filter((d) => d.id !== id);
  if (dresses.length === catalog.dresses.length) return null;
  const next = writeCatalog({ ...catalog, dresses });
  return { id, version: next.version, updatedAt: next.updatedAt };
}

function reorderDresses(ids = []) {
  const catalog = readCatalog();
  const order = ids.map((v) => sanitizeText(v, 60));
  const dresses = catalog.dresses
    .map((d) => {
      const idx = order.indexOf(d.id);
      return idx === -1 ? d : { ...d, sortOrder: idx };
    })
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        String(a.name).localeCompare(String(b.name))
    )
    .map((d, i) => ({ ...d, sortOrder: i }));
  const next = writeCatalog({ ...catalog, dresses });
  return { dresses, version: next.version, updatedAt: next.updatedAt };
}

// ---------------------------------------------------------------------------
// classes (single + combo)
// ---------------------------------------------------------------------------
function listClasses() {
  const c = readCatalog();
  return {
    singleClasses: c.singleClasses.filter((x) => x.visible !== false),
    comboClasses: c.comboClasses.filter((x) => x.visible !== false),
    allSingleClasses: c.singleClasses,
    allComboClasses: c.comboClasses,
  };
}

function saveClass(kind, payload = {}, id = null) {
  const isCombo = kind === "combo";
  const key = isCombo ? "comboClasses" : "singleClasses";
  const catalog = readCatalog();
  const list = catalog[key];
  const existing = id ? list.find((c) => c.id === id) : null;
  if (id && !existing) return null;

  const record = normalizeClass(kind, {
    ...(existing || {}),
    ...payload,
    id: id || payload.id,
  });
  if (!id && list.some((c) => c.id === record.id)) {
    record.id = `${record.id}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const nextList = id
    ? list.map((c) => (c.id === id ? record : c))
    : [...list, record];
  const next = writeCatalog({ ...catalog, [key]: nextList });
  return { item: record, version: next.version, updatedAt: next.updatedAt };
}

function deleteClass(kind, id) {
  const key = kind === "combo" ? "comboClasses" : "singleClasses";
  const catalog = readCatalog();
  const list = catalog[key].filter((c) => c.id !== id);
  if (list.length === catalog[key].length) return null;
  const next = writeCatalog({ ...catalog, [key]: list });
  return { id, version: next.version, updatedAt: next.updatedAt };
}

// ---------------------------------------------------------------------------
// reset (admin: "restore starter catalogue")
// ---------------------------------------------------------------------------
function resetCatalog() {
  const seed = buildSeed();
  fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
  return getStoreVersion();
}

module.exports = {
  DRESS_CATEGORIES,
  STORE_PATH,
  getCatalog: readCatalog,
  getStoreVersion,
  resetCatalog,
  listDresses,
  getDress,
  saveDress,
  deleteDress,
  reorderDresses,
  listClasses,
  saveClass,
  deleteClass,
  normalizeDress,
  normalizeClass,
  slugify,
  sanitizeText,
  safeImage,
  toPrice,
  toStringArray,
};
