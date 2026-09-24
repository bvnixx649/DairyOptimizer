import { seedClasses, seedHabits, seedSubjects } from '../data/seed'
import type { ClassSlot, Doc, Event, Goal, GoalEntry, Habit, HabitLog, Subject, Task, TaskSecret, Tx } from '../data/types'
import { logId } from './habits'

/* The previous Achieve (localStorage "dairy-optimizer-v1", backup version 1/2). Only fields we read are typed. */
interface OldTask {
  id: string
  done: boolean
  locked: boolean
  completedAt?: string
  title?: string
  notes?: string
  due?: string
  focusDate?: string
  checklist?: { title: string; done: boolean }[]
  duration?: number
  priority?: string
  subject?: string
  salt?: string
  iv?: string
  cipher?: string
}

export interface LegacyBackup {
  version: 1 | 2
  transactions: { id: string; type: 'income' | 'expense'; amount: number; date: string; note: string; category: string; created: number }[]
  tasks: OldTask[]
  events: { id: string; date: string; start: string; end: string; title?: string; notes?: string; taskId?: string }[]
  savings: { id: string; amount: number; date: string }[]
  goal: { name: string; target: number; startDate?: string; endDate?: string }
  budget: number
  budgetConfigured?: boolean
  subjects: { id: string; name: string; thai: string }[]
  schedule: { id: string; day: number; subject: string; start: string; end: string; room: string }[]
  habits?: { id: string; title: string; cue: string; kind: 'daily' | 'context'; days: number[]; created: string; archived: boolean; icon: string; color: string }[]
  habitLogs?: { id: string; habitId: string; date: string }[]
}

export const isLegacyBackup = (v: unknown): v is LegacyBackup => {
  const o = v as LegacyBackup
  return !!o && (o.version === 1 || o.version === 2) && Array.isArray(o.transactions) && Array.isArray(o.tasks) && Array.isArray(o.schedule)
}

export const legacyLockedCount = (b: LegacyBackup) => b.tasks.filter((t) => t.locked).length

/** Starter habits from the old app map onto the same seeded habits here. */
const LEGACY_SEEDS: Record<string, string> = { 'วางมือถือให้ไกล': 'habit-phone-away', 'คิดก่อนซื้อ': 'habit-think-before-buy' }

const ICONS: Record<string, string> = { phone: 'vibrate-off', bag: 'shopping-bag', book: 'book-open', heart: 'heart', spark: 'sparkles' }
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const noonOf = (date: string) => new Date(`${date}T12:00:00`).getTime()

export interface Converted {
  doc: Doc
  /** Settings are applied field by field so an import never clears the PIN. */
  budget: number | null
  /** Tasks that were PIN-locked in the old app; they arrive decrypted and must be sealed again. */
  privateIds: string[]
  skippedLocked: number
}

/**
 * Converts an old backup into v3 records. `decrypt` opens locked tasks with the old PIN;
 * when it is absent or fails, those tasks (and their time blocks) are skipped.
 */
export async function convertLegacy(
  b: LegacyBackup,
  decrypt: ((box: { salt: string; iv: string; cipher: string }) => Promise<Record<string, unknown> | null>) | null,
  today: string,
  now = Date.now(),
): Promise<Converted> {
  const seedSubs = seedSubjects()
  const subjectMap = new Map<string, string>()
  const subjects: Subject[] = []
  for (const s of b.subjects) {
    const seed = seedSubs.find((x) => x.code === s.id)
    if (seed) {
      subjectMap.set(s.id, seed.id)
      if (seed.name !== s.name || seed.thai !== s.thai) subjects.push({ ...seed, name: s.name, thai: s.thai, updatedAt: now })
    } else {
      const id = `sub-${s.id}`
      subjectMap.set(s.id, id)
      subjects.push({ id, updatedAt: now, code: s.id, name: s.name, thai: s.thai, short: s.name.split(' ')[0].slice(0, 8), color: '#8FA3BF' })
    }
  }

  const seedCls = seedClasses()
  const classes: ClassSlot[] = []
  for (const c of b.schedule) {
    const subjectId = subjectMap.get(c.subject)
    if (!subjectId) continue
    const seedId = `cls-${c.day}-${c.start.replace(':', '')}`
    const seed = seedCls.find((x) => x.id === seedId)
    const next = { day: c.day, start: c.start, end: c.end, room: c.room, subjectId }
    if (seed && seed.end === next.end && seed.room === next.room && seed.subjectId === subjectId) continue
    classes.push({ id: seed ? seedId : `cls-${c.id}`, updatedAt: now, ...next })
  }

  const tasks: Task[] = []
  const privateIds: string[] = []
  let skippedLocked = 0
  for (const t of b.tasks) {
    let src: OldTask & Record<string, unknown> = t as OldTask & Record<string, unknown>
    if (t.locked) {
      const opened = decrypt && t.salt && t.iv && t.cipher ? await decrypt({ salt: t.salt, iv: t.iv, cipher: t.cipher }) : null
      if (!opened) {
        skippedLocked++
        continue
      }
      src = { ...opened, ...t } as OldTask & Record<string, unknown>
      src.title = String(opened.title ?? '')
      src.notes = String(opened.notes ?? '')
      privateIds.push(t.id)
    }
    const secret: TaskSecret = {
      title: String(src.title ?? '').slice(0, 180) || 'Task',
      notes: String(src.notes ?? ''),
      checklist: (Array.isArray(src.checklist) ? src.checklist : []).map((c, i) => ({ id: `${t.id}-c${i}`, title: String(c.title), done: !!c.done })),
    }
    tasks.push({
      id: t.id,
      updatedAt: now,
      ...secret,
      due: isDate(src.due) ? src.due : null,
      plan: isDate(src.focusDate) ? src.focusDate : null,
      subjectId: (src.subject && subjectMap.get(String(src.subject))) || null,
      duration: Number(src.duration) > 0 ? Math.min(720, Number(src.duration)) : 30,
      flagged: src.priority === 'high',
      doneAt: t.done ? (isDate(t.completedAt) ? noonOf(t.completedAt) : now) : null,
      createdAt: now,
      private: t.locked,
      enc: null,
    })
  }
  const taskIds = new Set(tasks.map((t) => t.id))

  const events: Event[] = b.events
    .filter((e) => !e.taskId || taskIds.has(e.taskId))
    .map((e) => ({
      id: e.id,
      updatedAt: now,
      date: e.date,
      start: e.start,
      end: e.end,
      title: e.taskId ? '' : String(e.title ?? ''),
      notes: String(e.notes ?? ''),
      taskId: e.taskId ?? null,
    }))

  const txs: Tx[] = b.transactions.map((t) => ({
    id: t.id,
    updatedAt: now,
    type: t.type,
    amount: Math.round(t.amount * 100),
    category: t.category,
    note: t.note ?? '',
    date: t.date,
    createdAt: t.created || now,
  }))

  const goals: Goal[] = []
  const goalEntries: GoalEntry[] = []
  if (b.savings.length || b.goal.name !== 'เงินเก็บก้อนแรก' || b.goal.endDate) {
    goals.push({
      id: 'goal-legacy',
      updatedAt: now,
      name: b.goal.name,
      target: Math.round(b.goal.target * 100),
      deadline: isDate(b.goal.endDate) ? b.goal.endDate : null,
      color: '#FF8059',
      createdAt: isDate(b.goal.startDate) ? b.goal.startDate : today,
      archived: false,
    })
    for (const s of b.savings)
      goalEntries.push({ id: s.id, updatedAt: now, goalId: 'goal-legacy', amount: Math.round(s.amount * 100), date: s.date, note: '' })
  }

  const seedH = seedHabits(today)
  const habitMap = new Map<string, string>()
  const habits: Habit[] = []
  ;(b.habits ?? []).forEach((h, order) => {
    const seed = seedH.find((s) => s.id === LEGACY_SEEDS[h.title] || s.title === h.title)
    const id = seed?.id ?? h.id
    habitMap.set(h.id, id)
    habits.push({
      id,
      updatedAt: now,
      title: h.title,
      cue: h.cue,
      mode: h.kind === 'context' ? 'context' : h.days.length === 7 ? 'daily' : 'days',
      days: h.days,
      icon: ICONS[h.icon] ?? 'sparkles',
      color: seed?.color ?? '#FF8059',
      createdAt: h.created,
      archived: h.archived,
      order,
    })
  })
  const habitLogs: HabitLog[] = (b.habitLogs ?? [])
    .filter((l) => habitMap.has(l.habitId))
    .map((l) => {
      const habitId = habitMap.get(l.habitId)!
      return { id: logId(habitId, l.date), updatedAt: now, habitId, date: l.date }
    })

  return {
    doc: { schema: 3, tasks, events, subjects, classes, habits, habitLogs, txs, goals, goalEntries, settings: [] },
    budget: b.budgetConfigured === false ? null : Math.round(b.budget * 100),
    privateIds,
    skippedLocked,
  }
}
