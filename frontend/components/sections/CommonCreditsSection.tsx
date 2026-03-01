'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { Credits, TaxData } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted mt-5 mb-2">
      {title}
    </h3>
  )
}

interface CreditCardProps {
  label: string
  description: string
  on: boolean
  onToggle: (v: boolean) => void
  children?: React.ReactNode
}

function CreditCard({ label, description, on, onToggle, children }: CreditCardProps) {
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
          on ? 'bg-green-pale' : 'hover:bg-[#F7F5F0]',
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <p className="text-[11px] text-muted mb-0.5">{label}</p>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="text-[13px] text-ink bg-transparent outline-none w-full cursor-pointer border-b-2 border-green py-0.5"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function CountField({
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
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(e) => onChange(parseInt(e.target.value) || undefined)}
        placeholder="0"
        className="font-mono text-[13px] text-ink bg-transparent outline-none border-b-2 border-green w-full py-0.5 transition-colors"
      />
    </div>
  )
}

export function CommonCreditsSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const cred: Credits = taxData?.credits ?? {}

  function update(patch: Partial<Credits>) {
    setTaxData({ ...taxData, credits: { ...cred, ...patch } } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Common Credits</h2>
      <p className="text-[13px] text-muted mb-4">
        The most frequently claimed deductions and credits. Check any that apply to your
        2025 tax situation.
      </p>

      <SectionHeading title="Retirement" />

      <CreditCard
        label="IRA Contributions"
        description="Contributions to a Traditional IRA may be tax-deductible. Roth IRA contributions are not deductible but grow tax-free."
        on={!!cred.has_ira}
        onToggle={(v) => update({ has_ira: v })}
      >
        <AmountField
          label="Contribution Amount"
          value={cred.ira_amount}
          onChange={(v) => update({ ira_amount: v })}
        />
        <SelectField
          label="IRA Type"
          value={cred.ira_type}
          onChange={(v) => update({ ira_type: v })}
          options={['Traditional', 'Roth']}
        />
      </CreditCard>

      <SectionHeading title="Education" />

      <CreditCard
        label="College Tuition Expenses (Form 1098-T)"
        description="Qualified tuition and fees may qualify for the American Opportunity Credit (up to $2,500) or Lifetime Learning Credit (up to $2,000)."
        on={!!cred.has_college_tuition}
        onToggle={(v) => update({ has_college_tuition: v })}
      >
        <AmountField
          label="Tuition Paid (Box 1, Form 1098-T)"
          value={cred.college_tuition_amount}
          onChange={(v) => update({ college_tuition_amount: v })}
        />
      </CreditCard>

      <CreditCard
        label="Student Loan Interest (Form 1098-E)"
        description="Interest paid on qualified student loans. Up to $2,500 deductible above the line, subject to income limits."
        on={!!cred.has_student_loan}
        onToggle={(v) => update({ has_student_loan: v })}
      >
        <AmountField
          label="Interest Paid (Form 1098-E)"
          value={cred.student_loan_interest}
          onChange={(v) => update({ student_loan_interest: v })}
        />
      </CreditCard>

      <CreditCard
        label="Teacher / Educator Expenses"
        description="K-12 teachers and instructors can deduct up to $300 in out-of-pocket classroom expenses."
        on={!!cred.has_teacher_expenses}
        onToggle={(v) => update({ has_teacher_expenses: v })}
      >
        <AmountField
          label="Unreimbursed Expenses"
          value={cred.teacher_expenses}
          onChange={(v) => update({ teacher_expenses: v })}
        />
      </CreditCard>

      <SectionHeading title="Family" />

      <CreditCard
        label="Earned Income Credit (EIC)"
        description="A refundable credit for low-to-moderate income workers. The amount depends on your income and number of qualifying children."
        on={!!cred.has_eic}
        onToggle={(v) => update({ has_eic: v })}
      >
        <CountField
          label="Qualifying Children"
          value={cred.eic_qualifying_children}
          onChange={(v) => update({ eic_qualifying_children: v })}
        />
      </CreditCard>

      <CreditCard
        label="Child & Dependent Care Credit"
        description="Credit for childcare or dependent care expenses paid while you worked or looked for work."
        on={!!cred.has_child_care}
        onToggle={(v) => update({ has_child_care: v })}
      >
        <AmountField
          label="Care Expenses Paid"
          value={cred.child_care_expenses}
          onChange={(v) => update({ child_care_expenses: v })}
        />
        <CountField
          label="Qualifying Dependents"
          value={cred.child_care_qualifying_children}
          onChange={(v) => update({ child_care_qualifying_children: v })}
        />
      </CreditCard>

      <SectionHeading title="Home & Vehicle" />

      <CreditCard
        label="New Car Loan Interest Deduction"
        description="Interest on loans for qualifying new vehicles purchased and placed in service in 2025."
        on={!!cred.has_car_loan}
        onToggle={(v) => update({ has_car_loan: v })}
      >
        <AmountField
          label="Loan Interest Paid"
          value={cred.car_loan_interest}
          onChange={(v) => update({ car_loan_interest: v })}
        />
      </CreditCard>

      <CreditCard
        label="Home Energy Credit"
        description="Credit for qualifying energy-efficient home improvements such as windows, insulation, heat pumps, and solar panels."
        on={!!cred.has_home_energy}
        onToggle={(v) => update({ has_home_energy: v })}
      >
        <AmountField
          label="Qualifying Expenses"
          value={cred.home_energy_amount}
          onChange={(v) => update({ home_energy_amount: v })}
        />
      </CreditCard>
    </div>
  )
}
