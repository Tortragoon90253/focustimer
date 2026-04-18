import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot, updateDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import StarField from '../components/StarField'
import Ship, { getShipColor } from '../components/Ship'

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function BreakScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)
  const [totalSeconds, setTotalSeconds] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setMission(data)
      if (data.status === 'active') {
        navigate(`/session/${missionCode}`, { state: { uid } })
      }
      if (data.status === 'ended') {
        navigate(`/stats/${missionCode}`, { state: { uid } })
      }
      if (data.timerEnd) {
        setTotalSeconds((data.breakDuration ?? 5) * 60)
      }
    })
    const unsubCrew = onSnapshot(collection(db, 'missions', missionCode, 'crew'), snap => {
      setCrew(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const chatQ = query(collection(db, 'missions', missionCode, 'chat'), orderBy('createdAt', 'asc'))
    const unsubChat = onSnapshot(chatQ, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubMission(); unsubCrew(); unsubChat() }
  }, [missionCode, uid, navigate])

  // Countdown
  useEffect(() => {
    if (!mission?.timerEnd) return
    const tick = () => {
      const end = mission.timerEnd.toDate ? mission.timerEnd.toDate() : new Date(mission.timerEnd)
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && mission?.hostId === uid) {
        handleBreakEnd()
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [mission?.timerEnd])

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleBreakEnd() {
    const focusEnd = new Date(Date.now() + (mission?.focusDuration ?? 25) * 60 * 1000)
    await updateDoc(doc(db, 'missions', missionCode), {
      status: 'active',
      timerEnd: focusEnd,
    })
    for (const member of crew) {
      await updateDoc(doc(db, 'missions', missionCode, 'crew', member.id), { status: 'focusing' })
    }
  }

  async function endMission() {
    await updateDoc(doc(db, 'missions', missionCode), { status: 'ended' })
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMsg.trim()) return
    const me = crew.find(m => m.id === uid)
    await addDoc(collection(db, 'missions', missionCode, 'chat'), {
      text: newMsg.trim(),
      authorId: uid,
      authorName: me?.name ?? 'Unknown',
      authorColorIndex: me?.shipColorIndex ?? 0,
      createdAt: serverTimestamp(),
    })
    setNewMsg('')
  }

  const formatTime = (secs) => {
    if (secs == null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progress = totalSeconds && timeLeft != null ? timeLeft / totalSeconds : 1
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)
  const myData = crew.find(m => m.id === uid)
  const isHost = mission?.hostId === uid

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: '#06060f' }}>
      <StarField count={60} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <span className="font-mono text-xs" style={{ color: '#6b7280' }}>MISSION / </span>
            <span className="font-mono text-xs font-bold" style={{ color: '#6cf5b4' }}>{missionCode}</span>
          </div>
          <div className="flex items-center gap-2 text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(108,245,180,0.1)', color: '#6cf5b4' }}>
            ☕ BREAK TIME
          </div>
        </div>

        {/* Main: timer left + chat sidebar right — V1 Chat sidebar */}
        <div className="flex-1 flex gap-0 overflow-hidden">

          {/* Left panel: break timer + crew ships */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-6">
            {/* Parked fleet */}
            <div className="flex items-end gap-5 justify-center flex-wrap">
              {crew.map((member, idx) => {
                const color = getShipColor(member.shipColorIndex ?? idx)
                const isMe = member.id === uid
                return (
                  <div key={member.id} className="flex flex-col items-center gap-1">
                    <Ship color={color} size={isMe ? 44 : 34} status="break" float={false} />
                    <div className="text-xs truncate max-w-[50px] text-center" style={{ color: isMe ? color : '#9ca3af' }}>
                      {member.name}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Break timer ring */}
            <div className="relative flex items-center justify-center">
              <svg width="108" height="108" className="timer-ring">
                <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                <circle
                  cx="54" cy="54" r={RADIUS}
                  fill="none"
                  stroke="#6cf5b4"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  style={{ filter: 'drop-shadow(0 0 6px #6cf5b4)' }}
                />
              </svg>
              <div className="absolute text-center">
                <div className="font-mono text-2xl font-bold" style={{ color: '#6cf5b4' }}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-xs" style={{ color: '#6b7280' }}>BREAK</div>
              </div>
            </div>

            {/* Sessions done */}
            <div className="text-center">
              <div className="text-xs mb-1" style={{ color: '#6b7280' }}>Session ที่ผ่านมา</div>
              <div className="font-mono text-xl font-bold" style={{ color: '#e8e2d2' }}>
                {myData?.sessionsCompleted ?? 0}
              </div>
            </div>

            {/* Host controls */}
            {isHost && (
              <div className="flex gap-3">
                <button
                  onClick={handleBreakEnd}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: '#6c8ef5', color: '#06060f' }}
                >
                  🚀 เริ่ม Focus ต่อ
                </button>
                <button
                  onClick={endMission}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(245,108,142,0.15)', color: '#f56c8e', border: '1px solid rgba(245,108,142,0.3)' }}
                >
                  จบภารกิจ
                </button>
              </div>
            )}
          </div>

          {/* Right: Chat sidebar */}
          <div
            className="w-72 flex flex-col border-l"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs font-semibold tracking-widest" style={{ color: '#6b7280' }}>CREW CHAT</div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-xs py-8" style={{ color: '#6b7280' }}>
                  ว่างๆ คุยกัน ☕
                </div>
              )}
              {messages.map(msg => {
                const color = getShipColor(msg.authorColorIndex ?? 0)
                const isMe = msg.authorId === uid
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs" style={{ color: '#6b7280' }}>{msg.authorName}</div>
                    <div
                      className="px-3 py-2 rounded-xl text-sm max-w-[90%] break-words"
                      style={{
                        background: isMe ? `${color}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isMe ? color + '33' : 'rgba(255,255,255,0.08)'}`,
                        color: '#e8e2d2',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  maxLength={200}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e8e2d2',
                  }}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: '#6cf5b4', color: '#06060f' }}
                >
                  ↑
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
