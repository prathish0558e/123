/*
 * "Added to bag" feedback, the way a real storefront does it.
 *
 * The product image lifts off the card, arcs across the screen and shrinks into
 * the navbar bag icon; when it lands the badge bumps and a ring bursts out. The
 * mini bag then slides in, so the shopper sees what they just added.
 *
 * Kept out of React on purpose: this is a one-shot, fire-and-forget gesture on
 * nodes that may re-render mid-flight, and it must never block the store update
 * that already happened in localStorage.
 */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const BAG_TARGET = ".nav-cart";
const FLIGHT_MS = 780;
const BUMP_MS = 700;

/** The ring that pops off the bag icon when something lands in it. */
export function burstBag() {
  const target = document.querySelector(BAG_TARGET);
  if (!target || prefersReducedMotion()) return;
  const burst = document.createElement("span");
  burst.className = "bag-burst";
  burst.setAttribute("aria-hidden", "true");
  target.appendChild(burst);
  window.setTimeout(() => burst.remove(), 700);
}

/** Badge pulse on the navbar bag. Safe to call on its own. */
export function pulseBag() {
  const target = document.querySelector(BAG_TARGET);
  if (!target) return;

  target.classList.remove("is-bump");
  // force a reflow so the animation replays even on a rapid second add
  void target.offsetWidth;
  target.classList.add("is-bump");
  window.setTimeout(() => target.classList.remove("is-bump"), BUMP_MS);

  burstBag();
}

/**
 * Open (or close) the mini bag drawer from anywhere.
 * The drawer itself listens for this event, so no React context is needed.
 */
export function toggleMiniBag(open = true) {
  window.dispatchEvent(new CustomEvent("tct-bag-toggle", { detail: { open } }));
}

/**
 * Fly a product image into the bag.
 *
 * @param {HTMLElement|null} source  the <img> (or any element) being added
 * @param {{ image?: string, openBag?: boolean }} [options]
 */
export function flyToBag(source, { image, openBag = true } = {}) {
  const target = document.querySelector(BAG_TARGET);
  const src =
    image ||
    (source instanceof HTMLImageElement ? source.currentSrc || source.src : null);

  /* The badge already bumped the instant the bag grew; the photo's arrival only
     needs the ring, so the two never look like a double pulse. */
  const finish = () => {
    burstBag();
    if (openBag) window.setTimeout(() => toggleMiniBag(true), 260);
  };

  /* Nothing to fly, no bag visible (admin/print), or motion is unwelcome:
     just do the honest part of the gesture. */
  if (!src || !target || prefersReducedMotion()) {
    finish();
    return;
  }

  const from = source?.getBoundingClientRect();
  if (!from || !from.width) {
    finish();
    return;
  }

  const size = Math.min(140, Math.max(64, from.width));
  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const to = target.getBoundingClientRect();
  const endX = to.left + to.width / 2;
  const endY = to.top + to.height / 2;

  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.alt = "";
  ghost.className = "fly-to-bag";
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.left = `${startX - size / 2}px`;
  ghost.style.top = `${startY - size / 2}px`;
  document.body.appendChild(ghost);

  const dx = endX - startX;
  const dy = endY - startY;
  /* Lift the arc above the straight line so it reads as a toss, not a slide. */
  const lift = Math.min(160, Math.abs(dx) * 0.16 + 70);

  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
      {
        transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.62) rotate(-6deg)`,
        opacity: 0.96,
        offset: 0.5,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(-14deg)`,
        opacity: 0.5,
        offset: 1,
      },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(.34,.06,.24,.99)", fill: "forwards" }
  );

  const cleanup = () => {
    ghost.remove();
    finish();
  };
  flight.addEventListener("finish", cleanup, { once: true });
  /* Belt and braces: a cancelled animation must not leave a ghost on screen. */
  window.setTimeout(() => {
    if (document.body.contains(ghost)) cleanup();
  }, FLIGHT_MS + 400);
}

export default flyToBag;
