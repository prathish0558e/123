/*
 * Tiny SEO core for the SPA.
 *
 * Vite serves one index.html for every route, so the per-page tags (title,
 * description, canonical, social tags) are applied by each page through
 * useSeo(). The absolute URL parts (canonical / og:url / og:image) come from
 * VITE_SITE_URL — when that is not configured yet, the relative-free tags are
 * still applied and the absolute ones are skipped instead of emitting junk.
 */

export const SITE_URL = String(import.meta.env.VITE_SITE_URL || "")
  .trim()
  .replace(/\/+$/, "");

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Absolute site URL for a path — "" when the domain is not configured. */
export function siteUrlFor(path = "/") {
  if (!SITE_URL) return "";
  const clean = `/${String(path || "/").replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
  return `${SITE_URL}${clean === "/" ? "/" : clean.replace(/\/$/, "")}`;
}

/**
 * Apply the SEO tag set for the current route.
 * `image` must be a site-relative path (e.g. "/images/Logo.jpeg").
 */
export function applySeo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  robots = "index, follow",
}) {
  if (title) document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "robots", robots);

  const canonical = siteUrlFor(path);
  setLink("canonical", canonical || undefined);

  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:type", type);
  if (canonical) setMeta("property", "og:url", canonical);
  if (canonical && image) setMeta("property", "og:image", siteUrlFor(image));

  setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  if (image && canonical) setMeta("name", "twitter:image", siteUrlFor(image));
}

/** Replace (or remove) a <script type="application/ld+json"> by id. */
export function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  const json = JSON.stringify(data);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = json;
}
