/*
 * Admin panel client.
 *
 * The session lives in an HttpOnly cookie set by the server, so nothing
 * sensitive is kept in localStorage. Every mutation also sends the
 * `x-tct-admin: 1` header the backend requires (CSRF guard).
 */
const CSRF_HEADER = { "x-tct-admin": "1" };

async function call(path, { method = "GET", body, allowFalse = false } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(method === "GET" ? {} : CSRF_HEADER),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (allowFalse) return data;
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const adminApi = {
  // auth
  session: () => call("/api/admin/session", { allowFalse: true }),
  login: (username, password) =>
    call("/api/admin/login", { method: "POST", body: { username, password } }),
  logout: () => call("/api/admin/logout", { method: "POST", body: {} }),
  changePassword: (current, next) =>
    call("/api/admin/password", { method: "POST", body: { current, next } }),

  // boutique
  dresses: () => call("/api/admin/dresses"),
  createDress: (dress) => call("/api/admin/dresses", { method: "POST", body: dress }),
  updateDress: (id, dress) =>
    call(`/api/admin/dresses/${encodeURIComponent(id)}`, { method: "PUT", body: dress }),
  deleteDress: (id) =>
    call(`/api/admin/dresses/${encodeURIComponent(id)}`, { method: "DELETE", body: {} }),
  uploadImage: (name, dataUrl) =>
    call("/api/admin/uploads", { method: "POST", body: { name, dataUrl } }),

  // classes
  classes: () => call("/api/admin/classes"),
  createClass: (kind, item) =>
    call(`/api/admin/classes/${kind}`, { method: "POST", body: item }),
  updateClass: (kind, id, item) =>
    call(`/api/admin/classes/${kind}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: item,
    }),
  deleteClass: (kind, id) =>
    call(`/api/admin/classes/${kind}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: {},
    }),

  // enquiries
  enquiries: () => call("/api/admin/enquiries"),
  customers: () => call("/api/admin/customers"),
  orders: () => call("/api/admin/orders"),
  setOrderStatus: (id, status) =>
    call(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: { status },
    }),
  resolveReturn: (id, decision) =>
    call(`/api/admin/orders/${encodeURIComponent(id)}/return`, {
      method: "POST",
      body: { decision },
    }),
  setEnquiryStatus: (id, status) =>
    call(`/api/admin/enquiries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    }),

  // maintenance
  resetCatalog: () => call("/api/admin/catalog/reset", { method: "POST", body: {} }),
};
