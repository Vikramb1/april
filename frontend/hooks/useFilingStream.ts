'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { BASE } from '@/lib/api'

export function useFilingStream(userId: number | null, enabled: boolean) {
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!userId || !enabled) {
      esRef.current?.close()
      esRef.current = null
      return
    }

    const es = new EventSource(`${BASE}/filing-stream/${userId}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        useStore.getState().addFilingEvent(event)
        if (event.type === 'complete' || event.type === 'timeout' || event.type === 'error') {
          es.close()
          esRef.current = null
        }
      } catch {
        // ignore parse errors
      }
    }

    // Don't close on error — EventSource auto-reconnects
    // Only close if the connection is permanently dead
    let errorCount = 0
    es.onerror = () => {
      errorCount++
      if (errorCount > 5) {
        es.close()
        esRef.current = null
      }
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [userId, enabled])
}
