import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import SketchShip, { SHIP_COLORS } from '../components/SketchShip'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"

const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

const chip = {
  display: 'inline-flex', alignItems: 'center',
  padding: '2px 10px', borderRadius: 20,
  border: `1.5px solid ${ink}`, fontSize: 13,
  fontFamily: hand, color: ink, background: 'transparent',
}

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
    for (const member of crew) {
      await updateDoc(doc(db, 'missions', missionCode, 'crew', member.id), { status: 'focusing' })
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(missionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHost = mission?.hostId === uid

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
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>/lobby · {missionCode}</span>
        </div>

        {/* Main 2-column layout */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
        }}>

          {/* Left: Mission info */}
          <div style={{ padding: 28, background: paper, borderRight: `2px solid ${ink}`, display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <div style={{ fontFamily: hand, fontSize: 30, color: ink, borderBottom: `2px solid ${ink}`, paddingBottom: 4, display: 'inline-block' }}>
                Mission Briefing
              </div>
            </div>

            {/* Mission code */}
            <div style={{ padding: 16, border: `1.5px dashed rgba(0,0,0,0.25)`, borderRadius: 8, textAlign: 'center', background: 'rgba(100,130,245,0.06)' }}>
              <div style={labelTiny}>Mission Code</div>
              <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: 'oklch(0.62 0.14 260)', marginTop: 4 }}>
                {missionCode}
              </div>
              <button
                onClick={copyCode}
                style={{
                  marginTop: 8, padding: '4px 14px',
                  fontFamily: hand, fontSize: 16,
                  border: `1.5px solid ${copied ? 'oklch(0.70 0.14 150)' : ink}`,
                  borderRadius: 20, cursor: 'pointer',
                  background: copied ? 'rgba(100,220,160,0.12)' : 'transparent',
                  color: copied ? 'oklch(0.70 0.14 150)' : ink,
                }}
              >
                {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก Code'}
              </button>
            </div>

            {/* Config */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={labelTiny}>Mission Config</div>
              {[
                { label: 'Focus', value: `${mission?.focusDuration ?? 25} นาที`, color: 'oklch(0.62 0.14 260)' },
                { label: 'Break', value: `${mission?.breakDuration ?? 5} นาที`, color: 'oklch(0.70 0.14 150)' },
                { label: 'Crew', value: `${crew.length} นักบิน`, color: ink },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px dashed rgba(0,0,0,0.15)` }}>
                  <span style={{ fontFamily: hand, fontSize: 18, color: muted }}>{label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(100,130,245,0.08)', border: `1.5px solid rgba(100,130,245,0.2)` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.62 0.14 260)', animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ ...labelTiny, marginBottom: 0, letterSpacing: '0.1em' }}>AWAITING CREW</span>
            </div>

            {/* Action */}
            {isHost ? (
              <button
                onClick={startMission}
                disabled={crew.length < 1}
                style={{
                  padding: '14px', fontFamily: hand, fontSize: 22,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: ink, color: paper, cursor: 'pointer',
                  boxShadow: `3px 3px 0 oklch(0.62 0.14 260)`,
                  opacity: crew.length < 1 ? 0.4 : 1,
                }}
              >
                🚀 เริ่มภารกิจ
              </button>
            ) : (
              <div style={{ textAlign: 'center', fontFamily: hand, fontSize: 18, color: muted }}>
                รอ host เริ่มภารกิจ...
              </div>
            )}
          </div>

          {/* Right: Crew list */}
          <div style={{ padding: 28, background: paper2, display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: hand, fontSize: 24, color: ink }}>Crew Manifest</div>
              <span style={{ ...chip, background: crew.length > 0 ? 'rgba(100,220,160,0.15)' : 'transparent' }}>
                {crew.length} นักบิน
              </span>
            </div>

            {/* Crew rows */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crew.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0' }}>
                  <div style={{ fontSize: 36 }}>🛸</div>
                  <div style={{ fontFamily: hand, fontSize: 18, color: muted }}>รอนักบินเข้าร่วม...</div>
                </div>
              ) : (
                crew.map((member, idx) => {
                  const color = SHIP_COLORS[member.shipColorIndex ?? idx % SHIP_COLORS.length]
                  const kind = member.shipKind ?? 'rocket'
                  const isMe = member.id === uid
                  const isThisHost = member.id === mission?.hostId
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 12px',
                        border: `1.5px solid ${isMe ? ink : 'rgba(0,0,0,0.15)'}`,
                        borderRadius: 6,
                        background: isMe ? 'rgba(0,0,0,0.04)' : paper,
                      }}
                    >
                      <SketchShip kind={kind} size={40} color={color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: hand, fontSize: 20, color: ink }}>{member.name}</span>
                          {isMe && <span style={{ ...chip, fontSize: 12, padding: '1px 8px' }}>you</span>}
                          {isThisHost && <span style={{ ...chip, fontSize: 12, padding: '1px 8px', borderColor: 'oklch(0.72 0.16 50)', color: 'oklch(0.72 0.16 50)' }}>host</span>}
                        </div>
                        <div style={{ ...labelTiny, marginTop: 2 }}>พร้อมบิน</div>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.70 0.14 150)', flexShrink: 0 }} />
                    </div>
                  )
                })
              )}
            </div>

            {/* Invite hint */}
            <div style={{
              padding: '10px 14px', textAlign: 'center',
              border: `1.5px dashed rgba(0,0,0,0.2)`, borderRadius: 8,
              fontFamily: hand, fontSize: 16, color: muted,
            }}>
              แชร์ code{' '}
              <span style={{ fontFamily: 'monospace', color: 'oklch(0.62 0.14 260)', fontWeight: 700 }}>
                {missionCode}
              </span>{' '}
              ให้เพื่อนร่วมงานเข้าร่วม
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
