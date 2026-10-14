import { useEffect, useState } from "react";

export default function ToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`to-top ${show ? "show" : ""}`}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0 })}
    >
      <i className="bi bi-arrow-up"></i>
    </button>
  );
}
