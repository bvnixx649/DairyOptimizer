import { AlertTriangle, CalendarDays, Clock3, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import type { Event } from '../../data/types'
import { conflictsWith } from '../../lib/agenda'
import { mins, nowMinutes, relativeDay, timeOf, todayKey } from '../../lib/date'
import { uid } from '../../lib/haptics'
import { useDoc, useSubjects, useTitle } from '../../store/selectors'
import { useStore } from '../../store/store'
import { useUI } from '../../store/ui'

interface Props {
  id?: string
  date?: string
  start?: string
  end?: string
}

const nextHalfHour = () => timeOf(Math.min(22 * 60, Math.ceil((nowMinutes() + 1) / 30) * 30))

export function EventForm({ id, date, start, end }: Props) {
  const doc = useDoc()
  const { byId } = useSubjects()
  const titleOf = useTitle()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { close, notify } = useUI.getState()
  const existing = id ? doc.events.find((e) => e.id === id) : undefined
  const task = existing?.taskId ? doc.tasks.find((t) => t.id === existing.taskId) : undefined
  const today = todayKey()

  const s0 = existing?.start ?? start ?? nextHalfHour()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [day, setDay] = useState(existing?.date ?? date ?? today)
  const [from, setFrom] = useState(s0)
  const [to, setTo] = useState(existing?.end ?? end ?? timeOf(Math.min(mins(s0) + 60, 23 * 60 + 59)))
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const valid = (task || title.trim()) && from < to
  const conflicts = useMemo(() => (from < to ? conflictsWith(doc, day, from, to, id) : []), [doc, day, from, to, id])

  const save = () => {
    if (!valid) return
    const ev: Event = {
      id: existing?.id ?? uid(),
      updatedAt: existing?.updatedAt ?? 0,
      date: day,
      start: from,
      end: to,
      title: task ? '' : title.trim(),
      notes: notes.trim(),
      taskId: existing?.taskId ?? null,
    }
    put('events', ev)
    close()
    notify(existing ? 'Saved' : `Event added · ${relativeDay(day, today)} ${from}`)
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {task ? (
        <div className="big-input" style={{ color: 'var(--text-2)' }}>
          Working on <span style={{ color: 'var(--text)' }}>{titleOf(task)}</span>
        </div>
      ) : (
        <input className="big-input" autoFocus={!existing} placeholder="What’s happening?" value={title} maxLength={180} onChange={(e) => setTitle(e.target.value)} />
      )}

      <div className="prop-list">
        <label className="prop">
          <CalendarDays size={18} />
          <span className="prop-label">Date</span>
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </label>
        <label className="prop">
          <Clock3 size={18} />
          <span className="prop-label">Start</span>
          <input type="time" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </label>
        <label className="prop">
          <Clock3 size={18} style={{ opacity: 0 }} />
          <span className="prop-label">End</span>
          <input type="time" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </label>
      </div>

      {from >= to && <div className="note warn">End must be after start</div>}
      {conflicts.length > 0 && (
        <div className="note warn">
          <AlertTriangle size={16} />
          <span>
            Overlaps{' '}
            {conflicts
              .map((c) => (c.kind === 'class' ? byId.get(c.slot.subjectId)?.short : c.event.taskId ? 'task time' : c.event.title))
              .join(', ')}{' '}
            ({conflicts[0].start}–{conflicts[0].end})
          </span>
        </div>
      )}

      {!task && (
        <label className="field">
          <textarea placeholder="Place / details" value={notes} rows={2} onChange={(e) => setNotes(e.target.value)} />
        </label>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {existing && (
          <button
            type="button"
            className="btn btn-danger"
            aria-label="Delete"
            onClick={() => {
              const snaps = remove('events', [existing.id])
              close()
              notify(task ? 'Time block removed' : 'Event deleted', () => restore(snaps))
            }}
          >
            <Trash2 size={18} />
          </button>
        )}
        <button className="btn btn-primary btn-block" style={{ flex: 1 }} disabled={!valid}>
          {conflicts.length ? 'Save anyway' : existing ? 'Save' : 'Add event'}
        </button>
      </div>
    </form>
  )
}

export function EventSheet(props: Props) {
  const ev = useDoc().events.find((e) => e.id === props.id)
  return (
    <Sheet title={ev?.taskId ? 'Time block' : props.id ? 'Event' : 'New event'}>
      <EventForm {...props} />
    </Sheet>
  )
}
