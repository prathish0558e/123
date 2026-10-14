import { useState } from "react";
import { handleRobotTap } from "./support.js";
import HumanFigure from "./HumanFigure.jsx";

/*
 * Fallback assistant — a hand-built human guide standing on a cloud.
 *
 * Shown when WebGL2 is missing, when the three.js scene throws, when the
 * context is lost, or when the first frame never lands (some iPhones and
 * iPads). It is drawn with the same brand palette and uses the same store
 * phase as the 3D mascot, so the chat hologram and the conversation behave
 * exactly the same — the character is simply 2D instead of 3D.
 *
 * Nothing here depends on a CSS animation for visibility: animations only add
 * motion, so a frozen animation clock can never hide the guide.
 */

/* `awake` comes straight from the store snapshot (phase/chatOpen) so the eyes
   and antenna always match the conversation — no polling, no stale state. */
export default function Robot2D({ hitPos, onTap, awake = false, busy = false, open = false }) {
  const [hint, setHint] = useState(true);

  if (!hitPos) return null;

  return (
    <button
      type="button"
      className={`tct2d ${awake ? "is-awake" : "is-asleep"}${busy ? " is-busy" : ""}${open ? " is-open" : ""}`}
      style={{ left: `${hitPos.x}px`, top: `${hitPos.y}px` }}
      onClick={(e) => handleRobotTap(e, () => { setHint(false); onTap?.(); })}
      aria-label={awake ? "TCT human guide is here — open the chat" : "Open chat with the TCT human guide"}
      title={awake ? "Ask the TCT Fashion Assistant" : "Meet your TCT fashion guide"}
    >
      <span className="tct2d-halo" aria-hidden="true" />
      {hint && !open && <span className="tct2d-chip">Ask me about classes</span>}
      <svg className="tct2d-cloud-art" viewBox="0 0 200 212" aria-hidden="true">
        <g className="tct2d-cloud">
          <ellipse cx="100" cy="186" rx="74" ry="17" fill="#b9c9e8" opacity="0.5" />
          <circle cx="52" cy="163" r="26" fill="#ffffff" />
          <circle cx="100" cy="150" r="36" fill="#ffffff" />
          <circle cx="148" cy="163" r="26" fill="#ffffff" />
          <ellipse cx="100" cy="176" rx="80" ry="20" fill="#ffffff" />
          <ellipse cx="100" cy="180" rx="64" ry="13" fill="#dbe6f9" />
        </g>
      </svg>
      <span className="tct2d-person" aria-hidden="true">
        <HumanFigure className="tct2d-person-art" direction={1} />
      </span>
    </button>
  );
}
