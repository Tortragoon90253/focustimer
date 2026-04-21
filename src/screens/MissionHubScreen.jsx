import { saveUid } from '../utils/uid'
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import { doc, setDoc, getDoc, onSnapshot, query, collection, where, limit, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import SketchShip, { SHIP_COLORS } from '../components/SketchShip'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const paper2 = '#f0e8d5'
const bg = '#e8e2d2'
const muted = '#999'
const hand = "'Caveat', cursive"
const labelTiny = { fontSize: 11, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase' }

const FOCUS_PRESETS = [15, 25, 30, 45, 60]
const ROUND_OPTIONS = [null, 1, 2, 3, 4, 5]

function generateCode(words) {
  return words[Math.floor(Math.random() * words.length)] + '-' + Math.floor(Math.random() * 900 + 100)
}
const MISSION_WORDS = ['ORION', 'VEGA', 'NOVA', 'LYRA', 'CYGNUS', 'ATLAS', 'HYDRA', 'DRACO', 'AQUILA', 'LUPUS']
const TEAM_WORDS = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'ECHO', 'ZETA', 'THETA', 'OMEGA']

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', fontFamily: hand, fontSize: 16,
        border: `1.5px solid ${active ? ink : 'rgba(0,0,0,0.25)'}`,
        borderRadius: 20, cursor: 'pointer',
        background: active ? ink : 'transparent',
        color: active ? paper : muted,
        boxShadow: active ? `2px 2px 0 ${ink}` : 'none',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

export default function MissionHubScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const pilot = location.state ?? {}

  const [uid, setUid] = useState(null)
  const [teamCode, setTeamCode] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [openSessions, setOpenSessions] = useState([])

  // Create form
  const [missionName, setMissionName] = useState('')
  const [focusDuration, setFocusDuration] = useState(25)
  const [totalRounds, setTotalRounds] = useState(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Join by code
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Public lobby sessions
  const [publicSessions, setPublicSessions] = useState([])

  // Team panel
  const [teamPanel, setTeamPanel] = useState(null) // null | 'create' | 'join'
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamPassword, setNewTeamPassword] = useState('')
  const [joinTeamInput, setJoinTeamInput] = useState('')
  const [joinTeamStep, setJoinTeamStep] = useState('code') // 'code' | 'password'
  const [joinTeamPending, setJoinTeamPending] = useState(null) // { code, data }
  const [joinTeamPassword, setJoinTeamPassword] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamLoading, setTeamLoading] = useState(false)

  // Listen for all live sessions (lobby + active + break)
  useEffect(() => {
    if (!uid) return
    const q = query(
      collection(db, 'missions'),
      where('status', 'in', ['active', 'break']),
      limit(20)
    )
    const unsub = onSnapshot(q, snap => {
      const TWO_HOURS = 2 * 60 * 60 * 1000
      const sessions = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => {
          if (!s.createdAt) return true
          const t = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt)
          return Date.now() - t.getTime() < TWO_HOURS
        })
        .sort((a, b) => {
          const order = { active: 0, break: 1 }
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
          const ta = a.createdAt?.toDate?.() ?? new Date(0)
          const tb = b.createdAt?.toDate?.() ?? new Date(0)
          return tb - ta
        })
        .slice(0, 8)
      setPublicSessions(sessions)
    }, err => console.error('publicSessions snapshot error:', err))
    return () => unsub()
  }, [uid])

  const missionCodeRef = useRef(generateCode(MISSION_WORDS))

  // Sign in + load user profile on mount
  useEffect(() => {
    async function init() {
      const { user } = await signInAnonymously(auth)
      saveUid(user.uid)
      setUid(user.uid)

      // Write pilot profile (merge so we don't wipe cumulative stats)
      if (pilot.pilotName) {
        await setDoc(doc(db, 'users', user.uid), {
          name: pilot.pilotName,
          shipKind: pilot.shipKind ?? 'rocket',
          shipColorIndex: pilot.colorIndex ?? 0,
          sessionsCompleted: 0,
          totalFocusMinutes: 0,
        }, { merge: true })
      }

      // Load existing teamCode
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists() && snap.data().teamCode) {
        setTeamCode(snap.data().teamCode)
      }
    }
    init()
  }, [])

  // Load team doc
  useEffect(() => {
    if (!teamCode) { setTeamData(null); return }
    const unsub = onSnapshot(doc(db, 'teams', teamCode), snap => {
      if (snap.exists()) setTeamData(snap.data())
    })
    return () => unsub()
  }, [teamCode])

  // Listen for open team sessions
  useEffect(() => {
    if (!teamCode) { setOpenSessions([]); return }
    const q = query(collection(db, 'missions'), where('teamCode', '==', teamCode))
    const unsub = onSnapshot(q, snap => {
      setOpenSessions(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.status === 'lobby')
      )
    })
    return () => unsub()
  }, [teamCode])

  const pilotName = pilot.pilotName ?? 'นักบิน'
  const shipKind = pilot.shipKind ?? 'rocket'
  const colorIndex = pilot.colorIndex ?? 0
  const shipColor = SHIP_COLORS[colorIndex]

  async function joinMission(code, sessionStatus = 'lobby') {
    if (!uid) return
    await setDoc(doc(db, 'missions', code, 'crew', uid), {
      name: pilotName, shipKind, shipColorIndex: colorIndex,
      status: sessionStatus === 'lobby' ? 'ready' : 'focusing',
      sessionsCompleted: 0, totalFocusMinutes: 0,
      joinedAt: serverTimestamp(),
    })
    if (sessionStatus === 'active') navigate(`/session/${code}`, { state: { uid } })
    else if (sessionStatus === 'break') navigate(`/break/${code}`, { state: { uid } })
    else navigate(`/lobby/${code}`, { state: { uid } })
  }

  async function handleCreateSession() {
    if (!uid) return
    setCreateLoading(true); setCreateError('')
    try {
      const code = missionCodeRef.current
      await setDoc(doc(db, 'missions', code), {
        missionName: missionName.trim() || 'Focus Session',
        status: 'lobby', hostId: uid,
        createdAt: serverTimestamp(), timerEnd: null,
        focusDuration, breakDuration: 5,
        totalRounds: totalRounds ?? null,
        teamCode: teamCode ?? null,
      })
      await joinMission(code)
    } catch (e) {
      setCreateError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error(e)
    }
    setCreateLoading(false)
  }

  async function handleJoinByCode() {
    if (!uid || !joinCode.trim()) return
    setJoinLoading(true); setJoinError('')
    const code = joinCode.trim().toUpperCase()
    try {
      const snap = await getDoc(doc(db, 'missions', code))
      if (!snap.exists()) { setJoinError(`ไม่พบ Mission "${code}"`); setJoinLoading(false); return }
      if (snap.data().status === 'ended') { setJoinError('ภารกิจนี้จบไปแล้ว'); setJoinLoading(false); return }
      await joinMission(code)
    } catch (e) {
      setJoinError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error(e)
    }
    setJoinLoading(false)
  }

  async function handleCreateTeam() {
    if (!uid || !newTeamName.trim()) return setTeamError('ใส่ชื่อทีมด้วย')
    setTeamLoading(true); setTeamError('')
    try {
      const code = generateCode(TEAM_WORDS)
      const pw = newTeamPassword.trim()
      const teamDoc = { name: newTeamName.trim(), createdBy: uid, createdAt: serverTimestamp(), hasPassword: !!pw }
      if (pw) teamDoc.passwordHash = await hashPassword(pw)
      await setDoc(doc(db, 'teams', code), teamDoc)
      await setDoc(doc(db, 'users', uid), { teamCode: code }, { merge: true })
      setTeamCode(code)
      setTeamPanel(null)
      setNewTeamName('')
      setNewTeamPassword('')
    } catch (e) {
      setTeamError('เกิดข้อผิดพลาด')
    }
    setTeamLoading(false)
  }

  async function handleJoinTeam() {
    if (!uid || !joinTeamInput.trim()) return setTeamError('ใส่ Team Code ด้วย')
    setTeamLoading(true); setTeamError('')
    const code = joinTeamInput.trim().toUpperCase()
    try {
      const snap = await getDoc(doc(db, 'teams', code))
      if (!snap.exists()) { setTeamError(`ไม่พบทีม "${code}"`); setTeamLoading(false); return }
      const data = snap.data()

      if (data.hasPassword && joinTeamStep === 'code') {
        // Team is locked — ask for password
        setJoinTeamPending({ code, data })
        setJoinTeamStep('password')
        setTeamError('')
        setTeamLoading(false)
        return
      }

      if (data.hasPassword && joinTeamStep === 'password') {
        const hash = await hashPassword(joinTeamPassword.trim())
        if (hash !== data.passwordHash) {
          setTeamError('รหัสผ่านไม่ถูกต้อง')
          setTeamLoading(false)
          return
        }
      }

      await setDoc(doc(db, 'users', uid), { teamCode: code }, { merge: true })
      setTeamCode(code)
      setTeamPanel(null)
      setJoinTeamInput('')
      setJoinTeamPassword('')
      setJoinTeamStep('code')
      setJoinTeamPending(null)
    } catch (e) {
      setTeamError('เกิดข้อผิดพลาด')
    }
    setTeamLoading(false)
  }

  async function hashPassword(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function handleLeaveTeam() {
    if (!uid) return
    await setDoc(doc(db, 'users', uid), { teamCode: null }, { merge: true })
    setTeamCode(null); setTeamData(null); setOpenSessions([])
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 980 }}>

        {/* Chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', background: paper,
          border: `2px solid ${ink}`, borderBottom: 'none',
          borderRadius: '10px 10px 0 0',
        }}>
          {[1,2,3].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: ink, opacity: 0.2 }} />)}
          <span style={{ marginLeft: 8, fontSize: 13, fontFamily: hand, color: muted }}>mission hub</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SketchShip kind={shipKind} size={22} color={shipColor} />
            <span style={{ fontFamily: hand, fontSize: 14, color: muted }}>{pilotName}</span>
          </div>
        </div>

        {/* Main 2-column */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 380px',
          border: `2px solid ${ink}`, borderRadius: '0 0 10px 10px',
          overflow: 'hidden', boxShadow: `5px 5px 0 ${ink}`,
          minHeight: 560,
        }}>

          {/* ===== LEFT: Create session ===== */}
          <div style={{ padding: 28, background: paper, display: 'flex', flexDirection: 'column', gap: 20, borderRight: `2px solid ${ink}` }}>

            <div>
              <div style={labelTiny}>STEP 2 OF 2</div>
              <div style={{ fontFamily: hand, fontSize: 34, color: ink, borderBottom: `3px solid ${ink}`, paddingBottom: 2, display: 'inline-block', marginTop: 4 }}>
                สร้าง Session
              </div>
            </div>

            {/* Mission name */}
            <div>
              <div style={labelTiny}>ชื่อ Mission</div>
              <input
                type="text"
                value={missionName}
                onChange={e => setMissionName(e.target.value)}
                placeholder="เช่น Morning Sprint, Deep Work..."
                maxLength={40}
                style={{
                  marginTop: 6, width: '100%', padding: '8px 12px',
                  fontFamily: hand, fontSize: 20, color: ink,
                  border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                  background: 'transparent', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Focus duration */}
            <div>
              <div style={labelTiny}>เวลาโฟกัส (นาที)</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {FOCUS_PRESETS.map(p => (
                  <Chip key={p} label={`${p}′`} active={focusDuration === p} onClick={() => setFocusDuration(p)} />
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <div style={labelTiny}>จำนวนรอบ</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {ROUND_OPTIONS.map(r => (
                  <Chip
                    key={r ?? 'inf'}
                    label={r === null ? '∞ ไม่จำกัด' : `${r} รอบ`}
                    active={totalRounds === r}
                    onClick={() => setTotalRounds(r)}
                  />
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Summary preview */}
            <div style={{
              padding: '10px 14px', background: paper2,
              border: `1.5px dashed rgba(0,0,0,0.2)`, borderRadius: 8,
              fontFamily: hand, fontSize: 16, color: muted,
              lineHeight: 1.6,
            }}>
              📋 {missionName || 'Focus Session'} · {focusDuration}′ ×{' '}
              {totalRounds === null ? '∞' : totalRounds} รอบ
              {teamCode && teamData ? ` · 🏷 ${teamData.name}` : ''}
            </div>

            {createError && <div style={{ fontFamily: hand, fontSize: 16, color: 'oklch(0.72 0.14 0)' }}>{createError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '11px 16px', fontFamily: hand, fontSize: 18,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: 'transparent', color: ink, cursor: 'pointer',
                  boxShadow: `2px 2px 0 ${ink}`,
                }}
              >
                ← ย้อนกลับ
              </button>
              <button
                onClick={handleCreateSession}
                disabled={createLoading || !uid}
                style={{
                  flex: 1, padding: '11px 16px', fontFamily: hand, fontSize: 20,
                  border: `2px solid ${ink}`, borderRadius: 8,
                  background: ink, color: paper, cursor: 'pointer',
                  boxShadow: `3px 3px 0 oklch(0.62 0.14 260)`,
                  opacity: (createLoading || !uid) ? 0.6 : 1,
                }}
              >
                {createLoading ? 'กำลังสร้าง...' : '🚀 สร้าง Lobby'}
              </button>
            </div>
          </div>

          {/* ===== RIGHT: Join + Public Sessions + Team ===== */}
          <div style={{ padding: 28, background: paper2, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

            {/* Join by code */}
            <div>
              <div style={labelTiny}>เข้าร่วมด้วย Mission Code</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
                  placeholder="ORION-421"
                  style={{
                    flex: 1, padding: '8px 12px',
                    fontFamily: 'monospace', fontSize: 18,
                    border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                    background: 'transparent', color: ink, outline: 'none',
                    letterSpacing: '0.1em',
                  }}
                />
                <button
                  onClick={handleJoinByCode}
                  disabled={joinLoading || !uid}
                  style={{
                    padding: '8px 16px', fontFamily: hand, fontSize: 18,
                    border: `2px solid ${ink}`, borderRadius: 8,
                    background: ink, color: paper, cursor: 'pointer',
                    opacity: (joinLoading || !uid) ? 0.6 : 1,
                  }}
                >
                  {joinLoading ? '...' : 'เข้าร่วม'}
                </button>
              </div>
              {joinError && <div style={{ fontFamily: hand, fontSize: 15, color: 'oklch(0.72 0.14 0)', marginTop: 6 }}>{joinError}</div>}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1.5px dashed rgba(0,0,0,0.2)` }} />

            {/* Public lobby sessions */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={labelTiny}>Sessions เปิดอยู่ตอนนี้</div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: publicSessions.length > 0 ? 'oklch(0.70 0.14 150)' : muted,
                  boxShadow: publicSessions.length > 0 ? '0 0 6px oklch(0.70 0.14 150)' : 'none',
                }} />
              </div>

              {publicSessions.length === 0 ? (
                <div style={{
                  padding: '14px 0', textAlign: 'center',
                  fontFamily: hand, fontSize: 15, color: muted,
                }}>
                  ยังไม่มี session ที่เปิดอยู่ 🛸
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {publicSessions.map(s => {
                    const statusMeta = {
                      active: { label: '🟢 โฟกัส', color: 'oklch(0.70 0.14 150)' },
                      break:  { label: '☕ พัก',   color: 'oklch(0.72 0.16 50)'  },
                    }[s.status] ?? { label: s.status, color: muted }
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px',
                          border: `1.5px solid rgba(0,0,0,0.15)`, borderRadius: 8,
                          background: paper,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontFamily: hand, fontSize: 17, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.missionName || s.id}
                            </div>
                            <span style={{ fontFamily: hand, fontSize: 12, color: statusMeta.color, flexShrink: 0 }}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <div style={{ fontFamily: hand, fontSize: 12, color: muted, marginTop: 1 }}>
                            {s.focusDuration}′ × {s.totalRounds ?? '∞'} · <span style={{ fontFamily: 'monospace' }}>{s.id}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => joinMission(s.id, s.status)}
                          style={{
                            marginLeft: 8, flexShrink: 0,
                            padding: '5px 12px', fontFamily: hand, fontSize: 15,
                            border: `1.5px solid ${ink}`, borderRadius: 8,
                            background: ink, color: paper, cursor: 'pointer',
                          }}
                        >
                          เข้าร่วม
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1.5px dashed rgba(0,0,0,0.2)` }} />

            {/* Team section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={labelTiny}>ทีมของคุณ</div>

              {!teamCode ? (
                /* No team yet */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!teamPanel && (
                    <>
                      <div style={{ fontFamily: hand, fontSize: 16, color: muted }}>
                        สร้างหรือเข้าร่วมทีม เพื่อดู session ของทีม
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setTeamPanel('create'); setTeamError('') }}
                          style={{
                            flex: 1, padding: '9px 12px', fontFamily: hand, fontSize: 17,
                            border: `2px solid ${ink}`, borderRadius: 8,
                            background: ink, color: paper, cursor: 'pointer',
                            boxShadow: `2px 2px 0 oklch(0.62 0.14 260)`,
                          }}
                        >
                          + สร้างทีม
                        </button>
                        <button
                          onClick={() => { setTeamPanel('join'); setTeamError('') }}
                          style={{
                            flex: 1, padding: '9px 12px', fontFamily: hand, fontSize: 17,
                            border: `2px solid ${ink}`, borderRadius: 8,
                            background: 'transparent', color: ink, cursor: 'pointer',
                            boxShadow: `2px 2px 0 ${ink}`,
                          }}
                        >
                          เข้าร่วมทีม
                        </button>
                      </div>
                    </>
                  )}

                  {teamPanel === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontFamily: hand, fontSize: 16, color: ink }}>ชื่อทีม</div>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        placeholder="เช่น Product Team, Design Crew..."
                        maxLength={30}
                        style={{
                          padding: '8px 12px', fontFamily: hand, fontSize: 18,
                          border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                          background: 'transparent', color: ink, outline: 'none',
                        }}
                      />
                      <div style={{ fontFamily: hand, fontSize: 16, color: ink, marginTop: 2 }}>
                        รหัสผ่าน <span style={{ color: muted, fontSize: 14 }}>(ไม่บังคับ)</span>
                      </div>
                      <input
                        type="password"
                        value={newTeamPassword}
                        onChange={e => setNewTeamPassword(e.target.value)}
                        placeholder="ปล่อยว่างไว้ถ้าไม่ต้องการ"
                        maxLength={30}
                        style={{
                          padding: '8px 12px', fontFamily: hand, fontSize: 18,
                          border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                          background: 'transparent', color: ink, outline: 'none',
                        }}
                      />
                      {newTeamPassword.trim() && (
                        <div style={{ fontFamily: hand, fontSize: 13, color: 'oklch(0.70 0.14 150)' }}>
                          🔒 ต้องใส่รหัสผ่านก่อนเข้าร่วมทีม
                        </div>
                      )}
                      {teamError && <div style={{ fontFamily: hand, fontSize: 15, color: 'oklch(0.72 0.14 0)' }}>{teamError}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setTeamPanel(null); setNewTeamName(''); setNewTeamPassword(''); setTeamError('') }}
                          style={{ padding: '8px 14px', fontFamily: hand, fontSize: 16, border: `1.5px solid ${ink}`, borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={handleCreateTeam}
                          disabled={teamLoading}
                          style={{
                            flex: 1, padding: '8px 14px', fontFamily: hand, fontSize: 17,
                            border: `2px solid ${ink}`, borderRadius: 8,
                            background: ink, color: paper, cursor: 'pointer',
                            opacity: teamLoading ? 0.6 : 1,
                          }}
                        >
                          {teamLoading ? 'กำลังสร้าง...' : 'สร้างทีม'}
                        </button>
                      </div>
                    </div>
                  )}

                  {teamPanel === 'join' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {joinTeamStep === 'code' ? (
                        <>
                          <div style={{ fontFamily: hand, fontSize: 16, color: ink }}>Team Code</div>
                          <input
                            type="text"
                            value={joinTeamInput}
                            onChange={e => { setJoinTeamInput(e.target.value.toUpperCase()); setTeamError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleJoinTeam()}
                            placeholder="ALPHA-123"
                            style={{
                              padding: '8px 12px', fontFamily: 'monospace', fontSize: 18,
                              border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                              background: 'transparent', color: ink, outline: 'none',
                              letterSpacing: '0.1em',
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px',
                            border: `1.5px solid rgba(0,0,0,0.15)`, borderRadius: 8,
                            background: paper,
                          }}>
                            <span style={{ fontSize: 16 }}>🔒</span>
                            <div>
                              <div style={{ fontFamily: hand, fontSize: 17, color: ink }}>{joinTeamPending?.data?.name}</div>
                              <div style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>{joinTeamPending?.code}</div>
                            </div>
                          </div>
                          <div style={{ fontFamily: hand, fontSize: 16, color: ink }}>รหัสผ่านทีม</div>
                          <input
                            type="password"
                            value={joinTeamPassword}
                            onChange={e => { setJoinTeamPassword(e.target.value); setTeamError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleJoinTeam()}
                            placeholder="ใส่รหัสผ่าน..."
                            autoFocus
                            style={{
                              padding: '8px 12px', fontFamily: hand, fontSize: 18,
                              border: `2px dashed rgba(0,0,0,0.3)`, borderRadius: 8,
                              background: 'transparent', color: ink, outline: 'none',
                            }}
                          />
                        </>
                      )}
                      {teamError && <div style={{ fontFamily: hand, fontSize: 15, color: 'oklch(0.72 0.14 0)' }}>{teamError}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            if (joinTeamStep === 'password') {
                              setJoinTeamStep('code'); setJoinTeamPending(null); setJoinTeamPassword(''); setTeamError('')
                            } else {
                              setTeamPanel(null); setJoinTeamInput(''); setTeamError('')
                            }
                          }}
                          style={{ padding: '8px 14px', fontFamily: hand, fontSize: 16, border: `1.5px solid ${ink}`, borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
                        >
                          {joinTeamStep === 'password' ? '← ย้อนกลับ' : 'ยกเลิก'}
                        </button>
                        <button
                          onClick={handleJoinTeam}
                          disabled={teamLoading}
                          style={{
                            flex: 1, padding: '8px 14px', fontFamily: hand, fontSize: 17,
                            border: `2px solid ${ink}`, borderRadius: 8,
                            background: ink, color: paper, cursor: 'pointer',
                            opacity: teamLoading ? 0.6 : 1,
                          }}
                        >
                          {teamLoading ? '...' : joinTeamStep === 'code' ? 'ค้นหาทีม' : 'เข้าร่วม'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Has team */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

                  {/* Team badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: `1.5px solid oklch(0.62 0.14 260)`,
                    borderRadius: 8, background: 'rgba(100,130,245,0.06)',
                  }}>
                    <div>
                      <div style={{ fontFamily: hand, fontSize: 20, color: ink }}>{teamData?.name ?? '...'}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'oklch(0.62 0.14 260)', marginTop: 2 }}>
                        {teamCode}
                      </div>
                    </div>
                    <button
                      onClick={handleLeaveTeam}
                      style={{
                        padding: '4px 10px', fontFamily: hand, fontSize: 14,
                        border: `1px solid rgba(0,0,0,0.25)`, borderRadius: 20,
                        background: 'transparent', color: muted, cursor: 'pointer',
                      }}
                    >
                      ออก
                    </button>
                  </div>

                  {/* Open sessions */}
                  <div style={labelTiny}>Sessions ที่เปิดอยู่ในทีม</div>

                  {openSessions.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '24px 0', gap: 6,
                    }}>
                      <div style={{ fontSize: 28 }}>🛸</div>
                      <div style={{ fontFamily: hand, fontSize: 16, color: muted }}>ยังไม่มี session ที่เปิดอยู่</div>
                      <div style={{ fontFamily: hand, fontSize: 14, color: muted }}>สร้าง session ด้านซ้ายแล้วแชร์ให้ทีม</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {openSessions.map(s => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px',
                            border: `1.5px solid rgba(0,0,0,0.15)`, borderRadius: 8,
                            background: paper,
                          }}
                        >
                          <div>
                            <div style={{ fontFamily: hand, fontSize: 18, color: ink }}>{s.missionName || s.id}</div>
                            <div style={{ fontFamily: hand, fontSize: 13, color: muted, marginTop: 2 }}>
                              {s.focusDuration}′ ×{' '}{s.totalRounds ?? '∞'} รอบ
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!uid) return
                              await setDoc(doc(db, 'missions', s.id, 'crew', uid), {
                                name: pilotName, shipKind, shipColorIndex: colorIndex,
                                status: 'ready', sessionsCompleted: 0, totalFocusMinutes: 0,
                                joinedAt: serverTimestamp(),
                              })
                              navigate(`/lobby/${s.id}`, { state: { uid } })
                            }}
                            style={{
                              padding: '6px 14px', fontFamily: hand, fontSize: 16,
                              border: `1.5px solid ${ink}`, borderRadius: 8,
                              background: ink, color: paper, cursor: 'pointer',
                            }}
                          >
                            เข้าร่วม
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
