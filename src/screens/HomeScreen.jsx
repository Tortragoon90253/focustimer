import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import SketchShip, { SHIP_KINDS, SHIP_KIND_LABELS } from '../components/SketchShip'

const SHIP_COLORS = [
  'oklch(0.62 0.14 260)',
  'oklch(0.72 0.16 50)',
  'oklch(0.70 0.14 150)',
  'oklch(0.72 0.14 0)',
  '#caa7ff',
  '#ffd95e',
]

function generateMissionCode() {
  const words = ['ORION', 'VEGA', 'NOVA', 'LYRA', 'CYGNUS', 'ATLAS', 'HYDRA', 'DRACO', 'AQUILA', 'LUPUS']
  const nums = Math.floor(Math.random() * 900 + 100)
  return words[Math.floor(Math.random() * words.length)] + '-' + nums
}

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"

const labelStyle = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase', marginBottom: 8 }
const dashedInput = {
  width: '100%', padding: '10px 14px',
  fontFamily: hand, fontSize: 22,
  border: `2px dashed ${ink}`, borderRadius: 8,
  background: 'transparent', color: ink, outline: 'none',
}
const btnPrimary = {
  padding: '12px 16px', fontFamily: hand, fontSize: 20,
  border: `2px solid ${ink}`, borderRadius: 8,
  background: ink, color: paper, cursor: 'pointer',
  boxShadow: `3px 3px 0 oklch(0.62 0.14 260)`,
}
const btnGhost = {
  padding: '10px 16px', fontFamily: hand, fontSize: 18,
  border: `2px solid ${ink}`, borderRadius: 8,
  background: 'transparent', color: ink, cursor: 'pointer',
  boxShadow: `3px 3px 0 ${ink}`,
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const [shipKind, setShipKind] = useState('rocket')
  const [colorIndex, setColorIndex] = useState(0)
  const [pilotName, setPilotName] = useState('')
  const [mode, setMode] = useState(null)
  const [missionCode, setMissionCode] = useState('')
  const [generatedCode] = useState(generateMissionCode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const shipColor = SHIP_COLORS[colorIndex]

  async function handleCreate() {
    if (!pilotName.trim()) return setError('ใส่ชื่อนักบินด้วย')
    setLoading(true); setError('')
    try {
      const { user } = await signInAnonymously(auth)
      await setDoc(doc(db, 'missions', generatedCode), {
        status: 'lobby', hostId: user.uid,
        createdAt: serverTimestamp(), timerEnd: null,
        focusDuration: 25, breakDuration: 5,
      })
      await setDoc(doc(db, 'missions', generatedCode, 'crew', user.uid), {
        name: pilotName.trim(), shipColorIndex: colorIndex, shipKind,
        status: 'ready', sessionsCompleted: 0, totalFocusMinutes: 0,
        joinedAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'users', user.uid), {
        name: pilotName.trim(), shipKind, shipColorIndex: colorIndex,
        sessionsCompleted: 0, totalFocusMinutes: 0,
      }, { merge: true })
      navigate(`/lobby/${generatedCode}`, { state: { uid: user.uid } })
    } catch (e) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); console.error(e)
    }
    setLoading(false)
  }

  async function handleJoin() {
    if (!pilotName.trim()) return setError('ใส่ชื่อนักบินด้วย')
    if (!missionCode.trim()) return setError('ใส่ Mission Code ด้วย')
    setLoading(true); setError('')
    const code = missionCode.trim().toUpperCase()
    try {
      const snap = await getDoc(doc(db, 'missions', code))
      if (!snap.exists()) return setError(`ไม่พบ Mission "${code}"`)
      if (snap.data().status === 'ended') return setError('ภารกิจนี้จบไปแล้ว')
      const { user } = await signInAnonymously(auth)
      await setDoc(doc(db, 'missions', code, 'crew', user.uid), {
        name: pilotName.trim(), shipColorIndex: colorIndex, shipKind,
        status: 'ready', sessionsCompleted: 0, totalFocusMinutes: 0,
        joinedAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'users', user.uid), {
        name: pilotName.trim(), shipKind, shipColorIndex: colorIndex,
        sessionsCompleted: 0, totalFocusMinutes: 0,
      }, { merge: true })
      navigate(`/lobby/${code}`, { state: { uid: user.uid } })
    } catch (e) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่'); console.error(e)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 860,
        display: 'grid', gridTemplateColumns: '1fr 260px',
        border: `2px solid ${ink}`, borderRadius: 12,
        overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
      }}>

        {/* Left panel */}
        <div style={{ padding: 32, background: paper, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Logo */}
          <div>
            <div style={{ fontFamily: hand, fontSize: 38, color: ink, lineHeight: 1 }}>
              focus<span style={{ color: 'oklch(0.62 0.14 260)' }}>fleet</span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase', marginTop: 2 }}>
              เตรียมตัวออกเดินทาง
            </div>
          </div>

          {/* Ship type */}
          <div>
            <div style={labelStyle}>รูปทรงยาน</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {SHIP_KINDS.map((kind) => {
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
                    <div style={{ fontFamily: hand, fontSize: 16, color: ink, marginTop: 4 }}>
                      {SHIP_KIND_LABELS[kind]}
                    </div>
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

          {/* Color picker */}
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
              onChange={e => setPilotName(e.target.value)}
              placeholder="Commander ..."
              maxLength={20}
              style={dashedInput}
            />
          </div>

          {/* Buttons */}
          {!mode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {error && <div style={{ fontFamily: hand, fontSize: 18, color: 'oklch(0.72 0.14 0)', textAlign: 'center' }}>{error}</div>}
              <button onClick={handleCreate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'กำลังสร้าง...' : '🚀 สร้าง Lobby ทันที'}
              </button>
              <button onClick={() => setMode('join')} style={btnGhost}>🛸 เข้าร่วมด้วย Code</button>
            </div>
          )}

          {/* Mode: join */}
          {mode === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelStyle}>Mission Code</div>
                <input
                  type="text"
                  value={missionCode}
                  onChange={e => setMissionCode(e.target.value.toUpperCase())}
                  placeholder="ORION-421"
                  style={{ ...dashedInput, fontFamily: 'monospace', letterSpacing: '0.15em' }}
                />
              </div>
              {error && <div style={{ fontFamily: hand, fontSize: 18, color: 'oklch(0.72 0.14 0)', textAlign: 'center' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setMode(null); setError('') }} style={{ ...btnGhost, flex: '0 0 auto' }}>← ย้อน</button>
                <button onClick={handleJoin} disabled={loading} style={{ ...btnPrimary, flex: 1, boxShadow: '3px 3px 0 oklch(0.72 0.16 50)', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'กำลังเข้าร่วม...' : '🛸 เข้าร่วม Mission'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - preview */}
        <div style={{
          padding: 24, background: paper2,
          borderLeft: `2px solid ${ink}`,
          display: 'flex', flexDirection: 'column',
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
              {pilotName ? pilotName : <span style={{ color: muted }}>ชื่อนักบิน</span>}
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
