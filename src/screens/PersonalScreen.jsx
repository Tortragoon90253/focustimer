import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import SketchShip, { SHIP_COLORS } from '../components/SketchShip'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"
const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

// Journey milestones (in minutes of total focus time)
const MILESTONES = [
  { mins: 0,    label: 'เริ่มต้น',      x: 20,  y: 218 },
  { mins: 25,   label: 'session แรก',   x: 140, y: 192 },
  { mins: 300,  label: '5 ชั่วโมง',    x: 290, y: 158 },
  { mins: 1500, label: '25 ชั่วโมง',   x: 450, y: 118 },
  { mins: 3000, label: '50 ชั่วโมง',   x: 580, y: 80  },
  { mins: 6000, label: '100 ชั่วโมง',  x: 680, y: 40  },
]

function formatMinutes(mins) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

export default function PersonalScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) setUserData(snap.data())
    })
    return () => unsub()
  }, [uid])

  const totalMinutes = userData?.totalFocusMinutes ?? 0
  const totalSessions = userData?.sessionsCompleted ?? 0
  const name = userData?.name ?? 'นักบิน'
  const shipKind = userData?.shipKind ?? 'rocket'
  const shipColorIndex = userData?.shipColorIndex ?? 0
  const color = SHIP_COLORS[shipColorIndex]

  const lastAchievedIdx = MILESTONES.reduce((acc, m, i) => totalMinutes >= m.mins ? i : acc, 0)
  const lastAchieved = MILESTONES[lastAchievedIdx]

  const badges = [
    totalSessions >= 1  && { emoji: '🚀', label: 'session แรก' },
    totalSessions >= 5  && { emoji: '🏅', label: '5 sessions' },
    totalSessions >= 24 && { emoji: '🌟', label: '24 rounds' },
    totalMinutes >= 300  && { emoji: '⏱', label: '5h focus' },
    totalMinutes >= 3000 && { emoji: '🛰', label: '50h total' },
    totalMinutes >= 6000 && { emoji: '💫', label: '100h legend' },
  ].filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 860 }}>

        {/* Chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: paper, border: `2px solid ${ink}`,
          borderBottom: 'none', borderRadius: '10px 10px 0 0',
        }}>
          {[1,2,3].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: ink, opacity: 0.2 }} />)}
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>personal · {name}</span>
        </div>

        <div style={{
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
          background: paper, padding: 28,
          display: 'flex', flexDirection: 'column', gap: 18,
          position: 'relative',
        }}>
          {/* Planet decoration */}
          <svg width={90} height={90} viewBox="0 0 80 80" style={{ position: 'absolute', top: 18, right: 22, opacity: 0.3, pointerEvents: 'none' }}>
            <circle cx="40" cy="40" r="26" fill="oklch(0.72 0.16 50)" stroke={ink} strokeWidth="2" />
            <ellipse cx="40" cy="42" rx="38" ry="6" fill="none" stroke={ink} strokeWidth="1.5" transform="rotate(-18 40 42)" />
            <circle cx="32" cy="34" r="3" fill={paper} opacity="0.6" />
            <circle cx="48" cy="46" r="2" fill={paper} opacity="0.4" />
          </svg>

          {/* Header */}
          <div>
            <div style={labelTiny}>PERSONAL STATS</div>
            <div style={{ fontFamily: hand, fontSize: 38, color: ink, lineHeight: 1.1, marginTop: 4 }}>
              บันทึกการเดินทาง
            </div>
            <div style={{ ...labelTiny, marginTop: 3 }}>ดูภาพรวมเหมือน star map</div>
          </div>

          {/* Ship + quick stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <SketchShip kind={shipKind} size={64} color={color} />
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                { n: formatMinutes(totalMinutes), l: 'โฟกัสรวม' },
                { n: `${totalSessions}`, l: 'sessions' },
                { n: `${badges.length}`, l: 'badges' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '10px 16px', textAlign: 'center',
                  border: `2px solid ${ink}`, borderRadius: 8,
                  boxShadow: `2px 2px 0 ${ink}`,
                }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 26, color: ink }}>{s.n}</div>
                  <div style={{ ...labelTiny, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Journey map */}
          <div style={{
            minHeight: 220, padding: 14,
            border: `2px solid ${ink}`, borderRadius: 8,
            background: paper2, position: 'relative', overflow: 'hidden',
          }}>
            {/* Star decorations */}
            {[{ t: '14%', l: '6%' }, { t: '68%', l: '42%' }, { t: '22%', l: '78%' }, { t: '78%', l: '88%' }].map((s, i) => (
              <div key={i} style={{ position: 'absolute', top: s.t, left: s.l, opacity: 0.18, fontSize: 14 }}>✦</div>
            ))}

            <svg viewBox="0 0 700 255" style={{ width: '100%', height: '100%' }}>
              {/* Background dashed path */}
              <path
                d="M 20 218 Q 80 210 140 192 Q 200 172 290 158 Q 370 142 450 118 Q 530 94 580 80 Q 628 64 680 40"
                stroke={ink} strokeWidth="1.5" fill="none" strokeDasharray="6 4" opacity="0.25"
              />

              {/* Milestones */}
              {MILESTONES.map((m, i) => {
                const achieved = totalMinutes >= m.mins
                const isLast = i === lastAchievedIdx && totalMinutes > 0
                return (
                  <g key={i}>
                    {isLast && (
                      <circle cx={m.x} cy={m.y} r={12} fill="oklch(0.62 0.14 260)" opacity="0.18" />
                    )}
                    <circle
                      cx={m.x} cy={m.y} r={i === 0 ? 7 : 6}
                      fill={achieved ? 'oklch(0.62 0.14 260)' : paper}
                      stroke={ink} strokeWidth="1.5"
                      opacity={achieved ? 1 : 0.35}
                    />
                    <text
                      x={m.x + 10} y={m.y - 8}
                      fontFamily="Caveat, cursive" fontSize="13"
                      fill={achieved ? ink : muted}
                      opacity={achieved ? 1 : 0.4}
                    >
                      {m.label}
                    </text>
                  </g>
                )
              })}

              {/* "now" label at last achieved milestone */}
              {totalMinutes > 0 && (
                <text
                  x={lastAchieved.x} y={lastAchieved.y + 22}
                  fontFamily="Caveat, cursive" fontSize="12"
                  fill="oklch(0.62 0.14 260)" textAnchor="middle"
                >
                  now · {formatMinutes(totalMinutes)}
                </text>
              )}
            </svg>

            {/* Sticky note */}
            <div style={{
              position: 'absolute', bottom: 12, right: 16,
              padding: '4px 12px',
              background: 'oklch(0.62 0.14 260)',
              border: `1.5px solid ${ink}`, borderRadius: 4,
              fontFamily: hand, fontSize: 13, color: paper,
              transform: 'rotate(-0.6deg)',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.12)',
            }}>
              personal journey map
            </div>
          </div>

          {/* Badges */}
          <div>
            <div style={{ ...labelTiny, marginBottom: 8 }}>BADGES</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {badges.length === 0 ? (
                <div style={{ fontFamily: hand, fontSize: 16, color: muted }}>เริ่มบินเพื่อปลดล็อค badges...</div>
              ) : badges.map((b, i) => (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 14px',
                  border: `1.5px solid ${ink}`, borderRadius: 20,
                  fontFamily: hand, fontSize: 15, color: ink,
                  boxShadow: `1px 1px 0 ${ink}`,
                }}>
                  {b.emoji} {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 22px', fontFamily: hand, fontSize: 19,
              border: `2px solid ${ink}`, borderRadius: 8,
              background: 'transparent', color: ink, cursor: 'pointer',
              boxShadow: `2px 2px 0 ${ink}`,
            }}
          >
            ← กลับ
          </button>
        </div>
      </div>
    </div>
  )
}
