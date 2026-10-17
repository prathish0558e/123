import { Link } from "react-router-dom";
import { COMPANY } from "../data/content.js";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Shop the Collection", to: "/shop" },
  { label: "Craft Classes", to: "/classes" },
  { label: "About the Studio", to: "/about" },
  { label: "My Orders", to: "/account" },
  /* No public /admin link — the studio panel is direct-URL only. */
];

const POLICY_LINKS = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Return & Refund Policy", to: "/returns" },
  { label: "Terms of Service", to: "/terms" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-about">
          <span className="logo-art">
            <img
              src="/images/Logo.png"
              alt="TCT Fashion Hub logo"
              className="brand-img"
            />
          </span>
          <h3>TCT Fashion Hub</h3>
          <p className="tag">Where Threads Meet Tradition · Coimbatore</p>
          <p>
            A boutique and craft studio in Ganapathy, Coimbatore since{" "}
            {COMPANY.founded} — dresses, sarees, lehengas and blouses stitched to
            your measurements, and classes in tailoring, embroidery, aari work,
            jewellery, saree pre-pleating, mehndi and resin art.
          </p>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            {QUICK_LINKS.map((l) => (
              <li key={l.label}>
                {l.to ? (
                  <Link to={l.to}>
                    <i className="bi bi-arrow-right"></i> {l.label}
                  </Link>
                ) : (
                  <a href={l.hash}>
                    <i className="bi bi-arrow-right"></i> {l.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Get In Touch</h4>
          <ul className="footer-contact">
            <li>
              <i className="bi bi-geo-alt"></i>
              <span>{COMPANY.address}</span>
            </li>
            <li>
              <i className="bi bi-envelope-open"></i>
              <span>{COMPANY.email}</span>
            </li>
            <li>
              <i className="bi bi-telephone"></i>
              <span>
                <a href={`tel:${COMPANY.phoneRaw}`}>{COMPANY.phone}</a>
              </span>
            </li>
            <li>
              <i className="bi bi-clock"></i>
              <span>{COMPANY.hours}</span>
            </li>
          </ul>
          <div className="footer-social">
            {COMPANY.socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
              >
                <i className={`bi ${s.icon}`}></i>
              </a>
            ))}
          </div>
        </div>

        <div className="footer-col footer-map-col">
          <h4>Find Us</h4>
          <div className="footer-map-frame">
            <iframe
              title="TCT Fashion Hub location"
              src={COMPANY.mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container inner">
          <span>
            © {new Date().getFullYear()} TCT Fashion Hub. All Rights Reserved.
          </span>
          <nav className="footer-policies" aria-label="Policies">
            {POLICY_LINKS.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </nav>
          <span>Designed &amp; Engineered in Coimbatore</span>
        </div>
      </div>
    </footer>
  );
}
