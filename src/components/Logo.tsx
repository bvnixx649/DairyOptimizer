import { useId } from 'react'

export function LogoMark({ size = 26 }: { size?: number }) {
  const id = 'lm' + useId().replace(/[^a-z0-9]/gi, '')
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB199" />
          <stop offset="1" stopColor="#FF8059" />
        </linearGradient>
      </defs>
      <path d="M5.5 26 15.2 7.4a1 1 0 0 1 1.8 0L26.5 26" fill="none" stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6 19.5h6.8" stroke="#F6F4F1" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span>Achieve</span>
    </span>
  )
}
