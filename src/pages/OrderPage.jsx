import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCustomer } from "../components/CustomerProvider.jsx";
import OrderTimeline from "../components/OrderTimeline.jsx";
import { customerApi } from "../lib/customer.js";
import { inr } from "../lib/shop.js";
import useSeo from "../lib/useSeo.js";
import {
  RETURN_REASONS,
  RETURN_WINDOW_TEXT,
  formatDateTime,
  isReturnWindowOpen,
  returnCountdown,
} from "../lib/orderFlow.js";

/*
 * /orders/:id — track one order.
 *
 * The return block is deliberately narrow, exactly like the studio's promise:
 * it exists only while the 1-day window is open, and it offers only "size
 * issue" or "damaged". Once the window closes (or a request is sent) the block
 * turns into a plain explanation.
 */
export default function OrderPage() {
  const { id } = useParams();
  const { user, loading } = useCustomer();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [, forceTick] = useState(0);

  useSeo({
    title: `Order ${id} — tracking | TCT Fashion Hub`,
    description: "Track your TCT Fashion Hub order, see every studio update and raise a return.",
    path: `/orders/${id}`,
    robots: "noindex, nofollow",
  });

  const load = useCallback(async () => {
    try {
      const data = await customerApi.order(id);
      setOrder(data.order);
      setStatus("ready");
    } catch {
      setStatus("missing");
    }
  }, [id]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: `/orders/${id}` } });
      return;
    }
    if (user) load();
  }, [loading, user, navigate, load, id]);

  /* Keep the return countdown honest while the page is open. */
  useEffect(() => {
    const timer = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const submitReturn = async (event) => {
    event.preventDefault();
    setError("");
    if (!reason) {
      setError("Choose a reason — size/fitting issue or damaged item.");
      return;
    }
    setBusy(true);
    try {
      const data = await customerApi.requestReturn(id, { reason, note });
      setOrder(data.order);
      setDone("Return requested. The studio will call you to arrange pickup.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || !order) {
    return (
      <section className="section account-section">
        <div className="container">
          <p className="checkout-wait">
            <i className="bi bi-arrow-repeat" aria-hidden="true" />{" "}
            {status === "missing" ? (
              <>
                We could not find that order.{" "}
                <Link to="/account">Back to your orders</Link>
              </>
            ) : (
              "Loading your order…"
            )}
          </p>
        </div>
      </section>
    );
  }

  const windowOpen = isReturnWindowOpen(order);

  return (
    <section className="section account-section">
      <div className="container">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/account">My orders</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>{order.id}</span>
        </nav>

        <header className="order-head">
          <div>
            <span className="eyebrow">Order tracking</span>
            <h1>{order.id}</h1>
            <p className="order-sub">
              Placed {formatDateTime(order.created_at)} ·{" "}
              {order.items.length} item{order.items.length > 1 ? "s" : ""} ·{" "}
              {order.payment.label}
            </p>
          </div>
          <span className={`order-pill order-pill--${order.status}`}>{order.status_label}</span>
        </header>

        <div className="order-layout">
          <div className="order-main">
            <section className="account-card">
              <header className="account-card-head">
                <h2>Tracking</h2>
                <small>Updated by the studio at every step</small>
              </header>
              <OrderTimeline order={order} />
            </section>

            <section className="account-card">
              <header className="account-card-head">
                <h2>Items</h2>
              </header>
              <div className="checkout-items">
                {order.items.map((item) => (
                  <div className="checkout-item" key={`${item.type}-${item.id}-${item.size || "std"}`}>
                    {item.image ? <img src={item.image} alt="" /> : null}
                    <span>
                      <strong>
                        {item.type === "dress" ? (
                          <Link to={`/shop/${item.id}`}>{item.name}</Link>
                        ) : (
                          item.name
                        )}
                      </strong>
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
                  <strong>{inr(order.subtotal)}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong className="cart-free">Free</strong>
                </div>
                <div className="cart-total">
                  <span>Total payable</span>
                  <strong>{inr(order.total)}</strong>
                </div>
              </div>
            </section>

            <section className="account-card">
              <header className="account-card-head">
                <h2>Return</h2>
                <small>
                  {RETURN_WINDOW_TEXT} window · size or damage only
                </small>
              </header>

              {order.return ? (
                <div className={`return-state return-state--${order.return.status}`}>
                  <i className="bi bi-arrow-repeat" aria-hidden="true" />
                  <div>
                    <strong>
                      {order.return.label} · <em>{order.return.status}</em>
                    </strong>
                    <small>
                      Requested {formatDateTime(order.return.requested_at)}
                      {order.return.note ? ` · ${order.return.note}` : ""}
                    </small>
                  </div>
                </div>
              ) : windowOpen ? (
                <form className="return-form" onSubmit={submitReturn}>
                  <p className="return-window">
                    <i className="bi bi-clock-history" aria-hidden="true" /> Return window open —{" "}
                    {returnCountdown(order)}
                  </p>
                  <div className="return-reasons">
                    {RETURN_REASONS.map((option) => (
                      <label
                        key={option.id}
                        className={`return-reason ${reason === option.id ? "is-active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={option.id}
                          checked={reason === option.id}
                          onChange={() => setReason(option.id)}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.hint}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <label className="return-note">
                    <span>Tell us what went wrong (optional)</span>
                    <textarea
                      rows={3}
                      value={note}
                      maxLength={400}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. the kurti is tight around the shoulders — bust fits fine"
                    />
                  </label>
                  {error ? (
                    <p className="addr-form-error" role="alert">
                      <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {error}
                    </p>
                  ) : null}
                  <button className="btn btn-primary" disabled={busy} type="submit">
                    {busy ? "Sending…" : "Request return"}
                  </button>
                </form>
              ) : (
                <div className="return-closed">
                  <i className="bi bi-lock" aria-hidden="true" />
                  <div>
                    <strong>The return window for this order has closed.</strong>
                    <small>
                      Returns are accepted for {RETURN_WINDOW_TEXT} after ordering, and only for a
                      size/fitting issue or a damaged item. Call the studio if you need help —{" "}
                      <Link to="/returns">read the policy</Link>.
                    </small>
                  </div>
                </div>
              )}

              {done ? (
                <p className="pd-notice" role="status">
                  <i className="bi bi-check2-circle" aria-hidden="true" /> {done}
                </p>
              ) : null}
            </section>
          </div>

          <aside className="order-side">
            <section className="account-card">
              <header className="account-card-head">
                <h2>Delivery address</h2>
              </header>
              <address className="order-address">
                <strong>{order.address?.name}</strong>
                <span>
                  {order.address?.line1}
                  {order.address?.line2 ? `, ${order.address.line2}` : ""}
                </span>
                <span>
                  {order.address?.city}, {order.address?.state} — {order.address?.pincode}
                </span>
                {order.address?.landmark ? <span>Landmark: {order.address.landmark}</span> : null}
                <span>
                  <i className="bi bi-telephone" aria-hidden="true" /> {order.address?.phone}
                </span>
              </address>
            </section>

            <section className="account-card">
              <header className="account-card-head">
                <h2>Payment</h2>
              </header>
              <p className="order-pay">
                <i className="bi bi-cash-coin" aria-hidden="true" />
                <span>
                  <strong>{order.payment.label}</strong>
                  <small>
                    {inr(order.total)} payable in cash at delivery
                  </small>
                </span>
              </p>
            </section>

            <section className="account-card">
              <header className="account-card-head">
                <h2>Need help?</h2>
              </header>
              <p className="order-help">
                Quote <strong>{order.id}</strong> when you call the studio — we can see exactly
                where your parcel is.
              </p>
              <Link className="btn btn-outline btn-block" to="/account">
                All my orders
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
