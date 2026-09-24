import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, CalendarPlus, CircleCheckBig, MapPin, Plus, Settings2 } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Empty } from '../../components/Empty'
import { Page } from '../../components/Page'
import { LogoMark } from '../../components/Logo'
import { Ring } from '../../components/Ring'
import { agendaFor, freeSlots, roundUp5, type AgendaItem } from '../../lib/agenda'
import { addDays, DAY_NAME, durationText, mins, shortDate, weekday } from '../../lib/date'
import { isScheduled } from '../../lib/habits'
import { baht, summarize } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { bucketOf, sortTasks, useDoc, useSettings, useSubjects, useTitle } from '../../store/selectors'
import { live } from '../../store/store'
import { useUI } from '../../store/ui'
import { HabitButton } from '../habits/HabitButton'
import { TaskRow } from '../tasks/TaskRow'
import { SyncDot } from '../settings/SyncDot'
import { DayRibbon } from './DayRibbon'

const rowMotion = {
  layout: true,
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { type: 'spring', stiffness: 420, damping: 38 },
} as const

export function Today() {
  const doc = useDoc()
  const { today, minute } = useNow()
  const open = useUI((s) => s.open)
  const setTab = useUI((s) => s.setTab)

  const agenda = useMemo(() => agendaFor(doc, today), [doc, today])
  const tasks = useMemo(() => live(doc.tasks), [doc.tasks])
  const todays = useMemo(
    () => tasks.filter((t) => !t.doneAt && ['overdue', 'today'].includes(bucketOf(t, today))).sort(sortTasks),
    [tasks, today],
  )
  const finishedToday = useMemo(
    () => tasks.filter((t) => t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString()).sort((a, b) => a.doneAt! - b.doneAt!),
    [tasks, today], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const upcoming = useMemo(
    () => tasks.filter((t) => !t.doneAt && t.due && t.due > today && t.due <= addDays(today, 7) && bucketOf(t, today) !== 'today').sort(sortTasks).slice(0, 4),
    [tasks, today],
  )
  const habits = useMemo(
    () => live(doc.habits).filter((h) => !h.archived && (h.mode === 'context' || isScheduled(h, today))).sort((a, b) => a.order - b.order),
    [doc.habits, today],
  )
  const blocks = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of live(doc.events)) if (e.taskId && e.date === today) m.set(e.taskId, e.start)
    return m
  }, [doc.events, today])

  const total = todays.length + finishedToday.length
  const progress = total ? finishedToday.length / total : 0

  return (
    <Page
      title="วันนี้"
      sub={`${DAY_NAME[weekday(today)]} ${shortDate(today)}`}
      left={<LogoMark size={24} />}
      glow
      right={
        <>
          <SyncDot />
          <button className="icon-btn" aria-label="ตั้งค่า" onClick={() => open({ type: 'settings' })}>
            <Settings2 size={19} />
          </button>
        </>
      }
      aside={
        total > 0 && (
          <Ring value={progress} size={58} stroke={5}>
            <span className="num" style={{ fontSize: 14, fontWeight: 650 }}>
              {finishedToday.length}/{total}
            </span>
          </Ring>
        )
      }
    >
      <div className="today-grid">
        <div className="today-main">
          <NowCard agenda={agenda} today={today} minute={minute} onOpenPlan={() => setTab('plan')} />

          <section className="section">
            <div className="section-h">
              <h2>
                ต้องทำ<span className="count num">{todays.length || ''}</span>
              </h2>
              <button className="link-btn" onClick={() => open({ type: 'pickToday' })}>
                <Plus size={16} /> เลือกงาน
              </button>
            </div>
            {todays.length + finishedToday.length === 0 ? (
              <div className="card">
                <Empty
                  icon={CircleCheckBig}
                  text="ไม่มีงานสำหรับวันนี้"
                  action={
                    <button className="btn btn-quiet btn-sm" onClick={() => open({ type: 'quick', mode: 'task', date: today })}>
                      <Plus size={16} /> เพิ่มงาน
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="card list">
                <AnimatePresence initial={false}>
                  {[...todays, ...finishedToday].map((t) => (
                    <motion.div key={t.id} {...rowMotion}>
                      <TaskRow task={t} today={today} block={blocks.get(t.id)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="section">
              <div className="section-h">
                <h2>ใกล้ถึงกำหนด</h2>
                <button className="link-btn" onClick={() => setTab('tasks')}>
                  ทั้งหมด <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="card list">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="today-side">
          <section className="section">
            <div className="section-h">
              <h2>นิสัย</h2>
              <button className="link-btn" onClick={() => setTab('habits')}>
                ทั้งหมด <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="card habit-strip">
              {habits.length ? (
                habits.map((h) => <HabitButton key={h.id} habit={h} today={today} size={60} />)
              ) : (
                <Empty icon={Plus} text="ยังไม่มีนิสัยที่ติดตาม" />
              )}
            </div>
          </section>

          <MoneyGlance today={today} onOpen={() => setTab('money')} />
        </div>
      </div>
    </Page>
  )
}

function NowCard({ agenda, today, minute, onOpenPlan }: { agenda: AgendaItem[]; today: string; minute: number; onOpenPlan: () => void }) {
  const doc = useDoc()
  const settings = useSettings()
  const { byId } = useSubjects()
  const titleOf = useTitle()
  const open = useUI((s) => s.open)
  const current = agenda.find((i) => mins(i.start) <= minute && minute < mins(i.end))
  const next = agenda.find((i) => mins(i.start) > minute)
  const slot = freeSlots(agenda, settings.dayStart, settings.dayEnd, roundUp5(minute))[0]
  const tomorrow = agendaFor(doc, addDays(today, 1))[0]

  const describe = (i: AgendaItem) => {
    if (i.kind === 'class') {
      const s = byId.get(i.slot.subjectId)
      return { title: s?.name ?? 'วิชาเรียน', color: s?.color ?? '#8FA3BF', place: i.slot.room, onClick: () => s && open({ type: 'subject', id: s.id }) }
    }
    const task = i.event.taskId ? doc.tasks.find((t) => t.id === i.event.taskId) : undefined
    return {
      title: task ? titleOf(task) : i.event.title,
      color: task ? '#FF8059' : '#8FA3BF',
      place: task ? 'เวลาทำงาน' : i.event.notes.split('\n')[0],
      onClick: () => (task ? open({ type: 'task', id: task.id }) : open({ type: 'event', id: i.event.id })),
    }
  }

  const focus = current ?? next
  const info = focus && describe(focus)

  return (
    <div className="card now-card">
      <DayRibbon items={agenda} subjects={byId} dayStart={settings.dayStart} dayEnd={settings.dayEnd} now={minute} onClick={onOpenPlan} />
      {info && focus ? (
        <button className="now-item" onClick={info.onClick} style={{ '--c': info.color } as CSSProperties}>
          <span className="now-bar" />
          <span className="now-text">
            <span className="now-label">
              {current ? `ตอนนี้ · เหลือ ${durationText(mins(focus.end) - minute)}` : `ถัดไป · อีก ${durationText(mins(focus.start) - minute)}`}
            </span>
            <span className="now-title">{info.title}</span>
            <span className="now-meta num">
              {focus.start}–{focus.end}
              {info.place && (
                <>
                  <MapPin size={13} /> {info.place}
                </>
              )}
            </span>
          </span>
          {current && (
            <Ring value={(minute - mins(focus.start)) / (mins(focus.end) - mins(focus.start))} size={40} stroke={4} color={info.color} />
          )}
        </button>
      ) : (
        <div className="now-item idle">
          <span className="now-text">
            <span className="now-title">ว่างตลอดที่เหลือของวัน</span>
            {tomorrow && (
              <span className="now-meta">
                พรุ่งนี้ {tomorrow.start} ·{' '}
                {tomorrow.kind === 'class' ? byId.get(tomorrow.slot.subjectId)?.short : tomorrow.event.title}
              </span>
            )}
          </span>
        </div>
      )}
      {slot && (
        <button className="slot-chip" onClick={() => open({ type: 'slot', date: today, start: slot.start, end: slot.end })}>
          <CalendarPlus size={16} />
          <span>
            ว่าง <span className="num">{slot.start}–{slot.end}</span>
          </span>
          <span className="faint">{durationText(slot.minutes)}</span>
        </button>
      )}
    </div>
  )
}

function MoneyGlance({ today, onOpen }: { today: string; onOpen: () => void }) {
  const txs = useDoc().txs
  const settings = useSettings()
  const open = useUI((s) => s.open)
  const month = today.slice(0, 7)
  const sum = useMemo(() => summarize(txs, month), [txs, month])
  const spentToday = useMemo(() => live(txs).filter((t) => t.type === 'expense' && t.date === today).reduce((s, t) => s + t.amount, 0), [txs, today])
  const budget = settings.budget

  return (
    <section className="section">
      <div className="section-h">
        <h2>เงินเดือนนี้</h2>
        <button className="link-btn" onClick={onOpen}>
          ดู <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="card card-pad money-glance">
        <div className="mg-row">
          <div>
            <div className="mg-label">ใช้ไป</div>
            <div className="mg-amount num">฿{baht(sum.expense)}</div>
          </div>
          <button className="btn btn-quiet btn-sm" onClick={() => open({ type: 'quick', mode: 'expense' })}>
            <Plus size={16} /> รายจ่าย
          </button>
        </div>
        {budget ? (
          <>
            <div className="bar" style={{ marginTop: 14 }}>
              <motion.i
                initial={false}
                animate={{ width: `${Math.min(100, (sum.expense / budget) * 100)}%` }}
                style={{ '--c': sum.expense > budget ? 'var(--danger)' : 'var(--accent)' } as CSSProperties}
              />
            </div>
            <div className="mg-foot">
              <span>
                {sum.expense > budget ? 'เกินงบ' : 'เหลือ'} <b className="num">฿{baht(Math.abs(budget - sum.expense))}</b>
              </span>
              <span className="num">วันนี้ ฿{baht(spentToday)}</span>
            </div>
          </>
        ) : (
          <div className="mg-foot">
            <span className="num">วันนี้ ฿{baht(spentToday)}</span>
            <button className="link-btn accent" onClick={() => open({ type: 'budget' })}>
              ตั้งงบรายเดือน
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
