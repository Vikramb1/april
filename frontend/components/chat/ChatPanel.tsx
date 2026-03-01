'use client'

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { ChatMessage } from './ChatMessage'
import { PDFUploadCard } from './PDFUploadCard'
import { ChatInput } from './ChatInput'

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
    phase,
    clearMessages,
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
      phase: s.phase,
      clearMessages: s.clearMessages,
    }))
  )

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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
      const res = await api.chat(sessionId, message)

      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
      })

      if (res.request_pdf_upload && res.pdf_upload_reason) {
        setPendingPdfUpload(true, res.pdf_upload_reason)
      }

      // Refresh session status + latest data from DB
      const [status, dbData] = await Promise.all([
        api.sessionStatus(sessionId),
        userId ? api.userData(userId) : Promise.resolve(null),
      ])
      setPercentComplete(status.percent_complete)
      setMissingFields(status.missing_fields)

      if (dbData && (dbData.tax_return || dbData.w2_forms.length > 0)) {
        hydrateTaxData({
          tax_return: dbData.tax_return as import('@/lib/types').TaxReturn,
          w2_forms: dbData.w2_forms as import('@/lib/types').W2Form[],
          form_1099s: dbData.form_1099s as import('@/lib/types').Form1099[],
          deductions: dbData.deductions as import('@/lib/types').Deductions ?? undefined,
          credits: dbData.credits as import('@/lib/types').Credits ?? undefined,
        })
      }

      if (status.percent_complete === 100 && phase === 'collecting') {
        setPhase('reviewing')
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

  const inputDisabled = isTyping || phase === 'filing'

  return (
    <aside className="w-[28%] bg-white border-l border-hairline flex flex-col">
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
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
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
        <ChatInput onSend={handleSend} disabled={inputDisabled} />
      </div>
    </aside>
  )
}
