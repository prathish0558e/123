import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DressFlipCard from "./DressFlipCard.jsx";
import { inr } from "../lib/shop.js";

/*
 * "Deals of the day" — a sideways-scrolling rail of everything currently
 * discounted, with a live countdown to midnight (when the studio's offers are
 * re-cut).
 *
 * It only ever lists garments whose MRP is genuinely higher than the price we
 * charge, so the rail is empty rather than padded when nothing is on offer.
 */

const AUTOSCROLL_MS = 5200;

const discountOf = (dress) => {
  const price = Number(dress.startingPrice) || 0;
  const mrp = Number(dress.mrp) || 0;
  if (!price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

/** Milliseconds until the next local midnight. */
function untilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end.getTime() - now.getTime();
}

function useMidnightCountdown() {
  const [left, setLeft] = useState(untilMidnight);

  useEffect(() => {
    const id = setInterval(() => setLeft(untilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(0, Math.floor(left / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return {
    hours: pad(Math.floor(total / 3600)),
    minutes: pad(Math.floor((total % 3600) / 60)),
    seconds: pad(total % 60),
  };
}

export default function DealsRail({ dresses = [] }) {
  const deals = useMemo(
    () =>
      dresses
        .map((dress) => ({ dress, off: discountOf(dress) }))
        .filter((entry) => entry.off > 0)
        .sort((a, b) => b.off - a.off)
        .map((entry) => entry.dress),
    [dresses]
  );

  const clock = useMidnightCountdown();
  const track = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 2;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max);
  }, []);

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return undefined;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, deals.length]);

  /* Drift one card at a time while the shopper has the rail on screen and
     isn't touching it — a quiet suggestion, not a takeover. */
  useEffect(() => {
    if (deals.length < 3) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const el = track.current;
    if (!el) return undefined;

    let hold = false;
    const holdOn = () => {
      hold = true;
    };
    const holdOff = () => {
      hold = false;
    };
    el.addEventListener("pointerdown", holdOn);
    el.addEventListener("pointerenter", holdOn);
    el.addEventListener("pointerleave", holdOff);
    el.addEventListener("wheel", holdOn, { passive: true });

    const id = setInterval(() => {
      if (hold) return;
      const box = el.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      const step = el.clientWidth * 0.7;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollTo({
        left: el.scrollLeft >= max - 8 ? 0 : Math.min(el.scrollLeft + step, max),
        behavior: "smooth",
      });
    }, AUTOSCROLL_MS);

    return () => {
      clearInterval(id);
      el.removeEventListener("pointerdown", holdOn);
      el.removeEventListener("pointerenter", holdOn);
      el.removeEventListener("pointerleave", holdOff);
      el.removeEventListener("wheel", holdOn);
    };
  }, [deals.length]);

  const by = (direction) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!deals.length) return null;

  const best = discountOf(deals[0]);

  return (
    <section className="section soft deals-section" aria-label="Deals of the day">
      <div className="container">
        <div className="deals-head">
          <div className="deals-head-copy">
            <span className="eyebrow">Today only</span>
            <h2>Deals of the Day</h2>
            <p>
              {best > 0 ? `Up to ${best}% off ` : ""}
              on designs already in the studio — stitched to your measurements and
              delivered free.
            </p>
          </div>

          <div className="deals-tools">
            <span className="deals-timer" aria-label="Offer countdown">
              <small>Ends in</small>
              <strong>
                {clock.hours}
                <i>:</i>
                {clock.minutes}
                <i>:</i>
                {clock.seconds}
              </strong>
            </span>
            <div className="deals-arrows">
              <button
                type="button"
                onClick={() => by(-1)}
                disabled={atStart}
                aria-label="Previous deals"
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => by(1)}
                disabled={atEnd}
                aria-label="More deals"
              >
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="deals-rail" ref={track} tabIndex={0} aria-label="Discounted designs">
          {deals.map((dress) => (
            <div className="deals-item" key={dress.id}>
              <DressFlipCard dress={dress} />
              <span className="deals-save">
                <i className="bi bi-piggy-bank" aria-hidden="true" /> You save{" "}
                {inr((Number(dress.mrp) || 0) - (Number(dress.startingPrice) || 0))}
              </span>
            </div>
          ))}
        </div>

        <div className="deals-foot">
          <Link to="/shop" className="btn btn-outline">
            See every offer in the shop <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
