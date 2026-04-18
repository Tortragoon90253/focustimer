import { useMemo } from 'react'

export default function StarField({ count = 80 }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    dur: (Math.random() * 3 + 2).toFixed(1),
    op: (Math.random() * 0.5 + 0.2).toFixed(2),
  })), [count])

  return (
    <div className="stars-bg">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            '--dur': `${s.dur}s`,
            '--op': s.op,
          }}
        />
      ))}
    </div>
  )
}
