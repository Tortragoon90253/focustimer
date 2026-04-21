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

function formatMinutes(mins) {
  if (!mins) return '0m'
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

const MILESTONE_TARGET = 500 * 60 // 500h in minutes

export default function TeamScreen() {
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
      members.sort((a, b) => (b.totalFocusMinutes ?? 0) - (a.totalFocusMinutes ?? 0))
      setCrew(members)
    })
    return () => { unsubMission(); unsubCrew() }
  }, [missionCode])

  const totalMinutes = crew.reduce((s, m) => s + (m.totalFocusMinutes ?? 0), 0)
  const totalSessions = crew.reduce((s, m) => s + (m.sessionsCompleted ?? 0), 0)
  const avgMinutes = crew.length ? Math.round(totalMinutes / crew.length) : 0
  const topPilot = crew[0]

  const maxBar = Math.max(...crew.map(m => m.totalFocusMinutes ?? 0), 1)

  const milestoneProgress = Math.min(1, totalMinutes / MILESTONE_TARGET)
  const milestoneReached = totalMinutes >= MILESTONE_TARGET
  const sessionsGoal = 100
  const sessionsReached = totalSessions >= sessionsGoal

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 960 }}>

        {/* Chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: paper, border: `2px solid ${ink}`,
          borderBottom: 'none', borderRadius: '10px 10px 0 0',
        }}>
          {[1,2,3].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: ink, opacity: 0.2 }} />)}
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>team · {missionCode}</span>
        </div>

        <div style={{
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
          background: paper,
        }}>
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: hand, fontSize: 32, color: ink }}>ทีม · สถิติ</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 12px', borderRadius: 20,
                  border: `1.5px solid oklch(0.62 0.14 260)`,
                  fontFamily: hand, fontSize: 15,
                  color: 'oklch(0.62 0.14 260)',
                  background: 'rgba(100,130,245,0.06)',
                }}>
                  {crew.length} members
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 12px', borderRadius: 20,
                  border: `1.5px solid ${ink}`,
                  fontFamily: hand, fontSize: 15, color: ink,
                }}>
                  {missionCode}
                </div>
              </div>
            </div>

            {/* 4 stat boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { n: formatMinutes(totalMinutes), l: 'โฟกัสรวมทีม' },
                { n: `${totalSessions}`, l: 'sessions' },
                { n: formatMinutes(avgMinutes), l: 'เฉลี่ย/คน' },
                { n: topPilot?.name ?? '—', l: 'นักบินดีเด่น 🏆' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: 12, textAlign: 'center',
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: i === 3 ? ink : 'transparent',
                  boxShadow: `2px 2px 0 ${ink}`,
                }}>
                  <div style={{ ...labelTiny, color: i === 3 ? paper + 'aa' : muted }}>{s.l}</div>
                  <div style={{ fontFamily: hand, fontSize: 26, lineHeight: 1.1, marginTop: 4, color: i === 3 ? paper : ink }}>{s.n}</div>
                </div>
              ))}
            </div>

            {/* Bottom 2-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

              {/* Left: leaderboard table */}
              <div style={{ border: `2px solid ${ink}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={labelTiny}>LEADERBOARD</div>
                  <div style={{ fontFamily: hand, fontSize: 13, color: muted }}>เรียงตามเวลาโฟกัส</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: `1.5px solid ${ink}` }}>
                      {['#', 'นักบิน', 'โฟกัส', 'sessions'].map((h, i) => (
                        <th key={h} style={{
                          ...labelTiny,
                          padding: '4px 6px',
                          textAlign: i === 0 || i === 1 ? 'left' : 'right',
                          fontWeight: 'normal',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crew.map((member, idx) => {
                      const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                      const kind = member.shipKind ?? SHIP_KINDS[idx % SHIP_KINDS.length]
                      const isMe = member.id === uid
                      return (
                        <tr
                          key={member.id}
                          style={{
                            borderBottom: `1px dashed rgba(0,0,0,0.15)`,
                            background: isMe ? 'rgba(0,0,0,0.03)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '6px 6px', fontFamily: 'monospace', fontSize: 13, color: idx === 0 ? 'oklch(0.72 0.16 50)' : muted }}>
                            {idx === 0 ? '🏆' : idx + 1}
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <SketchShip kind={kind} size={22} color={color} />
                              <span style={{ fontFamily: hand, fontSize: 17, color: isMe ? ink : ink, fontWeight: isMe ? 700 : 400 }}>
                                {member.name}{isMe ? ' ✦' : ''}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>
                            {formatMinutes(member.totalFocusMinutes ?? 0)}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>
                            {member.sessionsCompleted ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                    {crew.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '16px 0', textAlign: 'center', fontFamily: hand, fontSize: 16, color: muted }}>
                          ยังไม่มีข้อมูล
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Bar chart: focus per crew member */}
                <div style={{ border: `2px solid ${ink}`, borderRadius: 8, padding: 14, flex: 1 }}>
                  <div style={labelTiny}>โฟกัส / นักบิน (mission นี้)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, marginTop: 12 }}>
                    {crew.map((member, idx) => {
                      const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                      const pct = maxBar > 0 ? ((member.totalFocusMinutes ?? 0) / maxBar) * 100 : 0
                      return (
                        <div key={member.id} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{
                            width: '100%', height: `${Math.max(pct, 4)}%`,
                            background: color, border: `2px solid ${ink}`,
                            borderRadius: '2px 2px 0 0',
                            boxShadow: `2px -2px 0 ${ink}`,
                          }} />
                          <div style={{ ...labelTiny, marginTop: 4, fontSize: 10, maxWidth: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.name}
                          </div>
                        </div>
                      )
                    })}
                    {crew.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: hand, fontSize: 15, color: muted }}>
                        รอข้อมูล...
                      </div>
                    )}
                  </div>
                </div>

                {/* Team milestones */}
                <div style={{
                  border: `2px solid ${ink}`, borderRadius: 8, padding: 14,
                  background: paper2,
                }}>
                  <div style={labelTiny}>TEAM MILESTONES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <div>
                      <div style={{ fontFamily: hand, fontSize: 17, color: ink }}>
                        🎯 500h รวม — {milestoneReached ? 'ถึงแล้ว! 🎉' : `เหลืออีก ${formatMinutes(MILESTONE_TARGET - totalMinutes)}`}
                      </div>
                      <div style={{
                        marginTop: 5, height: 10,
                        border: `1.5px solid ${ink}`, borderRadius: 5, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${milestoneProgress * 100}%`,
                          background: ink, borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: hand, fontSize: 17, color: ink }}>
                      🏆 {sessionsGoal} sessions — {sessionsReached ? 'ถึงแล้ว! 🎉' : `ได้ ${totalSessions}/${sessionsGoal}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 22px', fontFamily: hand, fontSize: 19,
                border: `2px solid ${ink}`, borderRadius: 8,
                background: 'transparent', color: ink, cursor: 'pointer',
                boxShadow: `2px 2px 0 ${ink}`,
              }}
            >
              ← กลับ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
