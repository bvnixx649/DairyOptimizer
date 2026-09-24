import { CalendarPlus, Check as CheckIcon, Plus } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Empty } from '../../components/Empty'
import { Sheet } from '../../components/Sheet'
import type { Task } from '../../data/types'
import { agendaFor, freeSlots, roundUp5 } from '../../lib/agenda'
import { addDays, DAY_NAME, dueText, durationText, mins, relativeDay, timeOf, todayKey, weekday } from '../../lib/date'
import { tick, uid } from '../../lib/haptics'
import { bucketOf, sortTasks, useDoc, useSettings, useSubjects, useTitle } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'

function useOpenTasks() {
  const tasks = useDoc().tasks
  return useMemo(() => live(tasks).filter((t) => !t.doneAt).sort(sortTasks), [tasks])
}

function TaskPick({ task, onPick, trailing, selected }: { task: Task; onPick: () => void; trailing?: string; selected?: boolean }) {
  const { byId } = useSubjects()
  const titleOf = useTitle()
  const s = task.subjectId ? byId.get(task.subjectId) : undefined
  const today = todayKey()
  return (
    <button className="row hoverable" onClick={onPick} style={{ '--c': s?.color ?? 'var(--accent)' } as CSSProperties}>
      <span className={`pick-dot${selected ? ' on' : ''}`}>{selected && <CheckIcon size={14} strokeWidth={3} />}</span>
      <span className="row-main">
        <span className="row-title" style={{ display: 'block' }}>
          {titleOf(task)}
        </span>
        <span className="row-meta">
          {s && (
            <span className="m">
              <i className="dot-c" />
              {s.short}
            </span>
          )}
          {task.due && <span className="m">{dueText(task.due, today)}</span>}
        </span>
      </span>
      {trailing && <span className="row-trail num">{trailing}</span>}
    </button>
  )
}

/** A free gap was tapped: put a task into it, or make an appointment there. */
export function SlotSheet({ date, start, end }: { date: string; start: string; end: string }) {
  const tasks = useOpenTasks()
  const put = useStore((s) => s.put)
  const { open, close, notify } = useUI.getState()
  const length = mins(end) - mins(start)

  const place = (t: Task) => {
    const to = timeOf(Math.min(mins(end), mins(start) + t.duration))
    put('events', { id: uid(), updatedAt: 0, date, start, end: to, title: '', notes: '', taskId: t.id })
    tick(12)
    close()
    notify(`Blocked ${start}–${to}`)
  }

  return (
    <Sheet title={`Free ${start}–${end}`}>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        {relativeDay(date)} · {durationText(length)}
      </p>
      {tasks.length ? (
        <div className="card list">
          {tasks.slice(0, 30).map((t) => (
            <TaskPick key={t.id} task={t} onPick={() => place(t)} trailing={durationText(Math.min(t.duration, length))} />
          ))}
        </div>
      ) : (
        <Empty icon={CalendarPlus} text="Nothing open" />
      )}
      <div className="stack" style={{ marginTop: 14 }}>
        <button className="btn btn-quiet btn-block" onClick={() => open({ type: 'quick', mode: 'task', date, start, end })}>
          <Plus size={18} /> New task here
        </button>
        <button className="btn btn-quiet btn-block" onClick={() => open({ type: 'event', date, start, end })}>
          <CalendarPlus size={18} /> New event here
        </button>
      </div>
    </Sheet>
  )
}

/** Pick a free slot in the next 7 days for a task. */
export function ScheduleSheet({ taskId }: { taskId: string }) {
  const doc = useDoc()
  const settings = useSettings()
  const titleOf = useTitle()
  const put = useStore((s) => s.put)
  const { close, notify } = useUI.getState()
  const task = doc.tasks.find((t) => t.id === taskId)
  const today = todayKey()

  const days = useMemo(() => {
    const out: { date: string; slots: ReturnType<typeof freeSlots> }[] = []
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i)
      const from = i === 0 ? roundUp5(now.getHours() * 60 + now.getMinutes()) : undefined
      const slots = freeSlots(agendaFor(doc, date), settings.dayStart, settings.dayEnd, from)
      if (slots.length) out.push({ date, slots })
    }
    return out
  }, [doc, settings.dayStart, settings.dayEnd, today])

  if (!task) return null
  const need = task.duration

  return (
    <Sheet title="Block time">
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        {titleOf(task)} · {durationText(need)}
      </p>
      <div className="stack" style={{ gap: 18 }}>
        {days.map(({ date, slots }) => (
          <div key={date}>
            <div className="q-label">
              {relativeDay(date, today)} {relativeDay(date, today) !== DAY_NAME[weekday(date)] && <span className="faint">· {DAY_NAME[weekday(date)]}</span>}
            </div>
            <div className="chips">
              {slots.map((s) => {
                const fits = s.minutes >= need
                const to = timeOf(Math.min(mins(s.end), mins(s.start) + need))
                return (
                  <button
                    key={s.start}
                    className={`chip slot-pick${fits ? '' : ' short'}`}
                    onClick={() => {
                      put('events', { id: uid(), updatedAt: 0, date, start: s.start, end: to, title: '', notes: '', taskId: task.id })
                      if (!task.plan || task.plan > date) useStore.getState().patch('tasks', task.id, { plan: date })
                      tick(12)
                      close()
                      notify(`Blocked ${relativeDay(date, today)} ${s.start}–${to}`)
                    }}
                  >
                    <span className="num">{s.start}</span>
                    <span className="faint num">{durationText(s.minutes)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/** Choose which open tasks to work on today. */
export function PickTodaySheet() {
  const tasks = useOpenTasks()
  const patch = useStore((s) => s.patch)
  const today = todayKey()
  const candidates = tasks.filter((t) => bucketOf(t, today) !== 'overdue')

  return (
    <Sheet title="Pick for today">
      {candidates.length ? (
        <div className="card list">
          {candidates.map((t) => {
            const on = bucketOf(t, today) === 'today'
            const locked = t.due === today
            return (
              <TaskPick
                key={t.id}
                task={t}
                selected={on}
                onPick={() => {
                  if (locked) return
                  tick(8)
                  patch('tasks', t.id, { plan: on ? null : today })
                }}
                trailing={locked ? 'Due today' : undefined}
              />
            )
          })}
        </div>
      ) : (
        <Empty icon={CheckIcon} text="Nothing open" />
      )}
    </Sheet>
  )
}
