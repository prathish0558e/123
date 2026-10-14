import { Component, lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COMPANY } from "../data/content.js";
import { getUi, openChatInstant, subscribe } from "./store.js";
import "./street.css";
import HumanFigure from "./HumanFigure.jsx";

const HumanFigure3D = lazy(() => import("./StreetHuman3D.jsx"));
const ROAD_H = 12;
const HUMAN_W = 68;
const HUMAN_H = 96;
const HINT = "Tap to visit the boutique 🛍️";

class HumanCanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function StreetMascot() {
  const ui = useSyncExternalStore(subscribe, getUi);
  const [storeRevealed, setStoreRevealed] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [motion, setMotion] = useState("walking");
  const [facing, setFacing] = useState(1);
  const [bag, setBag] = useState(false);
  const [bagOpacity, setBagOpacity] = useState(0);
  const [bubble, setBubble] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const shopRef = useRef(null);
  const doorRef = useRef(null);
  const humanRef = useRef(null);
  const roadRef = useRef(null);
  const layoutRef = useRef({ roadLeft: 4, roadTop: 0, roadWidth: 176, baseLeft: 6, humanTop: 0, walkRange: 104 });
  const modeRef = useRef("walking");
  const reducedRef = useRef(false);
  const chatSeenRef = useRef(false);
  const patrolOffsetRef = useRef(0);
  const facingRef = useRef(1);
  const timersRef = useRef([]);

  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const setSceneMotion = (next) => {
    modeRef.current = next;
    setMotion(next);
  };

  /* Keep the compact street next to WhatsApp, with the shop above its road. */
  const measure = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 720;
    const roadWidth = mobile ? 142 : 176;
    const shopWidth = mobile ? 124 : 164;
    const shopHeight = mobile ? 78 : 108;
    const whatsapp = document.querySelector(".wa-float")?.getBoundingClientRect();
    const center = whatsapp ? whatsapp.left + whatsapp.width / 2 : 47;
    const waTop = whatsapp?.top ?? height - 72;
    const roadTop = Math.max(ROAD_H + 8, waTop - ROAD_H - 8);
    const roadLeft = Math.max(4, Math.min(width - roadWidth - 4, center - roadWidth / 2));
    const baseLeft = Math.max(6, Math.min(width - HUMAN_W - 6, roadLeft + 2));
    const humanTop = roadTop - HUMAN_H + 4;
    const walkRange = Math.max(0, roadWidth - HUMAN_W - 4);

    layoutRef.current = { roadLeft, roadTop, roadWidth, baseLeft, humanTop, walkRange, shopWidth, shopHeight };
    if (roadRef.current) {
      roadRef.current.style.left = `${roadLeft}px`;
      roadRef.current.style.top = `${roadTop}px`;
      roadRef.current.style.width = `${roadWidth}px`;
    }
    if (humanRef.current) {
      humanRef.current.style.left = `${baseLeft}px`;
      humanRef.current.style.top = `${humanTop}px`;
    }

    const shop = shopRef.current;
    if (shop) {
      shop.style.left = `${roadLeft}px`;
      shop.style.top = `${roadTop - shopHeight - 8}px`;
    }
  };

  const doorOffset = () => {
    const layout = layoutRef.current;
    const rect = doorRef.current?.getBoundingClientRect();
    const doorCenter = rect ? rect.left + rect.width / 2 : layout.roadLeft + layout.roadWidth - 18;
    return Math.max(0, Math.min(layout.walkRange, doorCenter - layout.baseLeft - HUMAN_W / 2));
  };

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedRef.current) setSceneMotion("idle");
    measure();

    let frame = 0;
    const patrol = (now) => {
      const human = humanRef.current;
      const { walkRange } = layoutRef.current;
      const walking = modeRef.current === "walking";
      if (human && walking && !reducedRef.current) {
        const halfCycle = 2600;
        const cycle = (now % (halfCycle * 2)) / halfCycle;
        const direction = cycle < 1 ? 1 : -1;
        const progress = cycle < 1 ? cycle : 2 - cycle;
        const offset = progress * walkRange;
        patrolOffsetRef.current = offset;
        human.style.transition = "none";
        human.style.transform = `translate3d(${offset}px, 0, 0)`;
        if (facingRef.current !== direction) {
          facingRef.current = direction;
          setFacing(direction);
        }
      }
      frame = window.requestAnimationFrame(patrol);
    };
    frame = window.requestAnimationFrame(patrol);

    window.addEventListener("resize", measure);
    const whatsapp = document.querySelector(".wa-float");
    const observer = typeof ResizeObserver === "undefined" || !whatsapp
      ? null
      : new ResizeObserver(measure);
    if (whatsapp) observer?.observe(whatsapp);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    };
  }, []);

  /* Click: reveal the boutique, run through its door, then open the chat. */
  const enterShop = () => {
    if (modeRef.current !== "walking" && modeRef.current !== "idle") return;
    setReviewOpen(false);
    setBubble(null);
    setStoreRevealed(true);
    setDoorOpen(true);
    setSceneMotion("runningIn");
    facingRef.current = 1;
    setFacing(1);
    const human = humanRef.current;
    const duration = reducedRef.current ? 1 : 720;
    if (human) {
      const start = patrolOffsetRef.current;
      human.style.transition = "none";
      human.style.transform = `translate3d(${start}px, 0, 0)`;
      human.style.opacity = "1";
    }
    window.requestAnimationFrame(() => {
      measure();
      window.requestAnimationFrame(() => {
        if (!humanRef.current) return;
        const target = doorOffset();
        patrolOffsetRef.current = target;
        humanRef.current.style.transition = `transform ${duration}ms cubic-bezier(.22,.8,.24,1), opacity 220ms ${Math.max(0, duration - 190)}ms ease`;
        humanRef.current.style.transform = `translate3d(${target}px, 0, 0) scale(.68)`;
        humanRef.current.style.opacity = "0";
      });
    });

    later(() => {
      modeRef.current = "inside";
      openChatInstant();
    }, reducedRef.current ? 80 : 790);
  };

  /* Finish shopping (or close chat): return holding the dress bag and ask for a review. */
  useEffect(() => {
    if (ui.chatOpen) {
      chatSeenRef.current = true;
      return;
    }
    if (!chatSeenRef.current) return;
    chatSeenRef.current = false;
    if (modeRef.current !== "inside") return;

    const human = humanRef.current;
    const target = doorOffset();
    const duration = reducedRef.current ? 1 : 660;
    setBag(true);
    setBagOpacity(1);
    setDoorOpen(true);
    setSceneMotion("runningOut");
    facingRef.current = -1;
    setFacing(-1);
    if (human) {
      human.style.transition = "none";
      human.style.transform = `translate3d(${target}px, 0, 0) scale(.7)`;
      human.style.opacity = "1";
      window.requestAnimationFrame(() => {
        if (!humanRef.current) return;
        humanRef.current.style.transition = `transform ${duration}ms cubic-bezier(.2,.75,.25,1), opacity 180ms ease`;
        humanRef.current.style.transform = "translate3d(0, 0, 0) scale(1)";
      });
    }

    later(() => {
      if (humanRef.current) {
        humanRef.current.style.transition = "none";
        humanRef.current.style.opacity = "1";
        humanRef.current.style.transform = "translate3d(0, 0, 0) scale(1)";
      }
      patrolOffsetRef.current = 0;
      facingRef.current = 1;
      setFacing(1);
      setDoorOpen(false);
      setSceneMotion(reducedRef.current ? "idle" : "walking");
      setRating(5);
      setReviewText("");
      setReviewOpen(true);
    }, reducedRef.current ? 80 : 690);

    later(() => setBagOpacity(0), reducedRef.current ? 1200 : 2850);
    later(() => setBag(false), reducedRef.current ? 2200 : 3750);
  }, [ui.chatOpen]);

  useEffect(() => {
    const id = later(() => {
      if (modeRef.current === "walking" || modeRef.current === "idle") setBubble(HINT);
    }, 5000);
    return () => window.clearTimeout(id);
  }, []);

  const sendReview = (event) => {
    event.preventDefault();
    const text = [
      `Shopping experience: ${rating}/5 stars.`,
      reviewText.trim(),
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(`Hi TCT Fashion Hub! My review:\n${text}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setReviewOpen(false);
    setBubble("Thanks for visiting! 🛍️");
    later(() => setBubble(null), 2600);
  };

  const walking = motion === "walking" || motion === "idle";
  const humanClasses = [
    "tct-human",
    walking || motion.startsWith("running") ? "is-walking" : "",
    motion.startsWith("running") ? "is-running" : "",
    bag ? "has-bag" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="tct-street">
      <div className="tct-road" ref={roadRef} aria-hidden="true" />

      {storeRevealed && (
        <button
          ref={shopRef}
          type="button"
          className={`tct-shop${doorOpen ? " is-open" : ""}`}
          onClick={enterShop}
          title="Visit the TCT Fashion Hub store"
          aria-label="Visit the TCT Fashion Hub store and chat with the assistant"
        >
          <span className="tct-shop-sign">
            <img src="/images/Logo.png" alt="" />
            <em>TCT Fashion Hub</em>
          </span>
          <span className="tct-shop-roof" aria-hidden="true" />
          <span className="tct-shop-body">
            <span className="tct-shop-window" aria-hidden="true">
              <svg viewBox="0 0 24 28">
                <path d="M8 4h8l4.4 10.4-3.4 2.2L15 13.6V26H9V13.6l-2 3-3.4-2.2z" fill="#e11d8f" />
                <path d="M10.4 4h3.2l-1.6 3z" fill="#0d6efd" />
              </svg>
            </span>
            <span className="tct-shop-door" aria-hidden="true" ref={doorRef}>
              <span className="tct-shop-door-leaf" />
            </span>
          </span>
        </button>
      )}

      <div className={humanClasses} ref={humanRef} style={{ left: -999, top: -999 }}>
        <button
          type="button"
          className="tct-human-btn"
          onClick={enterShop}
          disabled={!walking}
          aria-label="Visit the TCT Fashion Hub boutique"
          title="Visit the TCT Fashion Hub boutique"
        >
          {bubble && <span className="tct-street-bubble" role="status">{bubble}</span>}
          <HumanCanvasBoundary fallback={<HumanFigure bag={bag} direction={facing} bagOpacity={bagOpacity} />}>
            <Suspense fallback={<HumanFigure bag={bag} direction={facing} bagOpacity={bagOpacity} />}>
              <HumanFigure3D phase={motion} facing={facing} bagOpacity={bagOpacity} />
            </Suspense>
          </HumanCanvasBoundary>
        </button>
      </div>

      {reviewOpen && (
        <div className="tct-review-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setReviewOpen(false);
        }}>
          <form className="tct-review-card" role="dialog" aria-modal="true" aria-labelledby="tct-review-title" onSubmit={sendReview}>
            <button className="tct-review-close" type="button" aria-label="Close review" onClick={() => setReviewOpen(false)}>×</button>
            <span className="tct-review-eyebrow">THANK YOU FOR VISITING</span>
            <h2 id="tct-review-title">Shopping eppadi irundhuchu?</h2>
            <p>Ungal experience-ai TCT Fashion Hub-kitta share pannunga.</p>
            <div className="tct-review-stars" role="group" aria-label="Choose a star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" aria-label={`${star} stars`} aria-pressed={rating === star} onClick={() => setRating(star)}>
                  {star <= rating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <label className="tct-review-label" htmlFor="tct-review-message">Review (optional)</label>
            <textarea id="tct-review-message" value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={500} placeholder="Your shopping experience..." />
            <button className="tct-review-submit" type="submit">WhatsApp-la review anuppu</button>
          </form>
        </div>
      )}
    </div>
  );
}
