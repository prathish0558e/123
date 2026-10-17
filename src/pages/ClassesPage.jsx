import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SingleClasses from "../components/SingleClasses.jsx";
import ComboClasses from "../components/ComboClasses.jsx";
import { PageHero, Reveal, SectionHead, useCountUp } from "../components/Reveal.jsx";
import useSeo from "../lib/useSeo.js";
import { siteUrlFor } from "../lib/seo.js";
import { fetchPricing, inr, useLiveCatalog } from "../lib/shop.js";
import { COMPANY, CRAFTS, STATS, TESTIMONIALS } from "../data/content.js";

const DESCRIPTION =
  "Certified craft classes in Ganapathy, Coimbatore — tailoring, embroidery, aari work, jewellery making, saree pre-pleating, mehndi and resin art. Single classes and money-saving combos, every one with a starter kit gift.";

/*
 * The studio's track record. These numbers belong on the academy page only —
 * the home page stays a boutique, so a shopper never meets class figures while
 * browsing dresses.
 */
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

export default function ClassesPage() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPricing(await fetchPricing());
    } catch {
      setPricing({ singleClasses: [], comboClasses: [], studio: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live: a price the admin changes appears here within seconds.
  useLiveCatalog(load);

  const cheapest = pricing?.singleClasses?.length
    ? Math.min(...pricing.singleClasses.map((c) => Number(c.price) || Infinity))
    : 0;

  /* Course schema for the classes — always in sync with the live prices. */
  const coursesJsonLd = useMemo(() => {
    if (!pricing?.singleClasses?.length) return null;
    const url = siteUrlFor("/");
    const provider = {
      "@type": "EducationalOrganization",
      name: COMPANY.name,
      ...(url ? { url } : {}),
    };
    const toCourse = (c, isCombo) => ({
      "@type": "Course",
      name: c.name,
      description: `${c.duration} · ${c.level}. ${c.gift}`,
      provider,
      offers: {
        "@type": "Offer",
        price: String(isCombo ? c.total : c.price),
        priceCurrency: "INR",
        ...(url ? { url: siteUrlFor("/enquire") } : {}),
      },
    });
    const items = [
      ...pricing.singleClasses.map((c) => toCourse(c, false)),
      ...(pricing.comboClasses || []).map((c) => toCourse(c, true)),
    ];
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Craft classes & combo offers",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item,
      })),
    };
  }, [pricing]);

  useSeo({
    title: "Craft Classes in Coimbatore | Tailoring, Aari, Embroidery — TCT Fashion Hub",
    description: DESCRIPTION,
    path: "/classes",
    image: "/images/Tct-front-background.jpeg",
    jsonLdId: "classes-courses-jsonld",
    jsonLd: coursesJsonLd,
  });

  return (
    <>
      <PageHero
        eyebrow="Craft classes"
        title="Learn a Craft That Lasts"
        text={
          cheapest && Number.isFinite(cheapest)
            ? `Small-batch, mentor-led classes from ${inr(cheapest)} — every enrolment comes with a starter kit gift.`
            : "Small-batch, mentor-led classes — every enrolment comes with a starter kit gift."
        }
        crumb="Classes"
      />

      {/* ---------- Crafts strip ---------- */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <Reveal>
            <ul className="craft-strip">
              {CRAFTS.map((c) => (
                <li key={c}>
                  <i className="bi bi-scissors" aria-hidden="true"></i> {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------- Studio record: who has already trained here ---------- */}
      <div className="stats">
        <div className="container">
          <div className="stats-card">
            {STATS.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fh-loading">
          <i className="bi bi-arrow-repeat" aria-label="Loading classes"></i>
        </div>
      ) : (
        <>
          <SingleClasses classes={pricing?.singleClasses || []} />
          <ComboClasses combos={pricing?.comboClasses || []} />
        </>
      )}

      {/* ---------- What our students say ---------- */}
      <section className="section soft">
        <div className="container">
          <SectionHead eyebrow="Testimonials" title="What Our Students Say" />
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

      {/* ---------- Boutique cross-sell ---------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="classes-teaser">
              <div>
                <span className="eyebrow">Not ready to stitch yet?</span>
                <h3>Buy the outfit instead</h3>
                <p>
                  Our boutique stitches kurtis, sarees, lehengas, blouses, gowns and
                  kids wear to your measurements — starting at Rs 899.
                </p>
              </div>
              <Link to="/" className="btn btn-primary">
                Shop the collection <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
