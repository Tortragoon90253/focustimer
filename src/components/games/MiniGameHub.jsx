import XOGame        from './XOGame'
import ReactionGame  from './ReactionGame'
import AsteroidGame  from './AsteroidGame'
import SpaceshipDash from './SpaceshipDash'
import { useState }  from 'react'

const ink  = '#1a1a1a'
const paper = '#faf6ee'
const muted = '#999'
const hand  = "'Caveat', cursive"

const GAMES = [
  { id:'xo',       emoji:'⭕', label:'เกม XO',        desc:'แข่งกับเพื่อน' },
  { id:'reaction', emoji:'🎯', label:'Reaction Race', desc:'แข่งความเร็ว' },
  { id:'asteroid', emoji:'☄️', label:'Asteroid Tap',  desc:'ยิงอุกกาบาต' },
  { id:'dash',     emoji:'🚀', label:'Spaceship Dash', desc:'กดให้เร็วที่สุด' },
]

export default function MiniGameHub({ missionCode, uid, crew, isHost, postToChat }) {
  const [game, setGame] = useState(null)

  const myName = crew.find(m => m.id === uid)?.name ?? 'นักบิน'
  const back   = () => setGame(null)
  const shared = { missionCode, uid, crew, isHost, onBack:back }

  if (game === 'xo')       return <XOGame        {...shared} />
  if (game === 'reaction') return <ReactionGame   {...shared} />
  if (game === 'asteroid') return <AsteroidGame   name={myName} postToChat={postToChat} onBack={back} />
  if (game === 'dash')     return <SpaceshipDash  name={myName} postToChat={postToChat} onBack={back} />

  // Selector
  return (
    <div style={{ padding:'10px 0' }}>
      <div style={{ fontFamily:hand, fontSize:18, color:ink, textAlign:'center', marginBottom:10 }}>🎮 เลือกเกม</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {GAMES.map(g => (
          <button key={g.id} onClick={() => setGame(g.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            padding:'10px 8px',
            fontFamily:hand, fontSize:15,
            border:`1.5px solid rgba(0,0,0,0.25)`, borderRadius:10,
            background:paper, color:ink, cursor:'pointer',
            boxShadow:`2px 2px 0 rgba(0,0,0,0.12)`,
          }}>
            <span style={{ fontSize:24 }}>{g.emoji}</span>
            <span style={{ fontWeight:600 }}>{g.label}</span>
            <span style={{ fontSize:12, color:muted }}>{g.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
