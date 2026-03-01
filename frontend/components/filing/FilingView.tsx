'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { useFilingStream } from '@/hooks/useFilingStream'
import { FilingTimeline } from './FilingTimeline'
import { TerminalLog } from './TerminalLog'

export function FilingView() {
  const { phase, userId, filingProgress } = useStore(
    useShallow((s) => ({
      phase: s.phase,
      userId: s.userId,
      filingProgress: s.filingProgress,
    }))
  )

  const isStreaming = phase === 'filing'
  useFilingStream(userId, isStreaming)

  const allDone = phase === 'filed'
  const totalSections = 8
  const completedCount = filingProgress.length
  const allSuccess = filingProgress.every((r) => r.success)

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[18px] font-bold text-ink">
          {allDone ? 'Return Filed' : 'Filing Your Return'}
        </h2>
        <p className="text-[13px] text-muted mt-1">
          {allDone
            ? allSuccess
              ? 'Your 2024 federal tax return has been submitted successfully.'
              : 'Filing completed with some issues. Review the sections below.'
            : `Filing ${completedCount} of ${totalSections} sections...`}
        </p>

        {allDone && allSuccess && (
          <div className="mt-3 inline-flex items-center gap-2 bg-green-pale text-green text-[13px] font-semibold px-4 py-2 rounded-full">
            ✓ Return accepted by FreeTaxUSA
          </div>
        )}
      </div>

      {/* Timeline */}
      <FilingTimeline />

      {/* Terminal log */}
      <TerminalLog />
    </div>
  )
}
