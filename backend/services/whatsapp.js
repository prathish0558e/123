// TCT Fashion Hub — WhatsApp Cloud API service (official Meta WhatsApp Business Platform).
// Reusable senders + incoming-message automation. Uses the Meta Graph API ONLY —
// no unofficial WhatsApp Web / QR / Selenium automation.
//
// IMPORTANT: every credential lives in .env (server-side only). Nothing here is
// ever imported by the frontend, and no token is ever sent to the browser.

const pricingPath = require.resolve("../data/pricing");
const getPricing = () => {
  delete require.cache[pricingPath];
  return require("../data/pricing");
};

const GRAPH_BASE = "https://graph.facebook.com";

// ---- Configuration (from environment only) --------------------------------
function cfg() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    // The existing company WhatsApp Business number (must stay THE company number).
    companyNumber: (process.env.COMPANY_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    // Where enquiry alerts land. The Cloud API cannot deliver a message to the
    // same number that sends it, so alerts usually go to the owner/manager's
    // own WhatsApp. Falls back to the company number.
    alertNumber: (process.env.COMPANY_ALERT_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    companyName: process.env.COMPANY_NAME || "TCT Fashion Hub",
    thankyouTemplate: process.env.WHATSAPP_THANKYOU_TEMPLATE || "",
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG || "en",
  };
}

function isConfigured() {
  const c = cfg();
  return Boolean(c.token && c.phoneNumberId);
}

// ---- Phone helpers ---------------------------------------------------------
// Accepts +91 93848 46922 / 919384846922 / 09384846922 etc. → "919384846922".
function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = "91" + digits; // default to India
  return digits;
}

// ---- Low-level Graph API call ----------------------------------------------
async function graphSend(payload) {
  const c = cfg();
  if (!isConfigured()) {
    console.log("[whatsapp] not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID) — skipping send");
    return { ok: false, skipped: true };
  }
  const url = `${GRAPH_BASE}/${c.apiVersion}/${c.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error || {};
      console.error(`[whatsapp] Graph API ${res.status}: ${err.code || ""} ${err.message || res.statusText}`);
      // 131047 = business-initiated message outside the 24h customer window → needs a template.
      if (err.code === 131047) {
        return { ok: false, outsideWindow: true, error: err.message };
      }
      return { ok: false, error: err.message || `HTTP ${res.status}` };
    }
    const msgId = data?.messages?.[0]?.id || "";
    return { ok: true, id: msgId };
  } catch (e) {
    console.error("[whatsapp] network error:", e.message);
    return { ok: false, error: e.message };
  }
}

// ---- Reusable senders -------------------------------------------------------
async function sendTextMessage(to, body) {
  const toNorm = normalizePhone(to);
  if (!toNorm || !body) return { ok: false, error: "missing recipient or body" };
  return graphSend({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toNorm,
    type: "text",
    text: { preview_url: false, body },
  });
}

// Official template message support — business-initiated messages MUST use an
// approved template when no customer-service window is open.
async function sendTemplateMessage(to, templateName, bodyParams = [], lang) {
  const toNorm = normalizePhone(to);
  const c = cfg();
  if (!toNorm || !templateName) return { ok: false, error: "missing recipient or template" };
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toNorm,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang || c.templateLang },
    },
  };
  if (bodyParams.length) {
    payload.template.components = [
      {
        type: "body",
        parameters: bodyParams.map((t) => ({ type: "text", text: String(t) })),
      },
    ];
  }
  return graphSend(payload);
}

// ---- Enquiry notifications --------------------------------------------------
// Alert to the studio (owner number, since the API number cannot message itself).
async function sendEnquiryNotification(enquiry) {
  const c = cfg();
  const to = c.alertNumber || c.companyNumber;
  const body =
    "🔔 New Website Enquiry\n\n" +
    `Name: ${enquiry.name}\n` +
    `Phone: ${enquiry.phone}\n` +
    (enquiry.email ? `Email: ${enquiry.email}\n` : "") +
    `Service: ${enquiry.service}\n` +
    (enquiry.message ? `\nMessage: ${enquiry.message}\n` : "") +
    "\nSource: Website";
  const result = await sendTextMessage(to, body);
  return { ...result, to };
}

// Thank-you to the customer. Meta rule: business-initiated = template required
// (outside any 24h window), so if WHATSAPP_THANKYOU_TEMPLATE is set we send the
// approved template; otherwise we try free-form and report honestly.
async function sendCustomerThankYou(enquiry) {
  const c = cfg();
  const to = enquiry.whatsapp_number || enquiry.phone;
  if (c.thankyouTemplate) {
    return sendTemplateMessage(
      to,
      c.thankyouTemplate,
      [enquiry.name, c.companyName]
    );
  }
  const body =
    `Hi ${enquiry.name} 👋\n\n` +
    `Thank you for your enquiry with ${c.companyName}.\n\n` +
    "We have received your request successfully.\n" +
    "Our team will contact you shortly.\n\n" +
    `Thank you for choosing ${c.companyName}.`;
  const result = await sendTextMessage(to, body);
  if (!result.ok && result.skipped) return result;
  if (!result.ok && result.outsideWindow) {
    console.error(
      "[whatsapp] customer thank-you blocked by Meta (outside 24h window). " +
        "Create an approved template and set WHATSAPP_THANKYOU_TEMPLATE in .env"
    );
  }
  return result;
}

// ---- Incoming message automation -------------------------------------------
const MENU_TEXT = (company) =>
  `Hi 👋\nThank you for contacting ${company}.\n\nHow can we help you today?\n\n` +
  "1. Services\n2. Pricing\n3. Book an appointment\n4. Talk to our team\n\n" +
  '(Reply with a number — or type "menu" anytime.)';

function buildReply(text) {
  const c = cfg();
  const t = String(text || "").toLowerCase().trim();
  const has = (...words) => words.some((w) => t.includes(w));

  if (/^[1]\b/.test(t) || has("service", "course", "class list")) {
    return (
      "🎨 Our Services — 7 crafts under one roof:\n" +
      "• Tailoring\n• Embroidery\n• Aari Work\n• Jewellery Making\n" +
      "• Saree Pre-Pleating\n• Mehndi\n• Resin Art\n\n" +
      'Type 2 for pricing, 3 to book a seat, or "menu" to start over.'
    );
  }

  if (/^[2]\b/.test(t) || has("price", "fees", "fee", "cost", "rate")) {
    // Pulled live from backend/data/pricing.js — stays in sync automatically.
    const p = getPricing();
    const singles = p.singleClasses
      .map((cl) => `• ${cl.name} — Rs ${Number(cl.price).toLocaleString("en-IN")} (${cl.duration})`)
      .join("\n");
    const featured = p.comboClasses.find((cb) => cb.featured);
    return (
      "💰 Current Fees (all materials included):\n" +
      singles +
      (featured
        ? `\n\n⭐ ${featured.name} — Rs ${Number(featured.price).toLocaleString("en-IN")} (${featured.duration})`
        : "") +
      "\n\nFull combo list is on our website — type 3 to book a seat."
    );
  }

  if (/^[3]\b/.test(t) || has("book", "appointment", "join", "admission", "enrol", "enroll")) {
    return (
      "📅 Wonderful! To book your seat, please send:\n" +
      "1. Your name\n2. Which class you'd like\n3. Preferred timing (morning / afternoon / evening)\n\n" +
      "Our team will confirm shortly. You can also tap \"Enquire Now\" on our website."
    );
  }

  if (/^[4]\b/.test(t) || has("team", "talk", "human", "agent", "call", "staff")) {
    return (
      "👩‍🏫 Our team will help you personally!\n" +
      "📞 Call us: +91 93848 46922\n" +
      "Or keep chatting here — we reply during studio hours (Mon–Sat, 10 AM–7 PM)."
    );
  }

  if (has("hi", "hello", "hey", "vanakkam", "menu", "start") || t.length <= 3) {
    return MENU_TEXT(c.companyName);
  }

  return (
    "Sorry, I didn't quite get that 🙏\n\n" + MENU_TEXT(c.companyName)
  );
}

// Parse one incoming Meta webhook message → { from, name, text, reply }.
function processIncomingMessage(message) {
  const from = message?.from || "";
  const name =
    message?.profile?.name ||
    message?._meta?.name || // reserved, usually absent
    "";
  let text = "";
  if (message?.type === "text") text = message.text?.body || "";
  else if (message?.type === "interactive") {
    const iv = message.interactive || {};
    text =
      iv.button_reply?.title ||
      iv.list_reply?.title ||
      "";
  } else if (message?.type === "button") {
    text = message.button?.text || "";
  }
  const reply = buildReply(text || "hi");
  return { from: normalizePhone(from), name, text, reply };
}

module.exports = {
  cfg,
  isConfigured,
  normalizePhone,
  sendTextMessage,
  sendTemplateMessage,
  sendEnquiryNotification,
  sendCustomerThankYou,
  processIncomingMessage,
};
