import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '19910907'

const bg = '#06060f'
const surface = '#0e0e1e'
const surface2 = '#141428'
const border = 'rgba(255,255,255,0.12)'
const text = '#e8e2d2'
const muted = '#555'
const accent = 'oklch(0.62 0.14 260)'
const green = 'oklch(0.68 0.18 150)'
const red = '#c0392b'
const yellow = '#d4900a'

const STATUS_COLOR = {
  lobby:  yellow,
  active: green,
  break:  accent,
  ended:  muted,
}
const STATUS_LABEL = {
  lobby:  'Lobby',
  active: 'Active',
  break:  'Break',
  ended:  'Ended',
}
const STATUS_ICON = { lobby: '🟡', active: '🟢', break: '☕', ended: '⬛' }

function formatAge(ts) {
  if (!ts) return '—'
  const ms = Date.now() - (ts.toDate?.()?.getTime() ?? 0)
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function isStale(mission) {
  if (['ended'].includes(mission.status)) return false
  const created = mission.createdAt?.toDate?.()?.getTime() ?? Date.now()
  return Date.now() - created > 3 * 60 * 60 * 1000 // older than 3 hours
}

function Chip({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px', borderRadius: 12,
      fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
      border: `1px solid ${color}`,
      color, background: `${color}18`,
    }}>{label}</span>
  )
}

function ActionBtn({ onClick, color = muted, children, confirm }) {
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handle() {
    if (confirm && !confirming) { setConfirming(true); return }
    setPending(true)
    try { await onClick() } finally { setPending(false); setConfirming(false) }
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      style={{
        padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
        border: `1px solid ${confirming ? red : color}`,
        background: confirming ? `${red}22` : 'transparent',
        color: confirming ? red : color,
        opacity: pending ? 0.5 : 1,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {pending ? '…' : confirming ? 'ยืนยัน?' : children}
    </button>
  )
}

export default function AdminScreen() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('adminAuth') === '1')
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [bulkMsg, setBulkMsg] = useState('')

  function handleLogin(e) {
    e.preventDefault()
    if (username === ADMIN_USERNAME && pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', '1')
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    setAuthed(false)
    setMissions([])
    setLoading(true)
  }

  useEffect(() => {
    if (!authed) return
    const q = query(collection(db, 'missions'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('Admin query failed:', err)
      setLoading(false)
    })
    return unsub
  }, [authed])

  const forceEnd = useCallback(async (missionId) => {
    await updateDoc(doc(db, 'missions', missionId), { status: 'ended' })
  }, [])

  const deleteMission = useCallback(async (missionId) => {
    await deleteDoc(doc(db, 'missions', missionId))
  }, [])

  async function clearEnded() {
    const targets = missions.filter(m => m.status === 'ended')
    if (targets.length === 0) { setBulkMsg('ไม่มีห้องที่จบแล้ว'); setTimeout(() => setBulkMsg(''), 3000); return }
    const batch = writeBatch(db)
    targets.forEach(m => batch.delete(doc(db, 'missions', m.id)))
    await batch.commit()
    setBulkMsg(`ลบแล้ว ${targets.length} ห้อง`)
    setTimeout(() => setBulkMsg(''), 3000)
  }

  async function forceEndStale() {
    const targets = missions.filter(isStale)
    if (targets.length === 0) { setBulkMsg('ไม่มีห้องค้าง'); setTimeout(() => setBulkMsg(''), 3000); return }
    const batch = writeBatch(db)
    targets.forEach(m => batch.update(doc(db, 'missions', m.id), { status: 'ended' }))
    await batch.commit()
    setBulkMsg(`ปิดแล้ว ${targets.length} ห้องค้าง`)
    setTimeout(() => setBulkMsg(''), 3000)
  }

  const staleCount = missions.filter(isStale).length
  const endedCount = missions.filter(m => m.status === 'ended').length
  const activeCount = missions.filter(m => m.status === 'active').length
  const breakCount  = missions.filter(m => m.status === 'break').length
  const lobbyCount  = missions.filter(m => m.status === 'lobby').length

  const filtered = filter === 'all' ? missions : missions.filter(m => m.status === filter)

  const TABS = [
    { key: 'all',    label: `ทั้งหมด (${missions.length})` },
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'break',  label: `Break (${breakCount})` },
    { key: 'lobby',  label: `Lobby (${lobbyCount})` },
    { key: 'ended',  label: `Ended (${endedCount})` },
  ]

  // ─── Login gate ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', background: bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <form onSubmit={handleLogin} style={{
          background: surface, border: `1px solid ${border}`,
          borderRadius: 16, padding: 40, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ color: text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            🛸 Admin Panel
          </div>
          <div style={{ color: muted, fontSize: 13, marginBottom: 28 }}>
            FocusFleet Mission Control
          </div>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => { setUsername(e.target.value); setPwError(false) }}
            autoFocus
            autoComplete="username"
            style={{
              width: '100%', padding: '10px 14px',
              background: surface2, border: `1px solid ${pwError ? red : border}`,
              borderRadius: 8, color: text, fontSize: 15,
              outline: 'none', boxSizing: 'border-box', marginBottom: 10,
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false) }}
            autoComplete="current-password"
            style={{
              width: '100%', padding: '10px 14px',
              background: surface2, border: `1px solid ${pwError ? red : border}`,
              borderRadius: 8, color: text, fontSize: 15,
              outline: 'none', boxSizing: 'border-box', marginBottom: 8,
            }}
          />
          {pwError && (
            <div style={{ color: red, fontSize: 13, marginBottom: 10 }}>ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</div>
          )}

          <button type="submit" style={{
            width: '100%', padding: '10px 0', marginTop: 8,
            background: accent, border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            เข้าสู่ระบบ
          </button>

        </form>
      </div>
    )
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: 'Space Grotesk, sans-serif' }}>

      {/* Header */}
      <div style={{
        padding: '14px 28px', borderBottom: `1px solid ${border}`,
        background: surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700 }}>🛸 Admin Panel</span>
          <span style={{ color: muted, fontSize: 13, marginLeft: 14 }}>FocusFleet Mission Control</span>
        </div>
        <button onClick={handleLogout} style={{
          padding: '6px 16px', border: `1px solid ${border}`, borderRadius: 8,
          background: 'transparent', color: muted, fontSize: 13, cursor: 'pointer',
        }}>
          ออกจากระบบ
        </button>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'Total', value: missions.length, color: text },
            { label: 'Active', value: activeCount, color: green },
            { label: 'Break', value: breakCount, color: accent },
            { label: 'Lobby', value: lobbyCount, color: yellow },
            { label: 'Ended', value: endedCount, color: muted },
            { label: '⚠️ Stale (>3h)', value: staleCount, color: red },
          ].map(s => (
            <div key={s.label} style={{
              background: surface, border: `1px solid ${border}`, borderRadius: 10,
              padding: '12px 20px', minWidth: 110,
            }}>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bulk actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <ActionBtn onClick={forceEndStale} color={yellow} confirm>
            ⚠️ ปิดห้องค้าง ({staleCount})
          </ActionBtn>
          <ActionBtn onClick={clearEnded} color={red} confirm>
            🗑 ลบห้องที่จบแล้ว ({endedCount})
          </ActionBtn>
          {bulkMsg && (
            <span style={{ color: green, fontSize: 13 }}>✓ {bulkMsg}</span>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${border}`, paddingBottom: 0 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              padding: '8px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: filter === tab.key ? text : muted,
              borderBottom: filter === tab.key ? `2px solid ${accent}` : '2px solid transparent',
              fontFamily: 'Space Grotesk, sans-serif',
              transition: 'color 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Missions table */}
        {loading ? (
          <div style={{ color: muted, padding: 40, textAlign: 'center' }}>กำลังโหลด…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: muted, padding: 40, textAlign: 'center' }}>ไม่มีข้อมูล</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 100px 80px 100px 80px 1fr',
              gap: 12, padding: '6px 14px',
              color: muted, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <span>Code</span>
              <span>ชื่อภารกิจ</span>
              <span>Status</span>
              <span>อายุ</span>
              <span>Duration</span>
              <span>Rounds</span>
              <span>Actions</span>
            </div>

            {filtered.map(m => {
              const stale = isStale(m)
              return (
                <div key={m.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 100px 80px 100px 80px 1fr',
                  gap: 12, padding: '10px 14px',
                  background: stale ? `${yellow}08` : surface,
                  border: `1px solid ${stale ? `${yellow}30` : border}`,
                  borderRadius: 8, alignItems: 'center',
                }}>
                  {/* Code */}
                  <span style={{
                    fontFamily: 'Space Mono, monospace', fontSize: 12,
                    color: accent, letterSpacing: '0.05em',
                  }}>
                    {m.id}
                  </span>

                  {/* Name */}
                  <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.missionName ?? '—'}
                    {stale && <span style={{ color: yellow, fontSize: 11, marginLeft: 8 }}>⚠ ค้าง</span>}
                  </span>

                  {/* Status badge */}
                  <Chip
                    label={`${STATUS_ICON[m.status] ?? '?'} ${STATUS_LABEL[m.status] ?? m.status}`}
                    color={STATUS_COLOR[m.status] ?? muted}
                  />

                  {/* Age */}
                  <span style={{ color: muted, fontSize: 12 }}>{formatAge(m.createdAt)}</span>

                  {/* Duration */}
                  <span style={{ color: muted, fontSize: 12 }}>
                    {m.focusDuration ?? '?'}m / {m.breakDuration ?? 5}m
                  </span>

                  {/* Rounds */}
                  <span style={{ color: muted, fontSize: 12 }}>
                    {m.totalRounds ?? '∞'}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.status !== 'ended' && (
                      <ActionBtn onClick={() => forceEnd(m.id)} color={yellow} confirm>
                        จบภารกิจ
                      </ActionBtn>
                    )}
                    <ActionBtn onClick={() => deleteMission(m.id)} color={red} confirm>
                      ลบ
                    </ActionBtn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
