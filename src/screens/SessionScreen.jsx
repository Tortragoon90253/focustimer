import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import SketchShip, { SHIP_COLORS, SHIP_KINDS } from '../components/SketchShip'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"

const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

export default function SessionScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const [totalSeconds, setTotalSeconds] = useState(null)
  const timerEndFiredRef = useRef(false)

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setMission(data)
      if (data.status === 'break') navigate(`/break/${missionCode}`, { state: { uid } })
      if (data.status === 'ended') navigate(`/stats/${missionCode}`, { state: { uid } })
      if (data.timerEnd) setTotalSeconds((data.focusDuration ?? 25) * 60)
    })
    const unsubCrew = onSnapshot(collection(db, 'missions', missionCode, 'crew'), snap => {
      setCrew(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubMission(); unsubCrew() }
  }, [missionCode, uid, navigate])

  useEffect(() => {
    if (!mission?.timerEnd) return
    timerEndFiredRef.current = false
    const tick = () => {
      const end = mission.timerEnd.toDate ? mission.timerEnd.toDate() : new Date(mission.timerEnd)
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && mission?.hostId === uid && !timerEndFiredRef.current) {
        timerEndFiredRef.current = true
        handleTimerEnd()
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [mission?.timerEnd])

  const handleTimerEnd = useCallback(async () => {
    try {
      const breakEnd = new Date(Date.now() + (mission?.breakDuration ?? 5) * 60 * 1000)
      await updateDoc(doc(db, 'missions', missionCode), { status: 'break', timerEnd: breakEnd })
      for (const member of crew) {
        await updateDoc(doc(db, 'missions', missionCode, 'crew', member.id), {
          status: 'break',
          sessionsCompleted: (member.sessionsCompleted ?? 0) + 1,
          totalFocusMinutes: (member.totalFocusMinutes ?? 0) + (mission?.focusDuration ?? 25),
        })
        await setDoc(doc(db, 'users', member.id), {
          sessionsCompleted: increment(1),
          totalFocusMinutes: increment(mission?.focusDuration ?? 25),
          name: member.name,
          shipKind: member.shipKind ?? 'rocket',
          shipColorIndex: member.shipColorIndex ?? 0,
          lastSessionAt: serverTimestamp(),
        }, { merge: true })
      }
    } catch (err) {
      console.error('handleTimerEnd failed:', err)
      timerEndFiredRef.current = false
    }
  }, [mission, crew, missionCode])

  const formatTime = (secs) => {
    if (secs == null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progress = totalSeconds && timeLeft != null ? 1 - (timeLeft / totalSeconds) : 0
  const focusingCrew = crew.filter(m => m.status === 'focusing')

  // Distribute ships along the flight path based on index
  const shipPositions = crew.map((_, i) => {
    const total = crew.length
    const base = (i / Math.max(total - 1, 1)) * 70 + 5
    const yOffsets = [40, 20, 60, 30, 55, 15, 45, 25]
    return { x: base, y: yOffsets[i % yOffsets.length] }
  })

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 1000 }}>

        {/* Chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: paper, border: `2px solid ${ink}`,
          borderBottom: 'none', borderRadius: '10px 10px 0 0',
        }}>
          {[1,2,3].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: ink, opacity: 0.2 }} />)}
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>
            mission: {missionCode} · {formatTime(timeLeft)}
          </span>
        </div>

        {/* Main layout */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 280px',
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
        }}>

          {/* Left: timer + fleet visualization */}
          <div style={{ padding: 28, background: paper, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Big timer */}
            <div style={{ textAlign: 'center' }}>
              <div style={labelTiny}>TIME REMAINING</div>
              <div style={{ fontFamily: 'monospace', fontSize: 88, lineHeight: 1, letterSpacing: '0.02em', color: ink, marginTop: 4 }}>
                {formatTime(timeLeft)}
              </div>

              {/* Progress bar */}
              <div style={{ width: '60%', margin: '16px auto 0', height: 12, border: `2px solid ${ink}`, borderRadius: 6, overflow: 'hidden', background: 'transparent' }}>
                <div style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  background: ink,
                  borderRadius: 4,
                  transition: 'width 1s linear',
                }} />
              </div>
              <div style={{ ...labelTiny, marginTop: 6 }}>
                {Math.round(progress * 100)}% · {formatTime(timeLeft)} เหลือ
              </div>
            </div>

            {/* Fleet visualization */}
            <div style={{ position: 'relative', height: 220, marginTop: 8 }}>
              {/* Dashed flight path line */}
              <div style={{
                position: 'absolute', left: '5%', right: '5%', top: '50%',
                height: 2,
                background: `repeating-linear-gradient(90deg, ${ink} 0 6px, transparent 6px 14px)`,
                opacity: 0.3,
              }} />

              {/* Star decorations */}
              {[{top:'15%',left:'8%'},{top:'75%',left:'60%'},{top:'20%',right:'10%'}].map((s,i) => (
                <div key={i} style={{ position: 'absolute', ...s, opacity: 0.25, fontSize: 16 }}>✦</div>
              ))}

              {/* Ships */}
              {crew.map((member, idx) => {
                const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                const kind = member.shipKind ?? SHIP_KINDS[idx % SHIP_KINDS.length]
                const tilt = idx % 2 === 0 ? -5 : 5
                const pos = shipPositions[idx]
                const isMe = member.id === uid
                return (
                  <div
                    key={member.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <SketchShip kind={kind} size={isMe ? 52 : 44} color={color} tilt={tilt} />
                    <div style={{
                      ...labelTiny, marginTop: 2,
                      fontFamily: hand, fontSize: 14,
                      color: isMe ? ink : muted,
                      fontWeight: isMe ? 700 : 400,
                    }}>
                      {member.name}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
              {[
                { label: '⏸ Pause', disabled: true },
                { label: '🚪 ออกจากฝูง', disabled: true },
                { label: '🎵 lofi', disabled: true },
              ].map(({ label, disabled }) => (
                <button
                  key={label}
                  disabled={disabled}
                  style={{
                    padding: '8px 18px', fontFamily: hand, fontSize: 18,
                    border: `2px solid ${ink}`, borderRadius: 8,
                    background: 'transparent', color: ink,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.35 : 1,
                    boxShadow: `2px 2px 0 ${ink}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: fleet sidebar */}
          <div style={{
            padding: 20, background: paper2,
            borderLeft: `2px solid ${ink}`,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={labelTiny}>
              FLEET · {focusingCrew.length}/{crew.length}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {crew.map((member, idx) => {
                const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                const kind = member.shipKind ?? SHIP_KINDS[idx % SHIP_KINDS.length]
                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderBottom: `1px dashed rgba(0,0,0,0.15)`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SketchShip kind={kind} size={28} color={color} />
                      <span style={{ fontFamily: hand, fontSize: 18, color: ink }}>{member.name}</span>
                    </div>
                    <span style={{ ...labelTiny, letterSpacing: '0.08em' }}>
                      {member.status === 'focusing' ? 'focused' : member.status}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px dashed rgba(0,0,0,0.2)`, paddingTop: 10 }}>
              <div style={{ ...labelTiny, letterSpacing: '0.08em' }}>
                ℹ︎ chat จะเปิดได้ตอน break
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
