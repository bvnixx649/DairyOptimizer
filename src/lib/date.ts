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

export const DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
export const DAY_NAME = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const DAY_LETTER = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
export const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export const MONTH_NAME = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/** "24 ก.ย." */
export const shortDate = (key: string) => {
  const d = parseDate(key)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

/** "กันยายน 2569" */
export const monthTitle = (monthKey: string) => {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAME[m - 1]} ${y + 543}`
}

/** Relative label used on task rows and chips. */
export const relativeDay = (key: string, today = todayKey()) => {
  const diff = daysBetween(today, key)
  if (diff === 0) return 'วันนี้'
  if (diff === 1) return 'พรุ่งนี้'
  if (diff === -1) return 'เมื่อวาน'
  if (diff > 1 && diff < 7) return DAY_NAME[weekday(key)]
  return shortDate(key)
}

export const durationText = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} นาที`
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}

export const compactDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m}น.`
  return m ? `${h}ชม.${m}น.` : `${h}ชม.`
}
