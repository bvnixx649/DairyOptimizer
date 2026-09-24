import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { tick } from '../lib/haptics'

export interface SwipeAction {
  label: string
  icon: LucideIcon
  color: string
  run: () => void
}

interface Props {
  children: ReactNode
  right?: SwipeAction
  left?: SwipeAction
}

const THRESHOLD = 88

/** Swipe right runs `right` (e.g. complete), swipe left runs `left` (e.g. delete). */
export function SwipeRow({ children, right, left }: Props) {
  const x = useMotionValue(0)
  const armed = useRef<'l' | 'r' | null>(null)
  const bg = useTransform(x, (v) => (v > 0 ? right?.color : left?.color) ?? 'transparent')
  const rightScale = useTransform(x, [0, THRESHOLD], [0.6, 1])
  const leftScale = useTransform(x, [-THRESHOLD, 0], [1, 0.6])
  const rightOpacity = useTransform(x, [0, 40], [0, 1])
  const leftOpacity = useTransform(x, [-40, 0], [1, 0])

  return (
    <div className="swipe">
      <motion.div className="swipe-bg" style={{ background: bg }} aria-hidden="true">
        <motion.span className="side" style={{ scale: rightScale, opacity: rightOpacity }}>
          {right && <right.icon size={20} strokeWidth={2.4} />}
          {right?.label}
        </motion.span>
        <motion.span className="side" style={{ scale: leftScale, opacity: leftOpacity }}>
          {left?.label}
          {left && <left.icon size={20} strokeWidth={2.4} />}
        </motion.span>
      </motion.div>
      <motion.div
        className="swipe-front"
        style={{ x }}
        drag={right || left ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: left ? -160 : 0, right: right ? 160 : 0 }}
        dragElastic={0.12}
        dragSnapToOrigin={false}
        onDrag={(_, info) => {
          const next = info.offset.x > THRESHOLD ? 'r' : info.offset.x < -THRESHOLD ? 'l' : null
          if (next && next !== armed.current) tick(10)
          armed.current = next
        }}
        onDragEnd={(_, info) => {
          const fire = info.offset.x > THRESHOLD ? right : info.offset.x < -THRESHOLD ? left : undefined
          armed.current = null
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 })
          fire?.run()
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
