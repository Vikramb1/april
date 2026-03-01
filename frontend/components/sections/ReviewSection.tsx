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

const STD_DED: Record<string, number> = {
  'Single': 15000, 'Married Filing Jointly': 30000,
  'Married Filing Separately': 15000, 'Head of Household': 22500,
  'Qualifying Surviving Spouse': 30000,
}

function calcTaxSingle(income: number): number {
  if (income <= 0) return 0
  const brackets = [
    { limit: 11925, rate: 0.10 }, { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 }, { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 }, { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ]
  let tax = 0, prev = 0
  for (const { limit, rate } of brackets) {
    if (income <= prev) break
    tax += (Math.min(income, limit) - prev) * rate
    prev = limit
  }
  return Math.round(tax)
}

function calcTaxMFJ(income: number): number {
  if (income <= 0) return 0
  const brackets = [
    { limit: 23850, rate: 0.10 }, { limit: 96950, rate: 0.12 },
    { limit: 206700, rate: 0.22 }, { limit: 394600, rate: 0.24 },
    { limit: 501050, rate: 0.32 }, { limit: 751600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ]
  let tax = 0, prev = 0
  for (const { limit, rate } of brackets) {
    if (income <= prev) break
    tax += (Math.min(income, limit) - prev) * rate
    prev = limit
  }
  return Math.round(tax)
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
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Use dummy data for past years, live data for current year and "filed" state
  const isFiled = frozenYear === 'filed'
  const taxData = isFiled ? liveTaxData : frozenYear ? PAST_YEAR_DATA[frozenYear]?.taxData ?? liveTaxData : liveTaxData

  const tr = taxData?.tax_return ?? {}
  const w2s = taxData?.w2_forms ?? []

  const totalWages = w2s.reduce((sum, w) => sum + ((w.wages as number) ?? 0), 0)
  const totalFedWithheld = w2s.reduce((sum, w) => sum + ((w.federal_tax_withheld as number) ?? 0), 0)

  // Use stored values if available, otherwise compute estimate
  let refund = tr.refund_amount as number | undefined
  let owed = tr.tax_owed as number | undefined
  if (refund == null && owed == null && totalWages > 0) {
    const filingStatus = (tr.filing_status as string) ?? 'Single'
    const deduction = STD_DED[filingStatus] ?? 15000
    const taxable = Math.max(0, totalWages - deduction)
    const calcFn = filingStatus === 'Married Filing Jointly' ? calcTaxMFJ : calcTaxSingle
    const tax = calcFn(taxable)
    const diff = totalFedWithheld - tax
    if (diff >= 0) { refund = diff } else { owed = Math.abs(diff) }
  }

  async function handleDownloadPdf() {
    if (!userId || downloadingPdf) return
    setDownloadingPdf(true)
    try {
      const res = await fetch(`http://localhost:8000/users/${userId}/tax-pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tax-return-${new Date().getFullYear()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Failed to generate the PDF. Please try again.',
      })
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleFile() {
    const missing = getMissingFields(taxData)
    if (missing.length > 0) {
      setShowModal(true)
      return
    }
    if (!userId) return
    resetFiling()
    setPhase('filing')
    // Fire-and-forget — progress comes via SSE filing-stream
    api.submitTaxes(userId).catch(() => {
      // Backend returns immediately now, so errors here mean network/server issue
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'There was an issue starting the filing process. Please try again.',
      })
      setPhase('reviewing')
    })
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">
        {isFiled ? '2025 Tax Return' : frozenYear ? `${frozenYear} Tax Return` : 'Review Your Return'}
      </h2>
      {isFiled && (
        <div className="inline-flex items-center gap-2 bg-green-pale text-green text-[12px] font-medium px-3 py-1 rounded-full mb-4">
          ✓ Filed · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}
      {frozenYear && !isFiled && PAST_YEAR_DATA[frozenYear] && (
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
        <div className="flex flex-col gap-3">
          <button
            onClick={handleFile}
            className="flex items-center justify-center gap-2 w-full bg-green text-white font-bold text-[15px] rounded-xl h-11 hover:bg-green-mid transition-colors cursor-pointer"
          >
            <img src="/freetax.png" alt="FreeTaxUSA" width={20} height={20} className="rounded" />
            File with FreeTaxUSA
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !userId}
            className="flex items-center justify-center gap-2 w-full border border-green rounded-xl h-11 text-[15px] font-bold text-green hover:bg-green hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {downloadingPdf ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <path d="M12 16V4M12 16l-4-4M12 16l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download PDF for CPA
              </>
            )}
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-2 w-full border border-hairline rounded-xl h-11 text-[15px] font-bold text-muted opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            <img src="/turbotax.png" alt="TurboTax" width={20} height={20} className="rounded" />
            File with TurboTax
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-2 w-full border border-hairline rounded-xl h-11 text-[15px] font-bold text-muted opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Do It Yourself
          </button>
        </div>
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
