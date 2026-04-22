import { useEffect, useRef, useState } from 'react'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const muted = '#999'
const hand = "'Caveat', cursive"
const DURATION = 15
const MAX_TAPS = 60

export default function SpaceshipDash({ name, postToChat, onBack }) {
  const [running, setRunning]   = useState(false)
  const [done, setDone]         = useState(false)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [taps, setTaps]         = useState(0)
  const lastSideRef = useRef(null)
  const runRef      = useRef(false)
  const tapsRef     = useRef(0)

  function start() {
    setTaps(0); tapsRef.current = 0
    setTimeLeft(DURATION)
    setDone(false)
    lastSideRef.current = null
    setRunning(true)
    runRef.current = true
  }

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setRunning(false)
          runRef.current = false
          setDone(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (done) postToChat(`🚀 ${name} บิน ${tapsRef.current} ครั้งใน ${DURATION}s!`)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  function press(side) {
    if (!runRef.current || side === lastSideRef.current) return
    lastSideRef.current = side
    tapsRef.current += 1
    setTaps(t => t + 1)
  }

  // Keyboard support
  useEffect(() => {
    if (!running) return
    function onKey(e) {
      if (e.key === 'ArrowLeft')  press('L')
      if (e.key === 'ArrowRight') press('R')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.min(1, taps / MAX_TAPS)
  const shipBottom = 8 + progress * 68 // 8% to 76% from bottom

  // ── Start screen ─────────────────────────────────────────────────
  if (!running && !done) return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:22, color:ink }}>🚀 Spaceship Dash</div>
      <div style={{ fontFamily:hand, fontSize:14, color:muted }}>กดซ้าย/ขวาสลับกันให้เร็วที่สุด!<br/>15 วินาที · ใช้ปุ่ม ← → หรือแตะ</div>
      <button onClick={start} style={bigFill}>🚀 เริ่ม!</button>
      <button onClick={onBack} style={backBtn}>← กลับ</button>
    </div>
  )

  // ── Result screen ─────────────────────────────────────────────────
  if (done) return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:26, color:ink }}>🚀 {taps} ครั้ง!</div>
      <div style={{ fontFamily:hand, fontSize:15, color:muted }}>
        {taps >= 50 ? '🔥 เร็วมากเลย!' : taps >= 30 ? '👏 ไม่เลวนะ!' : '💪 ลองใหม่อีกรอบ!'}
        <br/>(โพสต์แชทแล้ว)
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={start} style={outlineBtn}>เล่นอีกรอบ</button>
        <button onClick={onBack} style={backBtn}>← กลับ</button>
      </div>
    </div>
  )

  // ── Game running ─────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'4px 0' }}>
      {/* HUD */}
      <div style={{ display:'flex', justifyContent:'space-between', width:'100%', padding:'0 8px', fontFamily:'monospace', fontSize:14, color:ink }}>
        <span>🚀 {taps}</span>
        <span style={{ color: timeLeft <= 5 ? '#c0392b' : ink, fontWeight:700 }}>{timeLeft}s</span>
      </div>

      {/* Track + ship */}
      <div style={{ position:'relative', width:60, height:130, border:`2px solid ${ink}`, borderRadius:30, background:'#06060f', overflow:'hidden' }}>
        {/* Track line */}
        <div style={{ position:'absolute', left:'50%', top:8, bottom:8, width:2, background:'rgba(255,255,255,0.1)', transform:'translateX(-50%)' }} />
        {/* Ship emoji */}
        <div style={{ position:'absolute', left:'50%', bottom:`${shipBottom}%`, transform:'translateX(-50%)', fontSize:22, transition:'bottom 0.08s ease-out', lineHeight:1 }}>🚀</div>
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', gap:12 }}>
        {['←','→'].map((label, i) => {
          const side = i === 0 ? 'L' : 'R'
          const active = lastSideRef.current === side
          return (
            <button
              key={side}
              onMouseDown={() => press(side)}
              onTouchStart={e => { e.preventDefault(); press(side) }}
              style={{
                width:70, height:70, fontSize:26, borderRadius:12,
                border:`2px solid ${ink}`,
                background: active ? ink : paper,
                color: active ? paper : ink,
                cursor:'pointer', userSelect:'none', WebkitUserSelect:'none',
                fontFamily:'monospace',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div style={{ fontFamily:hand, fontSize:12, color:muted }}>หรือกด ← → บนคีย์บอร์ด</div>
    </div>
  )
}

const center     = { display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'14px 0', textAlign:'center' }
const bigFill    = { padding:'8px 24px', fontFamily:hand, fontSize:20, border:`2px solid ${ink}`, borderRadius:8, background:ink, color:paper, cursor:'pointer' }
const outlineBtn = { padding:'5px 16px', fontFamily:hand, fontSize:16, border:`1.5px solid ${ink}`, borderRadius:8, background:'transparent', color:ink, cursor:'pointer' }
const backBtn    = { fontFamily:hand, fontSize:15, background:'none', border:'none', color:muted, cursor:'pointer' }
