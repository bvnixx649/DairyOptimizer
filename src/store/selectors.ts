import { useMemo } from 'react'
import type { Subject, Task } from '../data/types'
import { addDays, weekStart } from '../lib/date'
import { getSettings, live, useStore } from './store'

export const useDoc = () => useStore((s) => s.doc)
export const useSettings = () => getSettings(useStore((s) => s.doc))

export function useSubjects() {
  const subjects = useStore((s) => s.doc.subjects)
  return useMemo(() => {
    const list = live(subjects)
    return { list, byId: new Map(list.map((s) => [s.id, s])) }
  }, [subjects])
}

export function useTitle() {
  const secrets = useStore((s) => s.secrets)
  return (t: Task) => (t.private ? (secrets[t.id]?.title ?? 'Private task') : t.title)
}

export function useTaskSecret(t: Task | undefined) {
  const secrets = useStore((s) => s.secrets)
  if (!t) return null
  if (!t.private) return { title: t.title, notes: t.notes, checklist: t.checklist }
  return secrets[t.id] ?? null
}

export type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'someday'

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
  someday: 'No date',
}

/** Where an open task sits: by the earlier of its plan date and deadline. */
export function bucketOf(t: Task, today: string): Bucket {
  if (t.due && t.due < today) return 'overdue'
  const d = [t.plan, t.due].filter((x): x is string => !!x).sort()[0]
  if (!d) return 'someday'
  if (d <= today) return 'today'
  if (d === addDays(today, 1)) return 'tomorrow'
  if (d < addDays(weekStart(today), 7)) return 'week'
  return 'later'
}

export const sortTasks = (a: Task, b: Task) =>
  Number(b.flagged) - Number(a.flagged) ||
  (a.due ?? '9999').localeCompare(b.due ?? '9999') ||
  a.createdAt - b.createdAt

export const subjectColor = (s: Subject | undefined) => s?.color ?? 'var(--accent)'
