import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomer } from "../components/CustomerProvider.jsx";
import { clearCart, readCart, removeFromCart, customerApi } from "../lib/customer.js";
import { inr } from "../lib/shop.js";
import useSeo from "../lib/useSeo.js";

export default function CartPage() {
  const { user } = useCustomer();
  const navigate = useNavigate();
  const [items, setItems] = useState(readCart);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  useSeo({ title: "Cart — TCT Fashion Hub", description: "Review your TCT Fashion Hub cart.", path: "/cart", robots: "noindex" });
  useEffect(() => {
    const update = () => setItems(readCart());
    window.addEventListener("tct-cart-change", update);
    return () => window.removeEventListener("tct-cart-change", update);
  }, []);

  const checkout = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await customerApi.createOrder(items.map(({ type, id, quantity }) => ({ type, id, quantity })));
      clearCart();
      setItems([]);
      setMessage(`Order ${data.order.id} created. Our team will contact you with payment and delivery details.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section cart-section">
      <div className="container cart-wrap">
        <div>
          <span className="eyebrow">Your shopping bag</span>
          <h1>Cart &amp; checkout</h1>
          <p className="cart-sub">Review your classes and boutique items before placing your order.</p>
        </div>
        {message ? <div className="cart-message" role="status">{message}</div> : null}
        {!items.length ? (
          <div className="cart-empty"><i className="bi bi-bag-heart" /><h2>Your cart is empty</h2><Link className="btn btn-primary" to="/#shop">Browse collection</Link></div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {items.map((item) => (
                <article className="cart-item" key={`${item.type}-${item.id}`}>
                  {item.image ? <img src={item.image} alt="" /> : <span className="cart-item-icon"><i className="bi bi-mortarboard" /></span>}
                  <div><strong>{item.name}</strong><small>{item.type === "dress" ? "Boutique" : "Class"} · Qty {item.quantity}</small></div>
                  <b>{inr(item.price * item.quantity)}</b>
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setItems(removeFromCart(item.type, item.id))}><i className="bi bi-trash3" /></button>
                </article>
              ))}
            </div>
            <aside className="cart-summary">
              <h2>Order summary</h2><div><span>Total</span><strong>{inr(total)}</strong></div>
              {!user ? <p className="cart-login-note">Please login before placing your order.</p> : null}
              <button className="btn btn-primary btn-block" onClick={checkout} disabled={busy}>{busy ? "Creating order…" : "Place order"}</button>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
