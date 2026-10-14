import { COMPANY, LEADERSHIP, CRAFTS } from "../data/content.js";

/*
 * TCT Fashion Assistant "brain" — a fast, local, keyword-matched responder.
 * No LLM backend: answers are composed from the studio's own published facts
 * (classes, combos, timings, location, leadership), so every reply is
 * accurate and on-brand. Anything it can't answer funnels politely toward
 * the enquiry flow (the same /api/enquiries pipeline as the Enquire page).
 *
 * Class prices below mirror backend/data/pricing.js — keep in sync when a
 * price changes.
 */
const CLASSES = [
  { name: "Tailoring", price: "8,000", gift: "measuring tape, chalk set & handbook" },
  { name: "Embroidery", price: "7,000", gift: "24-skein threads, needles & design sheets" },
  { name: "Aari Work", price: "7,000", gift: "aari needles, frame & zari threads" },
  { name: "Saree Pre-Pleating", price: "2,000", gift: "pleating board & measurement guide" },
  { name: "Mehndi", price: "4,000", gift: "organic cones, practice sheets & oils" },
  { name: "Jewellery Making", price: "6,000", gift: "beads, findings & plier set" },
];

const COMBOS = [
  { name: "Signature Combo — All 7 Crafts", price: "25,000" },
  { name: "Embroidery + Aari Duo", price: "15,000" },
  { name: "Saree + Mehndi Duo", price: "10,000" },
  { name: "Tailoring + Embroidery Duo", price: "20,000" },
  { name: "Tailoring + Aari + Embroidery Trio", price: "23,000" },
  { name: "Saree + Jewellery + Resin Art Trio", price: "22,000" },
];

const feeLine = () =>
  CLASSES.map((c) => `${c.name} — Rs ${c.price}`).join("  ·  ");
const comboLine = () =>
  COMBOS.map((c) => `${c.name} (Rs ${c.price})`).join("  ·  ");

const RULES = [
  {
    id: "greet",
    k: ["hi", "hello", "hey", "vanakkam", "good morning", "good evening", "good afternoon", "hai"],
    a: () =>
      "Hello! 👋 Welcome to TCT Fashion Hub. Ask me about our classes, fees, combos, batch timings or the studio — or say “I want to join” and I'll note your details for the team.",
  },
  {
    id: "boutique",
    k: ["dress", "dresses", "outfit", "boutique", "kurti", "lehenga", "blouse", "gown", "kids wear", "shopping", "browse"],
    a: () =>
      "Our boutique has kurtis, sarees, lehengas, blouses, gowns, kids wear and jewellery. Choose Shop in the website menu to browse the live collection, photos, sizes and current prices. Tell me what style you are looking for and I can guide you. 🛍️",
  },
  {
    id: "fees",
    k: ["price", "pricing", "fee", "fees", "cost", "how much", "charge", "rate", "costly", "budget", "₹", "rs"],
    a: () =>
      `Here are our single-class fees (each class runs 1 month and includes a starter kit gift):\n${feeLine()}\nCombos start at Rs 10,000 — want to hear those too?`,
  },
  {
    id: "combos",
    k: ["combo", "bundle", "package", "offer", "discount", "save", "together", "multiple"],
    a: () =>
      `Our combo classes (each runs about 3 months):\n${comboLine()}\nThe Signature Combo covers all 7 crafts — tailoring, embroidery, aari, saree pre-pleating, mehndi, jewellery making and resin art — for Rs 25,000 with a complete artisan kit gift worth Rs 3,500. Which one shall I explain?`,
  },
  {
    id: "tailoring",
    k: ["tailor", "stitch", "sewing", "kai", "aai"],
    a: () =>
      "Our Tailoring Class is 1 month, Rs 8,000 — beginner friendly, from the very first stitch to finishing your own garments. Your kit gift includes a measuring tape, chalk set and handbook. Say “I want to join” to reserve a seat. 🧵",
  },
  {
    id: "embroidery",
    k: ["embroider", "embrioder", "thread work", "hand stitch design"],
    a: () =>
      "The Embroidery Class is 1 month, Rs 7,000, open to all levels — classic hand-embroidery techniques with design sheets to take home. Kit gift: 24-skein threads, needles and design sheets. 🪡",
  },
  {
    id: "aari",
    k: ["aari", "aari work", "maggam", "zari"],
    a: () =>
      "Aari Work Class — 1 month, Rs 7,000, all levels. Maggam/aari embroidery on frame with zari and bead work, the boutique-favourite skill. Kit gift: aari needles, frame and zari threads. ✨",
  },
  {
    id: "saree",
    k: ["saree", "pre pleat", "pre-pleat", "pleating", "draping"],
    a: () =>
      "Saree Pre-Pleating is our shortest class — 1 month, Rs 2,000, beginner friendly. You'll learn perfect pleats and professional draping setup. Kit gift: pleating board and measurement guide. 🥻",
  },
  {
    id: "mehndi",
    k: ["mehndi", "mehendi", "henna", "cone"],
    a: () =>
      "Mehndi Class — 1 month, Rs 4,000, beginner friendly. Traditional and modern designs with organic cones. Kit gift: organic cones, practice sheets and oils. 🌿",
  },
  {
    id: "jewellery",
    k: ["jewel", "bead", "necklace", "earring"],
    a: () =>
      "Jewellery Making — 1 month, Rs 6,000, all levels. Beaded and findings-based jewellery you can wear or sell. Kit gift: beads, findings and a plier set. 💍",
  },
  {
    id: "resin",
    k: ["resin", "epoxy", "casting"],
    a: () =>
      "Resin Art is taught inside our combos — the Signature Combo (all 7 crafts, Rs 25,000) and the Saree + Jewellery + Resin Art Trio (Rs 22,000) both include it. resin coasters, jewellery and decor pieces — very popular for home business. ✨",
  },
  {
    id: "kit",
    k: ["kit", "gift", "materials", "included", "supplies", "tools"],
    a: () =>
      "Every single class starts with a Basic Kit gift on the house — so you can practise at home from day one. Combos carry bigger kit gifts (up to Rs 3,500 worth in the Signature Combo). 🎁",
  },
  {
    id: "certificate",
    k: ["certificate", "certification", "degree", "diploma", "proof"],
    a: () =>
      "Yes — every course finishes with a certificate and a showcase of the work you made in class. Great proof for starting a home boutique or taking freelance orders. 🎓",
  },
  {
    id: "timing",
    k: ["timing", "timings", "batch", "schedule", "when", "time", "duration", "how long", "class hours", "open"],
    a: () =>
      `We're open ${COMPANY.hours} (closed Sundays). Single classes run 1 month; combos run about 3 months. Batch timings are flexible — tell us your free hours when you enquire and we'll fit you in.`,
  },
  {
    id: "location",
    k: ["where", "location", "address", "address?", "map", "place", "area", "direction", "reach", "come", "location??"],
    a: () =>
      `We're at ${COMPANY.address} It's right near ICICI Bank, Ganapathy — easy to reach from anywhere in Coimbatore. The map is on the Enquire page. 📍`,
  },
  {
    id: "contact",
    k: ["contact", "phone", "call", "whatsapp", "email", "mail", "number", "office"],
    a: () =>
      `Call or WhatsApp ${COMPANY.phone}, or email ${COMPANY.email}. ${COMPANY.hours} — the team replies fast. 📩`,
  },
  {
    id: "about",
    k: ["about", "studio", "academy", "who are you", "tct", "history", "experience", "students", "how many", "trust"],
    a: () =>
      "TCT Fashion Hub is a boutique craft studio in Ganapathy, Coimbatore — since 2021, 500+ students trained across 7 crafts: " +
      CRAFTS.join(", ") +
      ". Small batches, certified courses and a kit gift with every class. 😊",
  },
  {
    id: "ceo",
    k: ["ceo", "chief executive", "bharath", "who runs", "boss", "owner", "founder"],
    a: () =>
      `${LEADERSHIP[0].name} is our ${LEADERSHIP[0].role} — he sets the studio's vision and personally looks after how every student is guided from first enquiry to certificate. Our MD ${LEADERSHIP[1].name} runs the day-to-day. Want an intro? Ring ${COMPANY.phone}. 🙂`,
  },
  {
    id: "md",
    k: ["md details", " md ", "managing director", "mohanapriya", "mohana priya", "who is the md"],
    a: () =>
      `${LEADERSHIP[1].name} is our ${LEADERSHIP[1].role} — she runs curriculum, mentor schedules and the starter-kit programme, keeping batches small so nobody is left behind. Reach her through ${COMPANY.phone} or ${COMPANY.email}.`,
  },
  {
    id: "leadership",
    k: ["leadership", "team", "who is behind", "management", "teachers", "mentor", "trainer"],
    a: () =>
      `The studio is led by ${LEADERSHIP[0].name} (CEO) and ${LEADERSHIP[1].name} (MD), with hands-on mentors for every craft. You'll meet the team on the About page — or call ${COMPANY.phone} to visit the studio. 🧵`,
  },
  {
    id: "payment",
    k: ["payment", "pay", "upi", "gpay", "phonepe", "paytm", "card", "cash", "installment"],
    a: () =>
      "You can pay by UPI (GPay / PhonePe / Paytm — scan the QR in the Pay Now window), on WhatsApp, or by cash at the studio. Prefer to see it first? Say “I want to join” and the team will call you with details. 💳",
  },
  {
    id: "identity",
    k: ["who are you", "your name", "are you a robot", "are you human", "are you ai", "are you real", "you robot", "what are you"],
    a: () =>
      "I'm the TCT Fashion Assistant, a virtual helper shown as a human fashion guide on this website. I can answer questions using the studio's published details, and the team at the office can help with anything unusual.",
  },
  {
    id: "joke",
    k: ["joke", "funny", "make me laugh", "comedy"],
    a: () =>
      "Okay: I asked a needle why it was so cool… it said it's great at pointed conversations. 🥲 Now — shall we pick a class? Tailoring and Aari are our most loved. 😄",
  },
  {
    id: "thanks",
    k: ["thank", "thanks", "nandri", "romba nalla", "super", "wonderful", "helpful"],
    a: () => "Happy to help! 😄 Anything else — fees, combos, timings?",
  },
  {
    id: "bye",
    k: ["bye", "good night", "goodnight", "see you", "tata", "ok bye", "thank you bye"],
    a: () => "Good night! 🌙 See you soon — I'll be right here on my cloud, waiting for your next question.",
  },
];

/*
 * Keyword matching with word boundaries.
 * Short keys ("hi", "md", "upi") must be whole words — otherwise "which"
 * matches "hi". Longer keys keep prefix matching so "pleat" catches
 * "pleating" and "certif" catches "certificate".
 */
const KEY_CACHE = new Map();
function keyRegex(key) {
  if (KEY_CACHE.has(key)) return KEY_CACHE.get(key);
  const k = key.trim();
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re =
    k.length <= 3
      ? new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i")
      : new RegExp(`(^|[^a-z0-9])${esc}`, "i");
  KEY_CACHE.set(key, re);
  return re;
}

const hits = (text, keys) => keys.some((key) => keyRegex(key).test(text));

export function answerFor(text) {
  const q = String(text || "").toLowerCase();
  for (const r of RULES) {
    if (hits(q, r.k)) return r.a();
  }
  return null;
}

export const FALLBACK = () => {
  const opts = "classes, fees, combos, batch timings, the studio, how to reach us";
  return `That one is outside my little guide — but I'm a good listener. 🤖 Ask me about ${opts}, or say “I want to join” and I'll pass your details to the team.`;
};

/* ---------- Enquiry flow (POSTs to /api/enquiries) ---------- */
export const LEAD_TRIGGERS = [
  "i want to join", "want to join", "join", "enquiry", "enquire", "enroll", "enrol",
  "admission", "register", "sign up", "book a seat", "reserve", "contact me",
  "call me", "interested", "how to join", "join pannanum", "class venum",
];

export function wantsLead(text) {
  return hits(String(text || "").toLowerCase(), LEAD_TRIGGERS);
}

export const LEAD_STEPS = ["name", "contact", "interest"];

export function leadPrompt(step, draft) {
  if (step === "name") return "Wonderful! Let's do it properly. May I have your name?";
  if (step === "contact") return `Nice to meet you, ${draft.name.split(" ")[0]}! What's the best phone number to reach you? (WhatsApp number works best.)`;
  return "Which class are you most interested in? (Tailoring · Embroidery · Aari · Saree Pre-Pleating · Mehndi · Jewellery · Resin · any Combo)";
}

export function validateLead(step, text) {
  if (step === "name") return text.length >= 2 ? null : "Please enter your name (at least 2 letters).";
  if (step === "contact") {
    const isPhone = /^[+()\d\s-]{7,16}$/.test(text);
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text);
    return isPhone || isEmail ? null : "Hmm, that doesn't look right — please share a valid phone number or email.";
  }
  return text.length >= 3 ? null : "Please tell me the class name (or combo) you're interested in.";
}

export function buildLeadPayload(draft) {
  const emailLike = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.contact || "");
  return {
    name: draft.name || "TCT Assistant visitor",
    email: emailLike ? draft.contact : "",
    phone: emailLike ? "" : draft.contact,
    interest: draft.interest || "Not specified",
    message: `[3D assistant chat] Interested in: ${draft.interest || "Not specified"}`,
  };
}

export const QUICK_CHIPS = [
  "Class fees?",
  "Combo offers?",
  "Batch timings?",
  "Where are you?",
  "I want to join",
];
