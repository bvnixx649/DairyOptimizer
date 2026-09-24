import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Empty({ icon: Icon, text, action }: { icon: LucideIcon; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="icon-tile">
        <Icon size={24} strokeWidth={1.8} />
      </span>
      <p>{text}</p>
      {action}
    </div>
  )
}
