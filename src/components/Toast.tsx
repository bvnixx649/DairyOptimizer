import { AnimatePresence, motion } from 'motion/react'
import { useUI } from '../store/ui'

export function Toast() {
  const toast = useUI((s) => s.toast)
  const dismiss = useUI((s) => s.dismissToast)
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
          >
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                className="undo"
                onClick={() => {
                  toast.undo!()
                  dismiss()
                }}
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
