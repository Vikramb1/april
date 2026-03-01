'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { PAST_YEAR_DATA } from '@/lib/dummyData'

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
  const { taxData: liveTaxData, userId, setPhase, resetFiling, addMessage, missingFields, percentComplete } = useStore(
    useShallow((s) => ({
      taxData: s.taxData,
      userId: s.userId,
      setPhase: s.setPhase,
      resetFiling: s.resetFiling,
      addMessage: s.addMessage,
      missingFields: s.missingFields,
      percentComplete: s.percentComplete,
    }))
  )

  // Use dummy data for past years, live data for current year
  const taxData = frozenYear ? PAST_YEAR_DATA[frozenYear]?.taxData ?? liveTaxData : liveTaxData

  const tr = taxData?.tax_return ?? {}
  const w2s = taxData?.w2_forms ?? []

  const totalWages = w2s.reduce((sum, w) => sum + ((w.wages as number) ?? 0), 0)
  const totalFedWithheld = w2s.reduce((sum, w) => sum + ((w.federal_tax_withheld as number) ?? 0), 0)
  const refund = tr.refund_amount as number | undefined
  const owed = tr.tax_owed as number | undefined

  async function handleFile() {
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

      {!frozenYear && (() => {
        // Derive incomplete section names from missing fields
        const incompleteSections = percentComplete > 0
          ? [...new Set(missingFields.map((f) => f.split('.')[0]))]
          : []
        const canFile = incompleteSections.length === 0

        return (
          <div>
            {!canFile && (
              <div className="mb-4 p-3 bg-amber-pale border border-amber rounded-xl">
                <p className="text-[13px] font-semibold text-amber mb-1">Cannot file yet</p>
                <p className="text-[12px] text-ink mb-1">The following sections are incomplete:</p>
                <ul className="list-disc list-inside">
                  {incompleteSections.map((s) => (
                    <li key={s} className="text-[12px] text-ink">{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={handleFile}
              disabled={!canFile}
              className="w-full bg-green text-white font-bold text-[15px] rounded-xl h-11 hover:bg-green-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              File My Return →
            </button>
          </div>
        )
      })()}
    </div>
  )
}
