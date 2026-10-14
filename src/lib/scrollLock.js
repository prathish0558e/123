/**
 * Shared reference-counted page scroll lock.
 * Both premium modals (ClassInfoModal + PaymentOptions) use this so
 * the page always scrolls again after the last modal closes — no
 * matter the open/close order, StrictMode double-mounts, or the
 * info → payment handoff happening in a single commit.
 */
let locks = 0;
let prevOverflow = "";

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (locks === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.body.style.overflow = prevOverflow;
    prevOverflow = "";
  }
}
