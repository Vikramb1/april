'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { StateInfo, TaxData } from '@/lib/types'

function YesNoRow({
  question,
  description,
  value,
  onChange,
}: {
  question: string
  description?: string
  value?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="border border-hairline rounded-xl p-4 mb-3 bg-white">
      <p className="text-[14px] font-semibold text-ink mb-1">{question}</p>
      {description && (
        <p className="text-[12px] text-muted mb-3 leading-relaxed">{description}</p>
      )}
      <div className="flex gap-2">
        {(['Yes', 'No'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
              value === opt
                ? 'bg-green text-white border-green'
                : 'border-hairline text-muted hover:border-green hover:text-ink',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function StateResidencySection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const state: StateInfo = taxData?.state_info ?? {}

  function update(patch: Partial<StateInfo>) {
    setTaxData({ ...taxData, state_info: { ...state, ...patch } } as TaxData)
  }

  const stateCode = taxData?.tax_return?.state ?? ''

  const NO_INCOME_TAX_STATES = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WY', 'WA']
  const hasNoIncomeTax = NO_INCOME_TAX_STATES.includes(stateCode)

  if (hasNoIncomeTax) {
    return (
      <div>
        <h2 className="text-[18px] font-bold text-ink mb-1">State Residency</h2>
        <div className="mt-4 p-5 bg-green-pale border border-green rounded-xl">
          <p className="text-[14px] font-semibold text-green mb-1">No state income tax</p>
          <p className="text-[13px] text-ink leading-relaxed">
            {stateCode || 'Your state'} does not have a state income tax. You do not need to file a
            state return. You may still owe taxes in other states if you earned income there.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">State Residency</h2>
      <p className="text-[13px] text-muted mb-5">
        Tell us about your state residency to determine which state return(s) you need to file.
      </p>

      <YesNoRow
        question={`Did you live in ${stateCode || 'your state'} in 2025?`}
        description="Answer Yes if you were a resident of this state for any part of 2025."
        value={state.is_state_resident}
        onChange={(v) => update({ is_state_resident: v })}
      />

      {state.is_state_resident === 'Yes' && (
        <YesNoRow
          question={`Were you a full-year resident of ${stateCode || 'your state'} in 2025?`}
          description="Answer No if you moved to or from this state during 2025."
          value={state.is_full_year_resident}
          onChange={(v) => update({ is_full_year_resident: v })}
        />
      )}

      {state.is_state_resident === 'Yes' && (
        <YesNoRow
          question="Did you earn income in another state in 2025?"
          description="This includes wages, self-employment income, or rental income from a property in another state."
          value={state.has_other_state_income}
          onChange={(v) => update({ has_other_state_income: v })}
        />
      )}

      {state.is_state_resident === 'No' && (
        <div className="p-4 bg-cream border border-hairline rounded-xl">
          <p className="text-[13px] text-muted leading-relaxed">
            If you were not a resident of this state in 2025, you may not need to file a state
            return here. You may still owe taxes in states where you earned income.
          </p>
        </div>
      )}
    </div>
  )
}
