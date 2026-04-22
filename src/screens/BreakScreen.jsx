import { loadUid } from '../utils/uid'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useWindowSize } from '../hooks/useWindowSize'
import { collection, doc, onSnapshot, updateDoc, addDoc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import SketchShip, { SHIP_COLORS, SHIP_KINDS } from '../components/SketchShip'
import MiniGameHub from '../components/games/MiniGameHub'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"

const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

export default function BreakScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = loadUid(location.state)

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)
  const [totalSeconds, setTotalSeconds] = useState(null)
  const [showGame, setShowGame] = useState(false)
  const chatEndRef = useRef(null)
  const breakEndFiredRef = useRef(false)

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setMission(data)
      if (data.status === 'active') navigate(`/session/${missionCode}`, { state: { uid } })
      if (data.status === 'ended') navigate(`/stats/${missionCode}`, { state: { uid } })
      if (data.timerEnd) setTotalSeconds((data.breakDuration ?? 5) * 60)
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

  useEffect(() => {
    if (!mission?.timerEnd) return
    breakEndFiredRef.current = false
    const tick = () => {
      const end = mission.timerEnd.toDate ? mission.timerEnd.toDate() : new Date(mission.timerEnd)
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && mission?.hostId === uid && !breakEndFiredRef.current) {
        breakEndFiredRef.current = true
        handleBreakEnd()
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [mission?.timerEnd])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleBreakEnd = useCallback(async () => {
    try {
      const focusEnd = new Date(Date.now() + (mission?.focusDuration ?? 25) * 60 * 1000)
      const batch = writeBatch(db)
      batch.update(doc(db, 'missions', missionCode), { status: 'active', timerEnd: focusEnd })
      for (const member of crew) {
        batch.update(doc(db, 'missions', missionCode, 'crew', member.id), { status: 'focusing' })
      }
      await batch.commit()
    } catch (err) {
      console.error('handleBreakEnd failed:', err)
      breakEndFiredRef.current = false
    }
  }, [mission, crew, missionCode])

  async function endMission() {
    try {
      await updateDoc(doc(db, 'missions', missionCode), { status: 'ended' })
    } catch (err) {
      console.error('endMission failed:', err)
    }
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

  const postToChat = useCallback(async (text) => {
    const me = crew.find(m => m.id === uid)
    await addDoc(collection(db, 'missions', missionCode, 'chat'), {
      text, authorId: uid,
      authorName: me?.name ?? 'System',
      authorColorIndex: me?.shipColorIndex ?? 0,
      createdAt: serverTimestamp(),
    })
  }, [uid, crew, missionCode])

  const formatTime = (secs) => {
    if (secs == null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const { isMobile } = useWindowSize()
  const isHost = mission?.hostId === uid
  const myData = crew.find(m => m.id === uid)

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? 12 : 24 }}>
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
            break · {formatTime(timeLeft)}
          </span>
        </div>

        {/* Main 2-column layout */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `4px 4px 0 ${ink}`,
          minHeight: isMobile ? 'auto' : 520,
        }}>

          {/* Left: timer + ships parked */}
          <div style={{
            padding: isMobile ? 16 : 28, background: paper,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, textAlign: 'center',
          }}>

            <div style={labelTiny}>PIT STOP · ยานจอดพัก</div>

            {/* Big timer */}
            <div style={{ fontFamily: 'monospace', fontSize: isMobile ? 60 : 84, lineHeight: 1, color: ink }}>
              {formatTime(timeLeft)}
            </div>

            {/* Game hub or ship parking */}
            {showGame
              ? (
                <div style={{ width: '100%', maxWidth: 360 }}>
                  <MiniGameHub
                    missionCode={missionCode}
                    uid={uid}
                    crew={crew}
                    isHost={isHost}
                    postToChat={postToChat}
                  />
                </div>
              )
              : (
                <>
                  {/* Ship parking pad */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 180, marginTop: 8 }}>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 44,
                      background: paper2, borderTop: `2px solid ${ink}`,
                      borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
                    }} />
                    {crew.map((member, idx) => {
                      const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                      const kind = member.shipKind ?? SHIP_KINDS[idx % SHIP_KINDS.length]
                      const isMe = member.id === uid
                      const spacing = Math.min(80, 320 / Math.max(crew.length, 1))
                      const startX = (360 - spacing * crew.length) / 2 + spacing * idx + spacing / 2 - 24
                      return (
                        <div key={member.id} style={{ position: 'absolute', bottom: 20, left: Math.max(10, Math.min(startX, 300)), textAlign: 'center' }}>
                          <SketchShip kind={kind} size={isMe ? 54 : 46} color={color} />
                          <div style={{ fontFamily: hand, fontSize: 13, color: isMe ? ink : muted, marginTop: 2 }}>{member.name}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Crew count chip */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', border: `1.5px solid oklch(0.70 0.14 150)`, borderRadius: 20, fontFamily: hand, fontSize: 16, color: 'oklch(0.70 0.14 150)', background: 'rgba(100,200,150,0.08)' }}>
                    {crew.length}/{crew.length} พักอยู่
                  </div>

                  {myData && (
                    <div style={{ fontFamily: hand, fontSize: 16, color: muted }}>
                      session ที่ผ่านมา: <span style={{ color: ink, fontWeight: 700 }}>{myData.sessionsCompleted ?? 0}</span>
                    </div>
                  )}
                </>
              )
            }

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {isHost && (
                <>
                  <button onClick={handleBreakEnd} style={{ padding: '10px 20px', fontFamily: hand, fontSize: 20, border: `2px solid ${ink}`, borderRadius: 8, background: ink, color: paper, cursor: 'pointer', boxShadow: `3px 3px 0 oklch(0.62 0.14 260)` }}>
                    พร้อมบินต่อ ✓
                  </button>
                  <button onClick={endMission} style={{ padding: '10px 20px', fontFamily: hand, fontSize: 20, border: `2px solid ${ink}`, borderRadius: 8, background: 'transparent', color: ink, cursor: 'pointer', boxShadow: `3px 3px 0 ${ink}` }}>
                    จบภารกิจ
                  </button>
                </>
              )}
              {!isHost && (
                <div style={{ fontFamily: hand, fontSize: 18, color: muted }}>รอ host เริ่มรอบต่อไป...</div>
              )}
              <button
                onClick={() => setShowGame(g => !g)}
                style={{ padding: '10px 20px', fontFamily: hand, fontSize: 20, border: `2px solid ${showGame ? 'oklch(0.62 0.14 260)' : ink}`, borderRadius: 8, background: showGame ? 'oklch(0.62 0.14 260)' : 'transparent', color: showGame ? paper : ink, cursor: 'pointer', boxShadow: `3px 3px 0 ${ink}` }}
              >
                {showGame ? '✕ ปิดเกม' : '🎮 เกม'}
              </button>
            </div>
          </div>

          {/* Right: chat sidebar */}
          <div style={{
            borderLeft: isMobile ? 'none' : `2px solid ${ink}`,
            borderTop: isMobile ? `2px solid ${ink}` : 'none',
            background: paper2,
            display: 'flex', flexDirection: 'column',
            minHeight: isMobile ? 320 : 'auto',
          }}>
            {/* Chat header */}
            <div style={{ padding: '12px 16px', borderBottom: `1.5px solid ${ink}` }}>
              <div style={{ fontFamily: hand, fontSize: 22, color: ink }}>💬 Crew chat</div>
              <div style={{ ...labelTiny, marginTop: 2 }}>เปิดตอน break เท่านั้น</div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: hand, fontSize: 18, color: muted }}>
                  ว่างๆ คุยกัน ☕
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.authorId === uid
                const color = SHIP_COLORS[msg.authorColorIndex ?? 0]
                return (
                  <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                    <div style={{ ...labelTiny, marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                      {msg.authorName}
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      border: `1.5px solid ${ink}`,
                      borderRadius: 8,
                      fontFamily: hand, fontSize: 18,
                      background: isMe ? 'oklch(0.62 0.14 260)' : paper,
                      color: isMe ? paper : ink,
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} style={{ padding: '10px 12px', borderTop: `1.5px solid ${ink}`, display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="พิมพ์อะไรหน่อย..."
                maxLength={200}
                style={{
                  flex: 1, padding: '8px 12px',
                  fontFamily: hand, fontSize: 18,
                  border: `2px dashed rgba(0,0,0,0.25)`,
                  borderRadius: 8, background: 'transparent',
                  color: ink, outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 16px', fontFamily: hand, fontSize: 18,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: ink, color: paper, cursor: 'pointer',
                }}
              >
                ส่ง
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
