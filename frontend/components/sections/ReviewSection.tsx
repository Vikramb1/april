'use client'

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { PAST_YEAR_DATA } from '@/lib/dummyData'
import { getMissingFields } from '@/lib/validation'

function formatMoney(val: number | undefined) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

interface ReviewRowProps {
  label: string
  value: string
  bold?: boolean
  green?: boolean
}

function ReviewRow({ label, value, bold, green }: ReviewRowProps) {
  return (
    <tr className="border-b border-hairline">
      <td className={`text-[14px] text-ink py-2 ${bold ? 'font-semibold' : ''}`}>{label}</td>
      <td
        className={`font-mono text-[14px] py-2 text-right ${
          bold ? 'text-[20px] font-bold' : ''
        } ${green ? 'text-green' : 'text-ink'}`}
      >
        {value}
      </td>
    </tr>
  )
}

interface ReviewSectionProps {
  frozenYear?: string
}

export function ReviewSection({ frozenYear }: ReviewSectionProps) {
  const { taxData: liveTaxData, userId, setPhase, resetFiling, addMessage } = useStore(
    useShallow((s) => ({
      taxData: s.taxData,
      userId: s.userId,
      setPhase: s.setPhase,
      resetFiling: s.resetFiling,
      addMessage: s.addMessage,
    }))
  )

  const [showModal, setShowModal] = useState(false)

  // Use dummy data for past years, live data for current year
  const taxData = frozenYear ? PAST_YEAR_DATA[frozenYear]?.taxData ?? liveTaxData : liveTaxData

  const tr = taxData?.tax_return ?? {}
  const w2s = taxData?.w2_forms ?? []

  const totalWages = w2s.reduce((sum, w) => sum + ((w.wages as number) ?? 0), 0)
  const totalFedWithheld = w2s.reduce((sum, w) => sum + ((w.federal_tax_withheld as number) ?? 0), 0)
  const refund = tr.refund_amount as number | undefined
  const owed = tr.tax_owed as number | undefined

  async function handleFile() {
    const missing = getMissingFields(taxData)
    if (missing.length > 0) {
      setShowModal(true)
      return
    }
    if (!userId) return
    resetFiling()
    setPhase('filing')
    try {
      await api.submitTaxes(userId)
    } catch {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'There was an issue starting the filing process. Please try again.',
      })
      setPhase('reviewing')
    }
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">
        {frozenYear ? `${frozenYear} Tax Return` : 'Review Your Return'}
      </h2>
      {frozenYear && PAST_YEAR_DATA[frozenYear] && (
        <div className="inline-flex items-center gap-2 bg-green-pale text-green text-[12px] font-medium px-3 py-1 rounded-full mb-4">
          ✓ Filed · {PAST_YEAR_DATA[frozenYear].filedDate}
        </div>
      )}

      <table className="w-full mb-6">
        <tbody>
          <ReviewRow label="Filing Status" value={tr.filing_status ?? '—'} />
          <ReviewRow label="Total Wages" value={formatMoney(totalWages || undefined)} />
          <ReviewRow label="Federal Tax Withheld" value={formatMoney(totalFedWithheld || undefined)} />
          {refund != null && refund > 0 && (
            <ReviewRow label="Estimated Refund" value={formatMoney(refund)} bold green />
          )}
          {owed != null && owed > 0 && (
            <ReviewRow label="Tax Owed" value={formatMoney(owed)} bold />
          )}
          {refund == null && owed == null && (
            <ReviewRow label="Refund / Owed" value="Calculating..." />
          )}
        </tbody>
      </table>

      {!frozenYear && (
        <button
          onClick={handleFile}
          className="w-full bg-green text-white font-bold text-[15px] rounded-xl h-11 hover:bg-green-mid transition-colors cursor-pointer"
        >
          File My Return →
        </button>
      )}

      {/* Validation modal */}
      {showModal && (() => {
        const missing = getMissingFields(taxData)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber text-[20px]">⚠</span>
                <h3 className="text-[17px] font-bold text-ink">Cannot File Yet</h3>
              </div>
              <p className="text-[13px] text-muted mb-3">
                Please complete the following required fields before filing:
              </p>
              <ul className="space-y-1.5 mb-5 max-h-64 overflow-y-auto">
                {missing.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]">
                    <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">•</span>
                    <span>
                      <span className="font-semibold text-ink">{item.section}:</span>{' '}
                      <span className="text-muted">{item.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-green text-white font-semibold text-[14px] rounded-xl h-10 hover:bg-green-mid transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
