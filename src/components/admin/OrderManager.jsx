import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice, PanelCard, Spinner } from "./ui.jsx";
import { adminApi } from "../../lib/admin.js";
import { inr } from "../../lib/shop.js";
import { formatDateTime, trackingSteps } from "../../lib/orderFlow.js";

/*
 * Studio side of order tracking.
 *
 * Every order the website takes lands here. The studio moves it along the same
 * journey the customer sees on /orders/:id, and approves or declines the
 * one-day size/damage return requests.
 */
const SCOPE = [
  { id: "open", label: "In progress" },
  { id: "returns", label: "Returns" },
  { id: "delivered", label: "Delivered" },
  { id: "all", label: "All" },
];

export default function OrderManager() {
  const [data, setData] = useState(null);
  const [scope, setScope] = useState("open");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [open, setOpen] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await adminApi.orders());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const orders = data?.orders || [];
  const statuses = data?.statuses || [];

  const counts = useMemo(() => {
    const returns = orders.filter((o) => o.return).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const open = orders.filter((o) => o.status !== "delivered" && !o.return).length;
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    return { returns, delivered, open, revenue };
  }, [orders]);

  const visible = useMemo(() => {
    if (scope === "returns") return orders.filter((o) => o.return);
    if (scope === "delivered") return orders.filter((o) => o.status === "delivered");
    if (scope === "open") return orders.filter((o) => o.status !== "delivered" && !o.return);
    return orders;
  }, [orders, scope]);

  const act = async (id, run) => {
    setBusyId(id);
    setError("");
    try {
      await run();
      await load();
      setNotice("Order updated — the customer's tracking shows it right away.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  if (error && !data) return <Notice kind="err" text={error} />;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="adm-stats">
        <div className="adm-stat adm-stat--blue">
          <i className="bi bi-box-seam" aria-hidden="true" />
          <span className="adm-stat-value">{counts.open}</span>
          <span className="adm-stat-label">In progress</span>
        </div>
        <div className="adm-stat adm-stat--green">
          <i className="bi bi-house-check" aria-hidden="true" />
          <span className="adm-stat-value">{counts.delivered}</span>
          <span className="adm-stat-label">Delivered</span>
        </div>
        <div className="adm-stat adm-stat--rose">
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
          <span className="adm-stat-value">{counts.returns}</span>
          <span className="adm-stat-label">Return requests</span>
        </div>
        <div className="adm-stat adm-stat--orange">
          <i className="bi bi-cash-coin" aria-hidden="true" />
          <span className="adm-stat-value">{inr(counts.revenue)}</span>
          <span className="adm-stat-label">Order value (COD)</span>
        </div>
      </div>

      {notice ? <Notice kind="ok" text={notice} onClose={() => setNotice("")} /> : null}
      {error ? <Notice kind="err" text={error} onClose={() => setError("")} /> : null}

      <PanelCard
        title="Customer orders"
        subtitle="Move an order along, or settle a return request."
        actions={
          <div className="adm-scope">
            {SCOPE.map((item) => (
              <button
                key={item.id}
                type="button"
                className={scope === item.id ? "is-active" : ""}
                onClick={() => setScope(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {!visible.length ? (
          <p className="adm-hint">Nothing here yet.</p>
        ) : (
          <div className="adm-orders">
            {visible.map((order) => {
              const steps = trackingSteps(order);
              const isOpen = open === order.id;
              return (
                <article className={`adm-order ${isOpen ? "is-open" : ""}`} key={order.id}>
                  <header className="adm-order-head">
                    <button
                      type="button"
                      className="adm-order-toggle"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? "" : order.id)}
                    >
                      <i className={`bi ${isOpen ? "bi-chevron-down" : "bi-chevron-right"}`} aria-hidden="true" />
                      <span>
                        <strong>{order.id}</strong>
                        <small>
                          {order.customer_name} · {formatDateTime(order.created_at)}
                        </small>
                      </span>
                    </button>
                    <div className="adm-order-meta">
                      <span className="adm-status">{order.status_label}</span>
                      {order.return ? (
                        <span className={`adm-status adm-status--return`}>
                          Return: {order.return.status}
                        </span>
                      ) : null}
                      <strong>{inr(order.total)}</strong>
                    </div>
                  </header>

                  {isOpen ? (
                    <div className="adm-order-body">
                      <div className="adm-order-grid">
                        <div>
                          <h4>Items</h4>
                          <ul className="adm-order-items">
                            {order.items.map((item) => (
                              <li key={`${item.id}-${item.size || ""}`}>
                                <span>
                                  {item.name}
                                  {item.size ? ` · ${item.size}` : ""} × {item.quantity}
                                </span>
                                <strong>{inr(Number(item.price) * Number(item.quantity))}</strong>
                              </li>
                            ))}
                          </ul>

                          <h4>Deliver to</h4>
                          <p className="adm-order-address">
                            {order.address?.name}
                            <br />
                            {order.address?.line1}
                            {order.address?.line2 ? `, ${order.address.line2}` : ""}
                            <br />
                            {order.address?.city}, {order.address?.state} —{" "}
                            {order.address?.pincode}
                            <br />
                            {order.address?.phone} · {order.payment.label}
                          </p>
                        </div>

                        <div>
                          <h4>Tracking</h4>
                          <ol className="adm-order-timeline">
                            {steps.map((step) => (
                              <li key={step.id} className={step.done ? "is-done" : ""}>
                                <span />
                                <div>
                                  <strong>{step.label}</strong>
                                  <small>{step.at ? formatDateTime(step.at) : step.note}</small>
                                </div>
                              </li>
                            ))}
                          </ol>

                          <h4>Move to</h4>
                          <div className="adm-order-actions">
                            {statuses.map((status) => (
                              <button
                                key={status.id}
                                type="button"
                                className={`adm-btn ${order.status === status.id ? "is-current" : ""}`}
                                disabled={busyId === order.id || order.status === status.id}
                                onClick={() =>
                                  act(order.id, () => adminApi.setOrderStatus(order.id, status.id))
                                }
                              >
                                {status.label}
                              </button>
                            ))}
                          </div>

                          {order.return && order.return.status === "requested" ? (
                            <div className="adm-return">
                              <strong>
                                Return requested: {order.return.label}
                              </strong>
                              {order.return.note ? <p>{order.return.note}</p> : null}
                              <div className="adm-order-actions">
                                <button
                                  type="button"
                                  className="adm-btn adm-btn--primary"
                                  disabled={busyId === order.id}
                                  onClick={() =>
                                    act(order.id, () => adminApi.resolveReturn(order.id, "approved"))
                                  }
                                >
                                  Approve return
                                </button>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn--danger"
                                  disabled={busyId === order.id}
                                  onClick={() =>
                                    act(order.id, () => adminApi.resolveReturn(order.id, "rejected"))
                                  }
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </PanelCard>
    </>
  );
}
