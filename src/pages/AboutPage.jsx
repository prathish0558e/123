import { Link } from "react-router-dom";
import Marquee from "../components/Marquee.jsx";
import useSeo from "../lib/useSeo.js";
import { Reveal, SectionHead, PageHero, useCountUp } from "../components/Reveal.jsx";
import {
  COMPANY,
  CRAFTS,
  STATS,
  VALUES,
  LEADERSHIP,
} from "../data/content.js";

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

export default function AboutPage() {
  useSeo({
    title: "About TCT Fashion Hub | Craft Studio in Ganapathy, Coimbatore",
    description:
      "TCT Fashion Hub is a boutique craft studio in Ganapathy, Coimbatore — 500+ students trained across 7 crafts since 2021, led by CEO Bharath T and MD Mohanapriya K.",
    path: "/about",
    image: "/images/Logo.jpeg",
  });

  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="About TCT Fashion Hub"
        text="Where threads meet tradition — a boutique craft studio in the heart of Coimbatore."
        crumb="About"
      />

      {/* ---------- Story ---------- */}
      <section className="section">
        <div className="container">
          <div className="split">
            <Reveal>
              <span className="eyebrow">Since {COMPANY.founded}</span>
              <h2 style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.5rem)" }}>
                A Studio Built on Patient Hands
              </h2>
              <p style={{ color: "var(--muted)" }}>
                TCT Fashion Hub began as a small tailoring counter and grew
                into one of Coimbatore's most loved craft studios. We've
                trained hundreds of students — from their very first stitch to
                boutique-level aari and resin work.
              </p>
              <p style={{ color: "var(--muted)" }}>
                Our mentors keep batches small so every learner gets the
                attention they deserve, and every course includes materials to
                get you started the same day. Whether you want to stitch your
                own wardrobe, launch a home business, or simply rediscover the
                joy of making things by hand — there's a seat for you here.
              </p>
              <ul className="checklist">
                <li>
                  <i className="bi bi-check-circle-fill"></i> Small batches,
                  personal attention
                </li>
                <li>
                  <i className="bi bi-check-circle-fill"></i> Certified courses
                  with a showcase
                </li>
                <li>
                  <i className="bi bi-check-circle-fill"></i> Starter kit gift
                  for every student
                </li>
                <li>
                  <i className="bi bi-check-circle-fill"></i> Modern + traditional
                  techniques
                </li>
              </ul>
              <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
                <Link to="/login" className="btn btn-primary">
                  Login to order <i className="bi bi-arrow-right"></i>
                </Link>
                <a href={`tel:${COMPANY.phoneRaw}`} className="btn btn-outline">
                  <i className="bi bi-telephone"></i> Call Us
                </a>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="info-card" style={{ textAlign: "center", padding: "34px 26px" }}>
                <img
                  className="fh-hero-logo"
                  src="/images/Logo.png"
                  alt="TCT Fashion Hub emblem"
                  style={{ animation: "none" }}
                />
                <span className="eyebrow" style={{ justifyContent: "center" }}>
                  {COMPANY.tagline}
                </span>
                <blockquote style={{ fontSize: "1.05rem", color: "var(--ink-2)", margin: "6px 0 8px" }}>
                  “The teachers make every technique feel effortless — I joined
                  for tailoring and stayed for aari work.”
                </blockquote>
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  — Priya R., student since 2026
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

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

      {/* ---------- Leadership ---------- */}
      <section className="section soft">
        <div className="container">
          <SectionHead
            eyebrow="Leadership"
            title="The People Behind the Studio"
            text="Two people who keep every batch personal — and every craft taught with care."
          />
          <div className="grid-2" style={{ maxWidth: 900, margin: "0 auto" }}>
            {LEADERSHIP.map((m, i) => (
              <Reveal key={m.name} delay={i * 110}>
                <article className="fh-leader">
                  <div className="fh-leader-photo">
                    <img
                      src={m.image}
                      alt={m.name}
                      loading="lazy"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = "1";
                          e.currentTarget.src = "/images/placeholder.svg";
                        }
                      }}
                    />
                    {m.instagram && (
                      <a
                        className="fh-leader-insta"
                        href={m.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${m.name} on Instagram`}
                        title={`${m.name} on Instagram`}
                      >
                        <i className="bi bi-instagram" aria-hidden="true" />
                      </a>
                    )}
                    <p className="fh-leader-role">{m.role}</p>
                  </div>
                  <div className="fh-leader-body">
                    <h3 className="fh-leader-name">{m.name}</h3>
                    <span className="fh-leader-rule" aria-hidden="true" />
                    <p className="fh-leader-bio">{m.bio}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Values ---------- */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="What we stand for"
            title="The Studio Way"
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

      {/* ---------- Crafts ---------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container fh-center">
          <SectionHead
            eyebrow="Our crafts"
            title="Seven Skills, One Studio"
            text="Every craft is taught hands-on, from the very first day."
          />
          <div className="fh-chips">
            {CRAFTS.map((c) => (
              <span key={c}>
                <i className="bi bi-star" aria-hidden="true" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Marquee
        items={[
          "Certified Courses",
          "Basic Kit Gifts",
          "Expert Mentors",
          "Small Batches",
          "Hands-on Training",
        ]}
      />
    </>
  );
}
