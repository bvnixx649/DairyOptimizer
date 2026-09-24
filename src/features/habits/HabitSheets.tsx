import { Archive, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { HABIT_ICONS, iconFor } from '../../components/icons'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { PALETTE } from '../../data/seed'
import type { Habit, HabitMode } from '../../data/types'
import { addDays, DAY_LETTER, MONTH_SHORT, parseDate, todayKey, weekStart } from '../../lib/date'
import { tick, uid } from '../../lib/haptics'
import { bestStreak, doneSet, isScheduled, rate, streak } from '../../lib/habits'
import { useDoc } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'
import { HabitButton } from './HabitButton'

const WEEKS = 17

export function HabitSheet({ id }: { id: string }) {
  const doc = useDoc()
  const today = todayKey()
  const toggleHabit = useStore((s) => s.toggleHabit)
  const patch = useStore((s) => s.patch)
  const { open, close, notify } = useUI.getState()
  const h = doc.habits.find((x) => x.id === id && !x.deleted)
  const done = useMemo(() => doneSet(doc.habitLogs, id), [doc.habitLogs, id])

  if (!h) return <Sheet title="นิสัย">ไม่พบนิสัยนี้แล้ว</Sheet>

  const run = streak(h, done, today)
  const best = bestStreak(h, done, today)
  const r = rate(h, done, today, 30)
  const first = addDays(weekStart(today), -7 * (WEEKS - 1))
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)))
  const unit = h.mode === 'context' ? 'สัปดาห์' : 'วัน'

  return (
    <Sheet
      label={h.title}
      title=" "
      actions={
        <button className="icon-btn sm" aria-label="แก้ไข" onClick={() => open({ type: 'habitEdit', id })}>
          <Pencil size={16} />
        </button>
      }
      footer={
        <button
          className="btn btn-quiet"
          style={{ flex: 1 }}
          onClick={() => {
            patch('habits', id, { archived: true })
            close()
            notify('เก็บนิสัยไว้แล้ว', () => patch('habits', id, { archived: false }))
          }}
        >
          <Archive size={17} /> เก็บไว้ก่อน
        </button>
      }
    >
      <div className="habit-hero" style={{ '--c': h.color } as CSSProperties}>
        <HabitButton habit={h} today={today} size={96} />
        {h.cue && <p className="muted">{h.cue}</p>}
      </div>

      <div className="stat-row" style={{ '--c': h.color } as CSSProperties}>
        <div className="stat">
          <span className="stat-v num">{run}</span>
          <span className="stat-l">ติดต่อกัน ({unit})</span>
        </div>
        <div className="stat">
          <span className="stat-v num">{best}</span>
          <span className="stat-l">ดีที่สุด</span>
        </div>
        <div className="stat">
          <span className="stat-v num">{h.mode === 'context' ? r.hits : `${Math.round(r.ratio * 100)}%`}</span>
          <span className="stat-l">{h.mode === 'context' ? 'ครั้งใน 30 วัน' : '30 วันล่าสุด'}</span>
        </div>
      </div>

      <div className="heatmap" style={{ '--c': h.color } as CSSProperties} role="grid" aria-label="ประวัติ">
        <div className="hm-days" aria-hidden="true">
          {[1, 3, 5].map((d) => (
            <span key={d} style={{ gridRow: ((d + 6) % 7) + 2 }}>
              {DAY_LETTER[d]}
            </span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} className="hm-week">
            <span className="hm-month" aria-hidden="true">
              {parseDate(week[0]).getDate() <= 7 ? MONTH_SHORT[parseDate(week[0]).getMonth()] : ''}
            </span>
            {week.map((d) => {
              const on = done.has(d)
              const future = d > today
              return (
                <button
                  key={d}
                  className={`hm-cell${on ? ' on' : ''}${future ? ' future' : ''}${d === today ? ' today' : ''}${!on && !future && isScheduled(h, d) && d >= h.createdAt && d < today ? ' miss' : ''}`}
                  disabled={future}
                  aria-label={`${d}${on ? ' ทำแล้ว' : ''}`}
                  onClick={() => {
                    tick(6)
                    toggleHabit(id, d)
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </Sheet>
  )
}

const MODES: { value: HabitMode; label: string }[] = [
  { value: 'daily', label: 'ทุกวัน' },
  { value: 'days', label: 'บางวัน' },
  { value: 'context', label: 'เมื่อมีโอกาส' },
]

export function HabitEditSheet({ id }: { id?: string }) {
  const doc = useDoc()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { close, notify } = useUI.getState()
  const existing = id ? doc.habits.find((h) => h.id === id) : undefined
  const [title, setTitle] = useState(existing?.title ?? '')
  const [cue, setCue] = useState(existing?.cue ?? '')
  const [mode, setMode] = useState<HabitMode>(existing?.mode ?? 'daily')
  const [days, setDays] = useState<number[]>(existing?.mode === 'days' ? existing.days : [1, 2, 3, 4, 5])
  const [icon, setIcon] = useState(existing?.icon ?? 'book-open')
  const [color, setColor] = useState(existing?.color ?? PALETTE[1])
  const valid = title.trim() && (mode !== 'days' || days.length > 0)

  const save = () => {
    if (!valid) return
    const today = todayKey()
    const habit: Habit = {
      id: existing?.id ?? uid(),
      updatedAt: existing?.updatedAt ?? 0,
      title: title.trim(),
      cue: cue.trim(),
      mode,
      days: mode === 'days' ? [...days].sort() : [0, 1, 2, 3, 4, 5, 6],
      icon,
      color,
      createdAt: existing?.createdAt ?? today,
      archived: existing?.archived ?? false,
      order: existing?.order ?? Math.max(-1, ...live(doc.habits).map((h) => h.order)) + 1,
    }
    put('habits', habit)
    close()
    notify(existing ? 'บันทึกแล้ว' : 'เพิ่มนิสัยแล้ว')
  }

  const Preview = iconFor(icon)

  return (
    <Sheet
      title={existing ? 'แก้ไขนิสัย' : 'นิสัยใหม่'}
      footer={
        <>
          {existing && (
            <button
              className="btn btn-danger"
              aria-label="ลบนิสัย"
              onClick={() => {
                const logs = doc.habitLogs.filter((l) => l.habitId === existing.id && !l.deleted).map((l) => l.id)
                const snaps = [...remove('habits', [existing.id]), ...remove('habitLogs', logs)]
                close(2)
                notify('ลบนิสัยแล้ว', () => restore(snaps))
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn-primary" disabled={!valid} onClick={save}>
            {existing ? 'บันทึก' : 'เพิ่มนิสัย'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="habit-edit-top" style={{ '--c': color } as CSSProperties}>
          <span className="icon-tile" style={{ width: 52, height: 52, borderRadius: 18 }}>
            <Preview size={24} />
          </span>
          <input className="big-input" autoFocus={!existing} placeholder="อยากทำอะไรให้เป็นนิสัย" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <label className="field">
          <span className="field-label">เมื่อไหร่ / ที่ไหน</span>
          <input placeholder="เช่น หลังกินข้าวเย็น" value={cue} maxLength={160} onChange={(e) => setCue(e.target.value)} />
        </label>

        <Segmented value={mode} onChange={setMode} options={MODES} label="ความถี่" />
        {mode === 'days' && (
          <div className="weekday-pick">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>
                {DAY_LETTER[d]}
              </button>
            ))}
          </div>
        )}
        {mode === 'context' && <p className="muted" style={{ fontSize: 14 }}>ไม่นับว่าพลาดในวันที่ไม่มีโอกาสทำ</p>}

        <div>
          <div className="q-label">ไอคอน</div>
          <div className="icon-pick" style={{ '--c': color } as CSSProperties}>
            {HABIT_ICONS.map((name) => {
              const I = iconFor(name)
              return (
                <button key={name} type="button" aria-pressed={icon === name} aria-label={name} onClick={() => setIcon(name)}>
                  <I size={20} />
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <div className="q-label">สี</div>
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
