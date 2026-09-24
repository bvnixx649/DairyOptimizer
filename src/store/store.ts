import { create } from 'zustand'
import { seedDoc, SETTINGS_ID, seedSettings } from '../data/seed'
import { COLLECTIONS, type CollectionName, type Collections, type Doc, type Rec, type Settings, type Task, type TaskSecret } from '../data/types'
import { createPin, decryptJSON, encryptJSON, unlockPin } from '../lib/crypto'
import { todayKey } from '../lib/date'
import { logId } from '../lib/habits'
import { docSignature, mergeDocs } from '../lib/merge'

export const STORAGE_KEY = 'achieve-v3'

type Item<K extends CollectionName> = Collections[K][number]

export interface Snapshot {
  col: CollectionName
  rec: Rec
}

interface State {
  doc: Doc
  storageError: boolean
  pinKey: CryptoKey | null
  /** Decrypted private-task contents for this session only. */
  secrets: Record<string, TaskSecret>

  put: <K extends CollectionName>(col: K, rec: Item<K>) => void
  patch: <K extends CollectionName>(col: K, id: string, changes: Partial<Item<K>>) => void
  remove: (col: CollectionName, ids: string[]) => Snapshot[]
  restore: (snaps: Snapshot[]) => void
  /** Replaces the doc with a merge result (sync, other tab, import). */
  absorb: (incoming: Doc) => boolean

  saveTask: (task: Task, secret: TaskSecret) => Promise<void>
  toggleTask: (id: string) => Snapshot[]
  deleteTask: (id: string) => Snapshot[]
  toggleHabit: (habitId: string, date: string) => boolean
  updateSettings: (changes: Partial<Settings>) => void

  setPin: (pin: string) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  removePin: () => Promise<void>
}

const now = () => Date.now()
const bump = <T extends Rec>(r: T): T => ({ ...r, updatedAt: Math.max(now(), r.updatedAt + 1) })

function load(): { doc: Doc; error: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { doc: seedDoc(todayKey()), error: false }
    const parsed = JSON.parse(raw) as Doc
    if (parsed.schema !== 3) throw new Error('schema')
    for (const k of COLLECTIONS) if (!Array.isArray(parsed[k])) (parsed as unknown as Record<string, Rec[]>)[k] = []
    return { doc: parsed, error: false }
  } catch {
    // Keep the unreadable copy aside instead of overwriting it.
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) localStorage.setItem(`${STORAGE_KEY}-corrupt-${now()}`, raw)
    } catch {
      /* storage unavailable */
    }
    return { doc: seedDoc(todayKey()), error: true }
  }
}

const initial = load()

export const useStore = create<State>()((set, get) => {
  const setDoc = (fn: (d: Doc) => Doc) => set((s) => ({ doc: fn(s.doc) }))
  const upsert = (d: Doc, col: CollectionName, rec: Rec): Doc => {
    const list = d[col] as Rec[]
    const i = list.findIndex((r) => r.id === rec.id)
    const next = i < 0 ? [...list, rec] : list.map((r, j) => (j === i ? rec : r))
    return { ...d, [col]: next }
  }

  return {
    doc: initial.doc,
    storageError: initial.error,
    pinKey: null,
    secrets: {},

    put: (col, rec) => setDoc((d) => upsert(d, col, bump(rec as Rec))),

    patch: (col, id, changes) =>
      setDoc((d) => {
        const cur = (d[col] as Rec[]).find((r) => r.id === id)
        return cur ? upsert(d, col, bump({ ...cur, ...changes })) : d
      }),

    remove: (col, ids) => {
      const snaps: Snapshot[] = []
      setDoc((d) => {
        let next = d
        for (const id of ids) {
          const cur = (next[col] as Rec[]).find((r) => r.id === id && !r.deleted)
          if (!cur) continue
          snaps.push({ col, rec: cur })
          next = upsert(next, col, bump({ ...cur, deleted: true }))
        }
        return next
      })
      return snaps
    },

    restore: (snaps) =>
      setDoc((d) => snaps.reduce((acc, s) => upsert(acc, s.col, bump({ ...s.rec, deleted: false })), d)),

    absorb: (incoming) => {
      const cur = get().doc
      const merged = mergeDocs(cur, incoming)
      if (docSignature(merged) === docSignature(cur)) return false
      set({ doc: merged })
      if (get().pinKey) void refreshSecrets()
      return true
    },

    saveTask: async (task, secret) => {
      const { pinKey } = get()
      if (task.private) {
        if (!pinKey) throw new Error('locked')
        const enc = await encryptJSON(pinKey, secret)
        get().put('tasks', { ...task, title: '', notes: '', checklist: [], enc })
        set((s) => ({ secrets: { ...s.secrets, [task.id]: secret } }))
      } else {
        get().put('tasks', { ...task, ...secret, enc: null })
        set((s) => {
          const { [task.id]: _, ...rest } = s.secrets
          return { secrets: rest }
        })
      }
    },

    toggleTask: (id) => {
      const t = get().doc.tasks.find((x) => x.id === id)
      if (!t) return []
      get().patch('tasks', id, { doneAt: t.doneAt ? null : now() })
      return [{ col: 'tasks', rec: t }]
    },

    deleteTask: (id) => {
      const blocks = get().doc.events.filter((e) => e.taskId === id && !e.deleted).map((e) => e.id)
      return [...get().remove('tasks', [id]), ...get().remove('events', blocks)]
    },

    toggleHabit: (habitId, date) => {
      const id = logId(habitId, date)
      const cur = get().doc.habitLogs.find((l) => l.id === id)
      const on = !cur || !!cur.deleted
      get().put('habitLogs', { id, habitId, date, updatedAt: cur?.updatedAt ?? 0, deleted: !on })
      return on
    },

    updateSettings: (changes) => {
      const cur = get().doc.settings.find((s) => s.id === SETTINGS_ID) ?? seedSettings()
      get().put('settings', { ...cur, ...changes })
    },

    setPin: async (pin) => {
      const { config, key } = await createPin(pin)
      const old = get().pinKey
      const privateTasks = get().doc.tasks.filter((t) => t.private && t.enc && !t.deleted)
      if (privateTasks.length && !old) throw new Error('locked')
      // Re-seal every private task with the new key before switching.
      const resealed = await Promise.all(
        privateTasks.map(async (t) => ({ ...t, enc: await encryptJSON(key, await decryptJSON<TaskSecret>(old!, t.enc!)) })),
      )
      for (const t of resealed) get().put('tasks', t)
      get().updateSettings({ pin: config })
      set({ pinKey: key })
    },

    unlock: async (pin) => {
      const config = getSettings(get().doc).pin
      if (!config) return false
      const key = await unlockPin(pin, config)
      if (!key) return false
      set({ pinKey: key })
      await refreshSecrets()
      return true
    },

    lock: () => set({ pinKey: null, secrets: {} }),

    removePin: async () => {
      const { pinKey } = get()
      const privateTasks = get().doc.tasks.filter((t) => t.private && t.enc && !t.deleted)
      if (privateTasks.length && !pinKey) throw new Error('locked')
      for (const t of privateTasks) {
        const secret = await decryptJSON<TaskSecret>(pinKey!, t.enc!)
        get().put('tasks', { ...t, ...secret, private: false, enc: null })
      }
      get().updateSettings({ pin: null })
      set({ pinKey: null, secrets: {} })
    },
  }
})

async function refreshSecrets() {
  const { pinKey, doc } = useStore.getState()
  if (!pinKey) return
  const secrets: Record<string, TaskSecret> = {}
  for (const t of doc.tasks) {
    if (!t.private || !t.enc || t.deleted) continue
    try {
      secrets[t.id] = await decryptJSON<TaskSecret>(pinKey, t.enc)
    } catch {
      /* sealed with a different PIN (e.g. changed on another device before sync) */
    }
  }
  useStore.setState({ secrets })
}

export const getSettings = (doc: Doc): Settings => doc.settings.find((s) => s.id === SETTINGS_ID && !s.deleted) ?? seedSettings()

export const live = <T extends Rec>(xs: T[]) => xs.filter((x) => !x.deleted)

// Persist every change; skip writes when another tab already stored the same content.
let lastWritten = ''
useStore.subscribe((s, prev) => {
  if (s.doc === prev.doc) return
  try {
    const text = JSON.stringify(s.doc)
    if (text === lastWritten) return
    localStorage.setItem(STORAGE_KEY, text)
    lastWritten = text
    if (useStore.getState().storageError) useStore.setState({ storageError: false })
  } catch {
    useStore.setState({ storageError: true })
  }
})

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const incoming = JSON.parse(e.newValue) as Doc
      if (incoming.schema === 3) useStore.getState().absorb(incoming)
    } catch {
      /* ignore partial writes */
    }
  })
}
