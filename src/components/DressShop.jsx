import { useMemo, useState } from "react";
import DressFlipCard from "./DressFlipCard.jsx";
import { SectionHead } from "./Reveal.jsx";
import { inr } from "../lib/shop.js";

/*
 * The boutique collection.
 *
 * Everything is driven by the live catalogue (props come from the parent, which
 * keeps them fresh through useLiveCatalog) — search, category and price filters
 * and sorting are pure client-side so browsing stays instant.
 */
const SORTS = {
  featured: "Featured first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name (A–Z)",
};

/* Shorthand price buckets — the question a shopper actually asks first. */
const BANDS = [
  { id: "all", label: "Any price", test: () => true },
  { id: "u1000", label: "Under Rs 1,000", test: (p) => p > 0 && p < 1000 },
  { id: "1-5k", label: "Rs 1k – 5k", test: (p) => p >= 1000 && p <= 5000 },
  { id: "5-15k", label: "Rs 5k – 15k", test: (p) => p > 5000 && p <= 15000 },
  { id: "15k+", label: "Rs 15k +", test: (p) => p > 15000 },
];

function SkeletonCard() {
  return (
    <div className="sk-card" aria-hidden="true">
      <div className="sk-thumb" />
      <div className="sk-body">
        <span className="sk-line sk-line--sm" />
        <span className="sk-line" />
        <span className="sk-line sk-line--price" />
      </div>
    </div>
  );
}

export default function DressShop({ dresses = [], categories = [], loading = false }) {
  const [category, setCategory] = useState("All");
  const [band, setBand] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");

  const activeBand = BANDS.find((b) => b.id === band) || BANDS[0];

  const matches = (d) => {
    if (category !== "All" && d.category !== category) return false;
    if (!activeBand.test(Number(d.startingPrice) || 0)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [d.name, d.category, d.fabric, ...(d.colors || []), ...(d.sizes || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  };

  const visible = useMemo(() => {
    const list = dresses.filter(matches);
    const byName = (a, b) => String(a.name).localeCompare(String(b.name));
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => a.startingPrice - b.startingPrice || byName(a, b));
      case "price-desc":
        return list.sort((a, b) => b.startingPrice - a.startingPrice || byName(a, b));
      case "name":
        return list.sort(byName);
      default:
        return list.sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || byName(a, b)
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dresses, category, band, query, sort]);

  const prices = dresses.map((d) => Number(d.startingPrice) || 0).filter((p) => p > 0);
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const filtersActive = category !== "All" || band !== "all" || query.trim() !== "";
  const resetAll = () => {
    setCategory("All");
    setBand("all");
    setQuery("");
  };

  const bandCount = (b) => dresses.filter((d) => b.test(Number(d.startingPrice) || 0)).length;

  return (
    <section id="shop" className="section soft">
      <div className="container">
        <SectionHead
          eyebrow="The boutique"
          title="Our Dress Collection"
          text={
            dresses.length
              ? `${dresses.length} designs in the studio right now — starting at ${
                  cheapest ? inr(cheapest) : "—"
                }. Tap any card to flip it and see sizes, colours and the full price range.`
              : "Stitched to your measurements in Ganapathy, Coimbatore."
          }
        />

        <div className="shop-toolbar">
          <div className="shop-search">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a dress, colour or fabric…"
              aria-label="Search the collection"
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            ) : null}
          </div>

          <label className="shop-sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="shop-facets">
          <div className="shop-facet" role="group" aria-label="Filter by category">
            <span className="shop-facet-label">Category</span>
            <div className="shop-filters">
              {["All", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`shop-chip ${category === c ? "is-active" : ""}`}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                  <span>
                    {c === "All"
                      ? dresses.length
                      : dresses.filter((d) => d.category === c).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="shop-facet" role="group" aria-label="Filter by price">
            <span className="shop-facet-label">Price</span>
            <div className="shop-filters">
              {BANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`shop-chip shop-chip--price ${
                    band === b.id ? "is-active" : ""
                  }`}
                  aria-pressed={band === b.id}
                  onClick={() => setBand(b.id)}
                >
                  {b.label}
                  <span>{bandCount(b)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dress-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : visible.length ? (
          <>
            <div className="shop-status">
              <p>
                Showing <strong>{visible.length}</strong> of {dresses.length} designs
                {category !== "All" ? ` · ${category}` : ""}
                {band !== "all" ? ` · ${activeBand.label}` : ""}
              </p>
              {filtersActive ? (
                <button type="button" className="shop-clear" onClick={resetAll}>
                  <i className="bi bi-x-circle" aria-hidden="true"></i> Clear filters
                </button>
              ) : null}
            </div>

            <div className="dress-grid">
              {visible.map((dress, i) => (
                <DressFlipCard key={dress.id} dress={dress} delay={(i % 3) * 60} />
              ))}
            </div>
          </>
        ) : (
          <div className="shop-empty">
            <i className="bi bi-bag-heart" aria-hidden="true"></i>
            <h3>No designs match that combination</h3>
            <p>
              Try a wider price range — or tell us what you have in mind and we will
              stitch it for you.
            </p>
            <button type="button" className="btn btn-outline" onClick={resetAll}>
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
