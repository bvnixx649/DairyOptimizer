import { useEffect, useState } from 'react'
import { nowMinutes, todayKey } from './date'

/** Current date + minute-of-day, refreshed every 30 s and on resume. */
export function useNow() {
  const read = () => ({ today: todayKey(), minute: nowMinutes() })
  const [now, setNow] = useState(read)
  useEffect(() => {
    const update = () => setNow((prev) => {
      const next = read()
      return next.today === prev.today && next.minute === prev.minute ? prev : next
    })
    const id = setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return now
}
