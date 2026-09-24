import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, CalendarPlus, Check as CheckIcon, Clock3, Flag, Lock, Plus, Sun, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from '../../components/Check'
import { DateProp, SubjectChips } from '../../components/fields'
import { Sheet } from '../../components/Sheet'
import { Switch } from '../../components/Switch'
import type { ChecklistItem, Task, TaskSecret } from '../../data/types'
import { relativeDay, todayKey } from '../../lib/date'
import { uid } from '../../lib/haptics'
import { useDoc, useSubjects, useTaskSecret } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'
import { withPin } from '../add/QuickAdd'

const DURATIONS = [15, 30, 45, 60, 90, 120, 180]

/** Edits save as you go; closing never loses changes. */
export function TaskSheet({ id }: { id: string }) {
  const doc = useDoc()
  const task = doc.tasks.find((t) => t.id === id && !t.deleted)
  const secret = useTaskSecret(task)
  if (!task || !secret) return <Sheet title="Task">{task ? <p className="muted">This task is locked</p> : <p className="muted">This task no longer exists</p>}</Sheet>
  return <TaskEditor task={task} secret={secret} />
}

function TaskEditor({ task, secret }: { task: Task; secret: TaskSecret }) {
  const today = todayKey()
  const doc = useDoc()
  const { list: subjects } = useSubjects()
  const saveTask = useStore((s) => s.saveTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const restore = useStore((s) => s.restore)
  const { open, close, notify } = useUI.getState()

  const [draft, setDraft] = useState<Task>(task)
  const [sec, setSec] = useState<TaskSecret>(secret)
  const [newItem, setNewItem] = useState('')
  const dirty = useRef(false)
  const latest = useRef({ draft, sec })
  latest.current = { draft, sec }

  // Keep fields other devices/rows change (done state, blocks) in sync with the draft.
  useEffect(() => setDraft((d) => ({ ...d, doneAt: task.doneAt })), [task.doneAt])

  const flush = () => {
    if (!dirty.current) return
    dirty.current = false
    const { draft: d, sec: s } = latest.current
    const current = useStore.getState().doc.tasks.find((t) => t.id === d.id)
    if (!current || current.deleted) return
    saveTask({ ...current, ...d, doneAt: current.doneAt }, { ...s, title: s.title.trim() || secret.title }).catch(() =>
      useUI.getState().notify('Locked — unlock and edit again'),
    )
  }

  useEffect(() => {
    const t = setTimeout(flush, 500)
    return () => clearTimeout(t)
  }, [draft, sec]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => flush, []) // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (changes: Partial<Task>) => {
    dirty.current = true
    setDraft((d) => ({ ...d, ...changes }))
  }
  const editSec = (changes: Partial<TaskSecret>) => {
    dirty.current = true
    setSec((s) => ({ ...s, ...changes }))
  }
  const setItems = (checklist: ChecklistItem[]) => editSec({ checklist })

  const blocks = useMemo(() => live(doc.events).filter((e) => e.taskId === task.id && e.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)), [doc.events, task.id, today])
  const done = !!task.doneAt
  const subject = subjects.find((s) => s.id === draft.subjectId)
  const color = subject?.color ?? 'var(--accent)'

  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    setItems([...sec.checklist, { id: uid(), title: text, done: false }])
    setNewItem('')
  }

  return (
    <Sheet
      tall
      label={sec.title}
      title={
        <span className="sheet-kicker">
          {draft.private && <Lock size={14} />}
          {subject ? subject.short : 'Task'}
        </span>
      }
      footer={
        <>
          <button
            className="btn btn-danger"
            aria-label="Delete task"
            onClick={() => {
              dirty.current = false
              const snaps = deleteTask(task.id)
              close()
              notify('Task deleted', () => restore(snaps))
            }}
          >
            <Trash2 size={18} />
          </button>
          <button
            className={`btn ${done ? 'btn-quiet' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={() => {
              flush()
              toggleTask(task.id)
              if (!done) close()
            }}
          >
            <CheckIcon size={18} /> {done ? 'Not done' : 'Done'}
          </button>
        </>
      }
    >
      <div className="stack task-editor">
        <div className="te-title">
          <Check done={done} color={color} label="Done" onToggle={() => toggleTask(task.id)} />
          <textarea
            className="big-input"
            rows={1}
            value={sec.title}
            maxLength={180}
            placeholder="Task name"
            onChange={(e) => editSec({ title: e.target.value.replace(/\n/g, ' ') })}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }
            }}
          />
        </div>
        <label className="field">
          <textarea placeholder="Notes" value={sec.notes} rows={2} onChange={(e) => editSec({ notes: e.target.value })} />
        </label>

        <div className="te-block">
          <div className="q-label">Steps</div>
          <div className="prop-list checklist">
            <AnimatePresence initial={false}>
              {sec.checklist.map((c, i) => (
                <motion.div
                  key={c.id}
                  className={`prop cl-item${!c.done && sec.checklist.findIndex((x) => !x.done) === i ? ' next' : ''}`}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Check done={c.done} color={color} label={c.title} onToggle={() => setItems(sec.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
                  <input
                    className={`prop-label${c.done ? ' done-text' : ''}`}
                    value={c.title}
                    onChange={(e) => setItems(sec.checklist.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)))}
                  />
                  <button className="icon-btn plain sm" aria-label={`Remove step ${c.title}`} onClick={() => setItems(sec.checklist.filter((x) => x.id !== c.id))}>
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="prop">
              <Plus size={18} />
              <input
                className="prop-label"
                placeholder={sec.checklist.length ? 'Add a step' : 'Break it into a first small step'}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
                onBlur={addItem}
                enterKeyHint="enter"
              />
            </div>
          </div>
        </div>

        <div className="prop-list">
          <DateProp icon={<CalendarClock size={18} />} label="Due" value={draft.due} onChange={(due) => edit({ due })} today={today} />
          <DateProp icon={<Sun size={18} />} label="Do on" value={draft.plan} onChange={(plan) => edit({ plan })} today={today} />
          <div className="prop">
            <Flag size={18} />
            <span className="prop-label">Important</span>
            <Switch on={draft.flagged} onChange={(flagged) => edit({ flagged })} label="Important" />
          </div>
          <div className="prop">
            <Lock size={18} />
            <span className="prop-label">Private · PIN locked</span>
            <Switch
              on={draft.private}
              onChange={(v) => {
                if (v) withPin(() => edit({ private: true }))
                else edit({ private: false })
              }}
              label="Private"
            />
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="te-block">
            <div className="q-label">Subject</div>
            <SubjectChips subjects={subjects} value={draft.subjectId} onChange={(subjectId) => edit({ subjectId })} />
          </div>
        )}

        <div className="te-block">
          <div className="q-label">Takes about</div>
          <div className="chips">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className="chip num" aria-pressed={draft.duration === d} onClick={() => edit({ duration: d })}>
                {d < 60 ? `${d} min` : `${d / 60} hr`}
              </button>
            ))}
          </div>
        </div>

        <div className="te-block">
          <div className="q-label">Time blocks</div>
          <div className="prop-list">
            {blocks.map((b) => (
              <button key={b.id} className="prop" onClick={() => open({ type: 'event', id: b.id })}>
                <Clock3 size={18} />
                <span className="prop-label">{relativeDay(b.date, today)}</span>
                <span className="prop-value num">
                  {b.start}–{b.end}
                </span>
              </button>
            ))}
            <button className="prop accent-prop" onClick={() => open({ type: 'schedule', taskId: task.id })}>
              <CalendarPlus size={18} />
              <span className="prop-label">Block free time</span>
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
