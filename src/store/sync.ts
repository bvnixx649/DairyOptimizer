import { create } from 'zustand'
import type { Doc } from '../data/types'
import { decryptJSON, deriveKey, encryptJSON, fromB64, toB64 } from '../lib/crypto'
import { docSignature, mergeDocs } from '../lib/merge'
import { useStore } from './store'

/*
 * Sync = one secret gist holding the whole doc, encrypted with a key derived from the
 * user's sync passphrase. Each round: pull → merge (per-record LWW) → push if the remote lags.
 */

const CONFIG_KEY = 'achieve-sync'
const FILE = 'achieve-sync.json'
const DESCRIPTION = 'Achieve sync (encrypted)'
const ITERATIONS = 310_000
const API = 'https://api.github.com'

interface Config {
  token: string
  gistId: string
  salt: string
  key: string
  login: string
}

interface Envelope {
  app: 'achieve'
  v: 1
  salt: string
  iv: string
  data: string
}

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error'

interface Sync {
  state: SyncState
  lastSync: number | null
  error: string | null
  login: string | null
}

const readConfig = (): Config | null => {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null')
  } catch {
    return null
  }
}

let config = readConfig()

export const useSync = create<Sync>()(() => ({
  state: config ? 'idle' : 'off',
  lastSync: Number(localStorage.getItem(`${CONFIG_KEY}-last`)) || null,
  error: null,
  login: config?.login ?? null,
}))

class SyncError extends Error {}

async function gh(path: string, token: string, init: RequestInit = {}) {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      cache: 'no-store',
    })
  } catch {
    throw new SyncError('offline')
  }
  if (res.status === 401) throw new SyncError('Token ใช้ไม่ได้หรือหมดอายุ')
  if (res.status === 403 || res.status === 429) throw new SyncError('GitHub จำกัดการเรียกชั่วคราว')
  if (res.status === 404) throw new SyncError('ไม่พบ gist หรือ token ไม่มีสิทธิ์ gist')
  if (!res.ok) throw new SyncError(`GitHub ตอบกลับ ${res.status}`)
  return res.json()
}

async function readEnvelope(token: string, gist: { files: Record<string, { content?: string; truncated?: boolean; raw_url: string }> }) {
  const file = gist.files[FILE]
  if (!file) throw new SyncError('gist ไม่มีไฟล์ข้อมูล')
  let text = file.content ?? ''
  if (file.truncated || !text) {
    const res = await fetch(file.raw_url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    text = await res.text()
  }
  return JSON.parse(text) as Envelope
}

const importKey = (b64: string) => crypto.subtle.importKey('raw', fromB64(b64) as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])

async function seal(doc: Doc, cfg: Config): Promise<string> {
  const box = await encryptJSON(await importKey(cfg.key), doc)
  return JSON.stringify({ app: 'achieve', v: 1, salt: cfg.salt, ...box } satisfies Envelope)
}

/** Validates the token, finds (or creates) the gist and checks the passphrase against it. */
export async function connect(token: string, passphrase: string) {
  token = token.trim()
  const user = (await gh('/user', token)) as { login: string }
  let found: { id: string; env: Envelope } | null = null
  for (let page = 1; page <= 10 && !found; page++) {
    const list = (await gh(`/gists?per_page=100&page=${page}`, token)) as { id: string; files: Record<string, unknown> }[]
    const hit = list.find((g) => FILE in g.files)
    if (hit) found = { id: hit.id, env: await readEnvelope(token, await gh(`/gists/${hit.id}`, token)) }
    if (list.length < 100) break
  }

  if (found) {
    const key = await deriveKey(passphrase, fromB64(found.env.salt), ITERATIONS, true)
    let remote: Doc
    try {
      remote = await decryptJSON<Doc>(key, found.env)
    } catch {
      throw new SyncError('รหัสซิงก์ไม่ตรงกับข้อมูลที่ซิงก์ไว้')
    }
    config = { token, gistId: found.id, salt: found.env.salt, key: toB64(await crypto.subtle.exportKey('raw', key)), login: user.login }
    useStore.getState().absorb(remote)
  } else {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await deriveKey(passphrase, salt, ITERATIONS, true)
    const draft: Config = { token, gistId: '', salt: toB64(salt), key: toB64(await crypto.subtle.exportKey('raw', key)), login: user.login }
    const gist = (await gh('/gists', token, {
      method: 'POST',
      body: JSON.stringify({ description: DESCRIPTION, public: false, files: { [FILE]: { content: await seal(useStore.getState().doc, draft) } } }),
    })) as { id: string }
    config = { ...draft, gistId: gist.id }
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  useSync.setState({ state: 'idle', error: null, login: config.login })
  await syncNow()
}

export function disconnect() {
  config = null
  localStorage.removeItem(CONFIG_KEY)
  useSync.setState({ state: 'off', error: null, login: null })
}

let running: Promise<void> | null = null
let again = false

export function syncNow(): Promise<void> {
  if (!config) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await round()
    } while (again && config)
  })().finally(() => (running = null))
  return running
}

async function round() {
  const cfg = config
  if (!cfg) return
  if (!navigator.onLine) return void useSync.setState({ state: 'offline' })
  useSync.setState({ state: 'syncing' })
  try {
    const env = await readEnvelope(cfg.token, await gh(`/gists/${cfg.gistId}`, cfg.token))
    const remote = await decryptJSON<Doc>(await importKey(cfg.key), env).catch(() => {
      throw new SyncError('ถอดรหัสข้อมูลซิงก์ไม่ได้ ลองเชื่อมใหม่')
    })
    useStore.getState().absorb(remote)
    const merged = mergeDocs(useStore.getState().doc, remote)
    if (docSignature(merged) !== docSignature(remote)) {
      await gh(`/gists/${cfg.gistId}`, cfg.token, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: await seal(merged, cfg) } } }) })
    }
    const at = Date.now()
    localStorage.setItem(`${CONFIG_KEY}-last`, String(at))
    useSync.setState({ state: 'idle', lastSync: at, error: null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    useSync.setState(msg === 'offline' ? { state: 'offline' } : { state: 'error', error: msg })
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined

/** Wires automatic sync: after edits, on focus/online, and every 90 s while visible. */
export function startAutoSync() {
  useStore.subscribe((s, prev) => {
    if (s.doc === prev.doc || !config) return
    clearTimeout(debounce)
    debounce = setTimeout(() => void syncNow(), 2500)
  })
  const kick = () => document.visibilityState === 'visible' && void syncNow()
  document.addEventListener('visibilitychange', kick)
  window.addEventListener('online', kick)
  setInterval(kick, 90_000)
  void syncNow()
}
