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
  if (s < 60) return 'เมื่อสักครู่'
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`
  if (s < 86400) return `${Math.floor(s / 3600)} ชม. ที่แล้ว`
  return new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
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
    <Sheet tall title="ตั้งค่า">
      <div className="settings">
        <SyncSection />

        <section>
          <h3 className="set-h">ความเป็นส่วนตัว</h3>
          <div className="prop-list">
            {settings.pin ? (
              <>
                {pinKey ? (
                  <button className="prop" onClick={() => (lock(), notify('ล็อกงานส่วนตัวแล้ว'))}>
                    <Lock size={18} />
                    <span className="prop-label">ล็อกตอนนี้</span>
                  </button>
                ) : (
                  <button className="prop" onClick={() => open({ type: 'pin', purpose: 'unlock' })}>
                    <LockOpen size={18} />
                    <span className="prop-label">ปลดล็อกงานส่วนตัว</span>
                  </button>
                )}
                <button className="prop" onClick={() => (pinKey ? open({ type: 'pin', purpose: 'set' }) : open({ type: 'pin', purpose: 'unlock', then: () => open({ type: 'pin', purpose: 'set' }) }))}>
                  <KeyRound size={18} />
                  <span className="prop-label">เปลี่ยน PIN</span>
                  <ChevronRight size={18} className="faint" />
                </button>
                <button
                  className="prop danger-prop"
                  onClick={() => {
                    const run = () =>
                      removePin().then(
                        () => notify('ปิด PIN แล้ว งานส่วนตัวกลับเป็นงานปกติ'),
                        () => notify('ปลดล็อกก่อน'),
                      )
                    if (pinKey) void run()
                    else open({ type: 'pin', purpose: 'unlock', then: () => void run() })
                  }}
                >
                  <span className="prop-label">ปิด PIN</span>
                </button>
              </>
            ) : (
              <button className="prop" onClick={() => open({ type: 'pin', purpose: 'set' })}>
                <KeyRound size={18} />
                <span className="prop-label">ตั้ง PIN สำหรับงานส่วนตัว</span>
                <ChevronRight size={18} className="faint" />
              </button>
            )}
          </div>
        </section>

        <section>
          <h3 className="set-h">เงิน</h3>
          <div className="prop-list">
            <button className="prop" onClick={() => open({ type: 'budget' })}>
              <Wallet size={18} />
              <span className="prop-label">งบรายเดือน</span>
              <span className="prop-value num">{settings.budget ? `฿${baht(settings.budget)}` : 'ไม่ตั้ง'}</span>
              <ChevronRight size={18} className="faint" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="set-h">ตารางเรียน</h3>
          <div className="prop-list">
            {subjects.map((s) => (
              <button key={s.id} className="prop" onClick={() => open({ type: 'subject', id: s.id })} style={{ '--c': s.color } as CSSProperties}>
                <i className="dot-c" />
                <span className="prop-label">
                  {s.short} <span className="faint num" style={{ fontSize: 13 }}>{s.code}</span>
                </span>
                <span className="prop-value num">{live(classes).filter((c) => c.subjectId === s.id).length} คาบ</span>
                <ChevronRight size={18} className="faint" />
              </button>
            ))}
            <button className="prop accent-prop" onClick={() => open({ type: 'subjectEdit' })}>
              <Plus size={18} />
              <span className="prop-label">เพิ่มวิชา</span>
            </button>
          </div>
        </section>

        <section>
          <h3 className="set-h">ช่วงเวลาที่ใช้หาเวลาว่าง</h3>
          <div className="prop-list">
            <label className="prop">
              <Clock3 size={18} />
              <span className="prop-label">เริ่มวัน</span>
              <input type="time" value={settings.dayStart} onChange={(e) => e.target.value && e.target.value < settings.dayEnd && updateSettings({ dayStart: e.target.value })} />
            </label>
            <label className="prop">
              <Clock3 size={18} style={{ opacity: 0 }} />
              <span className="prop-label">จบวัน</span>
              <input type="time" value={settings.dayEnd} onChange={(e) => e.target.value && e.target.value > settings.dayStart && updateSettings({ dayEnd: e.target.value })} />
            </label>
          </div>
        </section>

        <BackupSection />

        <p className="set-foot">Achieve 3.0 · ข้อมูลเก็บในเครื่องนี้{useSync.getState().state !== 'off' ? ' และ gist ส่วนตัว (เข้ารหัส)' : ''}</p>
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
        <h3 className="set-h">ซิงก์ระหว่างเครื่อง</h3>
        <div className="prop-list">
          <div className="prop">
            <CloudUpload size={18} />
            <span className="prop-label">
              GitHub Gist <span className="faint">· {sync.login}</span>
            </span>
            <span className={`prop-value${sync.state === 'error' ? ' danger-text' : ''}`}>
              {sync.state === 'syncing' ? 'กำลังซิงก์…' : sync.state === 'offline' ? 'ออฟไลน์' : sync.state === 'error' ? 'มีปัญหา' : sync.lastSync ? ago(sync.lastSync) : ''}
            </span>
          </div>
          {sync.error && <div className="prop danger-text" style={{ fontSize: 14 }}>{sync.error}</div>}
          <button className="prop" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}>
            <RefreshCw size={18} />
            <span className="prop-label">ซิงก์ตอนนี้</span>
          </button>
          <button className="prop danger-prop" onClick={disconnect}>
            <span className="prop-label">เลิกซิงก์บนเครื่องนี้</span>
          </button>
        </div>
      </section>
    )

  return (
    <section>
      <h3 className="set-h">ซิงก์ iPad กับมือถือ</h3>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!token.trim() || pass.length < 8) return
          setBusy(true)
          setErr('')
          try {
            await connect(token, pass)
            useUI.getState().notify('เชื่อมซิงก์แล้ว')
          } catch (x) {
            setErr(x instanceof Error ? (x.message === 'offline' ? 'ต่ออินเทอร์เน็ตไม่ได้' : x.message) : 'เชื่อมไม่สำเร็จ')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="field">
          <span className="field-label">GitHub token (สิทธิ์ gist)</span>
          <input type="password" autoComplete="off" spellCheck={false} placeholder="ghp_…" value={token} onChange={(e) => setToken(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">รหัสซิงก์ · ตั้งเองอย่างน้อย 8 ตัว ใช้เหมือนกันทุกเครื่อง</span>
          <input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </label>
        {err && <div className="note warn">{err}</div>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a className="link-btn" href="https://github.com/settings/tokens/new?scopes=gist&description=Achieve%20sync" target="_blank" rel="noreferrer">
            สร้าง token <ExternalLink size={14} />
          </a>
          <span style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" disabled={busy || !token.trim() || pass.length < 8}>
            {busy ? 'กำลังเชื่อม…' : 'เชื่อม'}
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
      if (f.size > 20e6) throw new Error('ไฟล์ใหญ่เกิน 20 MB')
      const data = JSON.parse(await f.text())
      if (data?.app === 'achieve' && data.schema === 3 && data.doc) {
        const d = data.doc as Doc
        setPending({ kind: 'v3', doc: d, counts: `${live(d.tasks ?? []).length} งาน · ${live(d.txs ?? []).length} รายการเงิน · ${live(d.habits ?? []).length} นิสัย` })
      } else if (isLegacyBackup(data)) {
        setPending({
          kind: 'legacy',
          backup: data,
          locked: legacyLockedCount(data),
          counts: `${data.tasks.length} งาน · ${data.transactions.length} รายการเงิน · ${(data.habits ?? []).length} นิสัย`,
        })
      } else throw new Error('ไม่ใช่ไฟล์สำรองของ Achieve')
    } catch (e) {
      setErr(e instanceof Error && e.message.length < 60 ? e.message : 'อ่านไฟล์ไม่ได้')
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
        if (pending.locked && oldPin && conv.skippedLocked === pending.locked) throw new Error('PIN เดิมไม่ถูกต้อง')
        if (conv.privateIds.length) {
          let key = useStore.getState().pinKey
          if (!key) {
            if (!store.doc.settings.find((s) => s.pin && !s.deleted) && /^\d{6}$/.test(oldPin)) {
              await store.setPin(oldPin)
              key = useStore.getState().pinKey
            } else throw new Error('ปลดล็อก PIN ของแอปก่อน แล้วนำเข้าอีกครั้ง')
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
        if (conv.skippedLocked) notify(`ข้ามงานที่ล็อกไว้ ${conv.skippedLocked} งาน`)
      }
      setPending(null)
      setOldPin('')
      notify('นำเข้าข้อมูลแล้ว')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'นำเข้าไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h3 className="set-h">ข้อมูล</h3>
      <div className="prop-list">
        <button className="prop" onClick={() => void exportData()}>
          <Download size={18} />
          <span className="prop-label">ส่งออกไฟล์สำรอง</span>
        </button>
        <button className="prop" onClick={() => fileRef.current?.click()}>
          <Upload size={18} />
          <span className="prop-label">นำเข้า (รวมไฟล์จาก Achieve เดิม)</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      {pending && (
        <div className="card card-pad import-card stack">
          <div>
            <b>{pending.kind === 'legacy' ? 'ไฟล์จาก Achieve เดิม' : 'ไฟล์สำรอง'}</b>
            <p className="muted" style={{ fontSize: 14 }}>
              {pending.counts} · รวมกับข้อมูลที่มีอยู่
            </p>
          </div>
          {pending.kind === 'legacy' && pending.locked > 0 && (
            <label className="field">
              <span className="field-label">PIN เดิมของงานที่ล็อก {pending.locked} งาน (เว้นว่าง = ข้าม)</span>
              <input type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-quiet btn-sm" onClick={() => setPending(null)}>
              ยกเลิก
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => void run()}>
              {busy ? 'กำลังนำเข้า…' : 'นำเข้า'}
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
