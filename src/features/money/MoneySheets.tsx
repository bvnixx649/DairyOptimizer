import { CalendarDays, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { AmountPad, CategoryPicker, formatTyped } from '../../components/fields'
import { Ring } from '../../components/Ring'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { SwipeRow } from '../../components/SwipeRow'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PALETTE } from '../../data/seed'
import type { Goal, TxType } from '../../data/types'
import { monthTitle, relativeDay, shortDate, todayKey } from '../../lib/date'
import { tick, uid } from '../../lib/haptics'
import { baht, goalProgress, parseBaht } from '../../lib/money'
import { useDoc, useSettings } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'

const toText = (satang: number) => String(satang / 100)

export function TxSheet({ id }: { id: string }) {
  const doc = useDoc()
  const tx = doc.txs.find((t) => t.id === id && !t.deleted)
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { close, notify } = useUI.getState()
  const [type, setType] = useState<TxType>(tx?.type ?? 'expense')
  const [amount, setAmount] = useState(tx ? toText(tx.amount) : '')
  const [category, setCategory] = useState(tx?.category ?? 'อาหาร')
  const [note, setNote] = useState(tx?.note ?? '')
  const [date, setDate] = useState(tx?.date ?? todayKey())
  const satang = parseBaht(amount)
  if (!tx) return <Sheet title="รายการ">ไม่พบรายการนี้แล้ว</Sheet>
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const save = () => {
    if (!satang) return
    put('txs', { ...tx, type, amount: satang, category: cats.some((c) => c.name === category) ? category : cats[0].name, note: note.trim(), date })
    close()
    notify('บันทึกแล้ว')
  }

  return (
    <Sheet
      title={<Segmented value={type} onChange={setType} options={[{ value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' }]} label="ประเภท" />}
      label="แก้ไขรายการ"
      footer={
        <>
          <button
            className="btn btn-danger"
            aria-label="ลบรายการ"
            onClick={() => {
              const snaps = remove('txs', [tx.id])
              close()
              notify('ลบรายการแล้ว', () => restore(snaps))
            }}
          >
            <Trash2 size={18} />
          </button>
          <button className="btn btn-primary" disabled={!satang} onClick={save}>
            บันทึก
          </button>
        </>
      }
    >
      <div className="stack tx-quick" style={{ '--c': type === 'expense' ? 'var(--text)' : 'var(--income)' } as CSSProperties}>
        <div className="amount-display">
          <span className="cur">{type === 'expense' ? '−฿' : '+฿'}</span>
          <span className="num amt">{formatTyped(amount)}</span>
        </div>
        <CategoryPicker categories={cats} value={category} onChange={setCategory} />
        <div className="prop-list">
          <label className="prop">
            <CalendarDays size={18} />
            <span className="prop-label">วันที่</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <input placeholder="โน้ต" value={note} maxLength={150} onChange={(e) => setNote(e.target.value)} />
        </label>
        <AmountPad value={amount} onChange={setAmount} onSubmit={save} />
      </div>
    </Sheet>
  )
}

export function BudgetSheet() {
  const settings = useSettings()
  const updateSettings = useStore((s) => s.updateSettings)
  const { close, notify } = useUI.getState()
  const [amount, setAmount] = useState(settings.budget ? toText(settings.budget) : '')
  const satang = parseBaht(amount)
  return (
    <Sheet
      title="งบรายเดือน"
      footer={
        <>
          {settings.budget && (
            <button
              className="btn btn-quiet"
              onClick={() => {
                updateSettings({ budget: null })
                close()
              }}
            >
              ไม่ตั้งงบ
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={!satang}
            onClick={() => {
              updateSettings({ budget: satang })
              close()
              notify(`งบเดือนละ ฿${baht(satang!)}`)
            }}
          >
            บันทึก
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="amount-display">
          <span className="cur">฿</span>
          <span className="num amt">{formatTyped(amount)}</span>
        </div>
        <AmountPad value={amount} onChange={setAmount} />
      </div>
    </Sheet>
  )
}

export function GoalSheet({ id }: { id: string }) {
  const doc = useDoc()
  const today = todayKey()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { open, notify } = useUI.getState()
  const goal = doc.goals.find((g) => g.id === id && !g.deleted)
  const [mode, setMode] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')
  const entries = useMemo(() => live(doc.goalEntries).filter((e) => e.goalId === id).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt), [doc.goalEntries, id])
  if (!goal) return <Sheet title="เป้าหมาย">ไม่พบเป้าหมายนี้แล้ว</Sheet>
  const p = goalProgress(goal, doc.goalEntries, today)
  const satang = parseBaht(amount)

  const add = () => {
    if (!satang) return
    const value = mode === 'in' ? satang : -Math.min(satang, p.saved)
    if (!value) return
    put('goalEntries', { id: uid(), updatedAt: 0, goalId: id, amount: value, date: today, note: '' })
    tick(14)
    setAmount('')
    notify(mode === 'in' ? `เก็บเพิ่ม ฿${baht(value)}` : `ถอน ฿${baht(-value)}`)
  }

  return (
    <Sheet
      tall
      label={goal.name}
      title=" "
      actions={
        <button className="icon-btn sm" aria-label="แก้ไขเป้าหมาย" onClick={() => open({ type: 'goalEdit', id })}>
          <Pencil size={16} />
        </button>
      }
    >
      <div className="goal-hero" style={{ '--c': goal.color } as CSSProperties}>
        <Ring value={p.ratio} size={132} stroke={9} color={goal.color}>
          <span className="gh-pct num">{Math.round(p.ratio * 100)}%</span>
        </Ring>
        <h2 className="gh-name">{goal.name}</h2>
        <p className="gh-amt num">
          ฿{baht(p.saved)} <span className="faint">/ ฿{baht(goal.target)}</span>
        </p>
        <p className="muted gh-plan">
          {p.remaining === 0
            ? 'ถึงเป้าแล้ว'
            : goal.deadline
              ? p.daysLeft! < 0
                ? `เลยกำหนด ${shortDate(goal.deadline)} · ขาดอีก ฿${baht(p.remaining)}`
                : `อีก ${p.daysLeft} วัน · เก็บเดือนละ ฿${baht(p.perMonth!)} ถึงจะทัน`
              : `ขาดอีก ฿${baht(p.remaining)}`}
        </p>
      </div>

      <div className="goal-entry">
        <Segmented value={mode} onChange={setMode} options={[{ value: 'in', label: 'เก็บเพิ่ม' }, { value: 'out', label: 'ถอนออก' }]} label="ประเภท" />
        <div className="ge-row">
          <label className="field ge-input">
            <span className="cur">฿</span>
            <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </label>
          <button className="btn btn-primary" disabled={!satang} onClick={add} aria-label="บันทึก">
            {mode === 'in' ? <Plus size={20} /> : <Minus size={20} />}
          </button>
        </div>
        <div className="chips">
          {[100, 500, 1000].map((v) => (
            <button key={v} className="chip num" onClick={() => setAmount(String(v))}>
              ฿{v.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {entries.length > 0 && (
        <>
          <div className="q-label" style={{ marginTop: 22 }}>
            ประวัติ
          </div>
          <div className="card list">
            {entries.map((e) => (
              <SwipeRow
                key={e.id}
                left={{
                  label: 'ลบ',
                  icon: Trash2,
                  color: '#FF5C63',
                  run: () => {
                    const snaps = remove('goalEntries', [e.id])
                    notify('ลบรายการแล้ว', () => restore(snaps))
                  },
                }}
              >
                <div className="row">
                  <span className="row-main">{relativeDay(e.date, today)}</span>
                  <span className={`num tx-amt${e.amount > 0 ? ' income' : ''}`}>
                    {e.amount > 0 ? '+' : '−'}฿{baht(e.amount)}
                  </span>
                </div>
              </SwipeRow>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

export function GoalEditSheet({ id }: { id?: string }) {
  const doc = useDoc()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const { close, notify } = useUI.getState()
  const existing = id ? doc.goals.find((g) => g.id === id) : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [target, setTarget] = useState(existing ? toText(existing.target) : '')
  const [deadline, setDeadline] = useState(existing?.deadline ?? '')
  const [color, setColor] = useState(existing?.color ?? PALETTE[0])
  const satang = parseBaht(target)
  const valid = name.trim() && satang

  const save = () => {
    if (!valid) return
    const g: Goal = {
      id: existing?.id ?? uid(),
      updatedAt: existing?.updatedAt ?? 0,
      name: name.trim(),
      target: satang!,
      deadline: deadline || null,
      color,
      createdAt: existing?.createdAt ?? todayKey(),
      archived: false,
    }
    put('goals', g)
    close()
    notify(existing ? 'บันทึกแล้ว' : 'ตั้งเป้าหมายแล้ว')
  }

  return (
    <Sheet
      title={existing ? 'แก้ไขเป้าหมาย' : 'เป้าหมายใหม่'}
      footer={
        <>
          {existing && (
            <button
              className="btn btn-danger"
              aria-label="ลบเป้าหมาย"
              onClick={() => {
                const entries = doc.goalEntries.filter((e) => e.goalId === existing.id && !e.deleted).map((e) => e.id)
                const snaps = [...remove('goals', [existing.id]), ...remove('goalEntries', entries)]
                close(2)
                notify('ลบเป้าหมายแล้ว', () => restore(snaps))
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn-primary" disabled={!valid} onClick={save}>
            บันทึก
          </button>
        </>
      }
    >
      <div className="stack">
        <input className="big-input" autoFocus={!existing} placeholder="เก็บเงินเพื่ออะไร" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        <label className="field">
          <span className="field-label">เป้าหมาย (บาท)</span>
          <input inputMode="decimal" placeholder="10,000" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))} />
        </label>
        <label className="field">
          <span className="field-label">ภายในวันที่ (ไม่ใส่ก็ได้)</span>
          <input type="date" value={deadline} min={todayKey()} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        {satang && deadline && (
          <p className="muted" style={{ fontSize: 14 }}>
            ต้องเก็บเดือนละ ฿{baht(goalProgress({ ...(existing ?? ({} as Goal)), id: '_', target: satang, deadline } as Goal, [], todayKey()).perMonth ?? 0)} ถึง {monthTitle(deadline.slice(0, 7))}
          </p>
        )}
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
