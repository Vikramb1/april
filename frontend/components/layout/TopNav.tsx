'use client'

import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { ALL_YEARS, CURRENT_TAX_YEAR } from '@/lib/dummyData'

const PHASE_STYLES: Record<string, string> = {
  collecting: 'bg-amber-pale text-amber',
  reviewing:  'bg-blue-50 text-blue-600',
  filing:     'bg-amber-pale text-amber',
  filed:      'bg-green-pale text-green',
}

const PHASE_LABELS: Record<string, string> = {
  collecting: 'Collecting',
  reviewing:  'Reviewing',
  filing:     'Filing',
  filed:      'Filed',
}

export function TopNav() {
  const { userEmail, phase, activeYear, setActiveYear } = useStore(
    useShallow((s) => ({
      userEmail: s.userEmail,
      phase: s.phase,
      activeYear: s.activeYear,
      setActiveYear: s.setActiveYear,
    }))
  )

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'AP'

  return (
    <header className="h-14 fixed top-0 left-0 right-0 bg-white border-b border-hairline z-50 flex items-center px-5 gap-4">
      {/* Logo */}
      <Link href="/" className="flex items-center flex-shrink-0">
        <Image
          src="/april-logo-no-bg.png"
          alt="April"
          width={72}
          height={24}
          priority
          className="h-8 w-auto"
        />
      </Link>

      {/* Year switcher */}
      <div className="flex items-center gap-2 ml-4">
        <span className="text-[11px] uppercase tracking-widest text-muted font-semibold">Tax Year</span>
        <div className="flex gap-1 bg-[#F3F4F6] rounded-full p-1">
        {ALL_YEARS.map((year) => {
          const isPast = year !== CURRENT_TAX_YEAR
          const isActive = activeYear === year
          return (
            <button
              key={year}
              onClick={() => setActiveYear(year)}
              className={clsx(
                'px-3 py-0.5 text-[13px] rounded-full transition-colors duration-150 flex items-center gap-1 cursor-pointer',
                isActive
                  ? 'bg-green text-white font-bold'
                  : 'text-muted hover:text-ink'
              )}
            >
              {year}
              {isPast && (
                <span className={clsx('text-[10px]', isActive ? 'text-white' : 'text-green')}>✓</span>
              )}
            </button>
          )
        })}
        </div>
      </div>

      {/* Phase pill */}
      {activeYear !== CURRENT_TAX_YEAR ? (
        <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-pale text-green">
          Filed
        </span>
      ) : (
        <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', PHASE_STYLES[phase])}>
          {PHASE_LABELS[phase]}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center select-none">
        {initials}
      </div>
    </header>
  )
}
