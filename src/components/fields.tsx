import { CalendarDays, Delete, X } from 'lucide-react'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { iconFor } from './icons'
import type { Category } from '../data/seed'
import type { Subject } from '../data/types'
import { relativeDay, shortDate } from '../lib/date'
import { tick } from '../lib/haptics'

/** Opens the platform date picker from any button-like element. */
function openPicker(input: HTMLInputElement | null) {
  if (!input) return
  try {
    input.showPicker()
  } catch {
    input.focus()
    input.click()
  }
}

export function DateChip({ value, onChange, today, label = 'Pick date' }: { value: string | null; onChange: (v: string) => void; today: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className="chip" aria-pressed={!!value} onClick={() => openPicker(ref.current)}>
        <CalendarDays size={15} />
        {value ? relativeDay(value, today) : label}
      </button>
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value ?? ''}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
      />
    </span>
  )
}

/** A row in a property list that edits an optional date. */
export function DateProp({ icon, label, value, onChange, today }: { icon: ReactNode; label: string; value: string | null; onChange: (v: string | null) => void; today: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="prop" style={{ position: 'relative' }}>
      {icon}
      <button type="button" className="prop-label" style={{ textAlign: 'left', alignSelf: 'stretch' }} onClick={() => openPicker(ref.current)}>
        {label}
      </button>
      <button type="button" className="prop-value" onClick={() => openPicker(ref.current)}>
        {value ? (
          <span style={{ color: 'var(--text)' }}>
            {relativeDay(value, today)}
            {relativeDay(value, today) !== shortDate(value) && <span className="faint"> · {shortDate(value)}</span>}
          </span>
        ) : (
          <span className="faint">None</span>
        )}
      </button>
      {value && (
        <button type="button" className="icon-btn plain sm" aria-label={`Clear ${label}`} onClick={() => onChange(null)}>
          <X size={16} />
        </button>
      )}
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}

export function SubjectChips({ subjects, value, onChange }: { subjects: Subject[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="chips scroll-x" role="group" aria-label="Subject">
      {subjects.map((s) => (
        <button
          key={s.id}
          type="button"
          className="chip tone"
          aria-pressed={value === s.id}
          style={{ '--c': s.color } as CSSProperties}
          onClick={() => onChange(value === s.id ? null : s.id)}
        >
          <span className="swatch" />
          {s.short}
        </button>
      ))}
    </div>
  )
}

export function CategoryPicker({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="cat-grid" role="radiogroup" aria-label="Category">
      {categories.map((c) => {
        const Icon = iconFor(c.icon)
        return (
          <button
            key={c.name}
            type="button"
            role="radio"
            aria-checked={value === c.name}
            className="cat"
            style={{ '--c': c.color } as CSSProperties}
            onClick={() => {
              tick(6)
              onChange(c.name)
            }}
          >
            <span className="cat-icon">
              <Icon size={19} strokeWidth={2} />
            </span>
            <span className="cat-name">{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Amount entry with an on-screen keypad; also accepts a hardware keyboard. */
export function AmountPad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit?: () => void }) {
  const valueRef = useRef(value)
  valueRef.current = value

  const press = (k: string) => {
    const v = valueRef.current
    tick(5)
    if (k === 'back') return onChange(v.slice(0, -1))
    if (k === '.') return v.includes('.') ? undefined : onChange((v || '0') + '.')
    if (v.includes('.') && v.split('.')[1].length >= 2) return
    if (v.replace('.', '').length >= 9) return
    onChange(v === '0' ? k : v + k)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === '.' || e.key === ',') press('.')
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Enter') onSubmit?.()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="keypad" aria-label="Keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((k) => (
        <button key={k} type="button" className={`key${k === '.' || k === 'back' ? ' fn' : ''}`} onClick={() => press(k)} aria-label={k === 'back' ? 'Delete' : k}>
          {k === 'back' ? <Delete size={22} /> : k}
        </button>
      ))}
    </div>
  )
}

export function formatTyped(v: string) {
  if (!v) return '0'
  const [i, d] = v.split('.')
  const int = Number(i || '0').toLocaleString('en-US')
  return d !== undefined ? `${int}.${d}` : int
}
