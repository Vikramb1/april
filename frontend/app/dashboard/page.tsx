'use client'

import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { TopNav } from '@/components/layout/TopNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SectionContent } from '@/components/sections/SectionContent'
import { ReviewSection } from '@/components/sections/ReviewSection'
import { FilingView } from '@/components/filing/FilingView'
import { useFilingStream } from '@/hooks/useFilingStream'
import { CURRENT_TAX_YEAR } from '@/lib/dummyData'

// Middle panel when viewing a past (filed) year
function PastYearPanel({ year }: { year: string }) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-6 pb-6">
      <ReviewSection frozenYear={year} />
    </div>
  )
}

// Middle panel for current year — section content only, no pills
function CurrentYearPanel() {
  const phase = useStore((s) => s.phase)
  const activeSection = useStore((s) => s.activeSection)
  const saveStatus = useStore((s) => s.saveStatus)
  const taxData = useStore((s) => s.taxData)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the first unfilled field whenever taxData updates
  useEffect(() => {
    const container = scrollRef.current
    if (!container || phase !== 'collecting') return

    requestAnimationFrame(() => {
      // Find the first input / select whose current value is empty
      const els = Array.from(
        container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')
      )
      const firstEmpty = els.find((el) => !el.value || el.value === '')
      if (!firstEmpty) return

      const containerRect = container.getBoundingClientRect()
      const elRect = firstEmpty.getBoundingClientRect()
      // Position the empty field roughly 1/3 from the top of the visible area
      const targetScroll =
        container.scrollTop + (elRect.top - containerRect.top) - containerRect.height / 3
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
    })
  }, [taxData, phase])

  if (phase === 'filing' && activeSection === 'review') {
    return <FilingView />
  }

  if (phase === 'filed' && activeSection === 'review') {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-6 pb-6">
        <ReviewSection frozenYear="filed" />
      </div>
    )
  }

  if (activeSection === 'review') {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-6 pb-6">
        {phase === 'reviewing' && (
          <div className="mb-5 flex items-center gap-3 bg-green-pale border border-green rounded-xl px-4 py-3">
            <span className="text-green font-bold text-[20px]">✓</span>
            <div>
              <p className="text-green font-semibold text-[14px]">All information collected</p>
              <p className="text-[12px] text-muted">Review your return below, then file when ready.</p>
            </div>
          </div>
        )}
        <ReviewSection />
      </div>
    )
  }

  const isFiling = phase === 'filing' || phase === 'filed'

  // Collecting phase — just section content, sidebar handles navigation
  return (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto scrollbar-hide px-6 pt-6 pb-6 relative ${isFiling ? 'pointer-events-none opacity-60' : ''}`}>
      {isFiling && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-1.5 text-[12px] font-medium pointer-events-auto ${
          phase === 'filed' ? 'bg-green-pale border border-green text-green' : 'bg-amber-pale border border-amber text-amber'
        }`}>
          {phase === 'filed' ? '✓ Filed' : 'Filing in progress — fields are locked'}
        </div>
      )}
      {saveStatus !== 'idle' && (
        <div className="absolute top-4 right-4 text-[11px] font-medium pointer-events-none">
          {saveStatus === 'saving' && <span className="text-muted shimmer">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-green">✓ Saved</span>}
          {saveStatus === 'error' && <span className="text-red">Save failed — backend offline?</span>}
        </div>
      )}
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
    phase,
    setUser,
    setSession,
    setPercentComplete,
    setMissingFields,
    hydrateTaxData,
    clearMessages,
    resetTaxData,
  } = useStore(
    useShallow((s) => ({
      userId: s.userId,
      sessionId: s.sessionId,
      userEmail: s.userEmail,
      phase: s.phase,
      setUser: s.setUser,
      setSession: s.setSession,
      setPercentComplete: s.setPercentComplete,
      setMissingFields: s.setMissingFields,
      hydrateTaxData: s.hydrateTaxData,
      clearMessages: s.clearMessages,
      resetTaxData: s.resetTaxData,
    }))
  )

  // SSE stream for filing progress — lives at Dashboard level so it persists across section navigation
  useFilingStream(userId, phase === 'filing')

  const [initialized, setInitialized] = useState(false)
  const [backendDown, setBackendDown] = useState(false)
  const MIN_CHAT_WIDTH = 360
  const [chatWidth, setChatWidth] = useState(MIN_CHAT_WIDTH)
  const isDragging = useRef(false)

  function handleDragStart(e: React.MouseEvent) {
    isDragging.current = true
    e.preventDefault()

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      const newWidth = window.innerWidth - e.clientX
      setChatWidth(Math.max(MIN_CHAT_WIDTH, Math.min(600, newWidth)))
    }

    function onMouseUp() {
      isDragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

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
          sid = null  // also reset session since user is new
        }

        if (!sid) {
          const sess = await api.createSession(uid!)
          sid = sess.session_id
          setSession(sid)
        }

        // Try to load status + data; if IDs are stale (404), create fresh user+session
        let status, dbData
        try {
          ;[status, dbData] = await Promise.all([
            api.sessionStatus(sid!),
            api.userData(uid!),
          ])
        } catch {
          // Stale IDs from a previous backend instance — create fresh user + session
          clearMessages()
          resetTaxData()
          const email = `user_${Date.now()}@april.app`
          const user = await api.createUser(email)
          uid = user.user_id
          setUser(uid, email)
          const sess = await api.createSession(uid)
          sid = sess.session_id
          setSession(sid)
          ;[status, dbData] = await Promise.all([
            api.sessionStatus(sid),
            api.userData(uid),
          ])
        }

        setPercentComplete(status.percent_complete)
        setMissingFields(status.missing_fields)

        // Hydrate store from DB
        if (dbData.tax_return || dbData.w2_forms.length > 0) {
          hydrateTaxData({
            tax_return: dbData.tax_return as import('@/lib/types').TaxReturn,
            w2_forms: dbData.w2_forms as import('@/lib/types').W2Form[],
            form_1099s: dbData.form_1099s as import('@/lib/types').Form1099[],
            deductions: dbData.deductions as import('@/lib/types').Deductions ?? undefined,
            credits: dbData.credits as import('@/lib/types').Credits ?? undefined,
            other_income: dbData.other_income as import('@/lib/types').OtherIncome ?? undefined,
            dependents: dbData.dependents as import('@/lib/types').Dependent[] ?? [],
            misc_info: dbData.misc_info as import('@/lib/types').MiscInfo ?? undefined,
            state_info: dbData.state_info as import('@/lib/types').StateInfo ?? undefined,
          })
        }

      } catch {
        setBackendDown(true)
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
      <div className="fixed top-14 left-0 right-0 z-40 bg-amber-pale border-b border-amber px-4 py-2 text-center text-[12px] text-amber font-medium">
        Chatbot and browser agent are not running to conserve resources
      </div>
      {backendDown && (
        <div className="fixed top-16 right-3 z-50 bg-amber-pale border border-amber rounded-full px-3 py-1 text-[11px] text-amber font-medium shadow-sm pointer-events-none">
          Backend offline
        </div>
      )}
      <div className="flex flex-1 overflow-hidden pt-[calc(3.5rem+2rem)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-cream">
          <MiddlePanel />
        </main>
        {/* Drag handle — zero width, grip floats absolutely centered on the border */}
        <div className="w-0 flex-shrink-0 relative z-20">
          <div
            onMouseDown={handleDragStart}
            className="group absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-row items-center gap-[2px] py-1.5 px-1 rounded-lg cursor-col-resize bg-white border border-hairline shadow-sm hover:border-green/40 transition-colors select-none"
          >
            <span className="block w-px h-6 rounded-full bg-[#CBD5E1] group-hover:bg-green transition-colors" />
            <span className="block w-px h-6 rounded-full bg-[#CBD5E1] group-hover:bg-green transition-colors" />
            <span className="block w-px h-6 rounded-full bg-[#CBD5E1] group-hover:bg-green transition-colors" />
          </div>
        </div>
        <div style={{ width: chatWidth }} className="flex-shrink-0 overflow-hidden">
          <ChatPanel backendDown={backendDown} />
        </div>
      </div>
    </div>
  )
}
