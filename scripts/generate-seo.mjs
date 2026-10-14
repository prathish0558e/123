/*
 * SEO publish step for the built site.
 *
 * Reads VITE_SITE_URL from .env / the environment, then:
 *   1. writes public/robots.txt + public/sitemap.xml (used by `vite dev` and
 *      by the next build), and mirrors both into dist/;
 *   2. injects the absolute canonical + og:url + og:image + twitter:image
 *      into dist/index.html so social crawlers (which do NOT run JS) see
 *      complete tags for the home page.
 *
 * Until a domain is chosen it writes an allow-all robots.txt, no sitemap,
 * and no absolute tags — a fake domain would be worse than none.
 *
 * Runs inside `npm run build`, or manually:  npm run seo:generate
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const distDir = join(root, "dist");

// Minimal .env reader (no dependency) — real env vars win over the file.
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

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const env = { ...readEnvFile(join(root, ".env")), ...process.env };
const SITE_URL = String(env.VITE_SITE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const today = new Date().toISOString().slice(0, 10);

// /admin is deliberately absent — it is a private, noindex panel. The bag,
// checkout, account and order pages are noindex too (nothing to crawl).
const ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/shop", priority: "0.95", changefreq: "daily" },
  { path: "/classes", priority: "0.9", changefreq: "weekly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/enquire", priority: "0.8", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/returns", priority: "0.4", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

/*
 * Every visible boutique design gets its own crawlable URL. The catalogue the
 * admin panel edits is the source, so adding a dress publishes its page to the
 * sitemap on the next build without anybody touching a route list.
 */
function productRoutes() {
  const storePath = join(root, "backend", "data", "catalog.json");
  if (!existsSync(storePath)) return [];
  try {
    const catalog = JSON.parse(readFileSync(storePath, "utf8"));
    const lastmod = String(catalog.updatedAt || today).slice(0, 10);
    return (catalog.dresses || [])
      .filter((dress) => dress.visible !== false && dress.id)
      .map((dress) => ({
        path: `/shop/${dress.id}`,
        priority: "0.8",
        changefreq: "weekly",
        lastmod,
        image: /^https?:\/\//i.test(dress.image || "") ? null : dress.image || null,
        title: dress.name,
      }));
  } catch {
    return [];
  }
}

const PRODUCT_ROUTES = productRoutes();
const ALL_ROUTES = [...ROUTES, ...PRODUCT_ROUTES];

const robotsTxt = SITE_URL
  ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  : `# TCT Fashion Hub — no production domain configured yet.\n` +
    `# Set VITE_SITE_URL in .env (e.g. VITE_SITE_URL=https://tctfashionhub.in)\n` +
    `# and re-run \`npm run build\` to publish the sitemap reference.\n` +
    `User-agent: *\nAllow: /\n`;

const sitemapXml = SITE_URL
  ? `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${ALL_ROUTES.map(
    (r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${r.lastmod || today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>${
      r.image
        ? `
    <image:image>
      <image:loc>${SITE_URL}${r.image}</image:loc>${
        r.title ? `\n      <image:title>${escapeXml(r.title)}</image:title>` : ""
      }
    </image:image>`
        : ""
    }
  </url>`
  ).join("\n")}
</urlset>
`
  : null;

// 1. public/ (dev server + next build picks these up)
writeFileSync(join(publicDir, "robots.txt"), robotsTxt, "utf8");
if (sitemapXml) writeFileSync(join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
else if (existsSync(join(publicDir, "sitemap.xml"))) {
  const { rmSync } = await import("node:fs");
  rmSync(join(publicDir, "sitemap.xml"));
}

// 2. dist/ (production artifact)
if (existsSync(distDir)) {
  writeFileSync(join(distDir, "robots.txt"), robotsTxt, "utf8");
  if (sitemapXml) writeFileSync(join(distDir, "sitemap.xml"), sitemapXml, "utf8");
  else if (existsSync(join(distDir, "sitemap.xml"))) {
    const { rmSync } = await import("node:fs");
    rmSync(join(distDir, "sitemap.xml"));
  }

  /* Absolute tags for crawlers that skip JS. The script must be idempotent
     and safe across domain switches: ALWAYS strip any previously injected
     canonical/og:url/og:image/twitter:image first (they may belong to an
     older or simulated domain), then inject fresh ones only when
     VITE_SITE_URL is actually set. */
  const indexPath = join(distDir, "index.html");
  if (existsSync(indexPath)) {
    let html = readFileSync(indexPath, "utf8");
    const before = html;

    html = html
      .replace(/\s*<link rel="canonical"[^>]*>/g, "")
      .replace(/\s*<meta property="og:url"[^>]*>/g, "")
      .replace(/\s*<meta property="og:image"[^>]*>/g, "")
      .replace(/\s*<meta name="twitter:image"[^>]*>/g, "");

    if (SITE_URL) {
      const abs = (p) => `${SITE_URL}${p === "/" ? "/" : p}`;
      const img = abs("/images/Tct-front-background.jpeg");
      html = html.replace(
        "</head>",
        `    <link rel="canonical" href="${abs("/")}" />\n` +
          `    <meta property="og:url" content="${abs("/")}" />\n` +
          `    <meta property="og:image" content="${img}" />\n` +
          `    <meta name="twitter:image" content="${img}" />\n  </head>`
      );
    }

    if (html !== before) writeFileSync(indexPath, html, "utf8");
    if (SITE_URL) {
      console.log(`[seo] canonical + OG tags injected into dist/index.html for ${SITE_URL}`);
    } else {
      console.log("[seo] no domain — canonical/OG absolute tags stripped from dist/index.html");
    }
  }
}

console.log(
  SITE_URL
    ? `[seo] robots.txt + sitemap.xml generated for ${SITE_URL} (${ALL_ROUTES.length} URLs, ${PRODUCT_ROUTES.length} of them product pages)`
    : "[seo] VITE_SITE_URL not set — robots.txt written without a sitemap."
);
