import type { ClassSlot, Doc, Habit, Settings, Subject } from './types'

export const PALETTE = ['#FF8059', '#5AA9FF', '#F2CF4A', '#FF6B81', '#A98BFF', '#36CFC0', '#E77BF0'] as const

/** Seed records use fixed ids and updatedAt = 1 so two devices seeding independently merge into one copy. */
const SEED_TIME = 1

const subjectRows: [code: string, name: string, thai: string, short: string, color: string][] = [
  ['254363-3', 'Computer Network and Data Communication', 'เครือข่ายคอมพิวเตอร์และการสื่อสารข้อมูล', 'Network', '#5AA9FF'],
  ['254374-5', 'System Analysis and Design', 'การวิเคราะห์และออกแบบระบบ', 'SA&D', '#F2CF4A'],
  ['254383-2', 'Algorithm Design and Analysis', 'การออกแบบและวิเคราะห์อัลกอริทึม', 'Algo', '#FF6B81'],
  ['254388-1', 'Machine Learning for Scientific Applications', 'การเรียนรู้ของเครื่องประยุกต์ทางวิทยาศาสตร์', 'ML', '#A98BFF'],
  ['273387-1', 'Mobile Application Development', 'การพัฒนาโปรแกรมประยุกต์บนอุปกรณ์เคลื่อนที่', 'Mobile', '#36CFC0'],
  ['273488-1', 'Digital Image Processing', 'การประมวลผลภาพดิจิทัล', 'DIP', '#E77BF0'],
]

// [weekday (1 = Mon), subject index, start, end, room] — the user's real timetable.
const classRows: [number, number, string, string, string][] = [
  [1, 4, '10:00', '11:50', 'SC2-307'],
  [1, 2, '13:00', '14:50', 'SC2-414'],
  [2, 0, '10:00', '11:50', 'SC2-212'],
  [2, 1, '13:00', '14:50', 'SC2-208'],
  [2, 2, '15:00', '16:50', 'SC2-214'],
  [3, 4, '10:00', '11:50', 'SC2-307'],
  [3, 3, '13:00', '14:50', 'SC2-414'],
  [3, 5, '15:00', '16:50', 'SC2-307'],
  [4, 3, '10:00', '11:50', 'SC2-212'],
  [4, 1, '15:00', '16:50', 'SC2-208'],
  [5, 0, '10:00', '11:50', 'SC2-308'],
  [5, 5, '15:00', '16:50', 'SC2-208'],
]

export const seedSubjects = (): Subject[] =>
  subjectRows.map(([code, name, thai, short, color]) => ({
    id: `sub-${code}`,
    updatedAt: SEED_TIME,
    code,
    name,
    thai,
    short,
    color,
  }))

export const seedClasses = (): ClassSlot[] =>
  classRows.map(([day, i, start, end, room]) => ({
    id: `cls-${day}-${start.replace(':', '')}`,
    updatedAt: SEED_TIME,
    subjectId: `sub-${subjectRows[i][0]}`,
    day,
    start,
    end,
    room,
  }))

export const seedHabits = (createdAt: string): Habit[] => [
  {
    id: 'habit-phone-away',
    updatedAt: SEED_TIME,
    title: 'วางมือถือให้ไกล',
    cue: 'ก่อนเริ่มงานหรือเรียน',
    mode: 'context',
    days: [0, 1, 2, 3, 4, 5, 6],
    icon: 'vibrate-off',
    color: '#A98BFF',
    createdAt,
    archived: false,
    order: 0,
  },
  {
    id: 'habit-think-before-buy',
    updatedAt: SEED_TIME,
    title: 'คิดก่อนซื้อ',
    cue: 'เมื่อมีของที่อยากได้',
    mode: 'context',
    days: [0, 1, 2, 3, 4, 5, 6],
    icon: 'shopping-bag',
    color: '#FF8059',
    createdAt,
    archived: false,
    order: 1,
  },
]

export const SETTINGS_ID = 'settings'

export const seedSettings = (): Settings => ({
  id: SETTINGS_ID,
  updatedAt: SEED_TIME,
  budget: null,
  pin: null,
  dayStart: '08:00',
  dayEnd: '22:00',
})

export const seedDoc = (today: string): Doc => ({
  schema: 3,
  tasks: [],
  events: [],
  subjects: seedSubjects(),
  classes: seedClasses(),
  habits: seedHabits(today),
  habitLogs: [],
  txs: [],
  goals: [],
  goalEntries: [],
  settings: [seedSettings()],
})

export interface Category {
  name: string
  icon: string
  color: string
}

// Category colours: the dark-surface categorical palette (validated for colour-vision
// separation), assigned per category so a colour always means the same thing.
export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'อาหาร', icon: 'utensils', color: '#d95926' },
  { name: 'เดินทาง', icon: 'bus', color: '#3987e5' },
  { name: 'เรียน', icon: 'graduation-cap', color: '#9085e9' },
  { name: 'ช้อปปิ้ง', icon: 'shopping-bag', color: '#d55181' },
  { name: 'บันเทิง', icon: 'gamepad', color: '#e66767' },
  { name: 'สุขภาพ', icon: 'heart-pulse', color: '#199e70' },
  { name: 'ค่าที่พัก', icon: 'house', color: '#c98500' },
  { name: 'บิล', icon: 'receipt', color: '#008300' },
  { name: 'อื่น ๆ', icon: 'package', color: '#6b6966' },
]

export const INCOME_CATEGORIES: Category[] = [
  { name: 'ค่าขนม', icon: 'hand-coins', color: '#3987e5' },
  { name: 'เงินเดือน', icon: 'briefcase', color: '#9085e9' },
  { name: 'งานเสริม', icon: 'laptop', color: '#199e70' },
  { name: 'อื่น ๆ', icon: 'coins', color: '#6b6966' },
]

export const categoryFor = (type: 'income' | 'expense', name: string): Category =>
  (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).find((c) => c.name === name) ?? {
    name,
    icon: 'package',
    color: '#6b6966',
  }
