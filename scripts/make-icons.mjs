// Renders the app icons from one SVG source. Run: npm run icons
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const mark = (scale) => {
  // Mark drawn on a 32-unit grid, centred and scaled to `scale` of the canvas.
  const s = (1024 * scale) / 32
  const o = (1024 - 32 * s) / 2
  return `<g transform="translate(${o} ${o}) scale(${s})">
    <path d="M5.5 26 15.2 7.4a1 1 0 0 1 1.8 0L26.5 26" fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M12.6 19.5h6.8" stroke="#F6F4F1" stroke-width="3.4" stroke-linecap="round"/>
  </g>`
}

const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1D1B1A"/>
      <stop offset="1" stop-color="#0A0A0B"/>
    </linearGradient>
    <radialGradient id="warm" cx="0.3" cy="0.15" r="0.8">
      <stop offset="0" stop-color="#FF8059" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FF8059" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFB199"/>
      <stop offset="1" stop-color="#FF8059"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="0.9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1024" height="1024" rx="${rounded ? 228 : 0}" fill="url(#bg)"/>
  <rect width="1024" height="1024" rx="${rounded ? 228 : 0}" fill="url(#warm)"/>
  ${rounded ? '<rect x="3" y="3" width="1018" height="1018" rx="225" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="6"/>' : ''}
  ${mark(scale)}
</svg>`

mkdirSync('public/icons', { recursive: true })
const out = [
  ['public/icons/icon-512.png', 512, { rounded: true, scale: 0.62 }],
  ['public/icons/icon-192.png', 192, { rounded: true, scale: 0.62 }],
  ['public/icons/icon-maskable-512.png', 512, { rounded: false, scale: 0.5 }],
  ['public/icons/apple-touch-icon.png', 180, { rounded: false, scale: 0.6 }],
]
for (const [file, size, opts] of out) await sharp(Buffer.from(svg(opts))).resize(size, size).png().toFile(file)
console.log('icons written')
