import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import StarField from '../components/StarField'
import Ship, { getShipColor } from '../components/Ship'

export default function LobbyScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setMission(data)
      if (data.status === 'active') {
        navigate(`/session/${missionCode}`, { state: { uid } })
      }
    })
    const unsubCrew = onSnapshot(collection(db, 'missions', missionCode, 'crew'), snap => {
      setCrew(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubMission(); unsubCrew() }
  }, [missionCode, uid, navigate])

  async function startMission() {
    const endTime = new Date(Date.now() + (mission?.focusDuration ?? 25) * 60 * 1000)
    await updateDoc(doc(db, 'missions', missionCode), {
      status: 'active',
      timerEnd: endTime,
      startedAt: serverTimestamp(),
    })
    // Mark all crew as focusing
    for (const member of crew) {
      await updateDoc(doc(db, 'missions', missionCode, 'crew', member.id), {
        status: 'focusing',
      })
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(missionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHost = mission?.hostId === uid
  const readyCount = crew.filter(m => m.status === 'ready').length

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
      <StarField count={80} />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-mono text-xs mb-2" style={{ color: '#6b7280' }}>MISSION BRIEFING</div>
          <h1 className="font-mono text-3xl font-bold mb-3" style={{ color: '#e8e2d2' }}>
            {missionCode}
          </h1>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all"
            style={{
              background: copied ? 'rgba(108,245,180,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${copied ? 'rgba(108,245,180,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: copied ? '#6cf5b4' : '#9ca3af',
            }}
          >
            {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก Code'}
          </button>
        </div>

        {/* Two-panel layout: V1 Create+list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Mission settings */}
          <div
            className="md:col-span-1 rounded-2xl border p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <div className="text-xs mb-3 font-semibold tracking-widest" style={{ color: '#6b7280' }}>MISSION CONFIG</div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Focus</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#6c8ef5' }}>
                    {mission?.focusDuration ?? 25} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Break</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#6cf5b4' }}>
                    {mission?.breakDuration ?? 5} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Crew</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#e8e2d2' }}>
                    {crew.length} นักบิน
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* Status */}
            <div>
              <div className="text-xs mb-2 font-semibold tracking-widest" style={{ color: '#6b7280' }}>STATUS</div>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                style={{ background: 'rgba(108,142,245,0.1)', color: '#6c8ef5' }}
              >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#6c8ef5' }} />
                AWAITING CREW
              </div>
            </div>

            {/* Start button (host only) */}
            {isHost && (
              <button
                onClick={startMission}
                disabled={crew.length < 1}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#6c8ef5', color: '#06060f' }}
              >
                🚀 เริ่มภารกิจ
              </button>
            )}
            {!isHost && (
              <div className="text-center text-xs" style={{ color: '#6b7280' }}>
                รอ host เริ่มภารกิจ...
              </div>
            )}
          </div>

          {/* Right: Crew list */}
          <div
            className="md:col-span-2 rounded-2xl border p-6"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="text-xs mb-4 font-semibold tracking-widest" style={{ color: '#6b7280' }}>
              CREW MANIFEST — {crew.length} นักบิน
            </div>

            {crew.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="text-4xl">🛸</div>
                <p className="text-sm" style={{ color: '#6b7280' }}>รอนักบินเข้าร่วม...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crew.map((member, idx) => {
                  const color = getShipColor(member.shipColorIndex ?? idx)
                  const isMe = member.id === uid
                  const isThisHost = member.id === mission?.hostId
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: isMe ? `rgba(${hexToRgb(color)}, 0.08)` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isMe ? color + '33' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <Ship color={color} size={36} status="ready" float={false} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate" style={{ color: '#e8e2d2' }}>
                            {member.name}
                          </span>
                          {isMe && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>you</span>
                          )}
                          {isThisHost && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,196,108,0.15)', color: '#f5c46c' }}>host</span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>พร้อมบิน</div>
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{ background: '#6cf5b4' }} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Invite hint */}
            <div
              className="mt-6 p-3 rounded-xl text-center text-xs"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: '#6b7280' }}
            >
              แชร์ code <span className="font-mono" style={{ color: '#6c8ef5' }}>{missionCode}</span> ให้เพื่อนร่วมงานเข้าร่วม
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
