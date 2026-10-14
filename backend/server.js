// TCT Garment Fashion — Node/Express API (JavaScript backend)
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

require("./lib/env").loadEnv();
const {
  validateEnquiry,
  saveEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
  rateLimit,
} = require("./lib/enquiries");
const whatsapp = require("./services/whatsapp");
const auth = require("./lib/auth");
const catalog = require("./lib/catalog");
const customers = require("./lib/customers");

// Studio contact details stay hot-reloadable from backend/data/pricing.js,
// while the dresses + craft classes now come from the live catalog store
// (backend/data/catalog.json) that the admin panel edits at runtime.
const pricingPath = require.resolve("./data/pricing");
const studioInfo = () => {
  delete require.cache[pricingPath];
  return require("./data/pricing").studio;
};
const getPricing = () => {
  const classes = catalog.listClasses();
  return {
    studio: studioInfo(),
    singleClasses: classes.singleClasses,
    comboClasses: classes.comboClasses,
  };
};

// First boot seeds the default admin account (hashed + salted, never plain).
const seededAdmin = auth.ensureDefaultAdmin();

const app = express();
// Ignore a bogus inherited PORT (e.g. 0); default to 5000.
// This single JavaScript API is the ONLY backend — the Vite proxy targets it.
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5000;

app.use(cors());

// ---- Uploaded product photos (admin only) ---------------------------------
// Registered BEFORE the small global JSON parser: an image data URL needs a
// bigger body limit, and this route must not be reachable without a session.
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");
const UPLOAD_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

app.post(
  "/api/admin/uploads",
  auth.attachAdmin,
  auth.requireAdmin,
  auth.requireSameSiteHeader,
  express.json({ limit: "8mb" }),
  (req, res) => {
    const dataUrl = String(req.body?.dataUrl || "");
    const m = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!m) {
      return res
        .status(400)
        .json({ ok: false, error: "Send an image as a base64 data URL." });
    }
    const ext = UPLOAD_TYPES[m[1].toLowerCase()];
    if (!ext) {
      return res.status(415).json({
        ok: false,
        error: "Only PNG, JPEG or WebP images can be uploaded.",
      });
    }
    const buf = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
    if (!buf.length) return res.status(400).json({ ok: false, error: "Empty image." });
    if (buf.length > MAX_UPLOAD_BYTES) {
      return res
        .status(413)
        .json({ ok: false, error: "Image must be smaller than 3 MB." });
    }
    // The file name is generated server-side — no path from the client ever
    // touches the filesystem.
    const base = catalog.slugify(req.body?.name || "dress", "dress").slice(0, 40);
    const file = `${base}-${Date.now().toString(36)}.${ext}`;
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
    res.status(201).json({ ok: true, url: `/uploads/${file}`, bytes: buf.length });
  }
);

// Keep the raw body around for Meta webhook signature verification.
app.use(express.json({ limit: "200kb", verify: (_req, _res, buf) => { _req.rawBody = buf; } }));
// Resolve the admin session (if any) for every request.
app.use(auth.attachAdmin);
app.use(customers.attachCustomer);

// ---- API routes -----------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "tct-node-api" });
});

app.get("/api/studio", (_req, res) => {
  res.json(getPricing().studio);
});

// Single classes
app.get("/api/classes", (_req, res) => {
  res.json(getPricing().singleClasses);
});

app.get("/api/classes/:id", (req, res) => {
  const found = getPricing().singleClasses.find((c) => c.id === req.params.id);
  if (!found) return res.status(404).json({ error: "Class not found" });
  res.json(found);
});

// Combos
app.get("/api/combos", (_req, res) => {
  res.json(getPricing().comboClasses);
});

// Everything the pricing page needs, in one call
app.get("/api/pricing", (_req, res) => {
  const p = getPricing();
  res.json({
    studio: p.studio,
    singleClasses: p.singleClasses,
    comboClasses: p.comboClasses,
  });
});

// ---- Boutique collection (dresses) ----------------------------------------
// One cheap endpoint the public pages poll so an admin edit shows up on the
// live site within seconds — no rebuild, no restart.
app.get("/api/catalog/version", (_req, res) => res.json(catalog.getStoreVersion()));

app.get("/api/dresses", (_req, res) => {
  const { version, updatedAt } = catalog.getStoreVersion();
  const dresses = catalog.listDresses();
  const prices = dresses.map((d) => d.startingPrice).filter((n) => n > 0);
  res.json({
    version,
    updatedAt,
    categories: [...new Set(dresses.map((d) => d.category))],
    dresses,
    stats: {
      count: dresses.length,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    },
  });
});

app.get("/api/dresses/:id", (req, res) => {
  const found = catalog.getDress(req.params.id);
  if (!found || found.visible === false) {
    return res.status(404).json({ error: "Dress not found" });
  }
  res.json(found);
});

// ---- Customer accounts and orders ----------------------------------------
app.post("/api/customer/register", (req, res) => {
  const result = customers.validateRegistration(req.body || {});
  if (!result.ok) return res.status(400).json({ ok: false, error: "Validation failed.", errors: result.errors });
  if (customers.findUser(result.data.email)) {
    return res.status(409).json({ ok: false, error: "An account already exists for this email." });
  }
  const user = customers.createUser(result.data);
  const token = customers.createSession(user);
  res.setHeader("Set-Cookie", customers.cookieHeader(token));
  res.status(201).json({ ok: true, user: customers.publicUser(user) });
});

app.post("/api/customer/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const gate = customers.loginAllowed(req, email);
  if (!gate.ok) {
    return res.status(429).json({
      ok: false,
      error: `Too many login attempts. Try again in ${Math.max(1, Math.ceil(gate.retryIn / 60000))} minute(s).`,
    });
  }
  const user = customers.findUser(email);
  if (!user || !customers.verifyPassword(password, user)) {
    customers.noteLoginFailure(req, email);
    return res.status(401).json({ ok: false, error: "Invalid email or password." });
  }
  customers.clearLoginFailures(req, email);
  const fresh = customers.touchLastLogin(user.email) || user;
  const token = customers.createSession(fresh);
  res.setHeader("Set-Cookie", customers.cookieHeader(token));
  res.json({ ok: true, user: customers.publicUser(fresh) });
});

app.post("/api/customer/logout", customers.requireSameSiteHeader, (req, res) => {
  customers.destroySession(customers.tokenFromRequest(req));
  res.setHeader("Set-Cookie", customers.clearCookieHeader());
  res.json({ ok: true });
});

app.get("/api/customer/session", (req, res) => {
  res.json({ ok: Boolean(req.customer), user: customers.publicUser(req.customer) });
});

app.post(
  "/api/customer/orders",
  customers.requireCustomer,
  customers.requireSameSiteHeader,
  (req, res) => {
    const requested = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!requested.length || requested.length > 30) {
      return res.status(400).json({ ok: false, error: "Your cart is empty or too large." });
    }
    const pricing = catalog.listClasses();
    const products = [
      ...(pricing.singleClasses || []).map((item) => ({ ...item, productType: "class", price: Number(item.price) })),
      ...(pricing.comboClasses || []).map((item) => ({ ...item, productType: "combo", price: Number(item.total) })),
      ...catalog.listDresses().map((item) => ({ ...item, productType: "dress", price: Number(item.startingPrice) })),
    ];
    const items = [];
    for (const requestedItem of requested) {
      const product = products.find(
        (item) => item.productType === requestedItem.type && item.id === requestedItem.id
      );
      const quantity = Math.max(1, Math.min(10, Number(requestedItem.quantity) || 1));
      if (!product || product.price <= 0) {
        return res.status(400).json({ ok: false, error: "One or more cart items are no longer available." });
      }
      items.push({ type: product.productType, id: product.id, name: product.name, price: product.price, quantity });
    }
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = customers.createOrder(req.customer, items, total);
    res.status(201).json({ ok: true, order });
  }
);

// ---- Class enrolment enquiry (JSON-file store + WhatsApp automation) ------
app.post("/api/enquiries", (req, res) => {
  const ip = req.ip || "unknown";
  if (!rateLimit(ip)) {
    return res
      .status(429)
      .json({ ok: false, error: "Too many enquiries. Please try again later." });
  }

  const result = validateEnquiry(req.body || {});
  if (!result.ok) {
    return res
      .status(400)
      .json({ ok: false, error: "Validation failed", errors: result.errors });
  }

  const enquiry = saveEnquiry(result.data, { ip });

  // WhatsApp automation runs in the background: a studio alert to the company
  // number and an automatic thank-you to the customer. The form never waits
  // for (or fails because of) WhatsApp — a 201 goes out immediately.
  setImmediate(async () => {
    const studio = await whatsapp.sendEnquiryNotification(enquiry);
    const thanks = await whatsapp.sendCustomerThankYou(enquiry);
    const stateFor = (r) =>
      r.ok ? "sent" : r.skipped ? "not_sent" : "failed";
    updateEnquiry(enquiry.id, {
      whatsapp_studio_message_status: stateFor(studio),
      studio_message_id: studio.id || "",
      whatsapp_customer_message_status: stateFor(thanks),
      customer_message_id: thanks.id || "",
    });
    console.log(
      `[enquiry #${enquiry.id}] studio: ${stateFor(studio)}` +
        `${studio.error ? ` (${studio.error})` : ""} | customer: ${stateFor(thanks)}` +
        `${thanks.error ? ` (${thanks.error})` : ""}`
    );
  });

  res.status(201).json({
    ok: true,
    enquiry: {
      id: enquiry.id,
      name: enquiry.name,
      phone: enquiry.phone,
      whatsapp_number: enquiry.whatsapp_number,
      email: enquiry.email,
      service: enquiry.service,
      message: enquiry.message,
      status: enquiry.status,
      whatsapp_customer_message_status: enquiry.whatsapp_customer_message_status,
      created_at: enquiry.created_at,
    },
  });
});

// Enquiries contain customer names and phone numbers, so reading them back is
// admin-only. The public form only ever POSTs to /api/enquiries.
app.get("/api/enquiries", auth.requireAdmin, (_req, res) => res.json(listEnquiries()));

app.get("/api/enquiries/:id", auth.requireAdmin, (req, res) => {
  const found = getEnquiry(req.params.id);
  if (!found) return res.status(404).json({ error: "Enquiry not found" });
  res.json(found);
});

// ---- WhatsApp Cloud API webhook (official Meta Business Platform) ---------
// GET: one-time verification handshake with Meta (hub.mode / verify_token /
// hub.challenge).
app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === whatsapp.cfg().verifyToken) {
    console.log("[whatsapp] webhook verified by Meta");
    return res.status(200).send(challenge);
  }
  console.warn("[whatsapp] webhook verification rejected");
  return res.sendStatus(403);
});

// POST: incoming messages + delivery status events.
app.post("/api/whatsapp/webhook", (req, res) => {
  // Optional but recommended: verify X-Hub-Signature-256 with the Meta app
  // secret so nobody can fake webhook calls. Active only when
  // WHATSAPP_APP_SECRET is set in .env.
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret && req.rawBody) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
    const got = req.get("X-Hub-Signature-256") || "";
    const okSig =
      got.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
    if (!okSig) {
      console.warn("[whatsapp] webhook signature mismatch — rejected");
      return res.sendStatus(401);
    }
  }

  // ACK immediately — Meta retries slow webhooks.
  res.sendStatus(200);

  // Process safely in the background.
  try {
    const body = req.body || {};
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        // Delivery status events: sent / delivered / read / failed.
        for (const st of value.statuses || []) {
          patchEnquiryByMessageId(st.id, st.status);
        }

        // Incoming customer messages → auto-reply through the Cloud API.
        for (const msg of value.messages || []) {
          const contactName = value.contacts?.[0]?.profile?.name || "";
          const parsed = whatsapp.processIncomingMessage({
            ...msg,
            profile: { name: contactName },
          });
          console.log(
            `[whatsapp] in ← ${parsed.from}${parsed.name ? ` (${parsed.name})` : ""}: "${parsed.text}"`
          );
          setImmediate(() => whatsapp.sendTextMessage(parsed.from, parsed.reply));
        }
      }
    }
  } catch (e) {
    console.error("[whatsapp] webhook processing error:", e.message);
  }
});

// Map a Meta status event (sent/delivered/read/failed) back to its enquiry.
function patchEnquiryByMessageId(messageId, status) {
  if (!messageId || !status) return;
  for (const e of listEnquiries()) {
    if (e.studio_message_id === messageId) {
      updateEnquiry(e.id, { whatsapp_studio_message_status: status });
      return;
    }
    if (e.customer_message_id === messageId) {
      updateEnquiry(e.id, { whatsapp_customer_message_status: status });
      return;
    }
  }
}

// ===========================================================================
// Admin panel API
// ---------------------------------------------------------------------------
// Auth: signed-in state lives in an HttpOnly session cookie. Mutations must
// additionally carry the `x-tct-admin: 1` header (CSRF guard), and passwords
// are verified against scrypt hashes with per-user salts.
// ===========================================================================
const adminGuard = [auth.requireAdmin];
const adminWrite = [auth.requireAdmin, auth.requireSameSiteHeader];

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  const gate = auth.loginAllowed(req, username);
  if (!gate.ok) {
    return res.status(429).json({
      ok: false,
      error: `Too many login attempts. Try again in ${Math.max(
        1,
        Math.ceil(gate.retryIn / 60000)
      )} minute(s).`,
    });
  }

  const user = auth.findUser(username);
  if (!user || !auth.verifyPassword(password, user)) {
    auth.noteLoginFailure(req, username);
    return res
      .status(401)
      .json({ ok: false, error: "Invalid username or password." });
  }

  auth.clearLoginFailures(req, username);
  const token = auth.createSession(user, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  const fresh = auth.touchLastLogin(user.username) || user;
  res.setHeader("Set-Cookie", auth.cookieHeader(token));
  res.json({ ok: true, admin: auth.publicUser(fresh), expires_in: 8 * 60 * 60 });
});

app.post("/api/admin/logout", auth.requireSameSiteHeader, (req, res) => {
  auth.destroySession(auth.tokenFromRequest(req));
  res.setHeader("Set-Cookie", auth.clearCookieHeader());
  res.json({ ok: true });
});

// Quiet session probe — the SPA calls this on load to decide login vs panel.
app.get("/api/admin/session", (req, res) => {
  if (!req.admin) return res.json({ ok: false, admin: null });
  const user = auth.findUser(req.admin.username);
  if (!user) return res.json({ ok: false, admin: null });
  res.json({ ok: true, admin: auth.publicUser(user) });
});

app.post("/api/admin/password", adminWrite, (req, res) => {
  const current = String(req.body?.current || "");
  const next = String(req.body?.next || "");
  const user = auth.findUser(req.admin.username);
  if (!user || !auth.verifyPassword(current, user)) {
    return res.status(401).json({ ok: false, error: "Current password is wrong." });
  }
  if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
    return res.status(400).json({
      ok: false,
      error: "New password must be at least 8 characters and mix letters and numbers.",
    });
  }
  const updated = auth.setPassword(user.username, next);
  // Changing the password kills every old session — issue a fresh cookie so
  // the admin is not logged out of the tab they are working in.
  const token = auth.createSession(user, { ip: req.ip, userAgent: req.get("user-agent") });
  res.setHeader("Set-Cookie", auth.cookieHeader(token));
  res.json({ ok: true, admin: updated });
});

// --- boutique: dresses -----------------------------------------------------
app.get("/api/admin/dresses", adminGuard, (_req, res) =>
  res.json({
    ...catalog.getStoreVersion(),
    categories: catalog.DRESS_CATEGORIES,
    dresses: catalog.listDresses({ includeHidden: true }),
  })
);

app.post("/api/admin/dresses", adminWrite, (req, res) => {
  const saved = catalog.saveDress(req.body || {});
  res.status(201).json({ ok: true, ...saved });
});

app.put("/api/admin/dresses/:id", adminWrite, (req, res) => {
  const saved = catalog.saveDress(req.body || {}, req.params.id);
  if (!saved) return res.status(404).json({ ok: false, error: "Dress not found." });
  res.json({ ok: true, ...saved });
});

app.delete("/api/admin/dresses/:id", adminWrite, (req, res) => {
  const removed = catalog.deleteDress(req.params.id);
  if (!removed) return res.status(404).json({ ok: false, error: "Dress not found." });
  res.json({ ok: true, ...removed });
});

app.post("/api/admin/dresses/reorder", adminWrite, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  res.json({ ok: true, ...catalog.reorderDresses(ids) });
});

// --- craft classes (single + combo) ---------------------------------------
app.get("/api/admin/classes", adminGuard, (_req, res) => {
  const c = catalog.listClasses();
  res.json({
    ...catalog.getStoreVersion(),
    singleClasses: c.allSingleClasses,
    comboClasses: c.allComboClasses,
  });
});

app.post("/api/admin/classes/:kind", adminWrite, (req, res) => {
  const kind = req.params.kind === "combo" ? "combo" : "single";
  res.status(201).json({ ok: true, ...catalog.saveClass(kind, req.body || {}) });
});

app.put("/api/admin/classes/:kind/:id", adminWrite, (req, res) => {
  const kind = req.params.kind === "combo" ? "combo" : "single";
  const saved = catalog.saveClass(kind, req.body || {}, req.params.id);
  if (!saved) return res.status(404).json({ ok: false, error: "Class not found." });
  res.json({ ok: true, ...saved });
});

app.delete("/api/admin/classes/:kind/:id", adminWrite, (req, res) => {
  const kind = req.params.kind === "combo" ? "combo" : "single";
  const removed = catalog.deleteClass(kind, req.params.id);
  if (!removed) return res.status(404).json({ ok: false, error: "Class not found." });
  res.json({ ok: true, ...removed });
});

// --- enquiries ------------------------------------------------------------
app.get("/api/admin/enquiries", adminGuard, (_req, res) =>
  res.json({ ok: true, enquiries: listEnquiries().slice().reverse() })
);

app.get("/api/admin/customers", adminGuard, (_req, res) =>
  res.json({ ok: true, customers: customers.readUsers().map(customers.publicUser) })
);

app.get("/api/admin/orders", adminGuard, (_req, res) =>
  res.json({ ok: true, orders: customers.readOrders().slice().reverse() })
);

app.patch("/api/admin/enquiries/:id", adminWrite, (req, res) => {
  const status = String(req.body?.status || "").trim();
  const allowed = ["new", "contacted", "enrolled", "closed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, error: "Unknown status." });
  }
  const updated = updateEnquiry(req.params.id, { status });
  if (!updated) return res.status(404).json({ ok: false, error: "Enquiry not found." });
  res.json({ ok: true, enquiry: updated });
});

// --- maintenance ----------------------------------------------------------
app.post("/api/admin/catalog/reset", adminWrite, (_req, res) => {
  res.json({ ok: true, ...catalog.resetCatalog() });
});

// ---- Uploaded boutique photos on disk -------------------------------------
// (dev: Vite already serves public/; production: Express serves them here)
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, { fallthrough: true, maxAge: "7d" })
);

// ---- Serve the built React app (production) -------------------------------
app.use(express.static(path.join(__dirname, "..", "dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`TCT Node API + site running at http://localhost:${PORT}`);
  if (seededAdmin) {
    console.log(
      `[admin] created the first admin account -> ${seededAdmin.username} / ${seededAdmin.password}` +
        `\n        (change it in the admin panel: Settings -> Change password)`
    );
  }
});

// Friendly message instead of a scary crash when an old server is still running
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `\n[X] Port ${PORT} already in use — an older TCT node server is still running.` +
        `\n    Fix: close the old window (or run: taskkill /F /IM node.exe), then "npm run dev" again.\n`
    );
    process.exit(1);
  }
  throw err;
});
