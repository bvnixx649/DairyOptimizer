import { Cloud, CloudAlert, CloudOff, RefreshCw } from 'lucide-react'
import { useSync } from '../../store/sync'
import { useUI } from '../../store/ui'

export function SyncDot() {
  const state = useSync((s) => s.state)
  const open = useUI((s) => s.open)
  if (state === 'off') return null
  const Icon = state === 'syncing' ? RefreshCw : state === 'error' ? CloudAlert : state === 'offline' ? CloudOff : Cloud
  const label = { syncing: 'Syncing', error: 'Sync failed', offline: 'Offline', idle: 'Synced' }[state]
  return (
    <button className={`icon-btn plain sync-dot ${state}`} aria-label={label} title={label} onClick={() => open({ type: 'settings' })}>
      <Icon size={18} />
    </button>
  )
}
