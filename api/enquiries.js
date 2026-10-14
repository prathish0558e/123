const enquiries = [];

module.exports = function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(enquiries);
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, message, interest } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required." });
  }

  const enquiry = {
    id: enquiries.length + 1,
    name,
    phone,
    interest: interest || "Not specified",
    message: message || "",
    createdAt: new Date().toISOString(),
  };

  enquiries.push(enquiry);
  return res.status(201).json({ ok: true, enquiry });
};
