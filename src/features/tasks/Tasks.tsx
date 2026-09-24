import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, CircleCheckBig, Lock, Plus, Search, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Empty } from '../../components/Empty'
import { Page } from '../../components/Page'
import type { Task } from '../../data/types'
import { useNow } from '../../lib/useNow'
import { BUCKET_LABEL, bucketOf, sortTasks, useDoc, useSubjects, type Bucket } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { useUI } from '../../store/ui'
import { TaskRow } from './TaskRow'

const ORDER: Bucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'someday']

const rowMotion = {
  layout: 'position' as const,
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 38 },
}

export function Tasks() {
  const { today } = useNow()
  const doc = useDoc()
  const secrets = useStore((s) => s.secrets)
  const { list: subjects, byId } = useSubjects()
  const open = useUI((s) => s.open)
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const blocks = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of live(doc.events).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)))
      if (e.taskId && e.date >= today && !m.has(e.taskId)) m.set(e.taskId, e.date === today ? e.start : '')
    return m
  }, [doc.events, today])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return live(doc.tasks).filter((t) => {
      if (filter === 'private' && !t.private) return false
      if (filter !== 'all' && filter !== 'private' && t.subjectId !== filter) return false
      if (!q) return true
      const title = t.private ? (secrets[t.id]?.title ?? '') : t.title
      const notes = t.private ? (secrets[t.id]?.notes ?? '') : t.notes
      const s = t.subjectId ? byId.get(t.subjectId) : undefined
      return [title, notes, s?.name, s?.short, s?.thai].some((x) => x?.toLowerCase().includes(q))
    })
  }, [doc.tasks, filter, query, secrets, byId])

  const groups = useMemo(() => {
    const map = new Map<Bucket, Task[]>()
    for (const t of visible) if (!t.doneAt) map.set(bucketOf(t, today), [...(map.get(bucketOf(t, today)) ?? []), t])
    return ORDER.filter((b) => map.has(b)).map((b) => ({ bucket: b, tasks: map.get(b)!.sort(sortTasks) }))
  }, [visible, today])
  const done = useMemo(() => visible.filter((t) => t.doneAt).sort((a, b) => b.doneAt! - a.doneAt!), [visible])
  const openCount = groups.reduce((n, g) => n + g.tasks.length, 0)

  return (
    <Page
      title="งาน"
      sub={openCount ? `ค้าง ${openCount} งาน` : undefined}
      right={
        <button
          className="icon-btn"
          aria-label="ค้นหา"
          aria-pressed={searching}
          onClick={() => {
            setSearching(!searching)
            setQuery('')
          }}
        >
          {searching ? <X size={19} /> : <Search size={19} />}
        </button>
      }
    >
      <AnimatePresence initial={false}>
        {searching && (
          <motion.label
            className="field search-field"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          >
            <Search size={18} />
            <input autoFocus placeholder="ค้นหางาน วิชา หรือโน้ต" value={query} onChange={(e) => setQuery(e.target.value)} />
          </motion.label>
        )}
      </AnimatePresence>

      <div className="chips scroll-x filter-row" role="group" aria-label="กรองงาน">
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          ทั้งหมด
        </button>
        {subjects.map((s) => (
          <button key={s.id} className="chip tone" aria-pressed={filter === s.id} style={{ '--c': s.color } as CSSProperties} onClick={() => setFilter(filter === s.id ? 'all' : s.id)}>
            <span className="swatch" />
            {s.short}
          </button>
        ))}
        <button className="chip" aria-pressed={filter === 'private'} onClick={() => setFilter(filter === 'private' ? 'all' : 'private')}>
          <Lock size={14} /> ส่วนตัว
        </button>
      </div>

      {groups.length === 0 && !done.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <Empty
            icon={CircleCheckBig}
            text={query ? 'ไม่พบงานที่ค้นหา' : 'ไม่มีงานค้าง'}
            action={
              !query && (
                <button
                  className="btn btn-quiet btn-sm"
                  onClick={() => open({ type: 'quick', mode: 'task', subjectId: filter !== 'all' && filter !== 'private' ? filter : undefined })}
                >
                  <Plus size={16} /> เพิ่มงาน
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="task-groups">
          {groups.map(({ bucket, tasks }) => (
            <section className="section task-group" key={bucket}>
              <div className="section-h">
                <h2 className={bucket === 'overdue' ? 'danger-text' : undefined}>
                  {BUCKET_LABEL[bucket]}
                  <span className="count num">{tasks.length}</span>
                </h2>
              </div>
              <div className="card list">
                <AnimatePresence initial={false}>
                  {tasks.map((t) => (
                    <motion.div key={t.id} {...rowMotion}>
                      <TaskRow task={t} today={today} hideSubject={filter === t.subjectId} block={blocks.get(t.id) || undefined} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {done.length > 0 && (
            <section className="section task-group">
              <button className="section-h done-toggle" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
                <h2 className="muted">
                  เสร็จแล้ว<span className="count num">{done.length}</span>
                </h2>
                <motion.span animate={{ rotate: showDone ? 180 : 0 }}>
                  <ChevronDown size={18} className="muted" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {showDone && (
                  <motion.div className="card list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {done.slice(0, 40).map((t) => (
                      <TaskRow key={t.id} task={t} today={today} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>
      )}
    </Page>
  )
}
