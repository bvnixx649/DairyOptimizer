import { motion } from 'motion/react'
import { BookOpen, CalendarClock, Clock3, MapPin, Plus, Users } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Check } from '../../components/Check'
import { agendaFor, freeSlots, roundUp5, type AgendaItem, type Slot } from '../../lib/agenda'
import { durationText, mins, timeOf } from '../../lib/date'
import { useDoc, useSettings, useSubjects, useTitle } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'

type Entry = { kind: 'item'; at: number; item: AgendaItem } | { kind: 'gap'; at: number; slot: Slot; free: boolean } | { kind: 'now'; at: number }

/** Structured-style vertical day: pills sized by duration, free gaps you can fill. */
export function DayTimeline({ date, today, minute }: { date: string; today: string; minute: number }) {
  const doc = useDoc()
  const settings = useSettings()
  const { byId } = useSubjects()
  const titleOf = useTitle()
  const toggleTask = useStore((s) => s.toggleTask)
  const open = useUI((s) => s.open)
  const isToday = date === today
  const isPast = date < today

  const entries = useMemo(() => {
    const items = agendaFor(doc, date)
    const out: Entry[] = items.map((item) => ({ kind: 'item', at: mins(item.start), item }))
    for (const slot of freeSlots(items, settings.dayStart, settings.dayEnd)) {
      const free = !isPast && (!isToday || mins(slot.end) > minute)
      if (free && isToday && mins(slot.start) < minute) {
        const from = Math.min(mins(slot.end), roundUp5(minute))
        if (mins(slot.end) - from >= 20) out.push({ kind: 'gap', at: from, slot: { start: timeOf(from), end: slot.end, minutes: mins(slot.end) - from }, free: true })
      } else out.push({ kind: 'gap', at: mins(slot.start), slot, free })
    }
    if (isToday) out.push({ kind: 'now', at: minute })
    return out.sort((a, b) => a.at - b.at || (a.kind === 'now' ? -1 : 1))
  }, [doc, date, settings.dayStart, settings.dayEnd, isToday, isPast, minute])

  const openBySubject = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of live(doc.tasks)) if (!t.doneAt && t.subjectId) m.set(t.subjectId, (m.get(t.subjectId) ?? 0) + 1)
    return m
  }, [doc.tasks])

  if (!entries.some((e) => e.kind !== 'now')) return null

  return (
    <ol className="timeline">
      {entries.map((e, i) => {
        if (e.kind === 'now')
          return (
            <li key="now" className="tl-now" aria-label={`Now ${timeOf(minute)}`}>
              <span className="tl-time num">{timeOf(minute)}</span>
              <span className="tl-now-line" />
            </li>
          )
        if (e.kind === 'gap')
          return (
            <li key={`gap-${e.slot.start}`} className={`tl-gap${e.free ? '' : ' past'}`}>
              <span className="tl-time" />
              <span className="tl-rail dashed" />
              {e.free ? (
                <button className="tl-gap-btn" onClick={() => open({ type: 'slot', date, start: e.slot.start, end: e.slot.end })}>
                  <span>
                    <span className="num">{durationText(e.slot.minutes)}</span> free
                  </span>
                  <span className="tl-plus">
                    <Plus size={16} />
                  </span>
                </button>
              ) : (
                <span className="tl-gap-text faint">{durationText(e.slot.minutes)}</span>
              )}
            </li>
          )

        const it = e.item
        const len = mins(it.end) - mins(it.start)
        const past = isPast || (isToday && mins(it.end) <= minute)
        const live_ = isToday && mins(it.start) <= minute && minute < mins(it.end)
        let color = '#8FA3BF'
        let title = ''
        let meta: React.ReactNode = null
        let icon: React.ReactNode = <Users size={18} />
        let onClick = () => {}
        let check: React.ReactNode = null

        if (it.kind === 'class') {
          const s = byId.get(it.slot.subjectId)
          color = s?.color ?? color
          title = s?.name ?? 'Class'
          icon = <BookOpen size={18} />
          const n = s ? openBySubject.get(s.id) : 0
          meta = (
            <>
              <span className="m">
                <MapPin size={13} />
                {it.slot.room}
              </span>
              {!!n && <span className="m hot">{n} open</span>}
            </>
          )
          onClick = () => s && open({ type: 'subject', id: s.id })
        } else if (it.event.taskId) {
          const task = doc.tasks.find((t) => t.id === it.event.taskId)
          const s = task?.subjectId ? byId.get(task.subjectId) : undefined
          color = s?.color ?? '#FF8059'
          title = task ? titleOf(task) : 'Task'
          icon = <CalendarClock size={18} />
          meta = s && <span className="m">{s.short}</span>
          onClick = () => open({ type: 'event', id: it.event.id })
          if (task) check = <Check done={!!task.doneAt} color={color} label={`Done: ${title}`} onToggle={() => toggleTask(task.id)} />
        } else {
          title = it.event.title
          icon = <Clock3 size={18} />
          meta = it.event.notes && <span className="m">{it.event.notes.split('\n')[0]}</span>
          onClick = () => open({ type: 'event', id: it.event.id })
        }

        return (
          <motion.li
            key={it.id}
            className={`tl-item${past ? ' past' : ''}${live_ ? ' live' : ''}${it.kind === 'event' && it.event.taskId ? ' task' : ''}`}
            style={{ '--c': color } as CSSProperties}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.25) }}
          >
            <span className="tl-time num">
              {it.start}
              <small>{it.end}</small>
            </span>
            <span className="tl-pill" style={{ height: Math.max(56, Math.min(150, len * 0.9)) }}>
              {icon}
            </span>
            <div className="tl-body" role="button" tabIndex={0} onClick={onClick} onKeyDown={(k) => k.key === 'Enter' && onClick()}>
              <span className="tl-dur num">{durationText(len)}</span>
              <span className="tl-title">{title}</span>
              {meta && <span className="row-meta">{meta}</span>}
            </div>
            {check}
          </motion.li>
        )
      })}
    </ol>
  )
}
