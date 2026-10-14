import { useEffect, useMemo, useState } from "react";

/**
 * Confetti — luxurious golden celebration burst for enquiry success.
 * 80 gold coins, ribbons and diamonds explode from the top,
 * tumble in 3D and fade. Re-fires whenever `fireKey` changes.
 * Auto-unmounts itself 5s after each burst.
 */
export default function Confetti({ fireKey }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fireKey) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [fireKey]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: `${fireKey}-${i}`,
        left: 8 + Math.random() * 84,
        delay: Math.random() * 0.35,
        duration: 2.6 + Math.random() * 1.8,
        drift: (Math.random() - 0.5) * 520,
        size: 6 + Math.random() * 9,
        // three premium shapes
        shape: ["coin", "ribbon", "diamond"][i % 3],
        spin: Math.random() < 0.5 ? -1 : 1,
      })),
    [fireKey]
  );

  if (!visible || fireKey === 0) return null;

  return (
    <div className="tct-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`tct-confetti__piece tct-confetti__piece--${p.shape}`}
          style={{
            left: `${p.left}%`,
            width: p.shape === "ribbon" ? p.size * 0.55 : p.size,
            height: p.shape === "ribbon" ? p.size * 2.2 : p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--spin": p.spin,
          }}
        />
      ))}
    </div>
  );
}
