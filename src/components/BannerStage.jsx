import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { inr } from "../lib/shop.js";
import { artFor } from "../data/categoryArt.js";

/*
 * The marketplace banner stage: one wide, auto-rotating promo carousel with two
 * standing companion cards beside it — the shape every Indian shopper already
 * knows from Flipkart, drawn in this studio's own colours.
 *
 * Every slide is built from the LIVE catalogue (the deepest discount, the
 * biggest category, the studio's made-to-measure promise) so the band can never
 * advertise something the shop no longer sells, and it carries no academy
 * information — home is the boutique only.
 *
 * It rotates on a timer, but stops for a hover, for keyboard focus, and
 * entirely for anyone who asked for reduced motion.
 */

const ROTATE_MS = 5600;

function discountOf(dress) {
  const price = Number(dress.startingPrice) || 0;
  const mrp = Number(dress.mrp) || 0;
  if (!price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

function cheapestOf(dresses) {
  const prices = dresses.map((d) => Number(d.startingPrice) || 0).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : 0;
}

export default function BannerStage({ dresses = [], categories = [] }) {
  const slides = useMemo(() => {
    const list = [];

    /* 1. The deepest real discount in the shop. */
    const best = [...dresses]
      .map((dress) => ({ dress, off: discountOf(dress) }))
      .sort((a, b) => b.off - a.off)[0];

    if (best && best.off > 0) {
      list.push({
        id: "deal",
        tag: `${best.off}% off`,
        tone: "deal",
        title: best.dress.name,
        text: `Was ${inr(best.dress.mrp)} — now from ${inr(
          best.dress.startingPrice
        )}, stitched to your measurements.`,
        image: best.dress.image,
        to: `/shop/${best.dress.id}`,
        cta: "Grab this offer",
      });
    }

    /* 2. The category with the most to choose from. */
    if (categories.length) {
      const counts = new Map();
      dresses.forEach((d) => counts.set(d.category, (counts.get(d.category) || 0) + 1));
      const [topCat] = [...categories].sort(
        (a, b) => (counts.get(b) || 0) - (counts.get(a) || 0)
      );
      const inCat = dresses.filter((d) => d.category === topCat);
      const from = cheapestOf(inCat);
      list.push({
        id: "category",
        tag: "Bestselling category",
        tone: "category",
        title: `Shop ${topCat}`,
        text: `${inCat.length || "Several"} ${
          inCat.length === 1 ? "design" : "designs"
        } in the studio right now${from ? ` — from ${inr(from)}` : ""}.`,
        image: artFor(topCat),
        to: `/shop?cat=${encodeURIComponent(topCat)}`,
        cta: `Browse ${topCat}`,
      });
    }

    /* 3. The service promise — no product needed. */
    list.push({
      id: "measure",
      tag: "Made to measure",
      tone: "service",
      title: "Stitched for Your Measurements",
      text: "Send us three numbers and the outfit comes back fitting like it was drawn on you. Free delivery across India, cash on delivery available.",
      image: "/images/Tct-front-background.jpeg",
      to: "/enquire",
      cta: "Start your order",
    });

    return list;
  }, [dresses, categories]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrapper = useRef(null);

  const go = useCallback(
    (next) => setIndex((current) => (next + slides.length) % slides.length),
    [slides.length]
  );

  /* Auto-rotate, unless paused, off-screen or reduced-motion. */
  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return undefined;

    const id = setInterval(() => {
      /* Don't animate a band nobody is looking at. */
      const el = wrapper.current;
      if (el) {
        const box = el.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
      }
      go(index + 1);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [go, index, paused, slides.length]);

  /* Off-screen slides are inert, so rewind past them cleanly. */
  if (!slides.length) return null;

  const cheapest = cheapestOf(dresses);

  return (
    <section className="banner-stage" aria-label="Offers and highlights">
      <div className="container banner-grid">
        <div
          className="banner-carousel"
          ref={wrapper}
          role="group"
          aria-roledescription="carousel"
          aria-label="Studio highlights"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="banner-track">
            {slides.map((slide, i) => (
              <article
                key={slide.id}
                className={`bslide bslide--${slide.tone} ${
                  i === index ? "is-active" : ""
                }`}
                aria-hidden={i !== index}
              >
                <img
                  className="bslide-art"
                  src={slide.image}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  aria-hidden="true"
                />
                <span className="bslide-scrim" aria-hidden="true" />
                <div className="bslide-body">
                  <span className="bslide-tag">{slide.tag}</span>
                  <h3>{slide.title}</h3>
                  <p>{slide.text}</p>
                  <Link
                    to={slide.to}
                    className="btn btn-primary"
                    tabIndex={i === index ? 0 : -1}
                  >
                    {slide.cta} <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                className="banner-arrow banner-arrow--prev"
                onClick={() => go(index - 1)}
                aria-label="Previous highlight"
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="banner-arrow banner-arrow--next"
                onClick={() => go(index + 1)}
                aria-label="Next highlight"
              >
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
              <div className="banner-dots" role="tablist" aria-label="Choose a highlight">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={slide.title}
                    className={`banner-dot ${i === index ? "is-active" : ""}`}
                    onClick={() => go(i)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Companion cards — the standing offers beside the carousel. */}
        <aside className="banner-side">
          <Link to="/shop" className="bside-card bside-card--price">
            <span className="bside-ic">
              <i className="bi bi-tags-fill" aria-hidden="true" />
            </span>
            <strong>Boutique from {cheapest ? inr(cheapest) : "Rs 899"}</strong>
            <small>Kurtis, sarees, lehengas, gowns &amp; kids wear</small>
            <span className="bside-go">
              Shop the collection <i className="bi bi-arrow-right" aria-hidden="true" />
            </span>
          </Link>

          <Link to="/enquire" className="bside-card bside-card--service">
            <span className="bside-ic">
              <i className="bi bi-scissors" aria-hidden="true" />
            </span>
            <strong>Custom stitching</strong>
            <small>Free delivery + cash on delivery, anywhere in India</small>
            <span className="bside-go">
              Tell us your design <i className="bi bi-arrow-right" aria-hidden="true" />
            </span>
          </Link>
        </aside>
      </div>
    </section>
  );
}
