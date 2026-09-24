import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, CalendarClock, Plus } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Page } from '../../components/Page'
import { Segmented } from '../../components/Segmented'
import { agendaFor, freeSlots, roundUp5 } from '../../lib/agenda'
import { addDays, addMonths, DAY_LETTER, DAY_NAME, dueText, durationText, monthOf, monthTitle, parseDate, relativeDay, shortDate, weekday, weekStart } from '../../lib/date'
import { useTablet } from '../../lib/useMedia'
import { useNow } from '../../lib/useNow'
import { sortTasks, useDoc, useSettings, useSubjects } from '../../store/selectors'
import { live } from '../../store/store'
import { useUI } from '../../store/ui'
import { TaskRow } from '../tasks/TaskRow'
import { DayTimeline } from './DayTimeline'
import { MonthGrid } from './MonthGrid'
import { WeekGrid } from './WeekGrid'

type View = 'day' | 'week' | 'month'
const VIEW_KEY = 'achieve-plan-view'

const readView = (tablet: boolean): View => {
  try {
    const v = localStorage.getItem(VIEW_KEY) as View | null
    if (v === 'day' || v === 'week' || v === 'month') return v
  } catch {
    /* ignore */
  }
  return tablet ? 'week' : 'day'
}

export function Plan() {
  const { today, minute } = useNow()
  const tablet = useTablet()
  const open = useUI((s) => s.open)
  const [view, setViewState] = useState<View>(() => readView(tablet))
  const [selected, setSelected] = useState(today)
  const [dir, setDir] = useState(0)

  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  const step = (n: number) => {
    setDir(n)
    if (view === 'day') setSelected(addDays(selected, n))
    else if (view === 'week') setSelected(addDays(selected, 7 * n))
    else setSelected(`${addMonths(monthOf(selected), n)}-01`)
  }

  const label =
    view === 'month'
      ? monthTitle(monthOf(selected))
      : view === 'week'
        ? `${shortDate(weekStart(selected))} – ${shortDate(addDays(weekStart(selected), 6))}`
        : monthTitle(monthOf(selected))

  const pageKey = view === 'day' ? weekStart(selected) : view === 'week' ? weekStart(selected) : monthOf(selected)

  return (
    <Page
      title="Schedule"
      right={
        <button className="icon-btn" aria-label="New event" onClick={() => open({ type: 'event', date: selected })}>
          <Plus size={20} />
        </button>
      }
    >
      <div className="plan-bar">
        <Segmented
          value={view}
          onChange={setView}
          label="View"
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
      </div>

      <div className="plan-nav">
        <button className="icon-btn sm plain" aria-label="Previous" onClick={() => step(-1)}>
          <ChevronLeft size={20} />
        </button>
        <span className="plan-label">{label}</span>
        <button className="icon-btn sm plain" aria-label="Next" onClick={() => step(1)}>
          <ChevronRight size={20} />
        </button>
        <span style={{ flex: 1 }} />
        {selected !== today && (
          <button className="chip" onClick={() => setSelected(today)}>
            Today
          </button>
        )}
      </div>

      <div className={`plan-grid view-${view}`}>
        <div className="plan-main">
          {view === 'day' && <WeekStrip start={weekStart(selected)} selected={selected} today={today} onSelect={setSelected} onSwipe={step} />}

          <motion.div
            key={`${view}-${view === 'day' ? selected : pageKey}`}
            initial={{ opacity: 0, x: dir * 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            {view === 'week' && (
              <WeekGrid
                start={weekStart(selected)}
                today={today}
                minute={minute}
                selected={selected}
                onSelect={(d) => {
                  setSelected(d)
                  if (!tablet) setView('day')
                }}
              />
            )}
            {view === 'month' && <MonthGrid month={monthOf(selected)} today={today} selected={selected} onSelect={setSelected} />}
            {view === 'day' && <DayDetail date={selected} today={today} minute={minute} />}
          </motion.div>
        </div>

        {view !== 'day' && (
          <aside className="plan-side">
            <DayDetail date={selected} today={today} minute={minute} compact />
          </aside>
        )}
      </div>

      <SubjectsRow today={today} />
    </Page>
  )
}

function WeekStrip({ start, selected, today, onSelect, onSwipe }: { start: string; selected: string; today: string; onSelect: (d: string) => void; onSwipe: (n: number) => void }) {
  const doc = useDoc()
  const dueDays = useMemo(() => new Set(live(doc.tasks).filter((t) => !t.doneAt && t.due).map((t) => t.due!)), [doc.tasks])
  const swiped = useRef(false)
  return (
    <motion.div
      className="week-strip"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragDirectionLock
      style={{ touchAction: 'pan-y' }}
      onPointerDownCapture={() => (swiped.current = false)}
      onDragStart={() => (swiped.current = true)}
      onClickCapture={(e) => swiped.current && (e.stopPropagation(), (swiped.current = false))}
      onDragEnd={(_, i) => {
        if (i.offset.x < -60) onSwipe(1)
        else if (i.offset.x > 60) onSwipe(-1)
      }}
    >
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => (
        <button key={d} className={`ws-day${d === selected ? ' sel' : ''}${d === today ? ' today' : ''}`} onClick={() => onSelect(d)} aria-pressed={d === selected}>
          <span className="ws-letter">{DAY_LETTER[weekday(d)]}</span>
          <span className="ws-num num">{parseDate(d).getDate()}</span>
          <i className={dueDays.has(d) ? 'on' : ''} />
        </button>
      ))}
    </motion.div>
  )
}

function DayDetail({ date, today, minute, compact }: { date: string; today: string; minute: number; compact?: boolean }) {
  const doc = useDoc()
  const settings = useSettings()
  const open = useUI((s) => s.open)
  const due = useMemo(() => live(doc.tasks).filter((t) => !t.doneAt && t.due === date).sort(sortTasks), [doc.tasks, date])
  const items = useMemo(() => agendaFor(doc, date), [doc, date])
  const free = useMemo(
    () => freeSlots(items, settings.dayStart, settings.dayEnd, date === today ? roundUp5(minute) : undefined).reduce((s, x) => s + x.minutes, 0),
    [items, settings.dayStart, settings.dayEnd, date, today, minute],
  )
  const classes = items.filter((i) => i.kind === 'class').length

  return (
    <div className="day-detail">
      <div className="dd-head">
        <div>
          <h2 className="dd-title">
            {compact ? `${DAY_NAME[weekday(date)]}, ${shortDate(date)}` : `${relativeDay(date, today) === DAY_NAME[weekday(date)] ? '' : relativeDay(date, today) + ' · '}${DAY_NAME[weekday(date)]}`}
          </h2>
          <p className="muted dd-sub">
            {[classes ? `${classes} ${classes === 1 ? 'class' : 'classes'}` : '', date >= today && free ? `${durationText(free)} free` : ''].filter(Boolean).join(' · ') || 'Nothing scheduled'}
          </p>
        </div>
      </div>

      {due.length > 0 && (
        <div className="card list dd-due">
          <div className="dd-due-h">
            <CalendarClock size={15} /> {dueText(date, today)}
          </div>
          {due.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
        </div>
      )}

      {items.length || date >= today ? (
        <DayTimeline date={date} today={today} minute={minute} />
      ) : null}

      {!compact && (
        <button className="add-inline" onClick={() => open({ type: 'event', date })}>
          <Plus size={18} /> Event
        </button>
      )}
    </div>
  )
}

function SubjectsRow({ today }: { today: string }) {
  const doc = useDoc()
  const { list } = useSubjects()
  const open = useUI((s) => s.open)
  const stats = useMemo(() => {
    const m = new Map<string, { open: number; next: string | null }>()
    for (const s of list) {
      const tasks = live(doc.tasks).filter((t) => t.subjectId === s.id && !t.doneAt)
      const nextDue = tasks.map((t) => t.due).filter((d): d is string => !!d && d >= today).sort()[0] ?? null
      m.set(s.id, { open: tasks.length, next: nextDue })
    }
    return m
  }, [doc.tasks, list, today])

  if (!list.length) return null
  return (
    <section className="section">
      <div className="section-h">
        <h2>Subjects</h2>
      </div>
      <div className="subject-grid">
        {list.map((s) => {
          const st = stats.get(s.id)!
          return (
            <button key={s.id} className="subject-card" style={{ '--c': s.color } as CSSProperties} onClick={() => open({ type: 'subject', id: s.id })}>
              <span className="sc-top">
                <span className="sc-short">{s.short}</span>
                <span className="sc-code num">{s.code}</span>
              </span>
              <span className="sc-name">{s.name}</span>
              <span className="sc-foot">
                {st.open ? (
                  <>
                    <b className="num">{st.open}</b> open{st.next && <span className="faint"> · {dueText(st.next, today)}</span>}
                  </>
                ) : (
                  <span className="faint">Nothing open</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
