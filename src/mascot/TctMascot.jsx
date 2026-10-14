import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  boot, closeChat, closeChatInstant, finishPanelClose, getUi, openChatInstant, projectToScreen,
  setThinking, subscribe, wake, setProjectionPixel, state as mstate,
} from "./store.js";
import { handleRobotTap, probeWebGL } from "./support.js";
import Robot2D from "./Robot2D.jsx";
import { QUICK_CHIPS, buildLeadPayload, leadPrompt, validateLead, wantsLead } from "./brain.js";
import { sendMessage } from "./assistantService.js";
import { postEnquiry } from "../api.js";
import { COMPANY } from "../data/content.js";
import { gsap } from "gsap";
import "./mascot.css";

/*
 * TCT Fashion Assistant — the 3D mascot layer.
 *
 * A human-style fashion guide on a cloud lives in the bottom-left corner. Click it and
 * the full cinematic loop plays (wake → stretch → walk → hologram chat →
 * good night → walk back → sleep). The chat itself is a DOM glass panel so
 * it stays readable, accessible and mobile-keyboard friendly while the guide
 * projects it from its mouth.
 *
 * The canvas never captures pointer events, so page scrolling and clicking
 * keep working everywhere.
 */

const Scene = lazy(() => import("./Scene.jsx"));

/*
 * If the 3D scene throws while mounting (WebGL2 unavailable, context refused,
 * driver quirk) React must not take the whole page down with it: the CSS
 * human guide steps in instead. This is why Apple phones/tablets used to show an
 * empty corner — the error had nowhere to go.
 */
class MascotBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onFail?.(error?.message || "scene-error");
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const GREETING =
  "Hi \u{1F44B}\nI'm the TCT Fashion Assistant.\nAsk me about our classes, fees, combos or batch timings — or say \"I want to join\" and I'll pass your details to the studio team.";

/*
 * `street` swaps the corner-cloud guide for the street world: this component
 * then keeps ONLY the chat panel + brain (the guide, its cloud and the
 * WebGL scene belong to StreetMascot). The street calls openChatInstant() when
 * the guide steps into the store, and closeChatInstant() ends the call — the
 * store controller never runs its goodnight cinema in street mode.
 */
export default function TctMascot({ street = false }) {
  const ui = useSyncExternalStore(subscribe, getUi);
  const [ready, setReady] = useState(false);
  /* "pending" until the WebGL2 probe answers, then either the three.js scene
     or the SVG human guide. Stored on state so it survives re-renders. */
  const [mode, setMode] = useState("pending");

  const fallbackTo2d = (reason) => {
    if (typeof window !== "undefined") window.__tct2dReason = reason || "unknown";
    setMode("2d");
  };

  /* ---------------- messages / enquiry flow ---------------- */
  const [messages, setMessages] = useState([]);
  const [leadStep, setLeadStep] = useState(null); // null | 'name' | 'contact' | 'interest'
  const [draft, setDraft] = useState({});
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [nudge, setNudge] = useState("");
  const bodyRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const [hitPos, setHitPos] = useState(null);
  const [bubblePos, setBubblePos] = useState(null);

  // defer the WebGL work until the page has painted and settled
  useEffect(() => {
    const w = window;
    // Street mode owns the character; no WebGL probe, no cloud layout.
    if (street) {
      w.__tct3d = { state: mstate, wake: openChatInstant, closeChat, setThinking, gsap };
      setMode("street");
      return undefined;
    }
    boot(w.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // dev/test bridge — lets the console drive the mascot loop
    w.__tct3d = { state: mstate, wake, closeChat, setThinking, gsap };

    /* Can this device actually run the 3D scene? (WebGL2 + a context that
       survives one real draw call.) */
    const probe = probeWebGL();
    w.__tctProbe = probe;
    if (!probe.ok) {
      fallbackTo2d(probe.reason);
      return undefined;
    }
    setMode("3d");
    let id;
    if (typeof w.requestIdleCallback === "function") {
      id = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
    } else {
      id = setTimeout(() => setReady(true), 1800);
    }
    return () => {
      if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
      else clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Watchdog: a canvas that exists but never draws a single frame (a real iOS
     Safari failure mode) falls back to the SVG human. The clock starts when
     the canvas actually appears, so a slow download of the three.js chunk on
     a phone is never mistaken for a broken scene. */
  useEffect(() => {
    if (mode !== "3d" || !ready) return undefined;
    const startedAt = Date.now();
    let canvasSeenAt = 0;
    const settled = () => {
      const gl = window.__tct3dGl;
      const canvas = gl?.domElement;
      if (!canvas || !canvas.isConnected) {
        // Still fetching/mounting the scene — only give up after a long wait.
        if (Date.now() - startedAt > 25000) {
          fallbackTo2d("scene-never-mounted");
          return true;
        }
        return false;
      }
      if (!canvasSeenAt) canvasSeenAt = Date.now();
      if (canvas.width > 0 && canvas.height > 0 && (gl?.info?.render?.frame || 0) > 0) return true;
      if (Date.now() - canvasSeenAt > 7000) {
        fallbackTo2d("no-first-frame");
        return true;
      }
      return false;
    };
    if (settled()) return undefined;
    const iv = setInterval(() => { if (settled()) clearInterval(iv); }, 700);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready]);

  // The DOM hologram stays accessible and responsive, but its visible impact
  // point is measured in layout pixels so the 3D mouth beam ends on its edge.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const measure = () => {
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const mobile = window.innerWidth <= 720;
      const host = panel.offsetParent;
      const hostRect = host?.getBoundingClientRect();
      // offsetLeft/Top describe the panel's final layout box. getBoundingClientRect
      // includes the entrance scale and would make the beams chase the animation.
      const left = (hostRect?.left || 0) + panel.offsetLeft;
      const top = (hostRect?.top || 0) + panel.offsetTop;
      const localX = mobile ? width * 0.5 : 14;
      const localY = mobile ? 24 : height * 0.5;
      panel.style.setProperty("--tct3d-impact-x", `${localX}px`);
      panel.style.setProperty("--tct3d-impact-y", `${localY}px`);
      setProjectionPixel({ x: left + localX, y: top + localY });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(panel);
    window.addEventListener("resize", measure);
    panel.addEventListener("animationend", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      panel.removeEventListener("animationend", measure);
      // Preserve the last impact point while the hologram particles dissolve.
    };
  }, []);

  // keep the hit button + bubble glued to their world anchors
  useEffect(() => {
    const update = () => {
      const L = mstate.layout;
      if (!L) return;
      // Center the full tap target over the resting person + cloud. The cloud
      // is above WhatsApp; the extra world-space lift also covers the guide's
      // head so taps on the character itself wake it reliably.
      const c = projectToScreen(L.home.x, L.home.y + 0.3);
      setHitPos(c);
      const sc = L.mobile ? 0.82 : 0.95;
      if (L.mobile) {
        const stageScreen = projectToScreen(L.stage.x, L.stage.y);
        setBubblePos({
          x: Math.max(12, Math.min(L.w - 142, stageScreen.x + L.w * 0.12)),
          y: projectToScreen(L.stage.x, L.stage.y - 0.08).y,
        });
      } else {
        setBubblePos(projectToScreen(L.stage.x, L.stage.y + 1.75 * sc));
      }
    };
    update();
    window.addEventListener("resize", update);
    const iv = setInterval(update, 1200); // camera drifts subtly — keep it glued
    return () => {
      window.removeEventListener("resize", update);
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (ui.chatOpen) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 420);
      return () => clearTimeout(t);
    }
  }, [ui.chatOpen]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, typing, ui.chatOpen]);

  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 92)}px`;
  }, [input, ui.chatOpen]);

  const pushBot = (text, delay = 700) => {
    setTyping(true);
    setThinking(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setTyping(false);
        setThinking(false);
        setMessages((m) => [...m, { from: "bot", text }]);
        resolve();
      }, delay);
    });
  };

  const greet = async () => {
    if (messages.length) return;
    await pushBot(GREETING, 650);
  };

  const submitLead = async (finalDraft) => {
    const d = finalDraft || draft;
    await pushBot("One second — sending this to the studio team\u2026", 800);
    try {
      await postEnquiry(buildLeadPayload(d));
      await pushBot("\u2705 Done! Your enquiry has reached our team.", 600);
      await pushBot(
        `Someone from TCT Fashion Hub will call you within 24 hours with batch timings. You can also WhatsApp ${COMPANY.phone}. Anything else I can help with?`,
        550
      );
    } catch {
      await pushBot(
        `Sorry — something went wrong on my side. Please WhatsApp us at ${COMPANY.phone} or email ${COMPANY.email}.`,
        600
      );
    }
    setLeadStep(null);
  };

  const handleText = async (raw) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setNudge("");

    if (leadStep) {
      const err = validateLead(leadStep, text);
      if (err) return setNudge(err);
      const nd = { ...draft, [leadStep]: text };
      setDraft(nd);
      const idx = ["name", "contact", "interest"].indexOf(leadStep);
      if (idx < 2) {
        const next = ["name", "contact", "interest"][idx + 1];
        setLeadStep(next);
        await pushBot(leadPrompt(next, nd), 550);
      } else {
        await submitLead(nd);
      }
      return;
    }

    if (wantsLead(text)) {
      setDraft({});
      setLeadStep("name");
      await pushBot(leadPrompt("name", {}), 550);
      return;
    }

    setTyping(true);
    setThinking(true);
    try {
      const history = messages.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));
      const result = await sendMessage(text, history);
      if (result.mode === "guided") await new Promise((resolve) => setTimeout(resolve, 450));
      setMessages((current) => [...current, { from: "bot", text: result.reply }]);
    } catch {
      setMessages((current) => [...current, {
        from: "bot",
        text: `I couldn't reach the assistant service just now. Please try again, or contact the studio at ${COMPANY.phone} / ${COMPANY.email}.`,
      }]);
    } finally {
      setTyping(false);
      setThinking(false);
    }
  };

  const onChip = (label) => {
    if (ui.phase !== "chat" || typing) return;
    handleText(label);
  };

  const close = () => {
    if (typing) return; // don't cut the assistant mid-sentence
    // Street mode and the SVG guide have no walk-back cinema — close in one
    // step so the person can step back out of the store.
    if (street || mode === "2d") closeChatInstant();
    else closeChat();
  };

  const resetConversation = () => {
    if (typing) return;
    setMessages([{ from: "bot", text: GREETING }]);
    setLeadStep(null);
    setDraft({});
    setInput("");
    setNudge("");
    setThinking(false);
  };

  useEffect(() => {
    if (!ui.chatOpen) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.chatOpen, typing]);

  useEffect(() => {
    if (ui.phase === "chat" && ui.chatOpen) greet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.phase, ui.chatOpen]);

  const placeholder =
    leadStep === "name" ? "Type your name\u2026"
    : leadStep === "contact" ? "Phone number (or email)\u2026"
    : leadStep === "interest" ? "Which class or combo?\u2026"
    : "Ask about classes, fees, timings\u2026";

  return (
    <div className="tct3d-wrap" aria-hidden="false">
      {!street && mode === "3d" && ready && (
        <MascotBoundary onFail={fallbackTo2d}>
          <Suspense fallback={null}>
            <Scene onFail={fallbackTo2d} />
          </Suspense>
        </MascotBoundary>
      )}

      {/* WebGL-free human guide — same corner, same chat, drawn in SVG */}
      {!street && mode === "2d" && (
        <Robot2D
          hitPos={hitPos}
          onTap={openChatInstant}
          awake={ui.phase !== "sleep" || ui.chatOpen}
          busy={ui.thinking}
          open={ui.chatOpen}
        />
      )}

      {/* the cloud — click / tap / keyboard to meet the guide */}
      {!street && mode === "3d" && ui.phase === "sleep" && hitPos && (
        <button
          type="button"
          className="tct3d-hit"
          style={{ left: hitPos.x, top: hitPos.y }}
          onClick={(e) => handleRobotTap(e, wake)}
          aria-label="Meet the TCT human fashion guide"
          title="Meet the TCT fashion guide"
        >
          <span className="tct3d-halo" aria-hidden="true" />
        </button>
      )}

      {/* holographic chat panel — projected beside the human guide */}
      <section
        ref={panelRef}
        className={`tct3d-panel ${!ui.panelVisible ? "tct3d-panel-idle" : ui.phase === "goodnight" ? "tct3d-panel-out" : "tct3d-panel-in"}`}
        role="dialog"
        aria-label="TCT Fashion Assistant chat"
        aria-hidden={!ui.chatOpen}
        inert={ui.chatOpen ? undefined : ""}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName.startsWith("tct3d-panel-out")) finishPanelClose();
        }}
      >
          <header className="tct3d-panel-head">
            <span className="tct3d-avatar" aria-hidden="true">
              <img src="/images/Logo.jpeg" alt="" />
            </span>
            <div className="tct3d-panel-title">
              <strong>TCT Fashion Assistant</strong>
              <small>Your classes &amp; combos guide</small>
            </div>
            <span className="tct3d-status" aria-hidden="true" />
            <span className="tct3d-status-label">Online</span>
            <button type="button" className="tct3d-restart" onClick={resetConversation} disabled={typing} aria-label="Start a new conversation" title="New conversation">
              <i className="bi bi-arrow-counterclockwise" />
            </button>
            <button type="button" className="tct3d-close" onClick={close} aria-label="Close chat">
              <i className="bi bi-x-lg" />
            </button>
          </header>

          <div className="tct3d-msgs" ref={bodyRef} aria-live="polite" aria-relevant="additions text">
            {messages.map((m, i) => (
              <div key={i} className={`tct3d-msg-row ${m.from}`}>
                {m.from !== "user" && (
                  <span className="tct3d-msg-avatar" aria-hidden="true">
                  <i className="bi bi-person-circle" />
                  </span>
                )}
                <div className="tct3d-msg-stack">
                  <span className="tct3d-msg-meta">{m.from === "user" ? "You" : "TCT Fashion Assistant"}</span>
                  <div className={`tct3d-msg ${m.from}`}>{m.text}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="tct3d-msg-row bot">
                <span className="tct3d-msg-avatar" aria-hidden="true"><i className="bi bi-person-circle" /></span>
                <div className="tct3d-msg-stack">
                  <span className="tct3d-msg-meta">TCT Fashion Assistant is thinking</span>
                  <div className="tct3d-msg bot tct3d-typing" aria-label="TCT Fashion Assistant is typing">
                    <i /><i /><i />
                  </div>
                </div>
              </div>
            )}
            {nudge && <div className="tct3d-nudge">{nudge}</div>}
          </div>

          {!messages.some((m) => m.from === "user") && (
            <div className="tct3d-suggestion-wrap">
              <span className="tct3d-suggestion-label">QUICK ACTIONS</span>
              <div className="tct3d-chips" role="group" aria-label="Quick actions">
                {QUICK_CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => onChip(c)} disabled={typing}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className="tct3d-input"
            onSubmit={(e) => { e.preventDefault(); if (!typing) handleText(input); }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder={placeholder}
              aria-label={placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!typing) handleText(input);
                }
              }}
              disabled={typing}
            />
            <button type="submit" disabled={typing || !input.trim()} aria-label="Send">
              <i className="bi bi-send-fill" />
            </button>
          </form>
      </section>

      {/* good night bubble */}
      {ui.bubble && bubblePos && !street && (
        <div className={`tct3d-bubble ${mstate.layout?.mobile ? "tct3d-bubble-mobile" : ""}`} style={{ left: bubblePos.x, top: bubblePos.y }} role="status">
          Good night! 🌙
          <br />
          See you soon!
        </div>
      )}
    </div>
  );
}
