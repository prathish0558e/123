import { Link } from "react-router-dom";
import useSeo from "../lib/useSeo.js";
import { COMPANY } from "../data/content.js";
import { RETURN_WINDOW_TEXT } from "../lib/orderFlow.js";

/*
 * The three studio policies, written from the shop's actual behaviour (not
 * boilerplate): the privacy policy covers the Google sign-in and the account
 * data the checkout really stores, and the return policy is the same one the
 * order page enforces — one day, size or damage.
 */
const POLICIES = {
  privacy: {
    title: "Privacy Policy",
    description:
      "How TCT Fashion Hub collects, uses and protects your personal data — including sign-in with Google, delivery addresses and order history.",
    path: "/privacy",
    updated: "14 October 2026",
    sections: [
      {
        heading: "Who we are",
        body: [
          `${COMPANY.name} is a boutique and craft studio at ${COMPANY.addressShort}, Coimbatore, India. We sell stitched-to-measure outfits and run craft classes. This policy explains what we do with the information you give us on this website.`,
        ],
      },
      {
        heading: "What we collect",
        list: [
          "Account details: your name, email address and (optionally) your phone number.",
          "If you use Continue with Google, Google shares your name, email address and profile picture with us. We never receive your Google password.",
          "Delivery data: the receiver's name, phone number, full address, pincode and landmark you enter at checkout.",
          "Order data: the items, sizes, prices and payment method (Cash on Delivery) of every order you place.",
          "Basic technical data: your IP address and browser details, kept in server logs to keep the shop secure and to stop abuse of the login form.",
        ],
        body: [
          "We do not store card, UPI or bank details. Only Cash on Delivery is available, so no payment credentials are ever collected on this site.",
        ],
      },
      {
        heading: "Why we use it",
        list: [
          "To stitch, pack and deliver your order to the right address.",
          "To show you your own orders and tracking updates.",
          "To answer your enquiries and keep you informed about an order you placed.",
          "To keep the site secure (login throttling, spam and abuse prevention).",
        ],
      },
      {
        heading: "Cookies and sessions",
        body: [
          "We use one HttpOnly session cookie for the shopper account and one for the studio admin panel. They only identify your signed-in session; they are not used for advertising or cross-site tracking, and we do not run third-party ad trackers.",
        ],
      },
      {
        heading: "Sharing",
        body: [
          "Your delivery address and phone number are shared only with the courier that carries your parcel, and only to complete the delivery. We do not sell or rent your personal data to anyone.",
        ],
      },
      {
        heading: "Keeping it safe",
        body: [
          "Passwords are stored as salted scrypt hashes — never in plain text. Sessions are HttpOnly cookies, order and address data can only be read back by the signed-in account that owns it, and admin access is a separate login with its own password.",
        ],
      },
      {
        heading: "Your choices",
        list: [
          "Ask us for a copy of the data we hold about you.",
          "Ask us to correct or delete your account, your addresses and your order history.",
          "Sign out at any time from My account — this ends the session immediately.",
        ],
        body: [
          `Write to ${COMPANY.email} or call ${COMPANY.phone} and we will act within 30 days.`,
        ],
      },
    ],
  },
  returns: {
    title: "Return & Refund Policy",
    description:
      "TCT Fashion Hub returns: a 1-day window, accepted only for size or fitting issues and damaged pieces. Free pickup and exchange details.",
    path: "/returns",
    updated: "14 October 2026",
    sections: [
      {
        heading: "The 1-day window",
        body: [
          `Every order gets a return window of ${RETURN_WINDOW_TEXT} from the moment it is placed. While that window is open you will see a "Request return" option inside that order in My account, together with a live countdown. When the countdown ends, the option disappears — for good.`,
          "You can also call the studio and ask us to raise it for you, as long as the window is still open.",
        ],
      },
      {
        heading: "What can be returned",
        list: [
          "Size / fitting issue — the stitched piece does not fit you the way it was measured.",
          "Damaged or defective — it arrived torn, stained, with a broken zip or faulty work.",
        ],
        body: [
          "Because every outfit is cut and stitched for one customer, these are the only two reasons we can accept. A change of mind, a different colour preference after delivery, or wear-and-tear is not covered.",
        ],
      },
      {
        heading: "How it works",
        list: [
          "Open My account → the order → Request return, and pick your reason.",
          "The studio calls you within one working day to confirm and to arrange a free pickup.",
          "We inspect the piece when it reaches us.",
          "You choose an exchange (re-stitched to the corrected measurement) or a refund of the amount paid.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Cash on Delivery orders are refunded to your bank account or UPI ID after pickup, normally within 5–7 working days of inspection. Bridal and heavy hand-work orders are case-by-case, and we will always tell you the outcome in writing before pickup.",
        ],
      },
      {
        heading: "Not covered",
        list: [
          "Requests raised after the one-day window has closed.",
          "Alterations requested on a garment that already fits — those are normal studio services, not returns.",
          "Damage caused after delivery, or by washing against the care note sent with your parcel.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    description:
      "The terms for shopping with TCT Fashion Hub: accounts, orders, made-to-measure stitching, pricing, delivery and returns.",
    path: "/terms",
    updated: "14 October 2026",
    sections: [
      {
        heading: "Your account",
        body: [
          "You need an account to place an order. Keep your password to yourself; you are responsible for orders placed from your signed-in session. You can sign in with an email and password, or with Google.",
        ],
      },
      {
        heading: "Orders and made-to-measure work",
        body: [
          "Every boutique piece is stitched after the order is placed, using the size you select and the measurements the studio confirms with you. A quick confirmation call or WhatsApp message may be needed before cutting begins.",
          "Cash on Delivery is the only payment method available right now. Other methods are shown as unavailable until the payment gateway goes live.",
        ],
      },
      {
        heading: "Prices",
        body: [
          'Starting prices shown on a card are for the base design and the simplest stitching. The final price can be higher where you choose a larger size, extra length or heavier hand-work — the studio always confirms that price with you before stitching. The word "starting" is doing real work there.',
        ],
      },
      {
        heading: "Delivery",
        body: [
          "Delivery inside India is free. Ready designs usually ship in 3–7 days; bridal and heavy hand-work takes 2–4 weeks. Tracking updates appear in My account as the studio moves your order along.",
        ],
      },
      {
        heading: "Returns",
        body: [
          `Returns are governed by our return policy: a ${RETURN_WINDOW_TEXT} window, and only for a size/fitting issue or a damaged piece.`,
        ],
      },
      {
        heading: "Studio content",
        body: [
          "Photos, sketches and descriptions on this site belong to the studio and are shown to describe the product you will receive. Hand-made pieces vary slightly from piece to piece — that is what hand-made means.",
        ],
      },
    ],
  },
};

export default function PolicyPage({ kind }) {
  const policy = POLICIES[kind] || POLICIES.privacy;

  useSeo({
    title: `${policy.title} — TCT Fashion Hub`,
    description: policy.description,
    path: policy.path,
  });

  return (
    <section className="section policy-section">
      <div className="container policy-wrap">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>{policy.title}</span>
        </nav>

        <header className="policy-head">
          <span className="eyebrow">Policies</span>
          <h1>{policy.title}</h1>
          <p className="policy-updated">
            Last updated {policy.updated} · {COMPANY.name}, {COMPANY.addressShort}
          </p>
        </header>

        <div className="policy-body">
          {policy.sections.map((section) => (
            <article key={section.heading}>
              <h2>{section.heading}</h2>
              {(section.body || []).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {section.list ? (
                <ul>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}

          <aside className="policy-contact">
            <h2>Questions?</h2>
            <p>
              Call <a href={`tel:${COMPANY.phoneRaw}`}>{COMPANY.phone}</a>, write to{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, or visit us at{" "}
              {COMPANY.addressShort}. You can also read our{" "}
              <Link to="/privacy">privacy policy</Link> and{" "}
              <Link to="/returns">return policy</Link>.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
