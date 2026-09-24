import { motion, useAnimationControls } from 'motion/react'
import { Delete, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { tick } from '../../lib/haptics'
import { useStore } from '../../store/store'
import { closeThen, useUI } from '../../store/ui'

const LENGTH = 6

export function PinSheet({ purpose, then }: { purpose: 'unlock' | 'set'; then?: () => void }) {
  const unlock = useStore((s) => s.unlock)
  const setPin = useStore((s) => s.setPin)
  const notify = useUI((s) => s.notify)
  const [pin, setPinText] = useState('')
  const [first, setFirst] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shake = useAnimationControls()

  const fail = (msg: string) => {
    setError(msg)
    tick(40)
    void shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } })
    setPinText('')
  }

  const done = () => closeThen(() => then?.())

  useEffect(() => {
    if (pin.length !== LENGTH || busy) return
    void (async () => {
      if (purpose === 'unlock') {
        setBusy(true)
        const ok = await unlock(pin)
        setBusy(false)
        return ok ? done() : fail('Wrong PIN')
      }
      if (!first) {
        setFirst(pin)
        setPinText('')
        setError('')
        return
      }
      if (pin !== first) {
        setFirst(null)
        return fail('PINs didn’t match, try again')
      }
      setBusy(true)
      try {
        await setPin(pin)
        notify('PIN set')
        done()
      } catch {
        fail('Unlock private tasks before changing the PIN')
      } finally {
        setBusy(false)
      }
    })()
  }, [pin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) setPinText((p) => (p.length < LENGTH ? p + e.key : p))
      else if (e.key === 'Backspace') setPinText((p) => p.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const heading = purpose === 'unlock' ? 'Enter PIN' : first ? 'Confirm PIN' : 'Set a 6-digit PIN'

  return (
    <Sheet label={heading}>
      <div className="pin-sheet">
        <span className="icon-tile" style={{ width: 52, height: 52, borderRadius: 18 }}>
          <LockKeyhole size={24} />
        </span>
        <h2 className="pin-title">{heading}</h2>
        <p className={`pin-msg${error ? ' err' : ''}`}>{error || (busy ? 'Checking…' : purpose === 'set' && !first ? 'Unlocks private tasks on every device' : ' ')}</p>
        <motion.div className="pin-dots" animate={shake} aria-label={`${pin.length} of ${LENGTH} digits entered`}>
          {Array.from({ length: LENGTH }, (_, i) => (
            <span key={i} className={i < pin.length ? 'on' : ''} />
          ))}
        </motion.div>
        <div className="keypad pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((k) =>
            k === '' ? (
              <span key="blank" />
            ) : (
              <button
                key={k}
                type="button"
                className={`key${k === 'back' ? ' fn' : ''}`}
                disabled={busy}
                aria-label={k === 'back' ? 'Delete' : k}
                onClick={() => {
                  tick(5)
                  setError('')
                  setPinText((p) => (k === 'back' ? p.slice(0, -1) : p.length < LENGTH ? p + k : p))
                }}
              >
                {k === 'back' ? <Delete size={22} /> : k}
              </button>
            ),
          )}
        </div>
      </div>
    </Sheet>
  )
}
