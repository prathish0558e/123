import { Component, lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getUi, openChatInstant, subscribe } from "./store.js";
import "./street.css";
import HumanFigure from "./HumanFigure.jsx";

const HumanFigure3D = lazy(() => import("./StreetHuman3D.jsx"));

/*
 * TCT Street — the assistant's world.
 *
 * A compact floating human guide and road above WhatsApp. The storefront
 * stays hidden until the human is clicked.
 *
 *   tap the guide (or the shop)
 *       → the store appears, the door opens and the chat panel opens
 *       → the same chat panel, brain and lead capture as before
 *
 * Motion runs on requestAnimationFrame writing transforms straight to the
 * DOM (no 60fps React renders); React state only owns the discrete moments —
 * door open, guide visible, bubble text.
 */

const HINT = "Tap me to chat \u{1F4AC}";
const GOODBYE = "Thank you! \u{1F6CD}\u{FE0F} See you again \u{1F44B}";
const HUMAN_W = 68;
const HUMAN_H = 96;
const ROAD_W = 126;
const ROAD_H = 12;

class HumanCanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function StreetMascot() {
  const ui = useSyncExternalStore(subscribe, getUi);

  const [storeRevealed, setStoreRevealed] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [bag, setBag] = useState(false); // bought something on the first visit
  const [bubble, setBubble] = useState(null);

  const shopRef = useRef(null);
  const doorRef = useRef(null);
  const humanRef = useRef(null); // positioned wrapper (translate3d)
  const roadRef = useRef(null);
  const modeRef = useRef("stroll"); // stroll | toShop | entering | inside | exiting
  const reducedRef = useRef(false);
  const chatSeenRef = useRef(false);
  const timersRef = useRef([]);

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  /* ---------- Keep the miniature road and 3D guide above WhatsApp ------- */
  const measure = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const whatsapp = document.querySelector(".wa-float")?.getBoundingClientRect();
    const center = whatsapp ? whatsapp.left + whatsapp.width / 2 : 47;
    const waTop = whatsapp?.top ?? height - 72;
    const roadTop = Math.max(ROAD_H + 8, waTop - ROAD_H - 8);
    const humanLeft = Math.max(6, Math.min(width - HUMAN_W - 6, center - HUMAN_W / 2));
    const roadLeft = Math.max(4, Math.min(width - ROAD_W - 4, center - ROAD_W / 2));

    if (humanRef.current) {
      humanRef.current.style.left = `${humanLeft}px`;
      humanRef.current.style.top = `${roadTop - HUMAN_H + 4}px`;
    }
    if (roadRef.current) {
      roadRef.current.style.left = `${roadLeft}px`;
      roadRef.current.style.top = `${roadTop}px`;
    }

    const shop = shopRef.current;
    if (shop) {
      const shopWidth = shop.offsetWidth || (width <= 720 ? 124 : 164);
      const shopHeight = shop.offsetHeight || (width <= 720 ? 78 : 108);
      let shopLeft = center + HUMAN_W / 2 + 12;
      let shopTop = roadTop - shopHeight - 8;
      if (shopLeft + shopWidth > width - 6) {
        shopLeft = Math.max(6, center - shopWidth / 2);
        shopTop -= HUMAN_H + 4;
      }
      shop.style.left = `${shopLeft}px`;
      shop.style.top = `${shopTop}px`;
    }
  };

  /* ---------------------- stable, in-place walk loop -------------------- */
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedRef.current) {
      modeRef.current = "idle"; // no endless patrol for reduced-motion visitors
    }

    measure();
    window.addEventListener("resize", measure);
    const whatsapp = document.querySelector(".wa-float");
    const observer = typeof ResizeObserver === "undefined" || !whatsapp
      ? null
      : new ResizeObserver(measure);
    if (whatsapp) observer?.observe(whatsapp);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  /* ---------------------- reveal shop on first tap --------------------- */
  const enterShop = () => {
    const m = modeRef.current;
    if (m !== "stroll" && m !== "idle") return; // already on its way / inside
    modeRef.current = "entering";
    setBubble(null);
    setStoreRevealed(true);
    setDoorOpen(true);
    requestAnimationFrame(measure);
    later(() => {
      openChatInstant(); // same chat panel, brain and lead flow as before
      modeRef.current = "inside";
    }, reducedRef.current ? 120 : 360);
  };

  // Chat closed → out of the shop, bag in hand, back on the road.
  useEffect(() => {
    if (ui.chatOpen) {
      chatSeenRef.current = true;
      return;
    }
    if (!chatSeenRef.current) return;
    chatSeenRef.current = false;
    if (modeRef.current !== "inside") return;

    modeRef.current = "stroll";
    setBag(true);
    setDoorOpen(false);
    setBubble(GOODBYE);
    later(() => setBubble(null), reducedRef.current ? 900 : 2600);
  }, [ui.chatOpen]);

  /* First-visit nudge: point at the guide once it has settled into a stroll. */
  useEffect(() => {
    const id = later(() => {
      const m = modeRef.current;
      if (!chatSeenRef.current && (m === "stroll" || m === "idle")) setBubble(HINT);
    }, 4200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tct-street">
      <div className="tct-road" ref={roadRef} aria-hidden="true" />

      {/* The small storefront appears on the first guide tap. */}
      {storeRevealed && <button
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
              <path
                d="M8 4h8l4.4 10.4-3.4 2.2L15 13.6V26H9V13.6l-2 3-3.4-2.2z"
                fill="#e11d8f"
              />
              <path d="M10.4 4h3.2l-1.6 3z" fill="#0d6efd" />
            </svg>
          </span>
          <span className="tct-shop-door" aria-hidden="true" ref={doorRef}>
            <span className="tct-shop-door-leaf" />
          </span>
        </span>
      </button>}

      {/* 3D guide stays in one place above the WhatsApp button. */}
      <div className={`tct-human is-walking${bag ? " has-bag" : ""}`} ref={humanRef} style={{ left: -999, top: -999 }}>
          <button
            type="button"
            className="tct-human-btn"
            onClick={enterShop}
            aria-label="Chat with the TCT Fashion Assistant"
            title="Chat with the TCT Fashion Assistant"
          >
            {bubble && (
              <span className="tct-street-bubble" role="status">
                {bubble}
              </span>
            )}
            <HumanCanvasBoundary fallback={<HumanFigure bag={bag} direction={1} />}>
              <Suspense fallback={<HumanFigure bag={bag} direction={1} />}>
                <HumanFigure3D />
              </Suspense>
            </HumanCanvasBoundary>
          </button>
      </div>
    </div>
  );
}
