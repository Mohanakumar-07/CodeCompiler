/**
 * CodeArena brand mark — a `</>` code-bracket glyph,
 * drawn crisp at any size. Flat white-on-brand, no gradients.
 *
 * <Logo />              → glyph on the indigo rounded tile
 * <Logo tile={false} /> → glyph only (inherits currentColor)
 * <Logo tile size={48}/>→ larger lockup
 */
export function LogoMark({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* left angle bracket < */}
      <path
        d="M9 10 L3.5 16 L9 22"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* forward slash / — taller than brackets for clarity */}
      <path
        d="M19 4.5 L13 27.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* right angle bracket > */}
      <path
        d="M23 10 L28.5 16 L23 22"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Logo({ size = 32, radius, tile = true, className = '' }) {
  const r = radius ?? Math.round(size * 0.28)
  if (!tile) return <LogoMark size={Math.round(size * 0.65)} className={className} />
  return (
    <span
      className={`inline-flex items-center justify-center bg-brand-solid text-white shadow-xs ${className}`}
      style={{ width: size, height: size, borderRadius: r }}
    >
      <LogoMark size={Math.round(size * 0.65)} />
    </span>
  )
}
