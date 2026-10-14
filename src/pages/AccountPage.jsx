import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomer } from "../components/CustomerProvider.jsx";
import AddressForm from "../components/AddressForm.jsx";
import { customerApi } from "../lib/customer.js";
import { inr } from "../lib/shop.js";
import useSeo from "../lib/useSeo.js";
import { RETURN_WINDOW_TEXT, formatDate, isReturnWindowOpen, returnCountdown } from "../lib/orderFlow.js";

/*
 * /account — the shopper's own space: orders they placed, addresses they saved
 * and their profile. Everything here belongs to the signed-in customer only
 * (the server scopes every query by the session's user id).
 */
const TABS = [
  { id: "orders", label: "My orders", icon: "bi-receipt" },
  { id: "addresses", label: "Addresses", icon: "bi-geo-alt" },
  { id: "profile", label: "Profile", icon: "bi-person" },
];

export default function AccountPage() {
  const { user, loading, signOut } = useCustomer();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "orders";
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useSeo({
    title: "My Account — TCT Fashion Hub",
    description: "Your orders, delivery addresses and account details.",
    path: "/account",
    robots: "noindex, nofollow",
  });

  const load = useCallback(async () => {
    try {
      const [orderData, addressData] = await Promise.all([
        customerApi.orders(),
        customerApi.addresses(),
      ]);
      setOrders(orderData.orders || []);
      setAddresses(addressData.addresses || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: "/account" } });
      return;
    }
    if (user) load();
  }, [loading, user, navigate, load]);

  if (loading || !user) {
    return (
      <section className="section account-section">
        <div className="container">
          <p className="checkout-wait">
            <i className="bi bi-arrow-repeat" aria-hidden="true" /> Taking you to sign in…
          </p>
        </div>
      </section>
    );
  }

  const setTab = (id) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };

  return (
    <section className="section account-section">
      <div className="container">
        <header className="account-head">
          <div className="account-hello">
            <span className="account-avatar">
              {user.picture ? (
                <img src={user.picture} alt="" />
              ) : (
                user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)
              )}
            </span>
            <div>
              <span className="eyebrow">My account</span>
              <h1>Hi {user.name.split(" ")[0]}</h1>
              <p className="account-sub">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ""}
                {user.provider === "google" ? " · signed in with Google" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Sign out
          </button>
        </header>

        <nav className="account-tabs" aria-label="Account sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "is-active" : ""}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" /> {item.label}
              {item.id === "orders" ? <span>{orders.length}</span> : null}
              {item.id === "addresses" ? <span>{addresses.length}</span> : null}
            </button>
          ))}
        </nav>

        {error ? (
          <p className="addr-form-error" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {error}
          </p>
        ) : null}

        {tab === "orders" ? (
          orders.length ? (
            <div className="order-list">
              {orders.map((order) => (
                <article className="account-card order-row" key={order.id}>
                  <header className="order-row-head">
                    <div>
                      <strong>{order.id}</strong>
                      <small>
                        Placed {formatDate(order.created_at)} · {order.payment.label}
                      </small>
                    </div>
                    <span className={`order-pill order-pill--${order.status}`}>
                      {order.status_label}
                    </span>
                  </header>

                  <div className="checkout-items">
                    {order.items.map((item) => (
                      <div className="checkout-item" key={`${item.id}-${item.size || "std"}`}>
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

                  <footer className="order-row-foot">
                    <span className="order-total">
                      Total <strong>{inr(order.total)}</strong> · cash on delivery
                    </span>
                    <div className="order-row-actions">
                      {isReturnWindowOpen(order) ? (
                        <span className="order-return-hint">
                          <i className="bi bi-clock-history" aria-hidden="true" /> Return{" "}
                          {returnCountdown(order)}
                        </span>
                      ) : null}
                      <Link className="btn btn-primary" to={`/orders/${order.id}`}>
                        Track order <i className="bi bi-arrow-right" aria-hidden="true" />
                      </Link>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="cart-empty">
              <i className="bi bi-receipt" aria-hidden="true" />
              <h2>No orders yet</h2>
              <p>Once you order, every update appears here with live tracking.</p>
              <Link className="btn btn-primary" to="/shop">
                Start shopping
              </Link>
            </div>
          )
        ) : null}

        {tab === "addresses" ? (
          <div className="account-addresses">
            {addresses.map((address) => (
              <article className="account-card addr-saved" key={address.id}>
                <header>
                  <strong>{address.name}</strong>
                  <em>{address.type}</em>
                </header>
                <p>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state} — {address.pincode}
                  {address.landmark ? (
                    <>
                      <br />
                      Landmark: {address.landmark}
                    </>
                  ) : null}
                  <br />
                  <i className="bi bi-telephone" aria-hidden="true" /> {address.phone}
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={async () => {
                    const data = await customerApi.deleteAddress(address.id);
                    setAddresses(data.addresses || []);
                  }}
                >
                  <i className="bi bi-trash3" aria-hidden="true" /> Remove
                </button>
              </article>
            ))}

            <section className="account-card">
              <header className="account-card-head">
                <h2>Add a delivery address</h2>
                <small>Saved addresses can be reused at checkout in one tap.</small>
              </header>
              <AddressForm
                initial={{ name: user.name, phone: user.phone }}
                busy={busy}
                onSubmit={async (address) => {
                  setBusy(true);
                  try {
                    const data = await customerApi.saveAddress(address);
                    setAddresses(data.addresses || []);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </section>
          </div>
        ) : null}

        {tab === "profile" ? (
          <div className="account-grid">
            <section className="account-card">
              <header className="account-card-head">
                <h2>Your details</h2>
                <small>These are used on delivery labels only.</small>
              </header>
              <dl className="pd-specs">
                <div>
                  <dt>Name</dt>
                  <dd>{user.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{user.phone || "Not added yet"}</dd>
                </div>
                <div>
                  <dt>Signed in with</dt>
                  <dd>{user.provider === "google" ? "Google" : "Email & password"}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDate(user.created_at)}</dd>
                </div>
              </dl>
            </section>

            <section className="account-card">
              <header className="account-card-head">
                <h2>Shopping promises</h2>
              </header>
              <ul className="pd-facts">
                <li>
                  <i className="bi bi-cash-coin" aria-hidden="true" />
                  <span>
                    <strong>Cash on Delivery</strong> on every order
                  </span>
                </li>
                <li>
                  <i className="bi bi-arrow-repeat" aria-hidden="true" />
                  <span>
                    <strong>{RETURN_WINDOW_TEXT} return</strong> for size or damage — visible on
                    each order for one day
                  </span>
                </li>
                <li>
                  <i className="bi bi-shield-check" aria-hidden="true" />
                  <span>
                    Your data stays with the studio.{" "}
                    <Link to="/privacy">Privacy policy</Link>
                  </span>
                </li>
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
