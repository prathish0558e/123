import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Confetti from "../components/Confetti.jsx";
import ClassSelect from "../components/ClassSelect.jsx";
import useSeo from "../lib/useSeo.js";
import { PageHero, Reveal } from "../components/Reveal.jsx";
import { COMPANY } from "../data/content.js";

const whatsappEnquiryLink = (form) =>
  `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(
    `Hello TCT Fashion Hub,\n\nNew class enquiry\nName: ${form.name}\nPhone: ${form.phone}\nInterested in: ${form.interest}\nMessage: ${form.message || "Not provided"}`
  )}`;

export default function EnquirePage() {
  useSeo({
    title: "Enquire — Dresses & Classes | TCT Fashion Hub, Coimbatore",
    description:
      "Tell us what you need — a dress stitched to your measurements or a craft class (tailoring, embroidery, aari, jewellery, mehndi, saree pre-pleating, resin art). We'll call you back with prices and timings.",
    path: "/enquire",
    image: "/images/Logo.jpeg",
  });

  const [params] = useSearchParams();
  const prefill = params.get("class") || "";
  const prefillDisplay = prefill || "your class";
  const paymentPrice = params.get("price");
  const isPayment = params.get("action") === "payment";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    interest: prefill,
    message: "",
  });
  const [status, setStatus] = useState(null);
  const [burst, setBurst] = useState(0);
  const [classError, setClassError] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "interest" && e.target.value) setClassError(false);
  };

  // Keep the selected class in sync when ?class= changes
  useEffect(() => {
    const q = params.get("class");
    if (q) setForm((f) => ({ ...f, interest: q }));
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.interest) {
      setClassError(true);
      setShakeCount((c) => c + 1); // replay the shake on the select
      return;
    }
    setStatus("sending");
    window.open(whatsappEnquiryLink(form), "_blank", "noopener,noreferrer");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      setBurst((b) => b + 1); // fire the celebration
      setForm({ name: "", phone: "", email: "", interest: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <Confetti fireKey={burst} />

      <PageHero
        eyebrow="Begin here"
        title="Enquire With Us"
        text={
          isPayment
            ? `Complete your details to reserve ${prefillDisplay}${paymentPrice ? ` for Rs ${Number(paymentPrice).toLocaleString("en-IN")}` : ""}.`
            : "A dress, a class or a combo — tell us what you have in mind and we'll call you back."
        }
        crumb="Enquire"
      />

      <section className="section">
        <div className="container">
          <div className="split" style={{ gridTemplateColumns: "1.2fr 0.8fr", alignItems: "start" }}>
            <Reveal>
              <form className="fh-form" onSubmit={submit} noValidate>
                <div className="fh-grid-2">
                  <div className="field">
                    <label htmlFor="enq-name">Your name *</label>
                    <input
                      id="enq-name"
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="enq-phone">Phone *</label>
                    <input
                      id="enq-phone"
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="enq-email">Email (optional)</label>
                  <input
                    id="enq-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="you@example.com"
                  />
                </div>

                <div className={`field ${classError ? "fh-shake" : ""}`} key={shakeCount}>
                  <label>What are you enquiring about? *</label>
                  <ClassSelect
                    name="interest"
                    value={form.interest}
                    onChange={onChange}
                    invalid={classError}
                  />
                  {classError && (
                    <p className="fh-form-err">
                      <i className="bi bi-exclamation-circle-fill" /> Please
                      select a class to continue.
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="enq-msg">Message</label>
                  <textarea
                    id="enq-msg"
                    rows="4"
                    name="message"
                    value={form.message}
                    onChange={onChange}
                  />
                </div>

                <button
                  className="btn btn-primary btn-lg w-100"
                  disabled={status === "sending"}
                >
                  {status === "sending"
                    ? "Sending..."
                    : isPayment
                      ? "Continue to Payment"
                      : "Send Enquiry"}
                </button>

                {status === "sent" && (
                  <p className="fh-form-ok" role="status">
                    <i className="bi bi-check-circle-fill" />
                    Thank you! We'll be in touch shortly.
                  </p>
                )}
                {status === "error" && (
                  <p className="fh-form-err">
                    <i className="bi bi-exclamation-circle-fill" /> Something
                    went wrong — please call us instead.
                  </p>
                )}
              </form>
            </Reveal>

            <Reveal delay={120}>
              <div className="fh-contact-card">
                <h3>Studio details</h3>
                <ul className="fh-contact-list">
                  <li>
                    <span className="ic">
                      <i className="bi bi-telephone-fill" />
                    </span>
                    <span>
                      <a href={`tel:${COMPANY.phoneRaw}`}>{COMPANY.phone}</a>
                    </span>
                  </li>
                  <li>
                    <span className="ic">
                      <i className="bi bi-whatsapp" />
                    </span>
                    <span>
                      <a
                        href={`https://wa.me/${COMPANY.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp: {COMPANY.phone}
                      </a>
                    </span>
                  </li>
                  <li>
                    <span className="ic">
                      <i className="bi bi-envelope-fill" />
                    </span>
                    <span>
                      <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                    </span>
                  </li>
                  <li>
                    <span className="ic">
                      <i className="bi bi-geo-alt-fill" />
                    </span>
                    <span>
                      <a
                        href={COMPANY.mapsLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {COMPANY.address}
                      </a>
                    </span>
                  </li>
                  <li>
                    <span className="ic">
                      <i className="bi bi-clock-fill" />
                    </span>
                    <span>{COMPANY.hours}</span>
                  </li>
                </ul>
              </div>

              <div className="fh-map">
                <iframe
                  src={COMPANY.mapEmbed}
                  title="TCT Fashion Hub location map"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <div className="fh-note">
                <i className="bi bi-gift-fill" />
                <p style={{ margin: 0 }}>
                  Every enrolment includes a <strong>Basic Kit gift</strong> —
                  your materials are ready from day one.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
