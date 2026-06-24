import { CheckCircle2 } from 'lucide-react'
import { LogoMark } from './Logo'
import ThemeToggle from './ThemeToggle'
import ServerStatusBadge from './ServerStatusBadge'
import useBackendStatus from '../../hooks/useBackendStatus'

const FEATURES = [
  'Write, run & submit in Python, Java, C++ or C',
  'Instant test-case feedback — expected vs your output',
  'Proctored test mode with live monitoring',
  'Detailed analytics & weak-area insights',
]

export default function AuthShell({ children }) {
  const { online, checking } = useBackendStatus()
  return (
    <div className="min-h-screen flex bg-beige-pg">
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'var(--brand-solid)' }}
      >
        {/* soft decorative shapes */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="pointer-events-none absolute -bottom-32 -right-16 w-96 h-96 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <div className="relative flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white"><LogoMark size={22} /></span>
          <span className="text-white font-bold text-lg tracking-tight">CodeArena</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-white font-serif font-semibold text-[34px] leading-[1.15] tracking-tight">
            Prove it in code — Python, Java, C++ or C.
          </h1>
          <p className="text-white/80 mt-4 text-[15px] leading-relaxed">
            A focused, proctored workspace for coding tests — write code in your language, get instant test-case feedback, and <em>see</em> exactly how it runs.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-white/90 text-[14px]">
                <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-white/70" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/55 text-xs">© CodeArena · Multi-Language Coding Tests</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative">
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <ServerStatusBadge online={online} checking={checking} />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          {/* compact brand for small screens (brand panel hidden) */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <span className="w-12 h-12 rounded-xl bg-brand-solid flex items-center justify-center text-white mb-3"><LogoMark size={26} /></span>
            <h1 className="font-sans font-bold text-t text-2xl tracking-tight">CodeArena</h1>
            <p className="text-t3 text-[13px] mt-0.5">Multi-Language Coding Tests</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
