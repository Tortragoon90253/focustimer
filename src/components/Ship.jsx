// Spacecraft SVG component — each crew member gets a color-coded ship
const SHIP_COLORS = [
  '#6c8ef5', // blue
  '#f56c8e', // pink
  '#6cf5b4', // mint
  '#f5c46c', // gold
  '#c46cf5', // purple
  '#6cf5f0', // cyan
  '#f5906c', // orange
  '#a8f56c', // lime
]

export function getShipColor(index) {
  return SHIP_COLORS[index % SHIP_COLORS.length]
}

export default function Ship({ color = '#6c8ef5', size = 48, status = 'focusing', float = true, className = '' }) {
  const isFocusing = status === 'focusing'
  const isBreak = status === 'break'
  const isDone = status === 'done'

  return (
    <div
      className={`relative inline-flex items-center justify-center ${float && isFocusing ? 'ship-float' : ''} ${className}`}
      style={{ width: size, height: size * 1.4 }}
    >
      <svg
        width={size}
        height={size * 1.4}
        viewBox="0 0 40 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: isDone ? 0.4 : 1, filter: isFocusing ? `drop-shadow(0 0 6px ${color}88)` : 'none' }}
      >
        {/* Body */}
        <path
          d="M20 2 L32 18 L32 38 L8 38 L8 18 Z"
          fill={color}
          fillOpacity={isDone ? 0.3 : 0.9}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Cockpit window */}
        <ellipse cx="20" cy="18" rx="6" ry="7" fill="#06060f" fillOpacity="0.6" stroke={color} strokeWidth="1" />
        <ellipse cx="20" cy="18" rx="3" ry="4" fill={color} fillOpacity="0.3" />

        {/* Wings */}
        <path d="M8 28 L2 42 L8 38 Z" fill={color} fillOpacity="0.7" stroke={color} strokeWidth="1" strokeLinejoin="round" />
        <path d="M32 28 L38 42 L32 38 Z" fill={color} fillOpacity="0.7" stroke={color} strokeWidth="1" strokeLinejoin="round" />

        {/* Engine exhaust */}
        {isFocusing && (
          <g className="engine-pulse">
            <ellipse cx="16" cy="41" rx="3" ry="5" fill={color} fillOpacity="0.8" />
            <ellipse cx="24" cy="41" rx="3" ry="5" fill={color} fillOpacity="0.8" />
            <ellipse cx="16" cy="44" rx="2" ry="4" fill="#fff" fillOpacity="0.5" />
            <ellipse cx="24" cy="44" rx="2" ry="4" fill="#fff" fillOpacity="0.5" />
          </g>
        )}

        {/* Break indicator */}
        {isBreak && (
          <g>
            <ellipse cx="16" cy="41" rx="3" ry="2" fill={color} fillOpacity="0.3" />
            <ellipse cx="24" cy="41" rx="3" ry="2" fill={color} fillOpacity="0.3" />
          </g>
        )}

        {/* Status glow ring */}
        {isFocusing && (
          <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="0.5" fill="none" strokeOpacity="0.3" />
        )}
      </svg>

      {/* Pulse ring for active focusing */}
      {isFocusing && (
        <div
          className="absolute rounded-full border"
          style={{
            width: size * 0.9,
            height: size * 0.9,
            top: '5%',
            left: '5%',
            borderColor: color,
            animation: 'pulse-ring 2s ease-out infinite',
          }}
        />
      )}
    </div>
  )
}
