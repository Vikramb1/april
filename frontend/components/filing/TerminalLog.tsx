'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store'

export function TerminalLog() {
  const logs = useStore((s) => s.filingLog)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="bg-white border border-hairline rounded-xl p-4 font-mono text-[12px] text-muted h-40 overflow-y-auto scrollbar-hide mt-4">
      {logs.length === 0 && (
        <p className="text-[#9CA3AF]">Filing agent starting...</p>
      )}
      {logs.map((log, i) => (
        <div key={i}>
          <span className="text-[#9CA3AF]">{log.time}</span>
          {'  '}
          {log.message}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
