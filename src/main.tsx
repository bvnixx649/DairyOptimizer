import '@fontsource-variable/anuphan'
import '@fontsource-variable/geist'
import './styles/base.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/features.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { startAutoSync } from './store/sync'

registerSW({ immediate: true })
startAutoSync()

if (import.meta.env.DEV)
  void Promise.all([import('./store/store'), import('./store/sync')]).then(([s, y]) => Object.assign(window, { __store: s.useStore, __sync: y }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
