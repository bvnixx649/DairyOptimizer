import { create } from 'zustand'

export type Tab = 'today' | 'tasks' | 'plan' | 'habits' | 'money'
export const TABS: Tab[] = ['today', 'tasks', 'plan', 'habits', 'money']

export type QuickMode = 'task' | 'expense' | 'income' | 'event'

export type Sheet =
  | { type: 'quick'; mode: QuickMode; date?: string; start?: string; end?: string; subjectId?: string }
  | { type: 'task'; id: string }
  | { type: 'event'; id?: string; date?: string; start?: string; end?: string }
  | { type: 'subject'; id: string }
  | { type: 'habit'; id?: string }
  | { type: 'habitEdit'; id?: string }
  | { type: 'tx'; id: string }
  | { type: 'goal'; id?: string }
  | { type: 'goalEdit'; id?: string }
  | { type: 'settings' }
  /** `then` runs after a successful unlock/set, once the PIN sheet has closed. */
  | { type: 'pin'; purpose: 'unlock' | 'set'; then?: () => void }
  | { type: 'slot'; date: string; start: string; end: string }
  | { type: 'schedule'; taskId: string }
  | { type: 'budget' }
  | { type: 'classEdit'; id?: string; subjectId?: string }
  | { type: 'subjectEdit'; id?: string }
  | { type: 'pickToday' }

export interface Toast {
  id: number
  text: string
  undo?: () => void
}

interface UI {
  tab: Tab
  sheets: (Sheet & { key: number })[]
  toast: Toast | null
  setTab: (t: Tab) => void
  open: (s: Sheet) => void
  /** Closes the top `n` sheets through history so Android back and UI close stay in step. */
  close: (n?: number) => void
  replaceTop: (s: Sheet) => void
  notify: (text: string, undo?: () => void) => void
  dismissToast: () => void
}

const initialTab = (): Tab => {
  const h = location.hash.slice(1) as Tab
  return TABS.includes(h) ? h : 'today'
}

let key = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUI = create<UI>()((set, get) => ({
  tab: initialTab(),
  sheets: [],
  toast: null,

  setTab: (tab) => {
    history.replaceState(history.state, '', `#${tab}`)
    set({ tab })
  },

  open: (s) => {
    history.pushState({ sheet: get().sheets.length + 1 }, '')
    set((st) => ({ sheets: [...st.sheets, { ...s, key: ++key }] }))
  },

  close: (n = 1) => {
    const count = Math.min(n, get().sheets.length)
    if (count > 0) history.go(-count)
  },

  replaceTop: (s) => set((st) => ({ sheets: [...st.sheets.slice(0, -1), { ...s, key: ++key }] })),

  notify: (text, undo) => {
    clearTimeout(toastTimer)
    set({ toast: { id: ++key, text, undo } })
    toastTimer = setTimeout(() => set({ toast: null }), undo ? 5000 : 2600)
  },

  dismissToast: () => {
    clearTimeout(toastTimer)
    set({ toast: null })
  },
}))

window.addEventListener('hashchange', () => {
  const t = location.hash.slice(1) as Tab
  if (TABS.includes(t) && t !== useUI.getState().tab) useUI.setState({ tab: t })
})

/** Closes the top sheet, then runs `fn` once history has settled. */
export function closeThen(fn: () => void) {
  window.addEventListener('popstate', () => setTimeout(fn, 0), { once: true })
  useUI.getState().close()
}

window.addEventListener('popstate', () => {
  const { sheets } = useUI.getState()
  const depth = (history.state?.sheet as number | undefined) ?? 0
  if (sheets.length > depth) useUI.setState({ sheets: sheets.slice(0, depth) })
})

// A reload with sheet history entries left over should not leave phantom back steps.
if (history.state?.sheet) history.replaceState(null, '', location.hash || '#today')
