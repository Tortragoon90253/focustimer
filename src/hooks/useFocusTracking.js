import { useEffect, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const BLUR_GRACE_MS  = 2000   // ignore transient blurs (DevTools, right-click, OS notifs)
const HEARTBEAT_MS   = 30_000 // write to Firestore even when still focused
const AFK_THRESHOLD  = 60_000 // 60s without heartbeat → AFK

export function useFocusTracking({ uid, missionCode, isActive, addToast }) {
  const blurTimerRef  = useRef(null)
  const heartbeatRef  = useRef(null)
  const lastFocusRef  = useRef(null)  // last written focusStatus
  const toastFiredRef = useRef(false) // prevent toast spam per departure

  useEffect(() => {
    if (!isActive || !uid || !missionCode) return

    const crewRef = doc(db, 'missions', missionCode, 'crew', uid)

    async function writeFocus(status) {
      if (lastFocusRef.current === status) return
      lastFocusRef.current = status
      try {
        await updateDoc(crewRef, { focusStatus: status, focusLastSeen: serverTimestamp() })
      } catch { /* ignore — user may have left mid-session */ }
    }

    async function writeHeartbeat() {
      try {
        await updateDoc(crewRef, { focusLastSeen: serverTimestamp() })
      } catch { /* ignore */ }
    }

    function markFocused() {
      clearTimeout(blurTimerRef.current)
      toastFiredRef.current = false
      writeFocus('focused')
    }

    function markUnfocused() {
      if (!toastFiredRef.current) {
        toastFiredRef.current = true
        addToast('⚠️ กลับมาโฟกัสด้วยนะ!')
      }
      writeFocus('unfocused')
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        markFocused()
      } else {
        // No grace period for tab-hide — it's unambiguous
        clearTimeout(blurTimerRef.current)
        markUnfocused()
      }
    }

    function onBlur() {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = setTimeout(markUnfocused, BLUR_GRACE_MS)
    }

    function onFocus() {
      if (document.visibilityState === 'visible') markFocused()
    }

    // Write initial state
    writeFocus(document.visibilityState === 'visible' && document.hasFocus() ? 'focused' : 'unfocused')

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    // Heartbeat interval — keeps focusLastSeen fresh so others can detect AFK
    heartbeatRef.current = setInterval(writeHeartbeat, HEARTBEAT_MS)

    return () => {
      clearTimeout(blurTimerRef.current)
      clearInterval(heartbeatRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [isActive, uid, missionCode, addToast])
}
