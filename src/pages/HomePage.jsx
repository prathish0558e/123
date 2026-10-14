import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DressShop from "../components/DressShop.jsx";
import Marquee from "../components/Marquee.jsx";
import { Reveal, SectionHead, useCountUp } from "../components/Reveal.jsx";
import useSeo from "../lib/useSeo.js";
import { siteUrlFor } from "../lib/seo.js";
import { fetchDresses, fetchPricing, inr, useLiveCatalog } from "../lib/shop.js";
import { STATS, VALUES, TESTIMONIALS, COMPANY } from "../data/content.js";
import heroVideo from "../../hero-bg.mp4";

function Stat({ value, suffix, label, plain }) {
  const [ref, n] = useCountUp(value);
  return (
    <div className="stat" ref={ref}>
      <span className="num">
        {plain ? value : n.toLocaleString("en-IN")}
        {!plain && suffix}
      </span>
      <span className="lbl">{label}</span>
    </div>
  );
}

/* ---------- Home hero — boutique over a cinematic shade ---------- */
function HeroSection({ minPrice }) {
  return (
    <section className="hero-live" aria-label="TCT Fashion Hub boutique and craft studio">
      <div className="hero-media" aria-hidden="true">
        <img className="hero-poster" src="/images/Tct-front-background.jpeg" alt="" />
        <video
          className="hero-video"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          poster="/images/Tct-front-background.jpeg"
          aria-hidden="true"
        />
        <span className="hero-shade"></span>
      </div>

      <div className="container hero-live-inner">
        <span className="eyebrow on-dark">
          Ganapathy, Coimbatore · Boutique &amp; Craft Studio since {COMPANY.founded}
        </span>
        <h1 className="hero-live-title">
          Dresses Stitched for You{" "}
          <span className="hero-grad">
            from {minPrice ? inr(minPrice) : "Rs 899"}
          </span>
        </h1>
        <p className="hero-live-text">
          A boutique collection of kurtis, sarees, lehengas, gowns and kids wear —
          plus the craft <strong>classes</strong> that taught Coimbatore to make
          them. Stitched to your measurements, ready in days.
        </p>
        <div className="hero-live-actions">
          <a href="#shop" className="btn btn-primary btn-lg">
            Shop the Collection <i className="bi bi-bag-heart"></i>
          </a>
          <Link to="/classes" className="btn btn-lg hs-ghost">
            Craft Classes <i className="bi bi-arrow-right"></i>
          </Link>
        </div>
        <ul className="hero-trust">
          <li>
            <i className="bi bi-rulers"></i> Stitched to your measurements
          </li>
          <li>
            <i className="bi bi-palette"></i> 8 categories, one studio
          </li>
          <li>
            <i className="bi bi-truck"></i> Ready in 3–7 days
          </li>
        </ul>
      </div>
    </section>
  );
}

const HOME_DESCRIPTION =
  "TCT Fashion Hub in Ganapathy, Coimbatore — boutique dresses (kurti, saree, lehenga, blouse, gown, kids wear) stitched to your measurements from Rs 899, plus certified craft classes in tailoring, aari, embroidery and more.";

export default function HomePage() {
  const [dresses, setDresses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [catalogue, prices] = await Promise.all([fetchDresses(), fetchPricing()]);
      setDresses(catalogue.dresses || []);
      setCategories(catalogue.categories || []);
      setPricing(prices);
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

  const minPrice = dresses.length
    ? Math.min(...dresses.map((d) => Number(d.startingPrice) || Infinity))
    : 0;

  const cheapestClass = pricing?.singleClasses?.length
    ? Math.min(...pricing.singleClasses.map((c) => Number(c.price) || Infinity))
    : 0;

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
    title: "TCT Fashion Hub | Boutique Dresses & Craft Classes in Coimbatore",
    description: HOME_DESCRIPTION,
    path: "/",
    image: "/images/Tct-front-background.jpeg",
    jsonLdId: "home-products-jsonld",
    jsonLd: productsJsonLd,
  });

  const marqueeItems = categories.length ? categories : ["Kurti", "Saree", "Lehenga"];

  return (
    <>
      <HeroSection minPrice={minPrice} />

      {/* ---------- Stats ---------- */}
      <div className="stats">
        <div className="container">
          <div className="stats-card">
            {STATS.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </div>

      <Marquee items={marqueeItems} />

      {/* ---------- Boutique: flip cards with starting prices ---------- */}
      <DressShop dresses={dresses} categories={categories} loading={loading} />

      {/* ---------- Classes teaser (the classes now live on /classes) -------- */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Learn a craft"
            title="Want to Make It Yourself?"
            text="The same studio that stitches your outfit also teaches the craft — certified classes with a starter kit gift."
          />
          <Reveal>
            <div className="classes-teaser">
              <div>
                <h3>
                  {pricing?.singleClasses?.length
                    ? `${pricing.singleClasses.length} single classes · ${
                        pricing.comboClasses?.length || 0
                      } combos`
                    : "Tailoring, aari, embroidery & more"}
                </h3>
                <p>
                  {cheapestClass && Number.isFinite(cheapestClass)
                    ? `Classes start at ${inr(cheapestClass)} — every one of them begins with a starter kit gift.`
                    : "Every class begins with a starter kit gift."}
                </p>
              </div>
              <Link to="/classes" className="btn btn-primary">
                See all classes <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Why choose the studio ---------- */}
      <section className="section soft">
        <div className="container">
          <SectionHead
            eyebrow="Why TCT Fashion Hub"
            title="A Studio Built Around You"
            text="Four reasons hundreds of customers and learners in Coimbatore picked us."
          />
          <div className="grid-4">
            {VALUES.map(([icon, title, text], i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="card" style={{ height: "100%" }}>
                  <div className={`fh-icon ${i % 2 ? "fh-icon--warm" : ""}`}>
                    <i className={`bi ${icon}`}></i>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Testimonials" title="What Our Customers Say" />
          <div className="grid-2">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="tst" style={{ height: "100%" }}>
                  <div className="stars">
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                  </div>
                  <blockquote>“{t.quote}”</blockquote>
                  <div className="who">
                    <div className="avatar">
                      {t.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </div>
                    <div>
                      <h4>{t.name}</h4>
                      <small>{t.role}</small>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Quote band — visit / enquire CTA ---------- */}
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
                  <Link to="/login" className="btn btn-primary btn-lg">
                    Login to order <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
              <div className="info-card fh-center" style={{ textAlign: "center" }}>
                <img
                  className="fh-hero-logo"
                  src="/images/Logo.png"
                  alt="TCT Fashion Hub logo"
                  style={{ animation: "none", width: 84, height: 84 }}
                />
                <span className="eyebrow" style={{ justifyContent: "center" }}>
                  {COMPANY.tagline}
                </span>
                <h3 style={{ fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)" }}>
                  Boutique + Academy, One Roof
                </h3>
                <p style={{ color: "var(--muted)", marginBottom: 18 }}>
                  Buy the outfit or learn to make it —{" "}
                  {pricing?.singleClasses?.length || 6} craft classes with kits
                  included, and a boutique that stitches to your measurements.
                </p>
                <a href="#shop" className="btn btn-outline">
                  See the collection <i className="bi bi-arrow-right"></i>
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
