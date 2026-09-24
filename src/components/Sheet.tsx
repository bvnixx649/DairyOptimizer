import { motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useUI } from '../store/ui'
import { useTablet } from '../lib/useMedia'

interface Props {
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  tall?: boolean
  wide?: boolean
  label?: string
}

/** Bottom sheet on phones (drag down to dismiss), centred card on tablets. */
export function Sheet({ title, children, footer, actions, tall, wide, label }: Props) {
  const close = useUI((s) => s.close)
  const tablet = useTablet()
  const drag = useDragControls()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    if (!ref.current?.querySelector('[autofocus]')) ref.current?.focus({ preventScroll: true })
    return () => prev?.focus?.({ preventScroll: true })
  }, [])

  return (
    <>
      <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={() => close()} />
      <div className="sheet-wrap">
        <motion.div
          ref={ref}
          className={`sheet${tall ? ' tall' : ''}${wide ? ' wide' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={label ?? (typeof title === 'string' ? title : undefined)}
          tabIndex={-1}
          initial={tablet ? { opacity: 0, scale: 0.96, y: 16 } : { y: '100%' }}
          animate={tablet ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
          exit={tablet ? { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.16 } } : { y: '100%', transition: { type: 'spring', stiffness: 420, damping: 42 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
          drag={tablet ? false : 'y'}
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.9 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 600) close()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
            }
          }}
        >
          <div className="sheet-grab" onPointerDown={(e) => drag.start(e)} />
          {(title || actions) && (
            <div className="sheet-head" onPointerDown={(e) => !tablet && (e.target as HTMLElement).closest('button,input') === null && drag.start(e)}>
              <h2>{title}</h2>
              {actions}
              <button className="icon-btn sm" onClick={() => close()} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
          )}
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </motion.div>
      </div>
    </>
  )
}
