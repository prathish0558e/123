import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BannerStage from "../components/BannerStage.jsx";
import DealsRail from "../components/DealsRail.jsx";
import DressShop from "../components/DressShop.jsx";
import Marquee from "../components/Marquee.jsx";
import { Reveal, SectionHead } from "../components/Reveal.jsx";
import useSeo from "../lib/useSeo.js";
import { siteUrlFor } from "../lib/seo.js";
import { fetchDresses, inr, useLiveCatalog } from "../lib/shop.js";
import { COMPANY } from "../data/content.js";
import { artFor } from "../data/categoryArt.js";

/*
 * Home is the shop window, and only the shop window: the collection, the
 * categories and the studio promise. Everything about the academy — the class
 * list, its prices, its numbers and its student reviews — lives on /classes so
 * the boutique reads as a clean, premium storefront.
 */

/* ---------- Home hero — boutique banner, no video, no clutter ---------- */
const TRUST = [
  { icon: "bi-cash-coin", title: "Cash on Delivery", text: "Pay when it arrives" },
  { icon: "bi-arrow-repeat", title: "1-day return", text: "Size or damage only" },
  { icon: "bi-truck", title: "Free delivery", text: "Anywhere in India" },
  { icon: "bi-rulers", title: "Made to measure", text: "Stitched for you" },
];

function HeroSection({ minPrice, categories }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");

  /* The hero search is the front door: it hands the query to /shop, which
     owns the filters (and keeps them in the URL). */
  const search = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (term.trim()) params.set("q", term.trim());
    if (category) params.set("cat", category);
    const qs = params.toString();
    navigate(qs ? `/shop?${qs}` : "/shop");
  };

  return (
    <section className="hero-live hero-premium" aria-label="TCT Fashion Hub boutique">
      <div className="hero-media" aria-hidden="true">
        <img
          className="hero-poster"
          src="/images/Tct-front-background.jpeg"
          alt=""
          decoding="async"
        />
        <span className="hero-shade"></span>
      </div>

      <div className="container hero-live-inner">
        <span className="hero-pill">
          <i className="bi bi-patch-check-fill" aria-hidden="true" />
          Ganapathy, Coimbatore · Boutique &amp; Craft Studio since {COMPANY.founded}
        </span>
        <h1 className="hero-live-title">
          Dresses Stitched for You{" "}
          <span className="hero-grad">
            from {minPrice ? inr(minPrice) : "Rs 899"}
          </span>
        </h1>
        <p className="hero-live-text">
          Kurtis, sarees, lehengas, gowns and kids wear — cut to your
          measurements, hand-finished in our Coimbatore studio and delivered in
          days.
        </p>

        <form className="hero-search" role="search" onSubmit={search}>
          <label className="hero-search-cat">
            <i className="bi bi-grid" aria-hidden="true" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Search in category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search kurti, saree, lehenga, blouse…"
            aria-label="Search the boutique collection"
          />
          <button type="submit" className="btn btn-primary">
            <i className="bi bi-search" aria-hidden="true" /> Search
          </button>
        </form>

        {categories.length ? (
          <div className="hero-cats" aria-label="Shop by category">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => navigate(`/shop?cat=${encodeURIComponent(c)}`)}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <div className="hero-live-actions">
          <Link to="/shop" className="btn btn-primary btn-lg">
            Shop the Collection <i className="bi bi-bag-heart"></i>
          </Link>
          <Link to="/classes" className="btn btn-lg hs-ghost">
            Craft Classes <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        <ul className="hero-trust">
          <li>
            <i className="bi bi-rulers"></i> Stitched to your measurements
          </li>
          <li>
            <i className="bi bi-truck"></i> Ready in 3–7 days
          </li>
          <li>
            <i className="bi bi-cash-coin"></i> Cash on delivery
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ---------- Marketplace-style promise strip ---------- */
function TrustStrip() {
  return (
    <section className="promise-strip" aria-label="Why shop with us">
      <div className="container promise-grid">
        {TRUST.map((item) => (
          <div className="promise" key={item.title}>
            <span className="promise-ic">
              <i className={`bi ${item.icon}`} aria-hidden="true" />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Category rail — the front door of a marketplace ---------- */
function CategoryRail({ categories, dresses }) {
  const navigate = useNavigate();
  const stats = useMemo(() => {
    const map = new Map();
    dresses.forEach((d) => {
      const entry = map.get(d.category) || { count: 0, from: 0 };
      const price = Number(d.startingPrice) || 0;
      entry.count += 1;
      if (price > 0 && (!entry.from || price < entry.from)) entry.from = price;
      map.set(d.category, entry);
    });
    return map;
  }, [dresses]);

  if (!categories.length) return null;

  return (
    <section className="section cat-rail-section" aria-label="Shop by category">
      <div className="container">
        <SectionHead
          eyebrow="Browse"
          title="Shop by Category"
          text="Eight crafts the studio stitches by hand — pick a shelf to start browsing."
          action={
            <Link to="/shop" className="section-action">
              View all <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          }
        />
        <Reveal>
          <ul className="cat-rail">
            {categories.map((c) => {
              const stat = stats.get(c) || { count: 0, from: 0 };
              return (
                <li key={c}>
                  <button
                    type="button"
                    className="cat-tile"
                    onClick={() => navigate(`/shop?cat=${encodeURIComponent(c)}`)}
                  >
                    <span className="cat-tile-art">
                      {/* These are tiny SVGs and the rail scrolls sideways on
                          phones — lazy loading would leave blank circles until
                          the shopper swipes, so they load with the page. */}
                      <img src={artFor(c)} alt="" decoding="async" />
                    </span>
                    <span className="cat-tile-mark" aria-hidden="true">
                      <i className="bi bi-arrow-right" />
                    </span>
                    <span className="cat-tile-name">{c}</span>
                    <span className="cat-tile-from">
                      {stat.from ? `From ${inr(stat.from)}` : "Ask for a quote"}
                    </span>
                    <span className="cat-tile-count">
                      {stat.count} {stat.count === 1 ? "design" : "designs"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Spotlight — one design, treated like a marketplace deal ---------- */
function Spotlight({ dress }) {
  if (!dress) return null;
  const price = Number(dress.startingPrice) || 0;
  const mrp = Number(dress.mrp) || 0;
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <section className="section soft" aria-label="Design in the spotlight">
      <div className="container">
        <Reveal>
          <div className="spotlight">
            <div className="spotlight-media">
              <img src={dress.image} alt={dress.name} loading="lazy" decoding="async" />
              {off > 0 ? <span className="spotlight-off">{off}% off</span> : null}
            </div>
            <div className="spotlight-body">
              <span className="eyebrow">In the spotlight</span>
              <h2>{dress.name}</h2>
              <p className="spotlight-cat">{dress.category}{dress.fabric ? ` · ${dress.fabric}` : ""}</p>
              {dress.description ? (
                <p className="spotlight-text">{dress.description}</p>
              ) : (
                <p className="spotlight-text">
                  Stitched to your measurements in our Ganapathy studio and
                  delivered free anywhere in India.
                </p>
              )}
              <div className="spotlight-price">
                <strong>{inr(price)}</strong>
                {mrp > price ? <s>{inr(mrp)}</s> : null}
                <small>Free delivery · COD available</small>
              </div>
              <div className="spotlight-actions">
                <Link to={`/shop/${dress.id}`} className="btn btn-primary btn-lg">
                  Pick your size <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
                <Link to="/shop" className="btn btn-lg btn-outline">
                  See the collection
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* Jewellery and dupattas are accessories, not a garment price point — the hero
   promises "dresses from Rs …", so it must quote a dress, not a Rs 399 stud. */
const ACCESSORY_CATEGORIES = new Set(["Jewellery", "Dupatta"]);

const HOME_DESCRIPTION =
  "TCT Fashion Hub in Ganapathy, Coimbatore — boutique dresses (kurti, saree, lehenga, blouse, gown, kids wear) stitched to your measurements from Rs 899, with free delivery and cash on delivery across India.";

export default function HomePage() {
  const [dresses, setDresses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const catalogue = await fetchDresses();
      setDresses(catalogue.dresses || []);
      setCategories(catalogue.categories || []);
    } catch {
      setDresses([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // An admin edit lands on this page within seconds — no refresh needed.
  useLiveCatalog(load);

  const garmentPrices = dresses
    .filter((d) => !ACCESSORY_CATEGORIES.has(d.category))
    .map((d) => Number(d.startingPrice) || 0)
    .filter((p) => p > 0);

  const minPrice = garmentPrices.length ? Math.min(...garmentPrices) : 0;

  const spotlight = useMemo(
    () => dresses.find((d) => d.featured) || dresses[0] || null,
    [dresses]
  );

  /* Products schema — Google gets the same starting prices the shopper sees. */
  const productsJsonLd = useMemo(() => {
    if (!dresses.length) return null;
    const url = siteUrlFor("/");
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "TCT Fashion Hub boutique collection",
      itemListElement: dresses.slice(0, 24).map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: d.name,
          category: d.category,
          description: d.description,
          image: d.image?.startsWith("/") && url ? `${siteUrlFor(d.image)}` : undefined,
          brand: { "@type": "Brand", name: COMPANY.name },
          offers: {
            "@type": "Offer",
            price: String(d.startingPrice),
            priceCurrency: "INR",
            availability:
              d.inStock === false
                ? "https://schema.org/PreOrder"
                : "https://schema.org/InStock",
            ...(url ? { url } : {}),
          },
        },
      })),
    };
  }, [dresses]);

  useSeo({
    title: "TCT Fashion Hub | Boutique Dresses in Coimbatore — Stitched to Measure",
    description: HOME_DESCRIPTION,
    path: "/",
    image: "/images/Tct-front-background.jpeg",
    jsonLdId: "home-products-jsonld",
    jsonLd: productsJsonLd,
  });

  const marqueeItems = categories.length ? categories : ["Kurti", "Saree", "Lehenga"];

  return (
    <>
      <HeroSection minPrice={minPrice} categories={categories} />

      <TrustStrip />

      <CategoryRail categories={categories} dresses={dresses} />

      <BannerStage dresses={dresses} categories={categories} />

      <DealsRail dresses={dresses} />

      <Marquee items={marqueeItems} />

      {/* ---------- The collection ---------- */}
      <DressShop dresses={dresses} categories={categories} loading={loading} variant="home" />

      {!loading && dresses.length ? (
        <div className="container shop-more">
          <Link to="/shop" className="btn btn-outline btn-lg">
            View the full collection <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <Spotlight dress={spotlight} />

      {/* ---------- Academy doorway — no class details on home ---------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="academy-band">
              <div className="academy-copy">
                <span className="eyebrow">The academy</span>
                <h2>Prefer to Make It Yourself?</h2>
                <p>
                  The same studio that stitches your outfit also teaches the
                  craft. Classes, combos and batch timings are on their own page.
                </p>
              </div>
              <Link to="/classes" className="btn btn-primary btn-lg">
                Explore craft classes <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Visit / enquire CTA ---------- */}
      <section className="section" style={{ paddingTop: 0, paddingBottom: 40 }}>
        <div className="container">
          <Reveal>
            <div className="quote-band">
              <div>
                <span className="eyebrow on-dark">Visit the studio</span>
                <h2>Found Something You Love?</h2>
                <p>
                  Send us the design you have in mind — we will share fabric
                  options, exact pricing and delivery timing. No pressure, no
                  hidden charges.
                </p>
                <div className="contact-line">
                  <div className="ic">
                    <i className="bi bi-telephone"></i>
                  </div>
                  <div>
                    <h5>Call or WhatsApp</h5>
                    <p>
                      {COMPANY.phone} · {COMPANY.hours}
                    </p>
                  </div>
                </div>
                <div className="contact-line">
                  <div className="ic">
                    <i className="bi bi-geo-alt"></i>
                  </div>
                  <div>
                    <h5>Visit the studio</h5>
                    <p>{COMPANY.addressShort} — near ICICI Bank</p>
                  </div>
                </div>
                <div
                  className="hero-live-actions"
                  style={{ justifyContent: "flex-start", marginTop: 22 }}
                >
                  <Link to="/shop" className="btn btn-primary btn-lg">
                    Shop the collection <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
              <div className="info-card fh-center" style={{ textAlign: "center" }}>
                <span className="eyebrow" style={{ justifyContent: "center" }}>
                  {COMPANY.tagline}
                </span>
                <h3 style={{ fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)" }}>
                  Boutique + Academy, One Roof
                </h3>
                <p style={{ color: "var(--muted)", marginBottom: 18 }}>
                  Buy the outfit or learn to make it — both live under one roof
                  in Ganapathy, Coimbatore.
                </p>
                <Link to="/classes" className="btn btn-outline">
                  See the classes <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
