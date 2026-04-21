import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import SketchShip, { SHIP_COLORS, SHIP_KINDS, SHIP_KIND_LABELS } from '../components/SketchShip'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"
const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

function calcLevel(totalMinutes) {
  if (totalMinutes >= 6000) return 5
  if (totalMinutes >= 3000) return 4
  if (totalMinutes >= 1500) return 3
  if (totalMinutes >= 300)  return 2
  return 1
}

function formatMinutes(mins) {
  if (!mins) return '0m'
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

export default function ProfileScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [userData, setUserData] = useState(null)
  const [name, setName] = useState('')
  const [shipKind, setShipKind] = useState('rocket')
  const [colorIdx, setColorIdx] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) {
        const d = snap.data()
        setUserData(d)
        setName(d.name ?? '')
        setShipKind(d.shipKind ?? 'rocket')
        setColorIdx(d.shipColorIndex ?? 0)
      }
    })
    return () => unsub()
  }, [uid])

  async function handleSave() {
    if (!uid) return
    await setDoc(doc(db, 'users', uid), {
      name: name.trim() || userData?.name || 'นักบิน',
      shipKind,
      shipColorIndex: colorIdx,
    }, { merge: true })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const color = SHIP_COLORS[colorIdx]
  const totalMinutes = userData?.totalFocusMinutes ?? 0
  const totalSessions = userData?.sessionsCompleted ?? 0
  const level = calcLevel(totalMinutes)

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
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>profile · ปรับแต่งยาน</span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
          minHeight: 520,
        }}>

          {/* Left: edit form */}
          <div style={{
            padding: 28, background: paper,
            borderRight: `2px dashed rgba(0,0,0,0.2)`,
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div style={{
              fontFamily: hand, fontSize: 32, color: ink,
              borderBottom: `3px solid ${ink}`, paddingBottom: 2, display: 'inline-block',
            }}>
              ปรับแต่งยาน
            </div>

            {/* Pilot name */}
            <div>
              <div style={labelTiny}>ชื่อนักบิน</div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                placeholder="ชื่อของคุณ"
                style={{
                  marginTop: 6, width: '100%', padding: '8px 12px',
                  fontFamily: hand, fontSize: 22, color: ink,
                  border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                  background: 'transparent', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Ship type */}
            <div>
              <div style={labelTiny}>รูปทรงยาน</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {SHIP_KINDS.map(k => {
                  const selected = shipKind === k
                  return (
                    <button
                      key={k}
                      onClick={() => setShipKind(k)}
                      style={{
                        flex: 1, padding: 8, textAlign: 'center',
                        border: `2px solid ${ink}`, borderRadius: 8,
                        background: selected ? ink : 'transparent',
                        cursor: 'pointer',
                        boxShadow: selected ? `2px 2px 0 oklch(0.62 0.14 260)` : `2px 2px 0 ${ink}`,
                      }}
                    >
                      <SketchShip kind={k} size={46} color={selected ? SHIP_COLORS[colorIdx] : muted} />
                      <div style={{
                        fontFamily: hand, fontSize: 13,
                        color: selected ? paper : muted,
                        marginTop: 2,
                      }}>
                        {SHIP_KIND_LABELS[k]}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <div style={labelTiny}>สี</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                {SHIP_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setColorIdx(i)}
                    style={{
                      width: 36, height: 36,
                      background: c, border: `2px solid ${ink}`,
                      borderRadius: '50%', cursor: 'pointer',
                      transform: colorIdx === i ? 'scale(1.2)' : 'none',
                      boxShadow: colorIdx === i ? `0 0 0 2px ${ink}, 0 0 0 4px ${c}` : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Thruster glow (decorative) */}
            <div>
              <div style={labelTiny}>ไฟท้ายยาน (เวลาโฟกัสจะเรืองแสง)</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '🔥 orange', active: true },
                  { label: '💎 cyan', active: false },
                  { label: '⚡ yellow', active: false },
                  { label: '—', active: false },
                ].map(({ label, active }, i) => (
                  <div key={i} style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 12px', borderRadius: 20,
                    border: `1.5px solid ${active ? ink : 'rgba(0,0,0,0.25)'}`,
                    fontFamily: hand, fontSize: 15,
                    color: active ? ink : muted,
                    background: active ? 'rgba(255,160,50,0.12)' : 'transparent',
                  }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '11px 24px', fontFamily: hand, fontSize: 20,
                  border: `2px solid ${saved ? 'oklch(0.70 0.14 150)' : ink}`, borderRadius: 8,
                  background: saved ? 'oklch(0.70 0.14 150)' : ink,
                  color: paper, cursor: 'pointer',
                  boxShadow: `3px 3px 0 oklch(0.62 0.14 260)`,
                  transition: 'background 0.2s',
                }}
              >
                {saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
              </button>
              <button
                onClick={() => navigate(-1)}
                style={{
                  padding: '11px 20px', fontFamily: hand, fontSize: 20,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: 'transparent', color: ink, cursor: 'pointer',
                  boxShadow: `2px 2px 0 ${ink}`,
                }}
              >
                ← กลับ
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div style={{
            padding: 28, background: paper2,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{ ...labelTiny, alignSelf: 'flex-start' }}>PREVIEW</div>

            {/* Star decorations */}
            {[{ top: '18%', left: '14%' }, { top: '22%', right: '12%', left: 'auto' }, { top: '72%', left: '12%' }].map((s, i) => (
              <div key={i} style={{ position: 'absolute', ...s, opacity: 0.2, fontSize: i === 1 ? 18 : 13, pointerEvents: 'none' }}>✦</div>
            ))}

            {/* Big ship preview */}
            <SketchShip kind={shipKind} size={180} color={color} />

            {/* Pilot name */}
            <div style={{ fontFamily: hand, fontSize: 28, color: ink }}>
              {name || userData?.name || 'นักบิน'}
            </div>

            {/* Chips row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { label: `lvl ${level}` },
                { label: `${formatMinutes(totalMinutes)} โฟกัส`, color: 'oklch(0.62 0.14 260)' },
                { label: `${totalSessions} sessions` },
              ].map((c, i) => (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '4px 14px', borderRadius: 20,
                  border: `1.5px solid ${c.color ?? ink}`,
                  fontFamily: hand, fontSize: 15,
                  color: c.color ?? ink,
                }}>
                  {c.label}
                </div>
              ))}
            </div>

            {/* Hint sticky */}
            <div style={{
              padding: '5px 12px',
              background: '#ffd95e',
              border: `1.5px solid ${ink}`, borderRadius: 4,
              fontFamily: hand, fontSize: 14, color: ink,
              transform: 'rotate(-0.8deg)',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.1)',
              marginTop: 8,
            }}>
              กดสีด้านซ้ายเพื่อดูสดๆ
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
