import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { inr } from "../lib/shop.js";
import { flyToBag } from "../lib/flyToBag.js";
import { addToCart } from "../lib/customer.js";
import { isLightSwatch, swatchFor } from "../lib/swatch.js";
import { useCustomer } from "./CustomerProvider.jsx";

/*
 * A boutique garment as a shop card.
 *
 * Front: photo, discount, category, name, the sizes we stitch and the STARTING
 * price. Hover (or keyboard focus) flips the photo over to the studio card —
 * fabric, every size, every colour and the delivery promise — so a shopper can
 * judge a piece without leaving the grid.
 *
 * Clicking the card (photo, name or the button) opens the full product page
 * /shop/:id where the size is chosen and every detail is spelled out.
 *
 * The bag belongs to the signed-in shopper: an add from a signed-out device
 * sends them to sign in first (the same rule the class cards and /cart use),
 * and a signed-in add plays the flying-image gesture and slides the bag in.
 *
 * `compact` renders the same card without actions — the admin panel uses it for
 * the live preview inside the dress editor.
 */
export default function DressFlipCard({ dress, delay = 0, compact = false }) {
  const { user, loading: sessionLoading } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [added, setAdded] = useState(false);
  const photoRef = useRef(null);

  const href = `/shop/${dress.id}`;
  const hasRange =
    Number(dress.priceMax) > 0 && Number(dress.priceMax) > Number(dress.startingPrice);
  const discount =
    Number(dress.mrp) > Number(dress.startingPrice)
      ? Math.round(
          ((Number(dress.mrp) - Number(dress.startingPrice)) / Number(dress.mrp)) * 100
        )
      : 0;
  const sizes = Array.isArray(dress.sizes) ? dress.sizes : [];
  const colors = Array.isArray(dress.colors) ? dress.colors : [];
  /** A single size (or none) can be added straight from the grid. */
  const needsSizeChoice = sizes.length > 1;

  const openDetail = () => navigate(href);

  const quickAdd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (needsSizeChoice) return openDetail();
    /* Still resolving the session — ignore the tap instead of guessing. */
    if (sessionLoading) return;
    if (!user) {
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }
    addToCart({
      type: "dress",
      id: dress.id,
      name: dress.name,
      price: Number(dress.startingPrice),
      image: dress.image,
      size: sizes[0] || "",
    });
    /* The image lifts off this card and lands in the navbar bag; the drawer
       follows a beat later so the shopper sees what they just added. */
    flyToBag(photoRef.current, { image: dress.image });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article
      className={`pcard ${dress.featured ? "is-featured" : ""} ${
        dress.inStock === false ? "is-out" : ""
      } ${compact ? "is-compact" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="pcard-media">
        <div className="pcard-flip">
          <div className="pcard-face pcard-face--front">
            <Link to={href} className="pcard-media-link" tabIndex={-1} aria-hidden="true">
              <img
                ref={photoRef}
                src={dress.image}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = "/images/placeholder.svg";
                  }
                }}
              />
            </Link>
            <span className="pcard-tags">
              {dress.badge ? <span className="pcard-badge">{dress.badge}</span> : null}
              {discount > 0 ? <span className="pcard-off">{discount}% off</span> : null}
            </span>
            {dress.inStock === false ? (
              <span className="pcard-stock">Made to order</span>
            ) : null}
          </div>

          {/* The flip side is decoration: it carries no links, so it is hidden
              from assistive tech and never steals a click from the photo. */}
          <div className="pcard-face pcard-face--back" aria-hidden="true">
            <span className="pcard-back-tag">Studio details</span>
            <h4>{dress.name}</h4>
            <dl className="pcard-back-list">
              {dress.fabric ? (
                <div>
                  <dt>Fabric</dt>
                  <dd>{dress.fabric}</dd>
                </div>
              ) : null}
              {sizes.length ? (
                <div>
                  <dt>Sizes</dt>
                  <dd>{sizes.join(" · ")}</dd>
                </div>
              ) : null}
              {colors.length ? (
                <div>
                  <dt>Colours</dt>
                  <dd>{colors.join(" · ")}</dd>
                </div>
              ) : null}
              <div>
                <dt>Delivery</dt>
                <dd>Free anywhere in India · stitched in 3–7 days</dd>
              </div>
            </dl>
            <span className="pcard-back-cta">
              Open for size &amp; measurement <i className="bi bi-arrow-right" />
            </span>
          </div>
        </div>
      </div>

      <div className="pcard-body">
        <span className="pcard-cat">{dress.category}</span>
        <h3 className="pcard-name">
          <Link to={href}>{dress.name}</Link>
        </h3>
        {dress.fabric ? <p className="pcard-fabric">{dress.fabric}</p> : null}

        {sizes.length ? (
          <div className="pcard-sizes" title="Sizes stitched in the studio">
            {sizes.slice(0, 5).map((size) => (
              <span key={size}>{size}</span>
            ))}
            {sizes.length > 5 ? <span className="pcard-sizes-more">+{sizes.length - 5}</span> : null}
          </div>
        ) : null}

        {colors.length ? (
          <div className="pcard-colors" aria-label={`Colours: ${colors.join(", ")}`}>
            {colors.slice(0, 5).map((color) => (
              <span
                key={color}
                className={`pcard-color ${isLightSwatch(color) ? "is-light" : ""}`}
                style={{ background: swatchFor(color) }}
                title={color}
              />
            ))}
            {colors.length > 5 ? (
              <em className="pcard-color-more">+{colors.length - 5}</em>
            ) : null}
          </div>
        ) : null}

        <div className="pcard-price">
          <strong>{inr(dress.startingPrice)}</strong>
          {Number(dress.mrp) > Number(dress.startingPrice) ? (
            <>
              <s>{inr(dress.mrp)}</s>
              <em>{discount}% off</em>
            </>
          ) : null}
        </div>
        <p className="pcard-note">
          {hasRange
            ? `Up to ${inr(dress.priceMax)} · free delivery`
            : "Free delivery · stitched in 3–7 days"}
        </p>

        {compact ? null : (
          <div className="pcard-actions">
            <button
              type="button"
              className={`btn btn-primary pcard-btn ${added ? "is-added" : ""}`}
              onClick={quickAdd}
            >
              {added ? (
                <>
                  <i className="bi bi-check2" aria-hidden="true" /> Added
                </>
              ) : needsSizeChoice ? (
                <>
                  <i className="bi bi-bag-plus" aria-hidden="true" /> Choose size
                </>
              ) : (
                <>
                  <i className="bi bi-bag-plus" aria-hidden="true" /> Add to bag
                </>
              )}
            </button>
            <Link
              className="btn pcard-btn pcard-btn--ghost"
              to={href}
              state={{ from: `${location.pathname}` }}
            >
              View
            </Link>
          </div>
        )}
        {!compact && user ? <span className="pcard-logged">Signed in as {user.name.split(" ")[0]}</span> : null}
      </div>
    </article>
  );
}
