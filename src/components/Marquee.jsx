/**
 * Marquee — infinite scrolling ribbon on the brand gradient (blue → orange).
 * Used between sections to keep the page alive, same energy as the old site.
 */
export default function Marquee({ items }) {
  const row = [...items, ...items];
  return (
    <div className="fh-marquee" aria-hidden="true">
      <div className="fh-marquee__track">
        {row.map((item, i) => (
          <span className="fh-marquee__item" key={i}>
            {item}
            <span className="fh-marquee__dot">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
