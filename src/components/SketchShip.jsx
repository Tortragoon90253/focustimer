const SHIP_BODIES = {
  rocket: (color) => (
    <g>
      <path d="M32 6 L44 28 L44 48 L20 48 L20 28 Z" fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="26" r="5" fill="#faf6ee" stroke="#1a1a1a" strokeWidth="2" />
      <path d="M20 40 L10 52 L20 48 Z" fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 40 L54 52 L44 48 Z" fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 48 L28 58 M32 48 L32 60 M38 48 L36 58" stroke="oklch(0.72 0.16 50)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  ),
  saucer: (color) => (
    <g>
      <ellipse cx="32" cy="34" rx="24" ry="8" fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 30 Q 32 16 44 30" fill="#faf6ee" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="28" r="1.5" fill="#1a1a1a" />
      <circle cx="32" cy="26" r="1.5" fill="#1a1a1a" />
      <circle cx="38" cy="28" r="1.5" fill="#1a1a1a" />
      <path d="M14 40 L10 46 M32 42 L32 50 M50 40 L54 46" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  arrow: (color) => (
    <g>
      <path d="M32 8 L50 40 L36 36 L32 54 L28 36 L14 40 Z" fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="24" r="3" fill="#faf6ee" stroke="#1a1a1a" strokeWidth="2" />
    </g>
  ),
  pod: (color) => (
    <g>
      <rect x="20" y="14" width="24" height="34" rx="4" fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="26" r="5" fill="#faf6ee" stroke="#1a1a1a" strokeWidth="2" />
      <path d="M20 30 L14 38 L20 42" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 30 L50 38 L44 42" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 48 L26 56 M38 48 L38 56" stroke="oklch(0.72 0.16 50)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  ),
}

export const SHIP_KINDS = ['rocket', 'saucer', 'arrow', 'pod']
export const SHIP_KIND_LABELS = { rocket: 'Falcon', saucer: 'Nimbus', arrow: 'Dart', pod: 'Pod' }
export const SHIP_COLORS = [
  'oklch(0.62 0.14 260)',
  'oklch(0.72 0.16 50)',
  'oklch(0.70 0.14 150)',
  'oklch(0.72 0.14 0)',
  '#caa7ff',
  '#ffd95e',
]

export default function SketchShip({ kind = 'rocket', size = 56, color = 'oklch(0.62 0.14 260)', tilt = 0 }) {
  const bodyFn = SHIP_BODIES[kind] || SHIP_BODIES.rocket
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ transform: `rotate(${tilt}deg)`, display: 'block' }}
    >
      {bodyFn(color)}
    </svg>
  )
}
