import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { COMPANY } from "../data/content.js";
import { useCustomer } from "./CustomerProvider.jsx";
import { readCart } from "../lib/customer.js";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Shop", hash: "#shop" },
  { label: "Classes", to: "/classes" },
  { label: "Combos", hash: "#combos", page: "/classes" },
  { label: "About", to: "/about" },
];

function isActive(pathname, item) {
  if (item.to) {
    if (item.to === "/") return pathname === "/";
    return pathname.startsWith(item.to);
  }
  return false;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, signOut } = useCustomer();
  const [cartCount, setCartCount] = useState(readCart().reduce((sum, item) => sum + item.quantity, 0));

  useEffect(() => {
    const update = () => setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    window.addEventListener("tct-cart-change", update);
    return () => window.removeEventListener("tct-cart-change", update);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close the drawer with the Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  /**
   * Jump to a section (likes #shop) from ANY page.
   * Sections that live on another route — #combos sits on /classes — travel
   * there first, then scroll once the page has painted.
   */
  const gotoSection = (hash, page = "/") => (e) => {
    e.preventDefault();
    setMenuOpen(false);

    if (pathname !== page) {
      window.location.assign(`${page}${hash}`);
      return;
    }

    const scrollThere = () => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `${page}${hash}`);
    };
    scrollThere();
  };

  const navLink = (item) =>
    item.hash ? (
      <a
        key={item.label}
        href={`${item.page || "/"}${item.hash}`}
        onClick={gotoSection(item.hash, item.page || "/")}
      >
        {item.label}
      </a>
    ) : (
      <NavLink
        key={item.label}
        to={item.to}
        className={({ isActive: active }) => (active ? "active" : "")}
        end={item.to === "/"}
      >
        {item.label}
      </NavLink>
    );

  return (
    <>
      {/* Topbar — contact strip, same pattern as the original site */}
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="topbar-info">
            <span>
              <i className="bi bi-geo-alt"></i> {COMPANY.addressShort}
            </span>
            <a href={`tel:${COMPANY.phoneRaw}`}>
              <i className="bi bi-telephone"></i> {COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`}>
              <i className="bi bi-envelope-open"></i> {COMPANY.email}
            </a>
          </div>
          <div className="topbar-social">
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
      </div>

      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <span className="logo-art">
              <img
                src="/images/Logo.png"
                alt="TCT Fashion Hub logo"
                className="brand-img"
              />
            </span>
            <span className="brand-text">
              TCT Fashion Hub
              <small>Where Threads Meet Tradition</small>
            </span>
          </Link>

          <nav aria-label="Primary">
            <ul className="nav-links">
              {NAV.map((item) => (
                <li
                  key={item.label}
                  className={`nav-item ${isActive(pathname, item) ? "active" : ""}`}
                >
                  {navLink(item)}
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-cta">
            <Link to="/cart" className="nav-cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}>
              <i className="bi bi-bag" /> {cartCount ? <span>{cartCount}</span> : null}
            </Link>
            {user ? (
              <button type="button" className="nav-account" onClick={() => signOut()}>
                <i className="bi bi-person-circle" /> {user.name.split(" ")[0]}
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            )}
          </div>

          <button
            className="hamburger"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <i className="bi bi-list"></i>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="scrim" onClick={() => setMenuOpen(false)}></div>
        <div className="mobile-panel">
          <div className="mobile-panel-head">
            <span className="brand">
              <span className="logo-art">
                <img
                  src="/images/Logo.png"
                  alt="TCT Fashion Hub logo"
                  className="brand-img"
                />
              </span>
              <span className="brand-text">TCT Fashion Hub</span>
            </span>
            <button
              className="mobile-close"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <ul className="mobile-nav">
            {NAV.map((item) => (
              <li key={item.label}>{navLink(item)}</li>
            ))}
          </ul>

          <Link to={user ? "/cart" : "/login"} className="btn btn-primary btn-block">
            {user ? "View cart" : "Login"}
          </Link>
        </div>
      </div>
    </>
  );
}
