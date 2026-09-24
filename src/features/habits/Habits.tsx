import { AnimatePresence, motion } from 'motion/react'
import { Archive, ChevronDown, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Empty } from '../../components/Empty'
import { iconFor } from '../../components/icons'
import { Page } from '../../components/Page'
import { addDays, DAY_LETTER, weekday, weekStart } from '../../lib/date'
import { tick } from '../../lib/haptics'
import { doneSet, isScheduled } from '../../lib/habits'
import { useNow } from '../../lib/useNow'
import { useDoc } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'
import { HabitButton } from './HabitButton'

export function Habits() {
  const { today } = useNow()
  const doc = useDoc()
  const open = useUI((s) => s.open)
  const patch = useStore((s) => s.patch)
  const [showArchived, setShowArchived] = useState(false)
  const habits = useMemo(() => live(doc.habits).sort((a, b) => a.order - b.order), [doc.habits])
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)
  const todayList = active.filter((h) => h.mode === 'context' || isScheduled(h, today))
  const doneToday = todayList.filter((h) => doneSet(doc.habitLogs, h.id).has(today)).length
  const others = active.filter((h) => !todayList.includes(h))

  return (
    <Page
      title="Habits"
      sub={todayList.length ? `${doneToday} of ${todayList.length} today` : undefined}
      right={
        <button className="icon-btn" aria-label="New habit" onClick={() => open({ type: 'habitEdit' })}>
          <Plus size={20} />
        </button>
      }
    >
      {active.length === 0 ? (
        <div className="card">
          <Empty
            icon={Plus}
            text="Start with one small habit"
            action={
              <button className="btn btn-quiet btn-sm" onClick={() => open({ type: 'habitEdit' })}>
                <Plus size={16} /> New habit
              </button>
            }
          />
        </div>
      ) : (
        <div className="habits-layout">
          <div className="card habit-grid">
            {todayList.map((h) => (
              <HabitButton key={h.id} habit={h} today={today} size={78} />
            ))}
            {others.map((h) => (
              <div key={h.id} className="habit-off">
                <HabitButton habit={h} today={today} size={78} />
              </div>
            ))}
          </div>

          <section className="section week-habits">
            <div className="section-h">
              <h2>This week</h2>
            </div>
            <WeekTable today={today} />
          </section>
        </div>
      )}

      {archived.length > 0 && (
        <section className="section">
          <button className="section-h done-toggle" onClick={() => setShowArchived(!showArchived)} aria-expanded={showArchived}>
            <h2 className="muted">
              <Archive size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Archived<span className="count num">{archived.length}</span>
            </h2>
            <motion.span animate={{ rotate: showArchived ? 180 : 0 }}>
              <ChevronDown size={18} className="muted" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.div className="card list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {archived.map((h) => {
                  const Icon = iconFor(h.icon)
                  return (
                    <div key={h.id} className="row" style={{ '--c': h.color } as CSSProperties}>
                      <span className="icon-tile sm">
                        <Icon size={17} />
                      </span>
                      <span className="row-main row-title">{h.title}</span>
                      <button className="btn btn-quiet btn-sm" onClick={() => patch('habits', h.id, { archived: false })}>
                        <RotateCcw size={15} /> Restore
                      </button>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </Page>
  )
}

/** Mon–Sun check-ins for every active habit; past days can be filled in. */
function WeekTable({ today }: { today: string }) {
  const doc = useDoc()
  const toggleHabit = useStore((s) => s.toggleHabit)
  const open = useUI((s) => s.open)
  const start = weekStart(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const habits = useMemo(() => live(doc.habits).filter((h) => !h.archived).sort((a, b) => a.order - b.order), [doc.habits])

  return (
    <div className="card week-table">
      <div className="wt-row wt-head">
        <span />
        {days.map((d) => (
          <span key={d} className={d === today ? 'today' : ''}>
            {DAY_LETTER[weekday(d)]}
          </span>
        ))}
      </div>
      {habits.map((h) => {
        const done = doneSet(doc.habitLogs, h.id)
        const Icon = iconFor(h.icon)
        return (
          <div key={h.id} className="wt-row" style={{ '--c': h.color } as CSSProperties}>
            <button className="wt-name" onClick={() => open({ type: 'habit', id: h.id })}>
              <Icon size={16} />
              <span>{h.title}</span>
            </button>
            {days.map((d) => {
              const on = done.has(d)
              const sched = isScheduled(h, d)
              const future = d > today
              const state = on ? 'on' : future || d === today ? (sched ? 'plan' : 'off') : sched && d >= h.createdAt ? 'miss' : 'off'
              return (
                <button
                  key={d}
                  className={`wt-cell ${state}`}
                  disabled={future}
                  aria-label={`${h.title} ${d}${on ? ' done' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    tick(8)
                    toggleHabit(h.id, d)
                  }}
                >
                  <motion.i initial={false} animate={{ scale: on ? 1 : 0.4 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }} />
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
