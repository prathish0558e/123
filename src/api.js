/*
 * Tiny API client for the Node/Express backend (backend/server.js).
 * The 3D assistant's lead flow posts here; the same endpoint backs the
 * Enquire page form, so every enquiry lands in one pipeline.
 */
export async function postEnquiry(payload) {
  const res = await fetch("/api/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* handled below */
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Enquiry failed (${res.status}).`);
  }
  return data.enquiry;
}
