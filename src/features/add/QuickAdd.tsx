import { motion } from 'motion/react'
import { Lock, StickyNote } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { AmountPad, CategoryPicker, DateChip, formatTyped, SubjectChips } from '../../components/fields'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { Switch } from '../../components/Switch'
import { categoryFor, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/seed'
import type { Task, TxType } from '../../data/types'
import { addDays, mins, timeOf, todayKey } from '../../lib/date'
import { uid } from '../../lib/haptics'
import { baht, parseBaht } from '../../lib/money'
import { useSubjects } from '../../store/selectors'
import { getSettings, useStore } from '../../store/store'
import { useUI, type QuickMode, type Sheet as SheetT } from '../../store/ui'
import { EventForm } from '../plan/EventSheet'

type QuickSheet = Extract<SheetT, { type: 'quick' }>

const MODES: { value: QuickMode; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'expense', label: 'Spend' },
  { value: 'income', label: 'Income' },
  { value: 'event', label: 'Event' },
]

export function QuickAdd({ sheet }: { sheet: QuickSheet }) {
  const [mode, setMode] = useState<QuickMode>(sheet.mode)
  return (
    <Sheet label="Add" title={<Segmented value={mode} options={MODES} onChange={setMode} label="Type" />}>
      <motion.div key={mode} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
        {mode === 'task' && <TaskQuick sheet={sheet} />}
        {(mode === 'expense' || mode === 'income') && <TxQuick type={mode} key={mode} />}
        {mode === 'event' && <EventForm date={sheet.date} start={sheet.start} end={sheet.end} />}
      </motion.div>
    </Sheet>
  )
}

/** Runs `then` once private tasks can be sealed (asks for or sets the PIN first). */
export function withPin(then: () => void) {
  const { pinKey, doc } = useStore.getState()
  if (pinKey) return then()
  useUI.getState().open({ type: 'pin', purpose: getSettings(doc).pin ? 'unlock' : 'set', then })
}

const DURATIONS = [15, 30, 60, 90, 120]

function TaskQuick({ sheet }: { sheet: QuickSheet }) {
  const today = todayKey()
  const { list: subjects } = useSubjects()
  const saveTask = useStore((s) => s.saveTask)
  const put = useStore((s) => s.put)
  const { close, notify } = useUI.getState()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<string | null>(sheet.date && !sheet.start ? sheet.date : null)
  const [subjectId, setSubjectId] = useState<string | null>(sheet.subjectId ?? null)
  const slotMinutes = sheet.start && sheet.end ? mins(sheet.end) - mins(sheet.start) : null
  const [duration, setDuration] = useState(slotMinutes ? Math.min(60, slotMinutes) : 30)
  const [priv, setPriv] = useState(false)

  const submit = () => {
    const text = title.trim()
    if (!text) return
    const now = Date.now()
    const task: Task = {
      id: uid(),
      updatedAt: now,
      title: '',
      notes: '',
      checklist: [],
      due,
      plan: sheet.start ? sheet.date! : null,
      subjectId,
      duration,
      flagged: false,
      doneAt: null,
      createdAt: now,
      private: priv,
      enc: null,
    }
    const finish = () => {
      void saveTask(task, { title: text, notes: '', checklist: [] }).then(() => {
        if (sheet.start && sheet.date) {
          const end = timeOf(Math.min(mins(sheet.end!), mins(sheet.start) + duration))
          put('events', { id: uid(), updatedAt: 0, date: sheet.date, start: sheet.start, end, title: '', notes: '', taskId: task.id })
        }
      })
      close()
      notify('Task added')
    }
    if (priv) withPin(finish)
    else finish()
  }

  return (
    <form
      className="stack quick-task"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input className="big-input" autoFocus placeholder="What needs doing?" value={title} maxLength={180} onChange={(e) => setTitle(e.target.value)} enterKeyHint="done" />

      <div className="q-group">
        <span className="q-label">Due</span>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={due === today} onClick={() => setDue(due === today ? null : today)}>
            Today
          </button>
          <button type="button" className="chip" aria-pressed={due === addDays(today, 1)} onClick={() => setDue(due === addDays(today, 1) ? null : addDays(today, 1))}>
            Tomorrow
          </button>
          <DateChip value={due && due !== today && due !== addDays(today, 1) ? due : null} onChange={setDue} today={today} />
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="q-group">
          <span className="q-label">Subject</span>
          <SubjectChips subjects={subjects} value={subjectId} onChange={setSubjectId} />
        </div>
      )}

      <div className="q-group">
        <span className="q-label">Takes</span>
        <div className="chips">
          {DURATIONS.filter((d) => !slotMinutes || d <= slotMinutes).map((d) => (
            <button key={d} type="button" className="chip num" aria-pressed={duration === d} onClick={() => setDuration(d)}>
              {d < 60 ? `${d} min` : `${d / 60} hr`}
            </button>
          ))}
        </div>
      </div>

      <div className="prop-list">
        <div className="prop">
          <Lock size={18} />
          <span className="prop-label">Private · PIN locked</span>
          <Switch on={priv} onChange={setPriv} label="Private task" />
        </div>
      </div>

      <button className="btn btn-primary btn-block" disabled={!title.trim()}>
        {sheet.start ? `Add & block ${sheet.start}` : 'Add task'}
      </button>
    </form>
  )
}

function TxQuick({ type }: { type: TxType }) {
  const today = todayKey()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const { close, notify } = useUI.getState()
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(cats[0].name)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [date, setDate] = useState(today)
  const satang = useMemo(() => parseBaht(amount), [amount])

  const submit = () => {
    if (!satang) return
    const id = uid()
    put('txs', { id, updatedAt: 0, type, amount: satang, category, note: note.trim(), date, createdAt: Date.now() })
    close()
    notify(`${type === 'expense' ? 'Spent' : 'Received'} ฿${baht(satang)} · ${categoryFor(type, category).label}`, () => remove('txs', [id]))
  }

  return (
    <div className="stack tx-quick" style={{ '--c': type === 'expense' ? 'var(--text)' : 'var(--income)' } as CSSProperties}>
      <div className="amount-display" aria-live="polite">
        <span className="cur">{type === 'expense' ? '−฿' : '+฿'}</span>
        <span className={`num amt${amount ? '' : ' empty'}`}>{formatTyped(amount)}</span>
      </div>

      <CategoryPicker categories={cats} value={category} onChange={setCategory} />

      <div className="chips tx-extras">
        <button type="button" className="chip" aria-pressed={date === today} onClick={() => setDate(today)}>
          Today
        </button>
        <button type="button" className="chip" aria-pressed={date === addDays(today, -1)} onClick={() => setDate(addDays(today, -1))}>
          Yesterday
        </button>
        <DateChip value={date !== today && date !== addDays(today, -1) ? date : null} onChange={setDate} today={today} />
        <button type="button" className="chip" aria-pressed={showNote || !!note} onClick={() => setShowNote(true)}>
          <StickyNote size={15} /> Note
        </button>
      </div>
      {(showNote || note) && (
        <label className="field">
          <input autoFocus placeholder="What / where" value={note} maxLength={150} onChange={(e) => setNote(e.target.value)} />
        </label>
      )}

      <AmountPad value={amount} onChange={setAmount} onSubmit={submit} />
      <button className="btn btn-primary btn-block" disabled={!satang} onClick={submit}>
        {type === 'expense' ? 'Save expense' : 'Save income'}
      </button>
    </div>
  )
}
