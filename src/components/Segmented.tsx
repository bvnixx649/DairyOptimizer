import { motion } from 'motion/react'
import { useId } from 'react'

interface Props<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}

export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  const id = useId()
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.i className="seg-pill" layoutId={`seg-${id}`} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
