import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cartCount,
  clearCart,
  readCart,
  removeFromCart,
  updateQuantity,
} from "../lib/customer.js";
import { inr } from "../lib/shop.js";
import useSeo from "../lib/useSeo.js";
import { RETURN_WINDOW_TEXT } from "../lib/orderFlow.js";

/*
 * The shopping bag. Placing an order happens on /checkout (address + payment),
 * so this page stays about what you are buying.
 */
export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(readCart);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [items]
  );

  useSeo({
    title: "Your Bag — TCT Fashion Hub",
    description: "Review the outfits in your TCT Fashion Hub bag before checkout.",
    path: "/cart",
    robots: "noindex, follow",
  });

  useEffect(() => {
    const update = () => setItems(readCart());
    window.addEventListener("tct-cart-change", update);
    return () => window.removeEventListener("tct-cart-change", update);
  }, []);

  return (
    <section className="section cart-section">
      <div className="container">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <Link to="/shop">Shop</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>Bag</span>
        </nav>
        <span className="eyebrow">Your shopping bag</span>
        <h1 className="cart-title">
          {items.length ? `${cartCount()} item${cartCount() > 1 ? "s" : ""} in your bag` : "Your bag"}
        </h1>

        {!items.length ? (
          <div className="cart-empty">
            <i className="bi bi-bag-heart" aria-hidden="true" />
            <h2>Your bag is empty</h2>
            <p>Stitched-to-measure outfits start at Rs 899 — have a look.</p>
            <Link className="btn btn-primary" to="/shop">
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {items.map((item) => (
                <article className="cart-item" key={`${item.type}-${item.id}-${item.size || "std"}`}>
                  {item.image ? (
                    <img src={item.image} alt="" />
                  ) : (
                    <span className="cart-item-icon">
                      <i className="bi bi-mortarboard" aria-hidden="true" />
                    </span>
                  )}
                  <div className="cart-item-info">
                    <strong>
                      {item.type === "dress" ? (
                        <Link to={`/shop/${item.id}`}>{item.name}</Link>
                      ) : (
                        item.name
                      )}
                    </strong>
                    <small>
                      {item.type === "dress" ? "Boutique" : "Class"}
                      {item.size ? ` · Size ${item.size}` : ""}
                    </small>
                    <div className="cart-qty">
                      <button
                        type="button"
                        aria-label={`Reduce quantity of ${item.name}`}
                        onClick={() =>
                          setItems(updateQuantity(item.type, item.id, item.size, item.quantity - 1))
                        }
                      >
                        <i className="bi bi-dash" aria-hidden="true" />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() =>
                          setItems(updateQuantity(item.type, item.id, item.size, item.quantity + 1))
                        }
                      >
                        <i className="bi bi-plus" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <b>{inr(Number(item.price) * Number(item.quantity))}</b>
                  <button
                    type="button"
                    className="cart-remove"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setItems(removeFromCart(item.type, item.id, item.size))}
                  >
                    <i className="bi bi-trash3" aria-hidden="true" />
                  </button>
                </article>
              ))}
              <button type="button" className="cart-clear" onClick={() => setItems(clearCart())}>
                Clear bag
              </button>
            </div>

            <aside className="cart-summary">
              <h2>Price details</h2>
              <div>
                <span>Items ({cartCount()})</span>
                <strong>{inr(total)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong className="cart-free">Free</strong>
              </div>
              <div className="cart-total">
                <span>Total payable</span>
                <strong>{inr(total)}</strong>
              </div>
              <p className="cart-note">
                <i className="bi bi-cash-coin" aria-hidden="true" /> Cash on Delivery — pay when
                it reaches you.
              </p>
              <p className="cart-note">
                <i className="bi bi-arrow-repeat" aria-hidden="true" /> {RETURN_WINDOW_TEXT} return
                on size issues or damage.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => navigate("/checkout")}
              >
                Proceed to checkout <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
              <Link className="cart-continue" to="/shop">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
