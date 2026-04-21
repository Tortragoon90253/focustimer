const KEY = 'focusFleet_uid'
export const saveUid = uid => { if (uid) localStorage.setItem(KEY, uid) }
export const loadUid = state => state?.uid ?? localStorage.getItem(KEY) ?? null
