import { useEffect } from "react";
import { applySeo, setJsonLd, siteUrlFor } from "./seo.js";

/**
 * useSeo — applies the per-page tags as soon as a route renders.
 * Keeps title/description/canonical/OG in sync with the visible page, and
 * removes any page-scoped JSON-LD block from the previous route.
 */
export default function useSeo({
  title,
  description,
  path = "/",
  image,
  robots,
  jsonLdId,
  jsonLd,
}) {
  useEffect(() => {
    applySeo({ title, description, path, image, robots });
    setJsonLd(jsonLdId || "page-jsonld", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path]);

  useEffect(() => {
    if (jsonLdId && jsonLd) setJsonLd(jsonLdId, jsonLd);
    return () => setJsonLd(jsonLdId || "page-jsonld", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonLdId, jsonLd]);
}

export { siteUrlFor };
