/*
 * SEO health check for the BUILT site (run `npm run build` first).
 *
 * Verifies that dist/index.html carries every tag Google/social crawlers
 * need, that the page-level SEO wiring exists in the bundle, and that
 * robots.txt / sitemap.xml agree with VITE_SITE_URL.
 *
 *   npm run build && npm run seo:check
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const SITE_URL = String(
  { ...readEnvFile(join(root, ".env")), ...process.env }.VITE_SITE_URL || ""
)
  .trim()
  .replace(/\/+$/, "");

if (!existsSync(join(dist, "index.html"))) {
  console.error("[seo] dist/index.html missing — run `npm run build` first.");
  process.exit(1);
}

const html = readFileSync(join(dist, "index.html"), "utf8");
const robots = existsSync(join(dist, "robots.txt"))
  ? readFileSync(join(dist, "robots.txt"), "utf8")
  : "";
const sitemap = existsSync(join(dist, "sitemap.xml"))
  ? readFileSync(join(dist, "sitemap.xml"), "utf8")
  : "";

const checks = [];
const add = (name, ok, detail = "") => checks.push({ name, ok, detail });

// --- static tags in the shell ------------------------------------------------
add(
  "Unique title",
  /<title>TCT Fashion Hub \| Boutique Dresses & Craft Classes in Coimbatore<\/title>/.test(
    html
  )
);
add(
  "Meta description",
  /<meta\s+name="description"\s+content="[^"]{50,}"/.test(html)
);
add("Robots meta (index, follow)", /<meta name="robots" content="index, follow"/.test(html));
add("Theme colour", /<meta name="theme-color" content="#0d6efd"/.test(html));
add("Language tag", /<html lang="en-IN">/.test(html));
add("Open Graph title", /<meta property="og:title"/.test(html));
add("Twitter card", /<meta name="twitter:card"/.test(html));
add(
  "Organization / LocalBusiness JSON-LD",
  html.includes("EducationalOrganization") && html.includes("PostalAddress")
);
add("LocalBusiness geo", html.includes("GeoCoordinates"));
add("Opening hours schema", html.includes("OpeningHoursSpecification"));
add("Social profiles in schema", html.includes("sameAs"));

// --- page-level SEO wiring in the JS bundle ---------------------------------
const assets = existsSync(join(dist, "assets"))
  ? (await import("node:fs")).readdirSync(join(dist, "assets"))
  : [];
let bundle = "";
for (const f of assets.filter((a) => a.endsWith(".js"))) {
  bundle += readFileSync(join(dist, "assets", f), "utf8");
}
add("Per-route useSeo wiring", bundle.includes("Craft Studio in Ganapathy"));
add("Course structured data (live prices)", bundle.includes("EducationalOrganization"));
add("Boutique product schema (live prices)", bundle.includes("TCT Fashion Hub boutique collection"));
add("Admin panel is noindex", bundle.includes("noindex, nofollow"));
add("Canonical helper present", bundle.includes("canonical") || html.includes('rel="canonical"'));

// --- robots / sitemap consistency -------------------------------------------
add("robots.txt present", robots.length > 0);
if (SITE_URL) {
  add("canonical tag", html.includes(`<link rel="canonical" href="${SITE_URL}/"`));
  add("Open Graph image (absolute)", html.includes(`property="og:image" content="${SITE_URL}/`));
  add("Open Graph url", html.includes(`property="og:url" content="${SITE_URL}/`));
  add("Twitter image (absolute)", html.includes(`name="twitter:image" content="${SITE_URL}/`));
  add("sitemap.xml present", sitemap.length > 0);
  add("sitemap lists home", sitemap.includes(`<loc>${SITE_URL}/</loc>`));
  add("sitemap lists /classes", sitemap.includes(`${SITE_URL}/classes`));
  add("sitemap excludes /admin", !sitemap.includes(`${SITE_URL}/admin`));
  add("sitemap lists /about", sitemap.includes(`${SITE_URL}/about`));
  add("sitemap lists /enquire", sitemap.includes(`${SITE_URL}/enquire`));
  add("robots.txt references sitemap", robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
} else {
  add(
    "Domain pending (VITE_SITE_URL unset)",
    !html.includes('rel="canonical" href="https://') && sitemap.length === 0
  );
}

// --- report ------------------------------------------------------------------
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "  ok  " : " FAIL "} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(
  `\n[seo] ${checks.length - failed}/${checks.length} checks passed${SITE_URL ? ` (site: ${SITE_URL})` : " (no VITE_SITE_URL configured yet)"}`
);
process.exit(failed ? 1 : 0);
