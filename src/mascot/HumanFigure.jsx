/** A small, animated adult fashion guide drawn as a person, not a machine. */
export default function HumanFigure({ bag = false, bagOpacity = 1, artRef, direction = -1, className = "tct-human-art" }) {
  return (
    <svg
      className={className}
      ref={artRef}
      viewBox="0 0 64 82"
      style={{ transform: `scaleX(${direction})` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="human-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="1" stopColor="#be185d" />
        </linearGradient>
        <linearGradient id="human-pants" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#31527c" />
          <stop offset="1" stopColor="#172b49" />
        </linearGradient>
        <linearGradient id="human-bag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="77" rx="15" ry="3" fill="#0f172a" opacity=".24" />
      <g className="tct-human-figure">
        <g className="tct-human-leg tct-human-leg-a">
          <path d="M26 49h7l-1 17-2 7h-6l1-8z" fill="url(#human-pants)" />
          <path d="M24 71h8l2 3v2H22v-2z" fill="#342c37" />
          <path d="M23 76h11" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <g className="tct-human-leg tct-human-leg-b">
          <path d="M33 49h7l1 17 2 7h-6l-2-8z" fill="url(#human-pants)" />
          <path d="M36 71h8l3 3v2H35v-2z" fill="#342c37" />
          <path d="M35 76h12" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <path d="M28 23h8v9h-8z" fill="#b96f50" />
        <path d="M24 29q8-5 16 0l6 19q-13 6-28 0z" fill="url(#human-shirt)" />
        <path d="m28 30 4 5 4-5" fill="none" stroke="#ffe4e6" strokeWidth="1.4" />
        <path d="M31 35h2v8h-2z" fill="#fbcfe8" opacity=".8" />
        <text x="32" y="46" fill="#fff" fontSize="4.3" fontWeight="800" textAnchor="middle" letterSpacing=".4">TCT</text>
        <g className="tct-human-arm tct-human-arm-a">
          <path d="M23 31q-3-1-4 3l-3 11q-.5 3 2 4t3-2l4-10z" fill="#f6c6a8" />
          <path d="M20 42q-3 1-3 4" fill="none" stroke="#e7a989" strokeWidth="1" />
        </g>
        <g className="tct-human-arm tct-human-arm-b">
          <path d="M41 31q3-1 4 3l3 11q.5 3-2 4t-3-2l-4-10z" fill="#f6c6a8" />
          <path d="M44 42q3 1 3 4" fill="none" stroke="#e7a989" strokeWidth="1" />
        </g>
        <path d="M21 13q0-11 11-11t11 11v7q-1 11-11 12T21 20z" fill="#f6c6a8" />
        <path d="M20 15q-2-14 12-14 12 0 12 13l-3 4-2-7q-8 2-16-2l-1 10z" fill="#30232c" />
        <path d="M22 17q-2 10 2 14l-5-2q-4-4-3-10zM41 17q2 8-1 14l5-3q4-5 2-11z" fill="#30232c" />
        <path d="M20 25q-1 10 2 17l-2 12q6 2 9-2l1-27zM42 25q1 10-2 17l2 12q-6 2-9-2l-1-27z" fill="#30232c" />
        <ellipse cx="27.2" cy="18.3" rx="1.05" ry="1.35" fill="#38262c" />
        <ellipse cx="36.8" cy="18.3" rx="1.05" ry="1.35" fill="#38262c" />
        <g fill="none" stroke="#33232a" strokeWidth="1.15">
          <circle cx="27.1" cy="18.1" r="3.5" />
          <circle cx="36.9" cy="18.1" r="3.5" />
          <path d="M30.6 18q1.4-1.1 2.8 0M23.6 17.5l-2-.8M40.4 17.5l2-.8" strokeLinecap="round" />
        </g>
        <path d="M26 15.8q1.3-1 2.6 0M35.4 15.8q1.3-1 2.6 0" fill="none" stroke="#603d3b" strokeWidth=".9" strokeLinecap="round" />
        <path d="M32 19v3l1.3.4M29.6 25q2.4 2 4.8 0" fill="none" stroke="#ad6258" strokeWidth=".9" strokeLinecap="round" />
        <circle cx="22.5" cy="22" r="2.3" fill="#f39c87" opacity=".36" />
        <circle cx="41.5" cy="22" r="2.3" fill="#f39c87" opacity=".36" />
        {bag && (
          <g className="tct-human-bag" style={{ opacity: bagOpacity }}>
            <path d="M45 49q3-7 8 0" fill="none" stroke="#9a3412" strokeWidth="1.5" />
            <path d="m45 49 1 14h11l1-14z" fill="url(#human-bag)" />
            <text x="51.5" y="58" fill="#fff" fontSize="4.2" fontWeight="800" textAnchor="middle">TCT</text>
          </g>
        )}
      </g>
    </svg>
  );
}
