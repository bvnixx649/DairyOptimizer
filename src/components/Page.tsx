import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  title: string
  sub?: ReactNode
  left?: ReactNode
  right?: ReactNode
  aside?: ReactNode
  glow?: boolean
  children: ReactNode
}

/** Large title that hands over to a compact blurred bar once scrolled past. */
export function Page({ title, sub, left, right, aside, glow, children }: Props) {
  const titleRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="page">
      {glow && <div className="page-glow" aria-hidden="true" />}
      <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
        {left}
        <div className="spacer" />
        {right}
        <div className="topbar-title" aria-hidden="true">
          {title}
        </div>
      </header>
      <div className="title-block title-row">
        <div ref={titleRef}>
          <h1 className="title-lg">{title}</h1>
          {sub && <p className="title-sub">{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </div>
  )
}
