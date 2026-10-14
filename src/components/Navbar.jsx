import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { COMPANY } from "../data/content.js";
import { useCustomer } from "./CustomerProvider.jsx";
import { cartCount, readCart } from "../lib/customer.js";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(cartCount());
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useCustomer();
  const accountRef = useRef(null);

  useEffect(() => {
    const update = () => setCount(cartCount());
    window.addEventListener("tct-cart-change", update);
    return () => window.removeEventListener("tct-cart-change", update);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer and the account menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Clicking anywhere else closes the account dropdown
  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [accountOpen]);

  /**
   * Jump to a section (like #shop) from ANY page.
   * Sections that live on another route travel there first.
   */
  const gotoSection = (hash, page = "/") => (event) => {
    event.preventDefault();
    setMenuOpen(false);

    if (pathname !== page) {
      window.location.assign(`${page}${hash}`);
      return;
    }

    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `${page}${hash}`);
  };

  const search = (event) => {
    event.preventDefault();
    const term = query.trim();
    setMenuOpen(false);
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
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
      {/* Topbar — contact strip */}
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
              <img src="/images/Logo.png" alt="TCT Fashion Hub logo" className="brand-img" />
            </span>
            <span className="brand-text">
              TCT Fashion Hub
              <small>Where Threads Meet Tradition</small>
            </span>
          </Link>

          <form className="nav-search" role="search" onSubmit={search}>
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search kurti, saree, lehenga, blouse…"
              aria-label="Search the boutique"
            />
            <button type="submit">Search</button>
          </form>

          <nav aria-label="Primary">
            <ul className="nav-links">
              {NAV.map((item) => (
                <li key={item.label} className={`nav-item ${isActive(pathname, item) ? "active" : ""}`}>
                  {navLink(item)}
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-cta">
            <Link to="/cart" className="nav-cart" aria-label={`Bag${count ? `, ${count} items` : ""}`}>
              <i className="bi bi-bag" /> {count ? <span>{count}</span> : null}
            </Link>

            {user ? (
              <div className="nav-account-wrap" ref={accountRef}>
                <button
                  type="button"
                  className="nav-account"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  {user.picture ? (
                    <img src={user.picture} alt="" className="nav-avatar" />
                  ) : (
                    <i className="bi bi-person-circle" />
                  )}
                  <span>{user.name.split(" ")[0]}</span>
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </button>
                {accountOpen ? (
                  <div className="nav-menu" role="menu">
                    <Link to="/account" role="menuitem">
                      <i className="bi bi-receipt" aria-hidden="true" /> My orders
                    </Link>
                    <Link to="/account?tab=addresses" role="menuitem">
                      <i className="bi bi-geo-alt" aria-hidden="true" /> Addresses
                    </Link>
                    <Link to="/account?tab=profile" role="menuitem">
                      <i className="bi bi-person" aria-hidden="true" /> Profile
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        await signOut();
                        navigate("/");
                      }}
                    >
                      <i className="bi bi-box-arrow-right" aria-hidden="true" /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary nav-login">
                <i className="bi bi-person" aria-hidden="true" /> Login
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
                <img src="/images/Logo.png" alt="TCT Fashion Hub logo" className="brand-img" />
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

          <form className="mobile-search" role="search" onSubmit={search}>
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the boutique…"
              aria-label="Search the boutique"
            />
          </form>

          <ul className="mobile-nav">
            {NAV.map((item) => (
              <li key={item.label}>{navLink(item)}</li>
            ))}
          </ul>

          <Link to={user ? "/account" : "/login"} className="btn btn-primary btn-block">
            {user ? "My orders" : "Login"}
          </Link>
        </div>
      </div>
    </>
  );
}
