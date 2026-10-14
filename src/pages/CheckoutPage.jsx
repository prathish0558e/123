import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomer } from "../components/CustomerProvider.jsx";
import AddressForm from "../components/AddressForm.jsx";
import { cartCount, clearCart, customerApi, readCart } from "../lib/customer.js";
import { inr } from "../lib/shop.js";
import useSeo from "../lib/useSeo.js";
import { PAYMENT_METHODS, RETURN_WINDOW_TEXT } from "../lib/orderFlow.js";

/*
 * Checkout — the only place that asks a shopper to sign in.
 *
 * Order: 1) delivery address  2) payment  3) place order.
 * Cash on Delivery is the single live method; the rest are listed but marked
 * Unavailable, so nobody has to discover that at the last tap.
 */
export default function CheckoutPage() {
  const { user, loading } = useCustomer();
  const navigate = useNavigate();
  const [items, setItems] = useState(readCart);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [items]
  );

  useSeo({
    title: "Checkout — TCT Fashion Hub",
    description: "Enter your delivery address and place your Cash on Delivery order.",
    path: "/checkout",
    robots: "noindex, nofollow",
  });

  /* Sign in only when it is actually needed — at checkout. */
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: "/checkout" } });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const update = () => setItems(readCart());
    window.addEventListener("tct-cart-change", update);
    return () => window.removeEventListener("tct-cart-change", update);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    customerApi
      .addresses()
      .then((data) => {
        if (cancelled) return;
        const list = data.addresses || [];
        setAddresses(list);
        setAddressId((current) => current || user.addresses?.[0]?.id || list[0]?.id || "");
        setAdding(!list.length && !user.addresses?.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveAddress = async (address) => {
    const data = await customerApi.saveAddress(address);
    setAddresses(data.addresses || []);
    setAddressId(data.address.id);
    setAdding(false);
  };

  const placeOrder = async () => {
    setError("");
    if (!addressId && !adding) {
      setError("Choose or add a delivery address first.");
      return;
    }
    setBusy(true);
    try {
      const data = await customerApi.createOrder({
        items: items.map(({ type, id, quantity, size }) => ({ type, id, quantity, size })),
        addressId: addressId || undefined,
        payment: { method: "cod" },
      });
      clearCart();
      setItems([]);
      setPlaced(data.order);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <section className="section checkout-section">
        <div className="container">
          <p className="checkout-wait">
            <i className="bi bi-arrow-repeat" aria-hidden="true" /> Taking you to sign in…
          </p>
        </div>
      </section>
    );
  }

  if (placed) {
    return (
      <section className="section checkout-section">
        <div className="container checkout-done">
          <div className="checkout-done-card">
            <span className="checkout-tick">
              <i className="bi bi-check2" aria-hidden="true" />
            </span>
            <h1>Order placed</h1>
            <p className="checkout-done-sub">
              Thank you {user.name.split(" ")[0]}! Your order{" "}
              <strong>{placed.id}</strong> is confirmed and the studio has it.
            </p>
            <ul className="checkout-done-facts">
              <li>
                <i className="bi bi-cash-coin" aria-hidden="true" /> Pay{" "}
                <strong>{inr(placed.total)}</strong> in cash when it arrives
              </li>
              <li>
                <i className="bi bi-truck" aria-hidden="true" /> Delivery in 3–7 days to{" "}
                {placed.address?.city || "your address"}
              </li>
              <li>
                <i className="bi bi-arrow-repeat" aria-hidden="true" /> {RETURN_WINDOW_TEXT} return
                window is open from now for size or damage issues
              </li>
            </ul>
            <div className="checkout-done-actions">
              <Link className="btn btn-primary" to={`/orders/${placed.id}`}>
                Track this order <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
              <Link className="btn btn-outline" to="/shop">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="section checkout-section">
        <div className="container">
          <div className="cart-empty">
            <i className="bi bi-bag-heart" aria-hidden="true" />
            <h2>Nothing to check out</h2>
            <p>Add an outfit to your bag and come back.</p>
            <Link className="btn btn-primary" to="/shop">
              Browse the collection
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section checkout-section">
      <div className="container">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/cart">Bag</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>Checkout</span>
        </nav>

        <div className="checkout-layout">
          <div className="checkout-main">
            {/* 1 — delivery address */}
            <section className="checkout-block">
              <header className="checkout-block-head">
                <span className="checkout-step">1</span>
                <div>
                  <h2>Delivery address</h2>
                  <p>Where should the studio send your order?</p>
                </div>
              </header>

              {addresses.length ? (
                <div className="addr-list">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`addr-card ${addressId === address.id ? "is-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={addressId === address.id}
                        onChange={() => {
                          setAddressId(address.id);
                          setAdding(false);
                        }}
                      />
                      <span>
                        <strong>
                          {address.name}
                          <em>{address.type}</em>
                        </strong>
                        <small>
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                          {address.state} — {address.pincode}
                        </small>
                        <small>
                          <i className="bi bi-telephone" aria-hidden="true" /> {address.phone}
                        </small>
                      </span>
                    </label>
                  ))}
                  {adding ? null : (
                    <button
                      type="button"
                      className="addr-add"
                      onClick={() => {
                        setAdding(true);
                        setAddressId("");
                      }}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" /> Add a new address
                    </button>
                  )}
                </div>
              ) : null}

              {adding || !addresses.length ? (
                <div className="addr-new">
                  {addresses.length ? <h3>New address</h3> : null}
                  <AddressForm
                    initial={{ name: user.name, phone: user.phone }}
                    submitLabel="Use this address"
                    onCancel={addresses.length ? () => setAdding(false) : undefined}
                    // The address is validated and saved to the account in the
                    // same step, so the order call only ever needs its id.
                    onSubmit={saveAddress}
                  />
                </div>
              ) : null}
            </section>

            {/* 2 — payment */}
            <section className="checkout-block">
              <header className="checkout-block-head">
                <span className="checkout-step">2</span>
                <div>
                  <h2>Payment method</h2>
                  <p>Only Cash on Delivery is available right now.</p>
                </div>
              </header>

              <div className="pay-list">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`pay-card ${method.available ? "is-available" : "is-unavailable"}`}
                  >
                    <input type="radio" name="payment" checked={method.available} disabled={!method.available} readOnly />
                    <span className="pay-icon">
                      <i className={`bi ${method.icon}`} aria-hidden="true" />
                    </span>
                    <span className="pay-text">
                      <strong>
                        {method.label}
                        {method.available ? (
                          <em className="pay-tag pay-tag--ok">Recommended</em>
                        ) : (
                          <em className="pay-tag">Unavailable</em>
                        )}
                      </strong>
                      <small>{method.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* 3 — review */}
            <section className="checkout-block">
              <header className="checkout-block-head">
                <span className="checkout-step">3</span>
                <div>
                  <h2>Review &amp; place order</h2>
                  <p>{cartCount()} item(s) · free delivery · pay on delivery</p>
                </div>
              </header>
              {error ? (
                <p className="addr-form-error" role="alert">
                  <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {error}
                </p>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                disabled={busy}
                onClick={placeOrder}
              >
                {busy ? "Placing your order…" : `Place order · ${inr(total)}`}
              </button>
              <p className="checkout-terms">
                By placing this order you agree to our{" "}
                <Link to="/terms">terms</Link> and{" "}
                <Link to="/returns">return policy</Link> ({RETURN_WINDOW_TEXT}, size or damage only).
              </p>
            </section>
          </div>

          <aside className="checkout-summary">
            <h2>Order summary</h2>
            <div className="checkout-items">
              {items.map((item) => (
                <div className="checkout-item" key={`${item.type}-${item.id}-${item.size || "std"}`}>
                  {item.image ? <img src={item.image} alt="" /> : null}
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      Qty {item.quantity}
                      {item.size ? ` · Size ${item.size}` : ""}
                    </small>
                  </span>
                  <b>{inr(Number(item.price) * Number(item.quantity))}</b>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <div>
                <span>Subtotal</span>
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
            </div>
            <p className="checkout-safe">
              <i className="bi bi-shield-check" aria-hidden="true" /> No card details needed — you
              pay in cash at delivery.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
