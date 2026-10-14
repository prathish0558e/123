/*
 * Public boutique API.
 *
 * The boutique (dresses) and the craft classes both come from the backend
 * catalogue that the admin panel edits. So the site never needs a rebuild to
 * show a change — it polls /api/catalog/version (a few bytes) and re-fetches
 * the collection only when the version actually moves.
 */
import { useEffect, useRef } from "react";

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Every visible dress, newest catalogue version. */
export const fetchDresses = () => getJson("/api/dresses");

/** Studio details + single classes + combos. */
export const fetchPricing = () => getJson("/api/pricing");

/**
 * Calls `onChange` whenever the admin panel saves something.
 * Cheap: one tiny GET every `intervalMs`, plus an immediate check whenever the
 * visitor comes back to the tab.
 */
export function useLiveCatalog(onChange, { intervalMs = 10000 } = {}) {
  const seen = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { version, updatedAt } = await getJson("/api/catalog/version");
        const token = `${version}:${updatedAt}`;
        if (cancelled) return;
        if (seen.current === null) {
          seen.current = token; // first look: nothing to refresh yet
          return;
        }
        if (token !== seen.current) {
          seen.current = token;
          cb.current?.();
        }
      } catch {
        /* server restarting / offline — try again on the next tick */
      }
    };

    const id = setInterval(check, intervalMs);
    const onFocus = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    check();

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
}

/** "Rs 899" — Indian grouping, no decimals. */
export const inr = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
