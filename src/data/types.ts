/** Every synced record carries these fields; merges pick the higher `updatedAt`. */
export interface Rec {
  id: string
  updatedAt: number
  deleted?: boolean
}

export interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

/** Private tasks keep title/notes/checklist only inside `enc`. */
export interface TaskSecret {
  title: string
  notes: string
  checklist: ChecklistItem[]
}

export interface Task extends Rec, TaskSecret {
  /** Deadline, YYYY-MM-DD. */
  due: string | null
  /** Day the user plans to work on it. */
  plan: string | null
  subjectId: string | null
  /** Estimated minutes. */
  duration: number
  flagged: boolean
  doneAt: number | null
  createdAt: number
  private: boolean
  enc: { iv: string; data: string } | null
}

export interface Event extends Rec {
  date: string
  start: string
  end: string
  title: string
  notes: string
  /** When set, the block is time reserved for this task. */
  taskId: string | null
}

export interface Subject extends Rec {
  code: string
  name: string
  thai: string
  short: string
  color: string
}

export interface ClassSlot extends Rec {
  subjectId: string
  /** 0 = Sunday … 6 = Saturday */
  day: number
  start: string
  end: string
  room: string
}

export type HabitMode = 'daily' | 'days' | 'context'

export interface Habit extends Rec {
  title: string
  cue: string
  mode: HabitMode
  days: number[]
  icon: string
  color: string
  createdAt: string
  archived: boolean
  order: number
}

export interface HabitLog extends Rec {
  habitId: string
  date: string
}

export type TxType = 'income' | 'expense'

export interface Tx extends Rec {
  type: TxType
  /** Satang (1/100 baht), always positive. */
  amount: number
  category: string
  note: string
  date: string
  createdAt: number
}

export interface Goal extends Rec {
  name: string
  /** Satang. */
  target: number
  deadline: string | null
  color: string
  createdAt: string
  archived: boolean
}

export interface GoalEntry extends Rec {
  goalId: string
  /** Satang; negative = withdrawal. */
  amount: number
  date: string
  note: string
}

export interface PinConfig {
  salt: string
  iterations: number
  check: { iv: string; data: string }
}

export interface Settings extends Rec {
  /** Monthly spending budget in satang. */
  budget: number | null
  pin: PinConfig | null
  dayStart: string
  dayEnd: string
}

export interface Collections {
  tasks: Task[]
  events: Event[]
  subjects: Subject[]
  classes: ClassSlot[]
  habits: Habit[]
  habitLogs: HabitLog[]
  txs: Tx[]
  goals: Goal[]
  goalEntries: GoalEntry[]
  settings: Settings[]
}

export type CollectionName = keyof Collections

export interface Doc extends Collections {
  schema: 3
}

export const COLLECTIONS: CollectionName[] = [
  'tasks',
  'events',
  'subjects',
  'classes',
  'habits',
  'habitLogs',
  'txs',
  'goals',
  'goalEntries',
  'settings',
]
