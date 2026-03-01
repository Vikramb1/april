'use client'

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { ChatMessage } from './ChatMessage'
import { PDFUploadCard } from './PDFUploadCard'
import { ChatInput } from './ChatInput'
import { CURRENT_TAX_YEAR } from '@/lib/dummyData'
import type {
  TaxReturn, W2Form, Form1099, Deductions, Credits,
  OtherIncome, Dependent, MiscInfo, StateInfo,
} from '@/lib/types'

interface ChatPanelProps {
  backendDown?: boolean
}

export function ChatPanel({ backendDown }: ChatPanelProps) {
  const {
    messages,
    isTyping,
    pendingPdfUpload,
    sessionId,
    userId,
    addMessage,
    setIsTyping,
    setPendingPdfUpload,
    setPercentComplete,
    setMissingFields,
    setPhase,
    hydrateTaxData,
    setActiveSection,
    phase,
    clearMessages,
    activeYear,
    activeSection,
  } = useStore(
    useShallow((s) => ({
      messages: s.messages,
      isTyping: s.isTyping,
      pendingPdfUpload: s.pendingPdfUpload,
      sessionId: s.sessionId,
      userId: s.userId,
      addMessage: s.addMessage,
      setIsTyping: s.setIsTyping,
      setPendingPdfUpload: s.setPendingPdfUpload,
      setPercentComplete: s.setPercentComplete,
      setMissingFields: s.setMissingFields,
      setPhase: s.setPhase,
      hydrateTaxData: s.hydrateTaxData,
      setActiveSection: s.setActiveSection,
      phase: s.phase,
      clearMessages: s.clearMessages,
      activeYear: s.activeYear,
      activeSection: s.activeSection,
    }))
  )

  const isPastYear = activeYear !== CURRENT_TAX_YEAR

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasGreeted = useRef(false)
  const prevIsTyping = useRef(false)

  // Focus input when response finishes (isTyping: true → false)
  useEffect(() => {
    if (prevIsTyping.current && !isTyping && phase !== 'filing' && !isPastYear) {
      inputRef.current?.focus()
    }
    prevIsTyping.current = isTyping
  }, [isTyping, phase, isPastYear])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Auto-send "start" on first visit to trigger CPA greeting
  useEffect(() => {
    if (!sessionId || backendDown || messages.length > 0 || hasGreeted.current) return
    hasGreeted.current = true
    setIsTyping(true)
    api.chat(sessionId, 'start', activeSection)
      .then((res) => {
        addMessage({ id: Date.now().toString(), role: 'assistant', content: res.reply })
        if (res.navigate_to_section) setActiveSection(res.navigate_to_section)
      })
      .catch(() => {
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: "Hi! I'm April, your tax filing assistant. Send a message to get started.",
        })
      })
      .finally(() => setIsTyping(false))
  }, [sessionId, backendDown]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(message: string) {
    // Always add user message to the thread immediately
    addMessage({ id: Date.now().toString(), role: 'user', content: message })

    if (!sessionId || backendDown) {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'The backend is offline. Start the FastAPI server to enable chat.',
      })
      return
    }

    setIsTyping(true)

    try {
      const res = await api.chat(sessionId, message, activeSection)

      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
      })

      // Navigate sidebar to the relevant section
      if (res.navigate_to_section) setActiveSection(res.navigate_to_section)

      if (res.request_pdf_upload && res.pdf_upload_reason) {
        setPendingPdfUpload(true, res.pdf_upload_reason)
      }

      // If the agent saved any fields, snapshot is included — update UI directly
      if (res.snapshot) {
        hydrateTaxData({
          tax_return: res.snapshot.tax_return as TaxReturn ?? undefined,
          w2_forms: (res.snapshot.w2_forms ?? []) as W2Form[],
          form_1099s: (res.snapshot.form_1099s ?? []) as Form1099[],
          deductions: res.snapshot.deductions as Deductions ?? undefined,
          credits: res.snapshot.credits as Credits ?? undefined,
          other_income: res.snapshot.other_income as OtherIncome ?? undefined,
          dependents: (res.snapshot.dependents ?? []) as Dependent[],
          misc_info: res.snapshot.misc_info as MiscInfo ?? undefined,
          state_info: res.snapshot.state_info as StateInfo ?? undefined,
        })
      }

      // Refresh progress stats (percent complete, missing fields)
      if (sessionId) {
        api.sessionStatus(sessionId).then((status) => {
          setPercentComplete(status.percent_complete)
          setMissingFields(status.missing_fields)
          if (status.percent_complete === 100 && phase === 'collecting') {
            setPhase('reviewing')
          }
        }).catch(() => {/* silently ignore */})
      }
    } catch {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Something went wrong reaching the server. Please try again.',
      })
    } finally {
      setIsTyping(false)
    }
  }

  const inputDisabled = isTyping || phase === 'filing' || isPastYear

  return (
    <aside className="w-full h-full bg-white border-l border-hairline flex flex-col relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-hairline flex items-center gap-2 flex-shrink-0">
        <span className="text-base font-bold text-ink">April</span>
        <span className={`w-2 h-2 rounded-full ${backendDown ? 'bg-[#E5E7EB]' : 'bg-green pulse-dot'}`} />
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="ml-auto text-[11px] text-muted hover:text-red transition-colors cursor-pointer"
            title="Clear chat"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {pendingPdfUpload.active && (
          <PDFUploadCard reason={pendingPdfUpload.reason} />
        )}
        {isTyping && (
          <div className="border-l-2 border-green pl-3">
            <span className="inline-flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted pulse-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted pulse-dot" style={{ animationDelay: '300ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted pulse-dot" style={{ animationDelay: '600ms' }} />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-hairline flex-shrink-0">
        <ChatInput ref={inputRef} onSend={handleSend} disabled={inputDisabled} />
      </div>

      {/* Past-year overlay */}
      {isPastYear && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-[13px] font-semibold text-ink text-center px-6">Chat unavailable for past years</p>
          <p className="text-[12px] text-muted text-center px-8 leading-relaxed">{activeYear} is already filed. Switch to {CURRENT_TAX_YEAR} to use the assistant.</p>
        </div>
      )}
    </aside>
  )
}
