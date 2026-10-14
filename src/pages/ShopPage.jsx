import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DressShop from "../components/DressShop.jsx";
import useSeo from "../lib/useSeo.js";
import { fetchDresses, inr, useLiveCatalog } from "../lib/shop.js";
import { DELIVERY_TEXT, RETURN_WINDOW_TEXT } from "../lib/orderFlow.js";

/*
 * /shop — the whole boutique collection on its own page.
 * The home page keeps a shorter teaser; this is where search lands.
 */
export default function ShopPage() {
  const [dresses, setDresses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ minPrice: 0, count: 0 });

  const load = useCallback(async () => {
    try {
      const data = await fetchDresses();
      setDresses(data.dresses || []);
      setCategories(data.categories || []);
      setStats(data.stats || { minPrice: 0, count: 0 });
    } catch {
      setDresses([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveCatalog(load);

  useSeo({
    title: "Shop Boutique Dresses Online | TCT Fashion Hub Coimbatore",
    description:
      "Buy kurtis, sarees, lehengas, blouses, gowns and kids wear stitched to your measurements in Ganapathy, Coimbatore. Cash on Delivery, free delivery and a 1-day return on size or damage.",
    path: "/shop",
    image: "/images/Tct-front-background.jpeg",
  });

  return (
    <>
      <section className="section shop-hero">
        <div className="container">
          <nav className="pd-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span>Shop</span>
          </nav>
          <span className="eyebrow">The boutique collection</span>
          <h1>Every design, one studio</h1>
          <p className="shop-hero-text">
            {stats.count ? `${stats.count} designs` : "Hand-picked designs"} from{" "}
            {stats.minPrice ? inr(stats.minPrice) : "Rs 899"} — each one stitched to your
            measurements after you order.
          </p>
          <ul className="shop-hero-trust">
            <li>
              <i className="bi bi-cash-coin" aria-hidden="true" /> Cash on Delivery
            </li>
            <li>
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> {RETURN_WINDOW_TEXT} return (size / damage)
            </li>
            <li>
              <i className="bi bi-truck" aria-hidden="true" /> Free delivery in India
            </li>
            <li>
              <i className="bi bi-rulers" aria-hidden="true" /> Made to measure
            </li>
          </ul>
        </div>
      </section>

      <DressShop
        dresses={dresses}
        categories={categories}
        loading={loading}
        variant="page"
      />

      <section className="section">
        <div className="container shop-help">
          <div>
            <h2>Not sure which size or fabric?</h2>
            <p>{DELIVERY_TEXT}. Send us a message and the studio will guide you.</p>
          </div>
          <div className="shop-help-actions">
            <Link className="btn btn-primary" to="/enquire">
              Ask the studio <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
            <Link className="btn btn-outline" to="/classes">
              Craft classes
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
