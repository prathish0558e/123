/*
 * One place for the shopping promises, so the shop, the account pages and the
 * admin panel can never disagree about them.
 *
 *   - Payment: Cash on Delivery only right now. Every other method is shown as
 *     unavailable instead of being offered and then failing.
 *   - Returns: one day, and only for a size/fitting problem or a damaged piece.
 */

export const PAYMENT_METHODS = [
  {
    id: "cod",
    label: "Cash on Delivery",
    hint: "Pay the delivery partner when your outfit arrives. Available now.",
    icon: "bi-cash-coin",
    available: true,
  },
  {
    id: "upi",
    label: "UPI / GPay / PhonePe",
    hint: "Coming soon — the studio is finishing its payment gateway setup.",
    icon: "bi-qr-code",
    available: false,
  },
  {
    id: "card",
    label: "Credit / Debit card",
    hint: "Coming soon.",
    icon: "bi-credit-card-2-front",
    available: false,
  },
  {
    id: "netbanking",
    label: "Net banking",
    hint: "Coming soon.",
    icon: "bi-bank",
    available: false,
  },
];

/** The customer-visible order journey, in order. */
export const ORDER_STEPS = [
  { id: "placed", label: "Order placed", icon: "bi-receipt", note: "We received your order." },
  { id: "confirmed", label: "Confirmed", icon: "bi-patch-check", note: "Fabric and measurements confirmed." },
  { id: "packed", label: "Packed", icon: "bi-box-seam", note: "Stitched, checked and packed." },
  { id: "shipped", label: "Shipped", icon: "bi-truck", note: "Handed to the delivery partner." },
  { id: "out_for_delivery", label: "Out for delivery", icon: "bi-geo-alt", note: "Arriving today." },
  { id: "delivered", label: "Delivered", icon: "bi-house-check", note: "Delivered to you." },
];

export const RETURN_REASONS = [
  { id: "size_issue", label: "Size / fitting issue", hint: "The outfit does not fit as expected." },
  { id: "damaged", label: "Damaged or defective", hint: "It arrived torn, stained or faulty." },
];

export const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;
export const RETURN_WINDOW_TEXT = "1 day";

export const statusIndex = (status) => ORDER_STEPS.findIndex((s) => s.id === status);

/** Steps with a done/current/pending flag for the tracking timeline. */
export function trackingSteps(order) {
  const current = statusIndex(order?.status);
  const reached = new Set((order?.timeline || []).map((t) => t.status));
  return ORDER_STEPS.map((step, index) => {
    const event = (order?.timeline || []).find((t) => t.status === step.id);
    const done = reached.has(step.id) || (current >= 0 && index < current);
    return {
      ...step,
      done,
      current: current === index,
      at: event?.at || "",
    };
  });
}

/** "in 5h 12m" / "closed" — how long the return window stays open. */
export function returnCountdown(order, now = Date.now()) {
  const endsAt = new Date(order?.return_window_ends_at || 0).getTime();
  const left = endsAt - now;
  if (!endsAt || left <= 0) return "closed";
  const hours = Math.floor(left / 3600000);
  const minutes = Math.floor((left % 3600000) / 60000);
  return hours >= 1 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export function isReturnWindowOpen(order, now = Date.now()) {
  if (!order || order.return) return false;
  const endsAt = new Date(order.return_window_ends_at || 0).getTime();
  return endsAt > now;
}

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

/** Free delivery inside India — the studio ships every order itself. */
export const DELIVERY_TEXT = "Free delivery across India · stitched in 3–7 days";
