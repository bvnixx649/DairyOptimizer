import { motion } from 'motion/react'
import { Flame } from 'lucide-react'
import { useRef, type CSSProperties } from 'react'
import { iconFor } from '../../components/icons'
import { Ring } from '../../components/Ring'
import type { Habit } from '../../data/types'
import { tick } from '../../lib/haptics'
import { doneSet, streak } from '../../lib/habits'
import { useStore } from '../../store/store'
import { useUI } from '../../store/ui'

interface Props {
  habit: Habit
  today: string
  size?: number
}

/** Tap to check in today; long-press (or right-click) opens details. */
export function HabitButton({ habit, today, size = 64 }: Props) {
  const logs = useStore((s) => s.doc.habitLogs)
  const toggleHabit = useStore((s) => s.toggleHabit)
  const open = useUI((s) => s.open)
  const done = doneSet(logs, habit.id)
  const isDone = done.has(today)
  const run = streak(habit, done, today)
  const Icon = iconFor(habit.icon)
  const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressed = useRef(false)

  const startPress = () => {
    longPressed.current = false
    press.current = setTimeout(() => {
      longPressed.current = true
      tick(15)
      open({ type: 'habit', id: habit.id })
    }, 480)
  }
  const endPress = () => clearTimeout(press.current)

  return (
    <div className="habit-btn" style={{ '--c': habit.color } as CSSProperties}>
      <motion.button
        className={`habit-orb${isDone ? ' on' : ''}`}
        aria-pressed={isDone}
        aria-label={`${habit.title}${isDone ? ' (done today)' : ''}`}
        whileTap={{ scale: 0.9 }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onContextMenu={(e) => {
          e.preventDefault()
          open({ type: 'habit', id: habit.id })
        }}
        onClick={() => {
          if (longPressed.current) return
          const on = toggleHabit(habit.id, today)
          tick(on ? 14 : 6)
        }}
      >
        <Ring value={isDone ? 1 : 0} size={size} stroke={4} color={habit.color} dashed={habit.mode === 'context' && !isDone}>
          <motion.span className="orb-core" animate={{ scale: isDone ? 1 : 0.86 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
            <Icon size={size * 0.36} strokeWidth={2} />
          </motion.span>
        </Ring>
      </motion.button>
      <span className="habit-name">{habit.title}</span>
      <span className="habit-streak num">
        {run > 0 ? (
          <>
            <Flame size={12} />
            {run} {habit.mode === 'context' ? (run === 1 ? 'week' : 'weeks') : run === 1 ? 'day' : 'days'}
          </>
        ) : (
          <span className="faint">{habit.mode === 'context' ? 'When it comes up' : 'Start today'}</span>
        )}
      </span>
    </div>
  )
}
