import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Phase, ChatMessage, TaxData, FilingEvent, FilingLogEntry, SectionResult } from '@/lib/types'
import { api } from '@/lib/api'

interface AppState {
  // Auth / session
  userId: number | null
  sessionId: number | null
  userEmail: string
  phase: Phase

  // Navigation
  activeSection: string
  activeYear: string
  visitedSections: string[]

  // Chat
  messages: ChatMessage[]
  pendingPdfUpload: { active: boolean; reason: string }
  isTyping: boolean

  // Data
  taxData: TaxData | null
  percentComplete: number
  missingFields: string[]

  // Filing (Phase 3)
  filingProgress: SectionResult[]
  filingLog: FilingLogEntry[]

  // Actions
  setUser: (id: number, email: string) => void
  setSession: (id: number) => void
  setPhase: (phase: Phase) => void
  setActiveSection: (section: string) => void
  setActiveYear: (year: string) => void
  addMessage: (msg: ChatMessage) => void
  setPendingPdfUpload: (active: boolean, reason?: string) => void
  setIsTyping: (typing: boolean) => void
  setTaxData: (data: TaxData) => void
  hydrateTaxData: (data: TaxData) => void
  setPercentComplete: (pct: number) => void
  setMissingFields: (fields: string[]) => void
  addFilingEvent: (event: FilingEvent) => void
  resetFiling: () => void
  logout: () => void
  resetTaxData: () => void
  clearMessages: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: null,
      sessionId: null,
      userEmail: '',
      phase: 'collecting',

      activeSection: 'personal-info',
      activeYear: '2025',
      visitedSections: ['personal-info'],

      messages: [],
      pendingPdfUpload: { active: false, reason: '' },
      isTyping: false,

      taxData: null,
      percentComplete: 0,
      missingFields: [],

      filingProgress: [],
      filingLog: [],

      saveStatus: 'idle' as const,

      setUser: (id, email) => set({ userId: id, userEmail: email }),
      setSession: (id) => set({ sessionId: id }),
      setPhase: (phase) => set({ phase }),
      setActiveSection: (section) =>
        set((state) => ({
          activeSection: section,
          visitedSections: state.visitedSections.includes(section)
            ? state.visitedSections
            : [...state.visitedSections, section],
        })),
      setActiveYear: (year) => set({ activeYear: year }),

      addMessage: (msg) =>
        set((state) => {
          if (state.messages.some((m) => m.id === msg.id)) return state
          return { messages: [...state.messages, msg] }
        }),

      setPendingPdfUpload: (active, reason = '') =>
        set({ pendingPdfUpload: { active, reason } }),

      setIsTyping: (typing) => set({ isTyping: typing }),
      setTaxData: (data) => {
        set({ taxData: data, saveStatus: 'saving' })
        const { userId } = get()
        if (userId) {
          api.updateData(userId, data as Record<string, unknown>)
            .then(() => {
              set({ saveStatus: 'saved' })
              setTimeout(() => set({ saveStatus: 'idle' }), 2000)
            })
            .catch(() => {
              set({ saveStatus: 'error' })
              setTimeout(() => set({ saveStatus: 'idle' }), 3000)
            })
        } else {
          set({ saveStatus: 'idle' })
        }
      },
      hydrateTaxData: (data) => set({ taxData: data }),
      setPercentComplete: (pct) => set({ percentComplete: pct }),
      setMissingFields: (fields) => set({ missingFields: fields }),

      addFilingEvent: (event: FilingEvent) => {
        const time = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })

        set((state) => {
          const log: FilingLogEntry = {
            time,
            message:
              event.type === 'section_complete'
                ? `${event.section}: ${event.success ? 'completed' : 'failed'}`
                : event.type === 'complete'
                ? `Filing ${event.overall_success ? 'completed successfully' : 'completed with errors'}`
                : event.message ?? event.type,
          }

          let newProgress = [...state.filingProgress]
          if (event.type === 'section_complete' && event.section) {
            const existing = newProgress.find((r) => r.section_name === event.section)
            if (!existing) {
              newProgress.push({
                section_name: event.section,
                success: event.success ?? false,
                timestamp: event.timestamp,
              })
            }
          }

          const newPhase =
            event.type === 'complete'
              ? event.overall_success
                ? ('filed' as Phase)
                : state.phase
              : state.phase

          return {
            filingLog: [...state.filingLog, log],
            filingProgress: newProgress,
            phase: newPhase,
          }
        })
      },

      resetFiling: () => set({ filingProgress: [], filingLog: [] }),

      clearMessages: () => set({ messages: [] }),

      resetTaxData: () => set({
        taxData: null,
        percentComplete: 0,
        missingFields: [],
        phase: 'collecting',
        activeSection: 'personal-info',
        filingProgress: [],
        filingLog: [],
        visitedSections: ['personal-info'],
      }),

      logout: () =>
        set({
          userId: null,
          sessionId: null,
          userEmail: '',
          phase: 'collecting',
          messages: [],
          taxData: null,
          percentComplete: 0,
          missingFields: [],
          filingProgress: [],
          filingLog: [],
          visitedSections: ['personal-info'],
        }),
    }),
    {
      name: 'april-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Deduplicate persisted messages (handles stale localStorage from older builds)
          const seen = new Set<string>()
          state.messages = state.messages.filter((m) => {
            if (seen.has(m.id)) return false
            seen.add(m.id)
            return true
          })
        }
      },
      partialize: (state) => ({
        userId: state.userId,
        sessionId: state.sessionId,
        userEmail: state.userEmail,
        phase: state.phase,
        activeYear: state.activeYear,
        messages: state.messages,
        taxData: state.taxData,
        percentComplete: state.percentComplete,
        visitedSections: state.visitedSections,
      }),
    }
  )
)
