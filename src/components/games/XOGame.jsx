import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'

const ink = '#1a1a1a'
const paper = '#faf6ee'
const muted = '#999'
const hand = "'Caveat', cursive"
const accent = 'oklch(0.62 0.14 260)'
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const EMPTY = { type:'xo', board:Array(9).fill(null), playerX:null, playerO:null, turn:'X', winner:null }

function gameDoc(mc) { return doc(db, 'missions', mc, 'games', 'current') }

function detectWinner(board) {
  for (const [a,b,c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return board.every(Boolean) ? 'draw' : null
}

export default function XOGame({ missionCode, uid, crew, onBack }) {
  const [game, setGame] = useState(null)

  useEffect(() => onSnapshot(gameDoc(missionCode), snap => {
    setGame(snap.exists() && snap.data().type === 'xo' ? snap.data() : null)
  }), [missionCode])

  const mySymbol = game?.playerX === uid ? 'X' : game?.playerO === uid ? 'O' : null
  const nameOf = id => crew.find(m => m.id === id)?.name ?? '?'
  const winnerName = game?.winner && game.winner !== 'draw' ? nameOf(game.winner) : null

  function joinX() { if (!game?.playerX && !mySymbol) updateDoc(gameDoc(missionCode), { playerX: uid }) }
  function joinO() { if (!game?.playerO && !mySymbol) updateDoc(gameDoc(missionCode), { playerO: uid }) }
  function reset()  { setDoc(gameDoc(missionCode), EMPTY) }

  async function clickCell(i) {
    if (!game || game.winner || game.board[i] || game.turn !== mySymbol) return
    const board = [...game.board]
    board[i] = mySymbol
    const result = detectWinner(board)
    await updateDoc(gameDoc(missionCode), {
      board, turn: mySymbol === 'X' ? 'O' : 'X',
      winner: result === 'X' ? game.playerX : result === 'O' ? game.playerO : result ?? null,
    })
  }

  if (!game) return (
    <div style={{ textAlign:'center', padding:'16px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ fontFamily:hand, fontSize:22, color:ink }}>⭕ เกม XO</div>
      <button onClick={() => setDoc(gameDoc(missionCode), EMPTY)} style={fillBtn}>เริ่มเกม</button>
      <button onClick={onBack} style={backBtn}>← กลับ</button>
    </div>
  )

  const canJoinX = !game.playerX && !mySymbol
  const canJoinO = !game.playerO && !mySymbol

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'8px 0' }}>
      {/* Player slots */}
      <div style={{ display:'flex', gap:10 }}>
        <div onClick={canJoinX ? joinX : undefined} style={slot(!!game.playerX, ink, canJoinX)}>
          ✕ {game.playerX ? nameOf(game.playerX) : 'เล่นเป็น X'}
        </div>
        <div onClick={canJoinO ? joinO : undefined} style={slot(!!game.playerO, accent, canJoinO)}>
          ○ {game.playerO ? nameOf(game.playerO) : 'เล่นเป็น O'}
        </div>
      </div>

      {/* Status */}
      <div style={{ fontFamily:hand, fontSize:13, color:muted, minHeight:18 }}>
        {game.winner
          ? game.winner === 'draw' ? '🤝 เสมอ!' : `🏆 ${winnerName} ชนะ!`
          : mySymbol
            ? game.turn === mySymbol ? 'ตาของคุณ 👆' : `รอ ${game.turn==='X' ? nameOf(game.playerX) : nameOf(game.playerO)}...`
            : `ตาของ ${game.turn==='X' ? nameOf(game.playerX) : nameOf(game.playerO)}`
        }
      </div>

      {/* Board */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,62px)', gap:3 }}>
        {game.board.map((cell, i) => (
          <button key={i} onClick={() => clickCell(i)} style={{
            width:62, height:62, border:`2px solid ${ink}`, borderRadius:6,
            background:paper, fontSize:26, fontFamily:'monospace',
            color: cell==='X' ? ink : accent,
            cursor: !cell && !game.winner && game.turn===mySymbol ? 'pointer' : 'default',
          }}>
            {cell==='X' ? '✕' : cell==='O' ? '○' : ''}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button onClick={reset} style={outlineBtn}>เล่นใหม่</button>
        <button onClick={onBack} style={backBtn}>← กลับ</button>
      </div>
    </div>
  )
}

const fillBtn    = { padding:'8px 24px', fontFamily:hand, fontSize:20, border:`2px solid ${ink}`, borderRadius:8, background:ink, color:paper, cursor:'pointer' }
const outlineBtn = { padding:'5px 16px', fontFamily:hand, fontSize:16, border:`1.5px solid ${ink}`, borderRadius:8, background:'transparent', color:ink, cursor:'pointer' }
const backBtn    = { fontFamily:hand, fontSize:15, background:'none', border:'none', color:muted, cursor:'pointer' }
const slot = (filled, color, clickable) => ({
  padding:'4px 12px', borderRadius:8, fontFamily:hand, fontSize:15,
  border:`2px solid ${color}`,
  background: filled ? color : 'transparent',
  color: filled ? paper : color,
  cursor: clickable ? 'pointer' : 'default',
})
