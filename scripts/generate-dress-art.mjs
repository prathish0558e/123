/*
 * Placeholder artwork for the starter dress catalogue.
 *
 * The boutique ships with eight garments and no product photography yet, so
 * this script draws one clean "fashion sketch" SVG per garment into
 * public/images/dresses/. They look deliberate (brand palette, soft gradient,
 * hand-sketch stroke) instead of like broken images.
 *
 * Replace them any time from the admin panel — upload a real photo or paste an
 * image URL — the shop reads whatever the catalogue says.
 *
 * Usage:  node scripts/generate-dress-art.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "images", "dresses");
mkdirSync(outDir, { recursive: true });

const W = 800;
const H = 1000;

/** Wrap a sketch fragment in the shared card frame (gradient + grid + label). */
function frame({ bg = ["#eef5ff", "#e2edff"], ink = "#0e2a4d", accent = "#0d6efd", label, sub, art }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${bg[0]}"/>
      <stop offset="1" stop-color="${bg[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="weave" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="26" stroke="${ink}" stroke-opacity="0.05" stroke-width="2"/>
    </pattern>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="#f97316"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#weave)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="30" fill="none" stroke="${ink}" stroke-opacity="0.12" stroke-width="2"/>

  <g stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">${art}</g>

  <rect x="${W / 2 - 46}" y="${H - 150}" width="92" height="5" rx="2.5" fill="url(#accent)"/>
  <text x="${W / 2}" y="${H - 104}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="${ink}">${label}</text>
  <text x="${W / 2}" y="${H - 66}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="19" letter-spacing="4" fill="${ink}" fill-opacity="0.6" text-transform="uppercase">${sub}</text>
</svg>
`;
}

const ART = {
  "kurti.svg": frame({
    label: "Kurti",
    sub: "AARI · COTTON",
    art: `
      <path d="M300 250 Q400 292 500 250 L548 300 L556 470 L520 760 L280 760 L244 470 L252 300 Z"/>
      <path d="M300 250 Q400 200 500 250"/>
      <path d="M252 300 L196 470 L232 484 L268 372"/>
      <path d="M548 300 L604 470 L568 484 L532 372"/>
      <path d="M286 402 Q400 452 514 402" stroke-width="4" stroke-dasharray="10 14"/>
      <circle cx="400" cy="330" r="7" fill="#f97316" stroke="none"/>
      <path d="M400 402 L392 560" stroke-width="4" stroke-opacity="0.55"/>
      <path d="M316 250 L400 316 L484 250" stroke-width="4" stroke-opacity="0.55"/>`,
  }),
  "saree.svg": frame({
    bg: ["#eafaf3", "#dff0ea"],
    ink: "#0d3b33",
    accent: "#0d9488",
    label: "Saree",
    sub: "SOFT SILK · ZARI",
    art: `
      <path d="M212 262 Q400 216 588 262"/>
      <path d="M212 262 Q190 520 208 756"/>
      <path d="M588 262 Q610 520 592 756"/>
      <path d="M212 262 Q400 330 588 262"/>
      <path d="M244 452 Q400 512 556 452" stroke-width="4" stroke-opacity="0.6"/>
      <path d="M236 566 Q400 626 564 566" stroke-width="4" stroke-opacity="0.6"/>
      <path d="M232 680 Q400 740 568 680" stroke-width="4" stroke-opacity="0.6"/>
      <path d="M208 756 L592 756 L592 830 L208 830 Z" stroke-width="6"/>
      <path d="M232 786 L568 786" stroke-width="3" stroke-dasharray="14 12"/>
      <path d="M588 262 L660 372 L588 372 Z" stroke-width="5"/>
      <circle cx="624" cy="330" r="6" fill="#f97316" stroke="none"/>`,
  }),
  "lehenga.svg": frame({
    bg: ["#fdeefa", "#f6e4f4"],
    ink: "#41123d",
    accent: "#a21caf",
    label: "Lehenga",
    sub: "BRIDAL · AARI",
    art: `
      <path d="M264 258 L352 232 L448 232 L536 258 L556 330 L548 372 L252 372 L244 330 Z"/>
      <path d="M352 232 L400 300 L448 232" stroke-width="4" stroke-opacity="0.6"/>
      <path d="M252 392 L196 830 Q400 878 604 830 L548 392"/>
      <path d="M330 400 L300 838" stroke-width="4" stroke-opacity="0.5"/>
      <path d="M400 400 L400 846" stroke-width="4" stroke-opacity="0.5"/>
      <path d="M470 400 L500 838" stroke-width="4" stroke-opacity="0.5"/>
      <path d="M196 830 Q400 878 604 830" stroke-width="8"/>
      <path d="M240 462 Q400 512 560 462" stroke-width="4" stroke-dasharray="9 13"/>
      <circle cx="300" cy="288" r="6" fill="#f97316" stroke="none"/>
      <circle cx="500" cy="288" r="6" fill="#f97316" stroke="none"/>
      <path d="M604 300 Q690 420 640 620" stroke-width="5" stroke-opacity="0.7"/>`,
  }),
  "blouse.svg": frame({
    bg: ["#fff6ec", "#ffeedd"],
    ink: "#4a2208",
    accent: "#f97316",
    label: "Blouse",
    sub: "MADE TO MEASURE",
    art: `
      <path d="M312 268 L400 244 L488 268 L556 340 L556 452 L500 464 L496 396 L492 720 L308 720 L304 396 L300 464 L244 452 L244 340 Z"/>
      <path d="M312 268 Q400 356 488 268" stroke-width="5"/>
      <path d="M400 356 L400 720" stroke-width="4" stroke-opacity="0.5"/>
      <path d="M328 470 Q400 512 472 470" stroke-width="4" stroke-dasharray="10 12"/>
      <path d="M352 300 L448 300" stroke-width="4" stroke-opacity="0.5"/>
      <circle cx="400" cy="560" r="9" fill="#0d6efd" stroke="none"/>
      <circle cx="400" cy="626" r="9" fill="#0d6efd" stroke="none"/>`,
  }),
  "gown.svg": frame({
    bg: ["#eef3ff", "#e4e9ff"],
    ink: "#1b2350",
    accent: "#4f46e5",
    label: "Gown",
    sub: "ANARKALI · NET",
    art: `
      <path d="M320 240 L400 292 L480 240 L540 300 L520 452 L560 470 L640 866 Q400 912 160 866 L240 470 L280 452 L260 300 Z"/>
      <path d="M320 240 Q400 178 480 240" stroke-width="5"/>
      <path d="M400 292 L400 470" stroke-width="4" stroke-opacity="0.5"/>
      <path d="M400 470 Q400 620 400 880" stroke-width="4" stroke-opacity="0.4"/>
      <path d="M262 470 Q220 300 300 232" stroke-width="5" stroke-opacity="0.65"/>
      <path d="M538 470 Q580 300 500 232" stroke-width="5" stroke-opacity="0.65"/>
      <path d="M300 540 Q400 588 500 540" stroke-width="4" stroke-dasharray="9 13"/>
      <path d="M160 866 Q400 912 640 866" stroke-width="8"/>
      <circle cx="400" cy="352" r="7" fill="#f97316" stroke="none"/>`,
  }),
  "kids.svg": frame({
    bg: ["#fff0f6", "#ffe4ef"],
    ink: "#4c0f2e",
    accent: "#db2777",
    label: "Kids Frock",
    sub: "PATTU · LINED",
    art: `
      <path d="M336 306 L400 282 L464 306 L488 356 L456 372 L452 432 L520 764 Q400 800 280 764 L348 432 L344 372 L312 356 Z"/>
      <path d="M336 306 Q400 356 464 306" stroke-width="5"/>
      <ellipse cx="286" cy="386" rx="46" ry="34" stroke-width="6"/>
      <ellipse cx="514" cy="386" rx="46" ry="34" stroke-width="6"/>
      <path d="M352 470 Q400 502 448 470" stroke-width="4" stroke-dasharray="9 12"/>
      <path d="M380 252 L420 252 L420 292 L380 292 Z" stroke-width="5"/>
      <path d="M400 292 L336 246" stroke-width="6"/>
      <path d="M400 292 L464 246" stroke-width="6"/>
      <path d="M280 764 Q400 800 520 764" stroke-width="8"/>`,
  }),
  "dupatta.svg": frame({
    bg: ["#f1fdfb", "#e3f7f4"],
    ink: "#0d3b33",
    accent: "#14b8a6",
    label: "Dupatta",
    sub: "MIRROR EDGE",
    art: `
      <path d="M320 232 Q400 268 480 232 L520 300 Q400 348 280 300 Z"/>
      <path d="M280 300 Q248 560 296 820"/>
      <path d="M520 300 Q552 560 504 820"/>
      <path d="M296 820 Q400 856 504 820" stroke-width="8"/>
      <path d="M312 470 Q400 506 488 470" stroke-width="4" stroke-opacity="0.6"/>
      <path d="M306 620 Q400 656 494 620" stroke-width="4" stroke-opacity="0.6"/>
      <circle cx="330" cy="352" r="7" fill="#f97316" stroke="none"/>
      <circle cx="400" cy="368" r="7" fill="#f97316" stroke="none"/>
      <circle cx="470" cy="352" r="7" fill="#f97316" stroke="none"/>
      <circle cx="302" cy="780" r="7" fill="#f97316" stroke="none"/>
      <circle cx="400" cy="800" r="7" fill="#f97316" stroke="none"/>
      <circle cx="498" cy="780" r="7" fill="#f97316" stroke="none"/>`,
  }),
  "jewellery.svg": frame({
    bg: ["#fffbea", "#fdf3d7"],
    ink: "#4a3406",
    accent: "#d97706",
    label: "Jewellery",
    sub: "RESIN · HANDMADE",
    art: `
      <path d="M232 300 Q400 566 568 300" stroke-width="8"/>
      <path d="M264 322 Q400 528 536 322" stroke-width="4" stroke-opacity="0.5" stroke-dasharray="8 12"/>
      <circle cx="400" cy="520" r="42" stroke-width="7"/>
      <path d="M400 562 L400 640" stroke-width="6"/>
      <path d="M400 640 Q368 700 400 740 Q432 700 400 640" stroke-width="5"/>
      <path d="M232 300 L232 372" stroke-width="6"/>
      <path d="M568 300 L568 372" stroke-width="6"/>
      <path d="M232 372 Q232 452 268 470 Q296 442 268 388 Q252 372 232 372 Z" stroke-width="5"/>
      <path d="M568 372 Q568 452 532 470 Q504 442 532 388 Q548 372 568 372 Z" stroke-width="5"/>
      <circle cx="400" cy="520" r="14" fill="#f97316" stroke="none"/>
      <circle cx="252" cy="404" r="7" fill="#0d6efd" stroke="none"/>
      <circle cx="548" cy="404" r="7" fill="#0d6efd" stroke="none"/>`,
  }),
};

for (const [name, svg] of Object.entries(ART)) {
  writeFileSync(join(outDir, name), svg, "utf8");
  console.log(`[dress-art] wrote public/images/dresses/${name}`);
}
console.log(`[dress-art] ${Object.keys(ART).length} garment sketches ready.`);
