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

const MUSIC_TRACKS = ['none', 'lofi', 'rain', 'focus', 'ambient']
const TRACK_LABEL = { none: '🔇 ปิด', lofi: '🎵 lofi', rain: '🌧️ rain', focus: '🔮 focus', ambient: '🌌 ambient' }
const LS_MUSIC_KEY = 'focusFleet_music'

export default function SessionScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = loadUid(location.state)

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const [totalSeconds, setTotalSeconds] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(() => localStorage.getItem(LS_MUSIC_KEY) ?? 'none')
  const [explosions, setExplosions] = useState([])
  const timerEndFiredRef = useRef(false)
  const audioCtxRef = useRef(null)
  const nodesRef = useRef([])
  const prevCrewRef = useRef([])
  const progressRef = useRef(0)
  const [toasts, setToasts] = useState([])
  const warned5minRef = useRef(false)
  const prevStatusRef = useRef(null)
  const prevHostRef = useRef(null)

  const addToast = useCallback((text) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-2), { id, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      if (prevStatusRef.current && data.status !== prevStatusRef.current) {
        if (data.status === 'active') addToast('🎯 เริ่มโฟกัสได้เลย!')
        if (data.status === 'break') addToast('☕ เวลาพักแล้ว!')
      }
      prevStatusRef.current = data.status
      if (prevHostRef.current && data.hostId !== prevHostRef.current && data.hostId === uid) {
        addToast('👑 คุณเป็น Host คนใหม่')
      }
      prevHostRef.current = data.hostId
      setMission(data)
      if (data.status === 'break') navigate(`/break/${missionCode}`, { state: { uid } })
      if (data.status === 'ended') navigate(`/stats/${missionCode}`, { state: { uid } })
      if (data.timerEnd) setTotalSeconds((data.focusDuration ?? 25) * 60)
    })
    const unsubCrew = onSnapshot(collection(db, 'missions', missionCode, 'crew'), snap => {
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const prevCrew = prevCrewRef.current
      if (prevCrew.length > 0) {
        const newIds = new Set(members.map(m => m.id))
        const prevIds = new Set(prevCrew.map(m => m.id))
        prevCrew.forEach((m, idx) => {
          if (!newIds.has(m.id) && m.id !== uid) {
            spawnExplosion(m, idx)
            addToast(`💥 ${m.name} ออกจากฝูงบิน`)
          }
        })
        members.forEach(m => {
          if (!prevIds.has(m.id) && m.id !== uid) addToast(`🚀 ${m.name} เข้าร่วมฝูงบิน`)
        })
      }
      prevCrewRef.current = members
      setCrew(members)
    })
    return () => { unsubMission(); unsubCrew() }
  }, [missionCode, uid, navigate, addToast])

  useEffect(() => {
    if (!mission?.timerEnd) return
    if (mission?.isPaused) {
      setTimeLeft(mission.remainingSeconds ?? null)
      return
    }
    timerEndFiredRef.current = false
    warned5minRef.current = false
    const tick = () => {
      const end = mission.timerEnd.toDate ? mission.timerEnd.toDate() : new Date(mission.timerEnd)
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff <= 300 && diff > 295 && !warned5minRef.current) {
        warned5minRef.current = true
        addToast('⏰ เหลืออีก 5 นาที')
      }
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
    if (currentTrack !== 'none') startAudio(currentTrack)
    return () => stopAudio()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  function stopAudio() {
    for (const n of nodesRef.current) { try { n.stop?.(); n.disconnect?.() } catch (_) {} }
    nodesRef.current = []
    try { audioCtxRef.current?.close() } catch (_) {}
    audioCtxRef.current = null
  }

  function startAudio(track) {
    stopAudio()
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx
    const dest = ctx.destination

    if (track === 'lofi') {
      const bufLen = 2 * ctx.sampleRate
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < bufLen; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 3.5
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800
      const gain = ctx.createGain(); gain.gain.value = 0.14
      src.connect(filter); filter.connect(gain); gain.connect(dest)
      src.start()
      nodesRef.current = [src, filter, gain]

    } else if (track === 'rain') {
      const bufLen = 2 * ctx.sampleRate
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200
      const masterGain = ctx.createGain(); masterGain.gain.value = 0.18
      // LFO to simulate rain patter rhythm
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 1.2
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.06
      lfo.connect(lfoGain); lfoGain.connect(masterGain.gain)
      src.connect(filter); filter.connect(masterGain); masterGain.connect(dest)
      src.start(); lfo.start()
      nodesRef.current = [src, filter, masterGain, lfo, lfoGain]

    } else if (track === 'focus') {
      // Two slightly detuned sine waves create a 10Hz beating pattern
      const gainNode = ctx.createGain(); gainNode.gain.value = 0.08; gainNode.connect(dest)
      const oscA = ctx.createOscillator(); oscA.type = 'sine'; oscA.frequency.value = 200
      const oscB = ctx.createOscillator(); oscB.type = 'sine'; oscB.frequency.value = 210
      oscA.connect(gainNode); oscB.connect(gainNode)
      oscA.start(); oscB.start()
      nodesRef.current = [oscA, oscB, gainNode]

    } else if (track === 'ambient') {
      // Pink noise: Paul Kellet's algorithm
      const bufLen = 2 * ctx.sampleRate
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const d = buf.getChannelData(0)
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
      for (let i = 0; i < bufLen; i++) {
        const w = Math.random() * 2 - 1
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      const gain = ctx.createGain(); gain.gain.value = 0.12
      src.connect(gain); gain.connect(dest)
      src.start()
      nodesRef.current = [src, gain]
    }
  }

  function cycleTrack() {
    const idx = MUSIC_TRACKS.indexOf(currentTrack)
    const next = MUSIC_TRACKS[(idx + 1) % MUSIC_TRACKS.length]
    if (next === 'none') stopAudio()
    else startAudio(next)
    setCurrentTrack(next)
    localStorage.setItem(LS_MUSIC_KEY, next)
  }

  function spawnExplosion(member, crewIdx) {
    const formationOffsets = [0, -9, 9, -5, 5, -13, 13, -4]
    const yOffsets = [40, 20, 60, 30, 55, 15, 48, 25]
    const prog = progressRef.current
    const x = Math.min(88, Math.max(5, prog * 78 + 10 + formationOffsets[crewIdx % 8]))
    const y = yOffsets[crewIdx % 8]
    const pieces = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const dist = 50 + Math.random() * 90
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        dr: (Math.random() - 0.5) * 540,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.12,
        round: i % 3 === 0,
      }
    })
    const id = Date.now() + Math.random()
    setExplosions(prev => [...prev, {
      id, x, y, pieces,
      color: SHIP_COLORS[member.shipColorIndex ?? 0],
      kind: member.shipKind ?? 'rocket',
      name: member.name,
    }])
    setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 1600)
  }

  const formatTime = (secs) => {
    if (secs == null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isHost = mission?.hostId === uid
  const isPaused = mission?.isPaused ?? false
  const progress = totalSeconds && timeLeft != null ? 1 - (timeLeft / totalSeconds) : 0
  progressRef.current = progress
  const focusingCrew = crew.filter(m => m.status === 'focusing')

  // Ships fly from left (~5%) to right (~85%) as progress advances;
  // each ship has a formation offset so they travel in a loose cluster.
  const formationOffsets = [0, -9, 9, -5, 5, -13, 13, -4]
  const yOffsets = [40, 20, 60, 30, 55, 15, 48, 25]
  const shipPositions = crew.map((_, i) => ({
    x: Math.min(88, Math.max(5, progress * 78 + 10 + (formationOffsets[i % formationOffsets.length]))),
    y: yOffsets[i % yOffsets.length],
  }))

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
            <div style={{ position: 'relative', height: 220, marginTop: 8, overflow: 'visible' }}>
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
                    className={`ship-bob-${idx % 4}`}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      textAlign: 'center',
                      transition: 'left 1.1s linear',
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

              {/* Explosions */}
              {explosions.map(exp => (
                <div key={exp.id} style={{ position: 'absolute', left: `${exp.x}%`, top: `${exp.y}%`, pointerEvents: 'none', zIndex: 30 }}>
                  {/* Shockwave ring */}
                  <div style={{
                    position: 'absolute', width: 56, height: 56, borderRadius: '50%',
                    border: `3px solid ${exp.color}`,
                    animation: 'exp-ring 0.55s ease-out forwards',
                  }} />
                  {/* Ship pop */}
                  <div style={{ position: 'absolute', animation: 'exp-ship 0.55s ease-out forwards' }}>
                    <SketchShip kind={exp.kind} size={46} color={exp.color} />
                  </div>
                  {/* Debris pieces */}
                  {exp.pieces.map(p => (
                    <div key={p.id} style={{
                      position: 'absolute',
                      width: p.size, height: p.size,
                      background: exp.color,
                      borderRadius: p.round ? '50%' : 2,
                      border: `1px solid ${ink}`,
                      '--dx': `${p.dx}px`,
                      '--dy': `${p.dy}px`,
                      '--dr': `${p.dr}deg`,
                      animation: `exp-debris 1.4s ease-out ${p.delay}s forwards`,
                    }} />
                  ))}
                  {/* Name label */}
                  <div style={{
                    position: 'absolute', left: '50%', top: 0,
                    fontFamily: hand, fontSize: 14, color: exp.color,
                    whiteSpace: 'nowrap', fontWeight: 700,
                    textShadow: `1px 1px 0 ${ink}`,
                    animation: 'exp-label 1.4s ease-out forwards',
                  }}>
                    {exp.name} 💥
                  </div>
                </div>
              ))}
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

              {/* Music cycle */}
              <button
                onClick={cycleTrack}
                style={{
                  padding: '8px 18px', fontFamily: hand, fontSize: 18,
                  border: `2px solid ${currentTrack !== 'none' ? 'oklch(0.62 0.14 260)' : ink}`,
                  borderRadius: 8,
                  background: currentTrack !== 'none' ? 'oklch(0.62 0.14 260)' : 'transparent',
                  color: currentTrack !== 'none' ? paper : ink,
                  cursor: 'pointer',
                  boxShadow: `2px 2px 0 ${ink}`,
                }}
              >
                {TRACK_LABEL[currentTrack]}
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

      {/* Toast notifications */}
      <div style={{
        position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none', alignItems: 'center',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'rgba(10,10,30,0.88)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#e8e2d2',
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 15,
            backdropFilter: 'blur(8px)',
            animation: 'toast-in 0.3s ease',
            whiteSpace: 'nowrap',
          }}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
