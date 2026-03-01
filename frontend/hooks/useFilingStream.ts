'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'
import { BASE } from '@/lib/api'

export function useFilingStream(userId: number | null, enabled: boolean) {
  const addFilingEvent = useStore((s) => s.addFilingEvent)

  useEffect(() => {
    if (!userId || !enabled) return

    const es = new EventSource(`${BASE}/filing-stream/${userId}`)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        addFilingEvent(event)
        if (event.type === 'complete' || event.type === 'timeout') {
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [userId, enabled, addFilingEvent])
}
