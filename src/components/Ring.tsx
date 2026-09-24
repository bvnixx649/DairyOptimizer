import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface Props {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  dashed?: boolean
}

export function Ring({ value, size = 64, stroke = 5, color = 'var(--accent)', track = 'rgba(255,255,255,0.08)', children, dashed }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} strokeDasharray={dashed ? '2 5' : undefined} strokeLinecap="round" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))), opacity: value > 0 ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </svg>
      {children && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>}
    </div>
  )
}
