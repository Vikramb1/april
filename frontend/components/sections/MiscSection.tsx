'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { MiscInfo, TaxData } from '@/lib/types'

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: number
  onChange: (v: number | undefined) => void
}) {
  return (
    <div>
      <p className="text-[11px] text-muted mb-0.5">{label}</p>
      <input
        type="text"
        value={value != null ? String(value) : ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || undefined)}
        placeholder="0.00"
        className="font-mono text-[13px] text-ink bg-transparent outline-none border-b-2 border-green w-full py-0.5 transition-colors"
      />
    </div>
  )
}

export function MiscSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const misc: MiscInfo = taxData?.misc_info ?? {}

  function update(patch: Partial<MiscInfo>) {
    setTaxData({ ...taxData, misc_info: { ...misc, ...patch } } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Forms &amp; Topics</h2>
      <p className="text-[13px] text-muted mb-5">
        Less common situations — estimated tax payments, foreign accounts, and other adjustments.
      </p>

      {/* Estimated Tax Payments */}
      <div
        className={clsx(
          'border rounded-xl mb-3 overflow-hidden transition-colors',
          misc.has_estimated_payments ? 'border-green' : 'border-hairline',
        )}
      >
        <div
          className={clsx(
            'flex items-start gap-3 p-4 cursor-pointer',
            misc.has_estimated_payments ? 'bg-green-pale' : 'bg-white hover:bg-[#F7F5F0]',
          )}
          onClick={() => update({ has_estimated_payments: !misc.has_estimated_payments })}
        >
          <div
            className={clsx(
              'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
              misc.has_estimated_payments ? 'bg-green border-green' : 'border-hairline',
            )}
          >
            {misc.has_estimated_payments && (
              <span className="text-white text-[9px] font-bold">✓</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">Estimated Tax Payments</p>
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
              Quarterly estimated tax payments made directly to the IRS (Form 1040-ES). Does not
              include withholding from your W-2.
            </p>
          </div>
        </div>

        {misc.has_estimated_payments && (
          <div className="border-t border-green/20 bg-cream px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
            <AmountField
              label="Q1 Payment (Jan–Mar)"
              value={misc.estimated_q1}
              onChange={(v) => update({ estimated_q1: v })}
            />
            <AmountField
              label="Q2 Payment (Apr–May)"
              value={misc.estimated_q2}
              onChange={(v) => update({ estimated_q2: v })}
            />
            <AmountField
              label="Q3 Payment (Jun–Aug)"
              value={misc.estimated_q3}
              onChange={(v) => update({ estimated_q3: v })}
            />
            <AmountField
              label="Q4 Payment (Sep–Jan)"
              value={misc.estimated_q4}
              onChange={(v) => update({ estimated_q4: v })}
            />
            <AmountField
              label="Extension Payment (if filed)"
              value={misc.extension_payment}
              onChange={(v) => update({ extension_payment: v })}
            />
          </div>
        )}
      </div>

      {/* Apply Refund to Next Year */}
      <div
        className={clsx(
          'border rounded-xl mb-3 overflow-hidden transition-colors',
          misc.apply_refund_next_year ? 'border-green' : 'border-hairline',
        )}
      >
        <div
          className={clsx(
            'flex items-start gap-3 p-4 cursor-pointer',
            misc.apply_refund_next_year ? 'bg-green-pale' : 'bg-white hover:bg-[#F7F5F0]',
          )}
          onClick={() => update({ apply_refund_next_year: !misc.apply_refund_next_year })}
        >
          <div
            className={clsx(
              'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
              misc.apply_refund_next_year ? 'bg-green border-green' : 'border-hairline',
            )}
          >
            {misc.apply_refund_next_year && (
              <span className="text-white text-[9px] font-bold">✓</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">Apply Refund to Next Year</p>
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
              Apply all or part of your federal refund toward your 2026 estimated tax instead of
              receiving it now.
            </p>
          </div>
        </div>

        {misc.apply_refund_next_year && (
          <div className="border-t border-green/20 bg-cream px-4 pb-4 pt-3">
            <AmountField
              label="Amount to apply to next year"
              value={misc.next_year_amount}
              onChange={(v) => update({ next_year_amount: v })}
            />
          </div>
        )}
      </div>

      {/* Foreign Financial Accounts */}
      <div
        className={clsx(
          'border rounded-xl p-4 mb-3 transition-colors',
          misc.has_foreign_accounts ? 'border-green bg-green-pale' : 'border-hairline bg-white',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">Foreign Financial Accounts (FBAR)</p>
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
              Did you have a financial interest in or signature authority over a foreign bank,
              securities, or other financial account with a combined value over $10,000 at any
              point during 2025?
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {(['Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => update({ has_foreign_accounts: opt === 'Yes' })}
                className={clsx(
                  'px-3 py-1 text-[12px] font-medium rounded-full border transition-colors cursor-pointer',
                  (misc.has_foreign_accounts ? 'Yes' : misc.has_foreign_accounts === false ? 'No' : '') === opt
                    ? 'bg-green text-white border-green'
                    : 'border-hairline text-muted hover:border-green hover:text-ink',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Foreign Assets */}
      <div
        className={clsx(
          'border rounded-xl p-4 mb-3 transition-colors',
          misc.has_foreign_assets ? 'border-green bg-green-pale' : 'border-hairline bg-white',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">Foreign Financial Assets (Form 8938)</p>
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
              Did you hold specified foreign financial assets (foreign stocks, accounts, or
              partnership interests) above the FATCA reporting thresholds?
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {(['Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => update({ has_foreign_assets: opt === 'Yes' })}
                className={clsx(
                  'px-3 py-1 text-[12px] font-medium rounded-full border transition-colors cursor-pointer',
                  (misc.has_foreign_assets ? 'Yes' : misc.has_foreign_assets === false ? 'No' : '') === opt
                    ? 'bg-green text-white border-green'
                    : 'border-hairline text-muted hover:border-green hover:text-ink',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
