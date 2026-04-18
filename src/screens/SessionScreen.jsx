import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import StarField from '../components/StarField'
import Ship, { getShipColor } from '../components/Ship'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function SessionScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const [totalSeconds, setTotalSeconds] = useState(null)

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setMission(data)

      if (data.status === 'break') {
        navigate(`/break/${missionCode}`, { state: { uid } })
      }
      if (data.status === 'ended') {
        navigate(`/stats/${missionCode}`, { state: { uid } })
      }
      if (data.timerEnd) {
        const total = (data.focusDuration ?? 25) * 60
        setTotalSeconds(total)
      }
    })
    const unsubCrew = onSnapshot(collection(db, 'missions', missionCode, 'crew'), snap => {
      setCrew(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubMission(); unsubCrew() }
  }, [missionCode, uid, navigate])

  // Countdown timer
  useEffect(() => {
    if (!mission?.timerEnd) return
    const tick = () => {
      const end = mission.timerEnd.toDate ? mission.timerEnd.toDate() : new Date(mission.timerEnd)
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && mission?.hostId === uid) {
        handleTimerEnd()
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [mission?.timerEnd])

  const handleTimerEnd = useCallback(async () => {
    const breakEnd = new Date(Date.now() + (mission?.breakDuration ?? 5) * 60 * 1000)
    await updateDoc(doc(db, 'missions', missionCode), {
      status: 'break',
      timerEnd: breakEnd,
    })
    for (const member of crew) {
      await updateDoc(doc(db, 'missions', missionCode, 'crew', member.id), {
        status: 'break',
        sessionsCompleted: (member.sessionsCompleted ?? 0) + 1,
        totalFocusMinutes: (member.totalFocusMinutes ?? 0) + (mission?.focusDuration ?? 25),
      })
    }
  }, [mission, crew, missionCode])

  const formatTime = (secs) => {
    if (secs == null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progress = totalSeconds && timeLeft != null ? timeLeft / totalSeconds : 1
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const focusingCrew = crew.filter(m => m.status === 'focusing')
  const myData = crew.find(m => m.id === uid)

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: '#06060f' }}>
      <StarField count={120} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <span className="font-mono text-xs" style={{ color: '#6b7280' }}>MISSION / </span>
            <span className="font-mono text-xs font-bold" style={{ color: '#6c8ef5' }}>{missionCode}</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f56c8e' }} />
            LIVE · {focusingCrew.length} กำลัง focus
          </div>
        </div>

        {/* Fleet row — V1 Fleet horizontal */}
        <div className="px-6 py-4 overflow-x-auto">
          <div className="flex items-end gap-6 min-w-max mx-auto justify-center">
            {crew.map((member, idx) => {
              const color = getShipColor(member.shipColorIndex ?? idx)
              const isMe = member.id === uid
              const isFocusing = member.status === 'focusing'
              return (
                <div key={member.id} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    {isFocusing && (
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-mono font-bold"
                        style={{ color, whiteSpace: 'nowrap', fontSize: 10 }}
                      >
                        FOCUS
                      </div>
                    )}
                    <Ship
                      color={color}
                      size={isMe ? 52 : 42}
                      status={member.status}
                      float={isFocusing}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold truncate max-w-[60px]" style={{ color: isMe ? color : '#9ca3af' }}>
                      {member.name}
                    </div>
                    <div className="text-xs font-mono" style={{ color: '#6b7280' }}>
                      ×{member.sessionsCompleted ?? 0}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: timer */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          {/* Circular timer */}
          <div className="relative flex items-center justify-center">
            <svg width="140" height="140" className="timer-ring">
              <circle
                cx="70" cy="70" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="6"
              />
              <circle
                cx="70" cy="70" r={RADIUS}
                fill="none"
                stroke="#6c8ef5"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{ filter: 'drop-shadow(0 0 8px #6c8ef5)' }}
              />
            </svg>
            <div className="absolute text-center">
              <div className="font-mono text-4xl font-bold" style={{ color: '#e8e2d2' }}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#6b7280' }}>FOCUS SESSION</div>
            </div>
          </div>

          {/* My status card */}
          {myData && (
            <div
              className="px-6 py-3 rounded-2xl border text-center"
              style={{
                background: 'rgba(108,142,245,0.06)',
                borderColor: 'rgba(108,142,245,0.2)',
              }}
            >
              <div className="text-xs mb-1" style={{ color: '#6b7280' }}>สถานะของคุณ</div>
              <div className="text-sm font-semibold" style={{ color: '#6c8ef5' }}>
                🚀 กำลัง Focus — Session #{(myData.sessionsCompleted ?? 0) + 1}
              </div>
            </div>
          )}

          {/* Progress pills */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="w-8 h-2 rounded-full"
                style={{
                  background: i < (myData?.sessionsCompleted ?? 0)
                    ? '#6c8ef5'
                    : 'rgba(108,142,245,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  )
}
