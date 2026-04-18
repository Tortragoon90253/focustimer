import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import StarField from '../components/StarField'
import Ship, { getShipColor } from '../components/Ship'

const SHIP_COLORS_LIST = Array.from({ length: 8 }, (_, i) => getShipColor(i))

function generateMissionCode() {
  const words = ['ORION', 'VEGA', 'NOVA', 'LYRA', 'CYGNUS', 'ATLAS', 'HYDRA', 'DRACO', 'AQUILA', 'LUPUS']
  const nums = Math.floor(Math.random() * 900 + 100)
  return words[Math.floor(Math.random() * words.length)] + '-' + nums
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // null | 'create' | 'join'
  const [pilotName, setPilotName] = useState('')
  const [shipColorIndex, setShipColorIndex] = useState(0)
  const [missionCode, setMissionCode] = useState('')
  const [generatedCode] = useState(generateMissionCode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!pilotName.trim()) return setError('ใส่ชื่อนักบินด้วย')
    setLoading(true)
    setError('')
    try {
      const { user } = await signInAnonymously(auth)
      const missionRef = doc(db, 'missions', generatedCode)
      await setDoc(missionRef, {
        status: 'lobby',
        hostId: user.uid,
        createdAt: serverTimestamp(),
        timerEnd: null,
        focusDuration: 25,
        breakDuration: 5,
      })
      await setDoc(doc(db, 'missions', generatedCode, 'crew', user.uid), {
        name: pilotName.trim(),
        shipColorIndex,
        status: 'ready',
        sessionsCompleted: 0,
        totalFocusMinutes: 0,
        joinedAt: serverTimestamp(),
      })
      navigate(`/lobby/${generatedCode}`, { state: { uid: user.uid } })
    } catch (e) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error(e)
    }
    setLoading(false)
  }

  async function handleJoin() {
    if (!pilotName.trim()) return setError('ใส่ชื่อนักบินด้วย')
    if (!missionCode.trim()) return setError('ใส่ Mission Code ด้วย')
    setLoading(true)
    setError('')
    const code = missionCode.trim().toUpperCase()
    try {
      const missionSnap = await getDoc(doc(db, 'missions', code))
      if (!missionSnap.exists()) return setError(`ไม่พบ Mission "${code}"`)
      if (missionSnap.data().status === 'ended') return setError('ภารกิจนี้จบไปแล้ว')

      const { user } = await signInAnonymously(auth)
      await setDoc(doc(db, 'missions', code, 'crew', user.uid), {
        name: pilotName.trim(),
        shipColorIndex,
        status: 'ready',
        sessionsCompleted: 0,
        totalFocusMinutes: 0,
        joinedAt: serverTimestamp(),
      })
      navigate(`/lobby/${code}`, { state: { uid: user.uid } })
    } catch (e) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
      <StarField count={100} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-mono text-5xl font-bold tracking-tight mb-2" style={{ color: '#e8e2d2' }}>
            focus<span style={{ color: '#6c8ef5' }}>fleet</span>
          </h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>Focus together. Fly together.</p>
        </div>

        {/* Mode selector — V3 Builder style: two big cards */}
        {!mode && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('create')}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl border transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'rgba(108,142,245,0.06)',
                borderColor: 'rgba(108,142,245,0.25)',
              }}
            >
              <div className="relative">
                <Ship color="#6c8ef5" size={56} status="focusing" float={false} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-base mb-1" style={{ color: '#e8e2d2' }}>สร้าง Mission</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>เปิดห้องให้ทีมเข้าร่วม</div>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl border transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'rgba(246,196,108,0.06)',
                borderColor: 'rgba(246,196,108,0.25)',
              }}
            >
              <div className="relative">
                <Ship color="#f5c46c" size={56} status="focusing" float={false} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-base mb-1" style={{ color: '#e8e2d2' }}>เข้าร่วม Mission</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>ใส่ Code เพื่อบิน</div>
              </div>
            </button>
          </div>
        )}

        {/* Create form */}
        {mode === 'create' && (
          <div
            className="rounded-2xl border p-8 space-y-6"
            style={{ background: 'rgba(108,142,245,0.04)', borderColor: 'rgba(108,142,245,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => { setMode(null); setError('') }} className="text-gray-500 hover:text-gray-300 transition-colors text-sm">← กลับ</button>
              <h2 className="font-semibold text-lg" style={{ color: '#e8e2d2' }}>สร้าง Mission ใหม่</h2>
            </div>

            {/* Mission code preview */}
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(108,142,245,0.1)', border: '1px solid rgba(108,142,245,0.3)' }}>
              <div className="text-xs mb-1" style={{ color: '#6b7280' }}>Mission Code</div>
              <div className="font-mono text-2xl font-bold" style={{ color: '#6c8ef5' }}>{generatedCode}</div>
              <div className="text-xs mt-1" style={{ color: '#6b7280' }}>แชร์ code นี้ให้ทีม</div>
            </div>

            {/* Pilot name */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#9ca3af' }}>ชื่อนักบิน</label>
              <input
                type="text"
                value={pilotName}
                onChange={e => setPilotName(e.target.value)}
                placeholder="เช่น Zara, Kai, Max..."
                maxLength={20}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8e2d2',
                }}
              />
            </div>

            {/* Ship color */}
            <div>
              <label className="block text-sm mb-3" style={{ color: '#9ca3af' }}>เลือกสียาน</label>
              <div className="flex gap-3 flex-wrap">
                {SHIP_COLORS_LIST.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setShipColorIndex(i)}
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: 28, height: 28,
                      background: c,
                      outline: shipColorIndex === i ? `2px solid ${c}` : '2px solid transparent',
                      outlineOffset: 3,
                      opacity: shipColorIndex === i ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-center">
                <Ship color={getShipColor(shipColorIndex)} size={40} status="focusing" float={false} />
              </div>
            </div>

            {error && <p className="text-sm text-center" style={{ color: '#f56c8e' }}>{error}</p>}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#6c8ef5', color: '#06060f' }}
            >
              {loading ? 'กำลังสร้าง...' : '🚀 เปิด Mission'}
            </button>
          </div>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <div
            className="rounded-2xl border p-8 space-y-6"
            style={{ background: 'rgba(245,196,108,0.04)', borderColor: 'rgba(245,196,108,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => { setMode(null); setError('') }} className="text-gray-500 hover:text-gray-300 transition-colors text-sm">← กลับ</button>
              <h2 className="font-semibold text-lg" style={{ color: '#e8e2d2' }}>เข้าร่วม Mission</h2>
            </div>

            {/* Mission code input */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#9ca3af' }}>Mission Code</label>
              <input
                type="text"
                value={missionCode}
                onChange={e => setMissionCode(e.target.value.toUpperCase())}
                placeholder="เช่น ORION-421"
                className="w-full rounded-xl px-4 py-3 font-mono text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5c46c',
                }}
              />
            </div>

            {/* Pilot name */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#9ca3af' }}>ชื่อนักบิน</label>
              <input
                type="text"
                value={pilotName}
                onChange={e => setPilotName(e.target.value)}
                placeholder="เช่น Zara, Kai, Max..."
                maxLength={20}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8e2d2',
                }}
              />
            </div>

            {/* Ship color */}
            <div>
              <label className="block text-sm mb-3" style={{ color: '#9ca3af' }}>เลือกสีหาน</label>
              <div className="flex gap-3 flex-wrap">
                {SHIP_COLORS_LIST.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setShipColorIndex(i)}
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: 28, height: 28,
                      background: c,
                      outline: shipColorIndex === i ? `2px solid ${c}` : '2px solid transparent',
                      outlineOffset: 3,
                      opacity: shipColorIndex === i ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-center">
                <Ship color={getShipColor(shipColorIndex)} size={40} status="focusing" float={false} />
              </div>
            </div>

            {error && <p className="text-sm text-center" style={{ color: '#f56c8e' }}>{error}</p>}

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#f5c46c', color: '#06060f' }}
            >
              {loading ? 'กำลังเข้าร่วม...' : '🛸 เข้าร่วม Mission'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
