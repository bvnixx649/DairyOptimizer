import { AlertTriangle, Clock3, MapPin, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { SubjectChips } from '../../components/fields'
import { Sheet } from '../../components/Sheet'
import { PALETTE } from '../../data/seed'
import type { ClassSlot, Subject } from '../../data/types'
import { DAY_LETTER } from '../../lib/date'
import { uid } from '../../lib/haptics'
import { useDoc, useSubjects } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'

export function ClassEditSheet({ id, subjectId }: { id?: string; subjectId?: string }) {
  const doc = useDoc()
  const { list, byId } = useSubjects()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { close, notify } = useUI.getState()
  const existing = id ? doc.classes.find((c) => c.id === id) : undefined
  const [sub, setSub] = useState<string | null>(existing?.subjectId ?? subjectId ?? list[0]?.id ?? null)
  const [day, setDay] = useState(existing?.day ?? 1)
  const [start, setStart] = useState(existing?.start ?? '09:00')
  const [end, setEnd] = useState(existing?.end ?? '10:50')
  const [room, setRoom] = useState(existing?.room ?? '')
  const clash = live(doc.classes).find((c) => c.id !== id && c.day === day && start < c.end && end > c.start)
  const valid = sub && start < end && room.trim()

  const save = () => {
    if (!valid) return
    const c: ClassSlot = { id: existing?.id ?? uid(), updatedAt: existing?.updatedAt ?? 0, subjectId: sub!, day, start, end, room: room.trim() }
    put('classes', c)
    close()
    notify('Timetable saved')
  }

  return (
    <Sheet
      title={existing ? 'Edit class' : 'Add class'}
      footer={
        <>
          {existing && (
            <button
              className="btn btn-danger"
              aria-label="Delete class"
              onClick={() => {
                const snaps = remove('classes', [existing.id])
                close()
                notify('Class deleted', () => restore(snaps))
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn-primary" disabled={!valid} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="stack">
        <div>
          <div className="q-label">Subject</div>
          <SubjectChips subjects={list} value={sub} onChange={(v) => v && setSub(v)} />
        </div>
        <div>
          <div className="q-label">Day</div>
          <div className="weekday-pick">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={day === d} onClick={() => setDay(d)}>
                {DAY_LETTER[d]}
              </button>
            ))}
          </div>
        </div>
        <div className="prop-list">
          <label className="prop">
            <Clock3 size={18} />
            <span className="prop-label">Start</span>
            <input type="time" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
          </label>
          <label className="prop">
            <Clock3 size={18} style={{ opacity: 0 }} />
            <span className="prop-label">End</span>
            <input type="time" value={end} onChange={(e) => e.target.value && setEnd(e.target.value)} />
          </label>
          <label className="prop">
            <MapPin size={18} />
            <span className="prop-label">Room</span>
            <input style={{ textAlign: 'right', width: 120 }} placeholder="SC2-307" value={room} maxLength={80} onChange={(e) => setRoom(e.target.value)} />
          </label>
        </div>
        {start >= end && <div className="note warn">End must be after start</div>}
        {clash && (
          <div className="note warn">
            <AlertTriangle size={16} />
            Overlaps {byId.get(clash.subjectId)?.short} {clash.start}–{clash.end}
          </div>
        )}
      </div>
    </Sheet>
  )
}

export function SubjectEditSheet({ id }: { id?: string }) {
  const doc = useDoc()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { close, notify } = useUI.getState()
  const existing = id ? doc.subjects.find((s) => s.id === id) : undefined
  const [code, setCode] = useState(existing?.code ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [thai, setThai] = useState(existing?.thai ?? '')
  const [short, setShort] = useState(existing?.short ?? '')
  const [color, setColor] = useState(existing?.color ?? PALETTE[1])
  const valid = name.trim() && short.trim()

  const save = () => {
    if (!valid) return
    const s: Subject = { id: existing?.id ?? `sub-${uid()}`, updatedAt: existing?.updatedAt ?? 0, code: code.trim(), name: name.trim(), thai: thai.trim(), short: short.trim().slice(0, 10), color }
    put('subjects', s)
    close()
    notify('Subject saved')
  }

  return (
    <Sheet
      title={existing ? 'Edit subject' : 'New subject'}
      footer={
        <>
          {existing && (
            <button
              className="btn btn-danger"
              aria-label="Delete subject"
              onClick={() => {
                const cls = doc.classes.filter((c) => c.subjectId === existing.id && !c.deleted).map((c) => c.id)
                const snaps = [...remove('subjects', [existing.id]), ...remove('classes', cls)]
                close(2)
                notify('Subject deleted', () => restore(snaps))
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn-primary" disabled={!valid} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field-row">
          <label className="field">
            <span className="field-label">Short name</span>
            <input value={short} maxLength={10} placeholder="Algo" onChange={(e) => setShort(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Course code</span>
            <input value={code} maxLength={20} placeholder="254383-2" onChange={(e) => setCode(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Thai name</span>
          <input value={thai} maxLength={200} onChange={(e) => setThai(e.target.value)} />
        </label>
        <div>
          <div className="q-label">Colour</div>
          <div className="color-pick">
            {PALETTE.map((c) => (
              <button key={c} type="button" aria-pressed={color === c} aria-label={c} style={{ '--c': c } as CSSProperties} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
