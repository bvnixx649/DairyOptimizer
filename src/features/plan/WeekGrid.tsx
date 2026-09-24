import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { agendaFor } from '../../lib/agenda'
import { addDays, DAY_LETTER, mins, parseDate, timeOf, weekday } from '../../lib/date'
import { useTablet } from '../../lib/useMedia'
import { useDoc, useSubjects, useTitle } from '../../store/selectors'
import { live } from '../../store/store'
import { useUI } from '../../store/ui'

interface Props {
  start: string
  today: string
  minute: number
  selected: string
  onSelect: (d: string) => void
}

/** The timetable as a grid: subject + room per block, due-task counts on each day. */
export function WeekGrid({ start, today, minute, selected, onSelect }: Props) {
  const doc = useDoc()
  const { byId } = useSubjects()
  const titleOf = useTitle()
  const open = useUI((s) => s.open)
  const tablet = useTablet()
  const hourPx = tablet ? 58 : 46

  const days = useMemo(() => {
    const all = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    const items = new Map(all.map((d) => [d, agendaFor(doc, d)]))
    // Weekends only take a column when something is on them.
    const shown = all.filter((d, i) => i < 5 || items.get(d)!.length > 0)
    return shown.map((d) => ({ date: d, items: items.get(d)! }))
  }, [doc, start])

  const due = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of live(doc.tasks)) if (!t.doneAt && t.due) m.set(t.due, (m.get(t.due) ?? 0) + 1)
    return m
  }, [doc.tasks])

  const all = days.flatMap((d) => d.items)
  const lo = Math.min(8 * 60, ...all.map((i) => Math.floor(mins(i.start) / 60) * 60))
  const hi = Math.max(18 * 60, ...all.map((i) => Math.ceil(mins(i.end) / 60) * 60))
  const hours = Array.from({ length: (hi - lo) / 60 }, (_, i) => lo / 60 + i)
  const y = (m: number) => ((m - lo) / 60) * hourPx

  return (
    <div className="week" style={{ '--cols': days.length } as CSSProperties}>
      <div className="week-head">
        <span />
        {days.map(({ date }) => {
          const n = due.get(date)
          return (
            <button key={date} className={`wh-day${date === today ? ' today' : ''}${date === selected ? ' sel' : ''}`} onClick={() => onSelect(date)}>
              <span className="wh-letter">{DAY_LETTER[weekday(date)]}</span>
              <span className="wh-num num">{parseDate(date).getDate()}</span>
              {n ? <span className="wh-due num">{n}</span> : null}
            </button>
          )
        })}
      </div>
      <div className="week-body" style={{ height: y(hi) }}>
        <div className="week-hours" aria-hidden="true">
          {hours.map((h) => (
            <span key={h} style={{ top: y(h * 60) }} className="num">
              {h}
            </span>
          ))}
        </div>
        {days.map(({ date, items }) => (
          <div key={date} className={`week-col${date === today ? ' today' : ''}`}>
            {hours.map((h) => (
              <button
                key={h}
                className="week-cell"
                style={{ top: y(h * 60), height: hourPx }}
                aria-label={`New event ${date} ${h}:00`}
                onClick={() => open({ type: 'event', date, start: timeOf(h * 60), end: timeOf(h * 60 + 60) })}
              />
            ))}
            {items.map((it) => {
              const s = it.kind === 'class' ? byId.get(it.slot.subjectId) : undefined
              const task = it.kind === 'event' && it.event.taskId ? doc.tasks.find((t) => t.id === it.event.taskId) : undefined
              const color = s?.color ?? (task ? '#FF8059' : '#8FA3BF')
              const label = s ? s.short : task ? titleOf(task) : it.kind === 'event' ? it.event.title : ''
              const h = y(mins(it.end)) - y(mins(it.start))
              return (
                <button
                  key={it.id}
                  className={`wb${task ? ' task' : ''}${date < today || (date === today && mins(it.end) <= minute) ? ' past' : ''}`}
                  style={{ top: y(mins(it.start)) + 1, height: h - 2, '--c': color } as CSSProperties}
                  onClick={() => (s ? open({ type: 'subject', id: s.id }) : it.kind === 'event' && open({ type: 'event', id: it.event.id }))}
                >
                  <span className="wb-title">{label}</span>
                  {h > 44 && <span className="wb-sub num">{it.kind === 'class' ? it.slot.room : it.start}</span>}
                  {tablet && h > 70 && <span className="wb-sub num">{it.start}–{it.end}</span>}
                </button>
              )
            })}
            {date === today && minute >= lo && minute <= hi && <span className="week-now" style={{ top: y(minute) }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
