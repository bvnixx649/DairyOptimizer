import type { ClassSlot, Doc, Event } from '../data/types'
import { mins, timeOf, weekday } from './date'

export type AgendaItem =
  | { kind: 'class'; id: string; start: string; end: string; slot: ClassSlot }
  | { kind: 'event'; id: string; start: string; end: string; event: Event }

export interface Slot {
  start: string
  end: string
  minutes: number
}

const live = <T extends { deleted?: boolean }>(xs: T[]) => xs.filter((x) => !x.deleted)

export const classesOn = (doc: Doc, date: string) =>
  live(doc.classes)
    .filter((c) => c.day === weekday(date))
    .sort((a, b) => a.start.localeCompare(b.start))

export const eventsOn = (doc: Doc, date: string) =>
  live(doc.events)
    .filter((e) => e.date === date)
    .sort((a, b) => a.start.localeCompare(b.start))

export const agendaFor = (doc: Doc, date: string): AgendaItem[] =>
  [
    ...classesOn(doc, date).map((slot) => ({ kind: 'class' as const, id: slot.id, start: slot.start, end: slot.end, slot })),
    ...eventsOn(doc, date).map((event) => ({ kind: 'event' as const, id: event.id, start: event.start, end: event.end, event })),
  ].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))

export const MIN_SLOT = 20

/** Gaps of at least MIN_SLOT minutes between dayStart and dayEnd, skipping time before `from`. */
export function freeSlots(items: { start: string; end: string }[], dayStart: string, dayEnd: string, from?: number): Slot[] {
  const lower = Math.max(mins(dayStart), from ?? 0)
  const upper = mins(dayEnd)
  const busy = items
    .map((i) => [Math.max(lower, mins(i.start)), Math.min(upper, mins(i.end))] as const)
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
  const out: Slot[] = []
  let cursor = lower
  for (const [a, b] of busy) {
    if (a - cursor >= MIN_SLOT) out.push({ start: timeOf(cursor), end: timeOf(a), minutes: a - cursor })
    cursor = Math.max(cursor, b)
  }
  if (upper - cursor >= MIN_SLOT) out.push({ start: timeOf(cursor), end: timeOf(upper), minutes: upper - cursor })
  return out
}

/** Items on `date` overlapping [start, end), excluding the event being edited. */
export const conflictsWith = (doc: Doc, date: string, start: string, end: string, ignoreId?: string) =>
  agendaFor(doc, date).filter((i) => i.id !== ignoreId && start < i.end && end > i.start)

/** Rounds up to the next 5 minutes, for "from now" scheduling. */
export const roundUp5 = (m: number) => Math.ceil(m / 5) * 5
