import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SingleClasses from "../components/SingleClasses.jsx";
import ComboClasses from "../components/ComboClasses.jsx";
import { PageHero, Reveal } from "../components/Reveal.jsx";
import useSeo from "../lib/useSeo.js";
import { siteUrlFor } from "../lib/seo.js";
import { fetchPricing, inr, useLiveCatalog } from "../lib/shop.js";
import { COMPANY, CRAFTS } from "../data/content.js";

const DESCRIPTION =
  "Certified craft classes in Ganapathy, Coimbatore — tailoring, embroidery, aari work, jewellery making, saree pre-pleating, mehndi and resin art. Single classes and money-saving combos, every one with a starter kit gift.";

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

      {/* ---------- Boutique cross-sell ---------- */}
      <section className="section soft">
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
