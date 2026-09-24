import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { tick } from '../lib/haptics'

interface Props {
  done: boolean
  color?: string
  label: string
  onToggle: () => void
}

/** Circle that fills with the item's colour and draws a tick. */
export function Check({ done, color, label, onToggle }: Props) {
  return (
    <button
      className="check"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      style={{ '--c': color } as CSSProperties}
      onClick={(e) => {
        e.stopPropagation()
        tick(done ? 5 : 12)
        onToggle()
      }}
    >
      <svg viewBox="0 0 24 24">
        <circle className="ring" cx="12" cy="12" r="10.5" />
        <motion.circle
          className="fill"
          cx="12"
          cy="12"
          r="11.4"
          initial={false}
          animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 26 }}
          style={{ originX: '50%', originY: '50%' }}
        />
        <motion.path
          className="tick"
          d="M7.2 12.4l3.2 3.2 6.4-6.8"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.28, delay: done ? 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </button>
  )
}
