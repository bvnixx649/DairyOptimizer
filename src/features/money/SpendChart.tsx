import { useEffect, useRef, useState } from 'react'
import { MONTH_SHORT } from '../../lib/date'
import { baht } from '../../lib/money'

interface Props {
  /** Cumulative spend per day (satang), only up to the last day to draw. */
  current: number[]
  previous: number[]
  days: number
  budget: number | null
  month: number
}

const H = 150
const PAD_T = 12
const PAD_B = 22

/** Cumulative spending this month vs last month, with the budget pace as a dashed guide. */
export function SpendChart({ current, previous, days, budget, month }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = Math.max(1, budget ?? 0, ...current, ...previous) * 1.08
  const x = (i: number) => (days <= 1 ? 0 : (i / (days - 1)) * w)
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B)
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = current.length ? `${path(current)}L${x(current.length - 1)},${y(0)}L0,${y(0)}Z` : ''
  const last = current.length - 1
  const hi = hover ?? last

  const pick = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    const i = Math.round(((clientX - r.left) / r.width) * (days - 1))
    setHover(Math.max(0, Math.min(Math.max(last, previous.length - 1), i)))
  }

  const ticks = [1, 8, 15, 22, days].filter((d, i, a) => a.indexOf(d) === i && d <= days)

  return (
    <div className="spend-chart">
      <div className="sc-legend" aria-hidden="true">
        <span>
          <i className="lg-now" />
          This month
        </span>
        {previous.length > 0 && (
          <span>
            <i className="lg-prev" />
            Last month
          </span>
        )}
        {budget && (
          <span>
            <i className="lg-budget" />
            Budget
          </span>
        )}
      </div>
      <div
        ref={ref}
        className="sc-plot"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Spent ฿${current.length ? baht(current[last]) : 0} so far this month`}
      >
        <svg width={w} height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF8059" stopOpacity="0.28" />
              <stop offset="1" stopColor="#FF8059" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.08)" />
          {budget && <line x1={0} y1={y(0)} x2={x(days - 1)} y2={y(budget)} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeDasharray="4 5" />}
          {previous.length > 0 && <path d={path(previous)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {current.length > 0 && (
            <>
              <path d={area} fill="url(#sc-fill)" />
              <path d={path(current)} fill="none" stroke="#FF8059" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD_T - 6} y2={y(0)} stroke="rgba(255,255,255,0.25)" />}
          {hi >= 0 && hi <= last && <circle cx={x(hi)} cy={y(current[hi])} r={5} fill="#FF8059" stroke="var(--surface)" strokeWidth={2} />}
          {hover !== null && previous[hover] !== undefined && <circle cx={x(hover)} cy={y(previous[hover])} r={4} fill="#8a8680" stroke="var(--surface)" strokeWidth={2} />}
          {ticks.map((d) => (
            <text key={d} x={x(d - 1)} y={H - 4} fill="var(--text-3)" fontSize={11} textAnchor={d === 1 ? 'start' : d === days ? 'end' : 'middle'} className="num">
              {d}
            </text>
          ))}
        </svg>
        {hover !== null && (
          <div className="sc-tip" style={{ left: Math.min(Math.max(x(hover), 70), w - 70) }}>
            <b>
              {MONTH_SHORT[month]} {hover + 1}
            </b>
            {hover <= last && <span className="num">This month ฿{baht(current[hover])}</span>}
            {previous[hover] !== undefined && <span className="num faint">Last month ฿{baht(previous[hover])}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
