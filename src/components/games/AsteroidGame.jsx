import { useEffect, useRef, useState } from 'react'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const muted = '#999'
const hand = "'Caveat', cursive"
const DURATION = 30

export default function AsteroidGame({ name, postToChat, onBack }) {
  const [running, setRunning]   = useState(false)
  const [done, setDone]         = useState(false)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [score, setScore]       = useState(0)
  const [asteroids, setAsteroids] = useState([])
  const nextId    = useRef(0)
  const runRef    = useRef(false)
  const scoreRef  = useRef(0)

  function spawnOne(fast) {
    const id  = nextId.current++
    const top  = 8 + Math.random() * 72
    const size = 28 + Math.random() * 26
    const dur  = fast ? (1.2 + Math.random() * 1) : (2.2 + Math.random() * 1.2)
    const rock = Math.random() < 0.55 ? '☄️' : '🪨'
    setAsteroids(prev => [...prev, { id, top, size, dur, rock }])
    setTimeout(() => setAsteroids(prev => prev.filter(a => a.id !== id)), (dur + 0.2) * 1000)
  }

  function start() {
    setScore(0); scoreRef.current = 0
    setAsteroids([])
    setTimeLeft(DURATION)
    setDone(false)
    setRunning(true)
    runRef.current = true
  }

  // Timer
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

  // Spawner — fast phase after 15s
  useEffect(() => {
    if (!running) return
    let cancelled = false
    let elapsed = 0
    function scheduleNext() {
      const delay = elapsed >= 15 ? 420 : 750
      setTimeout(() => {
        if (cancelled || !runRef.current) return
        spawnOne(elapsed >= 15)
        elapsed++
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => { cancelled = true }
  }, [running])

  // Post to chat when done
  useEffect(() => {
    if (done) postToChat(`☄️ ${name} ยิงได้ ${scoreRef.current} อุกกาบาต!`)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  function hit(id) {
    setAsteroids(prev => prev.filter(a => a.id !== id))
    scoreRef.current += 1
    setScore(s => s + 1)
  }

  // ── Start screen ─────────────────────────────────────────────────
  if (!running && !done) return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:22, color:ink }}>☄️ Asteroid Tap</div>
      <div style={{ fontFamily:hand, fontSize:14, color:muted }}>คลิก/แตะอุกกาบาตให้เร็วที่สุด!<br/>30 วินาที</div>
      <button onClick={start} style={bigFill}>🚀 เริ่ม!</button>
      <button onClick={onBack} style={backBtn}>← กลับ</button>
    </div>
  )

  // ── Result screen ─────────────────────────────────────────────────
  if (done) return (
    <div style={center}>
      <div style={{ fontFamily:hand, fontSize:26, color:ink }}>☄️ {score}</div>
      <div style={{ fontFamily:hand, fontSize:15, color:muted }}>อุกกาบาต! (โพสต์แชทแล้ว)</div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={start} style={outlineBtn}>เล่นอีกรอบ</button>
        <button onClick={onBack} style={backBtn}>← กลับ</button>
      </div>
    </div>
  )

  // ── Game running ─────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'2px 8px', fontFamily:'monospace', fontSize:14, color:ink }}>
        <span>☄️ {score}</span>
        <span style={{ color: timeLeft <= 10 ? '#c0392b' : ink }}>{timeLeft}s</span>
      </div>
      <div style={{ position:'relative', height:155, overflow:'hidden', background:'#06060f', borderRadius:8, border:`2px solid ${ink}` }}>
        {asteroids.map(a => (
          <span
            key={a.id}
            onClick={() => hit(a.id)}
            style={{
              position:'absolute', top:`${a.top}%`, right:'-10%',
              fontSize:a.size, lineHeight:1, cursor:'pointer', userSelect:'none',
              animation:`asteroid-fly ${a.dur}s linear forwards`,
            }}
          >
            {a.rock}
          </span>
        ))}
      </div>
      <div style={{ textAlign:'center', fontFamily:hand, fontSize:12, color:muted, marginTop:3 }}>แตะอุกกาบาตเพื่อยิง</div>
    </div>
  )
}

const center     = { display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'14px 0', textAlign:'center' }
const bigFill    = { padding:'8px 24px', fontFamily:hand, fontSize:20, border:`2px solid ${ink}`, borderRadius:8, background:ink, color:paper, cursor:'pointer' }
const outlineBtn = { padding:'5px 16px', fontFamily:hand, fontSize:16, border:`1.5px solid ${ink}`, borderRadius:8, background:'transparent', color:ink, cursor:'pointer' }
const backBtn    = { fontFamily:hand, fontSize:15, background:'none', border:'none', color:muted, cursor:'pointer' }
