import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  cartCount,
  readCart,
  removeFromCart,
  updateQuantity,
} from "../lib/customer.js";
import { inr } from "../lib/shop.js";
import { lockScroll, unlockScroll } from "../lib/scrollLock.js";
import { toggleMiniBag } from "../lib/flyToBag.js";
import { useCustomer } from "./CustomerProvider.jsx";

/*
 * The mini bag — a drawer that slides in the moment something is added, the way
 * Myntra/Flipkart confirm an add without throwing the shopper onto another page.
 *
 * It reads and writes the same localStorage bag as /cart (through lib/customer),
 * so the two can never disagree. Opening is driven by the "tct-bag-toggle"
 * event, which means the animation code needs no React context.
 *
 * The bag belongs to the signed-in shopper, so the drawer refuses to open until
 * there is an account — signing out closes it and empties it (see
 * CustomerProvider), which is also what keeps one shopper's bag off the next
 * person's screen on a shared device.
 */
export default function MiniBag() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(readCart);
  const closeRef = useRef(null);
  const { pathname } = useLocation();
  const { user } = useCustomer();

  const count = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const close = useCallback(() => {
    setOpen(false);
    toggleMiniBag(false);
  }, []);

  /* Anything that writes to the bag refreshes this list too. */
  useEffect(() => {
    const sync = () => setItems(readCart());
    window.addEventListener("tct-cart-change", sync);
    return () => window.removeEventListener("tct-cart-change", sync);
  }, []);

  useEffect(() => {
    const onToggle = (event) => {
      const next = Boolean(event.detail?.open);
      setItems(readCart());
      setOpen(next && Boolean(user) && readCart().length > 0);
    };
    window.addEventListener("tct-bag-toggle", onToggle);
    return () => window.removeEventListener("tct-bag-toggle", onToggle);
  }, [user]);

  /* A sign-out (or another tab doing one) takes the drawer with it. */
  useEffect(() => {
    if (!user) setOpen(false);
  }, [user]);

  /* Navigation means the drawer has done its job. */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  /* A bag emptied by another tab must not leave an empty drawer standing. */
  useEffect(() => {
    if (!items.length) setOpen(false);
  }, [items.length]);

  return (
    <div className={`mini-bag ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="mini-bag-scrim" onClick={close} />

      <aside
        className="mini-bag-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        aria-hidden={!open}
      >
        <header className="mini-bag-head">
          <span className="mini-bag-title">
            <i className="bi bi-bag-check" aria-hidden="true" />
            Added to your bag
          </span>
          <button
            type="button"
            className="mini-bag-close"
            aria-label="Close bag"
            onClick={close}
            ref={closeRef}
            tabIndex={open ? 0 : -1}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className="mini-bag-items">
          {items.map((item) => (
            <article
              className="mini-bag-item"
              key={`${item.type}-${item.id}-${item.size || "std"}`}
            >
              {item.image ? (
                <img src={item.image} alt="" loading="lazy" />
              ) : (
                <span className="mini-bag-icon">
                  <i className="bi bi-mortarboard" aria-hidden="true" />
                </span>
              )}
              <div className="mini-bag-info">
                <strong>{item.name}</strong>
                <small>
                  {item.type === "dress" ? "Boutique" : "Class"}
                  {item.size ? ` · Size ${item.size}` : ""}
                </small>
                <div className="mini-bag-qty">
                  <button
                    type="button"
                    aria-label={`Reduce quantity of ${item.name}`}
                    onClick={() =>
                      setItems(
                        updateQuantity(item.type, item.id, item.size, item.quantity - 1)
                      )
                    }
                    tabIndex={open ? 0 : -1}
                  >
                    <i className="bi bi-dash" aria-hidden="true" />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    onClick={() =>
                      setItems(
                        updateQuantity(item.type, item.id, item.size, item.quantity + 1)
                      )
                    }
                    tabIndex={open ? 0 : -1}
                  >
                    <i className="bi bi-plus" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="mini-bag-price">
                <b>{inr(Number(item.price) * Number(item.quantity))}</b>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => setItems(removeFromCart(item.type, item.id, item.size))}
                  tabIndex={open ? 0 : -1}
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className="mini-bag-foot">
          <div className="mini-bag-total">
            <span>
              Subtotal ({count} {count === 1 ? "item" : "items"})
            </span>
            <strong>{inr(total)}</strong>
          </div>
          <p className="mini-bag-note">
            <i className="bi bi-truck" aria-hidden="true" /> Free delivery · Cash on delivery
            available
          </p>
          <Link className="btn btn-primary btn-block" to="/checkout" tabIndex={open ? 0 : -1}>
            Checkout <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
          <div className="mini-bag-links">
            <Link to="/cart" tabIndex={open ? 0 : -1}>
              View full bag
            </Link>
            <button type="button" onClick={close} tabIndex={open ? 0 : -1}>
              Continue shopping
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
