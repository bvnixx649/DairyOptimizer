import { motion } from 'motion/react'
import { CalendarDays, ListTodo, Plus, Repeat, Sun, Wallet, type LucideIcon } from 'lucide-react'
import { useUI, type QuickMode, type Tab } from '../store/ui'
import { tick } from '../lib/haptics'
import { LogoMark, Logo } from './Logo'
import { useWide } from '../lib/useMedia'

const ITEMS: { tab: Tab; label: string; icon: LucideIcon }[] = [
  { tab: 'today', label: 'Today', icon: Sun },
  { tab: 'tasks', label: 'Tasks', icon: ListTodo },
  { tab: 'plan', label: 'Schedule', icon: CalendarDays },
  { tab: 'habits', label: 'Habits', icon: Repeat },
  { tab: 'money', label: 'Money', icon: Wallet },
]

const QUICK_FOR: Record<Tab, QuickMode> = { today: 'task', tasks: 'task', plan: 'event', habits: 'task', money: 'expense' }

function useNav() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const open = useUI((s) => s.open)
  const go = (t: Tab) => {
    if (t === tab) return window.scrollTo({ top: 0, behavior: 'smooth' })
    tick(6)
    setTab(t)
  }
  const add = () => {
    tick(10)
    if (tab === 'habits') open({ type: 'habitEdit' })
    else open({ type: 'quick', mode: QUICK_FOR[tab] })
  }
  return { tab, go, add }
}

export function TabBar() {
  const { tab, go, add } = useNav()
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-pill">
        {ITEMS.map(({ tab: t, label, icon: Icon }) => (
          <button key={t} className="tab" aria-current={t === tab ? 'page' : undefined} onClick={() => go(t)}>
            {t === tab && <motion.i className="tab-pill" layoutId="tab-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <Icon size={21} strokeWidth={t === tab ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <button className="fab" onClick={add} aria-label="Add">
        <Plus size={26} strokeWidth={2.4} />
      </button>
    </nav>
  )
}

export function Rail() {
  const { tab, go, add } = useNav()
  const wide = useWide()
  return (
    <nav className="rail" aria-label="Main">
      <div className="rail-logo">{wide ? <Logo /> : <LogoMark size={30} />}</div>
      {ITEMS.map(({ tab: t, label, icon: Icon }) => (
        <button key={t} className="rail-item" aria-current={t === tab ? 'page' : undefined} onClick={() => go(t)}>
          {t === tab && <motion.i className="tab-pill" layoutId="rail-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <Icon size={22} strokeWidth={t === tab ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
      <button className="fab rail-add" onClick={add} aria-label="Add">
        <Plus size={24} strokeWidth={2.4} />
        <span className="label">New</span>
      </button>
      <div className="grow" />
    </nav>
  )
}
