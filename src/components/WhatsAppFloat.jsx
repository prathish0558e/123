import { COMPANY } from "../data/content.js";

export default function WhatsAppFloat() {
  const href = `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(
    "Hi TCT Fashion Hub! I have an enquiry about your classes."
  )}`;

  return (
    <a
      className="wa-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
    >
      <i className="bi bi-whatsapp"></i>
    </a>
  );
}
