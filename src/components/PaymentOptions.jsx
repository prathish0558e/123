import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { lockScroll, unlockScroll } from "../lib/scrollLock.js";

const WHATSAPP_NUMBER = "919384846922";
const UPI_ID = import.meta.env.VITE_UPI_ID || "";

const formatPrice = (price) => price.toLocaleString("en-IN");

const whatsappPaymentLink = (course, price) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hello TCT Fashion Hub, I would like to pay for ${course}. Price: Rs ${formatPrice(price)}. Please share the payment details.`
  )}`;

/**
 * PaymentOptions — premium payment modal.
 * Rendered through a React PORTAL onto <body> so it always appears
 * perfectly centered in the viewport the moment "Pay Now" is clicked,
 * no matter where the page is scrolled (fixes the "modal lost below"
 * bug caused by transformed card ancestors).
 *
 * With UPI configured (.env → VITE_UPI_ID) it also shows a scan-and-pay
 * QR code that works with GPay, PhonePe, Paytm and every UPI app.
 */
export default function PaymentOptions({ course, price, onClose }) {
  const [copied, setCopied] = useState(false);

  const upiLink = UPI_ID
    ? `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
        "TCT Fashion Hub"
      )}&am=${price}&cu=INR&tn=${encodeURIComponent(course)}`
    : "";

  // Lock page scroll + close on Escape while the modal is open
  useEffect(() => {
    lockScroll();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copyUpiId = async () => {
    if (!UPI_ID) return;
    await navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
  };

  return createPortal(
    <div className="tct-payment-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tct-payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="tct-payment-close"
          aria-label="Close payment options"
          onClick={onClose}
        >
          <i className="bi bi-x-lg" />
        </button>
        <p className="eyebrow">Secure your seat</p>
        <h2 id="payment-dialog-title" className="tct-info-title">
          Choose payment option
        </h2>
        <p className="tct-payment-summary">
          {course} <strong>Rs {formatPrice(price)}</strong>
        </p>

        <div className="tct-payment-body">
          <div className="tct-payment-actions">
            {UPI_ID && (
              <a className="btn btn-primary w-100" href={upiLink}>
                <i className="bi bi-phone me-2" /> Pay with UPI app
              </a>
            )}
            {UPI_ID && (
              <button
                type="button"
                className="btn btn-outline w-100 mt-2"
                onClick={copyUpiId}
              >
                <i className="bi bi-copy me-2" />{" "}
                {copied ? "UPI ID copied" : `Copy UPI ID: ${UPI_ID}`}
              </button>
            )}
            <a
              className={`btn btn-outline w-100${UPI_ID ? " mt-2" : ""}`}
              href={whatsappPaymentLink(course, price)}
              target="_blank"
              rel="noreferrer"
            >
              <i className="bi bi-whatsapp me-2" /> Get payment details on WhatsApp
            </a>
            <a
              className="btn btn-outline w-100 mt-2"
              href={`mailto:tctfashionhub@gmail.com?subject=${encodeURIComponent(
                `Payment enquiry: ${course}`
              )}&body=${encodeURIComponent(
                `Hello TCT Fashion Hub,\n\nI would like to pay for: ${course}\nPrice: Rs ${formatPrice(price)}\n\nPlease share the payment details.`
              )}`}
            >
              <i className="bi bi-envelope me-2" /> Use email instead
            </a>
          </div>

          {UPI_ID && (
            <div className="tct-payment-qr">
              <div className="tct-payment-qr__box">
                <QRCodeSVG
                  value={upiLink}
                  size={148}
                  bgColor="#ffffff"
                  fgColor="#0e1726"
                  level="M"
                />
              </div>
              <p className="tct-payment-qr__label">Scan &amp; pay with any UPI app</p>
              <p className="tct-payment-qr__sub">GPay · PhonePe · Paytm</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
