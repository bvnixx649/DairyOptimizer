import { ChevronRight, Clock3, CloudUpload, Download, ExternalLink, KeyRound, Lock, LockOpen, Plus, RefreshCw, Upload, Wallet } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { Sheet } from '../../components/Sheet'
import type { Doc, TaskSecret } from '../../data/types'
import { decryptLegacy, encryptJSON } from '../../lib/crypto'
import { todayKey } from '../../lib/date'
import { convertLegacy, isLegacyBackup, legacyLockedCount, type LegacyBackup } from '../../lib/legacy'
import { baht } from '../../lib/money'
import { useSettings, useSubjects } from '../../store/selectors'
import { live, useStore } from '../../store/store'
import { connect, disconnect, syncNow, useSync } from '../../store/sync'
import { useUI } from '../../store/ui'

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  return new Date(t).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export function SettingsSheet() {
  const settings = useSettings()
  const { list: subjects } = useSubjects()
  const pinKey = useStore((s) => s.pinKey)
  const lock = useStore((s) => s.lock)
  const removePin = useStore((s) => s.removePin)
  const updateSettings = useStore((s) => s.updateSettings)
  const classes = useStore((s) => s.doc.classes)
  const { open, notify } = useUI.getState()

  return (
    <Sheet tall title="Settings">
      <div className="settings">
        <SyncSection />

        <section>
          <h3 className="set-h">Privacy</h3>
          <div className="prop-list">
            {settings.pin ? (
              <>
                {pinKey ? (
                  <button className="prop" onClick={() => (lock(), notify('Private tasks locked'))}>
                    <Lock size={18} />
                    <span className="prop-label">Lock now</span>
                  </button>
                ) : (
                  <button className="prop" onClick={() => open({ type: 'pin', purpose: 'unlock' })}>
                    <LockOpen size={18} />
                    <span className="prop-label">Unlock private tasks</span>
                  </button>
                )}
                <button className="prop" onClick={() => (pinKey ? open({ type: 'pin', purpose: 'set' }) : open({ type: 'pin', purpose: 'unlock', then: () => open({ type: 'pin', purpose: 'set' }) }))}>
                  <KeyRound size={18} />
                  <span className="prop-label">Change PIN</span>
                  <ChevronRight size={18} className="faint" />
                </button>
                <button
                  className="prop danger-prop"
                  onClick={() => {
                    const run = () =>
                      removePin().then(
                        () => notify('PIN removed; private tasks are now regular tasks'),
                        () => notify('Unlock first'),
                      )
                    if (pinKey) void run()
                    else open({ type: 'pin', purpose: 'unlock', then: () => void run() })
                  }}
                >
                  <span className="prop-label">Turn off PIN</span>
                </button>
              </>
            ) : (
              <button className="prop" onClick={() => open({ type: 'pin', purpose: 'set' })}>
                <KeyRound size={18} />
                <span className="prop-label">Set a PIN for private tasks</span>
                <ChevronRight size={18} className="faint" />
              </button>
            )}
          </div>
        </section>

        <section>
          <h3 className="set-h">Money</h3>
          <div className="prop-list">
            <button className="prop" onClick={() => open({ type: 'budget' })}>
              <Wallet size={18} />
              <span className="prop-label">Monthly budget</span>
              <span className="prop-value num">{settings.budget ? `฿${baht(settings.budget)}` : 'None'}</span>
              <ChevronRight size={18} className="faint" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="set-h">Timetable</h3>
          <div className="prop-list">
            {subjects.map((s) => (
              <button key={s.id} className="prop" onClick={() => open({ type: 'subject', id: s.id })} style={{ '--c': s.color } as CSSProperties}>
                <i className="dot-c" />
                <span className="prop-label">
                  {s.short} <span className="faint num" style={{ fontSize: 13 }}>{s.code}</span>
                </span>
                <span className="prop-value num">{live(classes).filter((c) => c.subjectId === s.id).length} classes</span>
                <ChevronRight size={18} className="faint" />
              </button>
            ))}
            <button className="prop accent-prop" onClick={() => open({ type: 'subjectEdit' })}>
              <Plus size={18} />
              <span className="prop-label">Add subject</span>
            </button>
          </div>
        </section>

        <section>
          <h3 className="set-h">Hours used to find free time</h3>
          <div className="prop-list">
            <label className="prop">
              <Clock3 size={18} />
              <span className="prop-label">Day starts</span>
              <input type="time" value={settings.dayStart} onChange={(e) => e.target.value && e.target.value < settings.dayEnd && updateSettings({ dayStart: e.target.value })} />
            </label>
            <label className="prop">
              <Clock3 size={18} style={{ opacity: 0 }} />
              <span className="prop-label">Day ends</span>
              <input type="time" value={settings.dayEnd} onChange={(e) => e.target.value && e.target.value > settings.dayStart && updateSettings({ dayEnd: e.target.value })} />
            </label>
          </div>
        </section>

        <BackupSection />

        <p className="set-foot">Achieve 3.0 · Data stays on this device{useSync.getState().state !== 'off' ? ' and your encrypted gist' : ''}</p>
      </div>
    </Sheet>
  )
}

function SyncSection() {
  const sync = useSync()
  const [token, setToken] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (sync.state !== 'off')
    return (
      <section>
        <h3 className="set-h">Sync</h3>
        <div className="prop-list">
          <div className="prop">
            <CloudUpload size={18} />
            <span className="prop-label">
              GitHub Gist <span className="faint">· {sync.login}</span>
            </span>
            <span className={`prop-value${sync.state === 'error' ? ' danger-text' : ''}`}>
              {sync.state === 'syncing' ? 'Syncing…' : sync.state === 'offline' ? 'Offline' : sync.state === 'error' ? 'Problem' : sync.lastSync ? ago(sync.lastSync) : ''}
            </span>
          </div>
          {sync.error && <div className="prop danger-text" style={{ fontSize: 14 }}>{sync.error}</div>}
          <button className="prop" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}>
            <RefreshCw size={18} />
            <span className="prop-label">Sync now</span>
          </button>
          <button className="prop danger-prop" onClick={disconnect}>
            <span className="prop-label">Stop syncing on this device</span>
          </button>
        </div>
      </section>
    )

  return (
    <section>
      <h3 className="set-h">Sync iPad and phone</h3>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!token.trim() || pass.length < 8) return
          setBusy(true)
          setErr('')
          try {
            await connect(token, pass)
            useUI.getState().notify('Sync connected')
          } catch (x) {
            setErr(x instanceof Error ? (x.message === 'offline' ? 'No internet connection' : x.message) : 'Could not connect')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="field">
          <span className="field-label">GitHub token (gist scope)</span>
          <input type="password" autoComplete="off" spellCheck={false} placeholder="ghp_…" value={token} onChange={(e) => setToken(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Sync passphrase · 8+ characters, same on every device</span>
          <input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </label>
        {err && <div className="note warn">{err}</div>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a className="link-btn" href="https://github.com/settings/tokens/new?scopes=gist&description=Achieve%20sync" target="_blank" rel="noreferrer">
            Create token <ExternalLink size={14} />
          </a>
          <span style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" disabled={busy || !token.trim() || pass.length < 8}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </form>
    </section>
  )
}

type Pending = { kind: 'v3'; doc: Doc; counts: string } | { kind: 'legacy'; backup: LegacyBackup; counts: string; locked: number }

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [oldPin, setOldPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const notify = useUI((s) => s.notify)

  const exportData = async () => {
    const doc = useStore.getState().doc
    const text = JSON.stringify({ app: 'achieve', schema: 3, exportedAt: new Date().toISOString(), doc })
    const name = `achieve-backup-${todayKey()}.json`
    const file = new File([text], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ files: [file], title: name })
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    const url = URL.createObjectURL(file)
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const pick = async (f: File | undefined) => {
    setErr('')
    setPending(null)
    if (!f) return
    try {
      if (f.size > 20e6) throw new Error('File is larger than 20 MB')
      const data = JSON.parse(await f.text())
      if (data?.app === 'achieve' && data.schema === 3 && data.doc) {
        const d = data.doc as Doc
        setPending({ kind: 'v3', doc: d, counts: `${live(d.tasks ?? []).length} tasks · ${live(d.txs ?? []).length} transactions · ${live(d.habits ?? []).length} habits` })
      } else if (isLegacyBackup(data)) {
        setPending({
          kind: 'legacy',
          backup: data,
          locked: legacyLockedCount(data),
          counts: `${data.tasks.length} tasks · ${data.transactions.length} transactions · ${(data.habits ?? []).length} habits`,
        })
      } else throw new Error('Not an Achieve backup file')
    } catch (e) {
      setErr(e instanceof Error && e.message.length < 60 ? e.message : 'Could not read the file')
    }
  }

  const run = async () => {
    if (!pending) return
    setBusy(true)
    setErr('')
    try {
      const store = useStore.getState()
      if (pending.kind === 'v3') {
        store.absorb(pending.doc)
      } else {
        const decrypt = oldPin ? (box: { salt: string; iv: string; cipher: string }) => decryptLegacy<Record<string, unknown>>(box, oldPin).catch(() => null) : null
        const conv = await convertLegacy(pending.backup, decrypt, todayKey())
        if (pending.locked && oldPin && conv.skippedLocked === pending.locked) throw new Error('Wrong old PIN')
        if (conv.privateIds.length) {
          let key = useStore.getState().pinKey
          if (!key) {
            if (!store.doc.settings.find((s) => s.pin && !s.deleted) && /^\d{6}$/.test(oldPin)) {
              await store.setPin(oldPin)
              key = useStore.getState().pinKey
            } else throw new Error('Unlock your PIN first, then import again')
          }
          conv.doc.tasks = await Promise.all(
            conv.doc.tasks.map(async (t) => {
              if (!conv.privateIds.includes(t.id)) return t
              const secret: TaskSecret = { title: t.title, notes: t.notes, checklist: t.checklist }
              return { ...t, title: '', notes: '', checklist: [], enc: await encryptJSON(key!, secret) }
            }),
          )
        }
        store.absorb(conv.doc)
        if (conv.budget && !getBudget()) store.updateSettings({ budget: conv.budget })
        if (conv.skippedLocked) notify(`Skipped ${conv.skippedLocked} locked tasks`)
      }
      setPending(null)
      setOldPin('')
      notify('Imported')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h3 className="set-h">Data</h3>
      <div className="prop-list">
        <button className="prop" onClick={() => void exportData()}>
          <Download size={18} />
          <span className="prop-label">Export backup</span>
        </button>
        <button className="prop" onClick={() => fileRef.current?.click()}>
          <Upload size={18} />
          <span className="prop-label">Import (also old Achieve backups)</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      {pending && (
        <div className="card card-pad import-card stack">
          <div>
            <b>{pending.kind === 'legacy' ? 'Old Achieve backup' : 'Backup file'}</b>
            <p className="muted" style={{ fontSize: 14 }}>
              {pending.counts} · merges with what’s here
            </p>
          </div>
          {pending.kind === 'legacy' && pending.locked > 0 && (
            <label className="field">
              <span className="field-label">Old PIN for {pending.locked} locked tasks (leave empty to skip)</span>
              <input type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-quiet btn-sm" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => void run()}>
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      )}
      {err && (
        <div className="note warn" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}
    </section>
  )
}

const getBudget = () => useStore.getState().doc.settings.find((s) => !s.deleted)?.budget ?? null
