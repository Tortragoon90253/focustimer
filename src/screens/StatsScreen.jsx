import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import StarField from '../components/StarField'
import Ship, { getShipColor } from '../components/Ship'

export default function StatsScreen() {
  const { missionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const uid = location.state?.uid

  const [mission, setMission] = useState(null)
  const [crew, setCrew] = useState([])

  useEffect(() => {
    const unsubMission = onSnapshot(doc(db, 'missions', missionCode), snap => {
      if (snap.exists()) setMission(snap.data())
    })
    const unsubCrew = onSnapshot(collection(db, 'missions', missionCode, 'crew'), snap => {
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      members.sort((a, b) => (b.sessionsCompleted ?? 0) - (a.sessionsCompleted ?? 0))
      setCrew(members)
    })
    return () => { unsubMission(); unsubCrew() }
  }, [missionCode])

  const totalSessions = crew.reduce((s, m) => s + (m.sessionsCompleted ?? 0), 0)
  const totalMinutes = crew.reduce((s, m) => s + (m.totalFocusMinutes ?? 0), 0)
  const topPilot = crew[0]
  const myData = crew.find(m => m.id === uid)

  const statCards = [
    { label: 'Sessions รวม', value: totalSessions, icon: '🎯', color: '#6c8ef5' },
    { label: 'นาที Focus รวม', value: totalMinutes, icon: '⏱️', color: '#f5c46c' },
    { label: 'นักบินทั้งหมด', value: crew.length, icon: '🧑‍🚀', color: '#6cf5b4' },
    { label: 'เฉลี่ยต่อคน', value: crew.length ? Math.round(totalMinutes / crew.length) + ' min' : '0 min', icon: '📊', color: '#c46cf5' },
  ]

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: '#06060f' }}>
      <StarField count={100} />

      <div className="relative z-10 flex flex-col min-h-screen px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏁</div>
          <h1 className="font-mono text-2xl font-bold mb-1" style={{ color: '#e8e2d2' }}>
            Mission Complete
          </h1>
          <div className="font-mono text-xs" style={{ color: '#6c8ef5' }}>{missionCode}</div>
        </div>

        {/* Stats cards — V1 Stats + crew */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {statCards.map(card => (
            <div
              key={card.label}
              className="rounded-2xl border p-5 flex flex-col gap-2"
              style={{
                background: `rgba(${hexToRgbStr(card.color)}, 0.05)`,
                borderColor: `rgba(${hexToRgbStr(card.color)}, 0.2)`,
              }}
            >
              <div className="text-2xl">{card.icon}</div>
              <div className="font-mono text-2xl font-bold" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* My stats highlight */}
        {myData && (
          <div
            className="rounded-2xl border p-5 mb-6 flex items-center gap-5"
            style={{
              background: 'rgba(108,142,245,0.06)',
              borderColor: 'rgba(108,142,245,0.25)',
            }}
          >
            <Ship color={getShipColor(myData.shipColorIndex ?? 0)} size={52} status="done" float={false} />
            <div className="flex-1">
              <div className="text-xs mb-1" style={{ color: '#6b7280' }}>ผลของคุณ</div>
              <div className="font-semibold text-base mb-1" style={{ color: '#e8e2d2' }}>{myData.name}</div>
              <div className="flex gap-4 text-sm">
                <span style={{ color: '#6c8ef5' }}>
                  <span className="font-mono font-bold">{myData.sessionsCompleted ?? 0}</span>
                  <span className="text-xs ml-1" style={{ color: '#6b7280' }}>sessions</span>
                </span>
                <span style={{ color: '#f5c46c' }}>
                  <span className="font-mono font-bold">{myData.totalFocusMinutes ?? 0}</span>
                  <span className="text-xs ml-1" style={{ color: '#6b7280' }}>นาที</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Crew roster */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="text-xs mb-4 font-semibold tracking-widest" style={{ color: '#6b7280' }}>
            CREW RANKINGS
          </div>
          <div className="space-y-3">
            {crew.map((member, rank) => {
              const color = getShipColor(member.shipColorIndex ?? rank)
              const isMe = member.id === uid
              const isTop = rank === 0
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl"
                  style={{
                    background: isMe ? `rgba(${hexToRgbStr(color)}, 0.06)` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isMe ? color + '33' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  {/* Rank */}
                  <div className="font-mono text-sm w-6 text-center" style={{ color: isTop ? '#f5c46c' : '#6b7280' }}>
                    {isTop ? '👑' : `#${rank + 1}`}
                  </div>

                  <Ship color={color} size={32} status="done" float={false} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: '#e8e2d2' }}>{member.name}</span>
                      {isMe && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>you</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm font-bold" style={{ color }}>
                      {member.sessionsCompleted ?? 0}×
                    </div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      {member.totalFocusMinutes ?? 0} min
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="mt-8 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e2d2' }}
        >
          🏠 กลับหน้าหลัก
        </button>
      </div>
    </div>
  )
}

function hexToRgbStr(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
