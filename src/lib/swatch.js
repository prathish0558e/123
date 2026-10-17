/*
 * Colour swatches.
 *
 * The studio names its colours the way a tailor speaks — "Rose Gold", "Any
 * (match your saree)" — so the card needs a real swatch, not a CSS class per
 * name. Known studio colours are mapped exactly; anything else is hashed into
 * a warm, on-brand palette so an admin-invented colour still looks deliberate
 * instead of grey.
 */
const NAMED = {
  indigo: "#35506f",
  mustard: "#d69b21",
  rust: "#b4552c",
  "rose gold": "#c98b74",
  wine: "#78233f",
  ivory: "#f2ecdf",
  emerald: "#0f7a5a",
  navy: "#1e3057",
  "blush pink": "#e9b7bd",
  pink: "#e2718f",
  yellow: "#ecc63d",
  "sky blue": "#8fc6e8",
  peach: "#f2b48f",
  mint: "#a7dcc3",
  lavender: "#bda7e0",
  "gold flake": "#c9a227",
  "pressed flower": "#c98fa8",
  "ocean blue": "#2f6f95",
  maroon: "#6f1f2e",
  teal: "#12706e",
  black: "#1b1b1f",
  white: "#ffffff",
  grey: "#94a3b8",
  gray: "#94a3b8",
  violet: "#7c3aed",
  purple: "#7c3aed",
  orange: "#e07a2f",
  green: "#2f8f52",
  blue: "#2f6fd0",
  red: "#c0392b",
};

/* Mixed pastels that never fight the brand blue/orange. */
const FALLBACK = [
  "#8fa8c8",
  "#c9a27e",
  "#a3b8a0",
  "#c2a0b8",
  "#a8b3c4",
  "#cbb98f",
];

const hash = (value) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) % 9973;
  return h;
};

/**
 * CSS colour for a studio colour name.
 * "Any (match your saree)" is a note, not a colour — it gets a neutral ring.
 */
export function swatchFor(name) {
  const raw = String(name || "").trim();
  if (!raw) return "#cbd5e1";
  const key = raw.toLowerCase();
  if (key.startsWith("any")) return "conic-gradient(#e2e8f0 0 25%, #f8fafc 0 50%, #e2e8f0 0 75%, #f8fafc 0)";
  return NAMED[key] || FALLBACK[hash(key) % FALLBACK.length];
}

/** True when the swatch is a light colour and needs a darker ring to read. */
export function isLightSwatch(name) {
  const value = swatchFor(name);
  if (!value.startsWith("#") || value.length !== 7) return false;
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.82;
}

export default swatchFor;
