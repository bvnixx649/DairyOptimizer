import { useMemo } from 'react'
import { addDays, DAY_LETTER, daysInMonth, parseDate, weekStart } from '../../lib/date'
import { useDoc } from '../../store/selectors'
import { live } from '../../store/store'

interface Props {
  month: string
  today: string
  selected: string
  onSelect: (d: string) => void
}

export function MonthGrid({ month, today, selected, onSelect }: Props) {
  const doc = useDoc()
  const marks = useMemo(() => {
    const due = new Map<string, number>()
    const ev = new Set<string>()
    for (const t of live(doc.tasks)) if (!t.doneAt && t.due) due.set(t.due, (due.get(t.due) ?? 0) + 1)
    for (const e of live(doc.events)) ev.add(e.date)
    return { due, ev }
  }, [doc.tasks, doc.events])

  const first = `${month}-01`
  const start = weekStart(first)
  const last = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  const cells: string[] = []
  for (let d = start; d <= last || cells.length % 7; d = addDays(d, 1)) cells.push(d)

  return (
    <div className="month">
      {[1, 2, 3, 4, 5, 6, 0].map((w) => (
        <span key={w} className="mh">
          {DAY_LETTER[w]}
        </span>
      ))}
      {cells.map((d) => {
        const n = marks.due.get(d)
        return (
          <button
            key={d}
            className={`mc${d.startsWith(month) ? '' : ' out'}${d === today ? ' today' : ''}${d === selected ? ' sel' : ''}`}
            onClick={() => onSelect(d)}
            aria-label={d}
            aria-pressed={d === selected}
          >
            <span className="num">{parseDate(d).getDate()}</span>
            <span className="mc-dots">
              {n ? <i className="due" /> : null}
              {n && n > 1 ? <i className="due" /> : null}
              {marks.ev.has(d) ? <i className="ev" /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
