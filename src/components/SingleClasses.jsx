import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ClassInfoModal from "./ClassInfoModal.jsx";
import { Reveal, SectionHead } from "./Reveal.jsx";
import { addToCart } from "../lib/customer.js";
import { useCustomer } from "./CustomerProvider.jsx";

export default function SingleClasses({ classes }) {
  const [infoClass, setInfoClass] = useState(null);
  const { user } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const buy = (item) => {
    if (!user) return navigate("/login", { state: { from: `${location.pathname}${location.hash}` } });
    addToCart({ type: "class", id: item.id, name: item.name, price: item.price, image: item.image });
    navigate("/cart");
  };

  return (
    <>
      <section id="classes" className="section">
        <div className="container">
          <SectionHead
            eyebrow="Learn a craft"
            title="Single Classes"
            text="Focused, mentor-led sessions — every enrolment comes with a Basic Kit gift."
          />

          <div className="grid-3">
            {classes.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 90}>
                <article
                  className="fh-card"
                  onClick={() => setInfoClass(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setInfoClass(c);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${c.name}`}
                >
                  <div className="fh-card-photo">
                    <img
                      src={c.image}
                      alt={c.name}
                      loading="lazy"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = "1";
                          e.currentTarget.src = "/images/placeholder.svg";
                        }
                      }}
                    />
                  </div>
                  <div className="fh-card-body">
                    <div className="fh-card-head">
                      <h3 className="fh-card-title">{c.name}</h3>
                      <span className="fh-chip">{c.level}</span>
                    </div>
                    <p className="fh-price">
                      <small>Rs</small>
                      {c.price.toLocaleString("en-IN")}
                    </p>
                    <ul className="fh-meta">
                      <li>
                        <i className="bi bi-clock" /> {c.duration}
                      </li>
                    </ul>
                    <span className="fh-view-hint">
                      <i className="bi bi-arrows-fullscreen" /> View details
                    </span>
                    <p className="fh-gift">
                      <i className="bi bi-gift-fill" />
                      <span>{c.gift}</span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary mt-auto w-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        buy(c);
                      }}
                    >
                      <i className="bi bi-credit-card" /> Pay Now
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {infoClass && (
        <ClassInfoModal
          item={infoClass}
          onClose={() => setInfoClass(null)}
          onPay={() => {
            setInfoClass(null);
            buy(infoClass);
          }}
        />
      )}
    </>
  );
}
