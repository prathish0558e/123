import { useEffect, useRef, useState } from "react";

// Advanced gold-glass dropdown that replaces the native <select>.
// Groups Single Classes, Combos and the boutique (dresses), shows the live
// prices from the catalogue the admin panel edits, and keeps the same form
// contract: the parent still reads e.target.name === "interest" / value via
// onChange.
export default function ClassSelect({ name, value, onChange, invalid }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pricing, setPricing] = useState({ singleClasses: [], comboClasses: [] });
  const [dresses, setDresses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef(null);
  const searchRef = useRef(null);

  // Live prices from the single source of truth (hot-reload friendly)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/pricing").then((r) => r.json()),
      fetch("/api/dresses")
        .then((r) => r.json())
        .catch(() => ({ dresses: [] })),
    ])
      .then(([d, catalogue]) => {
        if (cancelled) return;
        setPricing({
          singleClasses: d.singleClasses || [],
          comboClasses: d.comboClasses || [],
        });
        setDresses(catalogue.dresses || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the search field when the panel opens
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const q = query.trim().toLowerCase();
  const singles = pricing.singleClasses.filter((c) =>
    c.name.toLowerCase().includes(q)
  );
  const combos = pricing.comboClasses.filter((c) =>
    c.name.toLowerCase().includes(q)
  );
  const outfitOptions = dresses.filter((d) =>
    `${d.name} ${d.category}`.toLowerCase().includes(q)
  );

  const pick = (name_) => {
    onChange({ target: { name, value: name_ } });
    setOpen(false);
    setQuery("");
  };

  const fmt = (n) => Number(n).toLocaleString("en-IN");

  return (
    <div className={`tct-class-select${invalid ? " tct-select-error" : ""}`} ref={boxRef}>
      <button
        type="button"
        className={`tct-class-select__trigger${value ? " has-value" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "" : "tct-class-select__placeholder"}>
          {value || "Select class or dress"}
        </span>
        <i className={`bi bi-chevron-down tct-class-select__chev${open ? " is-open" : ""}`} />
      </button>

      <div className={`tct-class-select__panel${open ? " is-open" : ""}`} role="listbox">
        <div className="tct-class-select__search">
          <i className="bi bi-search" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search classes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="tct-class-select__list">
          {singles.length > 0 && (
            <p className="tct-class-select__group">Single Classes</p>
          )}
          {singles.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`tct-class-select__opt${value === c.name ? " is-active" : ""}`}
              onClick={() => pick(c.name)}
              role="option"
              aria-selected={value === c.name}
            >
              <span className="tct-class-select__name">{c.name}</span>
              <span className="tct-class-select__price">
                Rs {fmt(c.price)} · {c.duration}
              </span>
            </button>
          ))}

          {combos.length > 0 && (
            <p className="tct-class-select__group">Combo Classes</p>
          )}
          {combos.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`tct-class-select__opt${value === c.name ? " is-active" : ""}`}
              onClick={() => pick(c.name)}
              role="option"
              aria-selected={value === c.name}
            >
              <span className="tct-class-select__name">
                {c.badge && <em className="tct-class-select__badge">{c.badge}</em>}
                {c.name}
              </span>
              <span className="tct-class-select__price">
                Rs {fmt(c.total)} · {c.duration}
              </span>
            </button>
          ))}

          {outfitOptions.length > 0 && (
            <p className="tct-class-select__group">Boutique — dresses</p>
          )}
          {outfitOptions.map((d) => (
            <button
              type="button"
              key={d.id}
              className={`tct-class-select__opt${value === d.name ? " is-active" : ""}`}
              onClick={() => pick(d.name)}
              role="option"
              aria-selected={value === d.name}
            >
              <span className="tct-class-select__name">{d.name}</span>
              <span className="tct-class-select__price">
                Rs {fmt(d.startingPrice)} onwards
              </span>
            </button>
          ))}

          {loaded &&
            singles.length === 0 &&
            combos.length === 0 &&
            outfitOptions.length === 0 && (
              <p className="tct-class-select__empty">
                Nothing matches “{query}”.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
