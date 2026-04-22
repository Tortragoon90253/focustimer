import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const muted = '#999'
const hand = "'Caveat', cursive"
const green = 'oklch(0.60 0.18 150)'
const red = '#c0392b'
const EMPTY = { type:'reaction', phase:'idle', goAt:null, reactions:{}, startedBy:null }

function gameDoc(mc) { return doc(db, 'missions', mc, 'games', 'current') }

export default function ReactionGame({ missionCode, uid, crew, isHost, onBack }) {
  const [game, setGame]     = useState(null)
  const [reacted, setReacted] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => onSnapshot(gameDoc(missionCode), snap => {
    setGame(snap.exists() && snap.data().type === 'reaction' ? snap.data() : null)
  }), [missionCode])

  // Reset reacted flag when new round starts
  useEffect(() => {
    if (game?.phase === 'waiting') setReacted(false)
  }, [game?.phase])

  // Host: fire 'go' after random delay when phase becomes 'waiting'
  useEffect(() => {
    if (game?.phase !== 'waiting' || game?.startedBy !== uid) return
    const delay = 1200 + Math.random() * 3800
    timeoutRef.current = setTimeout(async () => {
      await updateDoc(gameDoc(missionCode), { phase:'go', goAt: serverTimestamp() })
    }, delay)
    return () => clearTimeout(timeoutRef.current)
  }, [game?.phase, game?.startedBy, missionCode, uid])

  // Host: move to result after 3s
  useEffect(() => {
    if (game?.phase !== 'go' || game?.startedBy !== uid) return
    const t = setTimeout(() => updateDoc(gameDoc(missionCode), { phase:'result' }), 3000)
    return () => clearTimeout(t)
  }, [game?.phase, game?.startedBy, missionCode, uid])

  async function startRace() {
    setReacted(false)
    await setDoc(gameDoc(missionCode), { ...EMPTY, phase:'waiting', startedBy:uid })
  }

  async function tapReact() {
    if (!game || game.phase !== 'go' || reacted) return
    const goAt = game.goAt?.toDate?.()?.getTime() ?? Date.now()
    const ms = Math.max(1, Date.now() - goAt)
    setReacted(true)
    await updateDoc(gameDoc(missionCode), { [`reactions.${uid}`]: ms })
  }

  const nameOf = id => crew.find(m => m.id === id)?.name ?? '?'
  const results = game?.phase === 'result'
    ? Object.entries(game.reactions ?? {}).sort(([,a],[,b]) => a - b)
    : []

  const phase = game?.phase ?? 'idle'

  // ── Idle / no game ──────────────────────────────────────────────
  if (phase === 'idle' || !game) return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:22, color:ink }}>🎯 Reaction Race</div>
      <div style={{ fontFamily:hand, fontSize:14, color:muted }}>สัญญาณเขียว = กดให้เร็วที่สุด!</div>
      {isHost
        ? <button onClick={startRace} style={bigFill}>🎯 GO!</button>
        : <div style={{ fontFamily:hand, fontSize:16, color:muted }}>รอ Host เริ่ม...</div>
      }
      <button onClick={onBack} style={backBtn}>← กลับ</button>
    </div>
  )

  // ── Waiting (red light) ─────────────────────────────────────────
  if (phase === 'waiting') return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:20, color:red }}>🔴 เตรียมตัว...</div>
      <div style={{ width:100, height:100, borderRadius:'50%', background:red, boxShadow:`0 0 28px ${red}88` }} />
      <div style={{ fontFamily:hand, fontSize:16, color:muted }}>อย่าเพิ่งกด!</div>
    </div>
  )

  // ── Go (green light) ────────────────────────────────────────────
  if (phase === 'go') return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:20, color:green }}>🟢 กดเลย!!</div>
      <button onClick={tapReact} disabled={reacted} style={{
        width:120, height:120, borderRadius:'50%', border:'none', cursor: reacted ? 'default' : 'pointer',
        background: reacted ? muted : green, fontSize:36,
        boxShadow: reacted ? 'none' : `0 0 32px ${green}99`,
        transition:'background 0.2s',
      }}>
        {reacted ? '✓' : '🖐️'}
      </button>
      {reacted && <div style={{ fontFamily:hand, fontSize:15, color:muted }}>รอผล...</div>}
    </div>
  )

  // ── Result ──────────────────────────────────────────────────────
  const medal = ['🥇','🥈','🥉']
  const reacted_ids = new Set(results.map(([id]) => id))
  return (
    <div style={{ padding:'10px 16px' }}>
      <div style={{ fontFamily:hand, fontSize:20, color:ink, textAlign:'center', marginBottom:8 }}>🏆 ผลการแข่ง</div>
      {results.map(([id, ms], i) => (
        <div key={id} style={{ display:'flex', justifyContent:'space-between', padding:'3px 8px', fontFamily:hand, fontSize:17, color: i===0 ? ink : muted }}>
          <span>{medal[i] ?? '  '} {nameOf(id)}</span>
          <span>{ms} ms</span>
        </div>
      ))}
      {crew.filter(m => !reacted_ids.has(m.id)).map(m => (
        <div key={m.id} style={{ display:'flex', justifyContent:'space-between', padding:'3px 8px', fontFamily:hand, fontSize:17, color:muted }}>
          <span>— {m.name}</span><span>หมดเวลา</span>
        </div>
      ))}
      <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:10 }}>
        {isHost && <button onClick={startRace} style={outlineBtn}>เล่นอีกรอบ</button>}
        <button onClick={onBack} style={backBtn}>← กลับ</button>
      </div>
    </div>
  )
}

const center    = { display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'12px 0', textAlign:'center' }
const bigFill   = { padding:'10px 28px', fontFamily:hand, fontSize:22, border:`2px solid ${ink}`, borderRadius:10, background:ink, color:paper, cursor:'pointer' }
const outlineBtn = { padding:'5px 16px', fontFamily:hand, fontSize:16, border:`1.5px solid ${ink}`, borderRadius:8, background:'transparent', color:ink, cursor:'pointer' }
const backBtn   = { fontFamily:hand, fontSize:15, background:'none', border:'none', color:muted, cursor:'pointer' }
