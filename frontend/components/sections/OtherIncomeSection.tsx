'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { OtherIncome, TaxData } from '@/lib/types'

interface IncomeCardProps {
  label: string
  description: string
  toggled: boolean
  onToggle: (v: boolean) => void
  amountLabel?: string
  amount?: number
  onAmount?: (v: number | undefined) => void
}

function IncomeCard({
  label,
  description,
  toggled,
  onToggle,
  amountLabel,
  amount,
  onAmount,
}: IncomeCardProps) {
  return (
    <div
      className={clsx(
        'border rounded-xl p-4 mb-3 transition-colors',
        toggled ? 'border-green bg-green-pale' : 'border-hairline bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-ink">{label}</p>
          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(['Yes', 'No'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onToggle(opt === 'Yes')}
              className={clsx(
                'px-3 py-1 text-[12px] font-medium rounded-full border transition-colors cursor-pointer',
                (toggled ? 'Yes' : 'No') === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {toggled && onAmount && (
        <div className="mt-3 pt-3 border-t border-green/20">
          <p className="text-[11px] text-muted mb-1">{amountLabel ?? 'Amount ($)'}</p>
          <input
            type="text"
            value={amount != null ? String(amount) : ''}
            onChange={(e) => onAmount(parseFloat(e.target.value) || undefined)}
            placeholder="0.00"
            className="font-mono text-[14px] text-ink bg-transparent outline-none border-b-2 border-green w-44 py-0.5"
          />
        </div>
      )}
    </div>
  )
}

export function OtherIncomeSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const oi: OtherIncome = taxData?.other_income ?? {}

  function update(patch: Partial<OtherIncome>) {
    setTaxData({ ...taxData, other_income: { ...oi, ...patch } } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Other Income</h2>
      <p className="text-[13px] text-muted mb-5">
        Income sources beyond W-2 wages. Most people have nothing to add here.
      </p>

      {/* Cryptocurrency — page 12: radio yes/no */}
      <div
        className={clsx(
          'border rounded-xl p-4 mb-3 transition-colors',
          oi.has_cryptocurrency === 'Yes' ? 'border-green bg-green-pale' : 'border-hairline bg-white',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">
              Cryptocurrency<span className="text-red-500 ml-0.5">*</span>
            </p>
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
              Did you receive, sell, exchange, or otherwise dispose of any cryptocurrency in 2025?
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {(['Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => update({ has_cryptocurrency: oi.has_cryptocurrency === opt ? undefined : opt })}
                className={clsx(
                  'px-3 py-1 text-[12px] font-medium rounded-full border transition-colors cursor-pointer',
                  oi.has_cryptocurrency === opt
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

      <IncomeCard
        label="Investments & Savings"
        description="Interest, dividends, capital gains from stocks, bonds, and savings accounts (Forms 1099-INT, 1099-DIV, 1099-B)"
        toggled={!!oi.has_investments}
        onToggle={(v) => update({ has_investments: v })}
        amountLabel="Total investment income"
        amount={oi.investment_income}
        onAmount={(v) => update({ investment_income: v })}
      />

      <IncomeCard
        label="Unemployment Compensation"
        description="Unemployment benefits received from state or federal programs (Form 1099-G)"
        toggled={!!oi.has_unemployment}
        onToggle={(v) => update({ has_unemployment: v })}
        amountLabel="Total unemployment received"
        amount={oi.unemployment_amount}
        onAmount={(v) => update({ unemployment_amount: v })}
      />

      <IncomeCard
        label="Social Security Benefits"
        description="Social Security or Railroad Retirement benefits (Form SSA-1099). Up to 85% may be taxable."
        toggled={!!oi.has_social_security}
        onToggle={(v) => update({ has_social_security: v })}
        amountLabel="Total benefits received (Box 5)"
        amount={oi.social_security_amount}
        onAmount={(v) => update({ social_security_amount: v })}
      />

      <IncomeCard
        label="Retirement Income"
        description="Distributions from pensions, annuities, traditional IRAs, and 401(k) plans (Form 1099-R)"
        toggled={!!oi.has_retirement_income}
        onToggle={(v) => update({ has_retirement_income: v })}
        amountLabel="Gross distribution amount (Box 1)"
        amount={oi.retirement_income}
        onAmount={(v) => update({ retirement_income: v })}
      />

      <IncomeCard
        label="Taxable State Refund"
        description="State or local income tax refund — only taxable if you itemized deductions last year (Form 1099-G)"
        toggled={!!oi.has_state_refund}
        onToggle={(v) => update({ has_state_refund: v })}
        amountLabel="Taxable refund amount"
        amount={oi.state_refund_amount}
        onAmount={(v) => update({ state_refund_amount: v })}
      />

      <IncomeCard
        label="Capital Loss Carryovers"
        description="Unused capital losses from prior years that can offset gains or reduce income this year"
        toggled={!!oi.has_capital_loss_carryover}
        onToggle={(v) => update({ has_capital_loss_carryover: v })}
      />

      <IncomeCard
        label="Business or Rental Income"
        description="Self-employment, freelance, or rental property income (Schedule C / Schedule E)"
        toggled={!!oi.has_business_rental}
        onToggle={(v) => update({ has_business_rental: v })}
        amountLabel="Net business / rental income"
        amount={oi.business_income}
        onAmount={(v) => update({ business_income: v })}
      />
    </div>
  )
}
