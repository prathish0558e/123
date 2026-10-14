import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Older browsers without IntersectionObserver: show content immediately
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function SectionHead({ eyebrow, title, text, left = false }) {
  return (
    <div className={`section-head ${left ? "left" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

export function PageHero({ eyebrow, title, text, crumb }) {
  return (
    <section className="page-hero">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" style={{ fontSize: 10 }}></i>
          <span>{crumb || title}</span>
        </div>
        <span className="eyebrow on-dark">{eyebrow}</span>
        <h1>{title}</h1>
        {text ? <p>{text}</p> : null}
      </div>
    </section>
  );
}

export function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setValue(target);
      return;
    }
    let raf;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return [ref, value];
}

export default Reveal;
