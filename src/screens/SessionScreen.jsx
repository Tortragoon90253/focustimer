import { loadUid } from '../utils/uid'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore'
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
  const uid = loadUid(location.state)

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const [totalSeconds, setTotalSeconds] = useState(null)
  const [musicOn, setMusicOn] = useState(false)
  const timerEndFiredRef = useRef(false)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)

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
    if (mission?.isPaused) {
      setTimeLeft(mission.remainingSeconds ?? null)
      return
    }
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
  }, [mission?.timerEnd, mission?.isPaused, mission?.remainingSeconds])

  useEffect(() => {
    return () => {
      sourceRef.current?.stop()
      audioCtxRef.current?.close()
    }
  }, [])

  const handleTimerEnd = useCallback(async () => {
    try {
      const focusDuration = mission?.focusDuration ?? 25
      const nextCount = (crew[0]?.sessionsCompleted ?? 0) + 1
      const isLastRound = mission?.totalRounds && nextCount >= mission.totalRounds

      const batch = writeBatch(db)
      for (const member of crew) {
        batch.update(doc(db, 'missions', missionCode, 'crew', member.id), {
          status: isLastRound ? 'done' : 'break',
          sessionsCompleted: (member.sessionsCompleted ?? 0) + 1,
          totalFocusMinutes: (member.totalFocusMinutes ?? 0) + focusDuration,
        })
        batch.set(doc(db, 'users', member.id), {
          sessionsCompleted: increment(1),
          totalFocusMinutes: increment(focusDuration),
          name: member.name,
          shipKind: member.shipKind ?? 'rocket',
          shipColorIndex: member.shipColorIndex ?? 0,
          lastSessionAt: serverTimestamp(),
        }, { merge: true })
      }

      if (isLastRound) {
        batch.update(doc(db, 'missions', missionCode), { status: 'ended' })
      } else {
        const breakEnd = new Date(Date.now() + (mission?.breakDuration ?? 5) * 60 * 1000)
        batch.update(doc(db, 'missions', missionCode), { status: 'break', timerEnd: breakEnd })
      }

      await batch.commit()
    } catch (err) {
      console.error('handleTimerEnd failed:', err)
      timerEndFiredRef.current = false
    }
  }, [mission, crew, missionCode])

  async function handlePause() {
    if (!uid || mission?.hostId !== uid) return
    try {
      await updateDoc(doc(db, 'missions', missionCode), {
        isPaused: true,
        remainingSeconds: timeLeft,
      })
    } catch (err) {
      console.error('handlePause failed:', err)
    }
  }

  async function handleResume() {
    if (!uid || mission?.hostId !== uid) return
    try {
      const remaining = mission?.remainingSeconds ?? 0
      const newEnd = new Date(Date.now() + remaining * 1000)
      await updateDoc(doc(db, 'missions', missionCode), {
        isPaused: false,
        timerEnd: newEnd,
      })
    } catch (err) {
      console.error('handleResume failed:', err)
    }
  }

  async function handleLeave() {
    const others = crew.filter(m => m.id !== uid)
    try {
      if (others.length === 0) {
        await updateDoc(doc(db, 'missions', missionCode), { status: 'ended' })
      } else if (mission?.hostId === uid) {
        const batch = writeBatch(db)
        batch.update(doc(db, 'missions', missionCode), { hostId: others[0].id })
        batch.delete(doc(db, 'missions', missionCode, 'crew', uid))
        await batch.commit()
      } else {
        await deleteDoc(doc(db, 'missions', missionCode, 'crew', uid))
      }
      navigate('/')
    } catch (err) {
      console.error('handleLeave failed:', err)
    }
  }

  function toggleMusic() {
    if (musicOn) {
      sourceRef.current?.stop()
      audioCtxRef.current?.close()
      audioCtxRef.current = null
      sourceRef.current = null
      setMusicOn(false)
      return
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx
    const track = mission?.musicTrack ?? 'lofi'
    const bufLen = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    if (track === 'lofi') {
      let lastOut = 0
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + 0.02 * white) / 1.02
        lastOut = data[i]
        data[i] *= 3.5
      }
    } else {
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = 0.15
    if (track === 'lofi') {
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 800
      source.connect(filter)
      filter.connect(gain)
    } else {
      source.connect(gain)
    }
    gain.connect(ctx.destination)
    source.start()
    sourceRef.current = source
    setMusicOn(true)
  }

  const formatTime = (secs) => {
    if (secs == null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isHost = mission?.hostId === uid
  const isPaused = mission?.isPaused ?? false
  const musicDisabled = !mission || mission.musicTrack === 'none'
  const progress = totalSeconds && timeLeft != null ? 1 - (timeLeft / totalSeconds) : 0
  const focusingCrew = crew.filter(m => m.status === 'focusing')

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
            mission: {missionCode} · {isPaused ? '⏸ paused' : formatTime(timeLeft)}
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
              <div style={labelTiny}>{isPaused ? 'PAUSED' : 'TIME REMAINING'}</div>
              <div style={{
                fontFamily: 'monospace', fontSize: 88, lineHeight: 1, letterSpacing: '0.02em',
                color: ink, marginTop: 4, opacity: isPaused ? 0.5 : 1,
              }}>
                {formatTime(timeLeft)}
              </div>

              {/* Progress bar */}
              <div style={{ width: '60%', margin: '16px auto 0', height: 12, border: `2px solid ${ink}`, borderRadius: 6, overflow: 'hidden', background: 'transparent' }}>
                <div style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  background: isPaused ? muted : ink,
                  borderRadius: 4,
                  transition: isPaused ? 'none' : 'width 1s linear',
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
              {/* Pause / Resume — host only */}
              <button
                onClick={isHost ? (isPaused ? handleResume : handlePause) : undefined}
                disabled={!isHost}
                style={{
                  padding: '8px 18px', fontFamily: hand, fontSize: 18,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: (isHost && isPaused) ? ink : 'transparent',
                  color: (isHost && isPaused) ? paper : ink,
                  cursor: isHost ? 'pointer' : 'not-allowed',
                  opacity: isHost ? 1 : 0.35,
                  boxShadow: `2px 2px 0 ${ink}`,
                }}
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>

              {/* Leave */}
              <button
                onClick={handleLeave}
                style={{
                  padding: '8px 18px', fontFamily: hand, fontSize: 18,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: 'transparent', color: ink,
                  cursor: 'pointer',
                  boxShadow: `2px 2px 0 ${ink}`,
                }}
              >
                🚪 ออกจากฝูง
              </button>

              {/* Music toggle */}
              <button
                onClick={!musicDisabled ? toggleMusic : undefined}
                disabled={musicDisabled}
                style={{
                  padding: '8px 18px', fontFamily: hand, fontSize: 18,
                  border: `2px solid ${musicOn ? 'oklch(0.62 0.14 260)' : ink}`, borderRadius: 8,
                  background: musicOn ? 'oklch(0.62 0.14 260)' : 'transparent',
                  color: musicOn ? paper : ink,
                  cursor: musicDisabled ? 'not-allowed' : 'pointer',
                  opacity: musicDisabled ? 0.35 : 1,
                  boxShadow: `2px 2px 0 ${ink}`,
                }}
              >
                {musicOn ? '🔊 lofi' : '🎵 lofi'}
              </button>
            </div>
          </div>

          {/* Right: fleet sidebar */}
          <div style={{
            padding: 20, background: paper2,
            borderLeft: `2px solid ${ink}`,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={labelTiny}>FLEET · {focusingCrew.length}/{crew.length}</div>
              {mission?.totalRounds && (
                <div style={{ ...labelTiny, color: 'oklch(0.62 0.14 260)' }}>
                  รอบ {(crew[0]?.sessionsCompleted ?? 0) + 1}/{mission.totalRounds}
                </div>
              )}
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
