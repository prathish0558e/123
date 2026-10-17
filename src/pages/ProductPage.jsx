import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSeo from "../lib/useSeo.js";
import { siteUrlFor } from "../lib/seo.js";
import { fetchDresses, inr } from "../lib/shop.js";
import { addToCart } from "../lib/customer.js";
import { flyToBag } from "../lib/flyToBag.js";
import { useCustomer } from "../components/CustomerProvider.jsx";
import { DELIVERY_TEXT, RETURN_WINDOW_TEXT } from "../lib/orderFlow.js";
import { COMPANY } from "../data/content.js";
import DressFlipCard from "../components/DressFlipCard.jsx";
import { Reveal } from "../components/Reveal.jsx";

/*
 * /shop/:id — the full product page (Photo · size · price · details).
 * A shopper only ever sees this after tapping a card, so it stays focused:
 * pick a size, read the details, then add to bag or buy now.
 */
export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dress, setDress] = useState(null);
  const [all, setAll] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | missing
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState("");
  /* The photo the "added" animation lifts off the page. */
  const photoRef = useRef(null);
  const { user, loading: sessionLoading } = useCustomer();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSize("");
    setQuantity(1);
    setActive(0);
    setNotice("");

    fetch(`/api/dresses/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDress(data);
        setSize(Array.isArray(data.sizes) && data.sizes.length === 1 ? data.sizes[0] : "");
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("missing"));

    fetchDresses()
      .then((data) => !cancelled && setAll(data.dresses || []))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  const gallery = useMemo(() => {
    if (!dress) return [];
    const list = [dress.image, ...(Array.isArray(dress.gallery) ? dress.gallery : [])].filter(Boolean);
    return [...new Set(list)];
  }, [dress]);

  const related = useMemo(
    () => all.filter((d) => d.id !== id && d.category === dress?.category).slice(0, 4),
    [all, dress, id]
  );

  const discount =
    dress && Number(dress.mrp) > Number(dress.startingPrice)
      ? Math.round(
          ((Number(dress.mrp) - Number(dress.startingPrice)) / Number(dress.mrp)) * 100
        )
      : 0;

  const add = (goToCheckout) => {
    /* The bag is an account feature: no signed-in shopper, no bag. */
    if (sessionLoading) return;
    if (!user) {
      navigate("/login", { state: { from: `/shop/${id}` } });
      return;
    }
    if (dress.sizes?.length && !size) {
      setNotice("Please choose a size first — every piece is stitched to one.");
      return;
    }
    addToCart({
      type: "dress",
      id: dress.id,
      name: dress.name,
      price: Number(dress.startingPrice),
      image: dress.image,
      size,
      quantity,
    });
    setNotice(`${dress.name}${size ? ` (${size})` : ""} added to your bag.`);
    /* "Buy now" jumps straight to checkout, so the flying image and the drawer
       would only be interrupted — the plain bump is enough there. */
    flyToBag(photoRef.current, { image: dress.image, openBag: !goToCheckout });
    if (goToCheckout) navigate("/checkout");
  };

  useSeo({
    title: dress
      ? `${dress.name} — ${dress.category} from ${inr(dress.startingPrice)} | TCT Fashion Hub`
      : "Boutique collection | TCT Fashion Hub",
    description:
      dress?.description ||
      "Boutique outfits stitched to your measurements at TCT Fashion Hub, Ganapathy, Coimbatore.",
    path: `/shop/${id}`,
    image: dress?.image,
    robots: status === "missing" ? "noindex, follow" : "index, follow",
    jsonLdId: "product-jsonld",
    jsonLd:
      dress && status === "ready"
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: dress.name,
            description: dress.description,
            image: dress.image?.startsWith("/")
              ? siteUrlFor(dress.image) || undefined
              : dress.image,
            category: dress.category,
            material: dress.fabric || undefined,
            brand: { "@type": "Brand", name: COMPANY.name },
            offers: {
              "@type": "Offer",
              price: String(dress.startingPrice),
              priceCurrency: "INR",
              availability:
                dress.inStock === false
                  ? "https://schema.org/PreOrder"
                  : "https://schema.org/InStock",
              ...(siteUrlFor(`/shop/${dress.id}`) ? { url: siteUrlFor(`/shop/${dress.id}`) } : {}),
            },
          }
        : null,
  });

  if (status === "loading") {
    return (
      <section className="section product-section">
        <div className="container pd-skeleton" aria-hidden="true">
          <div className="sk-thumb" />
          <div className="sk-body">
            <span className="sk-line sk-line--sm" />
            <span className="sk-line" />
            <span className="sk-line sk-line--price" />
          </div>
        </div>
      </section>
    );
  }

  if (status === "missing" || !dress) {
    return (
      <section className="section product-section">
        <div className="container">
          <div className="shop-empty">
            <i className="bi bi-search" aria-hidden="true" />
            <h3>That design is no longer on the shelf</h3>
            <p>It may have been renamed or removed from the boutique catalogue.</p>
            <Link className="btn btn-primary" to="/shop">
              Browse the collection
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section product-section">
      <div className="container">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <Link to="/shop">Shop</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>{dress.name}</span>
        </nav>

        <div className="pd-grid">
          <div className="pd-media">
            <div className="pd-photo">
              <img
                ref={photoRef}
                src={gallery[active] || "/images/placeholder.svg"}
                alt={dress.name}
                onError={(e) => {
                  e.currentTarget.src = "/images/placeholder.svg";
                }}
              />
              {discount > 0 ? <span className="pd-off">{discount}% off</span> : null}
            </div>
            {gallery.length > 1 ? (
              <div className="pd-thumbs">
                {gallery.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    className={index === active ? "is-active" : ""}
                    onClick={() => setActive(index)}
                    aria-label={`Photo ${index + 1}`}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="pd-actions">
              <button type="button" className="btn btn-primary" onClick={() => add(false)}>
                <i className="bi bi-bag-plus" aria-hidden="true" /> Add to bag
              </button>
              <button type="button" className="btn btn-buy" onClick={() => add(true)}>
                <i className="bi bi-lightning-charge" aria-hidden="true" /> Buy now
              </button>
            </div>
            {notice ? (
              <p className="pd-notice" role="status">
                <i className="bi bi-info-circle" aria-hidden="true" /> {notice}
              </p>
            ) : null}
          </div>

          <div className="pd-info">
            <span className="pcard-cat">{dress.category}</span>
            <h1>{dress.name}</h1>
            {dress.badge ? <span className="pd-badge">{dress.badge}</span> : null}

            <div className="pd-price">
              <strong>{inr(dress.startingPrice)}</strong>
              {Number(dress.mrp) > Number(dress.startingPrice) ? (
                <>
                  <s>{inr(dress.mrp)}</s>
                  <em>{discount}% off</em>
                </>
              ) : null}
            </div>
            <p className="pd-price-note">
              {Number(dress.priceMax) > Number(dress.startingPrice)
                ? `Stitching ranges up to ${inr(dress.priceMax)} depending on size and work.`
                : "Final price confirmed by the studio before stitching."}
            </p>

            <div className="pd-block">
              <h2 className="pd-label">
                Select size {dress.sizes?.length ? <span>Required</span> : null}
              </h2>
              {dress.sizes?.length ? (
                <div className="pd-sizes">
                  {dress.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={size === option ? "is-active" : ""}
                      aria-pressed={size === option}
                      onClick={() => {
                        setSize(option);
                        setNotice("");
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="pd-hint">One size — stitched to your measurements after the order.</p>
              )}
            </div>

            <div className="pd-block">
              <h2 className="pd-label">Quantity</h2>
              <div className="pd-qty">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">
                  <i className="bi bi-dash" aria-hidden="true" />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label="Increase">
                  <i className="bi bi-plus" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="pd-block">
              <h2 className="pd-label">Highlights</h2>
              <ul className="pd-facts">
                <li>
                  <i className="bi bi-cash-coin" aria-hidden="true" />
                  <span>
                    <strong>Cash on Delivery</strong> available on every order
                  </span>
                </li>
                <li>
                  <i className="bi bi-arrow-repeat" aria-hidden="true" />
                  <span>
                    <strong>{RETURN_WINDOW_TEXT} return</strong> for size issues and damaged pieces
                  </span>
                </li>
                <li>
                  <i className="bi bi-truck" aria-hidden="true" />
                  <span>{DELIVERY_TEXT}</span>
                </li>
                <li>
                  <i className="bi bi-rulers" aria-hidden="true" />
                  <span>Stitched to your measurements in Ganapathy, Coimbatore</span>
                </li>
              </ul>
            </div>

            <div className="pd-block">
              <h2 className="pd-label">Details</h2>
              <dl className="pd-specs">
                <div>
                  <dt>Category</dt>
                  <dd>{dress.category}</dd>
                </div>
                {dress.fabric ? (
                  <div>
                    <dt>Fabric</dt>
                    <dd>{dress.fabric}</dd>
                  </div>
                ) : null}
                {dress.sizes?.length ? (
                  <div>
                    <dt>Available sizes</dt>
                    <dd>{dress.sizes.join(" · ")}</dd>
                  </div>
                ) : null}
                {dress.colors?.length ? (
                  <div>
                    <dt>Colours</dt>
                    <dd>{dress.colors.join(", ")}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Delivery</dt>
                  <dd>3–7 days (bridal wear 2–4 weeks)</dd>
                </div>
                <div>
                  <dt>Returns</dt>
                  <dd>
                    Within {RETURN_WINDOW_TEXT} of ordering · size or damage only
                  </dd>
                </div>
              </dl>
            </div>

            {dress.description ? (
              <div className="pd-block">
                <h2 className="pd-label">About this design</h2>
                <p className="pd-desc">{dress.description}</p>
              </div>
            ) : null}

            <div className="pd-help">
              <a
                className="btn btn-outline"
                href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(
                  `Hello TCT Fashion Hub! I have a question about ${dress.name}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bi bi-whatsapp" aria-hidden="true" /> Ask on WhatsApp
              </a>
              <a className="pd-link" href={`tel:${COMPANY.phoneRaw}`}>
                <i className="bi bi-telephone" aria-hidden="true" /> {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>

        {related.length ? (
          <div className="pd-related">
            <h2>More {dress.category} designs</h2>
            <div className="dress-grid">
              {related.map((item, i) => (
                <DressFlipCard key={item.id} dress={item} delay={(i % 3) * 60} />
              ))}
            </div>
          </div>
        ) : (
          <Reveal>
            <div className="pd-back">
              <Link className="btn btn-outline" to="/shop">
                <i className="bi bi-arrow-left" aria-hidden="true" /> Back to the collection
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
