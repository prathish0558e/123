import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ClassInfoModal from "./ClassInfoModal.jsx";
import { Reveal, SectionHead } from "./Reveal.jsx";
import { addToCart } from "../lib/customer.js";
import { useCustomer } from "./CustomerProvider.jsx";

const INDIVIDUAL_PRICES = {
  "Tailoring Class": 8000,
  "Embroidery Class": 7000,
  "Jewellery Making": 6000,
  "Saree Pre-Pleating": 2000,
  "Mehndi Class": 4000,
  "Aari Work Class": 7000,
};

export default function ComboClasses({ combos }) {
  const [infoCombo, setInfoCombo] = useState(null);
  const { user } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const buy = (item) => {
    if (!user) return navigate("/login", { state: { from: `${location.pathname}${location.hash}` } });
    addToCart({ type: "combo", id: item.id, name: item.name, price: item.total, image: item.image });
    navigate("/cart");
  };

  const savingsFor = (combo) => {
    const sum = combo.items.reduce(
      (acc, item) => acc + (INDIVIDUAL_PRICES[item] || 0),
      0
    );
    return sum > 0 ? sum - combo.total : null;
  };

  return (
    <>
      <section id="combos" className="section dark">
        <div className="container">
          <SectionHead
            eyebrow="Save more, learn more"
            title="Combo Classes"
            text="Curated bundles at special prices — bigger kits, bigger savings."
          />

          <div className="grid-3">
            {combos.map((combo, i) => {
              const save = savingsFor(combo);
              const featured = Boolean(combo.featured);
              return (
                <Reveal key={combo.id} delay={(i % 3) * 90}>
                  <article
                    className={`fh-card ${featured ? "fh-card--featured" : ""}`}
                    onClick={() => setInfoCombo(combo)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setInfoCombo(combo);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${combo.name}`}
                  >
                    <div className="fh-card-photo">
                      {combo.badge && (
                        <span
                          className={`fh-badge ${featured ? "fh-badge--warm" : ""}`}
                        >
                          {combo.badge}
                        </span>
                      )}
                      <img
                        src={combo.image}
                        alt={combo.name}
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
                      <h3 className="fh-card-title">{combo.name}</h3>
                      <p className="fh-price">
                        <small>Rs</small>
                        {combo.total.toLocaleString("en-IN")}
                      </p>
                      {save !== null && save > 0 && (
                        <p className="fh-save">
                          <i className="bi bi-tag-fill" /> You save Rs{" "}
                          {save.toLocaleString("en-IN")}
                        </p>
                      )}
                      <ul className="fh-list">
                        {combo.items.map((item) => (
                          <li key={item}>
                            <i className="bi bi-check2" /> {item}
                          </li>
                        ))}
                      </ul>
                      <span className="fh-view-hint">
                        <i className="bi bi-arrows-fullscreen" /> View details
                      </span>
                      <p className="fh-gift">
                        <i className="bi bi-gift-fill" />
                        <span>{combo.gift}</span>
                      </p>
                      <button
                        type="button"
                        className={`btn w-100 mt-auto ${
                          featured ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          buy(combo);
                        }}
                      >
                        <i className="bi bi-credit-card" /> Pay Now
                      </button>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {infoCombo && (
        <ClassInfoModal
          item={infoCombo}
          onClose={() => setInfoCombo(null)}
          onPay={() => {
            setInfoCombo(null);
            buy(infoCombo);
          }}
        />
      )}
    </>
  );
}
