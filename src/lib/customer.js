const CART_KEY = "tct_cart";

async function call(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const customerApi = {
  register: (payload) => call("/api/customer/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => call("/api/customer/login", { method: "POST", body: JSON.stringify(payload) }),
  session: () => call("/api/customer/session"),
  logout: () => call("/api/customer/logout", { method: "POST", headers: { "x-tct-customer": "1" } }),
  createOrder: (items) =>
    call("/api/customer/orders", {
      method: "POST",
      headers: { "x-tct-customer": "1" },
      body: JSON.stringify({ items }),
    }),
};

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
  const existing = cart.find((entry) => entry.type === item.type && entry.id === item.id);
  if (existing) existing.quantity = Math.min(10, existing.quantity + 1);
  else cart.push({ ...item, quantity: 1 });
  writeCart(cart);
  return cart;
}

export function removeFromCart(type, id) {
  const cart = readCart().filter((item) => item.type !== type || item.id !== id);
  writeCart(cart);
  return cart;
}

export function clearCart() {
  writeCart([]);
}
