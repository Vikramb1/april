'use client'

import { clsx } from 'clsx'
import type { SectionStatus } from '@/lib/types'

interface Pill {
  label: string
  status: SectionStatus
}

interface SectionPillsProps {
  pills: Pill[]
  active: string
  onSelect: (label: string) => void
}

export function SectionPills({ pills, active, onSelect }: SectionPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {pills.map((pill) => {
        const isActive = pill.label === active
        return (
          <button
            key={pill.label}
            onClick={() => onSelect(pill.label)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 flex items-center gap-1.5',
              pill.status === 'complete' && !isActive && 'border border-green text-green',
              pill.status === 'in_progress' && !isActive && 'border border-amber text-amber',
              pill.status === 'pending' && !isActive && 'border border-hairline text-muted',
              isActive && 'bg-green text-white border border-green'
            )}
          >
            {pill.status === 'complete' && !isActive && (
              <span className="text-[11px]">✓</span>
            )}
            {pill.status === 'in_progress' && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber pulse-dot" />
            )}
            {pill.label}
          </button>
        )
      })}
    </div>
  )
}
