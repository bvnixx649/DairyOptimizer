/** Dates are local-calendar strings (YYYY-MM-DD); times are HH:MM. */

const pad = (n: number) => String(n).padStart(2, '0')

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => dateKey(new Date())

export const addDays = (key: string, n: number) => {
  const d = parseDate(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export const addMonths = (monthKey: string, n: number) => {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const monthOf = (key: string) => key.slice(0, 7)

export const weekday = (key: string) => parseDate(key).getDay()

/** Monday of the week containing `key`. */
export const weekStart = (key: string) => addDays(key, -((weekday(key) + 6) % 7))

export const daysBetween = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)

export const daysInMonth = (monthKey: string) => {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const timeOf = (minutes: number) => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)))
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_LETTER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_NAME = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "Sep 24" */
export const shortDate = (key: string) => {
  const d = parseDate(key)
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`
}

/** "September 2026" */
export const monthTitle = (monthKey: string) => {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAME[m - 1]} ${y}`
}

/** Relative label used on task rows and chips. */
export const relativeDay = (key: string, today = todayKey()) => {
  const diff = daysBetween(today, key)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return DAY_NAME[weekday(key)]
  return shortDate(key)
}

/** "Due today", "Due Saturday", "Due Oct 3" */
export const dueText = (key: string, today = todayKey()) => {
  const r = relativeDay(key, today)
  return `Due ${['Today', 'Tomorrow', 'Yesterday'].includes(r) ? r.toLowerCase() : r}`
}

export const durationText = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}

export const compactDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}
