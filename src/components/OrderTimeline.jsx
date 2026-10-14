import { formatDateTime, trackingSteps } from "../lib/orderFlow.js";

/*
 * The tracking timeline a shopper sees on an order.
 * Every step the studio has reached is ticked with the exact time it happened;
 * the step in progress is highlighted, and the rest stay grey.
 */
export default function OrderTimeline({ order }) {
  const steps = trackingSteps(order);

  return (
    <ol className="otl">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`otl-step ${step.done ? "is-done" : ""} ${step.current ? "is-current" : ""}`}
        >
          <span className="otl-dot">
            <i className={`bi ${step.done ? "bi-check2" : step.icon}`} aria-hidden="true" />
          </span>
          <div className="otl-body">
            <strong>{step.label}</strong>
            <small>{step.at ? formatDateTime(step.at) : step.note}</small>
          </div>
        </li>
      ))}
      {(order?.timeline || [])
        .filter((event) => String(event.status).startsWith("return"))
        .map((event) => (
          <li key={`${event.status}-${event.at}`} className="otl-step is-return">
            <span className="otl-dot">
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
            </span>
            <div className="otl-body">
              <strong>{event.label}</strong>
              <small>
                {formatDateTime(event.at)}
                {event.note ? ` · ${event.note}` : ""}
              </small>
            </div>
          </li>
        ))}
    </ol>
  );
}
