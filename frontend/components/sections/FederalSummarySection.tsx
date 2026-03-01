'use client'

import { useStore } from '@/store'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

/** 2025 federal tax brackets — single filer */
function calcTax2025Single(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  const brackets = [
    { limit: 11925,  rate: 0.10 },
    { limit: 48475,  rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ]
  let tax = 0
  let prev = 0
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= prev) break
    tax += (Math.min(taxableIncome, limit) - prev) * rate
    prev = limit
  }
  return Math.round(tax)
}

/** 2025 federal tax brackets — married filing jointly */
function calcTax2025MFJ(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  const brackets = [
    { limit: 23850,  rate: 0.10 },
    { limit: 96950,  rate: 0.12 },
    { limit: 206700, rate: 0.22 },
    { limit: 394600, rate: 0.24 },
    { limit: 501050, rate: 0.32 },
    { limit: 751600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ]
  let tax = 0
  let prev = 0
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= prev) break
    tax += (Math.min(taxableIncome, limit) - prev) * rate
    prev = limit
  }
  return Math.round(tax)
}

// 2025 standard deductions
const STANDARD_DEDUCTIONS: Record<string, number> = {
  'Single': 15000,
  'Married Filing Jointly': 30000,
  'Married Filing Separately': 15000,
  'Head of Household': 22500,
  'Qualifying Surviving Spouse': 30000,
}

function SummaryRow({
  label,
  value,
  indent,
  bold,
  highlight,
}: {
  label: string
  value: number | string
  indent?: boolean
  bold?: boolean
  highlight?: 'green' | 'amber'
}) {
  const numValue = typeof value === 'number' ? value : null
  const displayValue = numValue != null ? fmt(numValue) : value

  return (
    <div
      className={`flex justify-between items-center py-2.5 border-b border-hairline last:border-0 ${
        indent ? 'pl-4' : ''
      }`}
    >
      <span
        className={`text-[13px] ${bold ? 'font-semibold text-ink' : 'text-muted'}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-[13px] ${
          highlight === 'green'
            ? 'text-green font-bold'
            : highlight === 'amber'
            ? 'text-amber font-bold'
            : bold
            ? 'font-semibold text-ink'
            : 'text-ink'
        }`}
      >
        {displayValue}
      </span>
    </div>
  )
}

export function FederalSummarySection() {
  const taxData = useStore((s) => s.taxData)

  const tr = taxData?.tax_return ?? {}
  const w2s = taxData?.w2_forms ?? []
  const ded = taxData?.deductions ?? {}
  const cred = taxData?.credits ?? {}
  const misc = taxData?.misc_info ?? {}

  const filingStatus = tr.filing_status ?? 'Single'

  // ── Income ──────────────────────────────────────────────────────────────
  const w2Wages = w2s.reduce((sum, w) => sum + (w.wages ?? 0), 0)
  const otherIncome = taxData?.other_income ?? {}
  const investmentIncome = otherIncome.has_investments ? (otherIncome.investment_income ?? 0) : 0
  const unemploymentIncome = otherIncome.has_unemployment ? (otherIncome.unemployment_amount ?? 0) : 0
  const socialSecurity = otherIncome.has_social_security ? (otherIncome.social_security_amount ?? 0) * 0.85 : 0
  const retirementIncome = otherIncome.has_retirement_income ? (otherIncome.retirement_income ?? 0) : 0
  const businessIncome = otherIncome.has_business_rental ? (otherIncome.business_income ?? 0) : 0

  const totalIncome = w2Wages + investmentIncome + unemploymentIncome + socialSecurity + retirementIncome + businessIncome

  // ── Adjustments ─────────────────────────────────────────────────────────
  const studentLoanDeduction = cred.has_student_loan ? Math.min(cred.student_loan_interest ?? 0, 2500) : 0
  const teacherDeduction = cred.has_teacher_expenses ? Math.min(cred.teacher_expenses ?? 0, 300) : 0
  const iraDeduction = (cred.has_ira && cred.ira_type !== 'Roth') ? (cred.ira_amount ?? 0) : 0
  const hsaDeduction = cred.has_hsa ? (cred.hsa_amount ?? 0) : 0
  const totalAdjustments = studentLoanDeduction + teacherDeduction + iraDeduction + hsaDeduction

  const agi = Math.max(0, totalIncome - totalAdjustments)

  // ── Deductions ──────────────────────────────────────────────────────────
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus] ?? 15000
  const mortgageInterest = ded.has_homeowner ? (ded.mortgage_interest ?? 0) : 0
  const propertyTaxes = ded.has_homeowner ? Math.min(ded.property_taxes ?? 0, 10000) : 0
  const cashDonations = ded.has_donations ? (ded.cash_donations ?? ded.charitable_donations ?? 0) : 0
  const noncashDonations = ded.has_donations ? (ded.noncash_donations ?? 0) : 0
  const medicalExpenses = ded.has_medical ? Math.max(0, (ded.medical_expenses ?? 0) - agi * 0.075) : 0
  const stateTaxes = ded.has_taxes_paid
    ? Math.min((ded.state_local_income_tax ?? ded.state_local_taxes ?? 0) + propertyTaxes, 10000)
    : 0
  const totalItemized = mortgageInterest + cashDonations + noncashDonations + medicalExpenses + stateTaxes
  const deduction = Math.max(standardDeduction, totalItemized)
  const isItemizing = totalItemized > standardDeduction

  const taxableIncome = Math.max(0, agi - deduction)

  // ── Tax ─────────────────────────────────────────────────────────────────
  const calcFn = filingStatus === 'Married Filing Jointly' ? calcTax2025MFJ : calcTax2025Single
  let grossTax = calcFn(taxableIncome)

  // ── Credits ─────────────────────────────────────────────────────────────
  const homeEnergyCredit = cred.has_home_energy ? Math.min(cred.home_energy_amount ?? 0, 3200) : 0
  const cleanVehicleCredit = cred.has_clean_vehicle ? Math.min(cred.clean_vehicle_amount ?? 0, 7500) : 0
  const childCareCredit = cred.has_child_care ? Math.min((cred.child_care_expenses ?? 0) * 0.20, 1050) : 0
  const collegeTuitionCredit = cred.has_college_tuition ? Math.min(cred.college_tuition_amount ?? 0, 2500) : 0
  const adoptionCredit = cred.has_adoption ? Math.min(cred.adoption_expenses ?? 0, 16810) : 0
  const totalCredits = homeEnergyCredit + cleanVehicleCredit + childCareCredit + collegeTuitionCredit + adoptionCredit

  const totalTax = Math.max(0, grossTax - totalCredits)

  // EIC (refundable)
  const eicCredit = cred.has_eic ? (cred.eic_qualifying_children ?? 0) * 3995 : 0

  // ── Withholding & Payments ───────────────────────────────────────────────
  const w2Withheld = w2s.reduce((sum, w) => sum + (w.federal_tax_withheld ?? 0), 0)
  const estimatedPayments =
    (misc.estimated_q1 ?? 0) +
    (misc.estimated_q2 ?? 0) +
    (misc.estimated_q3 ?? 0) +
    (misc.estimated_q4 ?? 0) +
    (misc.extension_payment ?? 0)
  const totalPayments = w2Withheld + estimatedPayments + eicCredit

  const refund = totalPayments - totalTax
  const isRefund = refund >= 0

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Federal Summary</h2>
      <p className="text-[13px] text-muted mb-5">
        Estimated 2025 federal tax calculation based on your entries. This is an estimate — your
        final return may differ.
      </p>

      {/* Refund / Owed banner */}
      <div
        className={`rounded-xl p-5 mb-5 flex justify-between items-center ${
          isRefund ? 'bg-green-pale border border-green' : 'bg-amber/10 border border-amber'
        }`}
      >
        <div>
          <p className={`text-[12px] font-semibold uppercase tracking-wide ${isRefund ? 'text-green' : 'text-amber'}`}>
            {isRefund ? 'Estimated Federal Refund' : 'Estimated Federal Tax Owed'}
          </p>
          <p className={`text-[28px] font-bold font-mono mt-1 ${isRefund ? 'text-green' : 'text-amber'}`}>
            {fmt(Math.abs(refund))}
          </p>
        </div>
        <div className={`text-[36px] ${isRefund ? 'text-green' : 'text-amber'}`}>
          {isRefund ? '↑' : '↓'}
        </div>
      </div>

      <div className="border border-hairline rounded-xl overflow-hidden">
        {/* Income */}
        <div className="bg-cream px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Income</p>
        </div>
        <div className="px-4">
          {w2Wages > 0 && <SummaryRow label="W-2 Wages" value={w2Wages} indent />}
          {investmentIncome > 0 && <SummaryRow label="Investment Income" value={investmentIncome} indent />}
          {unemploymentIncome > 0 && <SummaryRow label="Unemployment" value={unemploymentIncome} indent />}
          {socialSecurity > 0 && <SummaryRow label="Taxable Social Security" value={socialSecurity} indent />}
          {retirementIncome > 0 && <SummaryRow label="Retirement Distributions" value={retirementIncome} indent />}
          {businessIncome > 0 && <SummaryRow label="Business / Rental Income" value={businessIncome} indent />}
          <SummaryRow label="Total Income" value={totalIncome} bold />
        </div>

        {/* AGI */}
        <div className="bg-cream px-4 py-2 border-t border-hairline">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Adjustments</p>
        </div>
        <div className="px-4">
          {totalAdjustments > 0 && (
            <SummaryRow label="Above-the-line Deductions" value={-totalAdjustments} indent />
          )}
          <SummaryRow label="Adjusted Gross Income (AGI)" value={agi} bold />
        </div>

        {/* Deductions */}
        <div className="bg-cream px-4 py-2 border-t border-hairline">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Deductions</p>
        </div>
        <div className="px-4">
          <SummaryRow
            label={isItemizing ? 'Itemized Deductions' : `Standard Deduction (${filingStatus})`}
            value={-deduction}
            indent
          />
          <SummaryRow label="Taxable Income" value={taxableIncome} bold />
        </div>

        {/* Tax */}
        <div className="bg-cream px-4 py-2 border-t border-hairline">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Tax &amp; Credits</p>
        </div>
        <div className="px-4">
          <SummaryRow label="Federal Income Tax" value={grossTax} indent />
          {totalCredits > 0 && <SummaryRow label="Tax Credits" value={-totalCredits} indent />}
          <SummaryRow label="Total Tax" value={totalTax} bold />
        </div>

        {/* Payments */}
        <div className="bg-cream px-4 py-2 border-t border-hairline">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Payments</p>
        </div>
        <div className="px-4">
          {w2Withheld > 0 && <SummaryRow label="W-2 Withholding" value={w2Withheld} indent />}
          {estimatedPayments > 0 && <SummaryRow label="Estimated Payments" value={estimatedPayments} indent />}
          {eicCredit > 0 && <SummaryRow label="Earned Income Credit (refundable)" value={eicCredit} indent />}
          <SummaryRow label="Total Payments &amp; Credits" value={totalPayments} bold />
        </div>

        {/* Result */}
        <div className="px-4 border-t border-hairline">
          <SummaryRow
            label={isRefund ? 'Federal Refund' : 'Federal Tax Owed'}
            value={Math.abs(refund)}
            bold
            highlight={isRefund ? 'green' : 'amber'}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        * This estimate uses simplified 2025 tax bracket rates. Actual tax may vary based on
        additional factors not captured here.
      </p>
    </div>
  )
}
