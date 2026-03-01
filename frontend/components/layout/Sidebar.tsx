'use client'

import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { TAX_SECTIONS } from '@/lib/types'
import { PAST_YEAR_DATA, CURRENT_TAX_YEAR } from '@/lib/dummyData'

// A section is complete when none of its fields appear in the missing list
// and we've loaded status at least once (percentComplete > 0)
function isSectionComplete(sectionLabel: string, missingFields: string[], percentComplete: number): boolean {
  if (percentComplete === 0) return false
  return !missingFields.some((f) =>
    f.toLowerCase().startsWith(sectionLabel.toLowerCase())
  )
}

export function Sidebar() {
  const {
    userEmail,
    activeSection,
    activeYear,
    percentComplete,
    missingFields,
    setActiveSection,
  } = useStore(
    useShallow((s) => ({
      userEmail: s.userEmail,
      activeSection: s.activeSection,
      activeYear: s.activeYear,
      percentComplete: s.percentComplete,
      missingFields: s.missingFields,
      setActiveSection: s.setActiveSection,
    }))
  )

  const firstName = userEmail ? userEmail.split('@')[0] : 'there'
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,'

  const isPastYear = activeYear !== CURRENT_TAX_YEAR
  const pastYearRecord = isPastYear ? PAST_YEAR_DATA[activeYear] : null
  const effectivePercent = isPastYear ? 100 : Math.round(percentComplete)

  return (
    <aside className="w-1/5 bg-cream-deep border-r border-hairline overflow-y-auto flex flex-col pt-8 px-4">
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-[13px] text-muted">{greeting}</p>
        <h2 className="text-2xl font-extrabold text-ink mt-0.5 capitalize">{firstName}</h2>
      </div>

      {/* Progress ring */}
      <div className="flex justify-center mb-5">
        <ProgressRing
          percent={effectivePercent}
          subLabel={isPastYear ? 'filed' : 'complete'}
        />
      </div>

      {/* Year label + filed date for past years */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
          {activeYear} Return
        </p>
        {isPastYear && pastYearRecord && (
          <span className="text-[10px] font-mono text-green font-semibold">
            ✓ {pastYearRecord.filedDate.split(',')[0]}
          </span>
        )}
      </div>

      {/* Sections — always shown for all years */}
      <nav className="flex-1">
        {TAX_SECTIONS.map((section) => {
          const isActive = activeSection === section && !isPastYear
          // Past years: all sections are complete. Current year: check missing fields.
          const complete = isPastYear || isSectionComplete(section, missingFields, percentComplete)
          const hasStarted = percentComplete > 0 || isPastYear

          return (
            <button
              key={section}
              onClick={() => { if (!isPastYear) setActiveSection(section) }}
              className={clsx(
                'flex items-center justify-between w-full text-left py-1.5 px-2 text-[13px] rounded transition-colors mb-0.5',
                isActive
                  ? 'bg-green text-white font-semibold'
                  : isPastYear
                  ? 'text-muted cursor-default'
                  : 'text-ink hover:bg-[#F0EDE6] cursor-pointer'
              )}
            >
              <span>{section}</span>

              {/* Status indicator */}
              {complete ? (
                <span className={clsx('text-[11px] font-bold ml-2 flex-shrink-0', isActive ? 'text-white' : 'text-green')}>
                  ✓
                </span>
              ) : hasStarted ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber ml-2 flex-shrink-0" />
              ) : null}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
