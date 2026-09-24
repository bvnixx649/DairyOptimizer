import { CalendarClock, Check as CheckIcon, Clock, Flag, ListChecks, Lock, Sun, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Check } from '../../components/Check'
import { SwipeRow } from '../../components/SwipeRow'
import type { Task } from '../../data/types'
import { daysBetween, relativeDay } from '../../lib/date'
import { useStore } from '../../store/store'
import { useSubjects, useTaskSecret } from '../../store/selectors'
import { useUI } from '../../store/ui'

interface Props {
  task: Task
  today: string
  /** Hide the subject chip when the list is already filtered by subject. */
  hideSubject?: boolean
  block?: string
}

export function useOpenTask() {
  const open = useUI((s) => s.open)
  const pinKey = useStore((s) => s.pinKey)
  return (t: Task) => {
    if (t.private && !pinKey) open({ type: 'pin', purpose: 'unlock', then: () => open({ type: 'task', id: t.id }) })
    else open({ type: 'task', id: t.id })
  }
}

export function useTaskActions() {
  const toggleTask = useStore((s) => s.toggleTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const restore = useStore((s) => s.restore)
  const notify = useUI((s) => s.notify)
  return {
    toggle: (t: Task, announce = false) => {
      const snaps = toggleTask(t.id)
      if (announce) notify(t.doneAt ? 'ย้ายกลับไปงานค้าง' : 'เสร็จแล้ว', () => restore(snaps))
    },
    remove: (t: Task) => {
      const snaps = deleteTask(t.id)
      notify('ลบงานแล้ว', () => restore(snaps))
    },
  }
}

export function TaskRow({ task, today, hideSubject, block }: Props) {
  const { byId } = useSubjects()
  const secret = useTaskSecret(task)
  const patch = useStore((s) => s.patch)
  const openTask = useOpenTask()
  const { toggle, remove } = useTaskActions()
  const subject = task.subjectId ? byId.get(task.subjectId) : undefined
  const color = subject?.color ?? 'var(--accent)'
  const done = !!task.doneAt
  const locked = task.private && !secret
  const title = locked ? 'งานส่วนตัว' : (secret?.title ?? task.title)
  const checklist = secret?.checklist ?? []
  const nextStep = checklist.find((c) => !c.done)
  const dueIn = task.due ? daysBetween(today, task.due) : null
  const plannedToday = !!task.plan && task.plan <= today

  return (
    <SwipeRow
      right={{ label: done ? 'ยังไม่เสร็จ' : 'เสร็จ', icon: CheckIcon, color: subject?.color ?? '#FF8059', run: () => toggle(task, true) }}
      left={
        done || plannedToday
          ? { label: 'ลบ', icon: Trash2, color: '#FF5C63', run: () => remove(task) }
          : { label: 'ทำวันนี้', icon: Sun, color: '#F2CF4A', run: () => patch('tasks', task.id, { plan: today }) }
      }
    >
      <div className="row hoverable task-row" role="button" tabIndex={0} onClick={() => openTask(task)} onKeyDown={(e) => e.key === 'Enter' && openTask(task)}>
        <Check done={done} color={color} label={`ทำเครื่องหมายเสร็จ: ${title}`} onToggle={() => toggle(task)} />
        <div className="row-main">
          <div className={`row-title${done ? ' done-text' : ''}`}>
            {locked && <Lock size={14} style={{ marginRight: 6, verticalAlign: '-1px', color: 'var(--text-2)' }} />}
            {title}
          </div>
          {!done && (
            <div className="row-meta">
              {subject && !hideSubject && (
                <span className="m" style={{ '--c': subject.color } as CSSProperties}>
                  <i className="dot-c" />
                  {subject.short}
                </span>
              )}
              {task.due && (
                <span className={`m${dueIn! < 0 ? ' warn' : dueIn! <= 1 ? ' hot' : ''}`}>
                  <CalendarClock size={13} />
                  {dueIn! < 0 ? `เลย ${-dueIn!} วัน` : `ส่ง${relativeDay(task.due, today)}`}
                </span>
              )}
              {block && (
                <span className="m">
                  <Clock size={13} />
                  {block}
                </span>
              )}
              {checklist.length > 0 && (
                <span className="m">
                  <ListChecks size={13} />
                  {checklist.filter((c) => c.done).length}/{checklist.length}
                  {nextStep && <span className="faint" style={{ marginLeft: 2 }}>· {nextStep.title}</span>}
                </span>
              )}
            </div>
          )}
        </div>
        {task.flagged && !done && <Flag size={16} color="var(--accent)" fill="var(--accent)" style={{ flex: 'none' }} />}
      </div>
    </SwipeRow>
  )
}
