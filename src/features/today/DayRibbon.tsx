import type { CSSProperties } from 'react'
import type { AgendaItem } from '../../lib/agenda'
import { mins } from '../../lib/date'
import type { Subject } from '../../data/types'

interface Props {
  items: AgendaItem[]
  subjects: Map<string, Subject>
  dayStart: string
  dayEnd: string
  /** Minute of day for the "now" needle; omit for other days. */
  now?: number
  onClick?: () => void
}

/** The whole day as one horizontal strip: classes, appointments, reserved task time, and where "now" is. */
export function DayRibbon({ items, subjects, dayStart, dayEnd, now, onClick }: Props) {
  const lo = Math.floor(Math.min(mins(dayStart), ...items.map((i) => mins(i.start))) / 60) * 60
  const hi = Math.ceil(Math.max(mins(dayEnd), ...items.map((i) => mins(i.end))) / 60) * 60
  const pct = (m: number) => ((Math.min(hi, Math.max(lo, m)) - lo) / (hi - lo)) * 100
  const hours: number[] = []
  for (let h = lo / 60; h <= hi / 60; h += 2) hours.push(h)

  return (
    <button className="ribbon" onClick={onClick} aria-label="Open today’s schedule">
      <div className="ribbon-track">
        {now !== undefined && <span className="ribbon-past" style={{ width: `${pct(now)}%` }} />}
        {items.map((i) => {
          const s = i.kind === 'class' ? subjects.get(i.slot.subjectId) : undefined
          const task = i.kind === 'event' && i.event.taskId
          const color = s?.color ?? (task ? '#FF8059' : '#8FA3BF')
          const width = pct(mins(i.end)) - pct(mins(i.start))
          return (
            <span
              key={i.id}
              className={`ribbon-block${task ? ' task' : ''}${now !== undefined && mins(i.end) <= now ? ' past' : ''}`}
              style={{ left: `${pct(mins(i.start))}%`, width: `${width}%`, '--c': color } as CSSProperties}
            >
              {width > 9 && <em>{s?.short ?? ''}</em>}
            </span>
          )
        })}
        {now !== undefined && now >= lo && now <= hi && <span className="ribbon-now" style={{ left: `${pct(now)}%` }} />}
      </div>
      <div className="ribbon-hours" aria-hidden="true">
        {hours.map((h) => (
          <span key={h} style={{ left: `${pct(h * 60)}%` }}>
            {h}
          </span>
        ))}
      </div>
    </button>
  )
}
