import type { Habit, HabitLog } from '../data/types'
import { addDays, weekday, weekStart } from './date'

export const isScheduled = (h: Habit, date: string) =>
  h.mode === 'daily' || (h.mode === 'days' && h.days.includes(weekday(date)))

export const logId = (habitId: string, date: string) => `${habitId}_${date}`

export const doneSet = (logs: HabitLog[], habitId: string) =>
  new Set(logs.filter((l) => !l.deleted && l.habitId === habitId).map((l) => l.date))

/**
 * Consecutive completions counting back from today. Scheduled habits skip
 * unscheduled days; an unfinished today does not break the run.
 * Context habits have no schedule, so their streak is consecutive calendar weeks (Mon–Sun) with a check-in.
 */
export function streak(h: Habit, done: Set<string>, today: string): number {
  if (h.mode === 'context') {
    let weeks = 0
    const monday = weekStart(today)
    for (let w = 0; w < 520; w++) {
      const start = addDays(monday, -7 * w)
      let hit = false
      for (let d = 0; d < 7; d++) if (done.has(addDays(start, d))) hit = true
      if (!hit) {
        if (w === 0) continue
        break
      }
      weeks++
    }
    return weeks
  }
  let count = 0
  let day = today
  if (!done.has(today)) day = addDays(today, -1)
  for (let i = 0; i < 3650 && day >= h.createdAt; i++, day = addDays(day, -1)) {
    if (!isScheduled(h, day)) continue
    if (!done.has(day)) break
    count++
  }
  return count
}

export function bestStreak(h: Habit, done: Set<string>, today: string): number {
  if (h.mode === 'context') return streak(h, done, today)
  let best = 0
  let run = 0
  for (let day = h.createdAt; day <= today; day = addDays(day, 1)) {
    if (!isScheduled(h, day)) continue
    if (done.has(day)) best = Math.max(best, ++run)
    else if (day !== today) run = 0
  }
  return best
}

/** Share of scheduled days completed in the last `n` days (context: completions per week). */
export function rate(h: Habit, done: Set<string>, today: string, n = 30) {
  let scheduled = 0
  let hits = 0
  for (let i = 0; i < n; i++) {
    const day = addDays(today, -i)
    if (day < h.createdAt) break
    if (done.has(day)) hits++
    if (isScheduled(h, day) && (day !== today || done.has(day))) scheduled++
  }
  return { hits, scheduled, ratio: scheduled ? Math.min(1, hits / scheduled) : 0 }
}
