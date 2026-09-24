import { MapPin, Pencil, Plus } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Sheet } from '../../components/Sheet'
import { DAY_NAME } from '../../lib/date'
import { useNow } from '../../lib/useNow'
import { sortTasks, useDoc, useSubjects } from '../../store/selectors'
import { live } from '../../store/store'
import { useUI } from '../../store/ui'
import { TaskRow } from '../tasks/TaskRow'

export function SubjectSheet({ id }: { id: string }) {
  const doc = useDoc()
  const { byId } = useSubjects()
  const { today } = useNow()
  const open = useUI((s) => s.open)
  const s = byId.get(id)
  const classes = useMemo(
    () => live(doc.classes).filter((c) => c.subjectId === id).sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start)),
    [doc.classes, id],
  )
  const tasks = useMemo(() => live(doc.tasks).filter((t) => t.subjectId === id), [doc.tasks, id])
  const openTasks = tasks.filter((t) => !t.doneAt).sort(sortTasks)
  const doneCount = tasks.length - openTasks.length

  if (!s) return <Sheet title="วิชา">ไม่พบวิชานี้</Sheet>

  return (
    <Sheet
      tall
      label={s.name}
      title={<span className="sheet-kicker num">{s.code}</span>}
      actions={
        <button className="icon-btn sm" aria-label="แก้ไขวิชา" onClick={() => open({ type: 'subjectEdit', id })}>
          <Pencil size={16} />
        </button>
      }
    >
      <div className="subject-hero" style={{ '--c': s.color } as CSSProperties}>
        <span className="sh-short">{s.short}</span>
        <h2 className="sh-name">{s.name}</h2>
        {s.thai && <p className="muted">{s.thai}</p>}
      </div>

      <div className="q-label" style={{ marginTop: 22 }}>
        เวลาเรียน
      </div>
      <div className="prop-list">
        {classes.map((c) => (
          <button key={c.id} className="prop" onClick={() => open({ type: 'classEdit', id: c.id })}>
            <span className="prop-label">{DAY_NAME[c.day]}</span>
            <span className="prop-value num">
              {c.start}–{c.end}
              <MapPin size={13} /> {c.room}
            </span>
          </button>
        ))}
        <button className="prop accent-prop" onClick={() => open({ type: 'classEdit', subjectId: id })}>
          <Plus size={18} />
          <span className="prop-label">เพิ่มคาบ</span>
        </button>
      </div>

      <div className="section-h" style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 16 }}>
          งาน<span className="count num">{openTasks.length || ''}</span>
        </h2>
        {doneCount > 0 && <span className="faint" style={{ fontSize: 14 }}>เสร็จแล้ว {doneCount}</span>}
      </div>
      {openTasks.length > 0 && (
        <div className="card list">
          {openTasks.map((t) => (
            <TaskRow key={t.id} task={t} today={today} hideSubject />
          ))}
        </div>
      )}
      <button className="add-inline" style={{ marginTop: 10 }} onClick={() => open({ type: 'quick', mode: 'task', subjectId: id })}>
        <Plus size={18} /> งานของวิชานี้
      </button>
    </Sheet>
  )
}
