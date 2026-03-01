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

interface ToggleRowProps {
  label: string
  description: string
  on: boolean | undefined
  onToggle: (v: boolean | undefined) => void
  amountLabel?: string
  amount?: number
  onAmount?: (v: number | undefined) => void
}

function ToggleRow({
  label,
  description,
  on,
  onToggle,
  amountLabel,
  amount,
  onAmount,
}: ToggleRowProps) {
  // Which pill is active: 'Yes' if on===true, 'No' if on===false, none if undefined
  const activeOpt = on === true ? 'Yes' : on === false ? 'No' : null

  return (
    <div
      className={clsx(
        'border rounded-xl p-3 mb-2 transition-colors',
        on === true ? 'border-green bg-green-pale' : 'border-hairline bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink">{label}</p>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {(['Yes', 'No'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                // Clicking active pill deselects; otherwise set true/false
                onToggle(activeOpt === opt ? undefined : opt === 'Yes')
              }}
              className={clsx(
                'px-2.5 py-0.5 text-[11px] font-medium rounded-full border transition-colors cursor-pointer',
                activeOpt === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {on === true && amountLabel && onAmount && (
        <div className="mt-2 pt-2 border-t border-green/20">
          <p className="text-[11px] text-muted mb-0.5">{amountLabel}</p>
          <input
            type="text"
            value={amount != null ? String(amount) : ''}
            onChange={(e) => onAmount(parseFloat(e.target.value) || undefined)}
            placeholder="0.00"
            className="font-mono text-[13px] text-ink bg-transparent outline-none border-b-2 border-green w-40 py-0.5"
          />
        </div>
      )}
    </div>
  )
}

export function OtherCreditsSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const cred: Credits = taxData?.credits ?? {}

  function update(patch: Partial<Credits>) {
    setTaxData({ ...taxData, credits: { ...cred, ...patch } } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Other Credits</h2>
      <p className="text-[13px] text-muted mb-4">
        Less common credits and adjustments. Most people do not need any of these.
      </p>

      <SectionHeading title="Health & Savings Accounts" />

      <ToggleRow
        label="Health Savings Account (HSA)"
        description="Contributions to an HSA paired with a high-deductible health plan are tax-deductible."
        on={cred.has_hsa}
        onToggle={(v) => update({ has_hsa: v })}
        amountLabel="HSA Contributions"
        amount={cred.hsa_amount}
        onAmount={(v) => update({ hsa_amount: v })}
      />
      <ToggleRow
        label="Medical Savings Account (Archer MSA)"
        description="Similar to HSA but for self-employed individuals or small employers with a qualifying HDHP."
        on={cred.has_msa}
        onToggle={(v) => update({ has_msa: v })}
      />

      <SectionHeading title="Family" />

      <ToggleRow
        label="Qualified Adoption Expenses"
        description="Credit for qualified adoption expenses, including domestic and foreign adoptions. Up to $16,810 per child (2025)."
        on={cred.has_adoption}
        onToggle={(v) => update({ has_adoption: v })}
        amountLabel="Qualifying Adoption Expenses"
        amount={cred.adoption_expenses}
        onAmount={(v) => update({ adoption_expenses: v })}
      />
      <ToggleRow
        label="Credit for Elderly or Disabled"
        description="Credit for taxpayers age 65 or older, or those permanently and totally disabled, with limited income."
        on={cred.has_elderly}
        onToggle={(v) => update({ has_elderly: v })}
      />

      <SectionHeading title="Home & Vehicle" />

      <ToggleRow
        label="Mortgage Credit Certificate (MCC)"
        description="A certificate issued by state or local government that converts a portion of mortgage interest into a direct tax credit."
        on={cred.has_mcc}
        onToggle={(v) => update({ has_mcc: v })}
      />
      <ToggleRow
        label="Clean Vehicle Credit"
        description="Credit for purchasing a new qualifying all-electric, plug-in hybrid, or fuel-cell vehicle. Up to $7,500."
        on={cred.has_clean_vehicle}
        onToggle={(v) => update({ has_clean_vehicle: v })}
        amountLabel="Credit Amount"
        amount={cred.clean_vehicle_amount}
        onAmount={(v) => update({ clean_vehicle_amount: v })}
      />
      <ToggleRow
        label="Alternative Fuel Vehicle Refueling Property"
        description="Credit for installing alternative fuel infrastructure (EV charger, hydrogen, etc.) at your home or business."
        on={cred.has_alternative_fuel}
        onToggle={(v) => update({ has_alternative_fuel: v })}
      />

      <SectionHeading title="Work & Business" />

      <ToggleRow
        label="Employee Business Expenses"
        description="Unreimbursed business expenses for Armed Forces reservists, performing artists, or fee-basis government officials."
        on={cred.has_employee_business}
        onToggle={(v) => update({ has_employee_business: v })}
      />
      <ToggleRow
        label="Military Moving Expenses"
        description="Moving expenses for active-duty Armed Forces members relocating pursuant to a military order."
        on={cred.has_military_moving}
        onToggle={(v) => update({ has_military_moving: v })}
      />

      <SectionHeading title="Other" />

      <ToggleRow
        label="Claim of Right Repayment Credit"
        description="Credit when you repaid income in a later year that was taxed in a prior year under a claim of right."
        on={cred.has_claim_of_right}
        onToggle={(v) => update({ has_claim_of_right: v })}
      />
      <ToggleRow
        label="Credit for Prior Year Minimum Tax (AMT)"
        description="Credit for Alternative Minimum Tax paid in a prior year that can now offset regular income tax."
        on={cred.has_prior_year_min_tax}
        onToggle={(v) => update({ has_prior_year_min_tax: v })}
      />
      <ToggleRow
        label="Miscellaneous Adjustments to Income"
        description="Other above-the-line adjustments including alimony (pre-2019 divorce decrees), self-employment deductions, etc."
        on={cred.has_misc_adjustments}
        onToggle={(v) => update({ has_misc_adjustments: v })}
      />
    </div>
  )
}
