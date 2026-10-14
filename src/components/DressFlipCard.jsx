import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { COMPANY } from "../data/content.js";
import { inr } from "../lib/shop.js";
import { addToCart } from "../lib/customer.js";
import { useCustomer } from "./CustomerProvider.jsx";

/*
 * A boutique garment as a flip card.
 *
 * Front  — photo, category, name and the STARTING price (what a shopper wants
 *          to know first).
 * Back   — fabric, sizes, colours, the full price range, and three ways to
 *          reach the studio: a pre-filled enquiry form, WhatsApp, or a call.
 *
 * Flips on click/tap and with Enter/Space, and the flip is announced
 * (aria-pressed) so the control is not silent to screen readers.
 */
export default function DressFlipCard({ dress, delay = 0, compact = false }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef(null);
  const { user } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset the card whenever the catalogue object behind it changes (an admin
  // edit while the page is open, or a reorder) so no card is left half-turned.
  useEffect(() => {
    setFlipped(false);
  }, [dress.id, dress.updated_at]);

  const hasRange =
    Number(dress.priceMax) > 0 && Number(dress.priceMax) > Number(dress.startingPrice);
  const priceRange = hasRange
    ? `${inr(dress.startingPrice)} – ${inr(dress.priceMax)}`
    : inr(dress.startingPrice);
  const discount =
    Number(dress.mrp) > Number(dress.startingPrice)
      ? Math.round(
          ((Number(dress.mrp) - Number(dress.startingPrice)) / Number(dress.mrp)) * 100
        )
      : 0;

  const waLink = `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(
    `Hello TCT Fashion Hub!\n\nI'm interested in: ${dress.name}\nCategory: ${dress.category}\nStarts at: ${inr(
      dress.startingPrice
    )}\n\nPlease share availability, colours and delivery time.`
  )}`;

  const toggle = () => setFlipped((f) => !f);
  const buy = () => {
    if (!user) return navigate("/login", { state: { from: `${location.pathname}${location.hash}` } });
    addToCart({ type: "dress", id: dress.id, name: dress.name, price: Number(dress.startingPrice), image: dress.image });
    navigate("/cart");
  };

  const specs = [
    dress.fabric ? { icon: "bi-scissors", label: "Fabric", value: dress.fabric } : null,
    dress.sizes?.length
      ? { icon: "bi-rulers", label: "Sizes", value: dress.sizes.join(" · ") }
      : null,
    dress.colors?.length
      ? { icon: "bi-palette", label: "Colours", value: dress.colors.join(", ") }
      : null,
  ].filter(Boolean);

  return (
    <div
      ref={ref}
      className={`flip ${flipped ? "is-flipped" : ""} ${
        dress.inStock === false ? "is-out" : ""
      } ${dress.featured ? "is-featured" : ""} ${compact ? "is-compact" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flip-inner">
        {/* ---------------- front ---------------- */}
        <button
          type="button"
          className="flip-face flip-front"
          aria-pressed={flipped}
          aria-label={`${dress.name}, starts at ${inr(
            dress.startingPrice
          )}. Show details.`}
          onClick={toggle}
        >
          <span className="flip-media">
            <img
              src={dress.image}
              alt={dress.name}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (!e.currentTarget.dataset.fallback) {
                  e.currentTarget.dataset.fallback = "1";
                  e.currentTarget.src = "/images/placeholder.svg";
                }
              }}
            />
            <span className="flip-tags">
              {dress.badge ? <span className="flip-badge">{dress.badge}</span> : null}
              {discount > 0 ? <span className="flip-off">{discount}% off</span> : null}
            </span>
            {dress.inStock === false ? (
              <span className="flip-stock">Made to order</span>
            ) : null}
          </span>

          <span className="flip-info">
            <span className="flip-cat">{dress.category}</span>
            <span className="flip-name">{dress.name}</span>
            <span className="flip-price">
              <small>Starting at</small>
              {inr(dress.startingPrice)}
            </span>
            <span className="flip-hint">
              <i className="bi bi-arrow-repeat" aria-hidden="true"></i> Tap for details
            </span>
          </span>
        </button>

        {/* ---------------- back ---------------- */}
        <div className="flip-face flip-back">
          <span className="flip-cat">{dress.category}</span>
          <h3 className="flip-name">{dress.name}</h3>
          {dress.description ? <p className="flip-desc">{dress.description}</p> : null}

          <dl className="flip-specs">
            {specs.map((s) => (
              <div className="flip-spec" key={s.label}>
                <dt>
                  <i className={`bi ${s.icon}`} aria-hidden="true"></i>
                  {s.label}
                </dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>

          <p className="flip-range">
            <small>{hasRange ? "Price range" : "Price"}</small>
            {priceRange}
            {Number(dress.mrp) > Number(dress.startingPrice) ? (
              <s title="MRP">{inr(dress.mrp)}</s>
            ) : null}
          </p>

          <div className="flip-actions">
            <button className="btn btn-primary flip-btn" type="button" onClick={buy}>
              <i className="bi bi-lightning-charge" aria-hidden="true"></i> Pay Now
            </button>
            <button className="btn btn-outline flip-btn" type="button" onClick={buy}>
              <i className="bi bi-cart-plus" aria-hidden="true"></i> Add to cart
            </button>
            <a
              className="btn flip-btn flip-btn--ghost"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-whatsapp" aria-hidden="true"></i> WhatsApp
            </a>
          </div>

          <button type="button" className="flip-back-link" onClick={toggle}>
            <i className="bi bi-arrow-return-left" aria-hidden="true"></i> Back to photo
          </button>
        </div>
      </div>
    </div>
  );
}
