import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { ChevronLeft, ChevronRight, PiggyBank, Plus, Receipt, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Empty } from '../../components/Empty'
import { iconFor } from '../../components/icons'
import { Page } from '../../components/Page'
import { Ring } from '../../components/Ring'
import { SwipeRow } from '../../components/SwipeRow'
import { categoryFor } from '../../data/seed'
import type { Tx } from '../../data/types'
import { addMonths, daysInMonth, monthTitle, parseDate, relativeDay, DAY_NAME, weekday } from '../../lib/date'
import { baht, goalProgress, savedIn, summarize } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { useDoc, useSettings } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'
import { SpendChart } from './SpendChart'

function Counter({ value }: { value: number }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => baht(Math.round(v)))
  useEffect(() => {
    // A tween lands exactly on the target; a spring can rest a satang short.
    const c = animate(mv, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [mv, value])
  return <motion.span>{text}</motion.span>
}

export function Money() {
  const { today } = useNow()
  const doc = useDoc()
  const settings = useSettings()
  const open = useUI((s) => s.open)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [category, setCategory] = useState<string | null>(null)
  const [kind, setKind] = useState<'all' | 'expense' | 'income'>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const sum = useMemo(() => summarize(doc.txs, month), [doc.txs, month])
  const prev = useMemo(() => summarize(doc.txs, addMonths(month, -1)), [doc.txs, month])
  const saved = useMemo(() => savedIn(doc.goalEntries, month), [doc.goalEntries, month])
  const days = daysInMonth(month)
  const isCurrent = month === today.slice(0, 7)
  const isFuture = month > today.slice(0, 7)
  const dayIndex = isCurrent ? Number(today.slice(8)) : isFuture ? 0 : days
  const current = sum.cumulative.slice(0, dayIndex)
  const hasPrev = prev.expense > 0
  const budget = settings.budget
  const left = budget ? budget - sum.expense : null
  const daysLeft = isCurrent ? days - Number(today.slice(8)) + 1 : 0
  const perDay = left && left > 0 && daysLeft ? Math.floor(left / daysLeft / 100) * 100 : null
  const pace = budget && isCurrent ? (Number(today.slice(8)) / days) * 100 : null

  const txs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return live(doc.txs)
      .filter((t) => (q ? true : t.date.startsWith(month)))
      .filter((t) => kind === 'all' || t.type === kind)
      .filter((t) => !category || (t.type === 'expense' && t.category === category))
      .filter((t) => !q || t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || baht(t.amount).includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [doc.txs, month, kind, category, query])

  const byDay = useMemo(() => {
    const groups: { date: string; items: Tx[]; net: number }[] = []
    for (const t of txs) {
      let g = groups[groups.length - 1]
      if (!g || g.date !== t.date) groups.push((g = { date: t.date, items: [], net: 0 }))
      g.items.push(t)
      g.net += t.type === 'income' ? t.amount : -t.amount
    }
    return groups
  }, [txs])

  const goals = useMemo(() => live(doc.goals).filter((g) => !g.archived), [doc.goals])

  return (
    <Page
      title="เงิน"
      right={
        <button className="icon-btn" aria-label="ค้นหารายการ" onClick={() => (setSearching(!searching), setQuery(''))}>
          {searching ? <X size={19} /> : <Search size={19} />}
        </button>
      }
    >
      <div className="plan-nav">
        <button className="icon-btn sm plain" aria-label="เดือนก่อน" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={20} />
        </button>
        <span className="plan-label">{monthTitle(month)}</span>
        <button className="icon-btn sm plain" aria-label="เดือนถัดไป" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={20} />
        </button>
        <span style={{ flex: 1 }} />
        {!isCurrent && (
          <button className="chip" onClick={() => setMonth(today.slice(0, 7))}>
            เดือนนี้
          </button>
        )}
      </div>

      <div className="money-grid">
        <div className="money-main">
          <div className="card money-hero">
            <div className="mh-top">
              <div>
                <div className="mg-label">ใช้ไป</div>
                <div className="mh-amount num">
                  <span className="cur">฿</span>
                  <Counter value={sum.expense} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => open({ type: 'quick', mode: 'expense' })}>
                <Plus size={16} /> รายจ่าย
              </button>
            </div>

            {budget ? (
              <div className="mh-budget">
                <div className="bar tall">
                  <motion.i
                    initial={false}
                    animate={{ width: `${Math.min(100, (sum.expense / budget) * 100)}%` }}
                    style={{ '--c': sum.expense > budget ? 'var(--danger)' : 'var(--accent)' } as CSSProperties}
                  />
                  {pace !== null && <span className="pace" style={{ left: `${pace}%` }} title="ควรใช้ถึงตรงนี้ ณ วันนี้" />}
                </div>
                <div className="mg-foot">
                  <span>
                    {left! >= 0 ? 'เหลือ' : 'เกินงบ'} <b className="num">฿{baht(Math.abs(left!))}</b>
                    <span className="faint"> / ฿{baht(budget)}</span>
                  </span>
                  {perDay !== null && <span className="num">วันละ ฿{baht(perDay)}</span>}
                </div>
              </div>
            ) : (
              <button className="link-btn accent" style={{ paddingLeft: 0 }} onClick={() => open({ type: 'budget' })}>
                ตั้งงบรายเดือน
              </button>
            )}

            {(sum.expense > 0 || hasPrev) && (
              <SpendChart current={current} previous={hasPrev ? prev.cumulative : []} days={days} budget={budget} month={parseDate(`${month}-01`).getMonth()} />
            )}

            <div className="mh-stats">
              <div>
                <span className="mg-label">รายรับ</span>
                <b className="num income">฿{baht(sum.income)}</b>
              </div>
              <div>
                <span className="mg-label">เก็บออม</span>
                <b className="num">฿{baht(saved)}</b>
              </div>
              <div>
                <span className="mg-label">คงเหลือ</span>
                <b className={`num${sum.income - sum.expense - saved < 0 ? ' neg' : ''}`}>
                  {sum.income - sum.expense - saved < 0 ? '−' : ''}฿{baht(sum.income - sum.expense - saved)}
                </b>
              </div>
            </div>
          </div>

          {sum.byCategory.length > 0 && (
            <section className="section">
              <div className="section-h">
                <h2>หมวด</h2>
                {category && (
                  <button className="link-btn" onClick={() => setCategory(null)}>
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
              <div className="card card-pad">
                <div className="cat-bar" role="img" aria-label="สัดส่วนรายจ่ายตามหมวด">
                  {sum.byCategory.map((c) => (
                    <motion.i
                      key={c.name}
                      layout
                      style={{ flexGrow: c.amount, '--c': categoryFor('expense', c.name).color } as CSSProperties}
                      className={category && category !== c.name ? 'dim' : ''}
                    />
                  ))}
                </div>
                <div className="cat-list">
                  {sum.byCategory.map((c) => {
                    const cat = categoryFor('expense', c.name)
                    const Icon = iconFor(cat.icon)
                    return (
                      <button
                        key={c.name}
                        className={`cat-row${category === c.name ? ' on' : ''}${category && category !== c.name ? ' dim' : ''}`}
                        style={{ '--c': cat.color } as CSSProperties}
                        onClick={() => setCategory(category === c.name ? null : c.name)}
                        aria-pressed={category === c.name}
                      >
                        <span className="icon-tile sm">
                          <Icon size={16} />
                        </span>
                        <span className="cr-name">{c.name}</span>
                        <span className="cr-pct num faint">{Math.round((c.amount / sum.expense) * 100)}%</span>
                        <span className="cr-amt num">฿{baht(c.amount)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-h">
              <h2>เป้าหมายเงินเก็บ</h2>
              <button className="link-btn" onClick={() => open({ type: 'goalEdit' })}>
                <Plus size={16} /> เป้าหมาย
              </button>
            </div>
            {goals.length ? (
              <div className="goal-row">
                {goals.map((g) => {
                  const p = goalProgress(g, doc.goalEntries, today)
                  return (
                    <button key={g.id} className="card goal-card" style={{ '--c': g.color } as CSSProperties} onClick={() => open({ type: 'goal', id: g.id })}>
                      <Ring value={p.ratio} size={54} stroke={5} color={g.color}>
                        <span className="num" style={{ fontSize: 12.5, fontWeight: 650 }}>
                          {Math.round(p.ratio * 100)}%
                        </span>
                      </Ring>
                      <span className="gc-name">{g.name}</span>
                      <span className="gc-amt num">
                        ฿{baht(p.saved)} <span className="faint">/ ฿{baht(g.target)}</span>
                      </span>
                      <span className="gc-foot">
                        {p.remaining === 0
                          ? 'ครบแล้ว'
                          : p.daysLeft !== null
                            ? p.daysLeft < 0
                              ? 'เลยกำหนด'
                              : `เก็บ ฿${baht(p.perMonth!)}/เดือน`
                            : `อีก ฿${baht(p.remaining)}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="card">
                <Empty
                  icon={PiggyBank}
                  text="ตั้งเป้าหมายแล้วดูว่าต้องเก็บเดือนละเท่าไร"
                  action={
                    <button className="btn btn-quiet btn-sm" onClick={() => open({ type: 'goalEdit' })}>
                      <Plus size={16} /> ตั้งเป้าหมาย
                    </button>
                  }
                />
              </div>
            )}
          </section>
        </div>

        <section className="section money-side">
          <AnimatePresence initial={false}>
            {searching && (
              <motion.label
                className="field search-field"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              >
                <Search size={18} />
                <input autoFocus placeholder="ค้นหาทุกเดือน: โน้ต หมวด จำนวน" value={query} onChange={(e) => setQuery(e.target.value)} />
              </motion.label>
            )}
          </AnimatePresence>
          <div className="section-h">
            <h2>รายการ</h2>
            <div className="chips">
              {(['all', 'expense', 'income'] as const).map((k) => (
                <button key={k} className="chip small" aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {{ all: 'ทั้งหมด', expense: 'จ่าย', income: 'รับ' }[k]}
                </button>
              ))}
            </div>
          </div>
          {byDay.length ? (
            <div className="tx-days">
              {byDay.map((g) => (
                <div key={g.date} className="tx-day">
                  <div className="tx-day-h">
                    <span>
                      {relativeDay(g.date, today)}
                      {relativeDay(g.date, today) !== DAY_NAME[weekday(g.date)] && <span className="faint"> · {DAY_NAME[weekday(g.date)]}</span>}
                    </span>
                    <span className="num faint">
                      {g.net < 0 ? '−' : '+'}฿{baht(g.net)}
                    </span>
                  </div>
                  <div className="card list">
                    <AnimatePresence initial={false}>
                      {g.items.map((t) => (
                        <motion.div key={t.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                          <TxRow tx={t} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <Empty icon={Receipt} text={query ? 'ไม่พบรายการ' : 'ยังไม่มีรายการเดือนนี้'} />
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}

function TxRow({ tx }: { tx: Tx }) {
  const open = useUI((s) => s.open)
  const remove = useStore((s) => s.remove)
  const restore = useStore((s) => s.restore)
  const notify = useUI((s) => s.notify)
  const cat = categoryFor(tx.type, tx.category)
  const Icon = iconFor(cat.icon)
  return (
    <SwipeRow
      left={{
        label: 'ลบ',
        icon: Trash2,
        color: '#FF5C63',
        run: () => {
          const snaps = remove('txs', [tx.id])
          notify('ลบรายการแล้ว', () => restore(snaps))
        },
      }}
    >
      <button className="row hoverable tx-row" onClick={() => open({ type: 'tx', id: tx.id })} style={{ '--c': cat.color } as CSSProperties}>
        <span className="icon-tile">
          <Icon size={18} />
        </span>
        <span className="row-main">
          <span className="row-title" style={{ display: 'block' }}>
            {tx.note || tx.category}
          </span>
          {tx.note && <span className="row-meta">{tx.category}</span>}
        </span>
        <span className={`tx-amt num${tx.type === 'income' ? ' income' : ''}`}>
          {tx.type === 'income' ? '+' : '−'}฿{baht(tx.amount)}
        </span>
      </button>
    </SwipeRow>
  )
}
