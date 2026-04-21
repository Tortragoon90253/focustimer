import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import SketchShip, { SHIP_COLORS, SHIP_KINDS } from '../components/SketchShip'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"

const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

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

  const totalSessions = Math.max(...crew.map(m => m.sessionsCompleted ?? 0), 0)
  const totalMinutes = crew.reduce((s, m) => s + (m.totalFocusMinutes ?? 0), 0)
  const myData = crew.find(m => m.id === uid)
  const focusDuration = mission?.focusDuration ?? 25
  const breakDuration = mission?.breakDuration ?? 5

  const formatMinutes = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
    return `${mins}m`
  }

  // Build timeline blocks: [focus, break, focus, break, ..., focus]
  const timelineBlocks = []
  const totalTime = totalSessions * focusDuration + Math.max(0, totalSessions - 1) * breakDuration
  for (let i = 0; i < totalSessions; i++) {
    timelineBlocks.push({ type: 'focus', width: totalTime > 0 ? (focusDuration / totalTime) * 100 : 50 })
    if (i < totalSessions - 1) {
      timelineBlocks.push({ type: 'break', width: totalTime > 0 ? (breakDuration / totalTime) * 100 : 10 })
    }
  }
  if (timelineBlocks.length === 0) {
    timelineBlocks.push({ type: 'focus', width: 100 })
  }

  const statCards = [
    { n: formatMinutes(totalMinutes), l: 'เวลารวม' },
    { n: `${totalSessions}`, l: 'รอบสำเร็จ' },
    { n: `${crew.length}`, l: 'ยานรอดครบ' },
    { n: crew.length ? `${Math.round(totalMinutes / crew.length)}m` : '0m', l: 'เฉลี่ย/คน' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 900 }}>

        {/* Chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: paper, border: `2px solid ${ink}`,
          borderBottom: 'none', borderRadius: '10px 10px 0 0',
        }}>
          {[1,2,3].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: ink, opacity: 0.2 }} />)}
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>summary · {missionCode}</span>
        </div>

        <div style={{
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
          background: paper,
        }}>
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={labelTiny}>MISSION COMPLETE</div>
                <div style={{
                  fontFamily: hand, fontSize: 44, color: ink, lineHeight: 1.1, marginTop: 4,
                  borderBottom: `3px solid ${ink}`, paddingBottom: 2, display: 'inline-block',
                }}>
                  ภารกิจสำเร็จ! 🎉
                </div>
              </div>
              <div style={{
                padding: '8px 14px', background: '#ffd95e',
                border: `1.5px solid ${ink}`, borderRadius: 4,
                fontFamily: hand, fontSize: 16, color: ink,
                transform: 'rotate(1deg)',
                boxShadow: '2px 2px 0 rgba(0,0,0,0.12)',
                maxWidth: 180, textAlign: 'center',
              }}>
                {missionCode}
              </div>
            </div>

            {/* 4 stat boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {statCards.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: 14, textAlign: 'center',
                    border: `2px solid ${ink}`, borderRadius: 8,
                    background: i === 3 ? ink : 'transparent',
                    boxShadow: `2px 2px 0 ${ink}`,
                  }}
                >
                  <div style={{ fontFamily: 'monospace', fontSize: 30, color: i === 3 ? paper : ink }}>{s.n}</div>
                  <div style={{ ...labelTiny, color: i === 3 ? paper + 'cc' : muted, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Bottom 2-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

              {/* Left: fleet + timeline */}
              <div style={{ border: `2px solid ${ink}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <div style={labelTiny}>FLEET WHO MADE IT</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                    {crew.map((member, idx) => {
                      const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                      const kind = member.shipKind ?? SHIP_KINDS[idx % SHIP_KINDS.length]
                      const isMe = member.id === uid
                      return (
                        <div key={member.id} style={{ textAlign: 'center' }}>
                          <SketchShip kind={kind} size={48} color={color} />
                          <div style={{
                            fontFamily: hand, fontSize: 14, color: isMe ? ink : muted,
                            marginTop: 2, fontWeight: isMe ? 700 : 400,
                          }}>
                            {member.name}
                          </div>
                          <div style={{ ...labelTiny, fontSize: 10, marginTop: 1 }}>
                            {member.sessionsCompleted ?? 0}×
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Wavy divider */}
                <div style={{ borderTop: `1.5px dashed rgba(0,0,0,0.2)` }} />

                {/* Timeline */}
                <div>
                  <div style={labelTiny}>TIMELINE</div>
                  <div style={{
                    height: 48, marginTop: 8,
                    border: `1.5px dashed rgba(0,0,0,0.2)`,
                    borderRadius: 4, padding: 6,
                    position: 'relative', display: 'flex', overflow: 'hidden',
                  }}>
                    {timelineBlocks.map((block, i) => (
                      <div
                        key={i}
                        style={{
                          height: '100%',
                          width: `${block.width}%`,
                          background: block.type === 'focus'
                            ? 'oklch(0.62 0.14 260)'
                            : 'oklch(0.72 0.16 50)',
                          opacity: 0.45,
                          borderRight: i < timelineBlocks.length - 1 ? `2px solid ${ink}` : 'none',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ ...labelTiny, fontSize: 10 }}>focus {focusDuration}′</div>
                    {totalSessions > 1 && <div style={{ ...labelTiny, fontSize: 10 }}>break {breakDuration}′</div>}
                    <div style={{ ...labelTiny, fontSize: 10 }}>รวม {formatMinutes(totalMinutes / crew.length || 0)}/คน</div>
                  </div>
                </div>
              </div>

              {/* Right: achievement + buttons */}
              <div style={{
                border: `2px solid ${ink}`, borderRadius: 8, padding: 16,
                background: paper2,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={labelTiny}>WE EARNED</div>

                <div style={{ fontFamily: hand, fontSize: 24, color: ink, lineHeight: 1.2, marginTop: 4 }}>
                  🏅 ภารกิจสำเร็จ!<br />
                  <span style={{ fontSize: 16, color: muted }}>
                    {totalSessions > 0 ? `${totalSessions} รอบ · ${crew.length} ลำ` : 'ยอดเยี่ยม'}
                  </span>
                </div>

                {/* Team total */}
                <div style={{
                  padding: '8px 12px', background: '#ffd95e',
                  border: `1.5px solid ${ink}`, borderRadius: 4,
                  fontFamily: hand, fontSize: 14, color: ink,
                  transform: 'rotate(-0.8deg)',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.1)',
                }}>
                  ทีมโฟกัสรวม {formatMinutes(totalMinutes)} ครั้งนี้
                </div>

                <div style={{ flex: 1 }} />

                <button
                  onClick={() => navigate('/personal', { state: { uid } })}
                  style={{
                    padding: '12px', fontFamily: hand, fontSize: 20,
                    border: `2px solid ${ink}`, borderRadius: 8,
                    background: 'transparent', color: ink, cursor: 'pointer',
                    boxShadow: `3px 3px 0 ${ink}`,
                  }}
                >
                  📊 สถิติของฉัน
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '12px', fontFamily: hand, fontSize: 20,
                    border: `2px solid ${ink}`, borderRadius: 8,
                    background: ink, color: paper, cursor: 'pointer',
                    boxShadow: `3px 3px 0 oklch(0.62 0.14 260)`,
                  }}
                >
                  กลับ lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
