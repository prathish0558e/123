import { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "../lib/scrollLock.js";

/**
 * ClassInfoModal — premium "craft dossier" popup.
 * Clicking any class / combo card opens this elegant sheet with the
 * full class information (photo, price, duration, level, kit gift,
 * and everything included for combos).
 *
 * Rendered through a React PORTAL onto <body> so it is always
 * perfectly centered, with three ways to close: the ✕ button,
 * clicking the dark backdrop, or pressing Escape.
 * "Pay Now" inside hands over to the PaymentOptions modal.
 */
export default function ClassInfoModal({ item, onClose, onPay }) {
  const isCombo = Array.isArray(item.items);

  // Lock page scroll + close on Escape while open
  useEffect(() => {
    lockScroll();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="tct-info-backdrop" role="presentation" onClick={onClose}>
      <article
        className="tct-info-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tct-info-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="tct-payment-close tct-info-close"
          aria-label="Close class details"
          onClick={onClose}
        >
          <i className="bi bi-x-lg" />
        </button>

        <div className="tct-info-photo">
          <img
            src={item.image}
            alt={item.name}
            onError={(e) => {
              if (!e.currentTarget.dataset.fallback) {
                e.currentTarget.dataset.fallback = "1";
                e.currentTarget.src = "/images/placeholder.svg";
              }
            }}
          />
          {item.badge && <span className="tct-info-badge">{item.badge}</span>}
        </div>

        <div className="tct-info-body">
          <p className="eyebrow">
            {isCombo ? "Craft class combo" : "Single craft class"}
          </p>
          <h2 id="tct-info-title" className="tct-info-title">
            {item.name}
          </h2>

          <div className="tct-info-priceRow">
            <p className="tct-info-price">
              Rs {(item.total ?? item.price).toLocaleString("en-IN")}
            </p>
            {isCombo && item.items.length > 1 && (
              <span className="tct-info-chip">
                {item.items.length} crafts included
              </span>
            )}
          </div>

          <div className="tct-info-facts">
            <span className="tct-info-fact">
              <i className="bi bi-clock" /> {item.duration}
            </span>
            <span className="tct-info-fact">
              <i className="bi bi-graph-star" /> {item.level}
            </span>
          </div>

          {isCombo ? (
            <>
              <p className="tct-info-label">Everything included</p>
              <ul className="tct-info-list">
                {item.items.map((it) => (
                  <li key={it}>
                    <i className="bi bi-check2-circle" /> {it}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="tct-info-desc">
              A focused, mentor-led month inside the TCT studio — small batch,
              hands-on practice from the very first day, and a certificate when
              you finish.
            </p>
          )}

          <p className="tct-info-gift">
            <i className="bi bi-gift-fill" /> {item.gift}
          </p>

          <div className="tct-info-actions">
            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={onPay}
            >
              <i className="bi bi-credit-card me-2" /> Pay Now — Rs{" "}
              {(item.total ?? item.price).toLocaleString("en-IN")}
            </button>
            <button
              type="button"
              className="btn btn-outline w-100 mt-2"
              onClick={onClose}
            >
              Keep browsing
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body
  );
}
