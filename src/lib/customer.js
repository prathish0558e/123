/*
 * Customer side of the API + the local shopping bag.
 *
 * Two different "logins" live in this project and they are deliberately
 * separate:
 *   - the studio admin signs in at /admin  (username + password, /api/admin/*)
 *   - a shopper signs in at /login         (email/phone + password or Google,
 *                                           /api/customer/*)
 * They use different cookies, different endpoints and different data, so being
 * signed in as a shopper never grants (or breaks) admin access.
 */

const CART_KEY = "tct_cart";
const SAME_SITE = { "x-tct-customer": "1" };

async function call(url, { headers, ...options } = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    // Built last on purpose: `...options` must never drop the JSON content
    // type, or the server sees an empty body and rejects a perfectly good
    // request (the CSRF header alone is not enough).
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.errors = data.errors || null;
    error.status = response.status;
    throw error;
  }
  return data;
}

export const customerApi = {
  /* accounts */
  register: (payload) =>
    call("/api/customer/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    call("/api/customer/login", { method: "POST", body: JSON.stringify(payload) }),
  google: (credential) =>
    call("/api/customer/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  session: () => call("/api/customer/session"),
  logout: () => call("/api/customer/logout", { method: "POST", headers: SAME_SITE }),
  config: () => call("/api/customer/config"),

  /* addresses */
  addresses: () => call("/api/customer/addresses"),
  saveAddress: (address) =>
    call("/api/customer/addresses", {
      method: "POST",
      headers: SAME_SITE,
      body: JSON.stringify(address),
    }),
  deleteAddress: (id) =>
    call(`/api/customer/addresses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: SAME_SITE,
    }),

  /* orders + tracking */
  createOrder: ({ items, address, addressId, payment }) =>
    call("/api/customer/orders", {
      method: "POST",
      headers: SAME_SITE,
      body: JSON.stringify({ items, address, addressId, payment }),
    }),
  orders: () => call("/api/customer/orders"),
  order: (id) => call(`/api/customer/orders/${encodeURIComponent(id)}`),
  requestReturn: (id, { reason, note }) =>
    call(`/api/customer/orders/${encodeURIComponent(id)}/return`, {
      method: "POST",
      headers: SAME_SITE,
      body: JSON.stringify({ reason, note }),
    }),
};

/* ------------------------------------------------------------- the bag ---
 * A line item is unique per product + size, because a kurti in M and the same
 * kurti in L are two different stitched pieces.
 */
const bagKey = (type, id, size) => `${type}::${id}::${size || "std"}`;

export function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("tct-cart-change"));
}

export function addToCart(item) {
  const cart = readCart();
  const key = bagKey(item.type, item.id, item.size);
  const existing = cart.find((entry) => bagKey(entry.type, entry.id, entry.size) === key);
  if (existing) {
    existing.quantity = Math.min(10, Number(existing.quantity || 1) + Number(item.quantity || 1));
  } else {
    cart.push({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) });
  }
  writeCart(cart);
  return cart;
}

export function updateQuantity(type, id, size, quantity) {
  const next = readCart()
    .map((entry) =>
      bagKey(entry.type, entry.id, entry.size) === bagKey(type, id, size)
        ? { ...entry, quantity: Math.max(1, Math.min(10, Number(quantity) || 1)) }
        : entry
    )
    .filter(Boolean);
  writeCart(next);
  return next;
}

export function removeFromCart(type, id, size) {
  const cart = readCart().filter(
    (item) => bagKey(item.type, item.id, item.size) !== bagKey(type, id, size)
  );
  writeCart(cart);
  return cart;
}

export function clearCart() {
  writeCart([]);
}

export const cartCount = () => readCart().reduce((sum, item) => sum + Number(item.quantity || 1), 0);
export const cartTotal = () => readCart().reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
