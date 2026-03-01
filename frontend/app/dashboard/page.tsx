'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { TopNav } from '@/components/layout/TopNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SectionContent } from '@/components/sections/SectionContent'
import { ReviewSection } from '@/components/sections/ReviewSection'
import { FilingView } from '@/components/filing/FilingView'
import { CURRENT_TAX_YEAR } from '@/lib/dummyData'

// Middle panel when viewing a past (filed) year
function PastYearPanel({ year }: { year: string }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
      <ReviewSection frozenYear={year} />
    </div>
  )
}

// Middle panel for current year — section content only, no pills
function CurrentYearPanel() {
  const phase = useStore((s) => s.phase)

  if (phase === 'filing' || phase === 'filed') {
    return <FilingView />
  }

  if (phase === 'reviewing') {
    return (
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
        <div className="mb-5 flex items-center gap-3 bg-green-pale border border-green rounded-xl px-4 py-3">
          <span className="text-green font-bold text-[20px]">✓</span>
          <div>
            <p className="text-green font-semibold text-[14px]">All information collected</p>
            <p className="text-[12px] text-muted">Review your return below, then file when ready.</p>
          </div>
        </div>
        <ReviewSection />
      </div>
    )
  }

  // Collecting phase — just section content, sidebar handles navigation
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
      <SectionContent />
    </div>
  )
}

function MiddlePanel() {
  const activeYear = useStore((s) => s.activeYear)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {activeYear !== CURRENT_TAX_YEAR
        ? <PastYearPanel year={activeYear} />
        : <CurrentYearPanel />
      }
    </div>
  )
}

export default function Dashboard() {
  const {
    userId,
    sessionId,
    userEmail,
    setUser,
    setSession,
    addMessage,
    setPercentComplete,
    setMissingFields,
  } = useStore(
    useShallow((s) => ({
      userId: s.userId,
      sessionId: s.sessionId,
      userEmail: s.userEmail,
      setUser: s.setUser,
      setSession: s.setSession,
      addMessage: s.addMessage,
      setPercentComplete: s.setPercentComplete,
      setMissingFields: s.setMissingFields,
    }))
  )

  const [initialized, setInitialized] = useState(false)
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        let uid = userId
        let sid = sessionId

        if (!uid || !userEmail) {
          const email = `user_${Date.now()}@april.app`
          const user = await api.createUser(email)
          uid = user.user_id
          setUser(uid, email)
        }

        if (!sid) {
          const sess = await api.createSession(uid!)
          sid = sess.session_id
          setSession(sid)
        }

        const status = await api.sessionStatus(sid!)
        setPercentComplete(status.percent_complete)
        setMissingFields(status.missing_fields)

        // Use live state (not stale closure) to avoid React StrictMode double-add
        const hasGreeting = useStore.getState().messages.some((m) => m.role === 'assistant')
        if (!hasGreeting) {
          addMessage({
            id: `opening-${Date.now()}`,
            role: 'assistant',
            content: `Good morning! Let's get your ${CURRENT_TAX_YEAR} taxes filed. Do you have a W-2 from an employer this year?`,
          })
        }
      } catch {
        setBackendDown(true)
        const hasGreeting = useStore.getState().messages.some((m) => m.role === 'assistant')
        if (!hasGreeting) {
          addMessage({
            id: `opening-${Date.now()}`,
            role: 'assistant',
            content: `Good morning! Let's get your ${CURRENT_TAX_YEAR} taxes filed. (Note: backend is offline — start the FastAPI server at localhost:8000 to enable chat.)`,
          })
        }
      } finally {
        setInitialized(true)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <p className="font-mono text-[14px] text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-cream">
      <TopNav />
      {backendDown && (
        <div className="fixed top-14 left-0 right-0 bg-amber-pale border-b border-amber px-4 py-1.5 text-[12px] text-amber font-medium z-40 text-center">
          Backend offline — start <span className="font-mono">uvicorn app.main:app</span> in <span className="font-mono">/backend</span> to enable chat
        </div>
      )}
      <div className={`flex flex-1 overflow-hidden ${backendDown ? 'pt-[calc(3.5rem+2rem)]' : 'pt-14'}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-cream">
          <MiddlePanel />
        </main>
        <ChatPanel backendDown={backendDown} />
      </div>
    </div>
  )
}
