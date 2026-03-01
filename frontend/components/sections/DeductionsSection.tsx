'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { Deductions, TaxData } from '@/lib/types'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

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

interface CategoryCardProps {
  label: string
  description: string
  on: boolean
  onToggle: (v: boolean) => void
  children?: React.ReactNode
}

function CategoryCard({ label, description, on, onToggle, children }: CategoryCardProps) {
  return (
    <div
      className={clsx(
        'border rounded-xl mb-3 overflow-hidden transition-colors',
        on ? 'border-green' : 'border-hairline',
      )}
    >
      <div
        className={clsx(
          'flex items-start gap-3 p-4 cursor-pointer',
          on ? 'bg-green-pale' : 'bg-white hover:bg-[#F7F5F0]',
        )}
        onClick={() => onToggle(!on)}
      >
        <div
          className={clsx(
            'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
            on ? 'bg-green border-green' : 'border-hairline',
          )}
        >
          {on && <span className="text-white text-[9px] font-bold">✓</span>}
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-ink">{label}</p>
          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      {on && children && (
        <div className="border-t border-green/20 bg-cream px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
          {children}
        </div>
      )}
    </div>
  )
}

// 2025 standard deductions
const STANDARD_DEDUCTIONS: Record<string, number> = {
  'Single': 15000,
  'Married Filing Jointly': 30000,
  'Married Filing Separately': 15000,
  'Head of Household': 22500,
  'Qualifying Surviving Spouse': 30000,
}

export function DeductionsSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const ded: Deductions = taxData?.deductions ?? {}

  function update(patch: Partial<Deductions>) {
    setTaxData({ ...taxData, deductions: { ...ded, ...patch } } as TaxData)
  }

  const filingStatus = taxData?.tax_return?.filing_status ?? 'Single'
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus] ?? 15000

  // Compute itemized total
  const mortgage = ded.has_homeowner ? (ded.mortgage_interest ?? 0) : 0
  const propertyTax = ded.has_homeowner ? (ded.property_taxes ?? 0) : 0
  const cashDon = ded.has_donations ? (ded.cash_donations ?? ded.charitable_donations ?? 0) : 0
  const noncashDon = ded.has_donations ? (ded.noncash_donations ?? 0) : 0
  const medical = ded.has_medical ? (ded.medical_expenses ?? 0) : 0
  const stateTax = ded.has_taxes_paid ? (ded.state_local_income_tax ?? ded.state_local_taxes ?? 0) : 0
  const investInt = ded.has_investment_interest ? (ded.investment_interest ?? 0) : 0
  const casualty = ded.has_casualty ? (ded.casualty_loss ?? 0) : 0
  const other = ded.has_other_itemized ? (ded.other_itemized ?? 0) : 0

  // SALT cap: property + income/sales tax capped at $10,000
  const saltCapped = Math.min(stateTax + propertyTax, 10000)
  const totalItemized = mortgage + cashDon + noncashDon + medical + saltCapped + investInt + casualty + other
  const useItemized = totalItemized > standardDeduction

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Itemized Deductions</h2>
      <p className="text-[13px] text-muted mb-4">
        Select all categories that apply. April will compare your itemized total against the
        standard deduction and choose whichever is larger.
      </p>

      {/* Comparison card */}
      <div
        className={clsx(
          'rounded-xl p-4 mb-5 border',
          useItemized ? 'bg-green-pale border-green' : 'bg-cream border-hairline',
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide font-semibold">Standard</p>
            <p className="font-mono text-[18px] font-bold text-ink">{fmt(standardDeduction)}</p>
            <p className="text-[11px] text-muted">{filingStatus}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted uppercase tracking-wide font-semibold">Your Itemized</p>
            <p
              className={`font-mono text-[18px] font-bold ${
                totalItemized > 0 ? 'text-ink' : 'text-muted'
              }`}
            >
              {totalItemized > 0 ? fmt(totalItemized) : '—'}
            </p>
            {saltCapped < stateTax + propertyTax && (
              <p className="text-[10px] text-muted">SALT capped at {fmt(10000)}</p>
            )}
          </div>
        </div>
        <p className={`text-[13px] font-semibold ${useItemized ? 'text-green' : 'text-ink'}`}>
          {useItemized
            ? `Itemizing saves you ${fmt(totalItemized - standardDeduction)} more`
            : 'Standard deduction is recommended — add expenses below if you have them'}
        </p>
      </div>

      <CategoryCard
        label="Home Ownership"
        description="Mortgage interest (Form 1098) and property taxes on your primary and second home."
        on={!!ded.has_homeowner}
        onToggle={(v) => update({ has_homeowner: v })}
      >
        <AmountField
          label="Mortgage Interest (Form 1098)"
          value={ded.mortgage_interest}
          onChange={(v) => update({ mortgage_interest: v })}
        />
        <AmountField
          label="Property Taxes"
          value={ded.property_taxes}
          onChange={(v) => update({ property_taxes: v })}
        />
      </CategoryCard>

      <CategoryCard
        label="Charitable Donations"
        description="Cash and non-cash donations to qualifying 501(c)(3) organizations."
        on={!!ded.has_donations}
        onToggle={(v) => update({ has_donations: v })}
      >
        <AmountField
          label="Cash Donations"
          value={ded.cash_donations}
          onChange={(v) => update({ cash_donations: v })}
        />
        <AmountField
          label="Non-Cash Donations"
          value={ded.noncash_donations}
          onChange={(v) => update({ noncash_donations: v })}
        />
      </CategoryCard>

      <CategoryCard
        label="Medical &amp; Dental Expenses"
        description="Qualifying medical expenses that exceed 7.5% of your AGI. Includes insurance premiums, prescriptions, and out-of-pocket costs."
        on={!!ded.has_medical}
        onToggle={(v) => update({ has_medical: v })}
      >
        <AmountField
          label="Total Medical Expenses"
          value={ded.medical_expenses}
          onChange={(v) => update({ medical_expenses: v })}
        />
      </CategoryCard>

      <CategoryCard
        label="Taxes Paid (SALT)"
        description="State &amp; local income or sales taxes. Combined with property taxes, capped at $10,000."
        on={!!ded.has_taxes_paid}
        onToggle={(v) => update({ has_taxes_paid: v })}
      >
        <AmountField
          label="State &amp; Local Income Tax"
          value={ded.state_local_income_tax}
          onChange={(v) => update({ state_local_income_tax: v })}
        />
        <AmountField
          label="State &amp; Local Sales Tax (if higher)"
          value={ded.state_local_sales_tax}
          onChange={(v) => update({ state_local_sales_tax: v })}
        />
      </CategoryCard>

      <CategoryCard
        label="Investment Interest Expense"
        description="Interest paid on money borrowed to purchase taxable investments (e.g., margin interest)."
        on={!!ded.has_investment_interest}
        onToggle={(v) => update({ has_investment_interest: v })}
      >
        <AmountField
          label="Investment Interest Paid"
          value={ded.investment_interest}
          onChange={(v) => update({ investment_interest: v })}
        />
      </CategoryCard>

      <CategoryCard
        label="Casualty &amp; Theft Losses"
        description="Losses from a federally declared disaster. Personal casualty losses are generally only deductible if in a federal disaster area."
        on={!!ded.has_casualty}
        onToggle={(v) => update({ has_casualty: v })}
      >
        <AmountField
          label="Net Casualty / Theft Loss"
          value={ded.casualty_loss}
          onChange={(v) => update({ casualty_loss: v })}
        />
      </CategoryCard>

      <CategoryCard
        label="Other Itemized Deductions"
        description="Gambling losses up to winnings, impairment-related work expenses, and certain other allowable deductions."
        on={!!ded.has_other_itemized}
        onToggle={(v) => update({ has_other_itemized: v })}
      >
        <AmountField
          label="Other Deductions"
          value={ded.other_itemized}
          onChange={(v) => update({ other_itemized: v })}
        />
      </CategoryCard>
    </div>
  )
}
