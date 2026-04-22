import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SketchShip, { SHIP_KINDS, SHIP_KIND_LABELS, SHIP_COLORS } from '../components/SketchShip'
import { useWindowSize } from '../hooks/useWindowSize'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"
const labelStyle = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase', marginBottom: 8 }

export default function HomeScreen() {
  const navigate = useNavigate()
  const { isMobile } = useWindowSize()
  const [shipKind, setShipKind] = useState('rocket')
  const [colorIndex, setColorIndex] = useState(0)
  const [pilotName, setPilotName] = useState('')
  const [error, setError] = useState('')

  const shipColor = SHIP_COLORS[colorIndex]

  function handleNext() {
    if (!pilotName.trim()) return setError('ใส่ชื่อนักบินก่อนนะครับ')
    navigate('/hub', { state: { pilotName: pilotName.trim(), shipKind, colorIndex } })
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 12 : 24 }}>
      <div style={{
        width: '100%', maxWidth: 860,
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px',
        border: `2px solid ${ink}`, borderRadius: 12,
        overflow: 'hidden', boxShadow: `4px 4px 0 ${ink}`,
      }}>

        {/* Left: customization form */}
        <div style={{ padding: 32, background: paper, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Logo */}
          <div>
            <div style={{ fontFamily: hand, fontSize: isMobile ? 28 : 38, color: ink, lineHeight: 1 }}>
              focus<span style={{ color: 'oklch(0.62 0.14 260)' }}>fleet</span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase', marginTop: 2 }}>
              เตรียมตัวออกเดินทาง
            </div>
          </div>

          {/* Ship type */}
          <div>
            <div style={labelStyle}>รูปทรงยาน</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 8 }}>
              {SHIP_KINDS.map(kind => {
                const active = shipKind === kind
                return (
                  <button
                    key={kind}
                    onClick={() => setShipKind(kind)}
                    style={{
                      padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                      border: `2px solid ${active ? ink : 'rgba(0,0,0,0.15)'}`,
                      borderRadius: 8,
                      background: active ? 'rgba(0,0,0,0.04)' : 'transparent',
                      position: 'relative',
                    }}
                  >
                    <SketchShip kind={kind} size={56} color={active ? shipColor : '#ccc'} />
                    <div style={{ fontFamily: hand, fontSize: 16, color: ink, marginTop: 4 }}>{SHIP_KIND_LABELS[kind]}</div>
                    {active && (
                      <div style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 20, height: 20, borderRadius: '50%',
                        background: ink, color: paper,
                        fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>✓</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <div style={labelStyle}>สี</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {SHIP_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColorIndex(i)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c, border: `2px solid ${ink}`,
                    cursor: 'pointer', padding: 0,
                    transform: colorIndex === i ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: colorIndex === i ? `0 0 0 2px ${bg}, 0 0 0 4px ${ink}` : 'none',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Pilot name */}
          <div>
            <div style={labelStyle}>ชื่อนักบิน</div>
            <input
              type="text"
              value={pilotName}
              onChange={e => { setPilotName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              placeholder="Commander ..."
              maxLength={20}
              style={{
                width: '100%', padding: '10px 14px',
                fontFamily: hand, fontSize: 22,
                border: `2px dashed ${ink}`, borderRadius: 8,
                background: 'transparent', color: ink, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ fontFamily: hand, fontSize: 17, color: 'oklch(0.72 0.14 0)' }}>{error}</div>
          )}

          <button
            onClick={handleNext}
            style={{
              marginTop: 4, padding: '13px 16px',
              fontFamily: hand, fontSize: 22,
              border: `2px solid ${ink}`, borderRadius: 8,
              background: ink, color: paper, cursor: 'pointer',
              boxShadow: `3px 3px 0 oklch(0.62 0.14 260)`,
            }}
          >
            ถัดไป →
          </button>
        </div>

        {/* Right: live preview */}
        <div style={{
          padding: 24, background: paper2,
          borderLeft: isMobile ? 'none' : `2px solid ${ink}`,
          borderTop: isMobile ? `2px solid ${ink}` : 'none',
          display: 'flex', flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center', gap: 16,
          position: 'relative',
        }}>
          <div style={{ ...labelStyle, alignSelf: 'flex-start', marginBottom: 0 }}>PREVIEW</div>

          {[{ top: 48, right: 28, size: 18 }, { top: 90, left: 18, size: 12 }, { bottom: 130, right: 18, size: 14 }].map((s, i) => (
            <div key={i} style={{ position: 'absolute', ...s, opacity: 0.3, fontSize: s.size, lineHeight: 1, pointerEvents: 'none' }}>✦</div>
          ))}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <SketchShip kind={shipKind} size={150} color={shipColor} />
            <div style={{ fontFamily: hand, fontSize: 24, color: ink, textAlign: 'center', minHeight: 32 }}>
              {pilotName || <span style={{ color: muted }}>ชื่อนักบิน</span>}
            </div>
            <div style={{
              padding: '4px 14px',
              border: '1.5px solid rgba(0,0,0,0.2)',
              borderRadius: 20, fontSize: 14,
              fontFamily: hand, color: '#555',
            }}>
              {SHIP_KIND_LABELS[shipKind]}
            </div>
          </div>

          <div style={{
            padding: '10px 14px', background: '#ffd95e',
            border: `1.5px solid ${ink}`, borderRadius: 4,
            fontSize: 14, fontFamily: hand, color: ink,
            transform: 'rotate(-1.5deg)',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.12)',
            alignSelf: 'stretch',
          }}>
            ยานนี้จะปรากฏบนจอระหว่างที่ทีมโฟกัสด้วยกัน 🚀
          </div>
        </div>
      </div>
    </div>
  )
}
