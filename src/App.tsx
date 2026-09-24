import { motion, MotionConfig } from 'motion/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Rail, TabBar } from './components/Nav'
import { Toast } from './components/Toast'
import { SheetHost } from './features/SheetHost'
import { Today } from './features/today/Today'
import { Tasks } from './features/tasks/Tasks'
import { Plan } from './features/plan/Plan'
import { Habits } from './features/habits/Habits'
import { Money } from './features/money/Money'
import { useStore } from './store/store'
import { useUI, type Tab } from './store/ui'

const PAGES: Record<Tab, () => React.JSX.Element> = { today: Today, tasks: Tasks, plan: Plan, habits: Habits, money: Money }

/** Tracks the on-screen keyboard so sheets stay above it (iPadOS/Safari do not resize the layout). */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty('--kb', `${inset > 80 ? inset : 0}px`)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
}

/** Private details relock once the app has been in the background for a minute. */
function useAutoLock() {
  useEffect(() => {
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 60_000) useStore.getState().lock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
}

export function App() {
  const tab = useUI((s) => s.tab)
  const storageError = useStore((s) => s.storageError)
  const scrolls = useRef<Partial<Record<Tab, number>>>({})
  const prevTab = useRef(tab)
  useKeyboardInset()
  useAutoLock()

  // Each tab keeps its own scroll position.
  useLayoutEffect(() => {
    if (prevTab.current !== tab) {
      window.scrollTo(0, scrolls.current[tab] ?? 0)
      prevTab.current = tab
    }
  }, [tab])
  useEffect(() => {
    const onScroll = () => (scrolls.current[prevTab.current] = window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const Page = PAGES[tab]
  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <Rail />
        <main className="main">
          {storageError && <div className="storage-warn">บันทึกลงเครื่องไม่ได้ — ส่งออกข้อมูลสำรองไว้ก่อน</div>}
          {/* Enter-only transition: the old page unmounts at once, so it can never linger behind the new one. */}
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            <Page />
          </motion.div>
        </main>
      </div>
      <TabBar />
      <Toast />
      <SheetHost />
    </MotionConfig>
  )
}
