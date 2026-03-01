'use client'

import { useStore } from '@/store'
import { TAX_SECTIONS } from '@/lib/types'

function formatTime(iso: string | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function FilingTimeline() {
  const filingProgress = useStore((s) => s.filingProgress)

  const sections = TAX_SECTIONS.map((name) => {
    const result = filingProgress.find((r) => r.section_name === name)
    const status = result ? 'complete' : 'pending'
    return { name, status, timestamp: result?.timestamp, success: result?.success }
  })

  // The first non-complete is in_progress
  const firstPendingIdx = sections.findIndex((s) => s.status === 'pending')
  if (firstPendingIdx >= 0 && filingProgress.length < TAX_SECTIONS.length) {
    sections[firstPendingIdx] = { ...sections[firstPendingIdx], status: 'in_progress' }
  }

  return (
    <div className="space-y-1">
      {sections.map((section, i) => (
        <div
          key={section.name}
          className={`flex items-center gap-3 py-3 px-3 rounded-lg transition-all duration-300 ${
            section.status === 'in_progress' ? 'bg-amber-pale shimmer' : ''
          } ${section.status === 'complete' ? 'opacity-100' : 'opacity-60'}`}
          style={{ transitionDelay: `${i * 150}ms` }}
        >
          {/* Status icon */}
          {section.status === 'complete' && (
            <span className={`font-bold text-lg ${section.success === false ? 'text-red' : 'text-green'}`}>
              {section.success === false ? '✗' : '✓'}
            </span>
          )}
          {section.status === 'in_progress' && (
            <span className="w-3 h-3 rounded-full bg-amber pulse-dot flex-shrink-0" />
          )}
          {section.status === 'pending' && (
            <span className="w-3 h-3 rounded-full border-2 border-muted flex-shrink-0" />
          )}

          {/* Label */}
          <span className={`text-[14px] ${section.status === 'complete' ? 'text-ink' : 'text-muted'}`}>
            {section.name}
          </span>

          {/* Right label */}
          <span className="ml-auto">
            {section.status === 'complete' && (
              <span className="font-mono text-[12px] text-muted">{formatTime(section.timestamp)}</span>
            )}
            {section.status === 'in_progress' && (
              <span className="text-[13px] text-amber font-medium">Filing now...</span>
            )}
            {section.status === 'pending' && (
              <span className="text-[12px] text-muted">Pending</span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
